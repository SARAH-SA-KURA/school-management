<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Absence;
use App\Services\NotificationService;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AbsenceController extends Controller
{
    use ApiResponse;

    // Per-stagiaire cumulative caps (in minutes).
    // Once exceeded, further absences in that status are rejected.
    private const CAP_NON_JUSTIFIEE_MIN = 32 * 60; // 32h
    private const CAP_EN_ATTENTE_MIN    =  5 * 60; // 5h

    private function minutesOf(string $debut, string $fin): int
    {
        [$h1, $m1] = array_map('intval', explode(':', $debut));
        [$h2, $m2] = array_map('intval', explode(':', $fin));
        return max(0, ($h2 * 60 + $m2) - ($h1 * 60 + $m1));
    }

    private function cumulativeMinutes(int $stagiaireId, string $status, ?int $excludeId = null): int
    {
        $q = Absence::where('stagiaire_id', $stagiaireId)->where('status', $status);
        if ($excludeId !== null) $q->where('id', '!=', $excludeId);
        return (int) ($q->selectRaw(
            "COALESCE(SUM((strftime('%H', heure_fin) * 60 + strftime('%M', heure_fin)) "
          . "- (strftime('%H', heure_debut) * 60 + strftime('%M', heure_debut))), 0) as mins"
        )->value('mins') ?? 0);
    }

    private function fmtH(int $minutes): string
    {
        $h = $minutes / 60;
        return (fmod($h, 1) === 0.0 ? (int) $h : number_format($h, 1, '.', '')) . 'h';
    }

    /** Returns an error message if the status cap would be exceeded, null otherwise. */
    private function capCheck(int $stagiaireId, string $newStatus, int $addingMinutes, ?int $excludeId = null): ?string
    {
        if ($newStatus === 'non_justifiee') {
            $cap = self::CAP_NON_JUSTIFIEE_MIN;
            $current = $this->cumulativeMinutes($stagiaireId, 'non_justifiee', $excludeId);
            if ($current + $addingMinutes > $cap) {
                return "Impossible : ce stagiaire cumulerait " . $this->fmtH($current + $addingMinutes)
                     . " d'absences non justifiées, au-delà de la limite de " . $this->fmtH($cap)
                     . " (actuel : " . $this->fmtH($current) . ", +" . $this->fmtH($addingMinutes) . ").";
            }
        }
        if ($newStatus === 'en_attente') {
            $cap = self::CAP_EN_ATTENTE_MIN;
            $current = $this->cumulativeMinutes($stagiaireId, 'en_attente', $excludeId);
            if ($current + $addingMinutes > $cap) {
                return "Impossible : ce stagiaire aurait " . $this->fmtH($current + $addingMinutes)
                     . " en attente, au-delà de la limite de " . $this->fmtH($cap)
                     . " (actuel : " . $this->fmtH($current) . ", +" . $this->fmtH($addingMinutes) . ").";
            }
        }
        return null;
    }

    public function index(Request $request)
    {
        $query = Absence::with(['stagiaire.user', 'stagiaire.group.filiere', 'module']);

        if ($request->has('stagiaire_id')) {
            $query->where('stagiaire_id', $request->stagiaire_id);
        }
        if ($request->has('module_id')) {
            $query->where('module_id', $request->module_id);
        }
        if ($request->has('group_id')) {
            $query->whereHas('stagiaire', fn ($q) => $q->where('group_id', $request->group_id));
        }
        if ($request->has('filiere_id')) {
            $query->whereHas('stagiaire.group', fn ($q) => $q->where('filiere_id', $request->filiere_id));
        }
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
        if ($request->has('date_from')) {
            $query->where('date_absence', '>=', $request->date_from);
        }
        if ($request->has('date_to')) {
            $query->where('date_absence', '<=', $request->date_to);
        }

        $query->orderBy('date_absence', 'desc');

        return $this->paginated($query, $request);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'stagiaire_id' => 'required|exists:stagiaires,id',
            'module_id' => 'required|exists:modules,id',
            'date_absence' => 'required|date',
            'heure_debut' => 'required|date_format:H:i',
            'heure_fin' => 'required|date_format:H:i',
            'motif' => 'nullable|string',
            'status' => 'in:non_justifiee,justifiee,en_attente',
        ]);

        if ($validated['heure_debut'] >= $validated['heure_fin']) {
            return $this->error("L'heure de fin doit être après l'heure de début.", 422);
        }

        // Prevent overlapping absences for the same stagiaire on the same day —
        // a student can't be absent twice at the same time. End-exclusive so
        // back-to-back slots (e.g. 08:30-10:30 + 10:30-12:30) remain valid.
        // whereDate() strips any time component the DB may have appended via
        // the model's 'date' cast, so exact-match works under SQLite too.
        $conflict = Absence::where('stagiaire_id', $validated['stagiaire_id'])
            ->whereDate('date_absence', $validated['date_absence'])
            ->where('heure_debut', '<', $validated['heure_fin'])
            ->where('heure_fin',   '>', $validated['heure_debut'])
            ->first();
        if ($conflict) {
            return $this->error(
                "Une absence existe déjà pour ce stagiaire le "
                . \Carbon\Carbon::parse($validated['date_absence'])->format('d/m/Y')
                . " entre {$conflict->heure_debut} et {$conflict->heure_fin}.",
                422
            );
        }

        // Per-stagiaire cumulative cap per status (32h non-justifiée / 5h en attente).
        $addingMinutes = $this->minutesOf($validated['heure_debut'], $validated['heure_fin']);
        $targetStatus = $validated['status'] ?? 'non_justifiee';
        if ($err = $this->capCheck((int) $validated['stagiaire_id'], $targetStatus, $addingMinutes)) {
            return $this->error($err, 422);
        }

        $absence = Absence::create($validated);
        $absence->load(['stagiaire.user', 'module']);

        // Notify the stagiaire their absence was recorded
        try {
            if ($absence->stagiaire && $absence->stagiaire->user_id) {
                $dateStr = $absence->date_absence ? $absence->date_absence->format('d/m/Y') : '';
                $moduleNom = $absence->module->nom ?? 'N/A';
                NotificationService::dispatch(
                    $absence->stagiaire->user_id,
                    'absence_recorded',
                    'Absence enregistrée',
                    "Une absence a été enregistrée pour vous le {$dateStr} en module « {$moduleNom} ».",
                    '/stagiaire/absences',
                    ['absence_id' => $absence->id]
                );
            }
        } catch (\Throwable $e) {
            Log::warning('notification dispatch failed', ['error' => $e->getMessage()]);
        }

        return $this->success($absence, 'Absence enregistrée', 201);
    }

    public function update(Request $request, Absence $absence)
    {
        $validated = $request->validate([
            'status' => 'sometimes|in:non_justifiee,justifiee,en_attente',
            'justification' => 'nullable|string',
            'motif' => 'nullable|string',
        ]);

        // If status is moving to a capped status, re-check the cumulative without
        // this absence's current contribution, then add its duration to the new side.
        if (isset($validated['status']) && $validated['status'] !== $absence->status) {
            $minutes = $this->minutesOf($absence->heure_debut, $absence->heure_fin);
            if ($err = $this->capCheck($absence->stagiaire_id, $validated['status'], $minutes, $absence->id)) {
                return $this->error($err, 422);
            }
        }

        $absence->update($validated);

        return $this->success($absence, 'Absence mise à jour');
    }

    public function destroy(Absence $absence)
    {
        $absence->delete();
        return $this->success(null, 'Absence supprimée');
    }

    public function justify(Request $request, Absence $absence)
    {
        $validated = $request->validate([
            'file' => 'required|file|mimes:png,jpg,jpeg,pdf|max:5120', // 5MB
            'note' => 'nullable|string',
        ]);

        // Delete old file if any (cleanup on re-justify)
        if ($absence->justification && str_starts_with($absence->justification, '/storage/')) {
            $oldPath = str_replace('/storage/', '', $absence->justification);
            \Storage::disk('public')->delete($oldPath);
        }

        $path = $request->file('file')->store('justifications', 'public');

        $absence->update([
            'status'        => 'justifiee',
            'justification' => '/storage/' . $path,
            'motif'         => $validated['note'] ?? $absence->motif,
        ]);

        $absence->load(['stagiaire.user', 'module']);
        return $this->success($absence, 'Justification acceptée');
    }

    public function stats()
    {
        $counts = Absence::selectRaw('status, COUNT(*) as n')->groupBy('status')->pluck('n', 'status');
        $total = $counts->sum();

        // Total absent hours per status (time diff in minutes → hours)
        $hoursRaw = Absence::selectRaw("status, SUM((strftime('%H', heure_fin) * 60 + strftime('%M', heure_fin)) - (strftime('%H', heure_debut) * 60 + strftime('%M', heure_debut))) as mins")
            ->groupBy('status')
            ->pluck('mins', 'status');

        return $this->success([
            'total'                  => $total,
            'non_justifiee_count'    => (int) ($counts['non_justifiee'] ?? 0),
            'en_attente_count'       => (int) ($counts['en_attente'] ?? 0),
            'justifiee_count'        => (int) ($counts['justifiee'] ?? 0),
            'non_justifiee_hours'    => round((float) ($hoursRaw['non_justifiee'] ?? 0) / 60, 1),
            'en_attente_hours'       => round((float) ($hoursRaw['en_attente'] ?? 0) / 60, 1),
            'justifiee_hours'        => round((float) ($hoursRaw['justifiee'] ?? 0) / 60, 1),
        ]);
    }

    public function summary(Request $request)
    {
        $mins = "((strftime('%H', heure_fin) * 60 + strftime('%M', heure_fin)) - (strftime('%H', heure_debut) * 60 + strftime('%M', heure_debut)))";

        $query = Absence::selectRaw("
            stagiaire_id,
            COUNT(*) as total_count,
            SUM({$mins}) as total_mins,
            SUM(CASE WHEN status = 'justifiee'     THEN {$mins} ELSE 0 END) as justified_mins,
            SUM(CASE WHEN status = 'non_justifiee' THEN {$mins} ELSE 0 END) as nonj_mins,
            SUM(CASE WHEN status = 'en_attente'    THEN {$mins} ELSE 0 END) as attente_mins
        ");

        if ($request->filled('date_from')) $query->where('date_absence', '>=', $request->date_from);
        if ($request->filled('date_to'))   $query->where('date_absence', '<=', $request->date_to);
        if ($request->filled('group_id'))   $query->whereHas('stagiaire', fn ($q) => $q->where('group_id', $request->group_id));
        if ($request->filled('filiere_id')) $query->whereHas('stagiaire.group', fn ($q) => $q->where('filiere_id', $request->filiere_id));
        if ($request->filled('stagiaire_id')) $query->where('stagiaire_id', $request->stagiaire_id);

        $aggregates = $query->groupBy('stagiaire_id')->get()->keyBy('stagiaire_id');

        $stagiaires = \App\Models\Stagiaire::with([
                'user:id,nom,prenom',
                'group:id,nom,filiere_id',
                'group.filiere:id,nom',
            ])
            ->whereIn('id', $aggregates->keys())
            ->get();

        $rows = $stagiaires->map(function ($s) use ($aggregates) {
            $a = $aggregates->get($s->id);
            return [
                'stagiaire_id'         => $s->id,
                'cef'                  => $s->cef,
                'nom'                  => $s->user->nom ?? '',
                'prenom'               => $s->user->prenom ?? '',
                'group'                => $s->group->nom ?? '',
                'group_id'             => $s->group_id,
                'filiere'              => $s->group->filiere->nom ?? '',
                'filiere_id'           => $s->group->filiere_id ?? null,
                'total_hours'          => round(((float) ($a->total_mins     ?? 0)) / 60, 1),
                'justified_hours'      => round(((float) ($a->justified_mins ?? 0)) / 60, 1),
                'non_justified_hours'  => round(((float) ($a->nonj_mins      ?? 0)) / 60, 1),
                'en_attente_hours'     => round(((float) ($a->attente_mins   ?? 0)) / 60, 1),
                'total_count'          => (int) ($a->total_count ?? 0),
            ];
        });

        if ($search = trim((string) $request->input('search'))) {
            $needle = mb_strtolower($search);
            $rows = $rows->filter(function ($r) use ($needle) {
                return str_contains(mb_strtolower($r['nom'] . ' ' . $r['prenom']), $needle)
                    || str_contains(mb_strtolower((string) $r['cef']), $needle);
            });
        }

        $rows = $rows->sortByDesc('total_hours')->values();

        $perPage = max(1, (int) $request->input('per_page', 15));
        $page    = max(1, (int) $request->input('page', 1));
        $total   = $rows->count();
        $items   = $rows->slice(($page - 1) * $perPage, $perPage)->values();

        return response()->json([
            'success' => true,
            'data'    => $items,
            'meta'    => [
                'current_page' => $page,
                'last_page'    => (int) max(1, ceil($total / $perPage)),
                'per_page'     => $perPage,
                'total'        => $total,
            ],
        ]);
    }

    public function warnings()
    {
        // OFPPT escalation ladder (non-justified hours):
        //   15h → 1er engagement
        //   20h → 2ème engagement
        //   30h → Conseil de discipline
        //   32h → plafond absolu (bloqué au niveau store/update)
        $rows = Absence::selectRaw("stagiaire_id, SUM((strftime('%H', heure_fin) * 60 + strftime('%M', heure_fin)) - (strftime('%H', heure_debut) * 60 + strftime('%M', heure_debut))) as mins, COUNT(*) as n")
            ->where('status', 'non_justifiee')
            ->groupBy('stagiaire_id')
            ->havingRaw('mins >= 900') // 15h * 60 = earliest stage (engagement_1)
            ->get();

        $ids = $rows->pluck('stagiaire_id');
        $stagiaires = \App\Models\Stagiaire::with(['user:id,nom,prenom,email', 'group:id,nom,filiere_id', 'group.filiere:id,nom'])
            ->whereIn('id', $ids)
            ->get()
            ->keyBy('id');

        $warnings = $rows->map(function ($r) use ($stagiaires) {
            $s = $stagiaires->get($r->stagiaire_id);
            if (!$s) return null;
            $hours = round($r->mins / 60, 1);
            if ($hours >= 30)       { $level = 'conseil'; }
            elseif ($hours >= 20)   { $level = 'engagement_2'; }
            else                    { $level = 'engagement_1'; }
            return [
                'stagiaire_id' => $s->id,
                'nom'          => $s->user->nom ?? '',
                'prenom'       => $s->user->prenom ?? '',
                'cef'          => $s->cef,
                'group'        => $s->group->nom ?? '',
                'filiere'      => $s->group->filiere->nom ?? '',
                'hours'        => $hours,
                'count'        => $r->n,
                'level'        => $level,
            ];
        })->filter()->sortByDesc('hours')->values();

        return $this->success($warnings);
    }
}
