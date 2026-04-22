<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmploiDuTemps;
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
        $query = Formateur::with(['user', 'modules.filiere', 'groups.filiere']);

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

        $sortBy  = $request->input('sort_by', 'created_at');
        $sortDir = $request->input('sort_dir', 'desc');

        if (in_array($sortBy, ['nom', 'prenom', 'email', 'telephone'], true)) {
            $query->join('users', 'users.id', '=', 'formateurs.user_id')
                  ->orderBy("users.{$sortBy}", $sortDir)
                  ->select('formateurs.*');
        } else {
            $query->orderBy($sortBy, $sortDir);
        }

        $paginated = $this->paginated($query, $request);

        // Attach weekly_hours (sum of scheduled session minutes / 60) to every
        // formateur so the list can show a "X / 30h" charge badge and flag the
        // ones already at the OFPPT cap.
        $formateurs = collect($paginated->getData()->data ?? []);
        if ($formateurs->isNotEmpty()) {
            $ids = $formateurs->pluck('id')->all();
            $rows = EmploiDuTemps::whereIn('formateur_id', $ids)
                ->get(['formateur_id', 'heure_debut', 'heure_fin']);

            $minutesByFormateur = [];
            foreach ($rows as $r) {
                [$sh, $sm] = array_map('intval', explode(':', substr((string) $r->heure_debut, 0, 5)));
                [$eh, $em] = array_map('intval', explode(':', substr((string) $r->heure_fin, 0, 5)));
                $minutes = max(0, ($eh * 60 + $em) - ($sh * 60 + $sm));
                $minutesByFormateur[$r->formateur_id] = ($minutesByFormateur[$r->formateur_id] ?? 0) + $minutes;
            }

            $payload = $paginated->getData(true);
            foreach ($payload['data'] as &$item) {
                $mins = $minutesByFormateur[$item['id']] ?? 0;
                $item['weekly_hours'] = round($mins / 60, 1);
                $item['is_weekly_full'] = $mins >= 1800; // 30h = at cap
            }
            unset($item);
            return response()->json($payload);
        }

        return $paginated;
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
            'group_ids' => 'nullable|array',
            'group_ids.*' => 'exists:groups,id',
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
            if (!empty($validated['group_ids'])) {
                $formateur->groups()->sync($validated['group_ids']);
            }

            return $formateur;
        });

        $formateur->load(['user', 'modules.filiere', 'groups.filiere']);

        return $this->success($formateur, 'Formateur créé avec succès', 201);
    }

    public function show(Formateur $formateur)
    {
        $formateur->load(['user', 'modules.filiere', 'groups.filiere']);
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
            'group_ids' => 'nullable|array',
            'group_ids.*' => 'exists:groups,id',
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

            if (array_key_exists('module_ids', $validated)) {
                $formateur->modules()->sync($validated['module_ids'] ?? []);
            }
            if (array_key_exists('group_ids', $validated)) {
                $formateur->groups()->sync($validated['group_ids'] ?? []);
            }
        });

        $formateur->load(['user', 'modules.filiere', 'groups.filiere']);

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

    public function all()
    {
        $formateurs = Formateur::with('user:id,nom,prenom,email')
            ->get(['id', 'user_id', 'matricule', 'specialisation']);

        return $this->success($formateurs);
    }

    /**
     * Groups explicitly assigned to the authenticated formateur.
     * Used by Formateur-side pages (Absences, Examens, etc.) to avoid fetching
     * the entire /groups list and doing client-side narrowing.
     */
    public function myGroups(Request $request)
    {
        $user = $request->user();
        $formateur = Formateur::where('user_id', $user->id)->first();
        if (!$formateur) {
            return $this->error('Formateur record not found', 404);
        }
        return $this->success(
            $formateur->groups()->with('filiere:id,nom,code')->get()
        );
    }

    /**
     * Stagiaires in groups explicitly assigned to the authenticated formateur.
     */
    public function myStagiaires(Request $request)
    {
        $user = $request->user();
        $formateur = Formateur::where('user_id', $user->id)->first();
        if (!$formateur) {
            return $this->error('Formateur record not found', 404);
        }

        $groupIds = $formateur->groups()->pluck('groups.id');

        $stagiaires = \App\Models\Stagiaire::with(['user:id,nom,prenom,email,telephone', 'group:id,nom,filiere_id', 'group.filiere:id,nom'])
            ->whereIn('group_id', $groupIds)
            ->when($request->has('group_id') && $request->group_id !== '', fn ($q) => $q->where('group_id', $request->group_id))
            ->get();

        return $this->success($stagiaires);
    }
}
