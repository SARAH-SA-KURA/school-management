<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\{Stagiaire, Formateur, Filiere, Group, Module, Salle, Absence, ActivityLog};
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    use ApiResponse;

    public function stats()
    {
        $totalStagiaires = Stagiaire::where('status', 'actif')->count();

        return $this->success([
            'stagiaires' => $totalStagiaires,
            'formateurs' => Formateur::where('is_active', true)->count(),
            'filieres' => Filiere::where('is_active', true)->count(),
            'modules' => Module::where('is_active', true)->count(),
            'groups' => Group::where('is_active', true)->count(),
            'salles' => Salle::where('is_active', true)->count(),
            'absences_today' => Absence::whereDate('date_absence', today())->count(),
            'presents_today' => $totalStagiaires - Absence::whereDate('date_absence', today())
                ->distinct('stagiaire_id')->count('stagiaire_id'),
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
        $data = Filiere::where('is_active', true)->get()->map(function ($filiere) {
            return [
                'filiere' => $filiere->nom,
                'count' => Stagiaire::where('status', 'actif')
                    ->whereHas('group', fn($q) => $q->where('filiere_id', $filiere->id))
                    ->count(),
            ];
        });

        return $this->success($data);
    }
}
