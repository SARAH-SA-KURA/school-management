import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { absencesApi, dropdownApi, stagiairesApi, modulesApi } from '../../../api/crudApi';
import { TableColumn, SelectOption } from '../../../types';
import { DataTable, Modal, Button, Input, Select } from '../../../components/ui';
import toast from 'react-hot-toast';
import { useDebounce } from '../../../hooks/useDebounce';
import { useRolePath } from '../../../hooks/useRolePath';
import { useAuth } from '../../../hooks/useAuth';
import { HiX, HiDownload, HiExclamation, HiPlus } from 'react-icons/hi';
import axiosInstance from '../../../api/axiosInstance';
import * as XLSX from 'xlsx';

interface Stats {
  total: number;
  non_justifiee_count: number;
  en_attente_count: number;
  justifiee_count: number;
  non_justifiee_hours: number;
  en_attente_hours: number;
  justifiee_hours: number;
}

interface AbsenceSummaryRow {
  id: number; // alias of stagiaire_id for DataTable's row key
  stagiaire_id: number;
  cef: string;
  nom: string;
  prenom: string;
  group: string;
  group_id: number;
  filiere: string;
  filiere_id: number | null;
  total_hours: number;
  justified_hours: number;
  non_justified_hours: number;
  en_attente_hours: number;
  total_count: number;
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const canWrite = user?.role === 'surveillant';
  const isSurveillant = user?.role === 'surveillant';

  const [summary, setSummary] = useState<AbsenceSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [warningsOpen, setWarningsOpen] = useState(true);

  // Cascading filters
  const [filterFiliere, setFilterFiliere] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [filterStagiaire, setFilterStagiaire] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterWeek, setFilterWeek] = useState('');
  const [allFilieres, setAllFilieres] = useState<any[]>([]);
  const [allGroups, setAllGroups] = useState<any[]>([]);
  const [groupStagiaires, setGroupStagiaires] = useState<any[]>([]);

  // Create-absence modal (Surveillant only)
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
  const debouncedSearch = useDebounce(search);

  const dateRange = useMemo(() => {
    if (!filterYear) return { from: '', to: '' };
    const y = parseInt(filterYear, 10);
    if (!filterMonth) return { from: `${y}-01-01`, to: `${y}-12-31` };
    const m = parseInt(filterMonth, 10);
    const mm = String(m).padStart(2, '0');
    if (!filterWeek) {
      const lastDay = new Date(y, m, 0).getDate();
      return { from: `${y}-${mm}-01`, to: `${y}-${mm}-${String(lastDay).padStart(2, '0')}` };
    }
    const w = parseInt(filterWeek, 10);
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
      if (filterFiliere) params.filiere_id = filterFiliere;
      if (filterGroup) params.group_id = filterGroup;
      if (filterStagiaire) params.stagiaire_id = filterStagiaire;
      if (dateRange.from) params.date_from = dateRange.from;
      if (dateRange.to)   params.date_to   = dateRange.to;
      const res = await absencesApi.getSummary(params);
      const rows: AbsenceSummaryRow[] = (res.data.data as any[]).map((r) => ({ ...r, id: r.stagiaire_id }));
      setSummary(rows);
      setTotalPages(res.data.meta.last_page);
      setTotalItems(res.data.meta.total);
    } catch {
      toast.error('Erreur de chargement');
    }
    setLoading(false);
  }, [page, debouncedSearch, perPage, filterFiliere, filterGroup, filterStagiaire, dateRange]);

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

  useEffect(() => {
    dropdownApi.filieres().then(r => setAllFilieres(r.data?.data || [])).catch(() => {});
    dropdownApi.groups().then(r => setAllGroups(r.data?.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!filterGroup) { setGroupStagiaires([]); return; }
    stagiairesApi.getAll({ group_id: filterGroup, per_page: 500 })
      .then(r => setGroupStagiaires(r.data?.data || []))
      .catch(() => setGroupStagiaires([]));
  }, [filterGroup]);

  useEffect(() => { setFilterGroup(''); setFilterStagiaire(''); }, [filterFiliere]);
  useEffect(() => { setFilterStagiaire(''); }, [filterGroup]);
  useEffect(() => { setFilterMonth(''); setFilterWeek(''); }, [filterYear]);
  useEffect(() => { setFilterWeek(''); }, [filterMonth]);

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

  const handlePerPageChange = (newPerPage: number) => { setPerPage(newPerPage); setPage(1); };

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

  const activeFilterCount = [filterFiliere, filterGroup, filterStagiaire, filterYear, filterMonth, filterWeek].filter(Boolean).length;
  const clearAllFilters = () => {
    setFilterFiliere(''); setFilterGroup(''); setFilterStagiaire('');
    setFilterYear(''); setFilterMonth(''); setFilterWeek('');
  };

  const handleExport = async () => {
    try {
      const params: any = { per_page: 5000 };
      if (filterFiliere) params.filiere_id = filterFiliere;
      if (filterGroup) params.group_id = filterGroup;
      if (filterStagiaire) params.stagiaire_id = filterStagiaire;
      if (dateRange.from) params.date_from = dateRange.from;
      if (dateRange.to) params.date_to = dateRange.to;
      if (debouncedSearch) params.search = debouncedSearch;
      const res = await absencesApi.getSummary(params);
      const rows = (res.data.data as AbsenceSummaryRow[]).map((r, i) => ({
        '#': i + 1,
        'ID':                String(r.cef || `STG-${r.stagiaire_id}`),
        'Stagiaire':         `${r.prenom} ${r.nom}`.trim(),
        'Groupe':            r.group,
        'Filière':           r.filiere,
        'Total heures':      r.total_hours,
        'Justifiées (h)':    r.justified_hours,
        'Non justifiées (h)': r.non_justified_hours,
        'En attente (h)':    r.en_attente_hours,
        'Nb absences':       r.total_count,
      }));
      if (rows.length === 0) { toast.error('Aucune donnée à exporter'); return; }
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [{ wch: 5 }, { wch: 12 }, { wch: 25 }, { wch: 14 }, { wch: 28 }, { wch: 13 }, { wch: 14 }, { wch: 16 }, { wch: 13 }, { wch: 12 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Absences - Synthèse');
      XLSX.writeFile(wb, `Absences_synthese_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(`${rows.length} stagiaire(s) exporté(s)`);
    } catch {
      toast.error('Erreur lors de l\'export');
    }
  };

  const summaryColumns: TableColumn<AbsenceSummaryRow>[] = [
    {
      key: 'cef', label: 'ID', sortable: true,
      render: (r) => <span className="text-primary-600 dark:text-primary-400 font-medium">{r.cef || `STG-${r.stagiaire_id}`}</span>,
    },
    {
      key: 'stagiaire', label: 'Stagiaire', sortable: true,
      render: (r) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-gray-100">{r.prenom} {r.nom}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{r.group} · {r.filiere}</div>
        </div>
      ),
    },
    {
      key: 'total_hours', label: 'Total heures', sortable: true,
      render: (r) => <span className="font-semibold text-gray-900 dark:text-gray-100">{r.total_hours}h</span>,
    },
    {
      key: 'justified_hours', label: 'Justifiées', sortable: true,
      render: (r) => (
        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400">
          {r.justified_hours}h
        </span>
      ),
    },
    {
      key: 'non_justified_hours', label: 'Non justifiées', sortable: true,
      render: (r) => (
        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
          r.non_justified_hours >= 36
            ? 'bg-red-600 text-white'
            : r.non_justified_hours > 0
              ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
        }`}>
          {r.non_justified_hours}h
        </span>
      ),
    },
    {
      key: 'en_attente_hours', label: 'En attente', sortable: true,
      render: (r) => (
        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
          r.en_attente_hours > 0
            ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
        }`}>
          {r.en_attente_hours}h
        </span>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
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

      {/* Summary Cards */}
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
                    <tr
                      key={w.stagiaire_id}
                      className={`hover:bg-red-100/30 dark:hover:bg-red-900/20 ${isSurveillant ? 'cursor-pointer' : ''}`}
                      onClick={() => isSurveillant && navigate(`/surveillant/absences/${w.stagiaire_id}`)}
                    >
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
        columns={summaryColumns}
        data={summary}
        loading={loading}
        currentPage={page}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={perPage}
        onPageChange={setPage}
        perPage={perPage}
        onPerPageChange={handlePerPageChange}
        searchValue={search}
        onSearchChange={(val) => { setSearch(val); setPage(1); }}
        onRowClick={isSurveillant ? (r) => navigate(`/surveillant/absences/${r.stagiaire_id}`) : undefined}
        headerContent={
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Synthèse par stagiaire</h3>
              {isSurveillant && (
                <p className="text-xs text-gray-500 dark:text-gray-400">Cliquez une ligne pour gérer les absences du stagiaire</p>
              )}
            </div>
          </div>
        }
      />

      {/* Create absence modal (Surveillant only) */}
      {canWrite && (
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
      )}
    </div>
  );
};

export default AbsencesPage;
