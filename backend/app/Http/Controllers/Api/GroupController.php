<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Group;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class GroupController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $query = Group::with('filiere')->withCount('stagiaires');

        if ($request->has('search')) {
            $query->where('nom', 'like', "%{$request->search}%");
        }

        if ($request->has('filiere_id')) {
            $query->where('filiere_id', $request->filiere_id);
        }

        $query->orderBy($request->input('sort_by', 'created_at'), $request->input('sort_dir', 'desc'));

        return $this->paginated($query, $request);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nom' => 'required|string|max:255',
            'filiere_id' => 'required|exists:filieres,id',
            'annee' => 'required|integer|min:1|max:3',
            'annee_scolaire' => 'required|string',
            'max_stagiaires' => 'required|integer|min:1',
            'is_active' => 'boolean',
        ]);

        $group = Group::create($validated);
        $group->load('filiere');

        return $this->success($group, 'Groupe créé avec succès', 201);
    }

    public function show(Group $group)
    {
        $group->load('filiere');
        $group->loadCount('stagiaires');
        return $this->success($group);
    }

    public function update(Request $request, Group $group)
    {
        $validated = $request->validate([
            'nom' => 'sometimes|string|max:255',
            'filiere_id' => 'sometimes|exists:filieres,id',
            'annee' => 'sometimes|integer|min:1|max:3',
            'annee_scolaire' => 'sometimes|string',
            'max_stagiaires' => 'sometimes|integer|min:1',
            'is_active' => 'boolean',
        ]);

        $group->update($validated);
        $group->load('filiere');

        return $this->success($group, 'Groupe mis à jour');
    }

    public function destroy(Group $group)
    {
        $group->delete();
        return $this->success(null, 'Groupe supprimé');
    }

    public function all(Request $request)
    {
        $query = Group::where('is_active', true);
        if ($request->has('filiere_id')) {
            $query->where('filiere_id', $request->filiere_id);
        }
        return $this->success($query->get(['id', 'nom', 'filiere_id']));
    }
}
