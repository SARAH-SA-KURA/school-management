import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../../contexts/ThemeContext';
import { HiChevronUp, HiChevronDown } from 'react-icons/hi';
import axiosInstance from '../../../utils/axios';
import toast from 'react-hot-toast';

interface Module {
  id: number;
  code: string;
  nom: string;
  heures_total: number;
  coefficient: number;
  filiere_id?: number;
  filiere: {
    id?: number;
    nom: string;
  };
  groups?: any[];
  progression?: number; // 0-100
}

type SortField = 'code' | 'nom' | 'filiere' | 'coefficient' | 'heures_total';
type SortOrder = 'asc' | 'desc';

const FormateurModulesPage: React.FC = () => {
  const { isDark } = useTheme();
  const [modules, setModules] = useState<Module[]>([]);
  const [filteredModules, setFilteredModules] = useState<Module[]>([]);
  const [filterFiliere, setFilterFiliere] = useState('');
  const [sortField, setSortField] = useState<SortField>('nom');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [loading, setLoading] = useState(true);
  const [filieres, setFilieres] = useState<any[]>([]);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchModules();
  }, []);

  useEffect(() => {
    filterAndSortModules();
  }, [modules, filterFiliere, sortField, sortOrder]);

  const fetchModules = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get('/auth/formateur');
      const formateur = res.data.data;
      const mods: Module[] = formateur?.modules ?? [];
      setModules(mods);

      // Derive the filières the formateur actually teaches — no global fetch
      const uniqueFilieres = Array.from(
        new Map(
          mods
            .filter((m: Module) => m.filiere?.id)
            .map((m: Module) => [m.filiere.id, m.filiere])
        ).values()
      );
      setFilieres(uniqueFilieres);
    } catch (error) {
      console.error('Error fetching modules:', error);
      toast.error('Erreur lors du chargement des modules');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortModules = () => {
    let result = [...modules];

    if (filterFiliere) {
      result = result.filter(m => (m.filiere_id || m.filiere?.id) === parseInt(filterFiliere));
    }

    // Sort
    result.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === 'filiere') {
        aVal = a.filiere?.nom || '';
        bVal = b.filiere?.nom || '';
      }

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    setFilteredModules(result);
    setCurrentPage(1);
  };

  const toggleSort = (field: SortField | undefined) => {
    if (!field) return;
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const paginatedModules = filteredModules.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const totalPages = Math.ceil(filteredModules.length / rowsPerPage);

  const SortIcon = ({ field }: { field: SortField }) => (
    <span className="inline-flex flex-col ml-1 -space-y-1">
      <HiChevronUp className={`h-3 w-3 ${sortField === field && sortOrder === 'asc' ? (isDark ? 'text-primary-400' : 'text-primary-600') : isDark ? 'text-gray-600' : 'text-gray-300'}`} />
      <HiChevronDown className={`h-3 w-3 ${sortField === field && sortOrder === 'desc' ? (isDark ? 'text-primary-400' : 'text-primary-600') : isDark ? 'text-gray-600' : 'text-gray-300'}`} />
    </span>
  );

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-950' : 'bg-gray-50'}`}>
      <div className="mb-6">
        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Modules</h1>
        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          <Link to="/formateur" className="text-primary-600 hover:text-primary-700">Tableau de bord</Link>
          {' / '}
          <span className="text-primary-600">Académique</span>
          {' / '}
          <span>Modules</span>
        </p>
      </div>

      <div className={`border rounded-xl ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className={`px-6 pt-5 pb-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Modules</h2>
        </div>

        <div className={`flex items-center justify-between px-6 py-3 gap-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Lignes par page</span>
            <select
              value={rowsPerPage}
              onChange={(e) => setRowsPerPage(parseInt(e.target.value))}
              className={`border rounded px-2 py-1 text-sm font-medium min-w-16 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
            >
              <option>10</option><option>25</option><option>50</option>
            </select>
          </div>

          <select
            value={filterFiliere}
            onChange={(e) => setFilterFiliere(e.target.value)}
            className={`border rounded-lg px-3 py-2 text-sm font-medium ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
          >
            <option value="">Toutes les filières</option>
            {filieres.map(f => (
              <option key={f.id} value={f.id}>{f.nom}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`border-b ${isDark ? 'bg-gray-700/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                {['Code Module', 'Nom', 'Filière', 'Vol. Horaire', 'Groupes'].map(col => {
                  const fieldMap: Record<string, SortField | undefined> = {
                    'Code Module': 'code',
                    'Nom': 'nom',
                    'Filière': 'filiere',
                    'Vol. Horaire': 'heures_total',
                  };
                  const field = fieldMap[col];

                  return (
                    <th
                      key={col}
                      className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${field ? 'cursor-pointer' : ''} ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                      onClick={() => toggleSort(field)}
                    >
                      <span className="inline-flex items-center">
                        {col}
                        {field && <SortIcon field={field} />}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-100'}`}>
              {loading ? (
                <tr>
                  <td colSpan={5} className={`px-6 py-12 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Chargement...
                  </td>
                </tr>
              ) : paginatedModules.length === 0 ? (
                <tr>
                  <td colSpan={5} className={`px-6 py-12 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Aucun module trouvé
                  </td>
                </tr>
              ) : (
                paginatedModules.map((mod, i) => (
                  <tr key={i} className={`transition-colors ${isDark ? 'hover:bg-gray-700/30' : 'hover:bg-gray-50'}`}>
                    <td className={`px-6 py-4 text-sm font-medium ${isDark ? 'text-primary-400' : 'text-primary-600'}`}>
                      {mod.code}
                    </td>
                    <td className={`px-6 py-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{mod.nom}</td>
                    <td className={`px-6 py-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{mod.filiere?.nom || '-'}</td>
                    <td className={`px-6 py-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{mod.heures_total}h</td>
                    <td className={`px-6 py-4 text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      {mod.groups?.map((g: any) => g.nom).join(', ') || 'Non assigné'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className={`flex items-center justify-between px-6 py-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
          <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Affichage {paginatedModules.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1} à {Math.min(currentPage * rowsPerPage, filteredModules.length)} sur {filteredModules.length}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                currentPage === 1
                  ? isDark ? 'text-gray-600 cursor-not-allowed' : 'text-gray-300 cursor-not-allowed'
                  : isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Précédent
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  currentPage === page
                    ? 'bg-primary-600 text-white'
                    : isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                currentPage === totalPages
                  ? isDark ? 'text-gray-600 cursor-not-allowed' : 'text-gray-300 cursor-not-allowed'
                  : isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Suivant
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};

export default FormateurModulesPage;
