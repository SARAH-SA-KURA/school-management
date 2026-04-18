import React from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { HiPencil } from 'react-icons/hi';

const mockStats = [
  { label: 'Total Stagiaires', value: 86, badge: '1.2%' },
  { label: 'Absences non enregistrer', value: 2, badge: '1.2%' },
  { label: 'Examen à venir', value: 3, badge: '1.2%' },
  { label: 'Modules enseign', value: 8, badge: '1.2%' },
];

const mockGrades = Array(7).fill({
  stagiaire: 'Ahmed Benali', groupe: 'DEV-201', module: 'Base de Données',
  type: 'EFM', date: '10/01/2026', coeff: 3, note: 16.5,
});

const FormateurDashboardPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Formateur Dashboard</h1>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {mockStats.map((card, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-2xl">
              {i === 0 ? '🎓' : i === 1 ? '👥' : i === 2 ? '📝' : '📚'}
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

      {/* Recent Grades Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="w-10 px-4 py-3">
                <input type="checkbox" className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
              </th>
              {['Stagiaire', 'Groupe', 'Module', 'Type', 'Date', 'Coeff.', 'Note', 'Action'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {mockGrades.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50/50">
                <td className="px-4 py-3.5">
                  <input type="checkbox" className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                </td>
                <td className="px-4 py-3.5 text-sm text-gray-900">{row.stagiaire}</td>
                <td className="px-4 py-3.5 text-sm text-gray-600">{row.groupe}</td>
                <td className="px-4 py-3.5 text-sm text-gray-600">{row.module}</td>
                <td className="px-4 py-3.5 text-sm text-gray-600">{row.type}</td>
                <td className="px-4 py-3.5 text-sm text-gray-600">{row.date}</td>
                <td className="px-4 py-3.5 text-sm text-gray-600">{row.coeff}</td>
                <td className="px-4 py-3.5 text-sm text-gray-600">{row.note}</td>
                <td className="px-4 py-3.5 text-sm text-gray-400">⋮</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FormateurDashboardPage;
