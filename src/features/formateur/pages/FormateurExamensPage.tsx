import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../../contexts/ThemeContext';
import axiosInstance from '../../../utils/axios';
import toast from 'react-hot-toast';
import {
  HiPlus, HiPencil, HiTrash, HiDotsHorizontal,
  HiCalendar, HiClock, HiLocationMarker,
} from 'react-icons/hi';
import { Modal, Button, Input, Select, ConfirmDialog } from '../../../components/ui';
import type { SelectOption } from '../../../types';

const TYPE_OPTIONS: SelectOption[] = [
  { value: 'controle',   label: 'Contrôle continu (CC)' },
  { value: 'efm',        label: 'EFM' },
  { value: 'eff',        label: 'EFF' },
  { value: 'rattrapage', label: 'Rattrapage' },
];

const formatExamDate = (iso?: string): string => {
  if (!iso) return '—';
  const d = iso.slice(0, 10);
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

interface PlanningFormState {
  filiere_id: string;
  group_id: string;
  module_id: string;
  salle_id: string;
  type: string;
  numero: string;
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
}

const emptyPlanningForm: PlanningFormState = {
  filiere_id: '',
  group_id: '',
  module_id: '',
  salle_id: '',
  type: 'controle',
  numero: '1',
  date_examen: '',
  heure_debut: '08:30',
  heure_fin: '10:30',
};

interface Module {
  id: number;
  nom: string;
  code: string;
  coefficient: number;
}

interface GradeRow {
  stagiaire_id: number;
  name: string;
  // key: `cc_${n}` or 'efm'  →  value: number | null
  notes: Record<string, number | null>;
  abs: Record<string, boolean>;
}

interface ExamenRecord {
  id: number;
  type: string;
  numero: number | null;
}

// Grade options for the dropdown (0–20 in 0.25 steps)
const GRADE_OPTIONS: number[] = [];
for (let i = 0; i <= 20; i += 0.25) {
  GRADE_OPTIONS.push(Math.round(i * 100) / 100);
}

const FormateurExamensPage: React.FC = () => {
  const { isDark } = useTheme();

  const [filieres, setFilieres]   = useState<any[]>([]);
  const [groups, setGroups]       = useState<any[]>([]);
  const [modules, setModules]     = useState<Module[]>([]);
  const [formateur, setFormateur] = useState<any>(null);

  const [selectedFiliere,  setSelectedFiliere]  = useState('');
  const [selectedGroupe,   setSelectedGroupe]   = useState('');
  const [selectedModule,   setSelectedModule]   = useState('');
  const [numControle,      setNumControle]       = useState(2); // N° de contrôle

  // Map of column key → examen record (already saved in DB)
  const [examenMap, setExamenMap] = useState<Record<string, ExamenRecord>>({});

  const [gradeRows,   setGradeRows]   = useState<GradeRow[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [loadingNotes,setLoadingNotes]= useState(false);
  const [saving,      setSaving]      = useState(false);
  const [isSaved,     setIsSaved]     = useState(false);
  // Locked = Directeur has validated the current (group, module) notes.
  // The whole Notes UI goes read-only in that case; only a retract by the
  // Directeur can re-open it.
  const [moduleLocked, setModuleLocked] = useState(false);
  const [moduleLockInfo, setModuleLockInfo] = useState<{ validated_at: string | null; validated_by: { nom: string; prenom: string } | null } | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 7;


  // ── Tab + Planning state ──────────────────────────────────────────────────
  // Default to the Planning tab: the Formateur's primary job here is to
  // schedule his own exams. Notes entry is the secondary flow.
  const [activeTab, setActiveTab] = useState<'planning' | 'notes'>('planning');

  const [allSalles, setAllSalles] = useState<any[]>([]);
  const [examsList, setExamsList] = useState<any[]>([]);
  const [examsLoading, setExamsLoading] = useState(false);
  const [planningFilterType, setPlanningFilterType] = useState('');
  const [planningFilterGroup, setPlanningFilterGroup] = useState('');
  const [planningFilterModule, setPlanningFilterModule] = useState('');
  // Default to "À venir" — the planning tab is meant to show what's coming up.
  const [planningWhen, setPlanningWhen] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [planningSearch, setPlanningSearch] = useState('');
  const [planningFormOpen, setPlanningFormOpen] = useState(false);
  const [planningDeleteOpen, setPlanningDeleteOpen] = useState(false);
  const [planningEditing, setPlanningEditing] = useState<any>(null);
  const [planningForm, setPlanningForm] = useState<PlanningFormState>(emptyPlanningForm);
  const [planningSaving, setPlanningSaving] = useState(false);
  const [planningMenuId, setPlanningMenuId] = useState<number | null>(null);

  // Column keys derived from numControle: ['cc_1', 'cc_2', ..., 'efm']
  const columns = [
    ...Array.from({ length: numControle }, (_, i) => `cc_${i + 1}`),
    'efm',
  ];

  const colLabel = (key: string) =>
    key === 'efm' ? 'EFM' : `CC${key.split('_')[1]}`;

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        // Source of truth: /formateur/groups (explicit formateur_group pivot)
        // + /auth/formateur (includes his modules). No client-side filtering
        // on /groups anymore — the backend already scopes everything.
        const [grpRes, fmtRes] = await Promise.all([
          axiosInstance.get('/formateur/groups'),
          axiosInstance.get('/auth/formateur'),
        ]);
        const fmt = fmtRes.data.data;
        const myModules = fmt.modules || [];
        const myGroups  = grpRes.data.data || [];
        setFormateur(fmt);
        setModules(myModules);
        setGroups(myGroups);

        // Filières = union of his groups' filières + his modules' filières.
        // A formateur might have a module without a group in that filière yet
        // (or vice-versa) — keep the filière visible in either case.
        const filiereMap = new Map<number, any>();
        myGroups.forEach((g: any) => { if (g.filiere) filiereMap.set(g.filiere.id, g.filiere); });
        myModules.forEach((m: any) => { if (m.filiere) filiereMap.set(m.filiere.id, m.filiere); });
        setFilieres(Array.from(filiereMap.values()));
      } catch {
        toast.error('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // ── Load stagiaires when groupe changes ───────────────────────────────────
  useEffect(() => {
    if (!selectedGroupe) { setGradeRows([]); return; }
    axiosInstance.get(`/groups/${selectedGroupe}/stagiaires`).then(res => {
      setGradeRows(
        res.data.data.map((s: any) => ({
          stagiaire_id: s.id,
          name: `${s.user.prenom} ${s.user.nom}`,
          notes: {},
          abs: {},
        }))
      );
    }).catch(() => toast.error('Erreur lors du chargement des stagiaires'));
  }, [selectedGroupe]);

  // ── Lookup existing exams + notes when filters are fully set ──────────────
  const lookupExistingData = useCallback(async () => {
    if (!selectedModule || !selectedGroupe || !formateur) {
      setModuleLocked(false);
      setModuleLockInfo(null);
      return;
    }
    setLoadingNotes(true);
    setExamenMap({});
    setIsSaved(false);
    setModuleLocked(false);
    setModuleLockInfo(null);

    // Check validation state for this (group, module). If locked, the form
    // below goes read-only and the Save button hides.
    try {
      const statusRes = await axiosInstance.get('/notes/group-modules-status', {
        params: { group_id: selectedGroupe },
      });
      const mods: any[] = statusRes.data?.data?.modules || [];
      const thisMod = mods.find((m: any) => String(m.id) === String(selectedModule));
      if (thisMod?.is_validated) {
        setModuleLocked(true);
        setModuleLockInfo({
          validated_at: thisMod.validated_at || null,
          validated_by: thisMod.validated_by || null,
        });
      }
    } catch {
      // Non-fatal; proceed without lock info.
    }

    try {
      // Fetch all exams for this formateur+module+group combo
      const examRes = await axiosInstance.get('/examens', {
        params: {
          formateur_id: formateur.id,
          module_id: selectedModule,
          group_id: selectedGroupe,
          per_page: 20,
        },
      });
      const exams: any[] = examRes.data.data;
      if (exams.length === 0) { setLoadingNotes(false); return; }

      // Build examenMap: 'cc_1' → exam, 'efm' → exam, etc.
      const map: Record<string, ExamenRecord> = {};
      exams.forEach(ex => {
        const key = ex.type === 'controle' ? `cc_${ex.numero}` : ex.type;
        map[key] = { id: ex.id, type: ex.type, numero: ex.numero };
      });
      setExamenMap(map);

      // Detect numControle from loaded exams (max CC numero found)
      const ccNums = exams
        .filter(ex => ex.type === 'controle' && ex.numero)
        .map(ex => ex.numero as number);
      if (ccNums.length > 0) setNumControle(Math.max(...ccNums));

      // Fetch notes for each exam in parallel
      const noteRequests = Object.values(map).map(ex =>
        axiosInstance.get('/notes', { params: { examen_id: ex.id, per_page: 200 } })
          .then(r => ({ key: Object.keys(map).find(k => map[k].id === ex.id)!, notes: r.data.data }))
      );
      const allNotes = await Promise.all(noteRequests);

      // Merge into gradeRows
      setGradeRows(prev =>
        prev.map(row => {
          const updatedNotes = { ...row.notes };
          const updatedAbs   = { ...row.abs };
          allNotes.forEach(({ key, notes }) => {
            const found = notes.find((n: any) => n.stagiaire_id === row.stagiaire_id);
            if (found) {
              updatedNotes[key] = found.note;
              updatedAbs[key]   = found.note === 0;
            }
          });
          return { ...row, notes: updatedNotes, abs: updatedAbs };
        })
      );

      // isSaved reflects "grades are stored in DB", not "exam rows exist".
      // Seeded examens (CC/EFM/EFF/Rattrapage metadata) always exist per
      // (group, module), so keying off them would lock the form even with
      // zero grades entered. Key off the notes payload instead.
      const hasAnyNoteEntered = allNotes.some(({ notes }) => notes.length > 0);
      setIsSaved(hasAnyNoteEntered);
    } catch {
      // No data yet — form stays empty
    } finally {
      setLoadingNotes(false);
    }
  }, [selectedModule, selectedGroupe, formateur]);

  useEffect(() => { lookupExistingData(); }, [lookupExistingData]);

  // ── Planning: narrow the salle picker to rooms free at the chosen slot.
  // Re-fetches whenever date / heures change, and while the modal is open so
  // "I just edited this exam" retains the current salle (exclude_examen).
  // Falls back to all disponibles while the user hasn't filled the time yet.
  useEffect(() => {
    if (!planningFormOpen) return;
    const { date_examen, heure_debut, heure_fin } = planningForm;
    const params: any = {};
    if (date_examen)  params.date         = date_examen;
    if (heure_debut)  params.heure_debut  = heure_debut;
    if (heure_fin)    params.heure_fin    = heure_fin;
    if (planningEditing?.id) params.exclude_examen = planningEditing.id;
    const endpoint = (date_examen && heure_debut && heure_fin) ? '/salles-available' : '/salles-all';
    axiosInstance.get(endpoint, { params })
      .then(r => setAllSalles(r.data?.data || []))
      .catch(() => {});
  }, [planningFormOpen, planningForm.date_examen, planningForm.heure_debut, planningForm.heure_fin, planningEditing?.id]);

  useEffect(() => {
    const h = () => setPlanningMenuId(null);
    document.addEventListener('click', h);
    return () => document.removeEventListener('click', h);
  }, []);

  // ── Planning: fetch formateur's own exams when filters change ─────────────
  const fetchExamsList = useCallback(async () => {
    if (!formateur || activeTab !== 'planning') return;
    setExamsLoading(true);
    try {
      const params: any = { formateur_id: formateur.id, per_page: 200 };
      if (planningFilterType) params.type = planningFilterType;
      if (planningFilterGroup) params.group_id = planningFilterGroup;
      if (planningFilterModule) params.module_id = planningFilterModule;
      if (planningWhen !== 'all') params.when = planningWhen;
      const res = await axiosInstance.get('/examens', { params });
      setExamsList(res.data.data || []);
    } catch {
      toast.error('Erreur de chargement des examens');
    }
    setExamsLoading(false);
  }, [formateur, activeTab, planningFilterType, planningFilterGroup, planningFilterModule, planningWhen]);

  useEffect(() => { fetchExamsList(); }, [fetchExamsList]);

  // ── Planning handlers ─────────────────────────────────────────────────────
  const openCreatePlanning = () => {
    setPlanningEditing(null);
    setPlanningForm(emptyPlanningForm);
    setPlanningFormOpen(true);
  };

  const openEditPlanning = (e: any) => {
    setPlanningEditing(e);
    setPlanningForm({
      filiere_id:  String(e.group?.filiere_id || ''),
      group_id:    String(e.group_id || e.group?.id || ''),
      module_id:   String(e.module_id || e.module?.id || ''),
      salle_id:    String(e.salle_id ?? e.salle?.id ?? ''),
      type:        e.type || 'controle',
      numero:      String(e.numero ?? 1),
      date_examen: (e.date_examen || '').slice(0, 10),
      heure_debut: (e.heure_debut || '').slice(0, 5),
      heure_fin:   (e.heure_fin || '').slice(0, 5),
    });
    setPlanningFormOpen(true);
    setPlanningMenuId(null);
  };

  const handleSavePlanning = async () => {
    if (!planningForm.group_id || !planningForm.module_id || !planningForm.type ||
        !planningForm.date_examen || !planningForm.heure_debut || !planningForm.heure_fin) {
      toast.error('Groupe, module, type, date et horaires sont requis');
      return;
    }
    if (planningForm.heure_debut >= planningForm.heure_fin) {
      toast.error('L\'heure de fin doit être après l\'heure de début');
      return;
    }
    if (!formateur) return;
    setPlanningSaving(true);

    // Conflict detection is authoritative on the backend now
    // (ExamenController::detectConflict covers group/formateur/salle exam
    // overlaps + emploi-du-temps clashes). Error messages come back in the
    // catch block below.

    try {
      const payload: any = {
        group_id:     Number(planningForm.group_id),
        module_id:    Number(planningForm.module_id),
        formateur_id: formateur.id,
        salle_id:     planningForm.salle_id ? Number(planningForm.salle_id) : null,
        type:         planningForm.type,
        date_examen:  planningForm.date_examen,
        heure_debut:  planningForm.heure_debut,
        heure_fin:    planningForm.heure_fin,
      };
      if (planningForm.type === 'controle' && planningForm.numero) {
        payload.numero = Number(planningForm.numero);
      }
      if (planningEditing) {
        await axiosInstance.put(`/examens/${planningEditing.id}`, payload);
        toast.success('Examen mis à jour');
      } else {
        await axiosInstance.post('/examens', payload);
        toast.success('Examen planifié');
      }
      setPlanningFormOpen(false);
      fetchExamsList();
    } catch (err: any) {
      const errors = err.response?.data?.errors;
      const firstErr = errors ? Object.values(errors).flat()[0] : null;
      toast.error((firstErr as string) || err.response?.data?.message || 'Erreur');
    }
    setPlanningSaving(false);
  };

  const askDeletePlanning = (e: any) => {
    setPlanningEditing(e);
    setPlanningDeleteOpen(true);
    setPlanningMenuId(null);
  };

  const handleDeletePlanning = async () => {
    if (!planningEditing) return;
    try {
      await axiosInstance.delete(`/examens/${planningEditing.id}`);
      toast.success('Examen supprimé');
      setPlanningDeleteOpen(false);
      setPlanningEditing(null);
      fetchExamsList();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur');
    }
  };

  // Options scoped to the formateur's own pedagogical scope (his filières,
  // his groups, his modules). Modules further narrow to the selected filière.
  const planningFormFiliereOptions: SelectOption[] = filieres.map((f: any) => ({ value: String(f.id), label: f.nom }));
  const planningFormGroupOptions: SelectOption[] = groups
    .filter((g: any) => !planningForm.filiere_id || String(g.filiere_id) === planningForm.filiere_id)
    .map((g: any) => ({ value: String(g.id), label: g.nom }));
  const planningFormModuleOptions: SelectOption[] = modules
    .filter((m: any) => !planningForm.filiere_id || String(m.filiere_id ?? m.filiere?.id) === planningForm.filiere_id)
    .map((m: any) => ({ value: String(m.id), label: m.nom }));
  const planningFormSalleOptions: SelectOption[] = allSalles.map((s: any) => ({
    value: String(s.id),
    label: `${s.nom}${s.capacite ? ` (${s.capacite})` : ''}`,
  }));
  const planningFilterGroupOptions: SelectOption[] = groups.map((g: any) => ({ value: String(g.id), label: g.nom }));
  const planningFilterModuleOptions: SelectOption[] = modules.map((m: any) => ({ value: String(m.id), label: m.nom }));

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleNoteChange = (stagiaireId: number, col: string, value: string) => {
    setGradeRows(rows =>
      rows.map(row =>
        row.stagiaire_id === stagiaireId
          ? { ...row, notes: { ...row.notes, [col]: value !== '' ? parseFloat(value) : null }, abs: { ...row.abs, [col]: false } }
          : row
      )
    );
  };

  const handleAbsChange = (stagiaireId: number, col: string, checked: boolean) => {
    setGradeRows(rows =>
      rows.map(row =>
        row.stagiaire_id === stagiaireId
          ? { ...row, abs: { ...row.abs, [col]: checked }, notes: { ...row.notes, [col]: checked ? 0 : null } }
          : row
      )
    );
  };

  const calcMoyenne = (row: GradeRow): string => {
    const vals = columns
      .filter(c => !row.abs[c])
      .map(c => row.notes[c])
      .filter((n): n is number => n !== null && n !== undefined);
    if (vals.length === 0) return '—';
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
  };

  const handleSave = async () => {
    if (!selectedGroupe || !selectedModule || !formateur) return;

    const hasAny = gradeRows.some(r =>
      columns.some(c => r.notes[c] !== null && r.notes[c] !== undefined || r.abs[c])
    );
    if (!hasAny) { toast.error('Veuillez saisir au moins une note'); return; }

    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const updatedMap = { ...examenMap };

      // Ensure an exam record exists for each column
      for (const col of columns) {
        if (!updatedMap[col]) {
          const isCC = col.startsWith('cc_');
          const examRes = await axiosInstance.post('/examens', {
            module_id:    parseInt(selectedModule),
            group_id:     parseInt(selectedGroupe),
            formateur_id: formateur.id,
            type:         isCC ? 'controle' : col,
            numero:       isCC ? parseInt(col.split('_')[1]) : null,
            date_examen:  today,
            heure_debut:  '08:30',
            heure_fin:    '10:50',
          });
          updatedMap[col] = { id: examRes.data.data.id, type: examRes.data.data.type, numero: examRes.data.data.numero };
        }
      }
      setExamenMap(updatedMap);

      // Batch save all notes per column
      for (const col of columns) {
        const examId = updatedMap[col]?.id;
        if (!examId) continue;
        const notesData = gradeRows
          .filter(r => r.notes[col] !== null && r.notes[col] !== undefined || r.abs[col])
          .map(r => ({
            stagiaire_id: r.stagiaire_id,
            examen_id:    examId,
            note:         r.abs[col] ? 0 : r.notes[col],
          }));
        if (notesData.length > 0)
          await axiosInstance.post('/notes/batch', { notes: notesData });
      }

      toast.success('Notes enregistrées avec succès');
      setIsSaved(true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setIsSaved(false);
    setSelectedFiliere('');
    setSelectedGroupe('');
    setSelectedModule('');
    setNumControle(2);
    setExamenMap({});
    setGradeRows([]);
    setCurrentPage(1);
  };

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages   = Math.max(1, Math.ceil(gradeRows.length / rowsPerPage));
  const pagedRows    = gradeRows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const selectedModuleData = modules.find(m => m.id === parseInt(selectedModule));
  const inputDisabled = isSaved || saving || moduleLocked;

  const formatLockedAt = (iso: string | null): string => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch { return iso; }
  };

  // Pill-select style classes
  const pillCls = (disabled = false) =>
    `flex items-center gap-1 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${
      disabled
        ? isDark ? 'bg-gray-700 border-gray-600 text-gray-400 cursor-not-allowed' : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
        : isDark ? 'bg-gray-800 border-gray-600 text-white hover:border-primary-500' : 'bg-white border-gray-300 text-gray-700 hover:border-primary-400'
    }`;

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-950' : 'bg-gray-50'}`}>

      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Examens & notes</h1>
          <p className={`text-sm mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            <Link to="/formateur/dashboard" className="text-primary-600 hover:underline">Tableau de bord</Link>
            {' / '}
            <span className="text-primary-600">Académique</span>
            {' / '}
            <span>Examens & notes</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'planning' && (
            <button
              onClick={openCreatePlanning}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors"
            >
              <HiPlus className="h-4 w-4" /> Planifier examen
            </button>
          )}
        </div>
      </div>

      {/* ── Tab switcher ── */}
      <div className={`flex items-center gap-1 mb-6 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <button
          onClick={() => setActiveTab('planning')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'planning'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : `border-transparent ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`
          }`}
        >
          Planning des examens
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'notes'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : `border-transparent ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`
          }`}
        >
          Saisie des notes
        </button>
      </div>

      {/* ═══════════════════════ PLANNING TAB ═══════════════════════ */}
      {activeTab === 'planning' && (
        <div className={`rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <h2 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Mes examens planifiés</h2>
            <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {examsLoading ? '...' : (() => { const q = planningSearch.toLowerCase(); const n = q ? examsList.filter(e => (e.module?.nom || '').toLowerCase().includes(q) || (e.group?.nom || '').toLowerCase().includes(q)).length : examsList.length; return `${n} examen${n > 1 ? 's' : ''}`; })()}
            </span>
          </div>

          {/* Search bar */}
          <div className={`flex items-center gap-2 px-6 py-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="relative flex-1 max-w-sm">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={planningSearch}
                onChange={e => setPlanningSearch(e.target.value)}
                placeholder="Rechercher par module ou groupe..."
                className={`w-full pl-9 pr-4 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 ${isDark ? 'border-gray-600 bg-gray-700 text-gray-200 placeholder-gray-500' : 'border-gray-200 bg-white text-gray-700 placeholder-gray-400'}`}
              />
              {planningSearch && (
                <button onClick={() => setPlanningSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
          </div>

          <div className={`flex items-center gap-3 px-6 py-3 border-b flex-wrap ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            {/* Time-scope toggle — keeps the table focused on what still matters */}
            <div className={`inline-flex rounded-lg border overflow-hidden ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
              {([
                { v: 'upcoming', label: 'À venir' },
                { v: 'past',     label: 'Passés' },
                { v: 'all',      label: 'Tous' },
              ] as const).map(opt => {
                const active = planningWhen === opt.v;
                return (
                  <button
                    key={opt.v}
                    onClick={() => setPlanningWhen(opt.v)}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-primary-600 text-white'
                        : isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <select
              value={planningFilterType}
              onChange={e => setPlanningFilterType(e.target.value)}
              className={`text-sm border rounded-lg px-3 py-1.5 ${isDark ? 'border-gray-600 text-gray-200 bg-gray-700' : 'border-gray-200 text-gray-700 bg-white'}`}
            >
              <option value="">Tous les types</option>
              {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select
              value={planningFilterGroup}
              onChange={e => setPlanningFilterGroup(e.target.value)}
              className={`text-sm border rounded-lg px-3 py-1.5 ${isDark ? 'border-gray-600 text-gray-200 bg-gray-700' : 'border-gray-200 text-gray-700 bg-white'}`}
            >
              <option value="">Tous mes groupes</option>
              {planningFilterGroupOptions.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
            <select
              value={planningFilterModule}
              onChange={e => setPlanningFilterModule(e.target.value)}
              className={`text-sm border rounded-lg px-3 py-1.5 ${isDark ? 'border-gray-600 text-gray-200 bg-gray-700' : 'border-gray-200 text-gray-700 bg-white'}`}
            >
              <option value="">Tous mes modules</option>
              {planningFilterModuleOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            {(planningFilterType || planningFilterGroup || planningFilterModule || planningSearch || planningWhen !== 'upcoming') && (
              <button
                onClick={() => { setPlanningFilterType(''); setPlanningFilterGroup(''); setPlanningFilterModule(''); setPlanningSearch(''); setPlanningWhen('upcoming'); }}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-600"
              >
                Effacer filtres
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${isDark ? 'bg-gray-700/40 border-gray-700' : 'bg-gray-50/70 border-gray-200'}`}>
                  <th className={`px-4 py-3 text-left text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Type</th>
                  <th className={`px-4 py-3 text-left text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Module</th>
                  <th className={`px-4 py-3 text-left text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Groupe</th>
                  <th className={`px-4 py-3 text-left text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Date & heure</th>
                  <th className={`px-4 py-3 text-left text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Salle</th>
                  <th className={`px-4 py-3 text-left text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Action</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-50'}`}>
                {examsLoading ? (
                  <tr><td colSpan={6} className={`px-4 py-12 text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Chargement...</td></tr>
                ) : (() => {
                  const q = planningSearch.toLowerCase();
                  const visibleExams = q
                    ? examsList.filter(e => (e.module?.nom || '').toLowerCase().includes(q) || (e.group?.nom || '').toLowerCase().includes(q))
                    : examsList;
                  if (visibleExams.length === 0) return (
                    <tr><td colSpan={6} className={`px-4 py-12 text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{examsList.length === 0 ? 'Aucun examen planifié' : 'Aucun résultat pour cette recherche'}</td></tr>
                  );
                  return visibleExams.map((e: any) => {
                  const t = typeBadge(e.type, e.numero);
                  return (
                    <tr key={e.id} className={`transition-colors ${isDark ? 'hover:bg-gray-700/30' : 'hover:bg-gray-50/70'}`}>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${t.cls}`}>{t.label}</span>
                      </td>
                      <td className={`px-4 py-3 text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{e.module?.nom || '—'}</td>
                      <td className={`px-4 py-3 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{e.group?.nom || '—'}</td>
                      <td className={`px-4 py-3 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        <div className="flex items-center gap-1.5"><HiCalendar className="h-3.5 w-3.5 text-gray-400" />{formatExamDate(e.date_examen)}</div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-0.5"><HiClock className="h-3 w-3 text-gray-400" />{(e.heure_debut || '').slice(0, 5)} → {(e.heure_fin || '').slice(0, 5)}</div>
                      </td>
                      <td className={`px-4 py-3 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {e.salle?.nom ? (
                          <span className="inline-flex items-center gap-1"><HiLocationMarker className="h-3.5 w-3.5 text-gray-400" />{e.salle.nom}</span>
                        ) : <span className="text-gray-400 dark:text-gray-500 italic">non assignée</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="relative">
                          <button
                            onClick={(ev) => { ev.stopPropagation(); setPlanningMenuId(planningMenuId === e.id ? null : e.id); }}
                            className={`p-1.5 rounded-lg ${isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                          >
                            <HiDotsHorizontal className="h-5 w-5" />
                          </button>
                          {planningMenuId === e.id && (
                            <div className={`absolute right-0 top-full mt-1 rounded-lg shadow-lg py-1 z-10 min-w-[140px] border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                              <button onClick={(ev) => { ev.stopPropagation(); openEditPlanning(e); }} className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${isDark ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'}`}>
                                <HiPencil className="h-4 w-4" /> Modifier
                              </button>
                              <button onClick={(ev) => { ev.stopPropagation(); askDeletePlanning(e); }} className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2">
                                <HiTrash className="h-4 w-4" /> Supprimer
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════════════ NOTES TAB ═══════════════════════ */}
      {activeTab === 'notes' && <>

      {/* ── Main card ── */}
      <div className={`rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>

        {/* ── Title row ── */}
        <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Examens & notes</h2>
        </div>

        {/* ── Filter pills ── */}
        <div className={`flex items-center gap-3 px-6 py-3 border-b flex-wrap ${isDark ? 'border-gray-700 bg-gray-700/30' : 'border-gray-100 bg-gray-50'}`}>

          {/* Filières */}
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Filières</span>
            <select
              value={selectedFiliere}
              onChange={e => { setSelectedFiliere(e.target.value); setSelectedGroupe(''); setIsSaved(false); setGradeRows([]); setExamenMap({}); }}
              disabled={inputDisabled}
              className={pillCls(inputDisabled)}
            >
              <option value="">Toutes</option>
              {filieres.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
            </select>
          </div>

          {/* Groupes */}
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Groupes</span>
            <select
              value={selectedGroupe}
              onChange={e => { setSelectedGroupe(e.target.value); setIsSaved(false); setExamenMap({}); }}
              disabled={inputDisabled || !selectedFiliere}
              className={pillCls(inputDisabled || !selectedFiliere)}
            >
              <option value="">—</option>
              {groups
                .filter(g => !selectedFiliere || g.filiere_id === parseInt(selectedFiliere))
                .map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
            </select>
          </div>

          {/* Modules */}
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Modules</span>
            <select
              value={selectedModule}
              onChange={e => { setSelectedModule(e.target.value); setIsSaved(false); setExamenMap({}); }}
              disabled={inputDisabled || !selectedGroupe}
              className={pillCls(inputDisabled || !selectedGroupe)}
            >
              <option value="">—</option>
              {modules.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
            </select>
          </div>

          {/* Coeff (read-only display) */}
          {selectedModuleData && (
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Coeff</span>
              <span className={pillCls()}>{selectedModuleData.coefficient}</span>
            </div>
          )}

          {/* N° de contrôle */}
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>N° de contrôle</span>
            <select
              value={numControle}
              onChange={e => { setNumControle(parseInt(e.target.value)); setIsSaved(false); setExamenMap({}); }}
              disabled={inputDisabled}
              className={pillCls(inputDisabled)}
            >
              {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          {isSaved && !moduleLocked && (
            <span className="ml-auto px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
              ✓ Enregistré
            </span>
          )}
          {moduleLocked && (
            <span className="ml-auto px-3 py-1 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 inline-flex items-center gap-1">
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 1a4 4 0 00-4 4v3H5a2 2 0 00-2 2v8a2 2 0 002 2h10a2 2 0 002-2v-8a2 2 0 00-2-2h-1V5a4 4 0 00-4-4zm2 7V5a2 2 0 10-4 0v3h4z" clipRule="evenodd" /></svg>
              Notes verrouillées
            </span>
          )}
        </div>

        {/* ── Locked banner (Directeur validated this module's notes) ── */}
        {moduleLocked && (
          <div className={`mx-6 my-3 px-4 py-3 rounded-lg border ${isDark ? 'bg-red-900/10 border-red-900/40' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-start gap-3">
              <svg className={`h-5 w-5 mt-0.5 flex-shrink-0 ${isDark ? 'text-red-400' : 'text-red-600'}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 1a4 4 0 00-4 4v3H5a2 2 0 00-2 2v8a2 2 0 002 2h10a2 2 0 002-2v-8a2 2 0 00-2-2h-1V5a4 4 0 00-4-4zm2 7V5a2 2 0 10-4 0v3h4z" clipRule="evenodd" />
              </svg>
              <div className="flex-1 text-sm">
                <p className={`font-semibold ${isDark ? 'text-red-300' : 'text-red-800'}`}>
                  Ces notes ont été validées par le Directeur — modifications verrouillées.
                </p>
                <p className={`text-xs mt-1 ${isDark ? 'text-red-400/80' : 'text-red-700/80'}`}>
                  {moduleLockInfo?.validated_at && `Validée le ${formatLockedAt(moduleLockInfo.validated_at)}. `}
                  Pour corriger une note, demandez au Directeur de retirer la validation depuis son espace « Notes ».
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Table ── */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`border-b ${isDark ? 'bg-gray-700/40 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                <th className="w-10 px-4 py-3">
                  <input type="checkbox" className="rounded border-gray-300" />
                </th>
                <th className={`px-4 py-3 text-left text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Stagiaire
                </th>
                {columns.map(col => (
                  <th key={col} className={`px-4 py-3 text-center text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {colLabel(col)}
                  </th>
                ))}
                <th className={`px-4 py-3 text-center text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Moyenne
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-100'}`}>
              {loading || loadingNotes ? (
                <tr>
                  <td colSpan={columns.length + 3} className={`px-4 py-10 text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Chargement...
                  </td>
                </tr>
              ) : pagedRows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 3} className={`px-4 py-10 text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Sélectionnez une filière, un groupe et un module
                  </td>
                </tr>
              ) : (
                pagedRows.map((row) => (
                  <tr key={row.stagiaire_id} className={`transition-colors ${isDark ? 'hover:bg-gray-700/30' : 'hover:bg-gray-50'}`}>
                    <td className="px-4 py-3">
                      <input type="checkbox" className="rounded border-gray-300" />
                    </td>
                    <td className={`px-4 py-3 text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {row.name}
                    </td>
                    {columns.map(col => (
                      <td key={col} className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          {/* Grade input — free decimal entry, 0-20 */}
                          <input
                            type="text"
                            inputMode="decimal"
                            value={row.abs[col] ? '' : row.notes[col] ?? ''}
                            onChange={e => {
                              // Only digits and a single decimal separator (. or ,)
                              const raw = e.target.value.replace(',', '.');
                              if (raw !== '' && !/^\d*\.?\d*$/.test(raw)) return;
                              const num = raw === '' ? '' : parseFloat(raw);
                              if (num !== '' && (num < 0 || num > 20)) return;
                              handleNoteChange(row.stagiaire_id, col, raw);
                            }}
                            onBlur={e => {
                              // Clamp + round to 2 decimals on blur
                              const n = parseFloat(e.target.value);
                              if (!isNaN(n)) {
                                const clamped = Math.max(0, Math.min(20, n));
                                handleNoteChange(row.stagiaire_id, col, String(Math.round(clamped * 100) / 100));
                              }
                            }}
                            placeholder="—"
                            disabled={row.abs[col] || inputDisabled}
                            className={`w-16 text-sm border rounded px-1.5 py-1 text-center ${
                              row.abs[col] || inputDisabled
                                ? isDark ? 'bg-gray-600 border-gray-500 text-gray-400 cursor-not-allowed' : 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                                : isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                            }`}
                          />
                          {/* ABS label + checkbox */}
                          <label className={`flex items-center gap-1 text-xs select-none ${inputDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            <input
                              type="checkbox"
                              checked={row.abs[col] || false}
                              onChange={e => handleAbsChange(row.stagiaire_id, col, e.target.checked)}
                              disabled={inputDisabled}
                              className="rounded border-gray-300 text-primary-600"
                            />
                            ABS
                          </label>
                        </div>
                      </td>
                    ))}
                    <td className={`px-4 py-3 text-center text-sm font-bold ${
                      calcMoyenne(row) === '—'
                        ? isDark ? 'text-gray-500' : 'text-gray-400'
                        : parseFloat(calcMoyenne(row)) >= 12
                          ? isDark ? 'text-green-400' : 'text-green-600'
                          : isDark ? 'text-red-400' : 'text-red-600'
                    }`}>
                      {calcMoyenne(row)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {gradeRows.length > rowsPerPage && (
          <div className={`flex items-center justify-end gap-1 px-6 py-3 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                currentPage === 1
                  ? isDark ? 'text-gray-600 cursor-not-allowed' : 'text-gray-300 cursor-not-allowed'
                  : isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Pre
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setCurrentPage(p)}
                className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                  p === currentPage
                    ? 'bg-primary-600 text-white'
                    : isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                currentPage === totalPages
                  ? isDark ? 'text-gray-600 cursor-not-allowed' : 'text-gray-300 cursor-not-allowed'
                  : isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* ── Bottom action bar ── */}
      {/* Modifier shows only when notes are already saved in the DB — an empty
          form lets the Formateur type directly and hit Enregistrer. Once saved
          the inputs lock (inputDisabled) and Modifier re-opens them. */}
      <div className="flex justify-end gap-3 mt-6">
        {isSaved && !moduleLocked && (
          <button
            onClick={() => setIsSaved(false)}
            className={`px-6 py-3 rounded-xl text-sm font-medium transition-colors ${isDark ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
          >
            Modifier
          </button>
        )}
        {!moduleLocked && (
          <button
            onClick={handleSave}
            disabled={!selectedGroupe || !selectedModule || inputDisabled}
            className={`px-8 py-3 rounded-xl text-sm font-medium transition-colors ${
              !selectedGroupe || !selectedModule || inputDisabled
                ? isDark ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-primary-600 text-white hover:bg-primary-700'
            }`}
          >
            {saving ? 'Enregistrement...' : 'Enregistrer les notes'}
          </button>
        )}
      </div>
      </>}

      {/* ── Planning form modal ── */}
      <Modal
        isOpen={planningFormOpen}
        onClose={() => setPlanningFormOpen(false)}
        title={planningEditing ? 'Modifier l\'examen' : 'Planifier un examen'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPlanningFormOpen(false)}>Annuler</Button>
            <Button onClick={handleSavePlanning} loading={planningSaving}>Enregistrer</Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Filière"
              value={planningForm.filiere_id}
              onChange={e => setPlanningForm(p => ({ ...p, filiere_id: e.target.value, group_id: '', module_id: '' }))}
              options={[{ value: '', label: 'Choisir une filière' }, ...planningFormFiliereOptions]}
              required
            />
            <Select
              label="Groupe"
              value={planningForm.group_id}
              onChange={e => setPlanningForm(p => ({ ...p, group_id: e.target.value }))}
              options={[{ value: '', label: planningForm.filiere_id ? 'Choisir un groupe' : 'Filière requise' }, ...planningFormGroupOptions]}
              required
            />
          </div>
          <Select
            label="Module"
            value={planningForm.module_id}
            onChange={e => setPlanningForm(p => ({ ...p, module_id: e.target.value }))}
            options={[{ value: '', label: planningForm.filiere_id ? 'Choisir un module' : 'Filière requise' }, ...planningFormModuleOptions]}
            required
          />
          <div className="grid grid-cols-3 gap-4">
            <Select
              label="Type"
              value={planningForm.type}
              onChange={e => setPlanningForm(p => ({ ...p, type: e.target.value }))}
              options={TYPE_OPTIONS}
              required
            />
            {planningForm.type === 'controle' && (
              <Select
                label="Numéro"
                value={planningForm.numero}
                onChange={e => setPlanningForm(p => ({ ...p, numero: e.target.value }))}
                options={[{ value: '1', label: 'CC1' }, { value: '2', label: 'CC2' }, { value: '3', label: 'CC3' }]}
              />
            )}
            <Select
              label="Salle"
              value={planningForm.salle_id}
              onChange={e => setPlanningForm(p => ({ ...p, salle_id: e.target.value }))}
              options={[{ value: '', label: 'Salle non assignée' }, ...planningFormSalleOptions]}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Date" type="date" value={planningForm.date_examen} onChange={e => setPlanningForm(p => ({ ...p, date_examen: e.target.value }))} required />
            <Input label="Heure début" type="time" value={planningForm.heure_debut} onChange={e => setPlanningForm(p => ({ ...p, heure_debut: e.target.value }))} required />
            <Input label="Heure fin" type="time" value={planningForm.heure_fin} onChange={e => setPlanningForm(p => ({ ...p, heure_fin: e.target.value }))} required />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-lg px-3 py-2">
            Vous planifiez cet examen en tant que formateur responsable. Les notes pourront ensuite être saisies dans l'onglet « Saisie des notes ».
          </p>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={planningDeleteOpen}
        onClose={() => setPlanningDeleteOpen(false)}
        onConfirm={handleDeletePlanning}
        title="Supprimer l'examen"
        message={`Supprimer cet examen (${planningEditing?.module?.nom || ''} — ${planningEditing?.group?.nom || ''}) ? Les notes associées seront également supprimées.`}
      />
    </div>
  );
};

export default FormateurExamensPage;
