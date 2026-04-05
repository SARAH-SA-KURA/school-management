import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { HiShieldExclamation } from 'react-icons/hi';

const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center">
        <div className="inline-flex p-4 bg-danger-100 rounded-full mb-6">
          <HiShieldExclamation className="h-12 w-12 text-danger-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Accès non autorisé</h1>
        <p className="text-gray-500 mb-6">Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
        <Button onClick={() => navigate(-1)}>Retour</Button>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
