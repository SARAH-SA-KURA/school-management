import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { stagiairesApi, dropdownApi } from '../../../api/crudApi';
import { Stagiaire, TableColumn, SelectOption } from '../../../types';
import { DataTable, Modal, Button, Input, Select, ConfirmDialog } from '../../../components/ui';
import {
  HiSortAscending, HiX, HiMail, HiPhone, HiLocationMarker, HiCalendar,
  HiIdentification, HiAcademicCap, HiUserGroup, HiPlus, HiPencil, HiTrash,
  HiDotsHorizontal, HiUpload,
} from 'react-icons/hi';
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

const parseStagiairesCsv = (text: string): StagiaireCsvRow[] => {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const header = lines[0].split(/[,;\t]/).map(h => h.trim().toLowerCase());
  const idx = (name: string) => header.findIndex(h => h === name || h.startsWith(name));

  const iNom = idx('nom'), iPrenom = idx('prenom'), iEmail = idx('email'),
        iPass = idx('password'), iCef = idx('cef'), iCne = idx('cne'), iCin = idx('cin'),
        iDob = idx('date_naissance'), iTel = idx('telephone'), iAdr = idx('adresse');

  const rows: StagiaireCsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(/[,;\t]/).map(s => s.trim());
    const get = (j: number) => (j >= 0 ? (parts[j] || '') : '');
    const nom = get(iNom), prenom = get(iPrenom), email = get(iEmail),
          password = get(iPass), cef = get(iCef), cne = get(iCne), cin = get(iCin),
          dob = get(iDob);
    if (!nom || !prenom || !email || !password || !cef || !cne || !cin || !dob) continue;
    rows.push({
      nom, prenom, email, password, cef, cne, cin, date_naissance: dob,
      telephone: get(iTel) || undefined,
      adresse: get(iAdr) || undefined,
    });
  }
  return rows;
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
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvGroupId, setCsvGroupId] = useState('');
  const [csvRows, setCsvRows] = useState<StagiaireCsvRow[]>([]);
  const [csvFileName, setCsvFileName] = useState('');
  const [csvImporting, setCsvImporting] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const debouncedSearch = useDebounce(search);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, search: debouncedSearch, per_page: perPage, sort_by: 'nom', sort_dir: sortDir };
      if (groupIdParam) params.group_id = groupIdParam;
      const res = await stagiairesApi.getAll(params);
      setData(res.data.data);
      setTotalPages(res.data.meta.last_page);
      setTotalItems(res.data.meta.total);
    } catch {
      toast.error('Erreur de chargement');
    }
    setLoading(false);
  }, [page, debouncedSearch, perPage, sortDir, groupIdParam]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [groupIdParam]);

  useEffect(() => {
    const handler = () => setOpenMenuId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  useEffect(() => {
    if (!canWrite) return;
    dropdownApi.groups()
      .then(res => {
        const list: any[] = res.data?.data || [];
        setGroupOptions(list.map(g => ({ id: g.id, nom: g.nom, filiere_id: g.filiere_id, filiere: g.filiere })));
      })
      .catch(() => {});
  }, [canWrite, formOpen, csvOpen]);

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
      const payload: any = {
        nom: form.nom.trim(),
        prenom: form.prenom.trim(),
        email: form.email.trim(),
        telephone: form.telephone.trim() || null,
        cef: form.cef.trim(),
        cne: form.cne.trim(),
        cin: form.cin.trim(),
        group_id: Number(form.group_id),
        date_inscription: form.date_inscription,
        date_naissance: form.date_naissance,
        adresse: form.adresse.trim() || null,
      };
      if (form.password.trim()) payload.password = form.password.trim();
      if (editing) payload.status = form.status;

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
      const parsed = parseStagiairesCsv(text);
      if (parsed.length === 0) {
        toast.error('Aucun stagiaire valide trouvé dans le CSV');
        return;
      }
      setCsvRows(parsed);
      setCsvFileName(file.name);
      toast.success(`${parsed.length} ligne(s) détectée(s)`);
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

  const groupSelectOptions: SelectOption[] = groupOptions.map(g => ({
    value: String(g.id),
    label: g.filiere?.nom ? `${g.nom} — ${g.filiere.nom}` : g.nom,
  }));

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
        {canWrite && (
          <div className="flex items-center gap-2">
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
          </div>
        )}
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
    </div>
  );
};

export default StagiairesPage;
