<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmploiDuTemps;
use App\Models\Note;
use App\Models\Examen;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class SurveillantController extends Controller
{
    use ApiResponse;

    public function schedule(Request $request)
    {
        $query = EmploiDuTemps::with(['module', 'group.filiere', 'formateur.user', 'salle']);

        if ($request->has('filiere_id')) {
            $query->whereHas('group', function ($q) {
                $q->where('filiere_id', request('filiere_id'));
            });
        }

        if ($request->has('group_id')) {
            $query->where('group_id', $request->group_id);
        }

        if ($request->has('jour')) {
            $query->where('jour', $request->jour);
        }

        $query->orderByRaw("FIELD(jour, 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi')")
              ->orderBy('heure_debut');

        return $this->success($query->get());
    }

    public function exams(Request $request)
    {
        $query = Examen::with(['module', 'formateur.user']);

        if ($request->has('filiere_id')) {
            $query->whereHas('module', function ($q) {
                $q->where('filiere_id', request('filiere_id'));
            });
        }

        if ($request->has('module_id')) {
            $query->where('module_id', $request->module_id);
        }

        $query->orderBy('date_examen', 'desc');

        return $this->paginated($query, $request);
    }

    public function examResults(Request $request)
    {
        $query = Note::with(['stagiaire.user', 'examen.module', 'examen.formateur.user']);

        if ($request->has('examen_id')) {
            $query->where('examen_id', $request->examen_id);
        }

        if ($request->has('module_id')) {
            $query->whereHas('examen', function ($q) {
                $q->where('module_id', request('module_id'));
            });
        }

        if ($request->has('filiere_id')) {
            $query->whereHas('stagiaire.group', function ($q) {
                $q->where('filiere_id', request('filiere_id'));
            });
        }

        $query->orderBy('created_at', 'desc');

        return $this->paginated($query, $request);
    }

    public function stats(Request $request)
    {
        $totalExams = Examen::count();
        $totalGrades = Note::count();
        $uniqueModules = Examen::distinct()->count('module_id');
        $uniqueFormateurs = Examen::distinct()->count('formateur_id');

        return $this->success([
            'total_exams' => $totalExams,
            'total_grades' => $totalGrades,
            'unique_modules' => $uniqueModules,
            'unique_formateurs' => $uniqueFormateurs,
        ]);
    }
}
