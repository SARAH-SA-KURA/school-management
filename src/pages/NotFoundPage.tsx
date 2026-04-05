import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-primary-600 mb-4">404</h1>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Page introuvable</h2>
        <p className="text-gray-500 mb-6">La page que vous recherchez n'existe pas.</p>
        <Button onClick={() => navigate('/')}>Retour à l'accueil</Button>
      </div>
    </div>
  );
};

export default NotFoundPage;
