<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Formateur;
use App\Models\User;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class FormateurController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $query = Formateur::with(['user', 'modules.filiere']);

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('matricule', 'like', "%{$search}%")
                  ->orWhereHas('user', function ($uq) use ($search) {
                      $uq->where('nom', 'like', "%{$search}%")
                         ->orWhere('prenom', 'like', "%{$search}%")
                         ->orWhere('email', 'like', "%{$search}%");
                  });
            });
        }

        $query->orderBy($request->input('sort_by', 'created_at'), $request->input('sort_dir', 'desc'));

        return $this->paginated($query, $request);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nom' => 'required|string|max:255',
            'prenom' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'telephone' => 'nullable|string',
            'matricule' => 'required|string|unique:formateurs,matricule',
            'specialisation' => 'required|string',
            'date_recrutement' => 'required|date',
            'module_ids' => 'nullable|array',
            'module_ids.*' => 'exists:modules,id',
        ]);

        $formateur = DB::transaction(function () use ($validated) {
            $user = User::create([
                'nom' => $validated['nom'],
                'prenom' => $validated['prenom'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'telephone' => $validated['telephone'] ?? null,
                'role' => 'formateur',
            ]);

            $formateur = Formateur::create([
                'user_id' => $user->id,
                'matricule' => $validated['matricule'],
                'specialisation' => $validated['specialisation'],
                'date_recrutement' => $validated['date_recrutement'],
            ]);

            if (!empty($validated['module_ids'])) {
                $formateur->modules()->sync($validated['module_ids']);
            }

            return $formateur;
        });

        $formateur->load(['user', 'modules']);

        return $this->success($formateur, 'Formateur créé avec succès', 201);
    }

    public function show(Formateur $formateur)
    {
        $formateur->load(['user', 'modules.filiere']);
        return $this->success($formateur);
    }

    public function update(Request $request, Formateur $formateur)
    {
        $validated = $request->validate([
            'nom' => 'sometimes|string|max:255',
            'prenom' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $formateur->user_id,
            'telephone' => 'nullable|string',
            'matricule' => 'sometimes|string|unique:formateurs,matricule,' . $formateur->id,
            'specialisation' => 'sometimes|string',
            'date_recrutement' => 'sometimes|date',
            'is_active' => 'boolean',
            'module_ids' => 'nullable|array',
            'module_ids.*' => 'exists:modules,id',
        ]);

        DB::transaction(function () use ($validated, $formateur) {
            $userFields = array_intersect_key($validated, array_flip(['nom', 'prenom', 'email', 'telephone']));
            if (!empty($userFields)) {
                $formateur->user->update($userFields);
            }

            $formateurFields = array_intersect_key($validated, array_flip(['matricule', 'specialisation', 'date_recrutement', 'is_active']));
            if (!empty($formateurFields)) {
                $formateur->update($formateurFields);
            }

            if (isset($validated['module_ids'])) {
                $formateur->modules()->sync($validated['module_ids']);
            }
        });

        $formateur->load(['user', 'modules']);

        return $this->success($formateur, 'Formateur mis à jour');
    }

    public function destroy(Formateur $formateur)
    {
        DB::transaction(function () use ($formateur) {
            $formateur->user->update(['is_active' => false]);
            $formateur->update(['is_active' => false]);
        });

        return $this->success(null, 'Formateur désactivé');
    }

    public function modules(Formateur $formateur)
    {
        $modules = $formateur->modules()->get();
        return $this->success($modules);
    }
}
