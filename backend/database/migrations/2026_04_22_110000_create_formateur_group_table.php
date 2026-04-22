<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('formateur_group', function (Blueprint $table) {
            $table->id();
            $table->foreignId('formateur_id')->constrained('formateurs')->onDelete('cascade');
            $table->foreignId('group_id')->constrained('groups')->onDelete('cascade');
            $table->timestamps();
            $table->unique(['formateur_id', 'group_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('formateur_group');
    }
};
