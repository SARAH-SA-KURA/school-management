<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Absence;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class AbsenceController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $query = Absence::with(['stagiaire.user', 'module']);

        if ($request->has('stagiaire_id')) {
            $query->where('stagiaire_id', $request->stagiaire_id);
        }
        if ($request->has('module_id')) {
            $query->where('module_id', $request->module_id);
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
            'module_id' => 'nullable|exists:modules,id',
            'date_absence' => 'required|date',
            'heure_debut' => 'required|date_format:H:i',
            'heure_fin' => 'required|date_format:H:i',
            'motif' => 'nullable|string',
            'status' => 'in:non_justifiee,justifiee,en_attente',
        ]);

        $absence = Absence::create($validated);
        $absence->load(['stagiaire.user', 'module']);

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
}
