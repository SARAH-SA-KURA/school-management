<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Group;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class GroupController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $query = Group::with('filiere')->withCount('stagiaires');

        if ($request->filled('search')) {
            $query->where('nom', 'like', "%{$request->search}%");
        }

        if ($request->filled('filiere_id')) {
            $query->where('filiere_id', $request->filiere_id);
        }

        if ($request->filled('annee')) {
            $query->where('annee', $request->annee);
        }

        if ($request->filled('annee_scolaire')) {
            $query->where('annee_scolaire', $request->annee_scolaire);
        }

        if ($request->has('is_active') && $request->input('is_active') !== '') {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }

        $query->orderBy($request->input('sort_by', 'created_at'), $request->input('sort_dir', 'desc'));

        return $this->paginated($query, $request);
    }

    public function store(Request $request)
    {
        // Normalize so "dd-101a" and "DD-101A" can't coexist for the same year.
        $request->merge([
            'nom' => trim((string) $request->input('nom', '')),
            'annee_scolaire' => trim((string) $request->input('annee_scolaire', '')),
        ]);

        $validated = $request->validate([
            'nom' => [
                'required', 'string', 'max:255',
                Rule::unique('groups', 'nom')->where(fn ($q) =>
                    $q->where('annee_scolaire', $request->input('annee_scolaire'))
                ),
            ],
            'filiere_id' => 'required|exists:filieres,id',
            'annee' => 'required|integer|min:1|max:3',
            'annee_scolaire' => 'required|string',
            'max_stagiaires' => 'required|integer|min:1',
            'is_active' => 'boolean',
        ], [
            'nom.unique' => "Un groupe nommé « :input » existe déjà pour l'année scolaire {$request->input('annee_scolaire')}.",
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
        $request->merge([
            'nom' => trim((string) $request->input('nom', $group->nom)),
            'annee_scolaire' => trim((string) $request->input('annee_scolaire', $group->annee_scolaire)),
        ]);

        $targetYear = $request->input('annee_scolaire', $group->annee_scolaire);

        $validated = $request->validate([
            'nom' => [
                'sometimes', 'string', 'max:255',
                Rule::unique('groups', 'nom')
                    ->where(fn ($q) => $q->where('annee_scolaire', $targetYear))
                    ->ignore($group->id),
            ],
            'filiere_id' => 'sometimes|exists:filieres,id',
            'annee' => 'sometimes|integer|min:1|max:3',
            'annee_scolaire' => 'sometimes|string',
            'max_stagiaires' => 'sometimes|integer|min:1',
            'is_active' => 'boolean',
        ], [
            'nom.unique' => "Un groupe nommé « :input » existe déjà pour l'année scolaire {$targetYear}.",
        ]);

        if (array_key_exists('max_stagiaires', $validated)) {
            $currentCount = $group->stagiaires()->count();
            if ($validated['max_stagiaires'] < $currentCount) {
                return $this->error(
                    "Impossible de réduire l'effectif maximum à {$validated['max_stagiaires']} : le groupe contient déjà {$currentCount} stagiaire(s).",
                    422
                );
            }
        }

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

    public function stagiaires(Group $group)
    {
        $stagiaires = $group->stagiaires()->with(['user'])->get();
        return $this->success($stagiaires);
    }
}
