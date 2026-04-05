<?php

namespace Database\Seeders;

use App\Models\{User, Filiere, Group, Module, Salle, Formateur, Stagiaire, EmploiDuTemps, Examen, Note, Absence};
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ──────────────── Clear all data first (disable FKs) ────────────────
        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        DB::table('notes')->truncate();
        DB::table('absences')->truncate();
        DB::table('emploi_du_temps')->truncate();
        DB::table('stagiaires')->truncate();
        DB::table('formateur_module')->truncate();
        DB::table('formateurs')->truncate();
        DB::table('groups')->truncate();
        DB::table('salles')->truncate();
        DB::table('modules')->truncate();
        DB::table('filieres')->truncate();
        DB::table('users')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1');

        // ──────────────── Fixed accounts ────────────────

        $admin = User::create([
            'nom' => 'System', 'prenom' => 'Admin',
            'email' => 'admin@macompus.ma',
            'password' => Hash::make('password'),
            'role' => 'directeur',
            'telephone' => '0600000001',
            'is_active' => true,
            'email_verified_at' => now(),
        ]);

        $survUser = User::create([
            'nom' => 'General', 'prenom' => 'Surveillant',
            'email' => 'surveillant@macompus.ma',
            'password' => Hash::make('password'),
            'role' => 'surveillant',
            'telephone' => '0600000002',
            'is_active' => true,
            'email_verified_at' => now(),
        ]);

        // ──────────────── Filières (6) ────────────────

        $filieresData = [
            ['code' => 'DD',  'nom' => 'Développement Digital',       'duree_mois' => 24],
            ['code' => 'ID',  'nom' => 'Infrastructure Digitale',     'duree_mois' => 24],
            ['code' => 'GE',  'nom' => 'Gestion des Entreprises',     'duree_mois' => 24],
            ['code' => 'RI',  'nom' => 'Réseaux Informatiques',       'duree_mois' => 24],
            ['code' => 'IA',  'nom' => 'Intelligence Artificielle',   'duree_mois' => 24],
            ['code' => 'GC',  'nom' => 'Génie Civil',                 'duree_mois' => 30],
        ];

        $filieres = collect();
        foreach ($filieresData as $f) {
            $filieres->push(Filiere::create(array_merge($f, ['is_active' => true])));
        }

        // ──────────────── Modules (~5 per filière = 30) ────────────────

        $modulesMap = [
            'DD' => [
                ['code' => 'M101', 'nom' => 'Programmation Web',        'coefficient' => 3, 'heures_total' => 80,  'semestre' => 1],
                ['code' => 'M102', 'nom' => 'Base de données',          'coefficient' => 3, 'heures_total' => 60,  'semestre' => 1],
                ['code' => 'M103', 'nom' => 'Programmation Java',       'coefficient' => 4, 'heures_total' => 100, 'semestre' => 2],
                ['code' => 'M104', 'nom' => 'Frameworks Frontend',      'coefficient' => 3, 'heures_total' => 80,  'semestre' => 2],
                ['code' => 'M105', 'nom' => 'Développement Mobile',     'coefficient' => 3, 'heures_total' => 60,  'semestre' => 2],
            ],
            'ID' => [
                ['code' => 'M201', 'nom' => 'Réseaux informatiques',    'coefficient' => 3, 'heures_total' => 70,  'semestre' => 1],
                ['code' => 'M202', 'nom' => 'Administration système',   'coefficient' => 3, 'heures_total' => 60,  'semestre' => 1],
                ['code' => 'M203', 'nom' => 'Virtualisation',           'coefficient' => 2, 'heures_total' => 50,  'semestre' => 1],
                ['code' => 'M204', 'nom' => 'Sécurité informatique',    'coefficient' => 3, 'heures_total' => 60,  'semestre' => 2],
                ['code' => 'M205', 'nom' => 'Cloud & DevOps',           'coefficient' => 3, 'heures_total' => 80,  'semestre' => 2],
            ],
            'GE' => [
                ['code' => 'M301', 'nom' => 'Comptabilité générale',    'coefficient' => 3, 'heures_total' => 60,  'semestre' => 1],
                ['code' => 'M302', 'nom' => 'Marketing digital',        'coefficient' => 2, 'heures_total' => 40,  'semestre' => 1],
                ['code' => 'M303', 'nom' => 'Gestion financière',       'coefficient' => 3, 'heures_total' => 60,  'semestre' => 2],
                ['code' => 'M304', 'nom' => 'Ressources humaines',      'coefficient' => 2, 'heures_total' => 40,  'semestre' => 2],
                ['code' => 'M305', 'nom' => 'Droit commercial',         'coefficient' => 2, 'heures_total' => 40,  'semestre' => 1],
            ],
            'RI' => [
                ['code' => 'M401', 'nom' => 'Protocoles réseaux',       'coefficient' => 3, 'heures_total' => 70,  'semestre' => 1],
                ['code' => 'M402', 'nom' => 'Câblage structuré',        'coefficient' => 2, 'heures_total' => 50,  'semestre' => 1],
                ['code' => 'M403', 'nom' => 'Switching & Routing',      'coefficient' => 4, 'heures_total' => 80,  'semestre' => 2],
                ['code' => 'M404', 'nom' => 'Téléphonie IP',            'coefficient' => 2, 'heures_total' => 40,  'semestre' => 2],
                ['code' => 'M405', 'nom' => 'Supervision réseau',       'coefficient' => 3, 'heures_total' => 60,  'semestre' => 2],
            ],
            'IA' => [
                ['code' => 'M501', 'nom' => 'Machine Learning',         'coefficient' => 4, 'heures_total' => 100, 'semestre' => 1],
                ['code' => 'M502', 'nom' => 'Deep Learning',            'coefficient' => 4, 'heures_total' => 100, 'semestre' => 2],
                ['code' => 'M503', 'nom' => 'Python pour Data Science', 'coefficient' => 3, 'heures_total' => 80,  'semestre' => 1],
                ['code' => 'M504', 'nom' => 'Traitement du langage',    'coefficient' => 3, 'heures_total' => 60,  'semestre' => 2],
                ['code' => 'M505', 'nom' => 'Vision par ordinateur',    'coefficient' => 3, 'heures_total' => 60,  'semestre' => 2],
            ],
            'GC' => [
                ['code' => 'M601', 'nom' => 'Résistance des matériaux', 'coefficient' => 4, 'heures_total' => 80,  'semestre' => 1],
                ['code' => 'M602', 'nom' => 'Topographie',              'coefficient' => 3, 'heures_total' => 60,  'semestre' => 1],
                ['code' => 'M603', 'nom' => 'Béton armé',               'coefficient' => 4, 'heures_total' => 80,  'semestre' => 2],
                ['code' => 'M604', 'nom' => 'Dessin technique',         'coefficient' => 2, 'heures_total' => 40,  'semestre' => 1],
                ['code' => 'M605', 'nom' => 'Géotechnique',             'coefficient' => 3, 'heures_total' => 60,  'semestre' => 2],
            ],
        ];

        $allModules = collect();
        foreach ($filieres as $filiere) {
            $mods = $modulesMap[$filiere->code] ?? [];
            foreach ($mods as $m) {
                $allModules->push(Module::create(array_merge($m, [
                    'filiere_id' => $filiere->id,
                    'is_active' => true,
                ])));
            }
        }

        // ──────────────── Salles (15) ────────────────

        $sallesData = [
            ['nom' => 'Salle A1',  'type' => 'cours',   'capacite' => 30, 'batiment' => 'A'],
            ['nom' => 'Salle A2',  'type' => 'cours',   'capacite' => 30, 'batiment' => 'A'],
            ['nom' => 'Salle A3',  'type' => 'cours',   'capacite' => 35, 'batiment' => 'A'],
            ['nom' => 'Salle B1',  'type' => 'cours',   'capacite' => 30, 'batiment' => 'B'],
            ['nom' => 'Salle B2',  'type' => 'cours',   'capacite' => 30, 'batiment' => 'B'],
            ['nom' => 'TP-1',      'type' => 'tp',      'capacite' => 20, 'batiment' => 'C', 'equipements' => ['Ordinateurs', 'Projecteur']],
            ['nom' => 'TP-2',      'type' => 'tp',      'capacite' => 20, 'batiment' => 'C', 'equipements' => ['Ordinateurs', 'Projecteur']],
            ['nom' => 'TP-3',      'type' => 'tp',      'capacite' => 25, 'batiment' => 'C', 'equipements' => ['Ordinateurs', 'Projecteur', 'Wifi']],
            ['nom' => 'TP-4',      'type' => 'tp',      'capacite' => 20, 'batiment' => 'C', 'equipements' => ['Ordinateurs']],
            ['nom' => 'Amphi 1',   'type' => 'amphi',   'capacite' => 100,'batiment' => 'D'],
            ['nom' => 'Amphi 2',   'type' => 'amphi',   'capacite' => 120,'batiment' => 'D'],
            ['nom' => 'Salle C1',  'type' => 'cours',   'capacite' => 40, 'batiment' => 'C'],
            ['nom' => 'Salle C2',  'type' => 'cours',   'capacite' => 35, 'batiment' => 'C'],
            ['nom' => 'Réunion 1', 'type' => 'reunion', 'capacite' => 15, 'batiment' => 'A'],
            ['nom' => 'Réunion 2', 'type' => 'reunion', 'capacite' => 10, 'batiment' => 'B'],
        ];

        $salles = collect();
        foreach ($sallesData as $s) {
            $salles->push(Salle::create(array_merge(['is_active' => true, 'equipements' => null], $s)));
        }

        // ──────────────── Groups (4 per filière = 24) ────────────────

        $allGroups = collect();
        foreach ($filieres as $filiere) {
            foreach ([1, 2] as $annee) {
                foreach (['A', 'B'] as $section) {
                    $allGroups->push(Group::create([
                        'nom' => $filiere->code . '-' . ($annee * 100 + 1) . $section,
                        'filiere_id' => $filiere->id,
                        'annee' => $annee,
                        'annee_scolaire' => '2025-2026',
                        'max_stagiaires' => 30,
                        'is_active' => true,
                    ]));
                }
            }
        }

        // ──────────────── Formateurs (15) ────────────────
        // 3 fixed + 12 generated

        $fixedFormateurs = [
            ['nom' => 'Benali',  'prenom' => 'Mohammed', 'email' => 'benali@macompus.ma',  'spec' => 'Développement Web'],
            ['nom' => 'Tazi',    'prenom' => 'Fatima',   'email' => 'tazi@macompus.ma',    'spec' => 'Java / POO'],
            ['nom' => 'Idrissi', 'prenom' => 'Ahmed',    'email' => 'idrissi@macompus.ma', 'spec' => 'Réseaux'],
        ];

        $allFormateurs = collect();
        foreach ($fixedFormateurs as $i => $fd) {
            $user = User::create([
                'nom' => $fd['nom'], 'prenom' => $fd['prenom'],
                'email' => $fd['email'],
                'password' => Hash::make('password'),
                'role' => 'formateur',
                'telephone' => '06' . str_pad($i + 10, 8, '0', STR_PAD_LEFT),
                'is_active' => true,
                'email_verified_at' => now(),
            ]);
            $allFormateurs->push(Formateur::create([
                'user_id' => $user->id,
                'matricule' => 'F' . str_pad($i + 1, 4, '0', STR_PAD_LEFT),
                'specialisation' => $fd['spec'],
                'date_recrutement' => fake()->dateTimeBetween('-8 years', '-1 year'),
                'is_active' => true,
            ]));
        }

        // 12 more formateurs via factory
        $extraFormateurs = Formateur::factory()->count(12)->create();
        $allFormateurs = $allFormateurs->merge($extraFormateurs);

        // Assign modules to formateurs (each module gets 1 formateur, each formateur gets 1-3 modules)
        $modulePool = $allModules->shuffle()->values();
        $fIdx = 0;
        foreach ($modulePool as $module) {
            $formateur = $allFormateurs[$fIdx % $allFormateurs->count()];
            $formateur->modules()->syncWithoutDetaching([$module->id]);
            $fIdx++;
        }

        // ──────────────── Stagiaires (~150, ~6 per group) ────────────────

        // Fixed students
        $fixedStagiaires = [
            ['nom' => 'El Amrani', 'prenom' => 'Youssef', 'email' => 'youssef.elamrani@macompus.ma'],
            ['nom' => 'Bouzid', 'prenom' => 'Sara', 'email' => 'sara.bouzid@macompus.ma'],
            ['nom' => 'Cherkaoui', 'prenom' => 'Omar', 'email' => 'omar.cherkaoui@macompus.ma'],
            ['nom' => 'Fikri', 'prenom' => 'Amina', 'email' => 'amina.fikri@macompus.ma'],
            ['nom' => 'Hassani', 'prenom' => 'Karim', 'email' => 'karim.hassani@macompus.ma'],
        ];

        // Get first group for fixed students
        $firstGroup = $allGroups->first();
        foreach ($fixedStagiaires as $sd) {
            $user = User::create([
                'nom' => $sd['nom'],
                'prenom' => $sd['prenom'],
                'email' => $sd['email'],
                'password' => Hash::make('password'),
                'role' => 'stagiaire',
                'telephone' => fake()->phoneNumber(),
                'is_active' => true,
                'email_verified_at' => now(),
            ]);
            Stagiaire::create([
                'user_id' => $user->id,
                'group_id' => $firstGroup->id,
                'cef' => fake()->regexify('[A-Z]{3}\d{6}'),
                'cne' => fake()->regexify('[A-Z]\d{12}'),
                'cin' => fake()->regexify('[A-Z]{2}\d{6}'),
                'date_inscription' => now(),
                'date_naissance' => fake()->dateTimeBetween('-30 years', '-18 years'),
                'status' => 'actif',
            ]);
        }

        // Generate additional random stagiaires for all groups
        foreach ($allGroups as $group) {
            $count = fake()->numberBetween(5, 8);
            for ($i = 0; $i < $count; $i++) {
                Stagiaire::factory()->create([
                    'group_id' => $group->id,
                ]);
            }
        }

        // ──────────────── Emploi du temps ────────────────

        $jours = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'];
        $creneaux = [
            ['08:30', '10:30'],
            ['10:45', '12:45'],
            ['14:00', '16:00'],
            ['16:15', '18:15'],
        ];

        $courseSalles = $salles->filter(fn ($s) => in_array($s->type, ['cours', 'tp']));

        foreach ($allGroups as $group) {
            $filiereModules = $allModules->where('filiere_id', $group->filiere_id)->values();
            if ($filiereModules->isEmpty()) continue;

            $slotIndex = 0;
            foreach ($jours as $jour) {
                $slotsForDay = fake()->numberBetween(2, 3);
                $usedSlots = collect($creneaux)->shuffle()->take($slotsForDay);

                foreach ($usedSlots as $slot) {
                    $module = $filiereModules[$slotIndex % $filiereModules->count()];
                    $formateur = $module->formateurs->first();
                    if (!$formateur) continue;

                    $salle = $courseSalles->random();

                    EmploiDuTemps::create([
                        'group_id' => $group->id,
                        'module_id' => $module->id,
                        'formateur_id' => $formateur->id,
                        'salle_id' => $salle->id,
                        'jour' => $jour,
                        'heure_debut' => $slot[0],
                        'heure_fin' => $slot[1],
                    ]);

                    $slotIndex++;
                }
            }
        }

        // ──────────────── Examens (~2 per group) ────────────────

        $allExamens = collect();
        foreach ($allGroups as $group) {
            $filiereModules = $allModules->where('filiere_id', $group->filiere_id)->values();
            $examModules = $filiereModules->random(min(2, $filiereModules->count()));

            foreach ($examModules as $module) {
                $formateur = $module->formateurs->first();
                if (!$formateur) continue;

                $allExamens->push(Examen::create([
                    'module_id' => $module->id,
                    'group_id' => $group->id,
                    'salle_id' => $salles->random()->id,
                    'formateur_id' => $formateur->id,
                    'surveillant_id' => $survUser->id,
                    'type' => fake()->randomElement(['controle', 'efm', 'eff']),
                    'date_examen' => fake()->dateTimeBetween('2025-10-01', '2026-06-30'),
                    'heure_debut' => '09:00',
                    'heure_fin' => '11:00',
                ]));
            }
        }

        // ──────────────── Notes (for each exam, all stagiaires in that group) ────────────────

        foreach ($allExamens as $examen) {
            $stagiaireIds = Stagiaire::where('group_id', $examen->group_id)->pluck('id');
            foreach ($stagiaireIds as $sid) {
                Note::create([
                    'stagiaire_id' => $sid,
                    'examen_id' => $examen->id,
                    'note' => round(fake()->randomFloat(2, 4, 20), 2),
                ]);
            }
        }

        // ──────────────── Absences (~3 per stagiaire randomly) ────────────────

        $stagiaires = Stagiaire::with('group.filiere')->where('status', 'actif')->get();
        foreach ($stagiaires as $stag) {
            $filiereModules = $allModules->where('filiere_id', $stag->group->filiere_id)->values();
            if ($filiereModules->isEmpty()) continue;

            $nbAbsences = fake()->numberBetween(0, 5);
            for ($i = 0; $i < $nbAbsences; $i++) {
                Absence::create([
                    'stagiaire_id' => $stag->id,
                    'module_id' => $filiereModules->random()->id,
                    'date_absence' => fake()->dateTimeBetween('2025-09-15', '2026-03-10'),
                    'heure_debut' => fake()->randomElement(['08:30', '10:45', '14:00']),
                    'heure_fin' => fake()->randomElement(['10:30', '12:45', '16:00']),
                    'motif' => fake()->optional(0.3)->sentence(),
                    'justification' => fake()->optional(0.2)->sentence(),
                    'status' => fake()->randomElement(['non_justifiee', 'justifiee', 'en_attente']),
                ]);
            }
        }

        $this->command->info('Seeded: 1 admin, 1 surveillant, 15 formateurs, ' . Stagiaire::count() . ' stagiaires, 6 filières, ' . $allGroups->count() . ' groups, 30 modules, 15 salles, ' . EmploiDuTemps::count() . ' emploi slots, ' . $allExamens->count() . ' exams, ' . Note::count() . ' notes, ' . Absence::count() . ' absences.');
    }
}
