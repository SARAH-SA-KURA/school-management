<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Module;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class ModuleController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $query = Module::with('filiere');

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
        ]);

        $module = Module::create($validated);
        $module->load('filiere');

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
        ]);

        $module->update($validated);
        $module->load('filiere');

        return $this->success($module, 'Module mis à jour');
    }

    public function destroy(Module $module)
    {
        $module->delete();
        return $this->success(null, 'Module supprimé');
    }
}
