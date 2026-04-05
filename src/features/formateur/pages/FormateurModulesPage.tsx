import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../hooks/useAuth';
import { HiFilter, HiSortAscending, HiChevronUp, HiChevronDown, HiSearch, HiDownload, HiUpload } from 'react-icons/hi';
import axiosInstance from '../../../utils/axios';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(event.target as Node)) {
        setExportDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const exportToCSV = () => {
    const headers = ['Code Module', 'Nom', 'Filière', 'Vol. Horaire', 'Groupes'];
    const data = filteredModules.map(mod => [
      mod.code,
      mod.nom,
      mod.filiere?.nom || '-',
      mod.heures_total,
      mod.groups?.map((g: any) => g.nom).join(', ') || '-'
    ]);

    const csvContent = [
      headers.join(','),
      ...data.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modules.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    setExportDropdownOpen(false);
    toast.success('Modules exported as CSV');
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
    setExportDropdownOpen(false);
    toast.success('Modules exported with professional formatting');
  };

  const exportToPDF = () => {
    try {
      if (!filteredModules || filteredModules.length === 0) {
        toast.error('Aucun module à exporter');
        return;
      }

      const doc = new jsPDF();
      const headers = ['Code Module', 'Nom', 'Filière', 'Vol. Horaire', 'Groupes'];
      const data = filteredModules.map(mod => [
        mod.code || '',
        mod.nom || '',
        mod.filiere?.nom || '-',
        `${mod.heures_total || 0}h`,
        mod.groups?.map((g: any) => g.nom).join(', ') || '-'
      ]);

      // Add title
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(37, 99, 235);
      doc.text('Modules', 14, 15);

      // Add date
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(107, 114, 128);
      doc.text(`Export généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, 22);

      // Use autoTable with proper syntax
      try {
        autoTable(doc, {
          head: [headers],
          body: data,
          startY: 30,
          theme: 'grid',
          headStyles: {
            fillColor: [37, 99, 235],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9,
            cellPadding: 3,
            halign: 'left'
          },
          bodyStyles: {
            textColor: [31, 41, 55],
            fontSize: 8,
            cellPadding: 2
          },
          alternateRowStyles: {
            fillColor: [249, 250, 251]
          },
          columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 45 },
            2: { cellWidth: 28 },
            3: { cellWidth: 20 },
            4: { cellWidth: 40 }
          },
          margin: { top: 30, right: 14, bottom: 20, left: 14 }
        });
      } catch (tableError) {
        console.warn('autoTable error, using fallback:', tableError);
        // Fallback: manual table creation
        let yPos = 30;
        const pageHeight = doc.internal.pageSize.getHeight();
        const colWidths = [25, 45, 28, 20, 40];
        const rowHeight = 7;

        // Draw header
        doc.setFillColor(37, 99, 235);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);

        let xPos = 14;
        headers.forEach((header, i) => {
          doc.rect(xPos, yPos - 5, colWidths[i], rowHeight, 'F');
          doc.text(header, xPos + 2, yPos, { maxWidth: colWidths[i] - 2 });
          xPos += colWidths[i];
        });

        yPos += rowHeight;

        // Draw rows
        doc.setTextColor(31, 41, 55);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);

        data.forEach((row, rowIndex) => {
          if (yPos > pageHeight - 20) {
            doc.addPage();
            yPos = 20;
          }

          xPos = 14;
          // Alternate row color
          if (rowIndex % 2 === 0) {
            doc.setFillColor(249, 250, 251);
            doc.rect(14, yPos - 5, 158, rowHeight, 'F');
          }

          row.forEach((cell, colIndex) => {
            doc.text(String(cell), xPos + 2, yPos, { maxWidth: colWidths[colIndex] - 2 });
            xPos += colWidths[colIndex];
          });

          yPos += rowHeight;
        });
      }

      // Save PDF
      doc.save('modules.pdf');
      setExportDropdownOpen(false);
      toast.success('PDF téléchargé avec succès');
    } catch (error) {
      console.error('PDF Export Error:', error);
      console.error('Error message:', (error as Error)?.message);
      toast.error('Erreur lors de la génération du PDF');
    }
  };

  useEffect(() => {
    fetchModules();
    fetchFilieres();
  }, []);

  useEffect(() => {
    filterAndSortModules();
  }, [modules, search, filterFiliere, sortField, sortOrder]);

  const fetchModules = async () => {
    try {
      setLoading(true);

      // Get current formateur's modules
      const formateurRes = await axiosInstance.get('/auth/formateur');
      const currentFormateur = formateurRes.data.data;

      if (currentFormateur) {
        // Demo modules list for different filieres
        const demoModules = [
          { id: 1, code: 'DEV-101', nom: 'Développement Web Frontend', heures_total: 40, coefficient: 3, filiere: { id: 1, nom: 'Informatique' }, groups: [{ id: 1, nom: 'DEV-101' }, { id: 2, nom: 'DEV-102' }] },
          { id: 2, code: 'DEV-102', nom: 'Développement Web Backend', heures_total: 45, coefficient: 3, filiere: { id: 1, nom: 'Informatique' }, groups: [{ id: 1, nom: 'DEV-101' }, { id: 3, nom: 'DEV-103' }] },
          { id: 3, code: 'BDD-101', nom: 'Bases de Données', heures_total: 35, coefficient: 2, filiere: { id: 1, nom: 'Informatique' }, groups: [{ id: 2, nom: 'DEV-102' }] },
          { id: 4, code: 'SYS-101', nom: 'Systèmes d\'Exploitation', heures_total: 30, coefficient: 2, filiere: { id: 1, nom: 'Informatique' }, groups: [{ id: 3, nom: 'DEV-103' }, { id: 4, nom: 'DEV-104' }] },
          { id: 5, code: 'RES-101', nom: 'Réseaux et Sécurité', heures_total: 40, coefficient: 3, filiere: { id: 2, nom: 'Génie Civil' }, groups: [{ id: 1, nom: 'DEV-101' }, { id: 4, nom: 'DEV-104' }] },
          { id: 6, code: 'ALG-101', nom: 'Algorithmes et Structures', heures_total: 45, coefficient: 3, filiere: { id: 1, nom: 'Informatique' }, groups: [{ id: 2, nom: 'DEV-102' }, { id: 3, nom: 'DEV-103' }] },
          { id: 7, code: 'WEB-201', nom: 'Frameworks Web Modernes', heures_total: 50, coefficient: 4, filiere: { id: 2, nom: 'Génie Civil' }, groups: [{ id: 1, nom: 'DEV-101' }, { id: 2, nom: 'DEV-102' }, { id: 3, nom: 'DEV-103' }] },
          { id: 8, code: 'MOB-101', nom: 'Développement Mobile', heures_total: 40, coefficient: 3, filiere: { id: 1, nom: 'Informatique' }, groups: [{ id: 4, nom: 'DEV-104' }] },
          { id: 9, code: 'API-101', nom: 'Architecture API REST', heures_total: 35, coefficient: 2, filiere: { id: 3, nom: 'Génie Mécanique' }, groups: [{ id: 1, nom: 'DEV-101' }, { id: 3, nom: 'DEV-103' }] },
          { id: 10, code: 'DEV-201', nom: 'Programmation Avancée', heures_total: 42, coefficient: 3, filiere: { id: 1, nom: 'Informatique' }, groups: [{ id: 2, nom: 'DEV-102' }, { id: 4, nom: 'DEV-104' }] },
          { id: 11, code: 'ML-101', nom: 'Machine Learning Intro', heures_total: 45, coefficient: 3, filiere: { id: 3, nom: 'Génie Mécanique' }, groups: [{ id: 1, nom: 'DEV-101' }] },
          { id: 12, code: 'CLOUD-101', nom: 'Cloud Computing', heures_total: 38, coefficient: 3, filiere: { id: 2, nom: 'Génie Civil' }, groups: [{ id: 3, nom: 'DEV-103' }, { id: 4, nom: 'DEV-104' }] },
        ];

        // Combine API modules with demo modules
        const apiModules = (currentFormateur.modules && currentFormateur.modules.length > 0)
          ? currentFormateur.modules
          : [];

        // Combine all modules and add groups data if missing
        const allModules = [...apiModules, ...demoModules];
        const modulesWithData = allModules.map((mod: any, idx: number) => ({
          ...mod,
          id: mod.id || idx + 100,
          groups: mod.groups && mod.groups.length > 0 ? mod.groups : [
            { id: 1, nom: 'DEV-101', stagiaires_count: 25 },
            { id: 2, nom: 'DEV-102', stagiaires_count: 22 }
          ],
        }));
        setModules(modulesWithData);
      }
    } catch (error) {
      console.error('Error fetching modules:', error);
      toast.error('Erreur lors du chargement des modules');
    } finally {
      setLoading(false);
    }
  };

  const fetchFilieres = async () => {
    try {
      const res = await axiosInstance.get('/filieres');
      setFilieres(res.data.data);
    } catch (error) {
      console.error('Error fetching filieres:', error);
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
          <div className="relative" ref={exportRef}>
            <button
              onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
                isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}>
              <HiDownload className="h-4 w-4" /> Export
            </button>
            {exportDropdownOpen && (
              <div className={`absolute right-0 mt-2 w-56 rounded-2xl shadow-xl border z-10 overflow-hidden ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className={`px-4 py-3 border-b ${isDark ? 'border-gray-700 bg-gray-800/30' : 'border-gray-100 bg-gray-50'}`}>
                  <p className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Format d'export</p>
                </div>
                <button
                  onClick={exportToExcel}
                  className={`w-full text-left px-4 py-3 text-sm font-medium transition-all duration-150 ${isDark ? 'hover:bg-primary-900/20 text-gray-300' : 'hover:bg-primary-50 text-gray-700'}`}
                >
                  <div className="flex items-center justify-between">
                    <span>Excel (.xlsx)</span>
                    <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>→</span>
                  </div>
                </button>
                <button
                  onClick={exportToCSV}
                  className={`w-full text-left px-4 py-3 text-sm font-medium border-t transition-all duration-150 ${isDark ? 'border-gray-700 hover:bg-primary-900/20 text-gray-300' : 'border-gray-100 hover:bg-primary-50 text-gray-700'}`}
                >
                  <div className="flex items-center justify-between">
                    <span>CSV</span>
                    <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>→</span>
                  </div>
                </button>
                <button
                  onClick={exportToPDF}
                  className={`w-full text-left px-4 py-3 text-sm font-medium border-t transition-all duration-150 ${isDark ? 'border-gray-700 hover:bg-primary-900/20 text-gray-300' : 'border-gray-100 hover:bg-primary-50 text-gray-700'}`}
                >
                  <div className="flex items-center justify-between">
                    <span>PDF</span>
                    <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>→</span>
                  </div>
                </button>
              </div>
            )}
          </div>
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
