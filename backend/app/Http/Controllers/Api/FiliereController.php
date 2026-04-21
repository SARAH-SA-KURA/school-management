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
            'modules' => 'nullable|array',
            'modules.*.nom' => 'required_with:modules|string|max:255',
            'modules.*.heures_total' => 'required_with:modules|integer|min:0',
            'modules.*.coefficient' => 'nullable|numeric|min:0',
            'modules.*.semestre' => 'nullable|integer|min:1',
        ]);

        $modulesData = $validated['modules'] ?? [];
        unset($validated['modules']);

        $filiere = DB::transaction(function () use ($validated, $modulesData) {
            $filiere = Filiere::create($validated);

            foreach ($modulesData as $i => $m) {
                Module::create([
                    'code' => $this->uniqueModuleCode($filiere->code, $i + 1),
                    'nom' => $m['nom'],
                    'heures_total' => $m['heures_total'],
                    'coefficient' => $m['coefficient'] ?? 1,
                    'semestre' => $m['semestre'] ?? 1,
                    'filiere_id' => $filiere->id,
                ]);
            }

            return $filiere;
        });

        $filiere->loadCount(['groups', 'modules']);

        return $this->success($filiere, 'Filière créée avec succès', 201);
    }

    private function uniqueModuleCode(string $filiereCode, int $index): string
    {
        $base = $filiereCode . '-M' . str_pad((string) $index, 2, '0', STR_PAD_LEFT);
        $code = $base;
        $n = 1;
        while (Module::where('code', $code)->exists()) {
            $n++;
            $code = $base . chr(64 + $n); // -M01A, -M01B, ...
        }
        return $code;
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
            'niveau' => 'nullable|string|max:255',
            'secteur' => 'nullable|string|max:255',
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
        return $this->success(
            Filiere::where('is_active', true)->get(['id', 'code', 'nom', 'niveau', 'secteur'])
        );
    }
}
