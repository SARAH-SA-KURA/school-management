<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmploiDuTemps;
use App\Models\Salle;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class EmploiDuTempsController extends Controller
{
    use ApiResponse;

    /** OFPPT rule: a formateur teaches at most 30h per week (= 1800 minutes). */
    private const FORMATEUR_WEEKLY_CAP_MINUTES = 1800;

    /**
     * Minutes between two "HH:MM" strings. Carbon's diff would work too but
     * would cost an extra parse per call; raw math is enough for our slots.
     */
    private function minutesBetween(string $start, string $end): int
    {
        [$sh, $sm] = array_map('intval', explode(':', substr($start, 0, 5)));
        [$eh, $em] = array_map('intval', explode(':', substr($end, 0, 5)));
        return max(0, ($eh * 60 + $em) - ($sh * 60 + $sm));
    }

    /**
     * Total scheduled minutes for a formateur across the whole week, excluding
     * the given session id (so update() can compare "after replacing self").
     */
    private function formateurWeeklyMinutes(int $formateurId, ?int $excludeId = null): int
    {
        $rows = EmploiDuTemps::where('formateur_id', $formateurId)
            ->when($excludeId, fn ($q) => $q->where('id', '!=', $excludeId))
            ->get(['heure_debut', 'heure_fin']);
        $total = 0;
        foreach ($rows as $r) {
            $total += $this->minutesBetween((string) $r->heure_debut, (string) $r->heure_fin);
        }
        return $total;
    }

    public function index(Request $request)
    {
        $query = EmploiDuTemps::with(['group', 'module', 'formateur.user', 'salle']);

        if ($request->has('group_id')) {
            $query->where('group_id', $request->group_id);
        }
        if ($request->has('formateur_id')) {
            $query->where('formateur_id', $request->formateur_id);
        }
        if ($request->has('salle_id')) {
            $query->where('salle_id', $request->salle_id);
        }
        if ($request->has('jour')) {
            $query->where('jour', $request->jour);
        }

        $query->orderByRaw("CASE jour WHEN 'lundi' THEN 1 WHEN 'mardi' THEN 2 WHEN 'mercredi' THEN 3 WHEN 'jeudi' THEN 4 WHEN 'vendredi' THEN 5 WHEN 'samedi' THEN 6 END")
              ->orderBy('heure_debut');

        if ($request->has('per_page')) {
            return $this->paginated($query, $request);
        }

        return $this->success($query->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'group_id' => 'required|exists:groups,id',
            'module_id' => 'required|exists:modules,id',
            'formateur_id' => 'required|exists:formateurs,id',
            'salle_id' => 'required|exists:salles,id',
            'jour' => 'required|in:lundi,mardi,mercredi,jeudi,vendredi,samedi',
            'heure_debut' => 'required|date_format:H:i',
            'heure_fin' => 'required|date_format:H:i|after:heure_debut',
        ]);

        // Reject indisponible salles (hors service / en rénovation).
        $salle = Salle::find($validated['salle_id']);
        if ($salle && ! $salle->is_active) {
            return $this->error('Cette salle est marquée indisponible' . ($salle->motif_indisponibilite ? ' : ' . $salle->motif_indisponibilite : '.'), 422);
        }

        // Check conflicts
        $conflict = EmploiDuTemps::where('jour', $validated['jour'])
            ->where(function ($q) use ($validated) {
                $q->where('heure_debut', '<', $validated['heure_fin'])
                  ->where('heure_fin', '>', $validated['heure_debut']);
            })
            ->where(function ($q) use ($validated) {
                $q->where('salle_id', $validated['salle_id'])
                  ->orWhere('formateur_id', $validated['formateur_id'])
                  ->orWhere('group_id', $validated['group_id']);
            })
            ->first();

        if ($conflict) {
            return $this->error('Conflit détecté dans l\'emploi du temps', 422);
        }

        // Enforce 30h/week cap for the formateur.
        $addingMinutes = $this->minutesBetween($validated['heure_debut'], $validated['heure_fin']);
        $existingMinutes = $this->formateurWeeklyMinutes($validated['formateur_id']);
        if ($existingMinutes + $addingMinutes > self::FORMATEUR_WEEKLY_CAP_MINUTES) {
            $currentH = round($existingMinutes / 60, 1);
            return $this->error(
                "Ce formateur atteint déjà {$currentH}h / 30h cette semaine. Ajouter cette séance dépasserait la limite OFPPT.",
                422
            );
        }

        $entry = EmploiDuTemps::create($validated);
        $entry->load(['group', 'module', 'formateur.user', 'salle']);

        return $this->success($entry, 'Séance ajoutée', 201);
    }

    public function update(Request $request, EmploiDuTemps $emploiDuTemp)
    {
        $validated = $request->validate([
            'group_id' => 'sometimes|exists:groups,id',
            'module_id' => 'sometimes|exists:modules,id',
            'formateur_id' => 'sometimes|exists:formateurs,id',
            'salle_id' => 'sometimes|exists:salles,id',
            'jour' => 'sometimes|in:lundi,mardi,mercredi,jeudi,vendredi,samedi',
            'heure_debut' => 'sometimes|date_format:H:i',
            'heure_fin' => 'sometimes|date_format:H:i',
        ]);

        // Conflict check on the final state (merge current + incoming), excluding self
        $final = array_merge([
            'group_id'     => $emploiDuTemp->group_id,
            'module_id'    => $emploiDuTemp->module_id,
            'formateur_id' => $emploiDuTemp->formateur_id,
            'salle_id'     => $emploiDuTemp->salle_id,
            'jour'         => $emploiDuTemp->jour,
            'heure_debut'  => $emploiDuTemp->heure_debut,
            'heure_fin'    => $emploiDuTemp->heure_fin,
        ], $validated);

        // Block switching to an indisponible salle.
        if (array_key_exists('salle_id', $validated)) {
            $salle = Salle::find($final['salle_id']);
            if ($salle && ! $salle->is_active) {
                return $this->error('Cette salle est marquée indisponible' . ($salle->motif_indisponibilite ? ' : ' . $salle->motif_indisponibilite : '.'), 422);
            }
        }

        $conflict = EmploiDuTemps::where('id', '!=', $emploiDuTemp->id)
            ->where('jour', $final['jour'])
            ->where(function ($q) use ($final) {
                $q->where('heure_debut', '<', $final['heure_fin'])
                  ->where('heure_fin', '>', $final['heure_debut']);
            })
            ->where(function ($q) use ($final) {
                $q->where('salle_id', $final['salle_id'])
                  ->orWhere('formateur_id', $final['formateur_id'])
                  ->orWhere('group_id', $final['group_id']);
            })
            ->first();

        if ($conflict) {
            return $this->error('Conflit détecté dans l\'emploi du temps (salle, formateur ou groupe déjà pris à ce créneau)', 422);
        }

        // Re-check the 30h/week cap on the final state, excluding self.
        $finalMinutes = $this->minutesBetween($final['heure_debut'], $final['heure_fin']);
        $existingMinutes = $this->formateurWeeklyMinutes($final['formateur_id'], $emploiDuTemp->id);
        if ($existingMinutes + $finalMinutes > self::FORMATEUR_WEEKLY_CAP_MINUTES) {
            $currentH = round($existingMinutes / 60, 1);
            return $this->error(
                "Ce formateur atteint déjà {$currentH}h / 30h cette semaine. Cette modification dépasserait la limite OFPPT.",
                422
            );
        }

        $emploiDuTemp->update($validated);
        $emploiDuTemp->load(['group', 'module', 'formateur.user', 'salle']);

        return $this->success($emploiDuTemp, 'Séance mise à jour');
    }

    public function show(EmploiDuTemps $emploiDuTemp)
    {
        return $this->success($emploiDuTemp->load(['group.filiere', 'module', 'formateur.user', 'salle']));
    }

    public function destroy(EmploiDuTemps $emploiDuTemp)
    {
        $emploiDuTemp->delete();
        return $this->success(null, 'Séance supprimée');
    }
}
