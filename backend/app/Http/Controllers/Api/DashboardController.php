<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\{Stagiaire, Formateur, Filiere, Group, Module, Salle, ActivityLog};
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    use ApiResponse;

    public function stats()
    {
        return $this->success([
            'total_stagiaires' => Stagiaire::where('status', 'actif')->count(),
            'total_formateurs' => Formateur::where('is_active', true)->count(),
            'total_filieres' => Filiere::where('is_active', true)->count(),
            'total_groups' => Group::where('is_active', true)->count(),
            'total_modules' => Module::where('is_active', true)->count(),
            'total_salles' => Salle::where('is_active', true)->count(),
        ]);
    }

    public function recentActivity()
    {
        $logs = ActivityLog::with('user')
            ->orderBy('created_at', 'desc')
            ->limit(20)
            ->get();

        return $this->success($logs);
    }

    public function stagiairesByFiliere()
    {
        $data = Filiere::withCount(['groups' => function ($q) {
            $q->withCount('stagiaires');
        }])->where('is_active', true)->get()->map(function ($filiere) {
            return [
                'filiere' => $filiere->nom,
                'count' => $filiere->groups->sum('stagiaires_count'),
            ];
        });

        return $this->success($data);
    }
}
