<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\{Note, Examen, Stagiaire};
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class NoteController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $query = Note::with(['stagiaire.user', 'examen.module']);

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

        return $this->success($created, 'Notes enregistrées avec succès');
    }

    public function update(Request $request, Note $note)
    {
        $validated = $request->validate([
            'note' => 'required|numeric|min:0|max:20',
            'remarque' => 'nullable|string',
        ]);

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
}
