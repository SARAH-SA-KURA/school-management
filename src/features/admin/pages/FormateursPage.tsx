import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { formateursApi, modulesApi, dropdownApi } from '../../../api/crudApi';
import { Formateur, TableColumn } from '../../../types';
import { DataTable, Modal, Button, Input, ConfirmDialog } from '../../../components/ui';
import { HiSortAscending, HiX, HiMail, HiPhone, HiCalendar, HiIdentification, HiAcademicCap, HiBookOpen, HiPlus, HiPencil, HiTrash, HiDotsHorizontal } from 'react-icons/hi';
import { formatDate } from '../../../utils/formatters';
import toast from 'react-hot-toast';
import { useDebounce } from '../../../hooks/useDebounce';
import { useRolePath } from '../../../hooks/useRolePath';
import { useCan } from '../../../hooks/useCan';
import Spinner from '../../../components/ui/Spinner';

const emptyForm = {
  nom: '', prenom: '', email: '', password: '', telephone: '',
  matricule: '', specialisation: '', date_recrutement: '',
  module_ids: [] as number[],
};

const BACKEND_URL = (process.env.REACT_APP_API_URL || 'http://localhost:8000/api').replace('/api', '');
const getAvatarUrl = (avatar?: string | null) => {
  if (!avatar) return null;
  if (avatar.startsWith('http')) return avatar;
  return `${BACKEND_URL}${avatar}`;
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

const ProfileModal: React.FC<{ formateur: any; onClose: () => void }> = ({ formateur, onClose }) => {
  if (!formateur) return null;

  const f = formateur;
  const modules = f.modules || [];
  const filiereNames = modules
    .map((m: any) => m.filiere?.nom)
    .filter(Boolean)
    .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gray-900 rounded-t-2xl px-6 py-5 text-white relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white">
            <HiX className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-4">
            <AvatarCircle user={f.user} />
            <div>
              <h2 className="text-xl font-bold">{f.user?.prenom} {f.user?.nom}</h2>
              <p className="text-sm text-gray-300">{f.matricule}</p>
            </div>
          </div>
          <span className="absolute top-5 right-14 px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
            {f.is_active ? 'Actif' : 'Inactif'}
          </span>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Personal Info */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Informations personnelles</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <HiIdentification className="h-5 w-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Matricule</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{f.matricule}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <HiAcademicCap className="h-5 w-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Spécialisation</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{f.specialisation || '-'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <HiCalendar className="h-5 w-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Date de recrutement</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatDate(f.date_recrutement)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <HiPhone className="h-5 w-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Téléphone</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{f.user?.telephone || '-'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 col-span-2">
                <HiMail className="h-5 w-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{f.user?.email}</p>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-gray-100 dark:border-gray-700" />

          {/* Filières */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Filières ({filiereNames.length})
            </h3>
            {filiereNames.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {filiereNames.map((name: string) => (
                  <span key={name} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border border-purple-100 dark:border-purple-800">
                    {name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500">Aucune filière assignée</p>
            )}
          </div>

          <hr className="border-gray-100 dark:border-gray-700" />

          {/* Modules */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Modules ({modules.length})
            </h3>
            {modules.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {modules.map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-lg px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <HiBookOpen className="h-4 w-4 text-primary-500 dark:text-primary-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{m.nom}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{m.code} · S{m.semestre}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 rounded border border-gray-100 dark:border-gray-700">
                      {m.filiere?.nom || '-'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500">Aucun module assigné</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700">
          <button onClick={onClose} className="w-full py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

const FormateursPage: React.FC = () => {
  const basePath = useRolePath();
  const can = useCan();
  const canWrite = can('write', 'formateurs');
  const [data, setData] = useState<Formateur[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const debouncedSearch = useDebounce(search);
  const [profileData, setProfileData] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [allModules, setAllModules] = useState<any[]>([]);
  const [allFilieres, setAllFilieres] = useState<any[]>([]);
  const [allGroups, setAllGroups] = useState<any[]>([]);
  const [cascadeFiliereId, setCascadeFiliereId] = useState<number | ''>('');
  const [cascadeModuleId, setCascadeModuleId] = useState<number | ''>('');
  const [cascadeGroupIds, setCascadeGroupIds] = useState<number[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Formateur | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await formateursApi.getAll({ page, search: debouncedSearch, per_page: perPage, sort_dir: sortDir });
      setData(res.data.data);
      setTotalPages(res.data.meta.last_page);
      setTotalItems(res.data.meta.total);
    } catch {
      toast.error('Erreur de chargement');
    }
    setLoading(false);
  }, [page, debouncedSearch, perPage, sortDir]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!canWrite) return;
    modulesApi.getAll({ per_page: 200 })
      .then(res => setAllModules(res.data.data || []))
      .catch(() => {});
    dropdownApi.filieres()
      .then(res => setAllFilieres(res.data.data || res.data || []))
      .catch(() => {});
  }, [canWrite]);

  useEffect(() => {
    if (!cascadeFiliereId) { setAllGroups([]); setCascadeGroupIds([]); return; }
    dropdownApi.groups({ filiere_id: cascadeFiliereId as number })
      .then(res => setAllGroups(res.data.data || res.data || []))
      .catch(() => setAllGroups([]));
    setCascadeModuleId('');
    setCascadeGroupIds([]);
  }, [cascadeFiliereId]);

  useEffect(() => {
    const handler = () => setOpenMenuId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const handlePerPageChange = (newPerPage: number) => {
    setPerPage(newPerPage);
    setPage(1);
  };

  const toggleSort = () => {
    setSortDir(d => d === 'asc' ? 'desc' : 'asc');
  };

  const openProfile = async (id: number) => {
    setProfileLoading(true);
    setProfileData(null);
    try {
      const res = await formateursApi.getById(id);
      setProfileData(res.data.data);
    } catch {
      toast.error('Erreur lors du chargement du profil');
    }
    setProfileLoading(false);
  };

  const resetCascade = () => {
    setCascadeFiliereId('');
    setCascadeModuleId('');
    setCascadeGroupIds([]);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    resetCascade();
    setFormOpen(true);
  };

  const openEdit = async (f: Formateur) => {
    setOpenMenuId(null);
    try {
      const res = await formateursApi.getById(f.id);
      const full = res.data.data;
      setEditing(full);
      setForm({
        nom: full.user?.nom || '',
        prenom: full.user?.prenom || '',
        email: full.user?.email || '',
        password: '',
        telephone: full.user?.telephone || '',
        matricule: full.matricule || '',
        specialisation: full.specialisation || '',
        date_recrutement: (full.date_recrutement || '').slice(0, 10),
        module_ids: (full.modules || []).map((m: any) => m.id),
      });
      resetCascade();
      setFormOpen(true);
    } catch {
      toast.error('Erreur lors du chargement du formateur');
    }
  };

  const toggleModule = (id: number) => {
    setForm(p => ({
      ...p,
      module_ids: p.module_ids.includes(id)
        ? p.module_ids.filter(x => x !== id)
        : [...p.module_ids, id],
    }));
  };

  const toggleCascadeGroup = (id: number) => {
    setCascadeGroupIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const addModuleFromCascade = () => {
    if (!cascadeModuleId) return;
    const id = cascadeModuleId as number;
    if (!form.module_ids.includes(id)) {
      setForm(p => ({ ...p, module_ids: [...p.module_ids, id] }));
    }
    setCascadeModuleId('');
    setCascadeGroupIds([]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const base: any = {
        nom: form.nom, prenom: form.prenom, email: form.email,
        telephone: form.telephone || null,
        matricule: form.matricule,
        specialisation: form.specialisation,
        date_recrutement: form.date_recrutement,
        module_ids: form.module_ids,
      };
      if (editing) {
        await formateursApi.update(editing.id, base);
        toast.success('Formateur mis à jour');
      } else {
        await formateursApi.create({ ...base, password: form.password });
        toast.success('Formateur créé');
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

  const askDelete = (f: Formateur) => {
    setEditing(f);
    setDeleteOpen(true);
    setOpenMenuId(null);
  };

  const handleDelete = async () => {
    if (!editing) return;
    try {
      await formateursApi.delete(editing.id);
      toast.success('Formateur désactivé');
      setDeleteOpen(false);
      setEditing(null);
      fetchData();
    } catch {
      toast.error('Erreur');
    }
  };

  const columns: TableColumn<Formateur>[] = [
    {
      key: 'matricule',
      label: 'ID',
      sortable: true,
      render: (item) => (
        <span className="text-primary-600 dark:text-primary-400 font-medium">{item.matricule}</span>
      ),
    },
    {
      key: 'user',
      label: 'Nom Complet',
      sortable: true,
      render: (item) => (
        <span className="text-gray-900 dark:text-gray-100">{item.user?.prenom} {item.user?.nom}</span>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      render: (item) => item.user?.email || '-',
    },
    {
      key: 'telephone',
      label: 'Téléphone',
      sortable: true,
      render: (item) => item.user?.telephone || '-',
    },
    {
      key: 'modules',
      label: 'Module',
      render: (item) => item.modules?.map(m => m.nom).join(', ') || '-',
    },
    {
      key: 'filiere',
      label: 'Filière',
      render: (item) => {
        const names = item.modules?.map(m => m.filiere?.nom).filter(Boolean) || [];
        const unique = names.filter((v, i, a) => a.indexOf(v) === i);
        return unique.join(', ') || '-';
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
              <button onClick={(e) => { e.stopPropagation(); openProfile(item.id); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-2">
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
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Formateurs</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            <Link to={`${basePath}/dashboard`} className="text-primary-600 dark:text-primary-400 hover:text-primary-700">Tableau de bord</Link>
            {' / '}
            <span className="text-primary-600 dark:text-primary-400">Personnes</span>
            {' / '}
            <span>Formateurs</span>
          </p>
        </div>
        {canWrite && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <HiPlus className="h-4 w-4" />
            Ajouter Formateur
          </button>
        )}
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
        headerContent={
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Tous les Formateurs</h3>
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
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-8"><Spinner size="lg" /></div>
          </div>
        ) : (
          <ProfileModal formateur={profileData} onClose={() => setProfileData(null)} />
        )
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Modifier le formateur' : 'Ajouter un formateur'}
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
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Informations personnelles</h4>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Prénom" value={form.prenom} onChange={e => setForm(p => ({ ...p, prenom: e.target.value }))} required />
              <Input label="Nom" value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} required />
              <Input label="Email" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
              <Input label="Téléphone" value={form.telephone} onChange={e => setForm(p => ({ ...p, telephone: e.target.value }))} placeholder="06..." />
              {!editing && (
                <Input label="Mot de passe" type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required placeholder="Min. 8 caractères" />
              )}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Informations professionnelles</h4>
            <div className="grid grid-cols-3 gap-4">
              <Input label="Matricule" value={form.matricule} onChange={e => setForm(p => ({ ...p, matricule: e.target.value }))} required />
              <Input label="Spécialisation" value={form.specialisation} onChange={e => setForm(p => ({ ...p, specialisation: e.target.value }))} required />
              <Input label="Date de recrutement" type="date" value={form.date_recrutement} onChange={e => setForm(p => ({ ...p, date_recrutement: e.target.value }))} required />
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Modules enseignés ({form.module_ids.length})
            </h4>

            {/* Cascade selectors */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              {/* Filière */}
              <select
                value={cascadeFiliereId}
                onChange={e => setCascadeFiliereId(e.target.value ? Number(e.target.value) : '')}
                className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-primary-500"
              >
                <option value="">— Filière —</option>
                {allFilieres.map((f: any) => (
                  <option key={f.id} value={f.id}>{f.nom}</option>
                ))}
              </select>

              {/* Module (filtered by filière) */}
              <select
                value={cascadeModuleId}
                onChange={e => { setCascadeModuleId(e.target.value ? Number(e.target.value) : ''); setCascadeGroupIds([]); }}
                disabled={!cascadeFiliereId}
                className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">— Module —</option>
                {allModules
                  .filter((m: any) => m.filiere_id === cascadeFiliereId)
                  .map((m: any) => (
                    <option key={m.id} value={m.id}>{m.nom}</option>
                  ))}
              </select>
            </div>

            {/* Groupes multi-select (shown once a filière is chosen) */}
            {cascadeFiliereId && allGroups.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                  Groupes <span className="text-gray-400 dark:text-gray-500">(sélectionner un ou plusieurs)</span>
                  {cascadeGroupIds.length > 0 && (
                    <span className="ml-2 text-primary-600 dark:text-primary-400 font-medium">{cascadeGroupIds.length} sélectionné{cascadeGroupIds.length > 1 ? 's' : ''}</span>
                  )}
                </p>
                <div className="flex flex-wrap gap-2">
                  {allGroups.map((g: any) => {
                    const checked = cascadeGroupIds.includes(g.id);
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => toggleCascadeGroup(g.id)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                          checked
                            ? 'bg-primary-600 border-primary-600 text-white'
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-primary-400 dark:hover:border-primary-500'
                        }`}
                      >
                        {g.nom}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={addModuleFromCascade}
              disabled={!cascadeModuleId}
              className="mb-3 flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white disabled:text-gray-400 dark:disabled:text-gray-500 text-sm font-medium rounded-lg transition-colors"
            >
              <HiPlus className="h-4 w-4" /> Ajouter le module
            </button>

            {/* Selected modules chips */}
            {form.module_ids.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {form.module_ids.map(id => {
                  const m = allModules.find((x: any) => x.id === id);
                  return (
                    <span key={id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-700">
                      <HiBookOpen className="h-3.5 w-3.5" />
                      {m ? m.nom : `Module #${id}`}
                      {m?.filiere && <span className="text-xs text-primary-400 dark:text-primary-500">· {m.filiere.nom}</span>}
                      <button type="button" onClick={() => toggleModule(id)} className="ml-1 text-primary-400 hover:text-primary-600 dark:hover:text-primary-200">
                        <HiX className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500">Aucun module sélectionné</p>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Désactiver le formateur"
        message={`Désactiver "${editing?.user?.prenom} ${editing?.user?.nom}" ? Son compte sera suspendu.`}
      />
    </div>
  );
};

export default FormateursPage;
