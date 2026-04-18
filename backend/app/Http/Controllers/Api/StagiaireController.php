<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Stagiaire;
use App\Models\User;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class StagiaireController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $query = Stagiaire::with(['user', 'group.filiere']);

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('cef', 'like', "%{$search}%")
                  ->orWhere('cne', 'like', "%{$search}%")
                  ->orWhere('cin', 'like', "%{$search}%")
                  ->orWhereHas('user', function ($uq) use ($search) {
                      $uq->where('nom', 'like', "%{$search}%")
                         ->orWhere('prenom', 'like', "%{$search}%");
                  });
            });
        }

        if ($request->has('group_id')) {
            $query->where('group_id', $request->group_id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
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
            'cef' => 'required|string|unique:stagiaires,cef',
            'cne' => 'required|string|unique:stagiaires,cne',
            'cin' => 'required|string|unique:stagiaires,cin',
            'group_id' => 'required|exists:groups,id',
            'date_inscription' => 'required|date',
            'date_naissance' => 'required|date',
            'adresse' => 'nullable|string',
        ]);

        $stagiaire = DB::transaction(function () use ($validated) {
            $user = User::create([
                'nom' => $validated['nom'],
                'prenom' => $validated['prenom'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'telephone' => $validated['telephone'] ?? null,
                'role' => 'stagiaire',
            ]);

            return Stagiaire::create([
                'user_id' => $user->id,
                'cef' => $validated['cef'],
                'cne' => $validated['cne'],
                'cin' => $validated['cin'],
                'group_id' => $validated['group_id'],
                'date_inscription' => $validated['date_inscription'],
                'date_naissance' => $validated['date_naissance'],
                'adresse' => $validated['adresse'] ?? null,
            ]);
        });

        $stagiaire->load(['user', 'group.filiere']);

        return $this->success($stagiaire, 'Stagiaire créé avec succès', 201);
    }

    public function show(Stagiaire $stagiaire)
    {
        $stagiaire->load(['user', 'group.filiere', 'notes.examen.module', 'absences.module']);
        return $this->success($stagiaire);
    }

    public function update(Request $request, Stagiaire $stagiaire)
    {
        $validated = $request->validate([
            'nom' => 'sometimes|string|max:255',
            'prenom' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $stagiaire->user_id,
            'telephone' => 'nullable|string',
            'cef' => 'sometimes|string|unique:stagiaires,cef,' . $stagiaire->id,
            'cne' => 'sometimes|string|unique:stagiaires,cne,' . $stagiaire->id,
            'cin' => 'sometimes|string|unique:stagiaires,cin,' . $stagiaire->id,
            'group_id' => 'sometimes|exists:groups,id',
            'date_inscription' => 'sometimes|date',
            'date_naissance' => 'sometimes|date',
            'adresse' => 'nullable|string',
            'status' => 'sometimes|in:actif,abandon,diplome,suspendu',
        ]);

        DB::transaction(function () use ($validated, $stagiaire) {
            $userFields = array_intersect_key($validated, array_flip(['nom', 'prenom', 'email', 'telephone']));
            if (!empty($userFields)) {
                $stagiaire->user->update($userFields);
            }

            $stagiaireFields = array_intersect_key($validated, array_flip(['cef', 'cne', 'cin', 'group_id', 'date_inscription', 'date_naissance', 'adresse', 'status']));
            if (!empty($stagiaireFields)) {
                $stagiaire->update($stagiaireFields);
            }
        });

        $stagiaire->load(['user', 'group.filiere']);

        return $this->success($stagiaire, 'Stagiaire mis à jour');
    }

    public function destroy(Stagiaire $stagiaire)
    {
        DB::transaction(function () use ($stagiaire) {
            $stagiaire->user->update(['is_active' => false]);
            $stagiaire->update(['status' => 'suspendu']);
        });

        return $this->success(null, 'Stagiaire désactivé');
    }
}
