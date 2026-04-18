import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { dropdownApi, modulesApi, gradesApi } from '../../../api/crudApi';
import { HiChevronUp, HiChevronDown, HiSearch, HiDownload } from 'react-icons/hi';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { useRolePath } from '../../../hooks/useRolePath';

interface StudentGrade {
  stagiaire_id: number;
  nom: string;
  prenom: string;
  cc1: number | null;
  cc2: number | null;
  cc3: number | null;
  efm: number | null;
  moyenne: number | null;
}

const ROWS_PER_PAGE = 10;

const ExamensPage: React.FC = () => {
  const basePath = useRolePath();
  const [filieres, setFilieres] = useState<any[]>([]);
  const [allGroups, setAllGroups] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [selectedFiliere, setSelectedFiliere] = useState('');
  const [selectedGroupe, setSelectedGroupe] = useState('');
  const [selectedModule, setSelectedModule] = useState('');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [students, setStudents] = useState<StudentGrade[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  // Load dropdown data
  useEffect(() => {
    dropdownApi.filieres().then(res => {
      if (res.data?.data) setFilieres(res.data.data);
    }).catch(() => {});
    dropdownApi.groups().then(res => {
      if (res.data?.data) setAllGroups(res.data.data);
    }).catch(() => {});
  }, []);

  // Filter groups by selected filière
  const filteredGroups = useMemo(() => {
    if (!selectedFiliere) return [];
    return allGroups.filter((g: any) => String(g.filiere_id) === selectedFiliere);
  }, [selectedFiliere, allGroups]);

  // When filière changes, reset groupe and module
  const handleFiliereChange = (val: string) => {
    setSelectedFiliere(val);
    setSelectedGroupe('');
    setSelectedModule('');
    setModules([]);
    setStudents([]);
    setPage(1);
  };

  // When groupe changes, load modules and reset module selection
  const handleGroupeChange = (val: string) => {
    setSelectedGroupe(val);
    setSelectedModule('');
    setStudents([]);
    setPage(1);

    if (val) {
      const group = allGroups.find((g: any) => String(g.id) === val);
      if (group?.filiere_id) {
        modulesApi.getAll({ filiere_id: group.filiere_id, per_page: 100 }).then(res => {
          if (res.data?.data) setModules(res.data.data);
        }).catch(() => {});
      }
    } else {
      setModules([]);
    }
  };

  const handleModuleChange = (val: string) => {
    setSelectedModule(val);
    setStudents([]);
    setPage(1);
  };

  // All 3 filters must be selected
  const allFiltersSelected = selectedFiliere && selectedGroupe && selectedModule;

  // Fetch grades when all filters selected
  const fetchGrades = useCallback(async () => {
    if (!allFiltersSelected) return;
    setLoading(true);
    try {
      const res = await gradesApi.getByGroupModule(Number(selectedGroupe), Number(selectedModule));
      if (res.data?.data) {
        setStudents(res.data.data);
      }
    } catch {
      setStudents([]);
    }
    setLoading(false);
  }, [selectedGroupe, selectedModule, allFiltersSelected]);

  useEffect(() => { fetchGrades(); }, [fetchGrades]);

  // Search filter
  const filteredStudents = useMemo(() => {
    if (!search) return students;
    const q = search.toLowerCase();
    return students.filter(s =>
      `${s.prenom} ${s.nom}`.toLowerCase().includes(q)
    );
  }, [students, search]);

  // Sort
  const sortedStudents = useMemo(() => {
    if (!sortKey) return filteredStudents;
    return [...filteredStudents].sort((a, b) => {
      let aVal: any, bVal: any;
      if (sortKey === 'stagiaire') {
        aVal = `${a.prenom} ${a.nom}`;
        bVal = `${b.prenom} ${b.nom}`;
      } else {
        aVal = (a as any)[sortKey] ?? 0;
        bVal = (b as any)[sortKey] ?? 0;
      }
      if (typeof aVal === 'string') return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [filteredStudents, sortKey, sortDir]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedStudents.length / ROWS_PER_PAGE));
  const pagedStudents = sortedStudents.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  const toggleAll = () => {
    if (selectedIds.size === pagedStudents.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(pagedStudents.map(s => s.stagiaire_id)));
  };

  const toggleOne = (id: number) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortIcon = ({ col }: { col: string }) => (
    <span className="inline-flex flex-col ml-1 -space-y-1">
      <HiChevronUp className={`h-3 w-3 ${sortKey === col && sortDir === 'asc' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-300 dark:text-gray-600'}`} />
      <HiChevronDown className={`h-3 w-3 ${sortKey === col && sortDir === 'desc' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-300 dark:text-gray-600'}`} />
    </span>
  );

  // Export ALL filtered results to Excel
  const handleExport = () => {
    if (sortedStudents.length === 0) {
      toast.error('Aucune donnée à exporter');
      return;
    }

    const filiere = filieres.find((f: any) => String(f.id) === selectedFiliere);
    const groupe = allGroups.find((g: any) => String(g.id) === selectedGroupe);
    const mod = modules.find((m: any) => String(m.id) === selectedModule);

    const rows = sortedStudents.map((s, i) => ({
      '#': i + 1,
      'Stagiaire': `${s.prenom} ${s.nom}`,
      'CC1': s.cc1 ?? '',
      'CC2': s.cc2 ?? '',
      'CC3': s.cc3 ?? '',
      'EFM': s.efm ?? '',
      'Moyenne': s.moyenne ?? '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);

    // Set column widths
    ws['!cols'] = [
      { wch: 5 },   // #
      { wch: 25 },  // Stagiaire
      { wch: 8 },   // CC1
      { wch: 8 },   // CC2
      { wch: 8 },   // CC3
      { wch: 8 },   // EFM
      { wch: 10 },  // Moyenne
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Notes');

    const fileName = `Notes_${filiere?.nom || 'Filiere'}_${groupe?.nom || 'Groupe'}_${mod?.nom || 'Module'}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success(`${sortedStudents.length} notes exportées`);
  };

  // Build pagination range
  const paginationRange = useMemo(() => {
    const range: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) range.push(i);
    } else {
      range.push(1);
      if (page > 3) range.push('...');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) range.push(i);
      if (page < totalPages - 2) range.push('...');
      range.push(totalPages);
    }
    return range;
  }, [page, totalPages]);

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Examens & notes</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          <Link to={`${basePath}/dashboard`} className="text-primary-600 dark:text-primary-400 hover:text-primary-700">Tableau de bord</Link>
          {' / '}
          <span className="text-primary-600 dark:text-primary-400">Académique</span>
          {' / '}
          <span>Examens & notes</span>
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
        {/* Card Header */}
        <div className="px-6 pt-5 pb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Examens & notes</h2>
        </div>

        {/* Filters Row */}
        <div className="flex items-center gap-4 px-6 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-300">Filières</span>
            <select
              value={selectedFiliere}
              onChange={(e) => handleFiliereChange(e.target.value)}
              className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-800 min-w-[160px]"
            >
              <option value="">Choisir filière</option>
              {filieres.map((f: any) => <option key={f.id} value={f.id}>{f.nom}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-300">Groupes</span>
            <select
              value={selectedGroupe}
              onChange={(e) => handleGroupeChange(e.target.value)}
              className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-800 min-w-[120px]"
              disabled={!selectedFiliere}
            >
              <option value="">Choisir groupe</option>
              {filteredGroups.map((g: any) => <option key={g.id} value={g.id}>{g.nom}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-300">Modules</span>
            <select
              value={selectedModule}
              onChange={(e) => handleModuleChange(e.target.value)}
              className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-800 min-w-[180px]"
              disabled={!selectedGroupe}
            >
              <option value="">Choisir module</option>
              {modules.map((m: any) => <option key={m.id} value={m.id}>{m.nom}</option>)}
            </select>
          </div>
          <div className="relative ml-auto">
            <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search"
              className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg pl-9 pr-3 py-1.5 text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-800 min-w-[160px] outline-none placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
          <button
            onClick={handleExport}
            disabled={sortedStudents.length === 0}
            className="flex items-center gap-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <HiDownload className="h-4 w-4" /> Export
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-800/60 border-y border-gray-100 dark:border-gray-700">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === pagedStudents.length && pagedStudents.length > 0}
                    onChange={toggleAll}
                    className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                  />
                </th>
                {[
                  { key: 'stagiaire', label: 'Stagiaire' },
                  { key: 'cc1', label: 'CC1' },
                  { key: 'cc2', label: 'CC2' },
                  { key: 'cc3', label: 'CC3' },
                  { key: 'efm', label: 'EFM' },
                  { key: 'moyenne', label: 'Moyenne' },
                ].map(col => (
                  <th
                    key={col.key}
                    className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer select-none"
                    onClick={() => handleSort(col.key)}
                  >
                    <span className="inline-flex items-center">
                      {col.label}
                      <SortIcon col={col.key} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {!allFiltersSelected ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-gray-400 dark:text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="h-10 w-10 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-sm">Veuillez sélectionner une filière, un groupe et un module pour afficher les notes</p>
                    </div>
                  </td>
                </tr>
              ) : loading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">Chargement...</td></tr>
              ) : pagedStudents.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">Aucune note trouvée</td></tr>
              ) : (
                pagedStudents.map((student) => (
                  <tr key={student.stagiaire_id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3.5">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(student.stagiaire_id)}
                        onChange={() => toggleOne(student.stagiaire_id)}
                        className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-900 dark:text-gray-100 font-medium">
                      {student.prenom} {student.nom}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-600 dark:text-gray-300">{student.cc1 ?? '-'}</td>
                    <td className="px-4 py-3.5 text-sm text-gray-600 dark:text-gray-300">{student.cc2 ?? '-'}</td>
                    <td className="px-4 py-3.5 text-sm text-gray-600 dark:text-gray-300">{student.cc3 ?? '-'}</td>
                    <td className="px-4 py-3.5 text-sm text-gray-600 dark:text-gray-300">{student.efm ?? '-'}</td>
                    <td className="px-4 py-3.5 text-sm font-semibold text-gray-900 dark:text-gray-100">{student.moyenne ?? '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {allFiltersSelected && sortedStudents.length > 0 && (
          <div className="flex items-center justify-end px-6 py-4 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Pre
              </button>
              {paginationRange.map((item, idx) =>
                typeof item === 'string' ? (
                  <span key={`dots-${idx}`} className="px-2 py-1.5 text-sm text-gray-400 dark:text-gray-500">
                    ....
                  </span>
                ) : (
                  <button
                    key={item}
                    onClick={() => setPage(item)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium ${
                      page === item
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {item}
                  </button>
                )
              )}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Valider Button */}
      {allFiltersSelected && sortedStudents.length > 0 && (
        <div className="flex justify-end mt-6">
          <button
            onClick={() => toast.success('Notes validées avec succès')}
            className="px-8 py-3 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            Valider les notes
          </button>
        </div>
      )}
    </div>
  );
};

export default ExamensPage;
