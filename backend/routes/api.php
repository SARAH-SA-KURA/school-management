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
    UserController,
};

// Auth routes (public)
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
    Route::post('/verify-email', [AuthController::class, 'verifyEmail']);
    Route::post('/verify-2fa', [AuthController::class, 'verify2FA']);
});

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::get('/auth/formateur', [AuthController::class, 'formateur']);
    Route::get('/auth/stagiaire', [StagiaireController::class, 'stagiaire']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/auth/profile', [AuthController::class, 'updateProfile']);
    Route::post('/auth/password', [AuthController::class, 'changePassword']);
    Route::post('/auth/change-password', [AuthController::class, 'changePassword']);

    // Dashboard
    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
    Route::get('/dashboard/recent-activity', [DashboardController::class, 'recentActivity']);
    Route::get('/dashboard/stagiaires-by-filiere', [DashboardController::class, 'stagiairesByFiliere']);

    // CRUD Resources
    Route::apiResource('filieres', FiliereController::class);
    Route::get('/filieres-all', [FiliereController::class, 'all']);

    Route::apiResource('groups', GroupController::class);
    Route::get('/groups-all', [GroupController::class, 'all']);
    Route::get('/groups/{group}/stagiaires', [GroupController::class, 'stagiaires']);

    Route::apiResource('modules', ModuleController::class);
    Route::apiResource('salles', SalleController::class);
    Route::get('/salles-all', [SalleController::class, 'all']);

    Route::apiResource('formateurs', FormateurController::class);
    Route::get('/formateurs/{formateur}/modules', [FormateurController::class, 'modules']);

    Route::apiResource('stagiaires', StagiaireController::class);
    Route::get('/stagiaire/stats', [StagiaireController::class, 'stats']);
    Route::get('/stagiaire/absences', [StagiaireController::class, 'absences']);
    Route::get('/stagiaire/emploi', [StagiaireController::class, 'emploi']);
    Route::get('/stagiaire/exams', [StagiaireController::class, 'exams']);
    Route::get('/stagiaire/modules', [StagiaireController::class, 'modules']);

    Route::apiResource('examens', ExamenController::class);

    Route::get('/notes', [NoteController::class, 'index']);
    Route::get('/grades', [NoteController::class, 'grades']);
    Route::post('/notes/batch', [NoteController::class, 'batchStore']);
    Route::put('/notes/{note}', [NoteController::class, 'update']);

    Route::apiResource('absences', AbsenceController::class)->except(['show']);

    Route::apiResource('emploi-du-temps', EmploiDuTempsController::class)->parameters([
        'emploi-du-temps' => 'emploiDuTemp',
    ]);

    Route::apiResource('users', UserController::class);
});
