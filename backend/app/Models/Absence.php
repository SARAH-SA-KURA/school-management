<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Absence extends Model
{
    use HasFactory;

    protected $fillable = [
        'stagiaire_id',
        'module_id',
        'date_absence',
        'heure_debut',
        'heure_fin',
        'motif',
        'justification',
        'status',
    ];

    protected $casts = [
        'date_absence' => 'date',
    ];

    public function stagiaire()
    {
        return $this->belongsTo(Stagiaire::class);
    }

    public function module()
    {
        return $this->belongsTo(Module::class);
    }
}
