<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\{
    AuthController,
    DashboardController,
    FiliereController,
    GroupController,
    ModuleController,
    SalleController,
    FormateurController,
    StagiaireController,
    ExamenController,
    NoteController,
    AbsenceController,
    EmploiDuTempsController,
    NotificationController,
    UserController,
};

// ─── Public auth ───────────────────────────────────────────────
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
    Route::post('/verify-email', [AuthController::class, 'verifyEmail']);
    Route::post('/verify-2fa', [AuthController::class, 'verify2FA']);
});

// ─── Authenticated area ───────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    // ── Personal (any authenticated user) ──
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/auth/profile', [AuthController::class, 'updateProfile']);
    Route::post('/auth/password', [AuthController::class, 'changePassword']);
    Route::post('/auth/change-password', [AuthController::class, 'changePassword']);

    // ── Notifications (self-scoped, any authenticated user) ──
    Route::get ('/notifications',                     [NotificationController::class, 'index']);
    Route::get ('/notifications/unread-count',        [NotificationController::class, 'unreadCount']);
    Route::post('/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);
    Route::post('/notifications/read-all',            [NotificationController::class, 'markAllAsRead']);

    // ── Self-scoped endpoints ──
    Route::middleware('role:formateur')->group(function () {
        Route::get('/auth/formateur',     [AuthController::class, 'formateur']);
        Route::get('/formateur/groups',     [FormateurController::class, 'myGroups']);
        Route::get('/formateur/stagiaires', [FormateurController::class, 'myStagiaires']);
    });

    Route::middleware('role:stagiaire')->group(function () {
        Route::get('/auth/stagiaire', [StagiaireController::class, 'stagiaire']);
        Route::get('/stagiaire/stats', [StagiaireController::class, 'stats']);
        Route::get('/stagiaire/absences', [StagiaireController::class, 'absences']);
        Route::get('/stagiaire/emploi', [StagiaireController::class, 'emploi']);
        Route::get('/stagiaire/exams', [StagiaireController::class, 'exams']);
        Route::get('/stagiaire/modules', [StagiaireController::class, 'modules']);
    });

    // ── Global dashboard (Directeur + Surveillant) ──
    Route::middleware('role:directeur,surveillant')->group(function () {
        Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
        Route::get('/dashboard/recent-activity', [DashboardController::class, 'recentActivity']);
        Route::get('/dashboard/stagiaires-by-filiere', [DashboardController::class, 'stagiairesByFiliere']);
    });

    // ══════════════════════════════════════════════════════════
    // READS — open to any authenticated user; controllers scope
    // output per role where relevant.
    // ══════════════════════════════════════════════════════════
    Route::get('/filieres',            [FiliereController::class, 'index']);
    Route::get('/filieres-all',        [FiliereController::class, 'all']);
    Route::get('/filieres/{filiere}',  [FiliereController::class, 'show']);

    Route::get('/modules',             [ModuleController::class, 'index']);
    Route::get('/modules/{module}',    [ModuleController::class, 'show']);

    Route::get('/salles',              [SalleController::class, 'index']);
    Route::get('/salles-all',          [SalleController::class, 'all']);
    Route::get('/salles-available',    [SalleController::class, 'available']);
    Route::get('/salles/{salle}',      [SalleController::class, 'show']);

    Route::get('/groups',              [GroupController::class, 'index']);
    Route::get('/groups-all',          [GroupController::class, 'all']);
    Route::get('/groups/{group}',      [GroupController::class, 'show']);
    Route::get('/groups/{group}/stagiaires', [GroupController::class, 'stagiaires']);

    Route::get('/emploi-du-temps',            [EmploiDuTempsController::class, 'index']);
    Route::get('/emploi-du-temps/{emploiDuTemp}', [EmploiDuTempsController::class, 'show']);

    Route::get('/examens',             [ExamenController::class, 'index']);
    Route::get('/examens/{examen}',    [ExamenController::class, 'show']);

    // Reads restricted to staff (not stagiaires) for staff/student rosters
    Route::middleware('role:directeur,surveillant,formateur')->group(function () {
        Route::get('/formateurs',                        [FormateurController::class, 'index']);
        Route::get('/formateurs-all',                    [FormateurController::class, 'all']);
        Route::get('/formateurs/{formateur}',            [FormateurController::class, 'show']);
        Route::get('/formateurs/{formateur}/modules',    [FormateurController::class, 'modules']);

        Route::get('/stagiaires',                        [StagiaireController::class, 'index']);
        Route::get('/stagiaires/{stagiaire}',            [StagiaireController::class, 'show']);

        Route::get('/notes',                             [NoteController::class, 'index']);
        Route::get('/grades',                            [NoteController::class, 'grades']);

        Route::get('/absences',                          [AbsenceController::class, 'index']);
        Route::get('/absences/stats',                    [AbsenceController::class, 'stats']);
        Route::get('/absences/summary',                  [AbsenceController::class, 'summary']);
        Route::get('/absences/warnings',                 [AbsenceController::class, 'warnings']);
    });

    // Users list — Directeur only
    Route::middleware('role:directeur')->group(function () {
        Route::get('/users',            [UserController::class, 'index']);
        Route::get('/users/{user}',     [UserController::class, 'show']);
    });

    // ══════════════════════════════════════════════════════════
    // WRITES — role-gated per OFPPT responsibilities
    // ══════════════════════════════════════════════════════════

    // Directeur — catalog (filières/modules/salles/formateurs) + user accounts
    Route::middleware('role:directeur')->group(function () {
        Route::post  ('/filieres',           [FiliereController::class, 'store']);
        Route::match (['put','patch'], '/filieres/{filiere}', [FiliereController::class, 'update']);
        Route::delete('/filieres/{filiere}', [FiliereController::class, 'destroy']);

        Route::post  ('/modules',            [ModuleController::class, 'store']);
        Route::post  ('/modules/bulk',       [ModuleController::class, 'bulkStore']);
        Route::match (['put','patch'], '/modules/{module}', [ModuleController::class, 'update']);
        Route::delete('/modules/{module}',   [ModuleController::class, 'destroy']);

        Route::post  ('/salles',             [SalleController::class, 'store']);
        Route::match (['put','patch'], '/salles/{salle}', [SalleController::class, 'update']);
        Route::delete('/salles/{salle}',     [SalleController::class, 'destroy']);

        Route::post  ('/formateurs',         [FormateurController::class, 'store']);
        Route::match (['put','patch'], '/formateurs/{formateur}', [FormateurController::class, 'update']);
        Route::delete('/formateurs/{formateur}', [FormateurController::class, 'destroy']);

        Route::post  ('/users',              [UserController::class, 'store']);
        Route::match (['put','patch'], '/users/{user}', [UserController::class, 'update']);
        Route::delete('/users/{user}',       [UserController::class, 'destroy']);
    });

    // Directeur + Surveillant — operational writes
    // (groupes, stagiaires, absence consolidation). Emploi du temps is
    // Directeur-only below — the Surveillant views but doesn't schedule.
    Route::middleware('role:directeur,surveillant')->group(function () {
        Route::post  ('/groups',             [GroupController::class, 'store']);
        Route::match (['put','patch'], '/groups/{group}', [GroupController::class, 'update']);
        Route::delete('/groups/{group}',     [GroupController::class, 'destroy']);

        Route::post  ('/stagiaires',         [StagiaireController::class, 'store']);
        Route::post  ('/stagiaires/bulk',    [StagiaireController::class, 'bulkStore']);
        Route::match (['put','patch'], '/stagiaires/{stagiaire}', [StagiaireController::class, 'update']);
        Route::delete('/stagiaires/{stagiaire}', [StagiaireController::class, 'destroy']);

    });

    // Emploi du temps writes — Directeur only (scheduling authority sits here).
    Route::middleware('role:directeur')->group(function () {
        Route::post  ('/emploi-du-temps',    [EmploiDuTempsController::class, 'store']);
        Route::match (['put','patch'], '/emploi-du-temps/{emploiDuTemp}', [EmploiDuTempsController::class, 'update']);
        Route::delete('/emploi-du-temps/{emploiDuTemp}', [EmploiDuTempsController::class, 'destroy']);
    });

    // Examens — Formateur is the primary author (schedules exams based on his
    // progress with students). Directeur retained as backend override only;
    // Surveillant can no longer CUD exams.
    Route::middleware('role:directeur,formateur')->group(function () {
        Route::post  ('/examens',            [ExamenController::class, 'store']);
        Route::match (['put','patch'], '/examens/{examen}', [ExamenController::class, 'update']);
        Route::delete('/examens/{examen}',   [ExamenController::class, 'destroy']);
    });

    // Directeur + Surveillant + Formateur — absence entries
    // (formateur per-session; surveillant/directeur consolidate + justify)
    Route::middleware('role:directeur,surveillant,formateur')->group(function () {
        Route::post  ('/absences',           [AbsenceController::class, 'store']);
        Route::post  ('/absences/{absence}/justify', [AbsenceController::class, 'justify']);
        Route::match (['put','patch'], '/absences/{absence}', [AbsenceController::class, 'update']);
        Route::delete('/absences/{absence}', [AbsenceController::class, 'destroy']);
    });

    // Directeur + Formateur — notes (grades)
    // (formateur for own modules; directeur may override)
    Route::middleware('role:directeur,formateur')->group(function () {
        Route::post('/notes/batch',   [NoteController::class, 'batchStore']);
        Route::put ('/notes/{note}',  [NoteController::class, 'update']);
    });

    // Notes validation dashboard. Read opens to all three roles so the
    // Formateur's UI can detect whether his module is locked and adjust.
    Route::middleware('role:directeur,surveillant,formateur')->group(function () {
        Route::get ('/notes/group-modules-status', [NoteController::class, 'groupModulesStatus']);
    });
    // Only the Directeur can flip the validation state.
    Route::middleware('role:directeur')->group(function () {
        Route::post('/notes/validate',   [NoteController::class, 'validateGroupModule']);
        Route::post('/notes/unvalidate', [NoteController::class, 'unvalidateGroupModule']);
    });
});
