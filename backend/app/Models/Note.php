<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Note extends Model
{
    use HasFactory;

    protected $fillable = [
        'stagiaire_id',
        'examen_id',
        'note',
        'remarque',
    ];

    protected $casts = [
        'note' => 'float',
    ];

    public function stagiaire()
    {
        return $this->belongsTo(Stagiaire::class);
    }

    public function examen()
    {
        return $this->belongsTo(Examen::class);
    }
}
