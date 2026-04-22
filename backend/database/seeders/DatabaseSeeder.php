<?php

namespace Database\Seeders;

use App\Models\{User, Filiere, Group, Module, Salle, Formateur, Stagiaire, EmploiDuTemps, Examen, Note, Absence};
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    // ── Moroccan name pools ──

    private array $maleNames = [
        'Mohammed','Ahmed','Youssef','Omar','Amine','Hamza','Mehdi','Karim','Rachid','Samir',
        'Hassan','Khalid','Badr','Yassine','Ayoub','Adil','Nabil','Othmane','Mouad','Soufiane',
        'Zakaria','Ilyass','Imad','Tarik','Fouad','Hicham','Reda','Walid','Bilal','Driss',
        'Mustapha','Jawad','Anas','Ismail','Brahim','Abdellah','Aziz','Mounir','Said','Taha',
        'Oussama','Youness','Nouredine','Lahcen','Mouhcine','Jamal','Abdelkader','Abderahim',
        'Sami','Rayan',
    ];

    private array $femaleNames = [
        'Fatima','Khadija','Aicha','Meryem','Zineb','Salma','Hajar','Nadia','Laila','Amina',
        'Sara','Ghita','Houda','Rajae','Dounia','Safae','Ilham','Nisrine','Samira','Loubna',
        'Hanane','Wiam','Oumaima','Chaimae','Ikram','Asma','Rim','Nawal','Soukaina','Mariam',
    ];

    private array $lastNames = [
        'Bennani','El Amrani','Tazi','Idrissi','Alaoui','Berrada','Fassi','Chraibi','Lahlou',
        'Benkirane','Belhaj','Cherkaoui','Zahidi','Kettani','Bouzid','Hajji','Sefrioui',
        'Bensouda','El Ouafi','Kabbaj','Benjelloun','Sqalli','Filali','El Harti','Rami',
        'Ouazzani','Mansouri','Rhazi','Boutaleb','Mouline','Ghazi','Naji','Zniber','Diouri',
        'Naciri','Amrani','Haddad','Lahbabi','El Fassi','Sbai','Tahiri','Benkhadra',
        'Sekkat','Guennoun','Belghiti','Meziane','Alami','Bouazza','Zerhouni','El Khattabi',
        'Benmoussa','Kadiri','Salhi','Benchekroun','Regragui','El Idrissi','Dahbi','Lamrani',
        'Berrahma','Touhami',
    ];

    private array $cities = [
        'Casablanca','Rabat','Fès','Marrakech','Tanger','Agadir','Meknès','Oujda',
        'Kenitra','Tétouan','Safi','El Jadida','Nador','Béni Mellal','Taza','Settat',
        'Khémisset','Mohammedia','Khouribga','Berrechid',
    ];

    private array $streets = [
        'Rue Hassan II','Avenue Mohammed V','Boulevard Zerktouni','Rue Allal Ben Abdellah',
        'Avenue des FAR','Boulevard Anfa','Rue Ibn Sina','Avenue Moulay Ismail',
        'Rue Tarik Ibn Ziad','Boulevard Mohammed VI','Rue Al Adarissa','Avenue Al Massira',
        'Rue Abdelkrim El Khattabi','Boulevard Bir Anzarane','Rue Oued Fès',
    ];

    private array $cinPrefixes = ['BK','BH','BE','BJ','BB','BA','BM','CD','CB','D','EE','F','G','H','JB','JE','JH','JK','JT','KB','L','M','N','PA','PB','Q','R','SH','SJ','T','U','V','W','Z','ZT'];

    private int $usedEmailIdx = 0;
    private array $usedCefs = [];

    private function moroccanAddress(): string
    {
        $num = rand(1, 200);
        $street = $this->streets[array_rand($this->streets)];
        $city = $this->cities[array_rand($this->cities)];
        return "{$num}, {$street}, {$city}";
    }

    private function moroccanCin(): string
    {
        $prefix = $this->cinPrefixes[array_rand($this->cinPrefixes)];
        return $prefix . str_pad(rand(100000, 999999), 6, '0', STR_PAD_LEFT);
    }

    private function moroccanPhone(): string
    {
        $prefix = fake()->randomElement(['06', '07']);
        return $prefix . str_pad(rand(10000000, 99999999), 8, '0', STR_PAD_LEFT);
    }

    private function uniqueCef(): string
    {
        do {
            $cef = 'CEF' . str_pad(rand(100000, 999999), 6, '0', STR_PAD_LEFT);
        } while (in_array($cef, $this->usedCefs));
        $this->usedCefs[] = $cef;
        return $cef;
    }

    private function uniqueEmail(string $prenom, string $nom): string
    {
        $this->usedEmailIdx++;
        $p = strtolower(str_replace([' ', "'"], '', $prenom));
        $n = strtolower(str_replace([' ', "'"], '', $nom));
        return "{$p}.{$n}{$this->usedEmailIdx}@macompus.ma";
    }

    private function pickMaleName(): array
    {
        return [
            'prenom' => $this->maleNames[array_rand($this->maleNames)],
            'nom' => $this->lastNames[array_rand($this->lastNames)],
        ];
    }

    private function pickFemaleName(): array
    {
        return [
            'prenom' => $this->femaleNames[array_rand($this->femaleNames)],
            'nom' => $this->lastNames[array_rand($this->lastNames)],
        ];
    }

    private function pickName(bool $female = false): array
    {
        return $female ? $this->pickFemaleName() : $this->pickMaleName();
    }

    public function run(): void
    {
        // Deterministic randomness — same seed = same names every run.
        // Changing this number would regenerate a fresh cohort on purpose.
        mt_srand(42);
        srand(42);
        fake()->seed(42);

        // ──────────────── Clear all data first (disable FKs) ────────────────
        $driver = DB::connection()->getDriverName();
        if ($driver === 'mysql') {
            DB::statement('SET FOREIGN_KEY_CHECKS=0');
        } elseif ($driver === 'sqlite') {
            DB::statement('PRAGMA foreign_keys = OFF');
        }
        foreach (['notes','absences','emploi_du_temps','stagiaires','formateur_module','formateurs','groups','salles','modules','filieres','users'] as $t) {
            if ($driver === 'sqlite') {
                DB::table($t)->delete();
            } else {
                DB::table($t)->truncate();
            }
        }
        if ($driver === 'mysql') {
            DB::statement('SET FOREIGN_KEY_CHECKS=1');
        } elseif ($driver === 'sqlite') {
            DB::statement('PRAGMA foreign_keys = ON');
        }

        // ──────────────── Fixed accounts ────────────────

        $admin = User::create([
            'nom' => 'Benkirane', 'prenom' => 'Mohammed',
            'email' => 'admin@macompus.ma',
            'password' => Hash::make('password'),
            'role' => 'directeur',
            'telephone' => '0661000001',
            'email_verified_at' => now(), 'is_active' => true,
        ]);

        $survUser = User::create([
            'nom' => 'Alami', 'prenom' => 'Hassan',
            'email' => 'surveillant@macompus.ma',
            'password' => Hash::make('password'),
            'role' => 'surveillant',
            'telephone' => '0662000002',
            'email_verified_at' => now(), 'is_active' => true,
        ]);

        // ──────────────── Filières (6) ────────────────

        $filieresData = [
            ['code' => 'DD',  'nom' => 'Développement Digital',       'duree_mois' => 24, 'niveau' => 'Technicien Spécialisé', 'secteur' => 'Digital & IA'],
            ['code' => 'ID',  'nom' => 'Infrastructure Digitale',     'duree_mois' => 24, 'niveau' => 'Technicien Spécialisé', 'secteur' => 'Digital & IA'],
            ['code' => 'GE',  'nom' => 'Gestion des Entreprises',     'duree_mois' => 24, 'niveau' => 'Technicien',            'secteur' => 'Gestion & Commerce'],
            ['code' => 'RI',  'nom' => 'Réseaux Informatiques',       'duree_mois' => 24, 'niveau' => 'Technicien Spécialisé', 'secteur' => 'Digital & IA'],
            ['code' => 'IA',  'nom' => 'Intelligence Artificielle',   'duree_mois' => 24, 'niveau' => 'Technicien Spécialisé', 'secteur' => 'Digital & IA'],
            ['code' => 'GC',  'nom' => 'Génie Civil',                 'duree_mois' => 30, 'niveau' => 'Technicien Spécialisé', 'secteur' => 'BTP'],
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

        // Mark 2 salles indisponible for demo — Directeur can toggle these back.
        // These rooms will be excluded from Surveillant pickers (emploi, examens).
        $salles->firstWhere('nom', 'TP-4')?->update([
            'is_active' => false,
            'motif_indisponibilite' => 'Projecteur en panne — en attente de remplacement',
        ]);
        $salles->firstWhere('nom', 'Salle B2')?->update([
            'is_active' => false,
            'motif_indisponibilite' => 'Rénovation en cours (peinture + climatisation)',
        ]);

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

        // ──────────────── Formateurs (15) with Moroccan names ────────────────

        $formateursData = [
            ['nom' => 'Benali',      'prenom' => 'Mohammed',  'email' => 'benali@macompus.ma',      'spec' => 'Développement Web'],
            ['nom' => 'Tazi',        'prenom' => 'Fatima',    'email' => 'tazi@macompus.ma',         'spec' => 'Java / POO'],
            ['nom' => 'Idrissi',     'prenom' => 'Ahmed',     'email' => 'idrissi@macompus.ma',      'spec' => 'Réseaux'],
            ['nom' => 'El Amrani',   'prenom' => 'Karim',     'email' => 'elamrani@macompus.ma',     'spec' => 'Base de données'],
            ['nom' => 'Chraibi',     'prenom' => 'Nadia',     'email' => 'chraibi@macompus.ma',      'spec' => 'Frameworks Frontend'],
            ['nom' => 'Mansouri',    'prenom' => 'Rachid',    'email' => 'mansouri@macompus.ma',     'spec' => 'Administration système'],
            ['nom' => 'Bennani',     'prenom' => 'Salma',     'email' => 'bennani@macompus.ma',      'spec' => 'Sécurité informatique'],
            ['nom' => 'Alaoui',      'prenom' => 'Omar',      'email' => 'alaoui@macompus.ma',       'spec' => 'Cloud Computing'],
            ['nom' => 'Filali',      'prenom' => 'Hicham',    'email' => 'filali@macompus.ma',       'spec' => 'Comptabilité'],
            ['nom' => 'Kettani',     'prenom' => 'Zineb',     'email' => 'kettani@macompus.ma',      'spec' => 'Marketing digital'],
            ['nom' => 'Hajji',       'prenom' => 'Driss',     'email' => 'hajji@macompus.ma',        'spec' => 'Switching & Routing'],
            ['nom' => 'Berrada',     'prenom' => 'Laila',     'email' => 'berrada@macompus.ma',      'spec' => 'Machine Learning'],
            ['nom' => 'Cherkaoui',   'prenom' => 'Mehdi',     'email' => 'cherkaoui@macompus.ma',    'spec' => 'Data Science'],
            ['nom' => 'Boutaleb',    'prenom' => 'Amine',     'email' => 'boutaleb@macompus.ma',     'spec' => 'Génie Civil'],
            ['nom' => 'Sefrioui',    'prenom' => 'Samir',     'email' => 'sefrioui@macompus.ma',     'spec' => 'Topographie'],
        ];

        $allFormateurs = collect();
        foreach ($formateursData as $i => $fd) {
            $user = User::create([
                'nom' => $fd['nom'], 'prenom' => $fd['prenom'],
                'email' => $fd['email'],
                'password' => Hash::make('password'),
                'role' => 'formateur',
                'telephone' => $this->moroccanPhone(),
                'email_verified_at' => now(), 'is_active' => true,
            ]);
            $allFormateurs->push(Formateur::create([
                'user_id' => $user->id,
                'matricule' => 'F' . str_pad($i + 1, 4, '0', STR_PAD_LEFT),
                'specialisation' => $fd['spec'],
                'date_recrutement' => fake()->dateTimeBetween('-8 years', '-1 year'),
                'is_active' => true,
            ]));
        }

        // Assign modules to formateurs (round-robin)
        $modulePool = $allModules->shuffle()->values();
        $fIdx = 0;
        foreach ($modulePool as $module) {
            $formateur = $allFormateurs[$fIdx % $allFormateurs->count()];
            $formateur->modules()->syncWithoutDetaching([$module->id]);
            $fIdx++;
        }

        // Assign groups to each formateur — all groups whose filière the
        // formateur teaches at least one module in. Keeps the formateur_group
        // pivot consistent with the formateur_module pivot so logging in as a
        // seeded formateur surfaces his actual students end-to-end.
        foreach ($allFormateurs as $formateur) {
            $taughtFiliereIds = $formateur->modules()->pluck('modules.filiere_id')->unique()->values();
            if ($taughtFiliereIds->isEmpty()) continue;

            $groupIds = Group::whereIn('filiere_id', $taughtFiliereIds)
                ->pluck('id')
                ->all();
            $formateur->groups()->syncWithoutDetaching($groupIds);
        }

        // ──────────────── Stagiaires (20-30 per group, Moroccan names) ────────────────

        foreach ($allGroups as $group) {
            $count = fake()->numberBetween(20, 30);
            for ($i = 0; $i < $count; $i++) {
                $isFemale = fake()->boolean(40); // 40% female
                $name = $this->pickName($isFemale);
                $prenom = $name['prenom'];
                $nom = $name['nom'];

                $user = User::create([
                    'nom' => $nom,
                    'prenom' => $prenom,
                    'email' => $this->uniqueEmail($prenom, $nom),
                    'password' => Hash::make('password'),
                    'role' => 'stagiaire',
                    'telephone' => $this->moroccanPhone(),
                    'email_verified_at' => now(),
                    'is_active' => true,
                ]);

                $statusPool = ['actif','actif','actif','actif','actif','actif','actif','abandon','suspendu'];

                Stagiaire::create([
                    'user_id' => $user->id,
                    'cef' => $this->uniqueCef(),
                    'cne' => 'CNE' . str_pad(rand(10000000, 99999999), 8, '0', STR_PAD_LEFT),
                    'cin' => $this->moroccanCin(),
                    'group_id' => $group->id,
                    'date_inscription' => fake()->dateTimeBetween('2025-09-01', '2025-10-15'),
                    'date_naissance' => fake()->dateTimeBetween('2000-01-01', '2006-12-31'),
                    'adresse' => $this->moroccanAddress(),
                    'status' => fake()->randomElement($statusPool),
                ]);
            }
        }

        // ──────────────── Emploi du temps ────────────────
        // Conflict-free scheduler: for each (jour, slot), tracks which
        // formateurs, salles, and groups are already booked so nobody is
        // physically double-booked.

        $jours = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
        // Uniform OFPPT slots: 4 x 2h30 blocks. Every session occupies exactly
        // one slot — no sub-durations, no lunch break row in the grid.
        $creneaux = [
            ['08:30', '11:00'],
            ['11:00', '13:30'],
            ['13:30', '16:00'],
            ['16:00', '18:30'],
        ];
        $schedulableIndexes = [0, 1, 2, 3];

        // Only disponible salles go into the emploi — indisponibles are off the grid.
        $courseSalles = $salles->filter(fn ($s) => in_array($s->type, ['cours', 'tp']) && $s->is_active)->values();

        // slotBookings[jour][slotIdx] = ['formateurs' => [...], 'salles' => [...], 'groups' => [...]]
        $slotBookings = [];
        foreach ($jours as $j) {
            foreach ($schedulableIndexes as $idx) {
                $slotBookings[$j][$idx] = ['formateurs' => [], 'salles' => [], 'groups' => []];
            }
        }

        // Track per-formateur weekly minutes — cap at 30h (1800 min) per OFPPT rules.
        $formateurWeeklyMinutes = [];
        $FORMATEUR_WEEKLY_CAP = 1800; // 30h
        $SLOT_MINUTES = 150;          // 2h30

        foreach ($allGroups as $group) {
            $filiereModules = $allModules->where('filiere_id', $group->filiere_id)->values();
            if ($filiereModules->isEmpty()) continue;

            $moduleIdx = 0;
            foreach ($jours as $jour) {
                // Saturday: morning slots only (08:30-11:00 + 11:00-13:30)
                $daySchedulable = $jour === 'samedi' ? [0, 1] : $schedulableIndexes;
                $slotsForDay = $jour === 'samedi'
                    ? fake()->numberBetween(1, 2)
                    : fake()->numberBetween(2, 3);

                $slotIndexes = collect($daySchedulable)->shuffle()->take($slotsForDay);

                foreach ($slotIndexes as $slotIdx) {
                    $slot = $creneaux[$slotIdx];

                    // Skip if this group is already booked at this slot
                    if (in_array($group->id, $slotBookings[$jour][$slotIdx]['groups'], true)) continue;

                    // Try to find a module whose formateur is available at this slot
                    // AND has weekly room under the 30h cap.
                    $chosenModule = null;
                    $chosenFormateur = null;
                    for ($attempt = 0; $attempt < $filiereModules->count(); $attempt++) {
                        $candidate = $filiereModules[($moduleIdx + $attempt) % $filiereModules->count()];
                        $formateur = $candidate->formateurs->first();
                        if (!$formateur) continue;
                        if (in_array($formateur->id, $slotBookings[$jour][$slotIdx]['formateurs'], true)) continue;
                        $alreadyMinutes = $formateurWeeklyMinutes[$formateur->id] ?? 0;
                        if ($alreadyMinutes + $SLOT_MINUTES > $FORMATEUR_WEEKLY_CAP) continue;
                        $chosenModule = $candidate;
                        $chosenFormateur = $formateur;
                        $moduleIdx = ($moduleIdx + $attempt + 1) % $filiereModules->count();
                        break;
                    }
                    if (!$chosenModule) continue;

                    // Pick a free salle at this slot
                    $freeSalles = $courseSalles->filter(
                        fn ($s) => !in_array($s->id, $slotBookings[$jour][$slotIdx]['salles'], true)
                    )->values();
                    if ($freeSalles->isEmpty()) continue;
                    $salle = $freeSalles->random();

                    EmploiDuTemps::create([
                        'group_id' => $group->id,
                        'module_id' => $chosenModule->id,
                        'formateur_id' => $chosenFormateur->id,
                        'salle_id' => $salle->id,
                        'jour' => $jour,
                        'heure_debut' => $slot[0],
                        'heure_fin' => $slot[1],
                    ]);

                    $slotBookings[$jour][$slotIdx]['formateurs'][] = $chosenFormateur->id;
                    $slotBookings[$jour][$slotIdx]['salles'][] = $salle->id;
                    $slotBookings[$jour][$slotIdx]['groups'][] = $group->id;
                    $formateurWeeklyMinutes[$chosenFormateur->id] = ($formateurWeeklyMinutes[$chosenFormateur->id] ?? 0) + $SLOT_MINUTES;
                }
            }
        }

        // ──────────────── Examens (CC1, CC2, CC3 + EFM per group-module) ────────────────

        $allExamens = collect();
        $ccDates   = ['2025-10-15', '2025-12-10', '2026-02-05'];
        $efmDate   = '2026-03-20';
        $ccTimes   = [['09:00','10:30'], ['09:00','10:30'], ['14:00','15:30']];

        foreach ($allGroups as $group) {
            $filiereModules = $allModules->where('filiere_id', $group->filiere_id)->values();
            // Exams are scheduled for EVERY module in the filière (not a random subset).
            // This matches reality — each module gets its own CCs + EFM — and ensures the
            // Notes tab has meaningful coverage for any group/module the user picks.
            foreach ($filiereModules as $module) {
                $formateur = $module->formateurs->first();
                if (!$formateur) continue;

                // 3 controle exams (CC1, CC2, CC3) with explicit numero
                foreach ($ccDates as $i => $date) {
                    $allExamens->push(Examen::create([
                        'module_id'      => $module->id,
                        'group_id'       => $group->id,
                        'salle_id'       => $salles->where('is_active', true)->random()->id,
                        'formateur_id'   => $formateur->id,
                        'surveillant_id' => $survUser->id,
                        'type'           => 'controle',
                        'numero'         => $i + 1,
                        'date_examen'    => $date,
                        'heure_debut'    => $ccTimes[$i][0],
                        'heure_fin'      => $ccTimes[$i][1],
                    ]));
                }

                // 1 EFM exam
                $allExamens->push(Examen::create([
                    'module_id'      => $module->id,
                    'group_id'       => $group->id,
                    'salle_id'       => $salles->where('is_active', true)->random()->id,
                    'formateur_id'   => $formateur->id,
                    'surveillant_id' => $survUser->id,
                    'type'           => 'efm',
                    'date_examen'    => $efmDate,
                    'heure_debut'    => '09:00',
                    'heure_fin'      => '11:00',
                ]));
            }
        }

        // ──────────────── Notes (correlated per student) ────────────────
        // To exercise every state the Directeur's Notes dashboard shows
        // (complètes / en cours / non entrées), we vary completeness per
        // (group, module) pair:
        //   - ~55% of modules → fully graded  → "Complètes"
        //   - ~30% of modules → 40-80% graded → "En cours"
        //   - ~15% of modules → 0 graded       → "Non entrées"
        //
        // Within a partial module, every exam of that module gets the SAME
        // missing-student subset, so one student who's missing CC1 is also
        // missing CC2/CC3/EFM (realistic: a student who dropped out halfway).

        $examsByGroup = $allExamens->groupBy('group_id');

        foreach ($examsByGroup as $groupId => $groupExamens) {
            $stagiaireIds = Stagiaire::where('group_id', $groupId)->pluck('id')->all();

            // Bucket exams by module so we can decide completeness per module.
            $examsByModule = $groupExamens->groupBy('module_id');

            foreach ($examsByModule as $moduleId => $moduleExamens) {
                $roll = mt_rand(1, 100);
                if ($roll <= 15) {
                    // Non entrées: skip this module entirely for this group.
                    continue;
                }

                // Pick the "missing" subset for this module (empty set = full entry).
                $missing = [];
                if ($roll <= 45) {
                    // "En cours": 20-60% of students won't have notes.
                    $missCount = (int) round(count($stagiaireIds) * (mt_rand(20, 60) / 100));
                    $shuffled = $stagiaireIds;
                    shuffle($shuffled);
                    $missing = array_slice($shuffled, 0, $missCount);
                }
                $missingSet = array_flip($missing);

                foreach ($stagiaireIds as $sid) {
                    if (isset($missingSet[$sid])) continue;
                    // Base academic level for this student (6-17), gives realistic spread
                    $baseLevel = round(mt_rand(60, 170) / 10, 1);

                    foreach ($moduleExamens as $examen) {
                        $variation = (mt_rand(-30, 30)) / 10;
                        $note = round(min(20, max(2, $baseLevel + $variation)), 2);

                        Note::create([
                            'stagiaire_id' => $sid,
                            'examen_id'    => $examen->id,
                            'note'         => $note,
                        ]);
                    }
                }
            }
        }

        // ──────────────── Absences (past + some for today) ────────────────
        // Status logic:
        //   non_justifiee → motif = null, justification = null (no reason given)
        //   en_attente    → motif = verbal reason text, justification = null (waiting for document)
        //   justifiee     → motif = null, justification = document path (document provided)

        $stagiaires = Stagiaire::with('group.filiere')->where('status', 'actif')->get();
        $today = now()->toDateString();
        $verbalReasons = [
            'Maladie - grippe saisonnière',
            'Rendez-vous médical urgent',
            'Raison familiale - décès proche',
            'Problème de transport - grève bus',
            'Raison personnelle - démarche administrative',
            'Maladie - gastro-entérite',
            'Rendez-vous à la préfecture',
            'Problème de santé - migraine sévère',
            'Raison familiale - hospitalisation parent',
            'Convocation officielle',
        ];

        foreach ($stagiaires as $stag) {
            $filiereModules = $allModules->where('filiere_id', $stag->group->filiere_id)->values();
            if ($filiereModules->isEmpty()) continue;

            // Past absences (0-5 per student)
            $nbAbsences = fake()->numberBetween(0, 5);
            for ($i = 0; $i < $nbAbsences; $i++) {
                $status = fake()->randomElement(['non_justifiee', 'justifiee', 'en_attente']);

                $motif = null;
                $justification = null;

                if ($status === 'en_attente') {
                    $motif = fake()->randomElement($verbalReasons);
                } elseif ($status === 'justifiee') {
                    $justification = '/justificatifs/sample.jpg';
                }
                // non_justifiee → both null

                // Pick a valid (start, end) pair so duration is always positive
                // and matches real OFPPT session slots.
                $absenceSlots = [
                    ['08:30', '10:30'], // 2h
                    ['10:30', '12:30'], // 2h
                    ['14:00', '16:00'], // 2h
                    ['16:00', '18:30'], // 2h30
                ];
                $slot = fake()->randomElement($absenceSlots);

                Absence::create([
                    'stagiaire_id' => $stag->id,
                    'module_id' => $filiereModules->random()->id,
                    'date_absence' => fake()->dateTimeBetween('2025-09-15', '2026-03-26'),
                    'heure_debut' => $slot[0],
                    'heure_fin'   => $slot[1],
                    'motif' => $motif,
                    'justification' => $justification,
                    'status' => $status,
                ]);
            }
        }

        // Add 5 absences for today (for dashboard display)
        $todayStagiaires = $stagiaires->random(min(5, $stagiaires->count()));
        foreach ($todayStagiaires as $stag) {
            $filiereModules = $allModules->where('filiere_id', $stag->group->filiere_id)->values();
            if ($filiereModules->isEmpty()) continue;

            Absence::create([
                'stagiaire_id' => $stag->id,
                'module_id' => $filiereModules->random()->id,
                'date_absence' => $today,
                'heure_debut' => '08:30',
                'heure_fin' => '10:30',
                'motif' => null,
                'justification' => null,
                'status' => 'non_justifiee',
            ]);
        }

        $this->command->info('Seeded: 1 admin, 1 surveillant, 15 formateurs, ' . Stagiaire::count() . ' stagiaires, 6 filières, ' . $allGroups->count() . ' groups, 30 modules, 15 salles, ' . EmploiDuTemps::count() . ' emploi slots, ' . Examen::count() . ' exams, ' . Note::count() . ' notes, ' . Absence::count() . ' absences.');
    }
}
