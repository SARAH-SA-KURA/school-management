import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../../contexts/ThemeContext';
import axiosInstance from '../../../utils/axios';
import toast from 'react-hot-toast';
import { HiSortAscending, HiChevronUp, HiChevronDown, HiSearch } from 'react-icons/hi';

interface Module {
  id: number;
  code: string;
  nom: string;
  heures_total: number;
  formateurs?: Array<{ user?: { nom: string; prenom: string } }>;
}

const StagiaireModulesPage: React.FC = () => {
  const { isDark } = useTheme();
  const [modules, setModules] = useState<Module[]>([]);
  const [search, setSearch] = useState('');
  const [sortAZ, setSortAZ] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get('/stagiaire/modules');
      setModules(res.data.data || []);
    } catch (error) {
      console.error('Error fetching modules:', error);
      toast.error('Erreur lors du chargement des modules');
    } finally {
      setLoading(false);
    }
  };

  const filteredModules = modules
    .filter(m =>
      m.code.toLowerCase().includes(search.toLowerCase()) ||
      m.nom.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => sortAZ ? a.nom.localeCompare(b.nom) : 0);

  const formateurName = (module: Module) => {
    if (module.formateurs && module.formateurs.length > 0) {
      const formateur = module.formateurs[0];
      return formateur.user ? `${formateur.user.prenom} ${formateur.user.nom}` : 'N/A';
    }
    return 'N/A';
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#121217]' : 'bg-gray-50'}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Modules</h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            <Link to="/stagiaire" className="text-primary-600 hover:text-primary-700">Tableau de bord</Link>
            {' / '}
            <span className="text-primary-600">Académique</span>
            {' / '}
            <span>Modules</span>
          </p>
        </div>
      </div>

      <div className={`border rounded-2xl ${isDark ? 'bg-[#1a1a22] border-[#2a2a35]' : 'bg-white border-gray-200'}`}>
        <div className={`flex items-center justify-between px-6 pt-5 pb-4 border-b ${isDark ? 'border-[#2a2a35]' : 'border-gray-200'}`}>
          <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Modules</h2>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className={`flex items-center border rounded-lg px-4 py-2 w-72 transition-colors ${isDark ? 'bg-[#1e1e28] border-[#2a2a35] focus-within:border-[#5c5c6e]' : 'bg-white border-gray-300 focus-within:border-primary-500'}`}>
              <HiSearch className={`h-4 w-4 mr-3 flex-shrink-0 ${isDark ? 'text-[#5c5c6e]' : 'text-gray-400'}`} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par nom ou code..."
                className={`text-sm bg-transparent outline-none flex-1 border-none ${isDark ? 'text-gray-100 placeholder-[#5c5c6e]' : 'text-gray-900 placeholder-gray-500'}`}
              />
            </div>
            {/* Sort A-Z */}
            <button
              onClick={() => setSortAZ(v => !v)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm transition-colors ${
                sortAZ
                  ? isDark ? 'border-[#3a3a4a] text-[#9a9ab0] bg-[#1e1e28]' : 'border-blue-500 text-blue-600 bg-blue-50'
                  : isDark ? 'border-[#2a2a35] text-[#9a9ab0] hover:bg-[#1e1e28]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <HiSortAscending className="h-4 w-4" /> Sort by A-Z
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`border-b ${isDark ? 'bg-[#1e1e28] border-[#2a2a35]' : 'bg-gray-50 border-gray-200'}`}>
                <th className={`w-10 px-4 py-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  <input type="checkbox" className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                </th>
                {['Code Module', 'Nom', 'Vol. Horaire', 'Formateur'].map(col => (
                  <th key={col} className={`px-4 py-3 text-left text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    <span className="inline-flex items-center">
                      {col}
                      <span className="inline-flex flex-col ml-1 -space-y-1">
                        <HiChevronUp className={`h-3 w-3 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                        <HiChevronDown className={`h-3 w-3 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                      </span>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-gray-100'}`}>
              {loading ? (
                <tr>
                  <td colSpan={5} className={`px-4 py-8 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Chargement...
                  </td>
                </tr>
              ) : filteredModules.length === 0 ? (
                <tr>
                  <td colSpan={5} className={`px-4 py-8 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Aucun module trouvé
                  </td>
                </tr>
              ) : (
                filteredModules.map((mod) => (
                  <tr key={mod.id} className={`transition-colors ${isDark ? 'hover:bg-[#1e1e28]' : 'hover:bg-gray-50'}`}>
                    <td className="px-4 py-3.5">
                      <input type="checkbox" className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                    </td>
                    <td className={`px-4 py-3.5 text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {mod.code}
                    </td>
                    <td className={`px-4 py-3.5 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      {mod.nom}
                    </td>
                    <td className={`px-4 py-3.5 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      {mod.heures_total}h
                    </td>
                    <td className={`px-4 py-3.5 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      {formateurName(mod)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StagiaireModulesPage;
