import React from 'react';
import { Link } from 'react-router-dom';

const mockAbsences = [
  { date: '18/02/2026', seance: 'Séance 1 — 08:30-10:50', formateur: 'Mme. Benkirane', status: 'Justifiee' },
  { date: '05/02/2026', seance: 'Séance 1 — 13:30-15:50', formateur: 'M. Hajji', status: 'Justifiee' },
  { date: '12/01/2026', seance: 'Séance 2 — 11:10-13:30', formateur: 'M. El Alaoui', status: 'Non justifiee' },
  { date: '18/12/2025', seance: 'Séance 1 — 08:30-10:50', formateur: 'M. El Alaoui', status: 'Non justifiee' },
  { date: '10/11/2025', seance: 'Séance 2 — 16:10-18:30', formateur: 'M. El Alaoui', status: 'Justifiee' },
];

const StagiaireAbsencesPage: React.FC = () => (
  <div>
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-gray-900">Absences</h1>
      <p className="text-sm text-gray-500">
        <Link to="/stagiaire" className="text-primary-600 hover:text-primary-700">Tableau de bord</Link>{' / '}<span className="text-primary-600">Académique</span>{' / '}<span>Les absences</span>
      </p>
    </div>

    {/* Summary Cards */}
    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <p className="text-sm text-gray-500">Totales Absences</p>
        <p className="text-3xl font-bold text-gray-900">12.5h</p>
        <p className="text-sm text-gray-400">5 séances</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <p className="text-sm text-gray-500">Justifiées</p>
        <p className="text-3xl font-bold text-green-600">7.5h</p>
        <p className="text-sm text-gray-400">3 séances</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <p className="text-sm text-gray-500">Non Justifiées</p>
        <p className="text-3xl font-bold text-red-600">5h</p>
        <p className="text-sm text-gray-400">2 séances</p>
      </div>
    </div>

    {/* Progress Bar */}
    <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900">Heures non justifiées</h3>
        <span className="text-sm text-gray-500">5h / 30h max</span>
      </div>
      <div className="relative w-full h-3 bg-gray-100 rounded-full overflow-visible mb-6">
        <div className="h-full bg-gradient-to-r from-primary-600 to-primary-400 rounded-full" style={{ width: '16.7%' }} />
        <div className="absolute top-full mt-1 text-xs text-gray-400" style={{ left: 0 }}>0h</div>
        <div className="absolute top-0 bottom-0 w-0.5 bg-yellow-400" style={{ left: '50%' }} />
        <div className="absolute top-full mt-1 text-xs text-yellow-600" style={{ left: '50%', transform: 'translateX(-50%)' }}>15h 📋 1er engagement</div>
        <div className="absolute top-0 bottom-0 w-0.5 bg-orange-400" style={{ left: '66.7%' }} />
        <div className="absolute top-full mt-3 text-xs text-orange-600" style={{ left: '66.7%', transform: 'translateX(-50%)' }}>20h 📋 2ème engagement</div>
        <div className="absolute top-0 bottom-0 w-0.5 bg-red-500" style={{ left: '100%' }} />
        <div className="absolute top-full mt-1 text-xs text-red-600" style={{ right: 0 }}>30h ⚠ Conseil</div>
      </div>
    </div>

    {/* Absences Table */}
    <div className="bg-white border border-gray-200 rounded-xl">
      <div className="px-6 pt-5 pb-4">
        <h2 className="text-lg font-semibold text-gray-900">Les absences</h2>
      </div>
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50/50 border-y border-gray-100">
            <th className="w-10 px-4 py-3"><input type="checkbox" className="rounded border-gray-300 text-primary-600" /></th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Séance</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Formateur</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Statut.</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {mockAbsences.map((a, i) => (
            <tr key={i} className="hover:bg-gray-50/50">
              <td className="px-4 py-3.5"><input type="checkbox" className="rounded border-gray-300 text-primary-600" /></td>
              <td className="px-4 py-3.5 text-sm text-primary-600 font-medium">{a.date}</td>
              <td className="px-4 py-3.5 text-sm text-gray-600">{a.seance}</td>
              <td className="px-4 py-3.5 text-sm text-gray-600">{a.formateur}</td>
              <td className="px-4 py-3.5">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${a.status === 'Justifiee' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{a.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default StagiaireAbsencesPage;
