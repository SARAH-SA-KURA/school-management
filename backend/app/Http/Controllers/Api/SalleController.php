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
}
