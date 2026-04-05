<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('filieres', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('nom');
            $table->text('description')->nullable();
            $table->integer('duree_mois')->default(24);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('groups', function (Blueprint $table) {
            $table->id();
            $table->string('nom');
            $table->foreignId('filiere_id')->constrained('filieres')->onDelete('cascade');
            $table->integer('annee')->default(1);
            $table->string('annee_scolaire');
            $table->integer('max_stagiaires')->default(30);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('modules', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('nom');
            $table->text('description')->nullable();
            $table->float('coefficient')->default(1);
            $table->integer('heures_total')->default(0);
            $table->foreignId('filiere_id')->constrained('filieres')->onDelete('cascade');
            $table->integer('semestre')->default(1);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('salles', function (Blueprint $table) {
            $table->id();
            $table->string('nom');
            $table->enum('type', ['cours', 'tp', 'amphi', 'reunion'])->default('cours');
            $table->integer('capacite')->default(30);
            $table->string('batiment')->nullable();
            $table->json('equipements')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('formateurs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('matricule')->unique();
            $table->string('specialisation');
            $table->date('date_recrutement');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('stagiaires', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('cef')->unique();
            $table->string('cne')->unique();
            $table->string('cin')->unique();
            $table->foreignId('group_id')->constrained('groups')->onDelete('cascade');
            $table->date('date_inscription');
            $table->date('date_naissance');
            $table->text('adresse')->nullable();
            $table->enum('status', ['actif', 'abandon', 'diplome', 'suspendu'])->default('actif');
            $table->timestamps();
        });

        Schema::create('formateur_module', function (Blueprint $table) {
            $table->id();
            $table->foreignId('formateur_id')->constrained('formateurs')->onDelete('cascade');
            $table->foreignId('module_id')->constrained('modules')->onDelete('cascade');
            $table->timestamps();
            $table->unique(['formateur_id', 'module_id']);
        });

        Schema::create('emploi_du_temps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('group_id')->constrained('groups')->onDelete('cascade');
            $table->foreignId('module_id')->constrained('modules')->onDelete('cascade');
            $table->foreignId('formateur_id')->constrained('formateurs')->onDelete('cascade');
            $table->foreignId('salle_id')->constrained('salles')->onDelete('cascade');
            $table->enum('jour', ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']);
            $table->time('heure_debut');
            $table->time('heure_fin');
            $table->timestamps();
        });

        Schema::create('examens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('module_id')->constrained('modules')->onDelete('cascade');
            $table->foreignId('group_id')->constrained('groups')->onDelete('cascade');
            $table->foreignId('salle_id')->nullable()->constrained('salles')->nullOnDelete();
            $table->foreignId('formateur_id')->constrained('formateurs')->onDelete('cascade');
            $table->unsignedBigInteger('surveillant_id')->nullable();
            $table->enum('type', ['controle', 'efm', 'eff', 'rattrapage'])->default('controle');
            $table->date('date_examen');
            $table->time('heure_debut');
            $table->time('heure_fin');
            $table->timestamps();
        });

        Schema::create('notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stagiaire_id')->constrained('stagiaires')->onDelete('cascade');
            $table->foreignId('examen_id')->constrained('examens')->onDelete('cascade');
            $table->float('note')->default(0);
            $table->text('remarque')->nullable();
            $table->timestamps();
            $table->unique(['stagiaire_id', 'examen_id']);
        });

        Schema::create('absences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stagiaire_id')->constrained('stagiaires')->onDelete('cascade');
            $table->foreignId('module_id')->constrained('modules')->onDelete('cascade');
            $table->date('date_absence');
            $table->time('heure_debut');
            $table->time('heure_fin');
            $table->text('motif')->nullable();
            $table->text('justification')->nullable();
            $table->enum('status', ['non_justifiee', 'justifiee', 'en_attente'])->default('non_justifiee');
            $table->timestamps();
        });

        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('action');
            $table->text('description');
            $table->json('properties')->nullable();
            $table->timestamps();
        });

        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->text('value')->nullable();
            $table->string('group')->default('general');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
        Schema::dropIfExists('activity_logs');
        Schema::dropIfExists('absences');
        Schema::dropIfExists('notes');
        Schema::dropIfExists('examens');
        Schema::dropIfExists('emploi_du_temps');
        Schema::dropIfExists('formateur_module');
        Schema::dropIfExists('stagiaires');
        Schema::dropIfExists('formateurs');
        Schema::dropIfExists('salles');
        Schema::dropIfExists('modules');
        Schema::dropIfExists('groups');
        Schema::dropIfExists('filieres');
    }
};
