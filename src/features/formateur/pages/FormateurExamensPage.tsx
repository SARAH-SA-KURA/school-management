import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/ui';
import { HiUpload, HiDownload, HiSortAscending, HiChevronUp, HiChevronDown } from 'react-icons/hi';

const mockStudents = Array(7).fill({
  name: 'Ahmed Benali',
  cc1: 12, cc2: 12, cc3: 12, efm: 12, moyenne: 12.5,
});

const FormateurExamensPage: React.FC = () => {
  const [selectedFiliere, setSelectedFiliere] = useState('');
  const [selectedGroupe, setSelectedGroupe] = useState('');
  const [selectedModule, setSelectedModule] = useState('');
  const [coeff, setCoeff] = useState('3');
  const [numControle, setNumControle] = useState('3');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Examens & notes</h1>
          <p className="text-sm text-gray-500">
            <Link to="/formateur" className="text-primary-600 hover:text-primary-700">Tableau de bord</Link>
            {' / '}
            <span className="text-primary-600">Académique</span>
            {' / '}
            <span>Examens & notes</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" icon={<HiUpload className="h-4 w-4" />}>Import</Button>
          <Button variant="secondary" icon={<HiDownload className="h-4 w-4" />}>Export</Button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <h2 className="text-lg font-semibold text-gray-900">Examens & notes</h2>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            <HiSortAscending className="h-4 w-4" /> Sort By A-Z
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 px-6 pb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Filières</span>
            <select value={selectedFiliere} onChange={(e) => setSelectedFiliere(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 bg-white">
              <option>Infrastructure</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Groupes</span>
            <select value={selectedGroupe} onChange={(e) => setSelectedGroupe(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 bg-white">
              <option>DEV-201</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Modules</span>
            <select value={selectedModule} onChange={(e) => setSelectedModule(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 bg-white">
              <option>Base de Données</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Coeff</span>
            <select value={coeff} onChange={(e) => setCoeff(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 bg-white">
              <option>3</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">N° de contrôle</span>
            <select value={numControle} onChange={(e) => setNumControle(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 bg-white">
              <option>3</option>
            </select>
          </div>
        </div>

        {/* Editable Grades Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50 border-y border-gray-100">
                <th className="w-10 px-4 py-3">
                  <input type="checkbox" className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                </th>
                {['Stagiaire', 'CC1', 'CC2', 'CC3', 'EFM', 'Moyenne'].map(col => (
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
              {mockStudents.map((student, i) => (
                <tr key={i} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <input type="checkbox" className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{student.name}</td>
                  {['cc1', 'cc2', 'cc3', 'efm'].map(field => (
                    <td key={field} className="px-2 py-3">
                      <div className="flex items-center gap-1">
                        <select className="w-16 text-sm border border-gray-200 rounded px-2 py-1 text-gray-700">
                          <option>{student[field as keyof typeof student]}</option>
                        </select>
                        <span className="text-xs text-gray-400">ABS</span>
                      </div>
                    </td>
                  ))}
                  <td className="px-4 py-3 text-sm font-bold text-gray-900">{student.moyenne}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-gray-100">
          <div className="flex items-center gap-1">
            <button className="px-3 py-1 text-sm text-gray-500">Pre</button>
            <button className="px-3 py-1 text-sm bg-primary-600 text-white rounded-lg">1</button>
            <button className="px-3 py-1 text-sm text-gray-500">2</button>
            <span className="px-2 text-sm text-gray-400">....</span>
            <button className="px-3 py-1 text-sm text-gray-500">5</button>
            <button className="px-3 py-1 text-sm text-primary-600">Next</button>
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-6">
        <button className="px-8 py-3 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors">
          Enregistrer les notes
        </button>
      </div>
    </div>
  );
};

export default FormateurExamensPage;
