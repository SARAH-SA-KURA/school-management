import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

import AuthLayout from '../components/layout/AuthLayout';
import AppLayout from '../components/layout/AppLayout';
import AuthGuard from '../guards/AuthGuard';
import GuestGuard from '../guards/GuestGuard';
import RoleGuard from '../guards/RoleGuard';

import AuthFlow from '../features/auth/pages/AuthFlow';
import ForgotPasswordPage from '../features/auth/pages/ForgotPasswordPage';
import ResetPasswordPage from '../features/auth/pages/ResetPasswordPage';

import DashboardPage from '../features/admin/pages/DashboardPage';
import StagiairesPage from '../features/admin/pages/StagiairesPage';
import FormateursPage from '../features/admin/pages/FormateursPage';
import FilieresPage from '../features/admin/pages/FilieresPage';
import ModulesPage from '../features/admin/pages/ModulesPage';
import GroupesPage from '../features/admin/pages/GroupesPage';
import SallesPage from '../features/admin/pages/SallesPage';
import ExamensPage from '../features/admin/pages/ExamensPage';
import EmploiDuTempsPage from '../features/admin/pages/EmploiDuTempsPage';
import UtilisateursPage from '../features/admin/pages/UtilisateursPage';
import ParametresPage from '../features/admin/pages/ParametresPage';
import AdminAbsencesPage from '../features/admin/pages/AbsencesPage';

import FormateurDashboardPage from '../features/formateur/pages/FormateurDashboardPage';
import FormateurModulesPage from '../features/formateur/pages/FormateurModulesPage';
import FormateurEmploiPage from '../features/formateur/pages/FormateurEmploiPage';
import FormateurExamensPage from '../features/formateur/pages/FormateurExamensPage';
import FormateurAbsencesPage from '../features/formateur/pages/FormateurAbsencesPage';
import FormateurParametresPage from '../features/formateur/pages/FormateurParametresPage';

import StagiaireDashboardPage from '../features/stagiaire/pages/StagiaireDashboardPage';
import StagiaireModulesPage from '../features/stagiaire/pages/StagiaireModulesPage';
import StagiaireEmploiPage from '../features/stagiaire/pages/StagiaireEmploiPage';
import StagiaireAbsencesPage from '../features/stagiaire/pages/StagiaireAbsencesPage';
import StagiaireExamensPage from '../features/stagiaire/pages/StagiaireExamensPage';
import StagiaireParametresPage from '../features/stagiaire/pages/StagiaireParametresPage';

import SurveillantExamensPage from '../features/surveillant/pages/SurveillantExamensPage';
import SurveillantEmploiPage from '../features/surveillant/pages/SurveillantEmploiPage';

import NotFoundPage from '../pages/NotFoundPage';
import UnauthorizedPage from '../pages/UnauthorizedPage';

const router = createBrowserRouter([
  // Auth routes
  {
    element: <GuestGuard><AuthLayout /></GuestGuard>,
    children: [
      { path: '/login', element: <AuthFlow /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
    ],
  },

  // Admin routes
  {
    element: <AuthGuard><RoleGuard roles={['directeur']}><AppLayout /></RoleGuard></AuthGuard>,
    children: [
      { path: '/admin/dashboard', element: <DashboardPage /> },
      { path: '/admin/stagiaires', element: <StagiairesPage /> },
      { path: '/admin/formateurs', element: <FormateursPage /> },
      { path: '/admin/filieres', element: <FilieresPage /> },
      { path: '/admin/modules', element: <ModulesPage /> },
      { path: '/admin/groupes', element: <GroupesPage /> },
      { path: '/admin/salles', element: <SallesPage /> },
      { path: '/admin/examens', element: <ExamensPage /> },
      { path: '/admin/emploi-du-temps', element: <EmploiDuTempsPage /> },
      { path: '/admin/utilisateurs', element: <UtilisateursPage /> },
      { path: '/admin/absences', element: <AdminAbsencesPage /> },
      { path: '/admin/parametres', element: <ParametresPage /> },
      { path: '/directeur/parametres', element: <Navigate to="/admin/parametres" replace /> },
    ],
  },

  // Formateur routes
  {
    element: <AuthGuard><RoleGuard roles={['formateur']}><AppLayout /></RoleGuard></AuthGuard>,
    children: [
      { path: '/formateur/dashboard', element: <FormateurDashboardPage /> },
      { path: '/formateur/modules', element: <FormateurModulesPage /> },
      { path: '/formateur/emploi-du-temps', element: <FormateurEmploiPage /> },
      { path: '/formateur/examens', element: <FormateurExamensPage /> },
      { path: '/formateur/absences', element: <FormateurAbsencesPage /> },
      { path: '/formateur/parametres', element: <FormateurParametresPage /> },
    ],
  },

  // Stagiaire routes
  {
    element: <AuthGuard><RoleGuard roles={['stagiaire']}><AppLayout /></RoleGuard></AuthGuard>,
    children: [
      { path: '/stagiaire/dashboard', element: <StagiaireDashboardPage /> },
      { path: '/stagiaire/modules', element: <StagiaireModulesPage /> },
      { path: '/stagiaire/emploi-du-temps', element: <StagiaireEmploiPage /> },
      { path: '/stagiaire/absences', element: <StagiaireAbsencesPage /> },
      { path: '/stagiaire/examens', element: <StagiaireExamensPage /> },
      { path: '/stagiaire/parametres', element: <StagiaireParametresPage /> },
    ],
  },

  // Surveillant routes
  {
    element: <AuthGuard><RoleGuard roles={['surveillant']}><AppLayout /></RoleGuard></AuthGuard>,
    children: [
      { path: '/surveillant/examens', element: <SurveillantExamensPage /> },
      { path: '/surveillant/emploi-du-temps', element: <SurveillantEmploiPage /> },
      { path: '/surveillant/parametres', element: <ParametresPage /> },
    ],
  },

  // Utility routes
  { path: '/unauthorized', element: <UnauthorizedPage /> },
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '*', element: <NotFoundPage /> },
]);

export default router;
