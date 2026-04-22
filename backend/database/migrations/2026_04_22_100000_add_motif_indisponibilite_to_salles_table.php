<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('salles', function (Blueprint $table) {
            $table->text('motif_indisponibilite')->nullable()->after('equipements');
        });
    }

    public function down(): void
    {
        Schema::table('salles', function (Blueprint $table) {
            $table->dropColumn('motif_indisponibilite');
        });
    }
};
