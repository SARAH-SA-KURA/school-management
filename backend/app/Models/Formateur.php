<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Formateur extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'matricule',
        'specialisation',
        'date_recrutement',
        'is_active',
    ];

    protected $casts = [
        'date_recrutement' => 'date',
        'is_active' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function modules()
    {
        return $this->belongsToMany(Module::class, 'formateur_module');
    }

    public function groups()
    {
        return $this->belongsToMany(Group::class, 'formateur_group');
    }

    public function emploiDuTemps()
    {
        return $this->hasMany(EmploiDuTemps::class);
    }

    public function examens()
    {
        return $this->hasMany(Examen::class);
    }
}
