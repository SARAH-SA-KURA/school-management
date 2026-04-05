<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Module extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'nom',
        'description',
        'coefficient',
        'heures_total',
        'filiere_id',
        'semestre',
        'is_active',
    ];

    protected $casts = [
        'coefficient' => 'float',
        'is_active' => 'boolean',
    ];

    public function filiere()
    {
        return $this->belongsTo(Filiere::class);
    }

    public function formateurs()
    {
        return $this->belongsToMany(Formateur::class, 'formateur_module');
    }

    public function examens()
    {
        return $this->hasMany(Examen::class);
    }

    public function absences()
    {
        return $this->hasMany(Absence::class);
    }
}
