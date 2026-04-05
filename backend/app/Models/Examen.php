<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Examen extends Model
{
    use HasFactory;

    protected $fillable = [
        'module_id',
        'group_id',
        'salle_id',
        'formateur_id',
        'surveillant_id',
        'type',
        'numero',
        'date_examen',
        'heure_debut',
        'heure_fin',
    ];

    protected $casts = [
        'date_examen' => 'date',
    ];

    public function module()
    {
        return $this->belongsTo(Module::class);
    }

    public function group()
    {
        return $this->belongsTo(Group::class);
    }

    public function salle()
    {
        return $this->belongsTo(Salle::class);
    }

    public function formateur()
    {
        return $this->belongsTo(Formateur::class);
    }

    public function notes()
    {
        return $this->hasMany(Note::class);
    }
}
