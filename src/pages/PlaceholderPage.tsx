import React from 'react';

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title, description }) => {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
      {description && <p className="text-sm text-gray-500">{description}</p>}
      <div className="mt-8 card">
        <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
          Cette page sera bientôt disponible
        </div>
      </div>
    </div>
  );
};

export default PlaceholderPage;
