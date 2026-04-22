<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Group;
use App\Models\Stagiaire;
use App\Models\User;
use App\Models\Note;
use App\Models\Absence;
use App\Models\EmploiDuTemps;
use App\Services\NotificationService;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class StagiaireController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $query = Stagiaire::with(['user', 'group.filiere']);

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('cef', 'like', "%{$search}%")
                  ->orWhere('cne', 'like', "%{$search}%")
                  ->orWhere('cin', 'like', "%{$search}%")
                  ->orWhereHas('user', function ($uq) use ($search) {
                      $uq->where('nom', 'like', "%{$search}%")
                         ->orWhere('prenom', 'like', "%{$search}%");
                  });
            });
        }

        if ($request->has('group_id') && $request->group_id !== '') {
            $query->where('group_id', $request->group_id);
        }

        if ($request->has('filiere_id') && $request->filiere_id !== '') {
            $query->whereHas('group', fn ($q) => $q->where('filiere_id', $request->filiere_id));
        }

        if ($request->has('status') && $request->status !== '') {
            $query->where('status', $request->status);
        }

        $sortBy  = $request->input('sort_by', 'created_at');
        $sortDir = $request->input('sort_dir', 'desc');

        // Fields that live on the related `users` table need a join.
        if (in_array($sortBy, ['nom', 'prenom', 'email', 'telephone'], true)) {
            $query->join('users', 'users.id', '=', 'stagiaires.user_id')
                  ->orderBy("users.{$sortBy}", $sortDir)
                  ->select('stagiaires.*');
        } elseif ($sortBy === 'group' || $sortBy === 'groupe') {
            $query->leftJoin('groups', 'groups.id', '=', 'stagiaires.group_id')
                  ->orderBy('groups.nom', $sortDir)
                  ->select('stagiaires.*');
        } else {
            $query->orderBy($sortBy, $sortDir);
        }

        return $this->paginated($query, $request);
    }

    public function store(Request $request)
    {
        // Normalize identifiers so "ABC123 " and "abc123" don't sneak past the
        // unique checks. Email is lowercased; CEF/CNE/CIN are trimmed + uppercased.
        $request->merge([
            'email' => mb_strtolower(trim((string) $request->input('email', ''))),
            'cef'   => mb_strtoupper(trim((string) $request->input('cef', ''))),
            'cne'   => mb_strtoupper(trim((string) $request->input('cne', ''))),
            'cin'   => mb_strtoupper(trim((string) $request->input('cin', ''))),
        ]);

        $validated = $request->validate([
            'nom' => 'required|string|max:255',
            'prenom' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'telephone' => 'nullable|string',
            'cef' => 'required|string|unique:stagiaires,cef',
            'cne' => 'required|string|unique:stagiaires,cne',
            'cin' => 'required|string|unique:stagiaires,cin',
            'group_id' => 'required|exists:groups,id',
            'date_inscription' => 'required|date',
            'date_naissance' => 'required|date',
            'adresse' => 'nullable|string',
        ]);

        // Capacity guard
        $group = Group::withCount('stagiaires')->findOrFail($validated['group_id']);
        if ($group->stagiaires_count >= $group->max_stagiaires) {
            return $this->error(
                "Le groupe « {$group->nom} » est complet ({$group->stagiaires_count}/{$group->max_stagiaires}).",
                422
            );
        }

        $stagiaire = DB::transaction(function () use ($validated) {
            $user = User::create([
                'nom' => $validated['nom'],
                'prenom' => $validated['prenom'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'telephone' => $validated['telephone'] ?? null,
                'role' => 'stagiaire',
            ]);

            return Stagiaire::create([
                'user_id' => $user->id,
                'cef' => $validated['cef'],
                'cne' => $validated['cne'],
                'cin' => $validated['cin'],
                'group_id' => $validated['group_id'],
                'date_inscription' => $validated['date_inscription'],
                'date_naissance' => $validated['date_naissance'],
                'adresse' => $validated['adresse'] ?? null,
                'status' => 'actif',
            ]);
        });

        $stagiaire->load(['user', 'group.filiere']);

        // Welcome notification (post-transaction)
        try {
            $groupNom = $stagiaire->group->nom ?? '';
            NotificationService::dispatch(
                $stagiaire->user_id,
                'stagiaire_welcome',
                'Bienvenue à MaCompus',
                "Votre compte stagiaire a été créé. Vous êtes inscrit(e) au groupe « {$groupNom} ».",
                '/stagiaire/dashboard',
                ['stagiaire_id' => $stagiaire->id]
            );
        } catch (\Throwable $e) {
            Log::warning('notification dispatch failed', ['error' => $e->getMessage()]);
        }

        return $this->success($stagiaire, 'Stagiaire créé avec succès', 201);
    }

    public function show(Stagiaire $stagiaire)
    {
        $stagiaire->load(['user', 'group.filiere', 'notes.examen.module', 'absences.module']);
        return $this->success($stagiaire);
    }

    public function update(Request $request, Stagiaire $stagiaire)
    {
        $validated = $request->validate([
            'nom' => 'sometimes|string|max:255',
            'prenom' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $stagiaire->user_id,
            'password' => 'nullable|string|min:8',
            'telephone' => 'nullable|string',
            'cef' => 'sometimes|string|unique:stagiaires,cef,' . $stagiaire->id,
            'cne' => 'sometimes|string|unique:stagiaires,cne,' . $stagiaire->id,
            'cin' => 'sometimes|string|unique:stagiaires,cin,' . $stagiaire->id,
            'group_id' => 'sometimes|exists:groups,id',
            'date_inscription' => 'sometimes|date',
            'date_naissance' => 'sometimes|date',
            'adresse' => 'nullable|string',
            'status' => 'sometimes|in:actif,abandon,diplome,suspendu',
        ]);

        // Detect group change BEFORE updating
        $oldGroupId = $stagiaire->group_id;
        $newGroupId = $validated['group_id'] ?? null;
        $groupChanged = $newGroupId !== null && (int) $newGroupId !== (int) $oldGroupId;

        // Capacity guard on target group (only when changing)
        if ($groupChanged) {
            $target = Group::withCount('stagiaires')->findOrFail($newGroupId);
            if ($target->stagiaires_count >= $target->max_stagiaires) {
                return $this->error(
                    "Le groupe « {$target->nom} » est complet ({$target->stagiaires_count}/{$target->max_stagiaires}).",
                    422
                );
            }
        }

        DB::transaction(function () use ($validated, $stagiaire) {
            $userFields = array_intersect_key($validated, array_flip(['nom', 'prenom', 'email', 'telephone']));
            if (!empty($validated['password'])) {
                $userFields['password'] = Hash::make($validated['password']);
            }
            if (!empty($userFields)) {
                $stagiaire->user->update($userFields);
            }

            $stagiaireFields = array_intersect_key($validated, array_flip(['cef', 'cne', 'cin', 'group_id', 'date_inscription', 'date_naissance', 'adresse', 'status']));
            if (!empty($stagiaireFields)) {
                $stagiaire->update($stagiaireFields);
            }
        });

        $stagiaire->load(['user', 'group.filiere']);

        // Notify on group change (post-transaction)
        if ($groupChanged) {
            try {
                $newGroupNom = $stagiaire->group->nom ?? '';
                NotificationService::dispatch(
                    $stagiaire->user_id,
                    'group_changed',
                    'Changement de groupe',
                    "Vous avez été affecté(e) au groupe « {$newGroupNom} ».",
                    '/stagiaire/dashboard',
                    ['group_id' => $stagiaire->group_id]
                );
            } catch (\Throwable $e) {
                Log::warning('notification dispatch failed', ['error' => $e->getMessage()]);
            }
        }

        return $this->success($stagiaire, 'Stagiaire mis à jour');
    }

    public function bulkStore(Request $request)
    {
        $validated = $request->validate([
            'group_id'                 => 'required|exists:groups,id',
            'stagiaires'               => 'required|array|min:1',
            'stagiaires.*.nom'         => 'required|string|max:255',
            'stagiaires.*.prenom'      => 'required|string|max:255',
            'stagiaires.*.email'       => 'required|email',
            'stagiaires.*.password'    => 'required|string|min:8',
            'stagiaires.*.cef'         => 'required|string',
            'stagiaires.*.cne'         => 'required|string',
            'stagiaires.*.cin'         => 'required|string',
            'stagiaires.*.date_naissance' => 'required|date',
            'stagiaires.*.telephone'   => 'nullable|string',
            'stagiaires.*.adresse'     => 'nullable|string',
        ]);

        // Capacity guard
        $group = Group::withCount('stagiaires')->findOrFail($validated['group_id']);
        $remaining = $group->max_stagiaires - $group->stagiaires_count;
        if ($remaining <= 0) {
            return $this->error(
                "Le groupe « {$group->nom} » est complet ({$group->stagiaires_count}/{$group->max_stagiaires}). Import annulé.",
                422
            );
        }

        $created = [];
        $skipped = [];

        // Normalize keys used for dedup: email lower, CEF/CNE/CIN upper.
        $normEmail = fn ($v) => mb_strtolower(trim((string) $v));
        $normId    = fn ($v) => mb_strtoupper(trim((string) $v));

        $existingEmails = User::pluck('email')->map($normEmail)->all();
        $existingCef = Stagiaire::pluck('cef')->map($normId)->all();
        $existingCne = Stagiaire::pluck('cne')->map($normId)->all();
        $existingCin = Stagiaire::pluck('cin')->map($normId)->all();

        $seenEmails = [];
        $seenCef = [];
        $seenCne = [];
        $seenCin = [];

        DB::transaction(function () use ($validated, &$created, &$skipped, &$existingEmails, &$existingCef, &$existingCne, &$existingCin, &$seenEmails, &$seenCef, &$seenCne, &$seenCin, $remaining, $group) {
            $admitted = 0;
            foreach ($validated['stagiaires'] as $row) {
                // Capacity check — stop admitting once the group hits its limit.
                if ($admitted >= $remaining) {
                    $skipped[] = [
                        'nom' => "{$row['prenom']} {$row['nom']}",
                        'reason' => "capacité du groupe atteinte ({$group->max_stagiaires})",
                    ];
                    continue;
                }

                $emailKey = $normEmail($row['email']);
                $cefKey   = $normId($row['cef']);
                $cneKey   = $normId($row['cne']);
                $cinKey   = $normId($row['cin']);

                if (in_array($emailKey, $seenEmails, true) || in_array($emailKey, $existingEmails, true)) {
                    $skipped[] = ['nom' => "{$row['prenom']} {$row['nom']}", 'reason' => 'email déjà pris'];
                    continue;
                }
                if (in_array($cefKey, $seenCef, true) || in_array($cefKey, $existingCef, true)) {
                    $skipped[] = ['nom' => "{$row['prenom']} {$row['nom']}", 'reason' => 'CEF déjà pris'];
                    continue;
                }
                if (in_array($cneKey, $seenCne, true) || in_array($cneKey, $existingCne, true)) {
                    $skipped[] = ['nom' => "{$row['prenom']} {$row['nom']}", 'reason' => 'CNE déjà pris'];
                    continue;
                }
                if (in_array($cinKey, $seenCin, true) || in_array($cinKey, $existingCin, true)) {
                    $skipped[] = ['nom' => "{$row['prenom']} {$row['nom']}", 'reason' => 'CIN déjà pris'];
                    continue;
                }

                $user = User::create([
                    'nom'       => trim($row['nom']),
                    'prenom'    => trim($row['prenom']),
                    'email'     => $emailKey,
                    'password'  => Hash::make($row['password']),
                    'telephone' => isset($row['telephone']) ? trim($row['telephone']) : null,
                    'role'      => 'stagiaire',
                ]);

                $stagiaire = Stagiaire::create([
                    'user_id'          => $user->id,
                    'cef'              => $cefKey,
                    'cne'              => $cneKey,
                    'cin'              => $cinKey,
                    'group_id'         => $validated['group_id'],
                    'date_inscription' => now()->format('Y-m-d'),
                    'date_naissance'   => $row['date_naissance'],
                    'adresse'          => isset($row['adresse']) ? trim($row['adresse']) : null,
                    'status'           => 'actif',
                ]);

                $created[] = $stagiaire->id;
                $admitted++;
                $seenEmails[] = $emailKey;
                $seenCef[] = $cefKey;
                $seenCne[] = $cneKey;
                $seenCin[] = $cinKey;
            }
        });

        $msg = count($created) . ' stagiaire(s) importé(s)';
        if (count($skipped) > 0) $msg .= ', ' . count($skipped) . ' ignoré(s) (doublons)';

        // Welcome notifications for newly bulk-imported stagiaires (post-transaction)
        if (count($created) > 0) {
            try {
                $newStagiaires = Stagiaire::with(['user', 'group'])
                    ->whereIn('id', $created)
                    ->get();
                foreach ($newStagiaires as $stag) {
                    if (!$stag->user_id) continue;
                    $groupNom = $stag->group->nom ?? '';
                    NotificationService::dispatch(
                        $stag->user_id,
                        'stagiaire_welcome',
                        'Bienvenue à MaCompus',
                        "Votre compte stagiaire a été créé. Vous êtes inscrit(e) au groupe « {$groupNom} ».",
                        '/stagiaire/dashboard',
                        ['stagiaire_id' => $stag->id]
                    );
                }
            } catch (\Throwable $e) {
                Log::warning('notification dispatch failed', ['error' => $e->getMessage()]);
            }
        }

        return $this->success(
            ['created' => count($created), 'skipped' => $skipped],
            $msg,
            201
        );
    }

    public function destroy(Stagiaire $stagiaire)
    {
        DB::transaction(function () use ($stagiaire) {
            $stagiaire->user->update(['is_active' => false]);
            $stagiaire->update(['status' => 'suspendu']);
        });

        return $this->success(null, 'Stagiaire désactivé');
    }

    // Stagiaire-specific endpoints
    public function stagiaire(Request $request)
    {
        $user = $request->user();
        if ($user->role !== 'stagiaire') {
            return response()->json(['success' => false, 'message' => 'User is not a stagiaire'], 403);
        }

        $stagiaire = Stagiaire::where('user_id', $user->id)
            ->with(['user', 'group.filiere'])
            ->first();

        if (!$stagiaire) {
            return response()->json(['success' => false, 'message' => 'Stagiaire record not found'], 404);
        }

        return response()->json(['success' => true, 'data' => $stagiaire]);
    }

    public function stats(Request $request)
    {
        $user = $request->user();
        $stagiaire = Stagiaire::where('user_id', $user->id)->with('group')->first();

        if (!$stagiaire) {
            return response()->json(['success' => false, 'message' => 'Stagiaire not found'], 404);
        }

        $totalAbsences = Absence::where('stagiaire_id', $stagiaire->id)->count();

        $upcomingExams = \App\Models\Examen::where('group_id', $stagiaire->group_id)
            ->where('date_examen', '>', now())
            ->count();

        // Modules come from the group's filiere (no direct group_module pivot)
        $activeModules = \App\Models\Module::where('filiere_id', $stagiaire->group->filiere_id)
            ->where('is_active', true)
            ->count();

        return $this->success([
            'total_absences'  => $totalAbsences,
            'upcoming_exams'  => $upcomingExams,
            'active_modules'  => $activeModules,
            'overall_average' => $this->calculateOverallAverage($stagiaire->id),
        ]);
    }

    public function absences(Request $request)
    {
        $user = $request->user();
        $stagiaire = Stagiaire::where('user_id', $user->id)->with('group')->first();

        if (!$stagiaire) {
            return response()->json(['success' => false, 'message' => 'Stagiaire not found'], 404);
        }

        $absenceRecords = Absence::where('stagiaire_id', $stagiaire->id)
            ->with(['module'])
            ->orderBy('date_absence', 'desc')
            ->get();

        // Calculate stats from actual time durations
        $totalHours = 0;
        $justifiedHours = 0;
        $unjustifiedHours = 0;
        $justifiedCount = 0;
        $unjustifiedCount = 0;

        $absences = $absenceRecords->map(function ($a) use (&$totalHours, &$justifiedHours, &$unjustifiedHours, &$justifiedCount, &$unjustifiedCount) {
            $start = \Carbon\Carbon::createFromTimeString($a->heure_debut);
            $end   = \Carbon\Carbon::createFromTimeString($a->heure_fin);
            $hours = abs($end->diffInMinutes($start)) / 60;

            $totalHours += $hours;
            if ($a->status === 'justifiee') {
                $justifiedHours += $hours;
                $justifiedCount++;
            } else {
                $unjustifiedHours += $hours;
                $unjustifiedCount++;
            }

            // Try to find the formateur for this module in the group's schedule
            $formateur = EmploiDuTemps::where('group_id', $a->stagiaire->group_id ?? null)
                ->where('module_id', $a->module_id)
                ->with('formateur.user')
                ->first()?->formateur?->user;

            return [
                'id'          => $a->id,
                'date'        => $a->date_absence?->format('Y-m-d'),
                'heures_debut'=> $a->heure_debut,
                'heures_fin'  => $a->heure_fin,
                'module'      => $a->module ? ['nom' => $a->module->nom] : ['nom' => 'N/A'],
                'formateur'   => $formateur
                    ? ['nom' => $formateur->nom, 'prenom' => $formateur->prenom]
                    : ['nom' => '', 'prenom' => ''],
                'statut'      => $a->status,
            ];
        });

        return $this->success([
            'absences' => $absences,
            'stats'    => [
                'total_absences_hours'  => round($totalHours, 2),
                'total_absences_count'  => $absenceRecords->count(),
                'justified_hours'       => round($justifiedHours, 2),
                'justified_count'       => $justifiedCount,
                'unjustified_hours'     => round($unjustifiedHours, 2),
                'unjustified_count'     => $unjustifiedCount,
                // OFPPT ladder — thresholds apply to NON-JUSTIFIED hours.
                'max_allowed_hours'     => 32,   // hard cap, further NJ absences are rejected at store-time
                'warning_threshold'     => 15,   // 1er engagement
                'suspension_threshold'  => 20,   // 2eme engagement
                'conseil_threshold'     => 30,   // Conseil de discipline
            ],
        ]);
    }

    public function emploi(Request $request)
    {
        $user = $request->user();
        $stagiaire = Stagiaire::where('user_id', $user->id)->first();

        if (!$stagiaire) {
            return response()->json(['success' => false, 'message' => 'Stagiaire not found'], 404);
        }

        $emplois = EmploiDuTemps::where('group_id', $stagiaire->group_id)
            ->with(['module', 'formateur.user', 'salle'])
            ->orderByRaw("CASE LOWER(jour) WHEN 'lundi' THEN 1 WHEN 'mardi' THEN 2 WHEN 'mercredi' THEN 3 WHEN 'jeudi' THEN 4 WHEN 'vendredi' THEN 5 WHEN 'samedi' THEN 6 ELSE 7 END")
            ->orderBy('heure_debut')
            ->get()
            ->map(function ($e) {
                return [
                    'id'           => $e->id,
                    'jour'         => $e->jour,
                    'heures_debut' => $e->heure_debut,
                    'heures_fin'   => $e->heure_fin,
                    'module'       => [
                        'nom'  => $e->module->nom ?? '',
                        'code' => $e->module->code ?? '',
                    ],
                    'formateur'    => [
                        'nom'    => $e->formateur->user->nom ?? '',
                        'prenom' => $e->formateur->user->prenom ?? '',
                    ],
                    'salle'        => $e->salle->nom ?? '',
                    'type_seance'  => 'presentiel',
                ];
            });

        return $this->success($emplois);
    }

    public function exams(Request $request)
    {
        $user = $request->user();
        $stagiaire = Stagiaire::where('user_id', $user->id)->with('group')->first();

        if (!$stagiaire) {
            return response()->json(['success' => false, 'message' => 'Stagiaire not found'], 404);
        }

        // Get all modules for this stagiaire's filiere
        $modules = \App\Models\Module::where('filiere_id', $stagiaire->group->filiere_id)
            ->where('is_active', true)
            ->get();

        $result = $modules->map(function ($module) use ($stagiaire) {
            $notes = Note::where('stagiaire_id', $stagiaire->id)
                ->whereHas('examen', fn($q) => $q->where('module_id', $module->id))
                ->with('examen')
                ->get();

            if ($notes->isEmpty()) return null;

            $average = round($notes->avg('note') ?? 0, 2);

            $exams = $notes->map(fn($n) => [
                'id'       => $n->examen->id,
                'type'     => $n->examen->type,
                'date'     => $n->examen->date_examen,
                'coeff'    => $module->coefficient ?? 1,
                'note_cc'  => in_array($n->examen->type, ['controle', 'rattrapage']) ? $n->note : null,
                'note_efm' => in_array($n->examen->type, ['efm', 'eff']) ? $n->note : null,
            ])->values();

            return [
                'id'      => $module->id,
                'code'    => $module->code,
                'nom'     => $module->nom,
                'average' => $average,
                'exams'   => $exams,
            ];
        })->filter()->values();

        return $this->success([
            'modules'         => $result,
            'overall_average' => $this->calculateOverallAverage($stagiaire->id),
        ]);
    }

    public function modules(Request $request)
    {
        $user = $request->user();
        $stagiaire = Stagiaire::where('user_id', $user->id)->with('group')->first();

        if (!$stagiaire) {
            return response()->json(['success' => false, 'message' => 'Stagiaire not found'], 404);
        }

        // Modules belong to a filiere; groups also belong to a filiere — no direct group_module pivot
        $modules = \App\Models\Module::where('filiere_id', $stagiaire->group->filiere_id)
            ->where('is_active', true)
            ->with(['formateurs.user'])
            ->get()
            ->map(function ($module) use ($stagiaire) {
                $moduleNotes = Note::where('stagiaire_id', $stagiaire->id)
                    ->whereHas('examen', fn($q) => $q->where('module_id', $module->id))
                    ->get();

                $module->average = $moduleNotes->count() > 0
                    ? round($moduleNotes->avg('note'), 2)
                    : 0;

                return $module;
            });

        return $this->success($modules);
    }

    private function calculateOverallAverage($stagiaireId): float
    {
        $notes = Note::where('stagiaire_id', $stagiaireId)->get();
        return $notes->count() > 0 ? round($notes->avg('note'), 2) : 0.0;
    }
}
