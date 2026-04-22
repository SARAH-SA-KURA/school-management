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
        // Thresholds (OFPPT): >= 36h non-justified = warning, >= 54h = suspension risk
        $rows = Absence::selectRaw("stagiaire_id, SUM((strftime('%H', heure_fin) * 60 + strftime('%M', heure_fin)) - (strftime('%H', heure_debut) * 60 + strftime('%M', heure_debut))) as mins, COUNT(*) as n")
            ->where('status', 'non_justifiee')
            ->groupBy('stagiaire_id')
            ->havingRaw('mins >= 2160') // 36h * 60
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
            return [
                'stagiaire_id' => $s->id,
                'nom'          => $s->user->nom ?? '',
                'prenom'       => $s->user->prenom ?? '',
                'cef'          => $s->cef,
                'group'        => $s->group->nom ?? '',
                'filiere'      => $s->group->filiere->nom ?? '',
                'hours'        => $hours,
                'count'        => $r->n,
                'level'        => $hours >= 54 ? 'suspension' : 'warning',
            ];
        })->filter()->sortByDesc('hours')->values();

        return $this->success($warnings);
    }
}
