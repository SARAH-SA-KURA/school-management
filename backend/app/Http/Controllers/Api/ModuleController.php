<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Filiere;
use App\Models\Module;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ModuleController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $query = Module::with(['filiere', 'formateurs.user']);

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('nom', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%");
            });
        }

        if ($request->has('filiere_id')) {
            $query->where('filiere_id', $request->filiere_id);
        }

        if ($request->has('semestre')) {
            $query->where('semestre', $request->semestre);
        }

        $query->orderBy($request->input('sort_by', 'created_at'), $request->input('sort_dir', 'desc'));

        return $this->paginated($query, $request);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|string|unique:modules,code',
            'nom' => 'required|string|max:255',
            'description' => 'nullable|string',
            'coefficient' => 'required|numeric|min:0',
            'heures_total' => 'required|integer|min:0',
            'filiere_id' => 'required|exists:filieres,id',
            'semestre' => 'required|integer|min:1|max:6',
            'is_active' => 'boolean',
            'formateur_ids' => 'nullable|array',
            'formateur_ids.*' => 'exists:formateurs,id',
        ]);

        $formateurIds = $validated['formateur_ids'] ?? null;
        unset($validated['formateur_ids']);

        $module = DB::transaction(function () use ($validated, $formateurIds) {
            $module = Module::create($validated);
            if (is_array($formateurIds)) {
                $module->formateurs()->sync($formateurIds);
            }
            return $module;
        });

        $module->load(['filiere', 'formateurs.user']);

        return $this->success($module, 'Module créé avec succès', 201);
    }

    public function show(Module $module)
    {
        $module->load('filiere');
        return $this->success($module);
    }

    public function update(Request $request, Module $module)
    {
        $validated = $request->validate([
            'code' => 'sometimes|string|unique:modules,code,' . $module->id,
            'nom' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'coefficient' => 'sometimes|numeric|min:0',
            'heures_total' => 'sometimes|integer|min:0',
            'filiere_id' => 'sometimes|exists:filieres,id',
            'semestre' => 'sometimes|integer|min:1|max:6',
            'is_active' => 'boolean',
            'formateur_ids' => 'nullable|array',
            'formateur_ids.*' => 'exists:formateurs,id',
        ]);

        $formateurIds = array_key_exists('formateur_ids', $validated) ? $validated['formateur_ids'] : null;
        unset($validated['formateur_ids']);

        DB::transaction(function () use ($validated, $module, $formateurIds, $request) {
            $module->update($validated);
            if ($request->has('formateur_ids')) {
                $module->formateurs()->sync($formateurIds ?? []);
            }
        });

        $module->load(['filiere', 'formateurs.user']);

        return $this->success($module, 'Module mis à jour');
    }

    public function destroy(Module $module)
    {
        $module->delete();
        return $this->success(null, 'Module supprimé');
    }

    public function bulkStore(Request $request)
    {
        $validated = $request->validate([
            'filiere_id'                 => 'required|exists:filieres,id',
            'modules'                    => 'required|array|min:1',
            'modules.*.code'             => 'nullable|string|max:255',
            'modules.*.nom'              => 'required|string|max:255',
            'modules.*.heures_total'     => 'required|integer|min:0',
            'modules.*.coefficient'      => 'nullable|numeric|min:0',
            'modules.*.semestre'         => 'nullable|integer|min:1|max:6',
            'modules.*.description'      => 'nullable|string',
        ]);

        $filiere = Filiere::findOrFail($validated['filiere_id']);
        $created = [];
        $skipped = [];

        $existingNoms = Module::where('filiere_id', $filiere->id)
            ->pluck('nom')
            ->map(fn ($n) => mb_strtolower(trim($n)))
            ->all();
        $existingCodes = Module::pluck('code')
            ->map(fn ($c) => mb_strtolower(trim($c)))
            ->all();

        $seenNoms = [];
        $seenCodes = [];

        DB::transaction(function () use ($validated, $filiere, &$created, &$skipped, $existingNoms, $existingCodes, &$seenNoms, &$seenCodes) {
            $count = Module::where('filiere_id', $filiere->id)->count();
            foreach ($validated['modules'] as $i => $m) {
                $nomKey = mb_strtolower(trim($m['nom']));
                $codeKey = !empty($m['code']) ? mb_strtolower(trim($m['code'])) : null;

                // Duplicate within CSV batch
                if (in_array($nomKey, $seenNoms, true)) {
                    $skipped[] = ['nom' => $m['nom'], 'reason' => 'doublon dans le fichier'];
                    continue;
                }
                if ($codeKey && in_array($codeKey, $seenCodes, true)) {
                    $skipped[] = ['nom' => $m['nom'], 'reason' => 'code dupliqué dans le fichier'];
                    continue;
                }

                // Already in DB
                if (in_array($nomKey, $existingNoms, true)) {
                    $skipped[] = ['nom' => $m['nom'], 'reason' => 'déjà existant dans la filière'];
                    continue;
                }
                if ($codeKey && in_array($codeKey, $existingCodes, true)) {
                    $skipped[] = ['nom' => $m['nom'], 'reason' => 'code déjà pris'];
                    continue;
                }

                $code = !empty($m['code'])
                    ? $m['code']
                    : $this->uniqueModuleCode($filiere->code, $count + count($created) + 1);

                $created[] = Module::create([
                    'code'         => $code,
                    'nom'          => $m['nom'],
                    'description'  => $m['description'] ?? null,
                    'coefficient'  => $m['coefficient'] ?? 1,
                    'heures_total' => $m['heures_total'],
                    'filiere_id'   => $filiere->id,
                    'semestre'     => $m['semestre'] ?? 1,
                    'is_active'    => true,
                ]);

                $seenNoms[] = $nomKey;
                if ($codeKey) $seenCodes[] = $codeKey;
            }
        });

        $createdCount = count($created);
        $skippedCount = count($skipped);
        $msg = $createdCount . ' module(s) importé(s)';
        if ($skippedCount > 0) $msg .= ", {$skippedCount} ignoré(s) (doublons)";

        return $this->success(
            ['created' => $createdCount, 'skipped' => $skipped],
            $msg,
            201
        );
    }

    private function uniqueModuleCode(string $filiereCode, int $index): string
    {
        $base = $filiereCode . '-M' . str_pad((string) $index, 2, '0', STR_PAD_LEFT);
        $code = $base;
        $n = 1;
        while (Module::where('code', $code)->exists()) {
            $n++;
            $code = $base . chr(64 + $n);
        }
        return $code;
    }
}
