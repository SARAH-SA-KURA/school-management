<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Formateur;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Identifiants incorrects',
            ], 401);
        }

        if (!$user->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'Votre compte a été désactivé',
            ], 403);
        }

        // For simplicity, skip email verification and 2FA steps - directly issue token
        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'data' => [
                'user' => $user,
                'token' => $token,
            ],
            'message' => 'Connexion réussie',
        ]);
    }

    public function me(Request $request)
    {
        return response()->json([
            'success' => true,
            'data' => $request->user(),
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'data' => null,
            'message' => 'Déconnexion réussie',
        ]);
    }

    public function forgotPassword(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        $status = Password::sendResetLink($request->only('email'));

        if ($status === Password::RESET_LINK_SENT) {
            return response()->json([
                'success' => true,
                'message' => 'Lien de réinitialisation envoyé',
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Impossible d\'envoyer le lien de réinitialisation',
        ], 400);
    }

    public function resetPassword(Request $request)
    {
        $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => 'required|min:8|confirmed',
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->forceFill([
                    'password' => Hash::make($password),
                ])->setRememberToken(Str::random(60));
                $user->save();
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return response()->json([
                'success' => true,
                'message' => 'Mot de passe réinitialisé avec succès',
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la réinitialisation',
        ], 400);
    }

    public function verifyEmail(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'code' => 'required|string|size:6',
        ]);

        // Simplified - in production, verify against stored OTP
        return response()->json([
            'success' => true,
            'data' => ['verified' => true],
            'message' => 'Email vérifié',
        ]);
    }

    public function verify2FA(Request $request)
    {
        $request->validate([
            'code' => 'required|string|size:6',
            'token' => 'required|string',
        ]);

        // Simplified - in production, verify TOTP code
        return response()->json([
            'success' => false,
            'message' => '2FA non configuré',
        ], 400);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'prenom' => 'sometimes|string|max:255',
            'nom' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
            'telephone' => 'nullable|string',
            'avatar' => 'nullable|image|max:5120',
        ]);

        if ($request->hasFile('avatar')) {
            $path = $request->file('avatar')->store('avatars', 'public');
            $validated['avatar'] = '/storage/' . $path;
        }

        unset($validated['avatar_file']);
        $user->update($validated);

        return response()->json([
            'success' => true,
            'data' => $user->fresh(),
            'message' => 'Profil mis à jour',
        ]);
    }

    public function changePassword(Request $request)
    {
        $request->validate([
            'new_password' => 'required|string|min:8|confirmed',
        ]);

        $old = $request->input('old_password') ?? $request->input('current_password');
        if (!$old) {
            return response()->json([
                'success' => false,
                'message' => 'Ancien mot de passe requis',
            ], 422);
        }

        $user = $request->user();

        if (!Hash::check($old, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Ancien mot de passe incorrect',
            ], 422);
        }

        $user->update(['password' => Hash::make($request->new_password)]);

        return response()->json([
            'success' => true,
            'message' => 'Mot de passe mis à jour',
        ]);
    }

    public function formateur(Request $request)
    {
        $user = $request->user();
        if ($user->role !== 'formateur') {
            return response()->json([
                'success' => false,
                'message' => 'User is not a formateur',
            ], 403);
        }

        $formateur = Formateur::where('user_id', $user->id)
            ->with(['modules.filiere', 'groups.filiere'])
            ->withCount([
                'examens as examens_a_venir_count' => function ($q) {
                    $q->where('date_examen', '>=', now()->toDateString());
                },
            ])
            ->first();

        if (!$formateur) {
            return response()->json([
                'success' => false,
                'message' => 'Formateur record not found',
            ], 404);
        }

        // Total stagiaires = students in groups explicitly assigned to this
        // formateur (via the formateur_group pivot). This works correctly for
        // a brand-new formateur who has no exams yet but already has group
        // assignments from the Directeur's UI.
        $formateur->total_stagiaires = \App\Models\Stagiaire::whereIn(
            'group_id',
            $formateur->groups->pluck('id')
        )->count();

        // Per-module groups — which of MY groups do I teach THIS module to?
        // Priority 1: groups where sessions already exist in emploi_du_temps.
        // Priority 2 (fallback): groups from the formateur_group pivot that
        // match the module's (filière, year) — covers the realistic case where
        // the Directeur has assigned the formateur to a group but the emploi
        // hasn't scheduled that module yet. Without this, the Modules tab
        // showed "Non assigné" for modules whose sessions were displaced by
        // the 30h cap, which the user rightly flagged as wrong.
        $moduleIds = $formateur->modules->pluck('id');
        if ($moduleIds->isNotEmpty()) {
            $pairs = \App\Models\EmploiDuTemps::where('formateur_id', $formateur->id)
                ->whereIn('module_id', $moduleIds)
                ->get(['module_id', 'group_id'])
                ->groupBy('module_id');

            $scheduledGroupIds = $pairs->flatten(1)->pluck('group_id')->unique();
            $groupsById = \App\Models\Group::whereIn('id', $scheduledGroupIds)
                ->get(['id', 'nom', 'annee', 'filiere_id'])
                ->keyBy('id');

            foreach ($formateur->modules as $m) {
                $gIds = ($pairs[$m->id] ?? collect())->pluck('group_id')->unique();

                if ($gIds->isNotEmpty()) {
                    $groups = $gIds->map(fn ($gid) => $groupsById[$gid] ?? null)->filter();
                } else {
                    // Fallback: infer from formateur_group pivot + module's (filière, year).
                    // Module.semestre here is our year convention (1 → année 1, 2 → année 2).
                    $groups = $formateur->groups
                        ->where('filiere_id', $m->filiere_id)
                        ->where('annee', $m->semestre);
                }

                $m->setAttribute('groups', $groups->values());
            }
        }

        return response()->json([
            'success' => true,
            'data' => $formateur,
        ]);
    }
}
