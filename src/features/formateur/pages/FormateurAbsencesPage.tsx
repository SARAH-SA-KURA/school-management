import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { HiSortAscending, HiChevronUp, HiChevronDown } from 'react-icons/hi';

interface AbsenceRow {
  id: string;
  stagiaire: string;
  billet: string | null;
  present: boolean | null;
}

const mockData: AbsenceRow[] = [
  { id: 'C138038', stagiaire: 'Ahmed Benali', billet: 'Non justifiee', present: false },
  { id: 'C138038', stagiaire: 'Ahmed Benali', billet: null, present: true },
  { id: 'C138038', stagiaire: 'Ahmed Benali', billet: 'Non justifiee', present: null },
  { id: 'C138038', stagiaire: 'Ahmed Benali', billet: null, present: null },
  { id: 'C138038', stagiaire: 'Ahmed Benali', billet: null, present: true },
  { id: 'C138038', stagiaire: 'Ahmed Benali', billet: null, present: true },
  { id: 'C138038', stagiaire: 'Ahmed Benali', billet: null, present: true },
];

const FormateurAbsencesPage: React.FC = () => {
  const [date] = useState('20/02/2026');
  const [groupe] = useState('TDI-101');
  const [seance] = useState('08:00 - 10:00');
  const [absences, setAbsences] = useState(mockData);

  const togglePresence = (index: number, value: boolean) => {
    setAbsences(prev => prev.map((a, i) => i === index ? { ...a, present: value } : a));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Absences</h1>
          <p className="text-sm text-gray-500">
            <Link to="/formateur" className="text-primary-600 hover:text-primary-700">Tableau de bord</Link>
            {' / '}
            <span className="text-primary-600">Gestion</span>
            {' / '}
            <span>Absences</span>
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <h2 className="text-lg font-semibold text-gray-900">Saisir les absences</h2>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            <HiSortAscending className="h-4 w-4" /> Sort By A-Z
          </button>
        </div>

        {/* Session Info */}
        <div className="grid grid-cols-3 gap-4 px-6 pb-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Date</label>
            <input value={date} readOnly className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Groupe</label>
            <input value={groupe} readOnly className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Seance</label>
            <input value={seance} readOnly className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50 border-y border-gray-100">
                <th className="w-10 px-4 py-3">
                  <input type="checkbox" className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                </th>
                {['ID', 'Stagiaire', "Bille d'absence", 'Statut.'].map(col => (
                  <th key={col} className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    <span className="inline-flex items-center">
                      {col}
                      <span className="inline-flex flex-col ml-1 -space-y-1">
                        <HiChevronUp className="h-3 w-3 text-gray-300" />
                        <HiChevronDown className="h-3 w-3 text-gray-300" />
                      </span>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {absences.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3.5">
                    <input type="checkbox" className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                  </td>
                  <td className="px-4 py-3.5 text-sm text-primary-600 font-medium">{row.id}</td>
                  <td className="px-4 py-3.5 text-sm text-gray-900">{row.stagiaire}</td>
                  <td className="px-4 py-3.5">
                    {row.billet ? (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600">{row.billet}</span>
                    ) : (
                      <span className="text-sm text-gray-400">–</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <button onClick={() => togglePresence(i, true)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          row.present === true ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-600 border border-gray-200'
                        }`}>
                        Present
                      </button>
                      <button onClick={() => togglePresence(i, false)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          row.present === false ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-gray-100 text-gray-600 border border-gray-200'
                        }`}>
                        Absent
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-end px-6 py-4 border-t border-gray-100">
          <div className="flex items-center gap-1">
            <button className="px-3 py-1 text-sm text-gray-500">Pre</button>
            <button className="px-3 py-1 text-sm bg-primary-600 text-white rounded-lg">1</button>
            <button className="px-3 py-1 text-sm text-gray-500">2</button>
            <button className="px-3 py-1 text-sm text-gray-500">3</button>
            <button className="px-3 py-1 text-sm text-primary-600">Next</button>
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-6">
        <button className="px-8 py-3 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors">
          Enregistrer les absences
        </button>
      </div>
    </div>
  );
};

export default FormateurAbsencesPage;
