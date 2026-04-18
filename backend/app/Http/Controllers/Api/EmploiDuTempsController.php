<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmploiDuTemps;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class EmploiDuTempsController extends Controller
{
    use ApiResponse;

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
