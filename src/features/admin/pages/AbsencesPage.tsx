import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { absencesApi, dropdownApi, stagiairesApi, modulesApi } from '../../../api/crudApi';
import { Absence, TableColumn, SelectOption } from '../../../types';
import { DataTable, Modal, Button, Input, Select } from '../../../components/ui';
import toast from 'react-hot-toast';
import { useDebounce } from '../../../hooks/useDebounce';
import { useRolePath } from '../../../hooks/useRolePath';
import { useAuth } from '../../../hooks/useAuth';
import { formatDate } from '../../../utils/formatters';
import { HiX, HiPencil, HiDotsHorizontal, HiDownload, HiExclamation, HiCheck, HiClock, HiBan, HiPlus } from 'react-icons/hi';
import { HiDocumentText } from 'react-icons/hi2';
import axiosInstance from '../../../api/axiosInstance';
import * as XLSX from 'xlsx';

const BACKEND_URL = (process.env.REACT_APP_API_URL || 'http://localhost:8000/api').replace('/api', '');

const STATUS_LABELS: Record<string, string> = {
  non_justifiee: 'Non justifiée',
  justifiee:     'Justifiée',
  en_attente:    'En attente',
};

const statusBadge = (status: string) => {
  const styles: Record<string, string> = {
    non_justifiee: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    justifiee:     'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    en_attente:    'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
};

interface Stats {
  total: number;
  non_justifiee_count: number;
  en_attente_count: number;
  justifiee_count: number;
  non_justifiee_hours: number;
  en_attente_hours: number;
  justifiee_hours: number;
}

interface Warning {
  stagiaire_id: number;
  nom: string;
  prenom: string;
  cef: string;
  group: string;
  filiere: string;
  hours: number;
  count: number;
  level: 'warning' | 'suspension';
}

const AbsencesPage: React.FC = () => {
  const basePath = useRolePath();
  const { user } = useAuth();
  const canWrite = user?.role === 'surveillant';

  const [data, setData] = useState<Absence[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());
  const [filterStatus, setFilterStatus] = useState('');
  const [previewDoc, setPreviewDoc] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [warningsOpen, setWarningsOpen] = useState(true);
  const [statusEditOpen, setStatusEditOpen] = useState(false);
  const [statusEditing, setStatusEditing] = useState<Absence | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [justifFile, setJustifFile] = useState<File | null>(null);

  // Cascading filters: Filière → Groupe → Stagiaire
  const [filterFiliere, setFilterFiliere] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [filterStagiaire, setFilterStagiaire] = useState('');
  // Time filters: Year / Month / Week (of that month)
  const [filterYear, setFilterYear] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterWeek, setFilterWeek] = useState('');
  const [allFilieres, setAllFilieres] = useState<any[]>([]);
  const [allGroups, setAllGroups] = useState<any[]>([]);
  const [groupStagiaires, setGroupStagiaires] = useState<any[]>([]);

  // Create-absence modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    stagiaire_id: '',
    module_id: '',
    date_absence: new Date().toISOString().slice(0, 10),
    heure_debut: '08:30',
    heure_fin: '10:30',
    motif: '',
    status: 'non_justifiee',
  });
  const [creating, setCreating] = useState(false);
  const [createFiliere, setCreateFiliere] = useState('');
  const [createGroup, setCreateGroup] = useState('');
  const [createGroupStagiaires, setCreateGroupStagiaires] = useState<any[]>([]);
  const [createFiliereModules, setCreateFiliereModules] = useState<any[]>([]);
  const [statusNote, setStatusNote] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);
  const debouncedSearch = useDebounce(search);

  // Compute date range from year/month/week selections
  const dateRange = useMemo(() => {
    if (!filterYear) return { from: '', to: '' };
    const y = parseInt(filterYear, 10);
    if (!filterMonth) {
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    }
    const m = parseInt(filterMonth, 10);
    const mm = String(m).padStart(2, '0');
    if (!filterWeek) {
      const lastDay = new Date(y, m, 0).getDate();
      return { from: `${y}-${mm}-01`, to: `${y}-${mm}-${String(lastDay).padStart(2, '0')}` };
    }
    const w = parseInt(filterWeek, 10); // 1..5
    const startDay = (w - 1) * 7 + 1;
    const endDay = Math.min(startDay + 6, new Date(y, m, 0).getDate());
    return {
      from: `${y}-${mm}-${String(startDay).padStart(2, '0')}`,
      to:   `${y}-${mm}-${String(endDay).padStart(2, '0')}`,
    };
  }, [filterYear, filterMonth, filterWeek]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, search: debouncedSearch, per_page: perPage };
      if (filterStatus) params.status = filterStatus;
      if (filterFiliere) params.filiere_id = filterFiliere;
      if (filterGroup) params.group_id = filterGroup;
      if (filterStagiaire) params.stagiaire_id = filterStagiaire;
      if (dateRange.from) params.date_from = dateRange.from;
      if (dateRange.to) params.date_to = dateRange.to;
      const res = await absencesApi.getAll(params);
      setData(res.data.data);
      setTotalPages(res.data.meta.last_page);
      setTotalItems(res.data.meta.total);
    } catch {
      toast.error('Erreur de chargement');
    }
    setLoading(false);
  }, [page, debouncedSearch, perPage, filterStatus, filterFiliere, filterGroup, filterStagiaire, dateRange]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/absences/stats');
      setStats(res.data?.data || null);
    } catch {}
  }, []);

  const fetchWarnings = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/absences/warnings');
      setWarnings(res.data?.data || []);
    } catch {}
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchStats(); fetchWarnings(); }, [fetchStats, fetchWarnings]);

  // Load filières + groups once
  useEffect(() => {
    dropdownApi.filieres().then(r => setAllFilieres(r.data?.data || [])).catch(() => {});
    dropdownApi.groups().then(r => setAllGroups(r.data?.data || [])).catch(() => {});
  }, []);

  // When filter group changes, fetch stagiaires of that group
  useEffect(() => {
    if (!filterGroup) { setGroupStagiaires([]); return; }
    stagiairesApi.getAll({ group_id: filterGroup, per_page: 500 })
      .then(r => setGroupStagiaires(r.data?.data || []))
      .catch(() => setGroupStagiaires([]));
  }, [filterGroup]);

  // Reset downstream filters when upstream changes
  useEffect(() => { setFilterGroup(''); setFilterStagiaire(''); }, [filterFiliere]);
  useEffect(() => { setFilterStagiaire(''); }, [filterGroup]);
  useEffect(() => { setFilterMonth(''); setFilterWeek(''); }, [filterYear]);
  useEffect(() => { setFilterWeek(''); }, [filterMonth]);

  // Create modal: load stagiaires when group selected, modules when filière selected
  useEffect(() => {
    if (!createGroup) { setCreateGroupStagiaires([]); return; }
    stagiairesApi.getAll({ group_id: createGroup, per_page: 500 })
      .then(r => setCreateGroupStagiaires(r.data?.data || []))
      .catch(() => setCreateGroupStagiaires([]));
  }, [createGroup]);

  useEffect(() => {
    if (!createFiliere) { setCreateFiliereModules([]); return; }
    modulesApi.getAll({ filiere_id: createFiliere, per_page: 200 })
      .then(r => setCreateFiliereModules(r.data?.data || []))
      .catch(() => setCreateFiliereModules([]));
  }, [createFiliere]);

  useEffect(() => {
    const handler = () => setOpenMenuId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const handlePerPageChange = (newPerPage: number) => {
    setPerPage(newPerPage); setPage(1);
  };

  const openStatusEdit = (a: Absence, target: string) => {
    setStatusEditing(a);
    setNewStatus(target);
    setStatusNote(target === 'justifiee' ? '' : (a.motif || ''));
    setJustifFile(null);
    setStatusEditOpen(true);
    setOpenMenuId(null);
  };

  const handleSaveStatus = async () => {
    if (!statusEditing) return;
    if (newStatus === 'justifiee' && !justifFile && !statusEditing.justification) {
      toast.error('Veuillez choisir un document justificatif');
      return;
    }
    setSavingStatus(true);
    try {
      if (newStatus === 'justifiee' && justifFile) {
        // Use dedicated upload endpoint with multipart/form-data
        await absencesApi.justify(statusEditing.id, justifFile, statusNote.trim() || undefined);
      } else {
        const payload: any = { status: newStatus };
        if (newStatus === 'en_attente') {
          payload.motif = statusNote.trim() || null;
          payload.justification = null;
        } else if (newStatus === 'non_justifiee') {
          payload.motif = null;
          payload.justification = null;
        } else if (newStatus === 'justifiee') {
          // Keep existing justification doc, just update note
          payload.motif = statusNote.trim() || null;
        }
        await absencesApi.update(statusEditing.id, payload);
      }
      toast.success('Statut mis à jour');
      setStatusEditOpen(false);
      setStatusEditing(null);
      setJustifFile(null);
      fetchData();
      fetchStats();
      fetchWarnings();
    } catch (err: any) {
      const errors = err.response?.data?.errors;
      const firstErr = errors ? Object.values(errors).flat()[0] : null;
      toast.error((firstErr as string) || err.response?.data?.message || 'Erreur');
    }
    setSavingStatus(false);
  };

  const quickSetStatus = async (a: Absence, target: string) => {
    setOpenMenuId(null);
    try {
      await absencesApi.update(a.id, { status: target } as any);
      toast.success('Statut mis à jour');
      fetchData();
      fetchStats();
      fetchWarnings();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur');
    }
  };

  const openCreateAbsence = () => {
    setCreateFiliere('');
    setCreateGroup('');
    setCreateForm({
      stagiaire_id: '',
      module_id: '',
      date_absence: new Date().toISOString().slice(0, 10),
      heure_debut: '08:30',
      heure_fin: '10:30',
      motif: '',
      status: 'non_justifiee',
    });
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!createForm.stagiaire_id || !createForm.module_id || !createForm.date_absence || !createForm.heure_debut || !createForm.heure_fin) {
      toast.error('Stagiaire, module, date et horaires sont requis');
      return;
    }
    if (createForm.heure_debut >= createForm.heure_fin) {
      toast.error('L\'heure de fin doit être après l\'heure de début');
      return;
    }
    setCreating(true);
    try {
      await absencesApi.create({
        stagiaire_id: Number(createForm.stagiaire_id),
        module_id:    Number(createForm.module_id),
        date_absence: createForm.date_absence,
        heure_debut:  createForm.heure_debut,
        heure_fin:    createForm.heure_fin,
        motif:        createForm.motif.trim() || null,
        status:       createForm.status,
      } as any);
      toast.success('Absence enregistrée');
      setCreateOpen(false);
      fetchData();
      fetchStats();
      fetchWarnings();
    } catch (err: any) {
      const errors = err.response?.data?.errors;
      const firstErr = errors ? Object.values(errors).flat()[0] : null;
      toast.error((firstErr as string) || err.response?.data?.message || 'Erreur');
    }
    setCreating(false);
  };

  // Dropdown option lists
  const filiereOptions: SelectOption[] = allFilieres.map((f: any) => ({ value: String(f.id), label: f.nom }));
  const groupsForFiliere = useMemo(() => {
    if (!filterFiliere) return allGroups;
    return allGroups.filter((g: any) => String(g.filiere_id) === filterFiliere);
  }, [filterFiliere, allGroups]);
  const filterGroupOptions: SelectOption[] = groupsForFiliere.map((g: any) => ({ value: String(g.id), label: g.nom }));
  const filterStagiaireOptions: SelectOption[] = groupStagiaires.map((s: any) => ({
    value: String(s.id),
    label: `${s.user?.prenom || ''} ${s.user?.nom || ''}`.trim(),
  }));

  const currentYear = new Date().getFullYear();
  const yearOptions: SelectOption[] = [currentYear + 1, currentYear, currentYear - 1, currentYear - 2]
    .map(y => ({ value: String(y), label: String(y) }));
  const monthOptions: SelectOption[] = [
    { value: '1', label: 'Janvier' }, { value: '2', label: 'Février' }, { value: '3', label: 'Mars' },
    { value: '4', label: 'Avril' }, { value: '5', label: 'Mai' }, { value: '6', label: 'Juin' },
    { value: '7', label: 'Juillet' }, { value: '8', label: 'Août' }, { value: '9', label: 'Septembre' },
    { value: '10', label: 'Octobre' }, { value: '11', label: 'Novembre' }, { value: '12', label: 'Décembre' },
  ];
  const weekOptions: SelectOption[] = [
    { value: '1', label: 'Semaine 1 (1-7)' },
    { value: '2', label: 'Semaine 2 (8-14)' },
    { value: '3', label: 'Semaine 3 (15-21)' },
    { value: '4', label: 'Semaine 4 (22-28)' },
    { value: '5', label: 'Semaine 5 (29-fin)' },
  ];

  const createGroupOptions: SelectOption[] = allGroups
    .filter((g: any) => !createFiliere || String(g.filiere_id) === createFiliere)
    .map((g: any) => ({ value: String(g.id), label: g.nom }));
  const createStagiaireOptions: SelectOption[] = createGroupStagiaires.map((s: any) => ({
    value: String(s.id),
    label: `${s.user?.prenom || ''} ${s.user?.nom || ''}`.trim(),
  }));
  const createModuleOptions: SelectOption[] = createFiliereModules.map((m: any) => ({ value: String(m.id), label: m.nom }));

  const activeFilterCount = [filterFiliere, filterGroup, filterStagiaire, filterYear, filterMonth, filterWeek, filterStatus].filter(Boolean).length;
  const clearAllFilters = () => {
    setFilterFiliere(''); setFilterGroup(''); setFilterStagiaire('');
    setFilterYear(''); setFilterMonth(''); setFilterWeek('');
    setFilterStatus('');
  };

  const handleExport = async () => {
    try {
      const params: any = { per_page: 5000 };
      if (filterStatus) params.status = filterStatus;
      if (debouncedSearch) params.search = debouncedSearch;
      const res = await absencesApi.getAll(params);
      const rows = (res.data.data as Absence[]).map((a, i) => ({
        '#': i + 1,
        'ID': `ABS-${String(a.id).padStart(3, '0')}`,
        'Stagiaire': a.stagiaire?.user ? `${a.stagiaire.user.prenom} ${a.stagiaire.user.nom}` : '',
        'Module': a.module?.nom || '',
        'Date': a.date_absence ? String(a.date_absence).slice(0, 10) : '',
        'Heure début': a.heure_debut,
        'Heure fin':   a.heure_fin,
        'Statut':      STATUS_LABELS[a.status] || a.status,
        'Motif':       a.motif || '',
        'Justification': a.justification || '',
      }));
      if (rows.length === 0) { toast.error('Aucune absence à exporter'); return; }
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [{ wch: 5 }, { wch: 10 }, { wch: 25 }, { wch: 25 }, { wch: 12 }, { wch: 11 }, { wch: 11 }, { wch: 14 }, { wch: 28 }, { wch: 28 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Absences');
      XLSX.writeFile(wb, `Absences_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(`${rows.length} absence(s) exportée(s)`);
    } catch {
      toast.error('Erreur lors de l\'export');
    }
  };

  const renderMotif = (item: Absence) => {
    if (item.status === 'non_justifiee') {
      return <span className="text-gray-400 dark:text-gray-500">-</span>;
    }
    if (item.status === 'justifiee') {
      const docUrl = item.justification
        ? (item.justification.startsWith('http') ? item.justification : `${BACKEND_URL}${item.justification}`)
        : null;
      return docUrl ? (
        <button
          onClick={(e) => { e.stopPropagation(); setPreviewDoc(docUrl); }}
          className="flex items-center gap-1.5 text-primary-600 dark:text-primary-400 hover:text-primary-700 transition-colors"
          title="Voir le justificatif"
        >
          <HiDocumentText className="h-5 w-5" />
          <span className="text-xs underline">Justificatif</span>
        </button>
      ) : (
        <span className="text-xs text-gray-500 dark:text-gray-400 italic">Texte</span>
      );
    }
    if (item.status === 'en_attente') {
      return (
        <span className="text-sm text-gray-700 dark:text-gray-300 max-w-[200px] truncate block" title={item.motif || ''}>
          {item.motif || '-'}
        </span>
      );
    }
    return <span className="text-gray-400 dark:text-gray-500">-</span>;
  };

  const columns: TableColumn<Absence>[] = [
    {
      key: 'id', label: 'ID', sortable: true,
      render: (item) => <span className="text-primary-600 dark:text-primary-400 font-medium">ABS-{String(item.id).padStart(3, '0')}</span>,
    },
    {
      key: 'stagiaire', label: 'Stagiaire', sortable: true,
      render: (item) => {
        const u = item.stagiaire?.user;
        return u ? `${u.prenom} ${u.nom}` : '-';
      },
    },
    { key: 'module', label: 'Module', sortable: true, render: (item) => item.module?.nom || '-' },
    { key: 'date_absence', label: 'Date', sortable: true, render: (item) => formatDate(item.date_absence) },
    { key: 'heure', label: 'Heure', render: (item) => `${item.heure_debut?.slice(0, 5)} - ${item.heure_fin?.slice(0, 5)}` },
    { key: 'motif', label: 'Motif', render: renderMotif },
    { key: 'status', label: 'Statut', sortable: true, render: (item) => statusBadge(item.status) },
    ...(canWrite ? [{
      key: 'actions',
      label: 'Action',
      render: (item: Absence) => (
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === item.id ? null : item.id); }}
            className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <HiDotsHorizontal className="h-5 w-5" />
          </button>
          {openMenuId === item.id && (
            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-10 min-w-[180px]">
              {item.status !== 'justifiee' && (
                <button onClick={(e) => { e.stopPropagation(); openStatusEdit(item, 'justifiee'); }} className="w-full text-left px-3 py-2 text-sm text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center gap-2">
                  <HiCheck className="h-4 w-4" /> Marquer justifiée
                </button>
              )}
              {item.status !== 'en_attente' && (
                <button onClick={(e) => { e.stopPropagation(); openStatusEdit(item, 'en_attente'); }} className="w-full text-left px-3 py-2 text-sm text-yellow-700 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 flex items-center gap-2">
                  <HiClock className="h-4 w-4" /> Mettre en attente
                </button>
              )}
              {item.status !== 'non_justifiee' && (
                <button onClick={(e) => { e.stopPropagation(); quickSetStatus(item, 'non_justifiee'); }} className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2">
                  <HiBan className="h-4 w-4" /> Marquer non justifiée
                </button>
              )}
              <hr className="my-1 border-gray-100 dark:border-gray-700" />
              <button onClick={(e) => { e.stopPropagation(); openStatusEdit(item, item.status); }} className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-2">
                <HiPencil className="h-4 w-4" /> Modifier note/motif
              </button>
            </div>
          )}
        </div>
      ),
    }] : []),
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Absences</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            <Link to={`${basePath}/dashboard`} className="text-primary-600 dark:text-primary-400 hover:text-primary-700">Tableau de bord</Link>
            {' / '}
            <span className="text-primary-600 dark:text-primary-400">Gestion</span>
            {' / '}
            <span>Absences</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-sm font-medium rounded-lg transition-colors"
          >
            <HiDownload className="h-4 w-4" /> Export Excel
          </button>
          {canWrite && (
            <button
              onClick={openCreateAbsence}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <HiPlus className="h-4 w-4" /> Ajouter absence
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards — real totals from stats endpoint */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Absences</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats?.total ?? '—'}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Non justifiées</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats?.non_justifiee_count ?? '—'}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{stats?.non_justifiee_hours ?? '—'}h cumulées</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">En attente</p>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats?.en_attente_count ?? '—'}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{stats?.en_attente_hours ?? '—'}h cumulées</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Justifiées</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats?.justifiee_count ?? '—'}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{stats?.justifiee_hours ?? '—'}h cumulées</p>
        </div>
      </div>

      {/* Warnings panel */}
      {warnings.length > 0 && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/40 rounded-xl overflow-hidden">
          <button
            onClick={() => setWarningsOpen(o => !o)}
            className="w-full flex items-center justify-between px-5 py-3 text-left"
          >
            <div className="flex items-center gap-3">
              <HiExclamation className="h-5 w-5 text-red-600 dark:text-red-400" />
              <div>
                <h3 className="text-sm font-semibold text-red-700 dark:text-red-300">
                  {warnings.length} stagiaire{warnings.length > 1 ? 's' : ''} en zone d'alerte
                </h3>
                <p className="text-xs text-red-600/70 dark:text-red-400/70">
                  Seuil OFPPT : 36h = avertissement · 54h = risque de suspension
                </p>
              </div>
            </div>
            <span className="text-xs text-red-600 dark:text-red-400">{warningsOpen ? 'Masquer' : 'Afficher'}</span>
          </button>
          {warningsOpen && (
            <div className="overflow-x-auto border-t border-red-200 dark:border-red-900/40">
              <table className="w-full text-sm">
                <thead className="bg-red-100/50 dark:bg-red-900/20 text-red-700 dark:text-red-300">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Stagiaire</th>
                    <th className="px-4 py-2 text-left font-medium">CEF</th>
                    <th className="px-4 py-2 text-left font-medium">Groupe</th>
                    <th className="px-4 py-2 text-left font-medium">Filière</th>
                    <th className="px-4 py-2 text-right font-medium">Heures non justifiées</th>
                    <th className="px-4 py-2 text-right font-medium">Nb absences</th>
                    <th className="px-4 py-2 text-left font-medium">Niveau</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-100 dark:divide-red-900/30">
                  {warnings.map(w => (
                    <tr key={w.stagiaire_id} className="hover:bg-red-100/30 dark:hover:bg-red-900/20">
                      <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">{w.prenom} {w.nom}</td>
                      <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{w.cef}</td>
                      <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{w.group}</td>
                      <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{w.filiere}</td>
                      <td className="px-4 py-2 text-right font-semibold text-red-700 dark:text-red-300">{w.hours}h</td>
                      <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">{w.count}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          w.level === 'suspension'
                            ? 'bg-red-600 text-white'
                            : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                        }`}>
                          {w.level === 'suspension' ? 'Risque de suspension' : 'Avertissement'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Cascading filters */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Filtres</h3>
          {activeFilterCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-red-600"
            >
              <HiX className="h-3.5 w-3.5" /> Tout effacer ({activeFilterCount})
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Select
            label="Filière"
            value={filterFiliere}
            onChange={e => setFilterFiliere(e.target.value)}
            options={[{ value: '', label: 'Toutes' }, ...filiereOptions]}
          />
          <Select
            label="Groupe"
            value={filterGroup}
            onChange={e => setFilterGroup(e.target.value)}
            options={[{ value: '', label: 'Tous' }, ...filterGroupOptions]}
          />
          <Select
            label="Stagiaire"
            value={filterStagiaire}
            onChange={e => setFilterStagiaire(e.target.value)}
            options={[{ value: '', label: filterGroup ? 'Tous' : 'Choisir groupe' }, ...filterStagiaireOptions]}
          />
          <Select
            label="Année"
            value={filterYear}
            onChange={e => setFilterYear(e.target.value)}
            options={[{ value: '', label: 'Toutes' }, ...yearOptions]}
          />
          <Select
            label="Mois"
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            options={[{ value: '', label: filterYear ? 'Tous' : 'Choisir année' }, ...monthOptions]}
          />
          <Select
            label="Semaine"
            value={filterWeek}
            onChange={e => setFilterWeek(e.target.value)}
            options={[{ value: '', label: filterMonth ? 'Toutes' : 'Choisir mois' }, ...weekOptions]}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        currentPage={page}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={perPage}
        onPageChange={setPage}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        perPage={perPage}
        onPerPageChange={handlePerPageChange}
        searchValue={search}
        onSearchChange={(val) => { setSearch(val); setPage(1); }}
        headerContent={
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Absences</h3>
          </div>
        }
        toolbarExtra={
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-800"
          >
            <option value="">Tous les statuts</option>
            <option value="non_justifiee">Non justifiée</option>
            <option value="en_attente">En attente</option>
            <option value="justifiee">Justifiée</option>
          </select>
        }
      />

      {/* Stagiaire detail link (when a stagiaire is selected, hint about it) */}
      {filterStagiaire && (
        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Affichage filtré pour un seul stagiaire.
        </div>
      )}

      {/* Create absence modal */}
      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Enregistrer une absence"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button onClick={handleCreate} loading={creating}>Enregistrer</Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Filière"
              value={createFiliere}
              onChange={e => { setCreateFiliere(e.target.value); setCreateGroup(''); setCreateForm(p => ({ ...p, stagiaire_id: '', module_id: '' })); }}
              options={[{ value: '', label: 'Choisir une filière' }, ...filiereOptions]}
              required
            />
            <Select
              label="Groupe"
              value={createGroup}
              onChange={e => { setCreateGroup(e.target.value); setCreateForm(p => ({ ...p, stagiaire_id: '' })); }}
              options={[{ value: '', label: createFiliere ? 'Choisir un groupe' : 'Choisir filière d\'abord' }, ...createGroupOptions]}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Stagiaire"
              value={createForm.stagiaire_id}
              onChange={e => setCreateForm(p => ({ ...p, stagiaire_id: e.target.value }))}
              options={[{ value: '', label: createGroup ? 'Choisir un stagiaire' : 'Choisir groupe d\'abord' }, ...createStagiaireOptions]}
              required
            />
            <Select
              label="Module"
              value={createForm.module_id}
              onChange={e => setCreateForm(p => ({ ...p, module_id: e.target.value }))}
              options={[{ value: '', label: createFiliere ? 'Choisir un module' : 'Choisir filière d\'abord' }, ...createModuleOptions]}
              required
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Date" type="date" value={createForm.date_absence} onChange={e => setCreateForm(p => ({ ...p, date_absence: e.target.value }))} required />
            <Input label="Heure début" type="time" value={createForm.heure_debut} onChange={e => setCreateForm(p => ({ ...p, heure_debut: e.target.value }))} required />
            <Input label="Heure fin" type="time" value={createForm.heure_fin} onChange={e => setCreateForm(p => ({ ...p, heure_fin: e.target.value }))} required />
          </div>
          <Select
            label="Statut initial"
            value={createForm.status}
            onChange={e => setCreateForm(p => ({ ...p, status: e.target.value }))}
            options={[
              { value: 'non_justifiee', label: 'Non justifiée (défaut)' },
              { value: 'en_attente',    label: 'En attente (motif verbal)' },
              { value: 'justifiee',     label: 'Justifiée' },
            ]}
          />
          {(createForm.status === 'en_attente' || createForm.status === 'justifiee') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {createForm.status === 'en_attente' ? 'Motif verbal' : 'Justification / document'}
              </label>
              <textarea
                value={createForm.motif}
                onChange={e => setCreateForm(p => ({ ...p, motif: e.target.value }))}
                rows={2}
                placeholder={createForm.status === 'en_attente' ? 'Ex: maladie, transport...' : 'Ex: /uploads/justif_123.pdf'}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-gray-100 placeholder-gray-400"
              />
            </div>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg px-3 py-2">
            <strong>Rappel :</strong> les formateurs enregistrent les absences en séance. Le surveillant peut aussi en créer pour des cas spécifiques (corridor, oubli, correction).
          </p>
        </div>
      </Modal>

      {/* Status change modal (with note) */}
      <Modal
        isOpen={statusEditOpen}
        onClose={() => setStatusEditOpen(false)}
        title="Modifier le statut"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setStatusEditOpen(false)}>Annuler</Button>
            <Button onClick={handleSaveStatus} loading={savingStatus}>Enregistrer</Button>
          </>
        }
      >
        {statusEditing && (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-sm">
              <p className="text-gray-500 dark:text-gray-400">Absence</p>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {statusEditing.stagiaire?.user ? `${statusEditing.stagiaire.user.prenom} ${statusEditing.stagiaire.user.nom}` : ''}
                {' · '}{statusEditing.module?.nom}{' · '}{formatDate(statusEditing.date_absence)}
              </p>
            </div>
            <Select
              label="Nouveau statut"
              value={newStatus}
              onChange={e => setNewStatus(e.target.value)}
              options={[
                { value: 'non_justifiee', label: 'Non justifiée' },
                { value: 'en_attente',    label: 'En attente (motif verbal)' },
                { value: 'justifiee',     label: 'Justifiée (document fourni)' },
              ]}
              required
            />
            {newStatus === 'en_attente' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Motif verbal</label>
                <textarea
                  value={statusNote}
                  onChange={e => setStatusNote(e.target.value)}
                  rows={3}
                  placeholder="Ex: maladie, rendez-vous médical..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-gray-100 placeholder-gray-400"
                />
              </div>
            )}
            {newStatus === 'justifiee' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Document justificatif <span className="text-red-500">*</span>
                  </label>
                  {statusEditing?.justification && !justifFile && (
                    <div className="mb-2 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
                      <HiDocumentText className="h-4 w-4 text-primary-500" />
                      <span>Document actuel conservé si aucun nouveau fichier n'est choisi</span>
                    </div>
                  )}
                  <label className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,application/pdf"
                      className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) {
                          if (f.size > 5 * 1024 * 1024) {
                            toast.error('Fichier trop lourd (max 5 Mo)');
                            return;
                          }
                          setJustifFile(f);
                        }
                      }}
                    />
                    <HiDocumentText className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                    <div className="flex-1">
                      {justifFile ? (
                        <>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{justifFile.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{(justifFile.size / 1024).toFixed(1)} Ko</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Choisir un fichier</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG ou PDF — max 5 Mo</p>
                        </>
                      )}
                    </div>
                    {justifFile && (
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setJustifFile(null); }}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
                        <HiX className="h-4 w-4" />
                      </button>
                    )}
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Note (optionnel)</label>
                  <textarea
                    value={statusNote}
                    onChange={e => setStatusNote(e.target.value)}
                    rows={2}
                    placeholder="Ex: certificat médical du Dr. Bennani"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-gray-100 placeholder-gray-400"
                  />
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setPreviewDoc(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Justificatif</h3>
              <button onClick={() => setPreviewDoc(null)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <HiX className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 overflow-auto max-h-[calc(90vh-80px)]">
              {previewDoc.toLowerCase().endsWith('.pdf') ? (
                <iframe src={previewDoc} title="Justificatif" className="w-full h-[75vh] rounded-lg border border-gray-200 dark:border-gray-700" />
              ) : (
                <img src={previewDoc} alt="Justificatif" className="max-w-full h-auto rounded-lg shadow-sm mx-auto" />
              )}
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 break-all">
                <a href={previewDoc} target="_blank" rel="noreferrer" className="hover:underline">Ouvrir dans un nouvel onglet ↗</a>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AbsencesPage;
