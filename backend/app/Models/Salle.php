<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Salle extends Model
{
    use HasFactory;

    protected $fillable = [
        'nom',
        'type',
        'capacite',
        'batiment',
        'equipements',
        'is_active',
    ];

    protected $casts = [
        'equipements' => 'array',
        'is_active' => 'boolean',
    ];

    public function emploiDuTemps()
    {
        return $this->hasMany(EmploiDuTemps::class);
    }

    public function examens()
    {
        return $this->hasMany(Examen::class);
    }
}
