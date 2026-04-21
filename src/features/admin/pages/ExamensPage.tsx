import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  dropdownApi,
  modulesApi,
  gradesApi,
  examensApi,
} from '../../../api/crudApi';
import {
  HiChevronUp, HiChevronDown, HiSearch, HiDownload,
  HiPlus, HiPencil, HiTrash, HiDotsHorizontal, HiCalendar, HiClock, HiLocationMarker,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { useRolePath } from '../../../hooks/useRolePath';
import { useAuth } from '../../../hooks/useAuth';
import { Modal, Button, Input, Select, ConfirmDialog } from '../../../components/ui';
import type { SelectOption } from '../../../types';

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

interface ExamenRow {
  id: number;
  type: string;
  numero: number | null;
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  module?: { id: number; nom: string; code?: string };
  module_id?: number;
  group?: { id: number; nom: string; filiere_id?: number };
  group_id?: number;
  salle?: { id: number; nom: string } | null;
  salle_id?: number | null;
  formateur?: { id: number; user?: { nom: string; prenom: string } };
  formateur_id?: number;
}

const ROWS_PER_PAGE = 10;

const TYPE_OPTIONS: SelectOption[] = [
  { value: 'controle',   label: 'Contrôle continu (CC)' },
  { value: 'efm',        label: 'EFM' },
  { value: 'eff',        label: 'EFF' },
  { value: 'rattrapage', label: 'Rattrapage' },
];

const formatExamDate = (iso?: string): string => {
  if (!iso) return '—';
  const d = iso.slice(0, 10); // YYYY-MM-DD
  const [y, m, day] = d.split('-');
  return y && m && day ? `${day}/${m}/${y}` : iso;
};

const typeBadge = (type: string, numero?: number | null): { label: string; cls: string } => {
  switch (type) {
    case 'controle':
      return { label: `CC${numero || ''}`.trim(), cls: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' };
    case 'efm':
      return { label: 'EFM', cls: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' };
    case 'eff':
      return { label: 'EFF', cls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' };
    case 'rattrapage':
      return { label: 'Rattrapage', cls: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' };
    default:
      return { label: type, cls: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' };
  }
};

interface ExamFormState {
  filiere_id: string;
  group_id: string;
  module_id: string;
  formateur_id: string;
  salle_id: string;
  type: string;
  numero: string;
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
}

const emptyExamForm: ExamFormState = {
  filiere_id: '',
  group_id: '',
  module_id: '',
  formateur_id: '',
  salle_id: '',
  type: 'controle',
  numero: '1',
  date_examen: '',
  heure_debut: '08:30',
  heure_fin: '10:30',
};

const ExamensPage: React.FC = () => {
  const basePath = useRolePath();
  const { user } = useAuth();
  const canSchedule = user?.role === 'surveillant';
  const canValidate = user?.role === 'directeur';
  const [activeTab, setActiveTab] = useState<'planning' | 'notes'>(canSchedule ? 'planning' : 'notes');

  // ========== shared dropdowns ==========
  const [filieres, setFilieres] = useState<any[]>([]);
  const [allGroups, setAllGroups] = useState<any[]>([]);
  const [allSalles, setAllSalles] = useState<any[]>([]);
  const [allFormateurs, setAllFormateurs] = useState<any[]>([]);

  useEffect(() => {
    dropdownApi.filieres().then(r => setFilieres(r.data?.data || [])).catch(() => {});
    dropdownApi.groups().then(r => setAllGroups(r.data?.data || [])).catch(() => {});
    dropdownApi.salles().then(r => setAllSalles(r.data?.data || [])).catch(() => {});
    dropdownApi.formateurs().then(r => setAllFormateurs(r.data?.data || [])).catch(() => {});
  }, []);

  // ================================================================
  // PLANNING TAB — exam scheduling (Surveillant primary)
  // ================================================================
  const [examens, setExamens] = useState<ExamenRow[]>([]);
  const [examLoading, setExamLoading] = useState(false);
  const [filterGroup, setFilterGroup] = useState('');
  const [filterModule, setFilterModule] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<ExamenRow | null>(null);
  const [form, setForm] = useState<ExamFormState>(emptyExamForm);
  const [saving, setSaving] = useState(false);
  const [formModules, setFormModules] = useState<any[]>([]);

  const fetchExamens = useCallback(async () => {
    if (activeTab !== 'planning') return;
    setExamLoading(true);
    try {
      const params: any = { per_page: 200 };
      if (filterGroup) params.group_id = filterGroup;
      if (filterModule) params.module_id = filterModule;
      if (filterType) params.type = filterType;
      if (filterDateFrom) params.date_from = filterDateFrom;
      if (filterDateTo) params.date_to = filterDateTo;
      const res = await examensApi.getAll(params);
      setExamens((res.data.data as any[]) as ExamenRow[]);
    } catch {
      toast.error('Erreur de chargement des examens');
    }
    setExamLoading(false);
  }, [activeTab, filterGroup, filterModule, filterType, filterDateFrom, filterDateTo]);

  useEffect(() => { fetchExamens(); }, [fetchExamens]);

  useEffect(() => {
    const handler = () => setOpenMenuId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // When form filière or group changes, reload modules
  useEffect(() => {
    if (!form.filiere_id) { setFormModules([]); return; }
    modulesApi.getAll({ filiere_id: form.filiere_id, per_page: 200 })
      .then(r => setFormModules(r.data?.data || []))
      .catch(() => setFormModules([]));
  }, [form.filiere_id, formOpen]);

  const openCreateExam = () => {
    setEditing(null);
    setForm(emptyExamForm);
    setFormOpen(true);
  };

  const openEditExam = (e: ExamenRow) => {
    setEditing(e);
    setForm({
      filiere_id:   String(e.group?.filiere_id || ''),
      group_id:     String(e.group_id || e.group?.id || ''),
      module_id:    String(e.module_id || e.module?.id || ''),
      formateur_id: String(e.formateur_id || e.formateur?.id || ''),
      salle_id:     String(e.salle_id ?? e.salle?.id ?? ''),
      type:         e.type || 'controle',
      numero:       String(e.numero ?? 1),
      date_examen:  (e.date_examen || '').slice(0, 10),
      heure_debut:  (e.heure_debut || '').slice(0, 5),
      heure_fin:    (e.heure_fin || '').slice(0, 5),
    });
    setFormOpen(true);
    setOpenMenuId(null);
  };

  const handleSaveExam = async () => {
    if (!form.group_id || !form.module_id || !form.formateur_id || !form.type || !form.date_examen || !form.heure_debut || !form.heure_fin) {
      toast.error('Groupe, module, formateur, type, date et horaires sont requis');
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        group_id:     Number(form.group_id),
        module_id:    Number(form.module_id),
        formateur_id: Number(form.formateur_id),
        salle_id:     form.salle_id ? Number(form.salle_id) : null,
        type:         form.type,
        date_examen:  form.date_examen,
        heure_debut:  form.heure_debut,
        heure_fin:    form.heure_fin,
      };
      if (form.type === 'controle' && form.numero) {
        payload.numero = Number(form.numero);
      }
      if (editing) {
        await examensApi.update(editing.id, payload);
        toast.success('Examen mis à jour');
      } else {
        await examensApi.create(payload);
        toast.success('Examen planifié');
      }
      setFormOpen(false);
      fetchExamens();
    } catch (err: any) {
      const errors = err.response?.data?.errors;
      const firstErr = errors ? Object.values(errors).flat()[0] : null;
      toast.error((firstErr as string) || err.response?.data?.message || 'Erreur');
    }
    setSaving(false);
  };

  const askDeleteExam = (e: ExamenRow) => {
    setEditing(e);
    setDeleteOpen(true);
    setOpenMenuId(null);
  };

  const handleDeleteExam = async () => {
    if (!editing) return;
    try {
      await examensApi.delete(editing.id);
      toast.success('Examen supprimé');
      setDeleteOpen(false);
      setEditing(null);
      fetchExamens();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur');
    }
  };

  const formFiliereOptions: SelectOption[] = filieres.map((f: any) => ({ value: String(f.id), label: f.nom }));
  const formGroupOptions: SelectOption[] = allGroups
    .filter((g: any) => !form.filiere_id || String(g.filiere_id) === form.filiere_id)
    .map((g: any) => ({ value: String(g.id), label: g.nom }));
  const formModuleOptions: SelectOption[] = formModules.map((m: any) => ({ value: String(m.id), label: m.nom }));
  const formFormateurOptions: SelectOption[] = allFormateurs.map((f: any) => ({
    value: String(f.id),
    label: `${f.user?.prenom || ''} ${f.user?.nom || ''}`.trim() || `#${f.id}`,
  }));
  const formSalleOptions: SelectOption[] = allSalles.map((s: any) => ({
    value: String(s.id),
    label: `${s.nom}${s.capacite ? ` (${s.capacite})` : ''}`,
  }));

  const planningFilterGroups: SelectOption[] = allGroups.map((g: any) => ({ value: String(g.id), label: g.nom }));

  // ================================================================
  // NOTES TAB
  // ================================================================
  const [modules, setModules] = useState<any[]>([]);
  const [selectedFiliere, setSelectedFiliere] = useState('');
  const [selectedGroupe, setSelectedGroupe] = useState('');
  // drill-down: null = module list, object = notes for that module
  const [activeModule, setActiveModule] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [students, setStudents] = useState<StudentGrade[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  // validated module IDs for the selected group
  const [validatedModuleIds, setValidatedModuleIds] = useState<Set<number>>(new Set());
  const [validatingId, setValidatingId] = useState<number | null>(null);

  const filteredGroups = useMemo(() => {
    if (!selectedFiliere) return [];
    return allGroups.filter((g: any) => String(g.filiere_id) === selectedFiliere);
  }, [selectedFiliere, allGroups]);

  const handleFiliereChange = (val: string) => {
    setSelectedFiliere(val); setSelectedGroupe('');
    setModules([]); setStudents([]); setActiveModule(null);
    setValidatedModuleIds(new Set()); setPage(1);
  };

  const handleGroupeChange = (val: string) => {
    setSelectedGroupe(val); setStudents([]); setActiveModule(null); setPage(1);
    setValidatedModuleIds(new Set());
    if (val) {
      const group = allGroups.find((g: any) => String(g.id) === val);
      if (group?.filiere_id) {
        modulesApi.getAll({ filiere_id: group.filiere_id, per_page: 100 })
          .then(res => setModules(res.data?.data || []))
          .catch(() => {});
        gradesApi.getValidations(Number(val))
          .then(res => {
            const ids = (res.data?.data || []).map((v: any) => v.module_id);
            setValidatedModuleIds(new Set(ids));
          }).catch(() => {});
      }
    } else setModules([]);
  };

  const openModuleNotes = async (mod: any) => {
    setActiveModule(mod); setStudents([]); setPage(1); setSearch(''); setSortKey('');
    if (!selectedGroupe) return;
    setLoading(true);
    try {
      const res = await gradesApi.getByGroupModule(Number(selectedGroupe), mod.id);
      setStudents(res.data?.data || []);
    } catch { setStudents([]); }
    setLoading(false);
  };

  const handleValider = async (moduleId: number) => {
    if (!selectedGroupe) return;
    setValidatingId(moduleId);
    try {
      await gradesApi.validate(Number(selectedGroupe), moduleId);
      setValidatedModuleIds(prev => { const s = new Set(prev); s.add(moduleId); return s; });
      toast.success('Notes validées avec succès');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur lors de la validation');
    }
    setValidatingId(null);
  };

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
    XLSX.writeFile(wb, `Notes_${groupe?.nom || 'Groupe'}_${activeModule?.nom || 'Module'}.xlsx`);
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

  // ================================================================
  // RENDER
  // ================================================================
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

      {/* Tab switcher */}
      <div className="flex items-center gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('planning')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'planning'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          Planning des examens
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'notes'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          Notes
        </button>
      </div>

      {activeTab === 'planning' && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
          <div className="flex items-center justify-between px-6 pt-5 pb-4 flex-wrap gap-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Planning des examens</h2>
            {canSchedule && (
              <button
                onClick={openCreateExam}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <HiPlus className="h-4 w-4" /> Planifier examen
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 px-6 pb-4 flex-wrap">
            <select
              value={filterGroup}
              onChange={e => setFilterGroup(e.target.value)}
              className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-800 min-w-[140px]"
            >
              <option value="">Tous les groupes</option>
              {planningFilterGroups.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-800"
            >
              <option value="">Tous les types</option>
              {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 dark:text-gray-400">Du</span>
              <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
                className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-800" />
              <span className="text-xs text-gray-500 dark:text-gray-400">au</span>
              <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
                className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-800" />
            </div>
            {(filterGroup || filterType || filterDateFrom || filterDateTo) && (
              <button
                onClick={() => { setFilterGroup(''); setFilterType(''); setFilterDateFrom(''); setFilterDateTo(''); }}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-600"
              >
                Effacer filtres
              </button>
            )}
            <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
              {examLoading ? '...' : `${examens.length} examen${examens.length > 1 ? 's' : ''}`}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-gray-800/60 border-y border-gray-100 dark:border-gray-700">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Module</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Groupe</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Date & heure</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Salle</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Formateur</th>
                  {canSchedule && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {examLoading ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">Chargement...</td></tr>
                ) : examens.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">Aucun examen planifié</td></tr>
                ) : examens.map(e => {
                  const t = typeBadge(e.type, e.numero);
                  return (
                    <tr key={e.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${t.cls}`}>{t.label}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 font-medium">{e.module?.nom || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{e.group?.nom || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        <div className="flex items-center gap-1.5"><HiCalendar className="h-3.5 w-3.5 text-gray-400" />{formatExamDate(e.date_examen)}</div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-0.5"><HiClock className="h-3 w-3 text-gray-400" />{e.heure_debut?.slice(0, 5)} → {e.heure_fin?.slice(0, 5)}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {e.salle?.nom ? (
                          <span className="inline-flex items-center gap-1"><HiLocationMarker className="h-3.5 w-3.5 text-gray-400" />{e.salle.nom}</span>
                        ) : <span className="text-gray-400 dark:text-gray-500 italic">non assignée</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {e.formateur?.user ? `${e.formateur.user.prenom} ${e.formateur.user.nom}` : '—'}
                      </td>
                      {canSchedule && (
                        <td className="px-4 py-3">
                          <div className="relative">
                            <button
                              onClick={(ev) => { ev.stopPropagation(); setOpenMenuId(openMenuId === e.id ? null : e.id); }}
                              className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            >
                              <HiDotsHorizontal className="h-5 w-5" />
                            </button>
                            {openMenuId === e.id && (
                              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-10 min-w-[140px]">
                                <button onClick={(ev) => { ev.stopPropagation(); openEditExam(e); }} className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-2">
                                  <HiPencil className="h-4 w-4" /> Modifier
                                </button>
                                <button onClick={(ev) => { ev.stopPropagation(); askDeleteExam(e); }} className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2">
                                  <HiTrash className="h-4 w-4" /> Supprimer
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">

          {/* Header + filters */}
          <div className="px-6 pt-5 pb-4 flex items-center gap-3 flex-wrap">
            {activeModule ? (
              <>
                <button
                  onClick={() => { setActiveModule(null); setStudents([]); setSearch(''); setSortKey(''); }}
                  className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                  Retour aux modules
                </button>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{activeModule.nom}</h2>
                {(() => {
                  const f = activeModule.formateurs?.[0];
                  const name = f?.user ? `${f.user.prenom} ${f.user.nom}` : null;
                  return name ? <span className="text-sm text-gray-500 dark:text-gray-400">— {name}</span> : null;
                })()}
                <div className="ml-auto flex items-center gap-2">
                  <div className="relative">
                    <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Rechercher..."
                      className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg pl-9 pr-3 py-1.5 text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-800 min-w-[160px] outline-none" />
                  </div>
                  <button onClick={handleExport} disabled={sortedStudents.length === 0}
                    className="flex items-center gap-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:opacity-40 disabled:cursor-not-allowed">
                    <HiDownload className="h-4 w-4" /> Export
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mr-2">Notes par module</h2>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Filière</span>
                  <select value={selectedFiliere} onChange={e => handleFiliereChange(e.target.value)}
                    className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-800 min-w-[160px]">
                    <option value="">Choisir filière</option>
                    {filieres.map((f: any) => <option key={f.id} value={f.id}>{f.nom}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Groupe</span>
                  <select value={selectedGroupe} onChange={e => handleGroupeChange(e.target.value)}
                    className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-800 min-w-[130px]"
                    disabled={!selectedFiliere}>
                    <option value="">Choisir groupe</option>
                    {filteredGroups.map((g: any) => <option key={g.id} value={g.id}>{g.nom}</option>)}
                  </select>
                </div>
              </>
            )}
          </div>

          {/* MODULE LIST VIEW */}
          {!activeModule && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-gray-800/60 border-y border-gray-100 dark:border-gray-700">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Module</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Formateur</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Statut</th>
                    {canValidate && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {!selectedGroupe ? (
                    <tr><td colSpan={4} className="px-4 py-16 text-center text-gray-400 dark:text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <svg className="h-10 w-10 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-sm">Sélectionnez une filière et un groupe pour voir les modules</p>
                      </div>
                    </td></tr>
                  ) : modules.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">Aucun module trouvé</td></tr>
                  ) : modules.map((mod: any) => {
                    const f = mod.formateurs?.[0];
                    const formateurName = f?.user ? `${f.user.prenom} ${f.user.nom}` : '—';
                    const isValidated = validatedModuleIds.has(mod.id);
                    const isValidating = validatingId === mod.id;
                    return (
                      <tr key={mod.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3.5">
                          <button
                            onClick={() => openModuleNotes(mod)}
                            className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline text-left"
                          >
                            {mod.nom}
                          </button>
                          {mod.code && <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">{mod.code}</span>}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-700 dark:text-gray-300">{formateurName}</td>
                        <td className="px-4 py-3.5">
                          {isValidated ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700">
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                              Validé
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700">
                              En attente
                            </span>
                          )}
                        </td>
                        {canValidate && (
                          <td className="px-4 py-3.5">
                            <button
                              onClick={() => handleValider(mod.id)}
                              disabled={isValidated || isValidating}
                              className="px-4 py-1.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-primary-600 hover:bg-primary-700 text-white"
                            >
                              {isValidating ? '...' : isValidated ? 'Validé' : 'Valider'}
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* NOTES DETAIL VIEW */}
          {activeModule && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-gray-800/60 border-y border-gray-100 dark:border-gray-700">
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
                  {loading ? (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">Chargement...</td></tr>
                  ) : pagedStudents.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">Aucune note trouvée</td></tr>
                  ) : pagedStudents.map(s => (
                    <tr key={s.stagiaire_id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3.5 text-sm font-medium text-gray-900 dark:text-gray-100">{s.prenom} {s.nom}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-600 dark:text-gray-300">{s.cc1 ?? '—'}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-600 dark:text-gray-300">{s.cc2 ?? '—'}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-600 dark:text-gray-300">{s.cc3 ?? '—'}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-600 dark:text-gray-300">{s.efm ?? '—'}</td>
                      <td className="px-4 py-3.5">
                        <span className={`text-sm font-semibold ${s.moyenne !== null ? (s.moyenne >= 10 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400') : 'text-gray-400'}`}>
                          {s.moyenne ?? '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination (notes view) */}
          {activeModule && sortedStudents.length > ROWS_PER_PAGE && (
            <div className="flex items-center justify-end px-6 py-4 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 disabled:opacity-40 disabled:cursor-not-allowed">Préc</button>
                {paginationRange.map((item, idx) =>
                  typeof item === 'string' ? (
                    <span key={`dots-${idx}`} className="px-2 py-1.5 text-sm text-gray-400">…</span>
                  ) : (
                    <button key={item} onClick={() => setPage(item)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium ${page === item ? 'bg-primary-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>{item}</button>
                  )
                )}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 disabled:opacity-40 disabled:cursor-not-allowed">Suiv</button>
              </div>
            </div>
          )}

          {/* Valider button in notes detail view */}
          {activeModule && canValidate && sortedStudents.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-700">
              <span className="text-sm text-gray-500 dark:text-gray-400">{sortedStudents.length} stagiaire{sortedStudents.length > 1 ? 's' : ''}</span>
              <button
                onClick={() => handleValider(activeModule.id)}
                disabled={validatedModuleIds.has(activeModule.id) || validatingId === activeModule.id}
                className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {validatingId === activeModule.id ? 'Validation...' : validatedModuleIds.has(activeModule.id) ? 'Déjà validé' : 'Valider les notes'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Exam form modal */}
      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Modifier l\'examen' : 'Planifier un examen'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>Annuler</Button>
            <Button onClick={handleSaveExam} loading={saving}>Enregistrer</Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Filière"
              value={form.filiere_id}
              onChange={e => setForm(p => ({ ...p, filiere_id: e.target.value, group_id: '', module_id: '' }))}
              options={[{ value: '', label: 'Choisir une filière' }, ...formFiliereOptions]}
              required
            />
            <Select
              label="Groupe"
              value={form.group_id}
              onChange={e => setForm(p => ({ ...p, group_id: e.target.value }))}
              options={[{ value: '', label: 'Choisir un groupe' }, ...formGroupOptions]}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Module"
              value={form.module_id}
              onChange={e => setForm(p => ({ ...p, module_id: e.target.value }))}
              options={[{ value: '', label: 'Choisir un module' }, ...formModuleOptions]}
              required
            />
            <Select
              label="Formateur responsable"
              value={form.formateur_id}
              onChange={e => setForm(p => ({ ...p, formateur_id: e.target.value }))}
              options={[{ value: '', label: 'Choisir un formateur' }, ...formFormateurOptions]}
              required
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Select
              label="Type"
              value={form.type}
              onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
              options={TYPE_OPTIONS}
              required
            />
            {form.type === 'controle' && (
              <Select
                label="Numéro"
                value={form.numero}
                onChange={e => setForm(p => ({ ...p, numero: e.target.value }))}
                options={[{ value: '1', label: 'CC1' }, { value: '2', label: 'CC2' }, { value: '3', label: 'CC3' }]}
              />
            )}
            <Select
              label="Salle"
              value={form.salle_id}
              onChange={e => setForm(p => ({ ...p, salle_id: e.target.value }))}
              options={[{ value: '', label: 'Salle non assignée' }, ...formSalleOptions]}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Date" type="date" value={form.date_examen} onChange={e => setForm(p => ({ ...p, date_examen: e.target.value }))} required />
            <Input label="Heure début" type="time" value={form.heure_debut} onChange={e => setForm(p => ({ ...p, heure_debut: e.target.value }))} required />
            <Input label="Heure fin" type="time" value={form.heure_fin} onChange={e => setForm(p => ({ ...p, heure_fin: e.target.value }))} required />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDeleteExam}
        title="Supprimer l'examen"
        message={`Supprimer cet examen (${editing?.module?.nom || ''} — ${editing?.group?.nom || ''}) ? Cette action est irréversible.`}
      />
    </div>
  );
};

export default ExamensPage;
