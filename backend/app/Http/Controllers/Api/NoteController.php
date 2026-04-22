<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\{Note, Examen, Stagiaire, Group, Module, Formateur, NoteValidation};
use App\Services\NotificationService;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class NoteController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $query = Note::with(['stagiaire.user', 'stagiaire.group', 'examen.module']);

        if ($request->has('examen_id')) {
            $query->where('examen_id', $request->examen_id);
        }
        if ($request->has('stagiaire_id')) {
            $query->where('stagiaire_id', $request->stagiaire_id);
        }

        return $this->paginated($query, $request);
    }

    public function batchStore(Request $request)
    {
        $validated = $request->validate([
            'notes' => 'required|array',
            'notes.*.stagiaire_id' => 'required|exists:stagiaires,id',
            'notes.*.examen_id' => 'required|exists:examens,id',
            'notes.*.note' => 'required|numeric|min:0|max:20',
            'notes.*.remarque' => 'nullable|string',
        ]);

        // Reject writes to any (group, module) that the Directeur has validated.
        // Derive (group, module) pairs from the incoming examen_ids and look them
        // up against the note_validations table in one query.
        $examenIds = collect($validated['notes'])->pluck('examen_id')->unique()->all();
        $exams = Examen::whereIn('id', $examenIds)->get(['id', 'group_id', 'module_id']);
        $lockedPairs = NoteValidation::whereIn('group_id', $exams->pluck('group_id')->unique())
            ->whereIn('module_id', $exams->pluck('module_id')->unique())
            ->get()
            ->map(fn ($v) => $v->group_id . ':' . $v->module_id)
            ->all();
        if (!empty($lockedPairs)) {
            $lockedSet = array_flip($lockedPairs);
            $hit = $exams->first(fn ($e) => isset($lockedSet[$e->group_id . ':' . $e->module_id]));
            if ($hit) {
                $mod = Module::find($hit->module_id);
                $grp = Group::find($hit->group_id);
                return $this->error(
                    "Les notes de « {$mod?->nom} » pour le groupe « {$grp?->nom} » sont validées et verrouillées. Demandez au Directeur de retirer la validation avant de modifier.",
                    422
                );
            }
        }

        $created = [];
        foreach ($validated['notes'] as $noteData) {
            $created[] = Note::updateOrCreate(
                [
                    'stagiaire_id' => $noteData['stagiaire_id'],
                    'examen_id' => $noteData['examen_id'],
                ],
                [
                    'note' => $noteData['note'],
                    'remarque' => $noteData['remarque'] ?? null,
                ]
            );
        }

        // Dispatch grade_published notifications (one per note / stagiaire)
        try {
            $stagiaireIds = collect($created)->pluck('stagiaire_id')->unique()->values()->all();
            $examenIds    = collect($created)->pluck('examen_id')->unique()->values()->all();

            $stagiaires = Stagiaire::whereIn('id', $stagiaireIds)->get()->keyBy('id');
            $examens    = Examen::with('module')->whereIn('id', $examenIds)->get()->keyBy('id');

            foreach ($created as $note) {
                $stag   = $stagiaires->get($note->stagiaire_id);
                $examen = $examens->get($note->examen_id);
                if (!$stag || !$stag->user_id || !$examen) continue;

                $moduleNom = $examen->module->nom ?? 'N/A';
                NotificationService::dispatch(
                    $stag->user_id,
                    'grade_published',
                    'Note publiée',
                    "Une note a été publiée pour vous en module « {$moduleNom} » ({$note->note}/20).",
                    '/stagiaire/examens',
                    ['note_id' => $note->id, 'examen_id' => $note->examen_id]
                );
            }
        } catch (\Throwable $e) {
            Log::warning('notification dispatch failed', ['error' => $e->getMessage()]);
        }

        return $this->success($created, 'Notes enregistrées avec succès');
    }

    public function update(Request $request, Note $note)
    {
        $validated = $request->validate([
            'note' => 'required|numeric|min:0|max:20',
            'remarque' => 'nullable|string',
        ]);

        // Block edits when the corresponding (group, module) is validated.
        $examen = Examen::find($note->examen_id);
        if ($examen) {
            $locked = NoteValidation::where('group_id', $examen->group_id)
                ->where('module_id', $examen->module_id)
                ->exists();
            if ($locked) {
                return $this->error(
                    'Cette note est verrouillée — le module a été validé par le Directeur.',
                    422
                );
            }
        }

        $note->update($validated);

        return $this->success($note, 'Note mise à jour');
    }

    /**
     * Aggregated grades: CC1, CC2, CC3, EFM, Moyenne per student for a group+module.
     */
    public function grades(Request $request)
    {
        $request->validate([
            'group_id'  => 'required|exists:groups,id',
            'module_id' => 'required|exists:modules,id',
        ]);

        $groupId  = $request->group_id;
        $moduleId = $request->module_id;

        // Get controle exams ordered by date (CC1, CC2, CC3)
        $controles = Examen::where('group_id', $groupId)
            ->where('module_id', $moduleId)
            ->where('type', 'controle')
            ->orderBy('date_examen')
            ->pluck('id')
            ->values();

        // Get EFM exam
        $efmExam = Examen::where('group_id', $groupId)
            ->where('module_id', $moduleId)
            ->where('type', 'efm')
            ->first();

        $efmId = $efmExam?->id;

        // All relevant exam IDs
        $examIds = $controles->merge($efmId ? [$efmId] : [])->toArray();

        if (empty($examIds)) {
            return $this->success([]);
        }

        // Get all notes for these exams
        $notes = Note::whereIn('examen_id', $examIds)->get()->groupBy('stagiaire_id');

        // Get students in this group
        $stagiaires = Stagiaire::with('user')
            ->where('group_id', $groupId)
            ->where('status', 'actif')
            ->orderBy('id')
            ->get();

        $results = [];
        foreach ($stagiaires as $stag) {
            $studentNotes = $notes->get($stag->id, collect());

            $cc1 = $controles->count() > 0
                ? $studentNotes->where('examen_id', $controles[0])->first()?->note
                : null;
            $cc2 = $controles->count() > 1
                ? $studentNotes->where('examen_id', $controles[1])->first()?->note
                : null;
            $cc3 = $controles->count() > 2
                ? $studentNotes->where('examen_id', $controles[2])->first()?->note
                : null;
            $efm = $efmId
                ? $studentNotes->where('examen_id', $efmId)->first()?->note
                : null;

            // Moyenne = ((CC1+CC2+CC3)/3 + EFM) / 2
            $ccValues = array_filter([$cc1, $cc2, $cc3], fn($v) => $v !== null);
            $ccAvg    = count($ccValues) > 0 ? array_sum($ccValues) / count($ccValues) : null;
            $moyenne  = ($ccAvg !== null && $efm !== null)
                ? round(($ccAvg + $efm) / 2, 2)
                : null;

            $results[] = [
                'stagiaire_id' => $stag->id,
                'nom'          => $stag->user->nom ?? '',
                'prenom'       => $stag->user->prenom ?? '',
                'cc1'          => $cc1,
                'cc2'          => $cc2,
                'cc3'          => $cc3,
                'efm'          => $efm,
                'moyenne'      => $moyenne,
            ];
        }

        return $this->success($results);
    }

    /**
     * Returns all modules of a group's filière with:
     * - the formateur(s) teaching this module to this group (intersection of
     *   formateur_module and formateur_group pivots)
     * - how many students in the group have at least one note for the module
     * - total stagiaires in the group
     * - validation status (is_validated + validated_at + validator info)
     *
     * Used by the Directeur's Notes list to see who's entered/validated what.
     */
    public function groupModulesStatus(Request $request)
    {
        $validated = $request->validate([
            'group_id' => 'required|exists:groups,id',
        ]);

        $group = Group::with('filiere')->findOrFail($validated['group_id']);

        $modules = Module::where('filiere_id', $group->filiere_id)
            ->orderBy('semestre')
            ->orderBy('nom')
            ->get();

        // Count all stagiaires enrolled in the group (including abandons/suspendus).
        // Teachers graded whoever was present when the exam happened — limiting
        // the denominator to 'actif' now can cause the ratio to exceed 100%.
        $totalStagiaires = Stagiaire::where('group_id', $group->id)->count();

        $validations = NoteValidation::where('group_id', $group->id)
            ->with('validator:id,nom,prenom')
            ->get()
            ->keyBy('module_id');

        $result = $modules->map(function ($mod) use ($group, $totalStagiaires, $validations) {
            // Teachers who actually handle this (group, module) pair: present in
            // both formateur_module (teaches this module) AND formateur_group
            // (assigned to this group). Empty → fall back to module's teachers
            // so the Directeur at least sees someone.
            $teachers = Formateur::whereHas('modules', fn ($q) => $q->where('modules.id', $mod->id))
                ->whereHas('groups',  fn ($q) => $q->where('groups.id', $group->id))
                ->with('user:id,nom,prenom')
                ->get();
            if ($teachers->isEmpty()) {
                $teachers = Formateur::whereHas('modules', fn ($q) => $q->where('modules.id', $mod->id))
                    ->with('user:id,nom,prenom')
                    ->get();
            }

            $studentsWithNotes = Note::whereHas('examen', function ($q) use ($group, $mod) {
                $q->where('group_id', $group->id)->where('module_id', $mod->id);
            })->distinct()->count('stagiaire_id');

            $examsCount = Examen::where('group_id', $group->id)
                ->where('module_id', $mod->id)
                ->count();

            $validation = $validations->get($mod->id);

            return [
                'id'         => $mod->id,
                'code'       => $mod->code,
                'nom'        => $mod->nom,
                'semestre'   => $mod->semestre,
                'coefficient'=> $mod->coefficient,
                'formateurs' => $teachers->map(fn ($f) => [
                    'id'     => $f->id,
                    'nom'    => $f->user->nom ?? '',
                    'prenom' => $f->user->prenom ?? '',
                ])->values(),
                'students_with_notes' => $studentsWithNotes,
                'total_stagiaires'    => $totalStagiaires,
                'exams_count'         => $examsCount,
                'is_validated'        => (bool) $validation,
                'validated_at'        => $validation?->validated_at?->toIso8601String(),
                'validated_by'        => $validation ? [
                    'nom'    => $validation->validator->nom ?? '',
                    'prenom' => $validation->validator->prenom ?? '',
                ] : null,
            ];
        });

        return $this->success([
            'group' => [
                'id'        => $group->id,
                'nom'       => $group->nom,
                'filiere'   => $group->filiere ? [
                    'id'  => $group->filiere->id,
                    'nom' => $group->filiere->nom,
                ] : null,
            ],
            'total_stagiaires' => $totalStagiaires,
            'modules'          => $result,
        ]);
    }

    /**
     * Marks (group, module) notes as validated by the Directeur. Idempotent:
     * calling twice just refreshes validator + validated_at.
     */
    public function validateGroupModule(Request $request)
    {
        $validated = $request->validate([
            'group_id'  => 'required|exists:groups,id',
            'module_id' => 'required|exists:modules,id',
        ]);

        $row = NoteValidation::updateOrCreate(
            ['group_id' => $validated['group_id'], 'module_id' => $validated['module_id']],
            ['validated_by' => $request->user()->id, 'validated_at' => now()]
        );
        $row->load('validator:id,nom,prenom');

        // Notify the formateur(s) who teach this (group, module) so they know
        // their entries are now locked.
        $this->notifyValidationChange($validated['group_id'], $validated['module_id'], true);

        return $this->success($row, 'Notes validées');
    }

    /**
     * Retracts a prior validation.
     */
    public function unvalidateGroupModule(Request $request)
    {
        $validated = $request->validate([
            'group_id'  => 'required|exists:groups,id',
            'module_id' => 'required|exists:modules,id',
        ]);

        $deleted = NoteValidation::where('group_id',  $validated['group_id'])
            ->where('module_id', $validated['module_id'])
            ->delete();

        if ($deleted) {
            $this->notifyValidationChange($validated['group_id'], $validated['module_id'], false);
        }

        return $this->success(null, 'Validation retirée');
    }

    /**
     * Fans out a notification to every formateur who teaches this (group,
     * module) pair. Failures are logged but never block the validation.
     */
    private function notifyValidationChange(int $groupId, int $moduleId, bool $isValidated): void
    {
        try {
            $module = Module::find($moduleId);
            $group  = Group::find($groupId);
            if (!$module || !$group) return;

            // Formateurs actually handling this pair — fall back to the
            // module's registered formateurs if the group link is empty.
            $teachers = Formateur::whereHas('modules', fn ($q) => $q->where('modules.id', $moduleId))
                ->whereHas('groups',  fn ($q) => $q->where('groups.id', $groupId))
                ->with('user:id,nom,prenom')
                ->get();
            if ($teachers->isEmpty()) {
                $teachers = Formateur::whereHas('modules', fn ($q) => $q->where('modules.id', $moduleId))
                    ->with('user:id,nom,prenom')
                    ->get();
            }

            $title = $isValidated ? 'Notes validées' : 'Validation retirée';
            $message = $isValidated
                ? "Les notes de « {$module->nom} » pour le groupe « {$group->nom} » ont été validées par le Directeur et sont verrouillées."
                : "Les notes de « {$module->nom} » pour le groupe « {$group->nom} » ne sont plus validées — vous pouvez à nouveau les modifier.";

            foreach ($teachers as $f) {
                if (!$f->user_id) continue;
                NotificationService::dispatch(
                    $f->user_id,
                    $isValidated ? 'notes_validated' : 'notes_unvalidated',
                    $title,
                    $message,
                    '/formateur/examens',
                    ['group_id' => $groupId, 'module_id' => $moduleId]
                );
            }
        } catch (\Throwable $e) {
            Log::warning('validation notification dispatch failed', ['error' => $e->getMessage()]);
        }
    }
}
