<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Salle;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class SalleController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $query = Salle::query();

        if ($request->has('search')) {
            $query->where('nom', 'like', "%{$request->search}%");
        }

        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        $query->orderBy($request->input('sort_by', 'created_at'), $request->input('sort_dir', 'desc'));

        return $this->paginated($query, $request);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nom' => 'required|string|max:255',
            'type' => 'required|in:cours,tp,amphi,reunion',
            'capacite' => 'required|integer|min:1',
            'batiment' => 'nullable|string',
            'equipements' => 'nullable|array',
            'is_active' => 'boolean',
            'motif_indisponibilite' => 'nullable|string|max:500',
        ]);

        // A room is either disponible (is_active=true, no motif) or
        // indisponible (is_active=false, motif optional). Clear motif when available.
        if (($validated['is_active'] ?? true) === true) {
            $validated['motif_indisponibilite'] = null;
        }

        $salle = Salle::create($validated);

        return $this->success($salle, 'Salle créée avec succès', 201);
    }

    public function show(Salle $salle)
    {
        return $this->success($salle);
    }

    public function update(Request $request, Salle $salle)
    {
        $validated = $request->validate([
            'nom' => 'sometimes|string|max:255',
            'type' => 'sometimes|in:cours,tp,amphi,reunion',
            'capacite' => 'sometimes|integer|min:1',
            'batiment' => 'nullable|string',
            'equipements' => 'nullable|array',
            'is_active' => 'boolean',
            'motif_indisponibilite' => 'nullable|string|max:500',
        ]);

        // Disponible rooms never carry a motif — clear it if we're flipping back.
        if (array_key_exists('is_active', $validated) && $validated['is_active'] === true) {
            $validated['motif_indisponibilite'] = null;
        }

        $salle->update($validated);

        return $this->success($salle, 'Salle mise à jour');
    }

    public function destroy(Salle $salle)
    {
        $salle->delete();
        return $this->success(null, 'Salle supprimée');
    }

    public function all()
    {
        // Only disponibles — indisponible rooms should never appear in pickers
        // (emploi, examens). Directeur can still see them via /salles (index).
        return $this->success(Salle::where('is_active', true)->get(['id', 'nom', 'type', 'capacite']));
    }

    /**
     * Salles that are free at a specific date + time range.
     *
     * Filters out:
     *   - indisponible rooms (is_active=false)
     *   - rooms with an overlapping exam at (date, heure_debut → heure_fin)
     *   - rooms with an overlapping emploi_du_temps session on that weekday
     *
     * `exclude_examen` lets the edit flow ignore the exam being updated so its
     * current salle stays pickable. Required params are validated loosely so
     * clients can still open the room picker before filling the time — when
     * anything is missing we just fall back to `all()` (disponible rooms).
     */
    public function available(Request $request)
    {
        $date   = $request->input('date');
        $debut  = $request->input('heure_debut');
        $fin    = $request->input('heure_fin');
        $excludeExamen = $request->input('exclude_examen');

        $base = Salle::where('is_active', true);

        if (!$date || !$debut || !$fin) {
            return $this->success($base->get(['id', 'nom', 'type', 'capacite']));
        }

        $debut5 = substr($debut, 0, 5);
        $fin5   = substr($fin, 0, 5);

        // Clashing exams on the same date with overlapping [debut, fin).
        $busyFromExams = \App\Models\Examen::query()
            ->whereDate('date_examen', $date)
            ->where('heure_debut', '<', $fin5)
            ->where('heure_fin',   '>', $debut5)
            ->whereNotNull('salle_id')
            ->when($excludeExamen, fn ($q) => $q->where('id', '!=', $excludeExamen))
            ->pluck('salle_id');

        // Clashing emploi_du_temps sessions on that weekday (same hour rules).
        $joursFr = [
            1 => 'lundi', 2 => 'mardi', 3 => 'mercredi',
            4 => 'jeudi', 5 => 'vendredi', 6 => 'samedi',
        ];
        try {
            $jour = $joursFr[\Carbon\Carbon::parse($date)->dayOfWeekIso] ?? null;
        } catch (\Throwable $e) {
            $jour = null;
        }
        $busyFromEmploi = collect();
        if ($jour) {
            $busyFromEmploi = \App\Models\EmploiDuTemps::query()
                ->where('jour', $jour)
                ->where('heure_debut', '<', $fin5)
                ->where('heure_fin',   '>', $debut5)
                ->pluck('salle_id');
        }

        $busy = $busyFromExams->merge($busyFromEmploi)->unique()->values();

        $rooms = $base->whereNotIn('id', $busy)->get(['id', 'nom', 'type', 'capacite']);
        return $this->success($rooms);
    }
}
