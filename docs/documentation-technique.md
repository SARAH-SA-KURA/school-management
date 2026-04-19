# Documentation Technique — Système de Gestion Scolaire

## 1. Présentation du projet

Ce système de gestion scolaire est une application web dédiée à la gestion d'un établissement de formation (type OFPPT). Il permet la gestion des stagiaires, formateurs, groupes, filières, modules, examens, notes, absences et emplois du temps, avec un contrôle d'accès basé sur les rôles.

---

## 2. Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 19, TypeScript, Tailwind CSS 3 |
| State management | Redux Toolkit |
| Routing | React Router DOM v7 |
| Graphiques | Recharts |
| Export | jsPDF, jspdf-autotable, xlsx |
| Backend | Laravel 12 (PHP 8.2) |
| Authentification | Laravel Sanctum (tokens Bearer) |
| Base de données | MySQL |
| Serveur dev frontend | Create React App (port 3000) |
| Serveur dev backend | PHP Artisan Serve (port 8000) |

---

## 3. Architecture générale

```
┌─────────────────────────────────┐        ┌──────────────────────────────────┐
│         Frontend (React)        │  HTTP  │        Backend (Laravel)         │
│                                 │◄──────►│                                  │
│  src/                           │  JSON  │  app/Http/Controllers/Api/       │
│  ├── api/          (Axios)      │        │  routes/api.php                  │
│  ├── app/          (Redux)      │        │  database/migrations/            │
│  ├── features/     (par rôle)   │        │  app/Models/                     │
│  ├── components/   (UI partagé) │        │                                  │
│  ├── guards/       (Auth/Role)  │        │  Auth: Laravel Sanctum           │
│  ├── hooks/                     │        │  Token Bearer via localStorage   │
│  ├── routes/       (React Router│        │                                  │
│  └── types/        (TypeScript) │        │                                  │
└─────────────────────────────────┘        └──────────────────────────────────┘
                                                          │
                                                          ▼
                                              ┌────────────────────┐
                                              │      MySQL DB       │
                                              └────────────────────┘
```

### Communication Frontend ↔ Backend

- Toutes les requêtes passent par `src/api/axiosInstance.ts`
- Le token Bearer est lu depuis `localStorage` et attaché à chaque requête
- En cas de réponse 401, le token est supprimé et l'utilisateur est redirigé vers `/login`
- URL de base configurable via la variable d'environnement `REACT_APP_API_URL` (défaut : `http://localhost:8000/api`)

---

## 4. Installation et configuration

### Prérequis

- Node.js ≥ 18
- PHP ≥ 8.2
- Composer
- MySQL

### Frontend

```bash
# À la racine du projet
npm install
cp .env.example .env        # créer le fichier d'environnement si besoin
# Définir REACT_APP_API_URL=http://localhost:8000/api dans .env
npm start                   # démarre sur http://localhost:3000
npm run build               # build de production
```

### Backend

```bash
cd backend
composer install
cp .env.example .env
# Remplir DB_DATABASE, DB_USERNAME, DB_PASSWORD dans .env
php artisan key:generate
php artisan migrate
php artisan db:seed         # données de démonstration
php artisan serve           # démarre sur http://localhost:8000
```

---

## 5. Système d'authentification

La connexion se fait en **3 étapes successives** gérées par `src/features/auth/authSlice.ts` :

```
Étape 1 : Saisie des identifiants
         POST /api/auth/login
              │
              ▼
Étape 2 : Vérification email (OTP)
         POST /api/auth/verify-email
              │
              ▼
Étape 3 : Authentification à deux facteurs (2FA)
         POST /api/auth/verify-2fa
              │
              ▼
         Token Bearer stocké dans localStorage
         Redirection vers le tableau de bord du rôle
```

Le state machine utilise le champ `loginStep` (`credentials` → `email_verification` → `two_factor` → `complete`). Le composant `AuthFlow.tsx` affiche l'écran correspondant à l'étape courante.

### Endpoints d'authentification (publics)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/auth/login` | Étape 1 — identifiants |
| POST | `/api/auth/verify-email` | Étape 2 — code OTP email |
| POST | `/api/auth/verify-2fa` | Étape 3 — code 2FA |
| POST | `/api/auth/forgot-password` | Demande de réinitialisation |
| POST | `/api/auth/reset-password` | Réinitialisation du mot de passe |

---

## 6. Système de rôles et contrôle d'accès

Quatre rôles sont définis : `directeur`, `formateur`, `stagiaire`, `surveillant`.

### Mécanisme de protection des routes (Frontend)

```
Route protégée
    └── AuthGuard          → vérifie isAuthenticated (Redux state)
            └── RoleGuard  → vérifie user.role ∈ roles[]
                    └── Page
```

- `AuthGuard` redirige vers `/login` si non authentifié
- `RoleGuard` redirige vers `/unauthorized` si le rôle ne correspond pas

### Périmètres d'accès par rôle

| Fonctionnalité | Directeur | Formateur | Stagiaire | Surveillant |
|----------------|:---------:|:---------:|:---------:|:-----------:|
| Tableau de bord | ✓ | ✓ | ✓ | ✓ |
| Gestion stagiaires | ✓ (CRUD) | — | — | ✓ (lecture) |
| Gestion formateurs | ✓ (CRUD) | — | — | ✓ (lecture) |
| Filières / Groupes | ✓ (CRUD) | — | — | ✓ (lecture) |
| Modules | ✓ (CRUD) | ✓ (lecture) | ✓ (lecture) | ✓ (lecture) |
| Emploi du temps | ✓ (CRUD) | ✓ (lecture) | ✓ (lecture) | ✓ (lecture) |
| Examens & Notes | ✓ (CRUD) | ✓ (saisie notes) | ✓ (lecture) | ✓ (lecture) |
| Absences | ✓ (CRUD) | ✓ (saisie) | ✓ (lecture) | ✓ (lecture) |
| Utilisateurs | ✓ | — | — | — |
| Paramètres | ✓ | ✓ | ✓ | ✓ |

---

## 7. Structure du Frontend

```
src/
├── api/
│   ├── axiosInstance.ts     Instance Axios centrale (token + intercepteurs 401)
│   ├── authApi.ts           Appels d'authentification
│   ├── crudApi.ts           Factory createCrudApi<T> + instances par ressource
│   └── dashboardApi.ts      Stats du tableau de bord
│
├── app/
│   ├── store.ts             Configuration Redux (reducer: auth uniquement)
│   └── hooks.ts             useAppDispatch / useAppSelector typés
│
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx    Layout principal (sidebar + header + outlet)
│   │   ├── AuthLayout.tsx   Layout des pages de connexion
│   │   ├── Sidebar.tsx      Navigation latérale par rôle
│   │   └── Header.tsx       Barre supérieure
│   └── ui/                  Composants réutilisables
│       ├── DataTable.tsx    Tableau paginé avec sélection
│       ├── Modal.tsx        Fenêtre modale générique
│       ├── ConfirmDialog.tsx Dialogue de confirmation
│       ├── StatCard.tsx     Carte de statistique
│       └── ...              Button, Input, Select, Badge, Pagination…
│
├── contexts/
│   └── ThemeContext.tsx     Dark mode (classe `dark` sur <html>)
│
├── features/
│   ├── auth/
│   │   ├── authSlice.ts     État global d'authentification (Redux)
│   │   └── pages/           AuthFlow, ForgotPassword, ResetPassword
│   ├── admin/pages/         Pages directeur (Dashboard, Stagiaires, …)
│   ├── formateur/pages/     Pages formateur
│   ├── stagiaire/pages/     Pages stagiaire
│   └── surveillant/pages/   Re-exports des pages admin (lecture seule)
│
├── guards/
│   ├── AuthGuard.tsx        Vérifie l'authentification
│   ├── GuestGuard.tsx       Redirige si déjà connecté
│   └── RoleGuard.tsx        Vérifie le rôle
│
├── hooks/
│   ├── useAuth.ts           Accès à l'état auth (user, token, hasRole…)
│   ├── useDebounce.ts       Debounce pour la recherche
│   └── useRolePath.ts       Préfixe de route selon le rôle
│
├── routes/
│   └── index.tsx            Définition de toutes les routes par rôle
│
└── types/
    └── index.ts             Tous les types TypeScript (User, Stagiaire, Module…)
```

### Couche API — Pattern `createCrudApi`

```typescript
// Exemple d'utilisation
const filieresApi = createCrudApi<Filiere>('/filieres');
filieresApi.getAll({ page: 1, search: 'info', sort_by: 'nom', sort_dir: 'asc' });
filieresApi.create({ nom: 'Informatique', code: 'INF' });
filieresApi.update(1, { nom: 'Informatique appliquée' });
filieresApi.delete(1);
```

---

## 8. Structure du Backend

```
backend/
├── app/Http/Controllers/Api/
│   ├── AuthController.php         Login, OTP, 2FA, profil, mot de passe
│   ├── DashboardController.php    Statistiques globales
│   ├── FiliereController.php
│   ├── GroupController.php
│   ├── ModuleController.php
│   ├── SalleController.php
│   ├── FormateurController.php
│   ├── StagiaireController.php    + endpoints stagiaire connecté
│   ├── ExamenController.php
│   ├── NoteController.php         Saisie par batch
│   ├── AbsenceController.php
│   ├── EmploiDuTempsController.php
│   └── UserController.php
│
├── routes/api.php                 Toutes les routes (Sanctum middleware)
├── database/migrations/           Schéma complet
└── database/seeders/              Données de test
```

---

## 9. Base de données

### Schéma des tables

#### `users`
| Colonne | Type | Description |
|---------|------|-------------|
| id | bigint PK | |
| nom | varchar | |
| prenom | varchar | |
| email | varchar UNIQUE | |
| password | varchar | hashé |
| role | enum | `directeur`, `formateur`, `stagiaire`, `surveillant` |
| telephone | varchar NULL | |
| is_active | boolean | |
| email_verified_at | timestamp NULL | |
| two_factor_enabled | boolean | |

#### `filieres`
| Colonne | Type | Description |
|---------|------|-------------|
| id | bigint PK | |
| code | varchar UNIQUE | |
| nom | varchar | |
| description | text NULL | |
| duree_mois | int | défaut 24 |
| niveau | varchar | ex. "Technicien Spécialisé" |
| secteur | varchar | ex. "Digital & IA" |
| is_active | boolean | |

#### `groups`
| Colonne | Type | Description |
|---------|------|-------------|
| id | bigint PK | |
| nom | varchar | |
| filiere_id | FK → filieres | |
| annee | int | 1 ou 2 |
| annee_scolaire | varchar | ex. "2025-2026" |
| max_stagiaires | int | défaut 30 |
| is_active | boolean | |

#### `modules`
| Colonne | Type | Description |
|---------|------|-------------|
| id | bigint PK | |
| code | varchar UNIQUE | |
| nom | varchar | |
| coefficient | float | |
| heures_total | int | |
| filiere_id | FK → filieres | |
| semestre | int | |
| is_active | boolean | |

#### `salles`
| Colonne | Type | Description |
|---------|------|-------------|
| id | bigint PK | |
| nom | varchar | |
| type | enum | `cours`, `tp`, `amphi`, `reunion` |
| capacite | int | |
| batiment | varchar NULL | |
| equipements | json NULL | |
| is_active | boolean | |

#### `formateurs`
| Colonne | Type | Description |
|---------|------|-------------|
| id | bigint PK | |
| user_id | FK → users | |
| matricule | varchar UNIQUE | |
| specialisation | varchar | |
| date_recrutement | date | |
| is_active | boolean | |

#### `stagiaires`
| Colonne | Type | Description |
|---------|------|-------------|
| id | bigint PK | |
| user_id | FK → users | |
| cef | varchar UNIQUE | |
| cne | varchar UNIQUE | |
| cin | varchar UNIQUE | |
| group_id | FK → groups | |
| date_inscription | date | |
| date_naissance | date | |
| adresse | text NULL | |
| status | enum | `actif`, `abandon`, `diplome`, `suspendu` |

#### `formateur_module` (pivot)
| Colonne | Type |
|---------|------|
| formateur_id | FK → formateurs |
| module_id | FK → modules |

#### `emploi_du_temps`
| Colonne | Type | Description |
|---------|------|-------------|
| id | bigint PK | |
| group_id | FK → groups | |
| module_id | FK → modules | |
| formateur_id | FK → formateurs | |
| salle_id | FK → salles | |
| jour | enum | `lundi`…`samedi` |
| heure_debut | time | |
| heure_fin | time | |

#### `examens`
| Colonne | Type | Description |
|---------|------|-------------|
| id | bigint PK | |
| module_id | FK → modules | |
| group_id | FK → groups | |
| salle_id | FK NULL → salles | |
| formateur_id | FK → formateurs | |
| surveillant_id | bigint NULL | |
| type | enum | `controle`, `efm`, `eff`, `rattrapage` |
| numero | tinyint NULL | numéro de contrôle |
| date_examen | date | |
| heure_debut | time | |
| heure_fin | time | |

#### `notes`
| Colonne | Type | Description |
|---------|------|-------------|
| id | bigint PK | |
| stagiaire_id | FK → stagiaires | |
| examen_id | FK → examens | |
| note | float | /20 |
| remarque | text NULL | |

#### `absences`
| Colonne | Type | Description |
|---------|------|-------------|
| id | bigint PK | |
| stagiaire_id | FK → stagiaires | |
| module_id | FK NULL → modules | |
| date_absence | date | |
| heure_debut | time | |
| heure_fin | time | |
| motif | text NULL | |
| justification | text NULL | |
| status | enum | `non_justifiee`, `justifiee`, `en_attente` |

#### `activity_logs`
| Colonne | Type |
|---------|------|
| user_id | FK → users |
| action | varchar |
| description | text |
| properties | json NULL |

---

## 10. Référence API

Toutes les routes protégées nécessitent le header :
```
Authorization: Bearer {token}
```

### Authentification
| Méthode | Endpoint | Auth |
|---------|----------|------|
| POST | `/api/auth/login` | Non |
| POST | `/api/auth/verify-email` | Non |
| POST | `/api/auth/verify-2fa` | Non |
| POST | `/api/auth/forgot-password` | Non |
| POST | `/api/auth/reset-password` | Non |
| GET | `/api/auth/me` | Oui |
| GET | `/api/auth/formateur` | Oui |
| GET | `/api/stagiaires/stagiaire` | Oui |
| POST | `/api/auth/logout` | Oui |
| POST | `/api/auth/profile` | Oui |
| POST | `/api/auth/password` | Oui |

### Ressources CRUD (protégées)

| Ressource | Endpoints |
|-----------|-----------|
| Filières | `GET/POST /api/filieres`, `GET/PUT/DELETE /api/filieres/{id}`, `GET /api/filieres-all` |
| Groupes | `GET/POST /api/groups`, `GET/PUT/DELETE /api/groups/{id}`, `GET /api/groups-all`, `GET /api/groups/{id}/stagiaires` |
| Modules | `GET/POST /api/modules`, `GET/PUT/DELETE /api/modules/{id}` |
| Salles | `GET/POST /api/salles`, `GET/PUT/DELETE /api/salles/{id}`, `GET /api/salles-all` |
| Formateurs | `GET/POST /api/formateurs`, `GET/PUT/DELETE /api/formateurs/{id}`, `GET /api/formateurs/{id}/modules` |
| Stagiaires | `GET/POST /api/stagiaires`, `GET/PUT/DELETE /api/stagiaires/{id}` |
| Examens | `GET/POST /api/examens`, `GET/PUT/DELETE /api/examens/{id}` |
| Notes | `GET /api/notes`, `POST /api/notes/batch`, `PUT /api/notes/{id}`, `GET /api/grades` |
| Absences | `GET/POST /api/absences`, `PUT/DELETE /api/absences/{id}` |
| Emploi du temps | `GET/POST /api/emploi-du-temps`, `GET/PUT/DELETE /api/emploi-du-temps/{id}` |
| Utilisateurs | `GET/POST /api/users`, `GET/PUT/DELETE /api/users/{id}` |

### Dashboard
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/dashboard/stats` | Compteurs globaux |
| GET | `/api/dashboard/recent-activity` | Dernières activités |
| GET | `/api/dashboard/stagiaires-by-filiere` | Répartition par filière |

### Format de réponse standard

```json
{
  "success": true,
  "data": { ... },
  "message": "Opération réussie"
}
```

Réponse paginée :
```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "current_page": 1,
    "last_page": 5,
    "per_page": 10,
    "total": 48
  }
}
```

---

## 11. Dark Mode

Le dark mode utilise la stratégie `class` de Tailwind CSS. `ThemeContext.tsx` ajoute/supprime la classe `dark` sur `<html>` et sauvegarde la préférence dans `localStorage` (clé `theme`). La préférence système (`prefers-color-scheme`) est utilisée si aucun choix n'a été enregistré.

---

## 12. Variables d'environnement

### Frontend (`.env`)
| Variable | Description | Défaut |
|----------|-------------|--------|
| `REACT_APP_API_URL` | URL de base de l'API | `http://localhost:8000/api` |

### Backend (`.env`)
| Variable | Description |
|----------|-------------|
| `APP_KEY` | Clé de chiffrement Laravel |
| `DB_HOST` | Hôte MySQL |
| `DB_DATABASE` | Nom de la base |
| `DB_USERNAME` | Utilisateur MySQL |
| `DB_PASSWORD` | Mot de passe MySQL |
| `MAIL_*` | Configuration email (OTP) |

---

## 13. Commandes utiles

```bash
# Frontend
npm start                                          # Démarrer le serveur de dev
npm run build                                      # Build production
npm test -- --watchAll=false --testPathPattern=X   # Lancer un test spécifique

# Backend
php artisan serve                                  # Démarrer l'API
php artisan migrate                                # Appliquer les migrations
php artisan migrate:fresh --seed                   # Réinitialiser la BDD
php artisan db:seed                                # Injecter les données de test
php artisan test                                   # Lancer tous les tests
php artisan test --filter=NomDuTest                # Test spécifique
php artisan route:list                             # Lister toutes les routes
```
