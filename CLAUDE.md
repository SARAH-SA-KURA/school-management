# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a school management system (OFPPT-style) with a **React + TypeScript frontend** (Create React App) and a **Laravel 12 backend** (PHP 8.2, Sanctum auth). They are separate apps in the same repo: `src/` for the frontend, `backend/` for the API.

## Commands

### Frontend (root directory)
```bash
npm start          # Dev server on http://localhost:3000
npm test           # Jest in watch mode
npm test -- --watchAll=false --testPathPattern=<file>  # Run a single test file
npm run build      # Production build
```

### Backend (`backend/` directory)
```bash
php artisan serve          # API server on http://localhost:8000
php artisan migrate        # Run migrations
php artisan db:seed        # Seed data
php artisan test           # PHPUnit test suite
php artisan test --filter=TestName  # Single test
composer install           # Install PHP deps
```

### Environment
- Frontend reads `REACT_APP_API_URL` (defaults to `http://localhost:8000/api`)
- Backend needs a standard Laravel `.env` with DB credentials and `APP_KEY`

## Architecture

### Auth Flow (multi-step)
Login is a 3-step flow managed by `authSlice.ts`:
1. **credentials** → POST `/auth/login`
2. **email_verification** → POST `/auth/verify-email` (OTP code)
3. **two_factor** → POST `/auth/verify-2fa`

State machine lives in `src/features/auth/authSlice.ts` with `loginStep` tracking the current step. `AuthFlow.tsx` renders the correct step UI. Token + user are persisted to `localStorage` via `src/utils/storage.ts`.

### Role-Based Routing
Four roles: `directeur`, `formateur`, `stagiaire`, `surveillant`. Each role has its own route prefix and feature folder under `src/features/`. Routes are protected by `AuthGuard` (checks `isAuthenticated`) and `RoleGuard` (checks `user.role`). After login, `authSlice` auto-redirects to the role's dashboard.

### Redux Store
Only `auth` state is in Redux (`src/app/store.ts`). All other server state (lists, CRUD data) is managed locally in page components via `useState` + direct API calls — there are no additional Redux slices for domain data.

### API Layer
- `src/api/axiosInstance.ts` — base Axios instance; attaches Bearer token from `localStorage`, redirects to `/login` on 401
- `src/api/crudApi.ts` — `createCrudApi<T>(basePath)` factory that generates typed `getAll/getById/create/update/delete` for each resource; all named exports (`filieresApi`, `groupsApi`, etc.) come from this factory
- `src/api/authApi.ts` — auth-specific calls
- `src/api/dashboardApi.ts` — dashboard stats calls

### Shared UI Components (`src/components/ui/`)
Reusable primitives: `DataTable`, `Modal`, `ConfirmDialog`, `StatCard`, `Badge`, `Button`, `Input`, `Select`, `SearchInput`, `Pagination`, `Spinner`, `Card`. Use these before creating new ones.

### Dark Mode
`ThemeContext.tsx` toggles a `dark` class on `<html>`. Tailwind's `darkMode: 'class'` config picks it up. Persist preference in `localStorage` under key `theme`.

### Backend Structure
Standard Laravel — controllers in `app/Http/Controllers/Api/`, all routes under `routes/api.php` behind `auth:sanctum` middleware except the auth endpoints. No custom middleware beyond Sanctum.
