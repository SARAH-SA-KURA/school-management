import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/ui';
import { HiUpload, HiDownload, HiSortAscending, HiChevronUp, HiChevronDown, HiSearch } from 'react-icons/hi';

const mockModules = [
  { code: 'M101', nom: 'Bases de Donnees', filiere: 'Dév. Digital', vol: '90h', groupes: 'DEV-201 |DEV-202', stagiaires: 20, progression: 65 },
  { code: 'M101', nom: 'Bases de Donnees', filiere: 'Dév. Digital', vol: '90h', groupes: 'DEV-201', stagiaires: 20, progression: 65 },
  { code: 'M101', nom: 'Bases de Donnees', filiere: 'Dév. Digital', vol: '90h', groupes: 'DEV-201', stagiaires: 20, progression: 55 },
  { code: 'M101', nom: 'Bases de Donnees', filiere: 'Dév. Digital', vol: '90h', groupes: 'DEV-201', stagiaires: 20, progression: 40 },
  { code: 'M101', nom: 'Bases de Donnees', filiere: 'Dév. Digital', vol: '90h', groupes: 'DEV-201', stagiaires: 20, progression: 40 },
  { code: 'M101', nom: 'Bases de Donnees', filiere: 'Dév. Digital', vol: '90h', groupes: 'DEV-201', stagiaires: 20, progression: 40 },
  { code: 'M101', nom: 'Bases de Donnees', filiere: 'Dév. Digital', vol: '90h', groupes: 'DEV-201', stagiaires: 20, progression: 55 },
];

const progressColor = (val: number) => {
  if (val >= 60) return 'bg-primary-600';
  if (val >= 50) return 'bg-yellow-500';
  return 'bg-green-500';
};

const FormateurModulesPage: React.FC = () => {
  const [search, setSearch] = useState('');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Modules</h1>
          <p className="text-sm text-gray-500">
            <Link to="/formateur" className="text-primary-600 hover:text-primary-700">Tableau de bord</Link>
            {' / '}
            <span className="text-primary-600">Academique</span>
            {' / '}
            <span>Modules</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" icon={<HiUpload className="h-4 w-4" />}>Import</Button>
          <Button variant="secondary" icon={<HiDownload className="h-4 w-4" />}>Export</Button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <h2 className="text-lg font-semibold text-gray-900">Modules</h2>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            <HiSortAscending className="h-4 w-4" /> Sort By A-Z
          </button>
        </div>

        <div className="flex items-center justify-between px-6 pb-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            Row Per Page
            <select className="border border-gray-200 rounded px-2 py-1 text-sm">
              <option>10</option><option>25</option><option>50</option>
            </select>
            Entries
          </div>
          <div className="relative">
            <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search"
              className="text-sm border border-gray-200 rounded-lg pl-9 pr-3 py-1.5 text-gray-700 bg-white outline-none placeholder-gray-400 min-w-[160px]" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50 border-y border-gray-100">
                <th className="w-10 px-4 py-3">
                  <input type="checkbox" className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                </th>
                {['Code Module', 'Nom', 'Filiere', 'Vol. Horaire', 'Groupes', 'Stagiaires', 'Progression'].map(col => (
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
              {mockModules.map((mod, i) => (
                <tr key={i} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3.5">
                    <input type="checkbox" className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                  </td>
                  <td className="px-4 py-3.5 text-sm text-gray-900">{mod.code}</td>
                  <td className="px-4 py-3.5 text-sm text-gray-600">{mod.nom}</td>
                  <td className="px-4 py-3.5 text-sm text-gray-600">{mod.filiere}</td>
                  <td className="px-4 py-3.5 text-sm text-gray-600">{mod.vol}</td>
                  <td className="px-4 py-3.5 text-sm text-gray-600">{mod.groupes}</td>
                  <td className="px-4 py-3.5 text-sm text-gray-600">{mod.stagiaires}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${progressColor(mod.progression)}`}
                          style={{ width: `${mod.progression}%` }} />
                      </div>
                      <span className="text-sm text-gray-600">{mod.progression}%</span>
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
            <button className="px-3 py-1 text-sm text-primary-600">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormateurModulesPage;
