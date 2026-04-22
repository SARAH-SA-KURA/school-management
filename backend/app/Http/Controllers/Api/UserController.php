<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $query = User::query();

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('nom', 'like', "%{$search}%")
                  ->orWhere('prenom', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($request->has('role')) {
            $query->where('role', $request->role);
        }

        $query->orderBy($request->input('sort_by', 'created_at'), $request->input('sort_dir', 'desc'));

        return $this->paginated($query, $request);
    }

    public function store(Request $request)
    {
        // Formateur + Stagiaire have their own profile tables — creating them
        // here would leave a User without the required child row, so they must
        // go through /formateurs and /stagiaires respectively.
        $validated = $request->validate([
            'nom' => 'required|string|max:255',
            'prenom' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'role' => 'required|in:directeur,surveillant',
            'telephone' => 'nullable|string',
        ]);

        $validated['password'] = Hash::make($validated['password']);
        $user = User::create($validated);

        return $this->success($user, 'Utilisateur créé', 201);
    }

    public function show(User $user)
    {
        return $this->success($user);
    }

    public function update(Request $request, User $user)
    {
        // Role can only be changed between the two "profile-less" roles here.
        // Switching to/from formateur/stagiaire would orphan or duplicate the
        // related profile row and must be done via the dedicated endpoints.
        $validated = $request->validate([
            'nom' => 'sometimes|string|max:255',
            'prenom' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
            'role' => 'sometimes|in:directeur,surveillant',
            'telephone' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        if (isset($validated['role']) && in_array($user->role, ['formateur', 'stagiaire'], true)) {
            return $this->error("Modifiez un compte formateur / stagiaire depuis sa page dédiée.", 422);
        }

        $user->update($validated);

        return $this->success($user, 'Utilisateur mis à jour');
    }

    public function destroy(User $user)
    {
        $user->update(['is_active' => false]);
        return $this->success(null, 'Utilisateur désactivé');
    }
}
