<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Filiere;
use App\Models\Module;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
            'niveau' => 'nullable|string|max:255',
            'secteur' => 'nullable|string|max:255',
            'is_active' => 'boolean',
            'module_ids' => 'nullable|array',
            'module_ids.*' => 'exists:modules,id',
        ]);

        $moduleIds = $validated['module_ids'] ?? [];
        unset($validated['module_ids']);

        $filiere = DB::transaction(function () use ($validated, $moduleIds) {
            $filiere = Filiere::create($validated);

            // Attach = move: every checked module has its filiere_id reassigned
            // to this new filière. (Schema keeps filiere_id NOT NULL, so a
            // module always belongs to exactly one filière at a time.)
            if (!empty($moduleIds)) {
                Module::whereIn('id', $moduleIds)->update(['filiere_id' => $filiere->id]);
            }

            return $filiere;
        });

        $filiere->loadCount(['groups', 'modules']);

        return $this->success($filiere, 'Filière créée avec succès', 201);
    }

    public function show(Filiere $filiere)
    {
        $filiere->loadCount(['groups', 'modules']);
        $filiere->load('modules:id,nom,code,filiere_id,heures_total,coefficient,semestre');
        return $this->success($filiere);
    }

    public function update(Request $request, Filiere $filiere)
    {
        $validated = $request->validate([
            'code' => 'sometimes|string|unique:filieres,code,' . $filiere->id,
            'nom' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'duree_mois' => 'sometimes|integer|min:1',
            'niveau' => 'nullable|string|max:255',
            'secteur' => 'nullable|string|max:255',
            'is_active' => 'boolean',
            'module_ids' => 'nullable|array',
            'module_ids.*' => 'exists:modules,id',
        ]);

        $moduleIds = array_key_exists('module_ids', $validated) ? $validated['module_ids'] : null;
        unset($validated['module_ids']);

        DB::transaction(function () use ($validated, $filiere, $moduleIds) {
            if (!empty($validated)) {
                $filiere->update($validated);
            }

            // Attach-only semantics: any checked module is moved to this filière.
            // Unchecking a pre-attached module does NOT detach it here — the
            // Directeur must attach it to another filière to move it.
            if (is_array($moduleIds) && !empty($moduleIds)) {
                Module::whereIn('id', $moduleIds)->update(['filiere_id' => $filiere->id]);
            }
        });

        return $this->success($filiere, 'Filière mise à jour');
    }

    public function destroy(Filiere $filiere)
    {
        $filiere->delete();
        return $this->success(null, 'Filière supprimée');
    }

    public function all()
    {
        return $this->success(
            Filiere::where('is_active', true)->get(['id', 'code', 'nom', 'niveau', 'secteur'])
        );
    }
}
