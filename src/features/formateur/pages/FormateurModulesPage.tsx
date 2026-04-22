import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../hooks/useAuth';
import { HiSortAscending, HiChevronUp, HiChevronDown, HiSearch, HiDownload } from 'react-icons/hi';
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
  const { user } = useAuth();
  const [modules, setModules] = useState<Module[]>([]);
  const [filteredModules, setFilteredModules] = useState<Module[]>([]);
  const [search, setSearch] = useState('');
  const [filterFiliere, setFilterFiliere] = useState('');
  const [sortField, setSortField] = useState<SortField>('nom');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [loading, setLoading] = useState(true);
  const [filieres, setFilieres] = useState<any[]>([]);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const template = 'Code Module,Nom,Filière,Vol. Horaire,Groupes\nDEV-101,Développement Web Frontend,Informatique,40,DEV-101;DEV-102\nDEV-102,Développement Web Backend,Informatique,45,DEV-101;DEV-103\nBDD-101,Bases de Données,Informatique,35,DEV-102';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modules_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success('Modèle téléchargé');
  };

  const parseCSVData = (csvText: string) => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      toast.error('Le fichier doit contenir au moins un en-tête et une ligne de données');
      return [];
    }

    // Parse header line - handle quoted values
    const headerLine = lines[0];
    let headers: string[] = [];

    if (headerLine.includes('"')) {
      // CSV with quoted fields
      headers = headerLine.split(',').map(h =>
        h.trim().toLowerCase().replace(/^"|"$/g, '')
      );
    } else {
      // Simple CSV
      headers = headerLine.split(',').map(h => h.trim().toLowerCase());
    }

    console.log('Parsed headers:', headers);

    // Map possible header variations to standard names
    const headerMap: Record<string, number> = {};

    // Find column indices with flexible matching
    headers.forEach((header, idx) => {
      if (header.includes('code')) headerMap['code'] = idx;
      else if (header.includes('nom')) headerMap['nom'] = idx;
      else if (header.includes('filière') || header.includes('filiere')) headerMap['filière'] = idx;
      else if (header.includes('horaire') || header.includes('heure') || header.includes('vol')) headerMap['horaire'] = idx;
      else if (header.includes('groupe') || header.includes('group')) headerMap['groupe'] = idx;
    });

    console.log('Header map:', headerMap);

    // Check if at least some fields are found
    if (Object.keys(headerMap).length === 0) {
      toast.error(`En-têtes attendus: Code Module, Nom, Filière, Vol. Horaire, Groupes`);
      return [];
    }

    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Parse CSV line - handle quoted values
      let values: string[] = [];
      if (line.includes('"')) {
        // Split on comma but respect quoted fields
        const parts = line.split(',');
        let current = '';
        let inQuotes = false;

        parts.forEach(part => {
          if (part.includes('"')) {
            if (inQuotes) {
              current += ',' + part;
              inQuotes = false;
            } else {
              current = part;
              inQuotes = true;
            }
          } else {
            current += ',' + part;
          }

          if (!inQuotes && current) {
            values.push(current.replace(/^"|"$/g, '').trim());
            current = '';
          }
        });
      } else {
        values = line.split(',').map(v => v.trim());
      }

      const codeIdx = headerMap['code'] ?? 0;
      if (values[codeIdx]) {
        data.push({
          code: values[headerMap['code'] ?? 0] || '',
          nom: values[headerMap['nom'] ?? 1] || '',
          filiere: values[headerMap['filière'] ?? 2] || '',
          heures_total: parseInt(values[headerMap['horaire'] ?? 3]) || 0,
          groups: values[headerMap['groupe'] ?? 4] || ''
        });
      }
    }

    console.log('Parsed data:', data);
    return data;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Veuillez sélectionner un fichier CSV ou Excel');
      return;
    }

    setImportFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const preview = parseCSVData(text);
      if (preview.length > 0) {
        setImportPreview(preview);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    console.log('handleImport called');
    toast.loading('Importation en cours...');

    if (importPreview.length === 0) {
      toast.error('Aucune donnée à importer');
      return;
    }

    try {
      setIsImporting(true);
      console.log('Starting import with', importPreview.length, 'modules');

      // For now, just add to local modules to show it works
      // In production, this would call the API
      const newModules = importPreview.map((mod, idx) => ({
        id: Math.random() * 10000,
        code: mod.code,
        nom: mod.nom,
        filiere: {
          id: filieres.find(f => f.nom.toLowerCase() === (mod.filiere || '').toLowerCase())?.id || 1,
          nom: mod.filiere || 'Informatique'
        },
        heures_total: mod.heures_total || 0,
        coefficient: 3,
        groups: mod.groups ? mod.groups.split(';').map((g: string) => ({ id: idx, nom: g.trim() })) : []
      }));

      console.log('Modules to import:', newModules);

      // Add to existing modules (without API call for now)
      setModules([...modules, ...newModules]);

      toast.dismiss();
      toast.success(`${importPreview.length} module(s) importé(s) avec succès`);

      // Close modal and reset
      setTimeout(() => {
        setImportModalOpen(false);
        setImportFile(null);
        setImportPreview([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }, 500);

    } catch (error) {
      console.error('Import error:', error);
      toast.dismiss();
      toast.error('Erreur lors de l\'importation');
    } finally {
      setIsImporting(false);
    }
  };

  const exportToExcel = () => {
    const headers = ['Code Module', 'Nom', 'Filière', 'Vol. Horaire', 'Groupes'];
    const data = filteredModules.map(mod => [
      mod.code,
      mod.nom,
      mod.filiere?.nom || '-',
      `${mod.heures_total}h`,
      mod.groups?.map((g: any) => g.nom).join(', ') || '-'
    ]);

    // Create HTML table format that Excel recognizes
    let htmlContent = `
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Calibri, Arial, sans-serif; }
            table { border-collapse: collapse; width: 100%; }
            th {
              background-color: #2563eb;
              color: white;
              padding: 12px;
              border: 1px solid #1e40af;
              font-weight: bold;
              text-align: left;
            }
            td {
              padding: 10px;
              border: 1px solid #d1d5db;
            }
            tr:nth-child(even) {
              background-color: #f9fafb;
            }
            tr:hover {
              background-color: #eff6ff;
            }
          </style>
        </head>
        <body>
          <h2 style="color: #1f2937; margin-bottom: 20px;">Modules</h2>
          <table>
            <thead>
              <tr>
                ${headers.map(h => `<th>${h}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${data.map(row => `
                <tr>
                  ${row.map(cell => `<td>${cell}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'modules.xls');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Export Excel téléchargé');
  };

  useEffect(() => {
    fetchModules();
  }, []);

  useEffect(() => {
    filterAndSortModules();
  }, [modules, search, filterFiliere, sortField, sortOrder]);

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

    // Filter by search query
    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter(m =>
        m.code.toLowerCase().includes(query) ||
        m.nom.toLowerCase().includes(query) ||
        (m.filiere?.nom || '').toLowerCase().includes(query)
      );
    }

    // Filter by filiere
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Modules</h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            <Link to="/formateur" className="text-primary-600 hover:text-primary-700">Tableau de bord</Link>
            {' / '}
            <span className="text-primary-600">Académique</span>
            {' / '}
            <span>Modules</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportToExcel}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
              isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}>
            <HiDownload className="h-4 w-4" /> Export Excel
          </button>
        </div>
      </div>

      <div className={`border rounded-xl ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className={`flex items-center justify-between px-6 pt-5 pb-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Modules</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (sortField === 'nom') {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortField('nom');
                  setSortOrder('asc');
                }
              }}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm transition-colors ${
                sortField === 'nom' && isDark ? 'bg-gray-700 border-primary-600 text-primary-400' : sortField === 'nom' ? 'bg-blue-50 border-primary-500 text-primary-600' : isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>
              <HiSortAscending className="h-4 w-4" /> Sort by A-Z {sortField === 'nom' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
          </div>
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

          <div className="flex items-center gap-3">
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

            <div className={`flex items-center border rounded-lg px-4 py-2 w-80 transition-colors ${isDark ? 'bg-gray-700 border-gray-600 focus-within:border-primary-500' : 'bg-white border-gray-300 focus-within:border-primary-500'}`}>
              <HiSearch className={`h-4 w-4 mr-3 flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par nom ou code..."
                className={`text-sm bg-transparent outline-none flex-1 placeholder-opacity-70 border-none ${isDark ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-500'}`}
              />
            </div>
          </div>
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
