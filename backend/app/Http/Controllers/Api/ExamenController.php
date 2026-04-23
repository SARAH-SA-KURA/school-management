<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Examen;
use App\Models\Salle;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class ExamenController extends Controller
{
    use ApiResponse;

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
