<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Examen;
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
        if ($request->has('type')) {
            $query->where('type', $request->type);
        }
        if ($request->has('date_from')) {
            $query->where('date_examen', '>=', $request->date_from);
        }
        if ($request->has('date_to')) {
            $query->where('date_examen', '<=', $request->date_to);
        }

        $query->orderBy('date_examen', 'asc');

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
