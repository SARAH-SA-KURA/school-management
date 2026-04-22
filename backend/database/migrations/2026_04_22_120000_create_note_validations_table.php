<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('note_validations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('group_id')->constrained('groups')->onDelete('cascade');
            $table->foreignId('module_id')->constrained('modules')->onDelete('cascade');
            $table->foreignId('validated_by')->constrained('users')->onDelete('cascade');
            $table->timestamp('validated_at');
            $table->timestamps();
            $table->unique(['group_id', 'module_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('note_validations');
    }
};
