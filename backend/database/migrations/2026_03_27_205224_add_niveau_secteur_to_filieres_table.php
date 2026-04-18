<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('filieres', function (Blueprint $table) {
            $table->string('niveau')->default('Technicien Spécialisé')->after('duree_mois');
            $table->string('secteur')->default('Digital & IA')->after('niveau');
        });
    }

    public function down(): void
    {
        Schema::table('filieres', function (Blueprint $table) {
            $table->dropColumn(['niveau', 'secteur']);
        });
    }
};
