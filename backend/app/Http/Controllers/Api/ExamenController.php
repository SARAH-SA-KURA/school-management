<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Examen;
use App\Models\EmploiDuTemps;
use App\Models\Group;
use App\Models\Salle;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class ExamenController extends Controller
{
    use ApiResponse;

    /**
     * Map French day names (DB stores lundi…samedi) to PHP's Carbon dayOfWeek
     * (sunday = 0 … saturday = 6). We pass the exam date through Carbon to get
     * the weekday, then compare against emploi_du_temps entries for that day.
     */
    private const JOURS_FR = [
        1 => 'lundi', 2 => 'mardi', 3 => 'mercredi',
        4 => 'jeudi', 5 => 'vendredi', 6 => 'samedi',
    ];

    /**
     * Check for exam scheduling conflicts. Returns an error string (French)
     * when a clash is found, or null if the slot is free.
     *
     *   Clash sources, in priority order:
     *   1) Another exam at the same day+time for this group
     *   2) Another exam at the same day+time for this formateur
     *   3) Another exam at the same day+time in this salle (if given)
     *   4) A regular session in emploi_du_temps at the same day+time for this
     *      group — students are supposed to be in class, not an exam
     *
     * $excludeId lets `update()` skip the current row when checking.
     */
    private function detectConflict(array $data, ?int $excludeId = null): ?string
    {
        $date      = $data['date_examen'];
        $debut     = substr($data['heure_debut'], 0, 5);
        $fin       = substr($data['heure_fin'], 0, 5);
        $groupId   = $data['group_id'];
        $formateurId = $data['formateur_id'];
        $salleId   = $data['salle_id'] ?? null;

        // Same day/time overlap on another Examen row.
        $overlapping = Examen::whereDate('date_examen', $date)
            ->when($excludeId, fn ($q) => $q->where('id', '!=', $excludeId))
            ->where('heure_debut', '<', $fin)
            ->where('heure_fin',   '>', $debut);

        $clash = (clone $overlapping)->where('group_id', $groupId)->first();
        if ($clash) {
            return "Ce groupe a déjà un examen programmé à ce créneau ({$clash->heure_debut} — {$clash->heure_fin}).";
        }

        $clash = (clone $overlapping)->where('formateur_id', $formateurId)->first();
        if ($clash) {
            return "Vous avez déjà un examen programmé à ce créneau ({$clash->heure_debut} — {$clash->heure_fin}).";
        }

        if ($salleId) {
            $clash = (clone $overlapping)->where('salle_id', $salleId)->first();
            if ($clash) {
                return "Cette salle est déjà occupée par un autre examen à ce créneau.";
            }
        }

        // Emploi du temps clash: is this group in class at that time?
        try {
            $dayIdx = \Carbon\Carbon::parse($date)->dayOfWeekIso; // 1..7 (Mon=1)
        } catch (\Throwable $e) {
            $dayIdx = 0;
        }
        $jour = self::JOURS_FR[$dayIdx] ?? null;
        if ($jour) {
            $session = EmploiDuTemps::where('group_id', $groupId)
                ->where('jour', $jour)
                ->where('heure_debut', '<', $fin)
                ->where('heure_fin',   '>', $debut)
                ->with('module')
                ->first();
            if ($session) {
                $modNom = $session->module->nom ?? '—';
                return "Le groupe a cours à ce créneau ({$session->heure_debut} — {$session->heure_fin} : {$modNom}). Choisissez un autre horaire.";
            }
        }

        return null;
    }

    public function index(Request $request)
    {
        $query = Examen::with(['module', 'group', 'salle', 'formateur.user']);

        if ($request->has('group_id')) {
            $query->where('group_id', $request->group_id);
        }
        if ($request->has('module_id')) {
            $query->where('module_id', $request->module_id);
        }
        if ($request->has('formateur_id')) {
            $query->where('formateur_id', $request->formateur_id);
        }
        if ($request->has('type')) {
            $query->where('type', $request->type);
        }
        if ($request->has('date_from')) {
            $query->where('date_examen', '>=', $request->date_from);
        }
        if ($request->has('date_to')) {
            $query->where('date_examen', '<=', $request->date_to);
        }
        // Time filter — 'upcoming' keeps the Formateur planning table focused
        // on what still matters; 'past' is the mirror for history.
        if ($request->input('when') === 'upcoming') {
            $query->whereDate('date_examen', '>=', now()->toDateString());
        } elseif ($request->input('when') === 'past') {
            $query->whereDate('date_examen', '<', now()->toDateString());
        }

        // Upcoming-first makes more sense than chronological-ascending when the
        // list runs long (EFMs from last year shouldn't bury this week's CC).
        $query->orderByRaw('date_examen >= ? DESC', [now()->toDateString()])
              ->orderBy('date_examen', 'asc')
              ->orderBy('heure_debut', 'asc');

        return $this->paginated($query, $request);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'module_id' => 'required|exists:modules,id',
            'group_id' => 'required|exists:groups,id',
            'salle_id' => 'nullable|exists:salles,id',
            'formateur_id' => 'required|exists:formateurs,id',
            'surveillant_id' => 'nullable|integer',
            'type' => 'required|in:controle,efm,eff,rattrapage',
            'date_examen' => 'required|date',
            'heure_debut' => 'required|date_format:H:i',
            'heure_fin' => 'required|date_format:H:i|after:heure_debut',
        ]);

        if (! empty($validated['salle_id'])) {
            $salle = Salle::find($validated['salle_id']);
            if ($salle && ! $salle->is_active) {
                return $this->error('Cette salle est marquée indisponible' . ($salle->motif_indisponibilite ? ' : ' . $salle->motif_indisponibilite : '.'), 422);
            }
        }

        if ($clash = $this->detectConflict($validated)) {
            return $this->error($clash, 422);
        }

        $examen = Examen::create($validated);
        $examen->load(['module', 'group', 'salle', 'formateur.user']);

        return $this->success($examen, 'Examen créé avec succès', 201);
    }

    public function show(Examen $examen)
    {
        $examen->load(['module', 'group', 'salle', 'formateur.user', 'notes.stagiaire.user']);
        return $this->success($examen);
    }

    public function update(Request $request, Examen $examen)
    {
        $validated = $request->validate([
            'module_id' => 'sometimes|exists:modules,id',
            'group_id' => 'sometimes|exists:groups,id',
            'salle_id' => 'nullable|exists:salles,id',
            'formateur_id' => 'sometimes|exists:formateurs,id',
            'surveillant_id' => 'nullable|integer',
            'type' => 'sometimes|in:controle,efm,eff,rattrapage',
            'date_examen' => 'sometimes|date',
            'heure_debut' => 'sometimes|date_format:H:i',
            'heure_fin' => 'sometimes|date_format:H:i',
        ]);

        if (array_key_exists('salle_id', $validated) && !empty($validated['salle_id'])) {
            $salle = Salle::find($validated['salle_id']);
            if ($salle && ! $salle->is_active) {
                return $this->error('Cette salle est marquée indisponible' . ($salle->motif_indisponibilite ? ' : ' . $salle->motif_indisponibilite : '.'), 422);
            }
        }

        // Merge incoming changes with the current row before checking —
        // conflict detection runs against the final state, not the delta.
        $final = array_merge([
            'group_id'     => $examen->group_id,
            'formateur_id' => $examen->formateur_id,
            'salle_id'     => $examen->salle_id,
            'date_examen'  => $examen->date_examen->format('Y-m-d'),
            'heure_debut'  => $examen->heure_debut,
            'heure_fin'    => $examen->heure_fin,
        ], $validated);

        if ($clash = $this->detectConflict($final, $examen->id)) {
            return $this->error($clash, 422);
        }

        $examen->update($validated);
        $examen->load(['module', 'group', 'salle', 'formateur.user']);

        return $this->success($examen, 'Examen mis à jour');
    }

    public function destroy(Examen $examen)
    {
        $examen->delete();
        return $this->success(null, 'Examen supprimé');
    }
}
