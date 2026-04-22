import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { stagiairesApi, dropdownApi } from '../../../api/crudApi';
import { Stagiaire, TableColumn, SelectOption } from '../../../types';
import { DataTable, Modal, Button, Input, Select, ConfirmDialog } from '../../../components/ui';
import {
  HiSortAscending, HiX, HiMail, HiPhone, HiLocationMarker, HiCalendar,
  HiIdentification, HiAcademicCap, HiUserGroup, HiPlus, HiPencil, HiTrash,
  HiDotsHorizontal, HiUpload, HiPrinter, HiFilter, HiDownload,
} from 'react-icons/hi';
import * as XLSX from 'xlsx';
import { formatDate } from '../../../utils/formatters';
import toast from 'react-hot-toast';
import { useDebounce } from '../../../hooks/useDebounce';
import { useAuth } from '../../../hooks/useAuth';

const BACKEND_URL = (process.env.REACT_APP_API_URL || 'http://localhost:8000/api').replace('/api', '');
const getAvatarUrl = (avatar?: string | null) => {
  if (!avatar) return null;
  if (avatar.startsWith('http')) return avatar;
  return `${BACKEND_URL}${avatar}`;
};

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  actif:    { label: 'Actif',      bg: 'bg-green-100',  text: 'text-green-700' },
  abandon:  { label: 'Abandon',    bg: 'bg-red-100',    text: 'text-red-700' },
  suspendu: { label: 'Suspendu',   bg: 'bg-yellow-100', text: 'text-yellow-700' },
  diplome:  { label: 'Diplômé',    bg: 'bg-blue-100',   text: 'text-blue-700' },
};

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'actif', label: 'Actif' },
  { value: 'suspendu', label: 'Suspendu' },
  { value: 'abandon', label: 'Abandon' },
  { value: 'diplome', label: 'Diplômé' },
];

interface GroupOption { id: number; nom: string; filiere_id?: number; filiere?: { nom?: string } }
interface FiliereOption { id: number; nom: string; code?: string }

const escapeHtml = (str: any): string =>
  String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Column definitions for the export/print picker. Each column knows how to
// pull its value from a stagiaire row — used by both the print HTML and the
// Excel export so the two stay consistent.
type ExportColKey =
  | 'cef' | 'cne' | 'cin'
  | 'prenom' | 'nom' | 'email' | 'telephone'
  | 'date_naissance' | 'adresse'
  | 'groupe' | 'filiere'
  | 'date_inscription' | 'statut';

interface ExportColDef {
  key: ExportColKey;
  label: string;
  accessor: (r: any) => string;
}

const EXPORT_COLUMNS: ExportColDef[] = [
  { key: 'cef',              label: 'CEF',              accessor: r => r.cef || '' },
  { key: 'cne',              label: 'CNE',              accessor: r => r.cne || '' },
  { key: 'cin',              label: 'CIN',              accessor: r => r.cin || '' },
  { key: 'prenom',           label: 'Prénom',           accessor: r => r.user?.prenom || '' },
  { key: 'nom',              label: 'Nom',              accessor: r => r.user?.nom || '' },
  { key: 'email',            label: 'Email',            accessor: r => r.user?.email || '' },
  { key: 'telephone',        label: 'Téléphone',        accessor: r => r.user?.telephone || '' },
  { key: 'date_naissance',   label: 'Date de naissance', accessor: r => r.date_naissance ? String(r.date_naissance).slice(0, 10) : '' },
  { key: 'adresse',          label: 'Adresse',          accessor: r => r.adresse || '' },
  { key: 'groupe',           label: 'Groupe',           accessor: r => r.group?.nom || '' },
  { key: 'filiere',          label: 'Filière',          accessor: r => r.group?.filiere?.nom || '' },
  { key: 'date_inscription', label: 'Date d\'inscription', accessor: r => r.date_inscription ? String(r.date_inscription).slice(0, 10) : '' },
  { key: 'statut',           label: 'Statut',           accessor: r => r.status || '' },
];

const DEFAULT_EXPORT_COLS: ExportColKey[] = ['cef', 'prenom', 'nom', 'telephone', 'groupe', 'filiere'];

interface StagiaireFormState {
  nom: string;
  prenom: string;
  email: string;
  password: string;
  telephone: string;
  cef: string;
  cne: string;
  cin: string;
  group_id: string;
  date_inscription: string;
  date_naissance: string;
  adresse: string;
  status: string;
}

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm: StagiaireFormState = {
  nom: '', prenom: '', email: '', password: '', telephone: '',
  cef: '', cne: '', cin: '',
  group_id: '',
  date_inscription: today(),
  date_naissance: '',
  adresse: '',
  status: 'actif',
};

interface StagiaireCsvRow {
  nom: string;
  prenom: string;
  email: string;
  password: string;
  cef: string;
  cne: string;
  cin: string;
  date_naissance: string;
  telephone?: string;
  adresse?: string;
}

interface CsvParseResult {
  rows: StagiaireCsvRow[];
  inFileDupes: number;
}

const parseStagiairesCsv = (text: string): CsvParseResult => {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return { rows: [], inFileDupes: 0 };

  const header = lines[0].split(/[,;\t]/).map(h => h.trim().toLowerCase());
  const idx = (name: string) => header.findIndex(h => h === name || h.startsWith(name));

  const iNom = idx('nom'), iPrenom = idx('prenom'), iEmail = idx('email'),
        iPass = idx('password'), iCef = idx('cef'), iCne = idx('cne'), iCin = idx('cin'),
        iDob = idx('date_naissance'), iTel = idx('telephone'), iAdr = idx('adresse');

  const rows: StagiaireCsvRow[] = [];
  // Dedup within the file — matches the backend's normalization so a
  // client-side preview won't pass rows the server will then reject.
  const seenEmail = new Set<string>();
  const seenCef   = new Set<string>();
  const seenCne   = new Set<string>();
  const seenCin   = new Set<string>();
  let inFileDupes = 0;

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(/[,;\t]/).map(s => s.trim());
    const get = (j: number) => (j >= 0 ? (parts[j] || '') : '');
    const nom = get(iNom), prenom = get(iPrenom);
    const email = get(iEmail).toLowerCase();
    const cef = get(iCef).toUpperCase();
    const cne = get(iCne).toUpperCase();
    const cin = get(iCin).toUpperCase();
    const password = get(iPass);
    const dob = get(iDob);
    if (!nom || !prenom || !email || !password || !cef || !cne || !cin || !dob) continue;

    if (seenEmail.has(email) || seenCef.has(cef) || seenCne.has(cne) || seenCin.has(cin)) {
      inFileDupes++;
      continue;
    }
    seenEmail.add(email); seenCef.add(cef); seenCne.add(cne); seenCin.add(cin);

    rows.push({
      nom, prenom, email, password, cef, cne, cin, date_naissance: dob,
      telephone: get(iTel) || undefined,
      adresse: get(iAdr) || undefined,
    });
  }
  return { rows, inFileDupes };
};

const AvatarCircle: React.FC<{ user: any; size?: string }> = ({ user, size = 'h-14 w-14' }) => {
  const [imgError, setImgError] = useState(false);
  const avatarUrl = getAvatarUrl(user?.avatar);
  const showImg = avatarUrl && !imgError;
  return (
    <div className={`${size} bg-primary-500 rounded-full overflow-hidden flex items-center justify-center text-white text-xl font-bold`}>
      {showImg ? (
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" onError={() => setImgError(true)} />
      ) : (
        <>{user?.prenom?.charAt(0)}{user?.nom?.charAt(0)}</>
      )}
    </div>
  );
};

const ProfileModal: React.FC<{ stagiaire: any; onClose: () => void }> = ({ stagiaire, onClose }) => {
  if (!stagiaire) return null;
  const s = stagiaire;
  const status = statusConfig[s.status] || statusConfig.actif;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="bg-gray-900 rounded-t-2xl px-6 py-5 text-white relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white">
            <HiX className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-4">
            <AvatarCircle user={s.user} />
            <div>
              <h2 className="text-xl font-bold">{s.user?.prenom} {s.user?.nom}</h2>
              <p className="text-sm text-gray-300">{s.cef}</p>
            </div>
          </div>
          <span className={`absolute top-5 right-14 px-3 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text} dark:bg-opacity-20`}>
            {status.label}
          </span>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Informations personnelles</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3"><HiIdentification className="h-5 w-5 text-gray-400 dark:text-gray-500 mt-0.5" /><div><p className="text-xs text-gray-500 dark:text-gray-400">CIN</p><p className="text-sm font-medium text-gray-900 dark:text-gray-100">{s.cin}</p></div></div>
              <div className="flex items-start gap-3"><HiIdentification className="h-5 w-5 text-gray-400 dark:text-gray-500 mt-0.5" /><div><p className="text-xs text-gray-500 dark:text-gray-400">CNE</p><p className="text-sm font-medium text-gray-900 dark:text-gray-100">{s.cne}</p></div></div>
              <div className="flex items-start gap-3"><HiCalendar className="h-5 w-5 text-gray-400 dark:text-gray-500 mt-0.5" /><div><p className="text-xs text-gray-500 dark:text-gray-400">Date de naissance</p><p className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatDate(s.date_naissance)}</p></div></div>
              <div className="flex items-start gap-3"><HiPhone className="h-5 w-5 text-gray-400 dark:text-gray-500 mt-0.5" /><div><p className="text-xs text-gray-500 dark:text-gray-400">Téléphone</p><p className="text-sm font-medium text-gray-900 dark:text-gray-100">{s.user?.telephone || '-'}</p></div></div>
              <div className="flex items-start gap-3 col-span-2"><HiMail className="h-5 w-5 text-gray-400 dark:text-gray-500 mt-0.5" /><div><p className="text-xs text-gray-500 dark:text-gray-400">Email</p><p className="text-sm font-medium text-gray-900 dark:text-gray-100">{s.user?.email}</p></div></div>
              <div className="flex items-start gap-3 col-span-2"><HiLocationMarker className="h-5 w-5 text-gray-400 dark:text-gray-500 mt-0.5" /><div><p className="text-xs text-gray-500 dark:text-gray-400">Adresse</p><p className="text-sm font-medium text-gray-900 dark:text-gray-100">{s.adresse || '-'}</p></div></div>
            </div>
          </div>

          <hr className="border-gray-100 dark:border-gray-700" />

          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Informations académiques</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3"><HiUserGroup className="h-5 w-5 text-gray-400 dark:text-gray-500 mt-0.5" /><div><p className="text-xs text-gray-500 dark:text-gray-400">Groupe</p><p className="text-sm font-medium text-gray-900 dark:text-gray-100">{s.group?.nom || '-'}</p></div></div>
              <div className="flex items-start gap-3"><HiAcademicCap className="h-5 w-5 text-gray-400 dark:text-gray-500 mt-0.5" /><div><p className="text-xs text-gray-500 dark:text-gray-400">Filière</p><p className="text-sm font-medium text-gray-900 dark:text-gray-100">{s.group?.filiere?.nom || '-'}</p></div></div>
              <div className="flex items-start gap-3"><HiCalendar className="h-5 w-5 text-gray-400 dark:text-gray-500 mt-0.5" /><div><p className="text-xs text-gray-500 dark:text-gray-400">Date d'inscription</p><p className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatDate(s.date_inscription)}</p></div></div>
            </div>
          </div>

          {s.absences && s.absences.length > 0 && (
            <>
              <hr className="border-gray-100 dark:border-gray-700" />
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Absences ({s.absences.length})</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {s.absences.slice(0, 5).map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-lg px-4 py-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{a.module?.nom || 'Module'}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(a.date_absence)} - {a.heure_debut}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        a.status === 'justifiee' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                        a.status === 'en_attente' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                        'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      }`}>
                        {a.status === 'justifiee' ? 'Justifiée' : a.status === 'en_attente' ? 'En attente' : 'Non justifiée'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700">
          <button onClick={onClose} className="w-full py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

const StagiairesPage: React.FC = () => {
  const { user } = useAuth();
  const basePath = user?.role === 'surveillant' ? '/surveillant' : '/admin';
  const canWrite = user?.role === 'surveillant';
  const [searchParams, setSearchParams] = useSearchParams();
  const groupIdParam = searchParams.get('group_id');
  const groupNomParam = searchParams.get('group_nom');

  const [data, setData] = useState<Stagiaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [profileData, setProfileData] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Stagiaire | null>(null);
  const [form, setForm] = useState<StagiaireFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [groupOptions, setGroupOptions] = useState<GroupOption[]>([]);
  const [filiereOptions, setFiliereOptions] = useState<FiliereOption[]>([]);
  const [filiereFilter, setFiliereFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  // Column-picker modal: one UI, two actions (print or xlsx export).
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<'print' | 'excel'>('print');
  const [pickerCols, setPickerCols] = useState<Set<ExportColKey>>(new Set(DEFAULT_EXPORT_COLS));
  const [pickerBusy, setPickerBusy] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvGroupId, setCsvGroupId] = useState('');
  const [csvRows, setCsvRows] = useState<StagiaireCsvRow[]>([]);
  const [csvFileName, setCsvFileName] = useState('');
  const [csvImporting, setCsvImporting] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const debouncedSearch = useDebounce(search);

  const buildFilterParams = useCallback(() => {
    const params: any = {};
    if (debouncedSearch) params.search = debouncedSearch;
    // URL param takes precedence over the dropdown selection
    const effectiveGroupId = groupIdParam || groupFilter;
    if (effectiveGroupId) params.group_id = effectiveGroupId;
    if (filiereFilter) params.filiere_id = filiereFilter;
    if (statusFilter) params.status = statusFilter;
    return params;
  }, [debouncedSearch, groupIdParam, groupFilter, filiereFilter, statusFilter]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        ...buildFilterParams(),
        page,
        per_page: perPage,
        sort_by: 'nom',
        sort_dir: sortDir,
      };
      const res = await stagiairesApi.getAll(params);
      setData(res.data.data);
      setTotalPages(res.data.meta.last_page);
      setTotalItems(res.data.meta.total);
    } catch {
      toast.error('Erreur de chargement');
    }
    setLoading(false);
  }, [page, perPage, sortDir, buildFilterParams]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [groupIdParam, filiereFilter, groupFilter, statusFilter, debouncedSearch]);

  useEffect(() => {
    const handler = () => setOpenMenuId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // Load filières + groups for everyone (filter dropdowns need them, not just Surveillant)
  useEffect(() => {
    dropdownApi.groups()
      .then(res => {
        const list: any[] = res.data?.data || [];
        setGroupOptions(list.map(g => ({ id: g.id, nom: g.nom, filiere_id: g.filiere_id, filiere: g.filiere })));
      })
      .catch(() => {});
    dropdownApi.filieres()
      .then(res => {
        const list: any[] = res.data?.data || [];
        setFiliereOptions(list.map((f: any) => ({ id: f.id, nom: f.nom, code: f.code })));
      })
      .catch(() => {});
  }, []);

  const handlePerPageChange = (newPerPage: number) => { setPerPage(newPerPage); setPage(1); };
  const toggleSort = () => { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); setPage(1); };

  const openProfile = async (id: number) => {
    setProfileLoading(true);
    setProfileData(null);
    setOpenMenuId(null);
    try {
      const res = await stagiairesApi.getById(id);
      setProfileData(res.data.data);
    } catch { toast.error('Erreur lors du chargement du profil'); }
    setProfileLoading(false);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, date_inscription: today() });
    setFormOpen(true);
  };

  // URL-triggered create/edit — entry point for adding a Stagiaire can also
  // come from /admin/utilisateurs (the single add-user UX hands off here).
  useEffect(() => {
    const createFlag = searchParams.get('create');
    const editId     = searchParams.get('edit');
    if (createFlag === '1') {
      openCreate();
      searchParams.delete('create');
      setSearchParams(searchParams, { replace: true });
    } else if (editId) {
      stagiairesApi.getById(Number(editId))
        .then(res => {
          openEdit(res.data.data as Stagiaire);
          searchParams.delete('edit');
          setSearchParams(searchParams, { replace: true });
        })
        .catch(() => toast.error('Stagiaire introuvable'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const openEdit = (s: Stagiaire) => {
    setEditing(s);
    const anyS = s as any;
    setForm({
      nom:              anyS.user?.nom || '',
      prenom:           anyS.user?.prenom || '',
      email:            anyS.user?.email || '',
      password:         '',
      telephone:        anyS.user?.telephone || '',
      cef:              anyS.cef || '',
      cne:              anyS.cne || '',
      cin:              anyS.cin || '',
      group_id:         String(anyS.group_id || anyS.group?.id || ''),
      date_inscription: anyS.date_inscription?.slice(0, 10) || today(),
      date_naissance:   anyS.date_naissance?.slice(0, 10) || '',
      adresse:          anyS.adresse || '',
      status:           anyS.status || 'actif',
    });
    setFormOpen(true);
    setOpenMenuId(null);
  };

  const handleSave = async () => {
    const required = ['nom', 'prenom', 'email', 'cef', 'cne', 'cin', 'group_id', 'date_naissance'] as const;
    for (const k of required) {
      if (!form[k].toString().trim()) {
        toast.error('Tous les champs requis doivent être remplis');
        return;
      }
    }
    if (!editing && !form.password.trim()) {
      toast.error('Mot de passe requis pour un nouveau stagiaire');
      return;
    }

    setSaving(true);
    try {
      // Normalize identifiers the same way the backend does, so what the user
      // sees in the form matches what gets stored and what the unique checks see.
      const payload: any = {
        nom: form.nom.trim(),
        prenom: form.prenom.trim(),
        email: form.email.trim().toLowerCase(),
        telephone: form.telephone.trim() || null,
        cef: form.cef.trim().toUpperCase(),
        cne: form.cne.trim().toUpperCase(),
        cin: form.cin.trim().toUpperCase(),
        group_id: Number(form.group_id),
        date_inscription: form.date_inscription,
        date_naissance: form.date_naissance,
        adresse: form.adresse.trim() || null,
      };
      if (form.password.trim()) payload.password = form.password.trim();
      if (editing) payload.status = form.status;
      // Explicit default on create so the stagiaire appears "Actif" immediately
      // in the list after creation (backend also defaults — belt + suspenders).
      else payload.status = 'actif';

      if (editing) {
        await stagiairesApi.update(editing.id, payload);
        toast.success('Stagiaire mis à jour');
      } else {
        await stagiairesApi.create(payload);
        toast.success('Stagiaire créé');
      }
      setFormOpen(false);
      fetchData();
    } catch (err: any) {
      const errors = err.response?.data?.errors;
      const firstErr = errors ? Object.values(errors).flat()[0] : null;
      toast.error((firstErr as string) || err.response?.data?.message || 'Erreur');
    }
    setSaving(false);
  };

  const askDelete = (s: Stagiaire) => {
    setEditing(s);
    setDeleteOpen(true);
    setOpenMenuId(null);
  };

  const handleDelete = async () => {
    if (!editing) return;
    try {
      await stagiairesApi.delete(editing.id);
      toast.success('Stagiaire désactivé');
      setDeleteOpen(false);
      setEditing(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur');
    }
  };

  const openCsv = () => {
    setCsvGroupId('');
    setCsvRows([]);
    setCsvFileName('');
    setCsvOpen(true);
  };

  const handleCsvFile = async (file: File) => {
    try {
      const text = await file.text();
      const { rows, inFileDupes } = parseStagiairesCsv(text);
      if (rows.length === 0) {
        toast.error('Aucun stagiaire valide trouvé dans le CSV');
        return;
      }
      setCsvRows(rows);
      setCsvFileName(file.name);
      toast.success(`${rows.length} ligne(s) détectée(s)`);
      if (inFileDupes > 0) {
        toast(`${inFileDupes} doublon(s) ignorés dans le fichier (email / CEF / CNE / CIN)`, { icon: 'ℹ️', duration: 5000 });
      }
    } catch {
      toast.error('Impossible de lire le fichier');
    }
    if (csvInputRef.current) csvInputRef.current.value = '';
  };

  const handleCsvImport = async () => {
    if (!csvGroupId) { toast.error('Choisissez un groupe'); return; }
    if (csvRows.length === 0) { toast.error('Aucune ligne à importer'); return; }
    setCsvImporting(true);
    try {
      const res = await stagiairesApi.bulkImport(Number(csvGroupId), csvRows);
      const payload = res.data?.data || {};
      const skipped: Array<{ nom: string; reason: string }> = payload.skipped || [];
      toast.success(res.data?.message || 'Import terminé');
      if (skipped.length > 0) {
        const preview = skipped.slice(0, 3).map(s => `• ${s.nom} (${s.reason})`).join('\n');
        const more = skipped.length > 3 ? `\n+${skipped.length - 3} autres...` : '';
        toast(`Ignorés:\n${preview}${more}`, { icon: 'ℹ️', duration: 6000 });
      }
      setCsvOpen(false);
      fetchData();
    } catch (err: any) {
      const errors = err.response?.data?.errors;
      const firstErr = errors ? Object.values(errors).flat()[0] : null;
      toast.error((firstErr as string) || err.response?.data?.message || 'Erreur');
    }
    setCsvImporting(false);
  };

  const groupSelectOptions: SelectOption[] = groupOptions.map(g => {
    const filiereName = g.filiere?.nom ?? filiereOptions.find(f => f.id === g.filiere_id)?.nom;
    return {
      value: String(g.id),
      label: filiereName ? `${g.nom} — ${filiereName}` : g.nom,
    };
  });

  // Groups filtered by selected filière (cascade)
  const filteredGroupsForFilter = filiereFilter
    ? groupOptions.filter(g => String(g.filiere_id) === filiereFilter)
    : groupOptions;

  const resetFilters = () => {
    setFiliereFilter('');
    setGroupFilter('');
    setStatusFilter('');
  };

  const hasActiveFilters = !!(filiereFilter || groupFilter || statusFilter || groupIdParam);

  const openPicker = (mode: 'print' | 'excel') => {
    setPickerMode(mode);
    // Reset to sensible default every time so the list doesn't stay skewed by
    // the last session's picks.
    setPickerCols(new Set(DEFAULT_EXPORT_COLS));
    setPickerOpen(true);
  };

  const togglePickerCol = (key: ExportColKey) => {
    setPickerCols(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const fetchFilteredRows = async (): Promise<any[]> => {
    const params: any = {
      ...buildFilterParams(),
      per_page: 10000,
      sort_by: 'nom',
      sort_dir: sortDir,
    };
    const res = await stagiairesApi.getAll(params);
    return res.data.data || [];
  };

  const getFiltersSummary = (): string => ([
    filiereFilter && `Filière : ${filiereOptions.find(f => String(f.id) === filiereFilter)?.nom ?? ''}`,
    (groupIdParam || groupFilter) && `Groupe : ${groupOptions.find(g => String(g.id) === (groupIdParam || groupFilter))?.nom ?? ''}`,
    statusFilter && `Statut : ${statusConfig[statusFilter]?.label ?? statusFilter}`,
    debouncedSearch && `Recherche : « ${debouncedSearch} »`,
  ].filter(Boolean).join(' • ') || 'Aucun filtre');

  // Ordered list of selected columns (respecting EXPORT_COLUMNS order, not
  // the order the user clicked the checkboxes).
  const orderedSelectedCols = (): ExportColDef[] =>
    EXPORT_COLUMNS.filter(c => pickerCols.has(c.key));

  const handlePickerConfirm = async () => {
    if (pickerCols.size === 0) {
      toast.error('Sélectionnez au moins une colonne');
      return;
    }
    setPickerBusy(true);
    try {
      const rows = await fetchFilteredRows();
      const cols = orderedSelectedCols();

      if (pickerMode === 'print') {
        runPrint(rows, cols);
      } else {
        runExcelExport(rows, cols);
      }
      setPickerOpen(false);
    } catch {
      toast.error(pickerMode === 'print'
        ? 'Erreur lors de la préparation de l\'impression'
        : 'Erreur lors de l\'export Excel');
    }
    setPickerBusy(false);
  };

  const runPrint = (rows: any[], cols: ExportColDef[]) => {
    const filtersLabel = getFiltersSummary();
    const headers = cols.map(c => `<th>${escapeHtml(c.label)}</th>`).join('');
    const body = rows.map(r => {
      const tds = cols.map(c => {
        if (c.key === 'statut') {
          const st = (r.status || 'actif') as string;
          const label = statusConfig[st]?.label ?? st;
          return `<td><span class="st st-${st}">${escapeHtml(label)}</span></td>`;
        }
        return `<td>${escapeHtml(c.accessor(r))}</td>`;
      }).join('');
      return `<tr>${tds}</tr>`;
    }).join('');

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Liste des stagiaires</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #111827; margin: 0; }
  h1 { font-size: 18px; margin: 0 0 4px; font-weight: 700; }
  .sub { color: #6b7280; font-size: 11px; margin-bottom: 16px; }
  .sub b { color: #111827; }
  table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
  thead th { background: #f9fafb; border-bottom: 2px solid #d1d5db; padding: 8px 6px; text-align: left; font-weight: 600; font-size: 10px; text-transform: uppercase; color: #374151; letter-spacing: 0.03em; }
  tbody td { border-bottom: 1px solid #e5e7eb; padding: 7px 6px; vertical-align: middle; }
  tbody tr:nth-child(even) { background: #fafafa; }
  .st { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 10px; font-weight: 600; }
  .st-actif    { background: #dcfce7; color: #166534; }
  .st-abandon  { background: #fee2e2; color: #991b1b; }
  .st-suspendu { background: #fef3c7; color: #92400e; }
  .st-diplome  { background: #dbeafe; color: #1e40af; }
  @media print {
    body { padding: 12px; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
  }
</style></head><body>
<h1>Liste des stagiaires</h1>
<div class="sub">${escapeHtml(filtersLabel)} &nbsp;•&nbsp; Total : <b>${rows.length}</b> stagiaire(s) &nbsp;•&nbsp; Imprimé le ${escapeHtml(new Date().toLocaleString('fr-FR'))}</div>
<table>
  <thead><tr>${headers}</tr></thead>
  <tbody>${body || `<tr><td colspan="${cols.length}" style="text-align:center;color:#6b7280;padding:24px">Aucun stagiaire trouvé</td></tr>`}</tbody>
</table>
<script>window.onload = function(){ setTimeout(function(){ window.print(); }, 150); };</script>
</body></html>`;

    const w = window.open('', '_blank', 'width=1100,height=760');
    if (!w) {
      toast.error('Autorisez les pop-ups pour imprimer');
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  const runExcelExport = (rows: any[], cols: ExportColDef[]) => {
    const data = rows.map(r => {
      const obj: Record<string, string> = {};
      cols.forEach(c => {
        // Humanise the statut value (same label as the badge shows).
        if (c.key === 'statut') {
          const st = r.status || 'actif';
          obj[c.label] = statusConfig[st]?.label ?? st;
        } else {
          obj[c.label] = c.accessor(r);
        }
      });
      return obj;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    // Auto column widths from header + longest cell (capped so it stays usable).
    ws['!cols'] = cols.map(c => {
      const headerLen = c.label.length;
      const maxLen = data.reduce((m, row) => Math.max(m, String(row[c.label] || '').length), 0);
      return { wch: Math.min(40, Math.max(10, Math.max(headerLen, maxLen) + 2)) };
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stagiaires');

    const stamp = new Date().toISOString().slice(0, 10);
    const fname = `Stagiaires_${stamp}.xlsx`;
    XLSX.writeFile(wb, fname);
    toast.success(`${rows.length} stagiaire(s) exporté(s)`);
  };

  const columns: TableColumn<Stagiaire>[] = [
    {
      key: 'cef', label: 'ID', sortable: true,
      render: (item) => <span className="text-primary-600 dark:text-primary-400 font-medium">{item.cef}</span>,
    },
    {
      key: 'user', label: 'Nom Complet', sortable: true,
      render: (item) => <span className="text-gray-900 dark:text-gray-100">{item.user?.prenom} {item.user?.nom}</span>,
    },
    { key: 'date_naissance', label: 'Date de naissance', sortable: true, render: (item) => formatDate(item.date_naissance) },
    { key: 'telephone', label: 'Téléphone', sortable: true, render: (item) => item.user?.telephone || '-' },
    { key: 'group', label: 'Groupe', sortable: true, render: (item) => item.group?.nom || '-' },
    { key: 'filiere', label: 'Filière', render: (item) => item.group?.filiere?.nom || '-' },
    {
      key: 'status',
      label: 'Statut',
      sortable: true,
      render: (item) => {
        const st = statusConfig[(item as any).status] || statusConfig.actif;
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${st.bg} ${st.text} dark:bg-opacity-20`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              (item as any).status === 'actif' ? 'bg-green-500' :
              (item as any).status === 'abandon' ? 'bg-red-500' :
              (item as any).status === 'suspendu' ? 'bg-yellow-500' :
              'bg-blue-500'
            }`} />
            {st.label}
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: 'Action',
      render: (item) => (
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === item.id ? null : item.id); }}
            className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <HiDotsHorizontal className="h-5 w-5" />
          </button>
          {openMenuId === item.id && (
            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-10 min-w-[160px]">
              <button onClick={(e) => { e.stopPropagation(); openProfile(item.id); }} className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-2">
                <HiIdentification className="h-4 w-4" /> Voir Profile
              </button>
              {canWrite && (
                <>
                  <button onClick={(e) => { e.stopPropagation(); openEdit(item); }} className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-2">
                    <HiPencil className="h-4 w-4" /> Modifier
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); askDelete(item); }} className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2">
                    <HiTrash className="h-4 w-4" /> Supprimer
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Stagiaires</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            <Link to={`${basePath}/dashboard`} className="text-primary-600 dark:text-primary-400 hover:text-primary-700">Tableau de bord</Link>
            {' / '}
            <span className="text-primary-600 dark:text-primary-400">Personnes</span>
            {' / '}
            <span>Stagiaires</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openPicker('print')}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-sm font-medium rounded-lg transition-colors"
            title="Imprimer la liste complète (filtres actifs, colonnes au choix)"
          >
            <HiPrinter className="h-4 w-4" /> Imprimer
          </button>
          <button
            onClick={() => openPicker('excel')}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-sm font-medium rounded-lg transition-colors"
            title="Exporter au format Excel (filtres actifs, colonnes au choix)"
          >
            <HiDownload className="h-4 w-4" /> Export Excel
          </button>
          {canWrite && (
            <>
              <button
                onClick={openCsv}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-sm font-medium rounded-lg transition-colors"
              >
                <HiUpload className="h-4 w-4" /> Import CSV
              </button>
              <button
                onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <HiPlus className="h-4 w-4" /> Ajouter Stagiaire
              </button>
            </>
          )}
        </div>
      </div>

      {groupIdParam && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Filtré par groupe :</span>
          <span className="inline-flex items-center gap-2 px-3 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 text-sm font-medium rounded-full border border-primary-100 dark:border-primary-800">
            {groupNomParam || `#${groupIdParam}`}
            <button
              onClick={() => { setSearchParams({}); setPage(1); }}
              className="hover:bg-primary-100 dark:hover:bg-primary-900/40 rounded-full p-0.5"
              title="Retirer le filtre"
            >
              <HiX className="h-3.5 w-3.5" />
            </button>
          </span>
        </div>
      )}

      {/* Filter bar */}
      {!groupIdParam && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <HiFilter className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtres</span>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="ml-auto text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 flex items-center gap-1"
              >
                <HiX className="h-3.5 w-3.5" /> Réinitialiser
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Filière</label>
              <select
                value={filiereFilter}
                onChange={e => {
                  setFiliereFilter(e.target.value);
                  setGroupFilter(''); // cascade reset
                }}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Toutes les filières</option>
                {filiereOptions.map(f => (
                  <option key={f.id} value={String(f.id)}>
                    {f.code ? `${f.code} — ${f.nom}` : f.nom}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Groupe {filiereFilter && <span className="text-gray-400 font-normal">(filière sélectionnée)</span>}
              </label>
              <select
                value={groupFilter}
                onChange={e => setGroupFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Tous les groupes</option>
                {filteredGroupsForFilter.map(g => {
                  const filiereName = g.filiere?.nom ?? filiereOptions.find(f => f.id === g.filiere_id)?.nom;
                  return (
                    <option key={g.id} value={String(g.id)}>
                      {filiereName ? `${g.nom} — ${filiereName}` : g.nom}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Statut</label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Tous les statuts</option>
                <option value="actif">Actif</option>
                <option value="abandon">Abandon</option>
                <option value="suspendu">Suspendu</option>
                <option value="diplome">Diplômé</option>
              </select>
            </div>
          </div>
        </div>
      )}

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
        headerContent={
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Tous les stagiaires</h3>
        }
        toolbarExtra={
          <button onClick={toggleSort}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50">
            <HiSortAscending className="h-4 w-4" /> Sort By {sortDir === 'asc' ? 'A-Z' : 'Z-A'}
          </button>
        }
        searchValue={search}
        onSearchChange={(val) => { setSearch(val); setPage(1); }}
        searchPlaceholder="Search"
      />

      {/* Profile Modal */}
      {(profileData || profileLoading) && (
        profileLoading ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" />
            <div className="relative bg-white dark:bg-gray-800 rounded-xl p-8 shadow-xl">
              <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full mx-auto" />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">Chargement du profil...</p>
            </div>
          </div>
        ) : (
          <ProfileModal stagiaire={profileData} onClose={() => setProfileData(null)} />
        )
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Modifier le stagiaire' : 'Ajouter un stagiaire'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} loading={saving}>Enregistrer</Button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Identité</h4>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Nom" value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} required />
              <Input label="Prénom" value={form.prenom} onChange={e => setForm(p => ({ ...p, prenom: e.target.value }))} required />
              <Input label="Email" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
              <Input
                label={editing ? 'Nouveau mot de passe (laisser vide pour garder)' : 'Mot de passe'}
                type="password"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                required={!editing}
                placeholder={editing ? '••••••••' : ''}
              />
              <Input label="Téléphone" value={form.telephone} onChange={e => setForm(p => ({ ...p, telephone: e.target.value }))} placeholder="+212 ..." />
              <Input label="Date de naissance" type="date" value={form.date_naissance} onChange={e => setForm(p => ({ ...p, date_naissance: e.target.value }))} required />
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Identifiants OFPPT</h4>
            <div className="grid grid-cols-3 gap-4">
              <Input label="CEF" value={form.cef} onChange={e => setForm(p => ({ ...p, cef: e.target.value }))} required placeholder="12345678" />
              <Input label="CNE" value={form.cne} onChange={e => setForm(p => ({ ...p, cne: e.target.value }))} required placeholder="R123456789" />
              <Input label="CIN" value={form.cin} onChange={e => setForm(p => ({ ...p, cin: e.target.value }))} required placeholder="AB123456" />
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Affectation</h4>
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Groupe"
                value={form.group_id}
                onChange={e => setForm(p => ({ ...p, group_id: e.target.value }))}
                options={[{ value: '', label: 'Choisir un groupe' }, ...groupSelectOptions]}
                required
              />
              <Input label="Date d'inscription" type="date" value={form.date_inscription} onChange={e => setForm(p => ({ ...p, date_inscription: e.target.value }))} required />
              {editing && (
                <Select
                  label="Statut"
                  value={form.status}
                  onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                  options={STATUS_OPTIONS}
                />
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Adresse</label>
            <textarea
              value={form.adresse}
              onChange={e => setForm(p => ({ ...p, adresse: e.target.value }))}
              rows={2}
              placeholder="Adresse postale (optionnel)"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-gray-100 placeholder-gray-400"
            />
          </div>
        </div>
      </Modal>

      {/* CSV Import Modal */}
      <Modal
        isOpen={csvOpen}
        onClose={() => setCsvOpen(false)}
        title="Importer des stagiaires (CSV)"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCsvOpen(false)}>Annuler</Button>
            <Button onClick={handleCsvImport} loading={csvImporting} disabled={!csvGroupId || csvRows.length === 0}>
              Importer {csvRows.length > 0 ? `(${csvRows.length})` : ''}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Groupe d'affectation"
            value={csvGroupId}
            onChange={e => setCsvGroupId(e.target.value)}
            options={[{ value: '', label: 'Choisir un groupe' }, ...groupSelectOptions]}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Fichier CSV</label>
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleCsvFile(f); }}
            />
            <button
              type="button"
              onClick={() => csvInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-sm font-medium rounded-lg transition-colors"
            >
              <HiUpload className="h-4 w-4" /> {csvFileName || 'Choisir un fichier'}
            </button>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Colonnes requises: <code className="text-gray-600 dark:text-gray-300">nom, prenom, email, password, cef, cne, cin, date_naissance</code>
              <br />
              Optionnelles: <code className="text-gray-600 dark:text-gray-300">telephone, adresse</code>
              <br />
              Format date: <code className="text-gray-600 dark:text-gray-300">YYYY-MM-DD</code>
            </p>
          </div>

          {csvRows.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Aperçu ({csvRows.length} ligne{csvRows.length > 1 ? 's' : ''})</label>
                <button
                  type="button"
                  onClick={() => { setCsvRows([]); setCsvFileName(''); }}
                  className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 flex items-center gap-1"
                >
                  <HiX className="h-3.5 w-3.5" /> Vider
                </button>
              </div>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-500 dark:text-gray-400 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Nom complet</th>
                      <th className="px-3 py-2 text-left font-medium">Email</th>
                      <th className="px-3 py-2 text-left font-medium">CEF</th>
                      <th className="px-3 py-2 text-left font-medium">CNE</th>
                      <th className="px-3 py-2 text-left font-medium">CIN</th>
                      <th className="px-3 py-2 text-left font-medium">Naissance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {csvRows.map((r, i) => (
                      <tr key={i} className="text-gray-700 dark:text-gray-300">
                        <td className="px-3 py-2">{r.prenom} {r.nom}</td>
                        <td className="px-3 py-2 truncate max-w-[160px]">{r.email}</td>
                        <td className="px-3 py-2 text-xs">{r.cef}</td>
                        <td className="px-3 py-2 text-xs">{r.cne}</td>
                        <td className="px-3 py-2 text-xs">{r.cin}</td>
                        <td className="px-3 py-2 text-xs">{r.date_naissance}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Désactiver le stagiaire"
        message={`Désactiver ${(editing as any)?.user?.prenom || ''} ${(editing as any)?.user?.nom || ''} ? Son compte sera suspendu.`}
      />

      {/* Column-picker modal (shared by Imprimer + Export Excel) */}
      <Modal
        isOpen={pickerOpen}
        onClose={() => !pickerBusy && setPickerOpen(false)}
        title={pickerMode === 'print' ? 'Imprimer la liste' : 'Exporter en Excel'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPickerOpen(false)} disabled={pickerBusy}>
              Annuler
            </Button>
            <Button onClick={handlePickerConfirm} loading={pickerBusy}>
              {pickerMode === 'print' ? 'Imprimer' : 'Exporter'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Choisissez les colonnes à inclure. La liste complète des stagiaires correspondant aux filtres actifs sera {pickerMode === 'print' ? 'imprimée' : 'exportée'}.
          </p>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Colonnes ({pickerCols.size} / {EXPORT_COLUMNS.length})
            </span>
            <div className="flex items-center gap-3 text-xs">
              <button
                type="button"
                onClick={() => setPickerCols(new Set(EXPORT_COLUMNS.map(c => c.key)))}
                className="text-primary-600 dark:text-primary-400 hover:underline"
              >
                Tout sélectionner
              </button>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <button
                type="button"
                onClick={() => setPickerCols(new Set())}
                className="text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
              >
                Tout désélectionner
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 border border-gray-200 dark:border-gray-700 rounded-lg p-3 max-h-72 overflow-y-auto">
            {EXPORT_COLUMNS.map(c => {
              const checked = pickerCols.has(c.key);
              return (
                <label
                  key={c.key}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer text-sm transition-colors ${
                    checked
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => togglePickerCol(c.key)}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span>{c.label}</span>
                </label>
              );
            })}
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
            Filtres actifs : <span className="text-gray-700 dark:text-gray-300">{getFiltersSummary()}</span>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StagiairesPage;
