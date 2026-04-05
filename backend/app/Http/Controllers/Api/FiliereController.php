<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Filiere;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class FiliereController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $query = Filiere::withCount(['groups', 'modules']);

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('nom', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%");
            });
        }

        if ($request->has('sort_by')) {
            $query->orderBy($request->sort_by, $request->input('sort_dir', 'asc'));
        } else {
            $query->orderBy('created_at', 'desc');
        }

        return $this->paginated($query, $request);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|string|unique:filieres,code',
            'nom' => 'required|string|max:255',
            'description' => 'nullable|string',
            'duree_mois' => 'required|integer|min:1',
            'is_active' => 'boolean',
        ]);

        $filiere = Filiere::create($validated);

        return $this->success($filiere, 'Filière créée avec succès', 201);
    }

    public function show(Filiere $filiere)
    {
        $filiere->loadCount(['groups', 'modules']);
        return $this->success($filiere);
    }

    public function update(Request $request, Filiere $filiere)
    {
        $validated = $request->validate([
            'code' => 'sometimes|string|unique:filieres,code,' . $filiere->id,
            'nom' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'duree_mois' => 'sometimes|integer|min:1',
            'is_active' => 'boolean',
        ]);

        $filiere->update($validated);

        return $this->success($filiere, 'Filière mise à jour');
    }

    public function destroy(Filiere $filiere)
    {
        $filiere->delete();
        return $this->success(null, 'Filière supprimée');
    }

    public function all()
    {
        return $this->success(Filiere::where('is_active', true)->get(['id', 'code', 'nom']));
    }
}
