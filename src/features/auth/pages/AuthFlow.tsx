import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../../app/hooks';
import LoginPage from './LoginPage';
import EmailVerificationPage from './EmailVerificationPage';
import TwoFactorPage from './TwoFactorPage';
import { ROLES } from '../../../utils/constants';

const AuthFlow: React.FC = () => {
  const navigate = useNavigate();
  const { loginStep, isAuthenticated, user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated && user && loginStep === 'complete') {
      const routes: Record<string, string> = {
        [ROLES.DIRECTEUR]: '/admin/dashboard',
        [ROLES.FORMATEUR]: '/formateur/dashboard',
        [ROLES.STAGIAIRE]: '/stagiaire/dashboard',
        [ROLES.SURVEILLANT]: '/surveillant/examens',
      };
      navigate(routes[user.role] || '/admin/dashboard', { replace: true });
    }
  }, [isAuthenticated, user, loginStep, navigate]);

  switch (loginStep) {
    case 'email_verification':
      return <EmailVerificationPage />;
    case 'two_factor':
      return <TwoFactorPage />;
    default:
      return <LoginPage />;
  }
};

export default AuthFlow;
