<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmploiDuTemps extends Model
{
    use HasFactory;

    protected $table = 'emploi_du_temps';

    protected $fillable = [
        'group_id',
        'module_id',
        'formateur_id',
        'salle_id',
        'jour',
        'heure_debut',
        'heure_fin',
    ];

    public function group()
    {
        return $this->belongsTo(Group::class);
    }

    public function module()
    {
        return $this->belongsTo(Module::class);
    }

    public function formateur()
    {
        return $this->belongsTo(Formateur::class);
    }

    public function salle()
    {
        return $this->belongsTo(Salle::class);
    }
}
