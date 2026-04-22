import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { dropdownApi, gradesApi } from '../../../api/crudApi';
import {
  HiChevronUp, HiChevronDown, HiSearch, HiDownload, HiX, HiArrowLeft,
  HiCheckCircle, HiBookOpen,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { useRolePath } from '../../../hooks/useRolePath';
import { useAuth } from '../../../hooks/useAuth';
import { Button, ConfirmDialog } from '../../../components/ui';

interface TeacherLite {
  id: number;
  nom: string;
  prenom: string;
}

interface ModuleStatus {
  id: number;
  code?: string;
  nom: string;
  semestre?: number;
  coefficient?: number;
  formateurs: TeacherLite[];
  students_with_notes: number;
  total_stagiaires: number;
  exams_count: number;
  is_validated: boolean;
  validated_at: string | null;
  validated_by: { nom: string; prenom: string } | null;
}

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

const formatValidatedAt = (iso: string | null): string => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch { return iso; }
};

const ExamensPage: React.FC = () => {
  const basePath = useRolePath();
  const { user } = useAuth();
  const canValidate = user?.role === 'directeur';

  // ── Dropdowns ──
  const [filieres, setFilieres] = useState<any[]>([]);
  const [allGroups, setAllGroups] = useState<any[]>([]);

  useEffect(() => {
    dropdownApi.filieres().then(r => setFilieres(r.data?.data || [])).catch(() => {});
    dropdownApi.groups().then(r => setAllGroups(r.data?.data || [])).catch(() => {});
  }, []);

  // ── Filter state ──
  const [selectedFiliere, setSelectedFiliere] = useState('');
  const [selectedGroupe, setSelectedGroupe] = useState('');

  const filteredGroups = useMemo(() => {
    if (!selectedFiliere) return [];
    return allGroups.filter((g: any) => String(g.filiere_id) === selectedFiliere);
  }, [selectedFiliere, allGroups]);

  const handleFiliereChange = (val: string) => {
    setSelectedFiliere(val);
    setSelectedGroupe('');
    setModulesStatus([]);
    setDrillModule(null);
  };

  const handleGroupeChange = (val: string) => {
    setSelectedGroupe(val);
    setDrillModule(null);
  };

  const resetFilters = () => {
    setSelectedFiliere('');
    setSelectedGroupe('');
    setModulesStatus([]);
    setDrillModule(null);
  };

  // ── Modules-status list (level 1) ──
  const [modulesStatus, setModulesStatus] = useState<ModuleStatus[]>([]);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [groupTotalStagiaires, setGroupTotalStagiaires] = useState(0);
  const [moduleSearch, setModuleSearch] = useState('');

  const fetchModulesStatus = useCallback(async () => {
    if (!selectedGroupe) { setModulesStatus([]); return; }
    setModulesLoading(true);
    try {
      const res = await gradesApi.groupModulesStatus(Number(selectedGroupe));
      const payload = res.data?.data || {};
      setModulesStatus(payload.modules || []);
      setGroupTotalStagiaires(payload.total_stagiaires || 0);
    } catch {
      toast.error('Erreur de chargement des modules');
    }
    setModulesLoading(false);
  }, [selectedGroupe]);

  useEffect(() => { fetchModulesStatus(); }, [fetchModulesStatus]);

  const filteredModules = useMemo(() => {
    if (!moduleSearch.trim()) return modulesStatus;
    const q = moduleSearch.toLowerCase();
    return modulesStatus.filter(m =>
      m.nom.toLowerCase().includes(q) ||
      (m.code || '').toLowerCase().includes(q) ||
      m.formateurs.some(f => `${f.prenom} ${f.nom}`.toLowerCase().includes(q))
    );
  }, [modulesStatus, moduleSearch]);

  // ── Drill-down (level 2) ──
  const [drillModule, setDrillModule] = useState<ModuleStatus | null>(null);
  const [students, setStudents] = useState<StudentGrade[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [validating, setValidating] = useState(false);
  const [confirmUnvalidateOpen, setConfirmUnvalidateOpen] = useState(false);
  const [validatingRowIds, setValidatingRowIds] = useState<Set<number>>(new Set());

  const openDrill = async (mod: ModuleStatus) => {
    setDrillModule(mod);
    setStudents([]);
    setSearch('');
    setPage(1);
    setSelectedIds(new Set());
    setDrillLoading(true);
    try {
      const res = await gradesApi.getByGroupModule(Number(selectedGroupe), mod.id);
      setStudents(res.data?.data || []);
    } catch {
      toast.error('Erreur de chargement des notes');
    }
    setDrillLoading(false);
  };

  const backToList = () => {
    setDrillModule(null);
    setStudents([]);
  };

  const handleValidate = async () => {
    if (!drillModule || !selectedGroupe) return;
    setValidating(true);
    try {
      await gradesApi.validate(Number(selectedGroupe), drillModule.id);
      toast.success('Notes validées');
      // Refresh: status + the local drillModule flag
      await fetchModulesStatus();
      setDrillModule(prev => prev ? { ...prev, is_validated: true } : prev);
    } catch {
      toast.error('Erreur lors de la validation');
    }
    setValidating(false);
  };

  // Inline validation from the modules list — one click, no drill-in.
  const handleValidateRow = async (m: ModuleStatus) => {
    if (!selectedGroupe) return;
    setValidatingRowIds(prev => { const s = new Set(prev); s.add(m.id); return s; });
    try {
      await gradesApi.validate(Number(selectedGroupe), m.id);
      toast.success('Notes validées');
      await fetchModulesStatus();
    } catch {
      toast.error('Erreur lors de la validation');
    }
    setValidatingRowIds(prev => { const s = new Set(prev); s.delete(m.id); return s; });
  };

  const handleUnvalidate = async () => {
    if (!drillModule || !selectedGroupe) return;
    setValidating(true);
    try {
      await gradesApi.unvalidate(Number(selectedGroupe), drillModule.id);
      toast.success('Validation retirée');
      await fetchModulesStatus();
      setDrillModule(prev => prev ? {
        ...prev, is_validated: false, validated_at: null, validated_by: null,
      } : prev);
    } catch {
      toast.error('Erreur lors du retrait de la validation');
    }
    setValidating(false);
    setConfirmUnvalidateOpen(false);
  };

  // ── Grades table (inside drill-down) ──
  const filteredStudents = useMemo(() => {
    if (!search) return students;
    const q = search.toLowerCase();
    return students.filter(s => `${s.prenom} ${s.nom}`.toLowerCase().includes(q));
  }, [students, search]);

  const sortedStudents = useMemo(() => {
    if (!sortKey) return filteredStudents;
    return [...filteredStudents].sort((a, b) => {
      let aVal: any, bVal: any;
      if (sortKey === 'stagiaire') { aVal = `${a.prenom} ${a.nom}`; bVal = `${b.prenom} ${b.nom}`; }
      else { aVal = (a as any)[sortKey] ?? 0; bVal = (b as any)[sortKey] ?? 0; }
      if (typeof aVal === 'string') return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [filteredStudents, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedStudents.length / ROWS_PER_PAGE));
  const pagedStudents = sortedStudents.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  const toggleAll = () => {
    if (selectedIds.size === pagedStudents.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(pagedStudents.map(s => s.stagiaire_id)));
  };
  const toggleOne = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
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

  const handleExport = () => {
    if (sortedStudents.length === 0) { toast.error('Aucune donnée à exporter'); return; }
    const filiere = filieres.find((f: any) => String(f.id) === selectedFiliere);
    const groupe = allGroups.find((g: any) => String(g.id) === selectedGroupe);
    const rows = sortedStudents.map((s, i) => ({
      '#': i + 1,
      'Stagiaire': `${s.prenom} ${s.nom}`,
      'CC1': s.cc1 ?? '', 'CC2': s.cc2 ?? '', 'CC3': s.cc3 ?? '',
      'EFM': s.efm ?? '', 'Moyenne': s.moyenne ?? '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 5 }, { wch: 25 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Notes');
    XLSX.writeFile(wb, `Notes_${filiere?.nom || 'Filiere'}_${groupe?.nom || 'Groupe'}_${drillModule?.nom || 'Module'}.xlsx`);
    toast.success(`${sortedStudents.length} notes exportées`);
  };

  const paginationRange = useMemo(() => {
    const range: (number | string)[] = [];
    if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) range.push(i); }
    else {
      range.push(1);
      if (page > 3) range.push('...');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) range.push(i);
      if (page < totalPages - 2) range.push('...');
      range.push(totalPages);
    }
    return range;
  }, [page, totalPages]);

  // ── Status badges for a module row ──
  const renderEntryBadge = (m: ModuleStatus) => {
    const { students_with_notes: done, total_stagiaires: total } = m;
    if (total === 0) {
      return <span className="text-xs text-gray-400 dark:text-gray-500">Aucun stagiaire</span>;
    }
    const pct = Math.round((done / total) * 100);
    const cls = done === 0
      ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600'
      : done < total
        ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
        : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800';
    const label = done === 0 ? 'Non entrées' : done < total ? `En cours (${pct}%)` : 'Complètes';
    return (
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
          {label}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {done}/{total}
        </span>
      </div>
    );
  };

  const renderValidationBadge = (m: ModuleStatus, opts?: { actionable?: boolean }) => {
    const actionable = opts?.actionable ?? true;
    if (m.is_validated) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600">
          <HiCheckCircle className="h-3.5 w-3.5" />
          Validée
        </span>
      );
    }
    if (!actionable) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600">
          Non validée
        </span>
      );
    }
    const busy = validatingRowIds.has(m.id);
    return (
      <button
        type="button"
        disabled={busy}
        onClick={(e) => { e.stopPropagation(); handleValidateRow(m); }}
        className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white transition-colors shadow-sm"
        title="Valider les notes de ce module"
      >
        {busy ? 'Validation…' : 'Valider'}
      </button>
    );
  };

  const renderTeachers = (teachers: TeacherLite[]) => {
    if (teachers.length === 0) {
      return <span className="text-xs italic text-gray-400 dark:text-gray-500">Non assigné</span>;
    }
    if (teachers.length === 1) {
      const t = teachers[0];
      return <span className="text-sm text-gray-700 dark:text-gray-300">{t.prenom} {t.nom}</span>;
    }
    return (
      <div className="flex flex-col gap-0.5">
        {teachers.map(t => (
          <span key={t.id} className="text-sm text-gray-700 dark:text-gray-300">{t.prenom} {t.nom}</span>
        ))}
      </div>
    );
  };

  const filiereObj = filieres.find((f: any) => String(f.id) === selectedFiliere);
  const groupObj = allGroups.find((g: any) => String(g.id) === selectedGroupe);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Notes</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          <Link to={`${basePath}/dashboard`} className="text-primary-600 dark:text-primary-400 hover:text-primary-700">Tableau de bord</Link>
          {' / '}
          <span className="text-primary-600 dark:text-primary-400">Académique</span>
          {' / '}
          <span>Notes</span>
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 italic">
          La planification des examens est gérée par les formateurs dans leur espace dédié.
        </p>
      </div>

      {/* ══════════════════════ FILTER BAR ══════════════════════ */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-300">Filière</span>
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
            <span className="text-sm text-gray-600 dark:text-gray-300">Groupe</span>
            <select
              value={selectedGroupe}
              onChange={(e) => handleGroupeChange(e.target.value)}
              className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-800 min-w-[140px] disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={!selectedFiliere}
            >
              <option value="">
                {!selectedFiliere ? 'Filière requise' : filteredGroups.length === 0 ? 'Aucun groupe' : 'Choisir groupe'}
              </option>
              {filteredGroups.map((g: any) => <option key={g.id} value={g.id}>{g.nom}</option>)}
            </select>
          </div>
          {(selectedFiliere || selectedGroupe) && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 px-2 py-1"
            >
              <HiX className="h-3.5 w-3.5" /> Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* ══════════════════════ EMPTY STATE ══════════════════════ */}
      {!selectedGroupe && (
        <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-12 text-center">
          <HiBookOpen className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Sélectionnez une filière et un groupe pour afficher les modules et l'état de leurs notes.
          </p>
        </div>
      )}

      {/* ══════════════════════ MODULES LIST (level 1) ══════════════════════ */}
      {selectedGroupe && !drillModule && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
          <div className="px-6 pt-5 pb-3 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Modules de {groupObj?.nom || 'ce groupe'}
                {filiereObj && <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">· {filiereObj.nom}</span>}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {modulesLoading ? '...' : `${modulesStatus.length} module(s) · ${groupTotalStagiaires} stagiaire(s) actif(s) dans le groupe`}
              </p>
            </div>
            <div className="relative">
              <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                value={moduleSearch}
                onChange={e => setModuleSearch(e.target.value)}
                placeholder="Rechercher module ou formateur"
                className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg pl-9 pr-3 py-1.5 text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-800 min-w-[240px] outline-none placeholder-gray-400"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-gray-800/60 border-y border-gray-100 dark:border-gray-700">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Module</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Formateur</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Saisie des notes</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Validation</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {modulesLoading ? (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">Chargement...</td></tr>
                ) : filteredModules.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">
                    {moduleSearch ? 'Aucun module ne correspond à la recherche' : 'Aucun module dans ce groupe'}
                  </td></tr>
                ) : filteredModules.map(m => (
                  <tr
                    key={m.id}
                    onDoubleClick={() => openDrill(m)}
                    className="hover:bg-gray-50/50 dark:hover:bg-gray-700/40 cursor-pointer"
                    title="Double-cliquer pour voir les notes"
                  >
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{m.nom}</div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {m.code && <span className="font-mono">{m.code}</span>}
                        {m.semestre && <span className="ml-2">· S{m.semestre}</span>}
                        {m.coefficient != null && <span className="ml-2">· Coeff {m.coefficient}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">{renderTeachers(m.formateurs)}</td>
                    <td className="px-4 py-3">{renderEntryBadge(m)}</td>
                    <td className="px-4 py-3">
                      {renderValidationBadge(m)}
                      {m.is_validated && m.validated_at && (
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                          {formatValidatedAt(m.validated_at)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); openDrill(m); }}
                        className="text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium"
                      >
                        Voir notes →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════ GRADES DRILL-DOWN (level 2) ══════════════════════ */}
      {drillModule && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
          <div className="px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-700">
            <button
              onClick={backToList}
              className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 mb-3"
            >
              <HiArrowLeft className="h-4 w-4" /> Retour à la liste des modules
            </button>
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {drillModule.nom}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {filiereObj?.nom} · {groupObj?.nom}
                  {drillModule.formateurs.length > 0 && (
                    <span className="ml-2">
                      · Formateur : {drillModule.formateurs.map(f => `${f.prenom} ${f.nom}`).join(', ')}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {renderValidationBadge(drillModule, { actionable: false })}
                {drillModule.is_validated && drillModule.validated_at && (
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                    {formatValidatedAt(drillModule.validated_at)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 px-6 py-3 flex-wrap">
            <div className="relative">
              <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Rechercher un stagiaire"
                className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg pl-9 pr-3 py-1.5 text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-800 min-w-[220px] outline-none placeholder-gray-400"
              />
            </div>
            <div className="ml-auto">
              <button
                onClick={handleExport}
                disabled={sortedStudents.length === 0}
                className="flex items-center gap-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <HiDownload className="h-4 w-4" /> Export Excel
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-gray-800/60 border-y border-gray-100 dark:border-gray-700">
                  <th className="w-10 px-4 py-3">
                    <input type="checkbox" checked={selectedIds.size === pagedStudents.length && pagedStudents.length > 0} onChange={toggleAll}
                      className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500" />
                  </th>
                  {[
                    { key: 'stagiaire', label: 'Stagiaire' },
                    { key: 'cc1', label: 'CC1' }, { key: 'cc2', label: 'CC2' }, { key: 'cc3', label: 'CC3' },
                    { key: 'efm', label: 'EFM' }, { key: 'moyenne', label: 'Moyenne' },
                  ].map(col => (
                    <th key={col.key} className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer select-none" onClick={() => handleSort(col.key)}>
                      <span className="inline-flex items-center">{col.label}<SortIcon col={col.key} /></span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {drillLoading ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">Chargement des notes...</td></tr>
                ) : pagedStudents.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">
                    {students.length === 0 ? 'Aucune note saisie pour ce module' : 'Aucun résultat pour cette recherche'}
                  </td></tr>
                ) : pagedStudents.map((s) => (
                  <tr key={s.stagiaire_id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3.5"><input type="checkbox" checked={selectedIds.has(s.stagiaire_id)} onChange={() => toggleOne(s.stagiaire_id)} className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500" /></td>
                    <td className="px-4 py-3.5 text-sm text-gray-900 dark:text-gray-100 font-medium">{s.prenom} {s.nom}</td>
                    <td className="px-4 py-3.5 text-sm text-gray-600 dark:text-gray-300">{s.cc1 ?? '-'}</td>
                    <td className="px-4 py-3.5 text-sm text-gray-600 dark:text-gray-300">{s.cc2 ?? '-'}</td>
                    <td className="px-4 py-3.5 text-sm text-gray-600 dark:text-gray-300">{s.cc3 ?? '-'}</td>
                    <td className="px-4 py-3.5 text-sm text-gray-600 dark:text-gray-300">{s.efm ?? '-'}</td>
                    <td className="px-4 py-3.5 text-sm font-semibold text-gray-900 dark:text-gray-100">{s.moyenne ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {sortedStudents.length > 0 && (
            <div className="flex items-center justify-end px-6 py-4 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 disabled:opacity-40 disabled:cursor-not-allowed">Pre</button>
                {paginationRange.map((item, idx) =>
                  typeof item === 'string' ? (
                    <span key={`dots-${idx}`} className="px-2 py-1.5 text-sm text-gray-400 dark:text-gray-500">....</span>
                  ) : (
                    <button key={item} onClick={() => setPage(item)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium ${page === item ? 'bg-primary-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>{item}</button>
                  )
                )}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 disabled:opacity-40 disabled:cursor-not-allowed">Next</button>
              </div>
            </div>
          )}

          {/* ── Bottom actions: Valider / Retirer validation ── */}
          {canValidate && students.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-700">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {drillModule.is_validated
                  ? 'Ces notes sont validées. Tout retrait marquera le module comme non validé.'
                  : 'Une fois validées, les notes apparaîtront comme « Validée » dans la liste.'}
              </div>
              {drillModule.is_validated ? (
                <Button
                  variant="secondary"
                  onClick={() => setConfirmUnvalidateOpen(true)}
                  className="!bg-gray-100 dark:!bg-gray-700 !text-gray-700 dark:!text-gray-300 hover:!bg-gray-200"
                >
                  Retirer la validation
                </Button>
              ) : (
                <Button onClick={handleValidate} loading={validating}>
                  <HiCheckCircle className="h-4 w-4" /> Valider les notes
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmUnvalidateOpen}
        onClose={() => setConfirmUnvalidateOpen(false)}
        onConfirm={handleUnvalidate}
        title="Retirer la validation"
        message={`Retirer la validation des notes pour « ${drillModule?.nom} » ? Le module apparaîtra de nouveau comme non validé.`}
      />
    </div>
  );
};

export default ExamensPage;
