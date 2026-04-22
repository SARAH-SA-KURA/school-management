<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NoteValidation extends Model
{
    protected $fillable = [
        'group_id',
        'module_id',
        'validated_by',
        'validated_at',
    ];

    protected $casts = [
        'validated_at' => 'datetime',
    ];

    public function group()
    {
        return $this->belongsTo(Group::class);
    }

    public function module()
    {
        return $this->belongsTo(Module::class);
    }

    public function validator()
    {
        return $this->belongsTo(User::class, 'validated_by');
    }
}
