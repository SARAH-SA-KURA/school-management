import React from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { HiPencil } from 'react-icons/hi';

const mockStats = [
  { label: 'Totales Absences', value: 2, badge: '1.2%' },
  { label: 'Examen à venir', value: 3, badge: '1.2%' },
  { label: 'Modules Actifs', value: 8, badge: '1.2%' },
];

const mockModules = [
  { code: 'M101', name: 'Programmation Orientee Objet', moyenne: 14.25, color: 'bg-blue-50 border-blue-100' },
  { code: 'M102', name: 'Bases de Donnees', moyenne: 11.70, color: 'bg-blue-50 border-blue-100' },
  { code: 'M201', name: 'Reseaux Informatiques', moyenne: 8.80, color: 'bg-red-50 border-red-100' },
  { code: 'M301', name: 'Mathematiques Appliquees', moyenne: 15.00, color: 'bg-green-50 border-green-100' },
];

const StagiaireDashboardPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Stagiaires Dashboard</h1>
      </div>

      {/* Welcome Banner */}
      <div className="relative bg-gray-900 rounded-xl p-6 mb-6 overflow-hidden">
        <div className="relative z-10 flex items-center gap-3">
          <h2 className="text-2xl font-bold text-white">Bienvenue, Mr. {user?.nom || 'Herald'}</h2>
          <button className="text-white/70 hover:text-white"><HiPencil className="h-5 w-5" /></button>
        </div>
        <div className="absolute top-0 right-0 w-48 h-full opacity-10">
          <div className="absolute top-4 right-4 w-16 h-16 border-2 border-white rounded-full" />
          <div className="absolute top-12 right-20 w-10 h-10 border-2 border-white rounded-full" />
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {mockStats.map((card, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-2xl">
              {i === 0 ? '🎓' : i === 1 ? '📝' : '📚'}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-gray-900">{card.value}</span>
                <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">{card.badge}</span>
              </div>
              <p className="text-sm text-gray-500">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Module Averages */}
      <div className="space-y-3">
        {mockModules.map((mod, i) => (
          <div key={i} className={`flex items-center justify-between p-4 rounded-xl border ${mod.color}`}>
            <span className="text-sm font-medium text-gray-800">{mod.code} - {mod.name}</span>
            <span className={`text-sm font-semibold ${mod.moyenne >= 10 ? 'text-green-600' : 'text-red-600'}`}>
              Moyenne: {mod.moyenne.toFixed(2)}/20
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StagiaireDashboardPage;
