import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';

const illustrationMap: Record<string, string> = {
  '/login': '/images/auth-login.png',
  '/verify-email': '/images/auth-email-verify.png',
  '/two-factor': '/images/auth-email-verify.png',
  '/forgot-password': '/images/auth-forgot-password.png',
  '/reset-password': '/images/auth-reset-password.png',
};

const AuthLayout: React.FC = () => {
  const location = useLocation();
  const { isDark } = useTheme();
  const basePath = '/' + location.pathname.split('/')[1];
  const illustration = illustrationMap[basePath] || '/images/auth-login.png';

  return (
    <div className="min-h-screen flex bg-white dark:bg-gray-950 transition-colors">
      {/* Left side - Illustration */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12">
        <img
          src={illustration}
          alt="Illustration"
          className="max-w-md w-full h-auto object-contain"
        />
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img src={isDark ? '/images/logo-dark.png' : '/images/logo.png'} alt="MACOMPUS" className="h-12" />
          </div>

          {/* Form Card */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-8">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
