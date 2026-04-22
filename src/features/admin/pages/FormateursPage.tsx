import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { formateursApi, modulesApi, dropdownApi } from '../../../api/crudApi';
import { Formateur, TableColumn } from '../../../types';
import { DataTable, Modal, Button, Input, ConfirmDialog } from '../../../components/ui';
import { HiSortAscending, HiX, HiMail, HiPhone, HiCalendar, HiIdentification, HiAcademicCap, HiBookOpen, HiPencil, HiTrash, HiDotsHorizontal, HiChevronDown } from 'react-icons/hi';
import { formatDate } from '../../../utils/formatters';
import toast from 'react-hot-toast';
import { useDebounce } from '../../../hooks/useDebounce';
import { useRolePath } from '../../../hooks/useRolePath';
import { useCan } from '../../../hooks/useCan';
import Spinner from '../../../components/ui/Spinner';

interface FiliereLite { id: number; nom: string; code?: string }
interface ModuleLite { id: number; nom: string; code?: string; filiere_id: number; filiere?: { id: number; nom: string } }
interface GroupLite { id: number; nom: string; filiere_id: number }

interface MSOption {
  value: number;
  label: string;
  sub?: string;
  groupKey?: string;
}

// Reusable multi-select dropdown with checkboxes. Groups options by
// `groupKey` (used here to cluster modules/groups under their filière header).
const MultiSelect: React.FC<{
  label: string;
  placeholder: string;
  options: MSOption[];
  selectedIds: number[];
  onToggle: (id: number) => void;
  onSelectAll?: () => void;
  onClearAll?: () => void;
  disabled?: boolean;
  disabledMessage?: string;
}> = ({ label, placeholder, options, selectedIds, onToggle, onSelectAll, onClearAll, disabled, disabledMessage }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedLabels = options.filter(o => selectedIds.includes(o.value)).map(o => o.label);
  const display = selectedIds.length === 0
    ? placeholder
    : selectedIds.length <= 2
      ? selectedLabels.join(', ')
      : `${selectedIds.length} sélectionné(s)`;

  const grouped = options.reduce((acc, o) => {
    const k = o.groupKey || '';
    (acc[k] ||= []).push(o);
    return acc;
  }, {} as Record<string, MSOption[]>);
  const hasGroups = Object.keys(grouped).some(k => k !== '');

  return (
    <div ref={ref} className="relative">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
        {selectedIds.length > 0 && (
          <span className="ml-1 text-gray-400 dark:text-gray-500 font-normal">({selectedIds.length})</span>
        )}
      </label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg text-sm text-left transition-colors ${
          disabled
            ? 'bg-gray-50 dark:bg-gray-800/40 text-gray-400 border-gray-200 dark:border-gray-700 cursor-not-allowed'
            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-gray-900 dark:text-gray-100'
        }`}
      >
        <span className={`truncate pr-2 ${selectedIds.length === 0 || disabled ? 'text-gray-400 dark:text-gray-500' : ''}`}>
          {disabled && disabledMessage ? disabledMessage : display}
        </span>
        <HiChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''} ${disabled ? 'text-gray-300 dark:text-gray-600' : 'text-gray-400'}`} />
      </button>
      {open && !disabled && (
        <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-72 overflow-y-auto">
          {(onSelectAll || onClearAll) && options.length > 0 && (
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-3 py-2 flex items-center justify-between text-xs">
              {onSelectAll
                ? <button type="button" onClick={onSelectAll} className="text-primary-600 dark:text-primary-400 hover:underline">Tout sélectionner</button>
                : <span />}
              {onClearAll && (
                <button type="button" onClick={onClearAll} className="text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400">
                  Tout désélectionner
                </button>
              )}
            </div>
          )}
          {options.length === 0 ? (
            <p className="p-3 text-xs text-gray-400 dark:text-gray-500 text-center">Aucune option disponible</p>
          ) : hasGroups ? (
            Object.entries(grouped).map(([k, opts]) => (
              <div key={k || '_nokey'}>
                {k && (
                  <div className="px-3 py-1 bg-gray-50 dark:bg-gray-800/80 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {k}
                  </div>
                )}
                {opts.map(o => {
                  const checked = selectedIds.includes(o.value);
                  return (
                    <label key={o.value} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggle(o.value)}
                        className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 dark:text-gray-100 truncate">{o.label}</p>
                        {o.sub && <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{o.sub}</p>}
                      </div>
                    </label>
                  );
                })}
              </div>
            ))
          ) : (
            options.map(o => {
              const checked = selectedIds.includes(o.value);
              return (
                <label key={o.value} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(o.value)}
                    className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-gray-100 truncate">{o.label}</p>
                    {o.sub && <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{o.sub}</p>}
                  </div>
                </label>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

const emptyForm = {
  nom: '', prenom: '', email: '', password: '', telephone: '',
  matricule: '', specialisation: '', date_recrutement: '',
  filiere_ids: [] as number[],
  module_ids: [] as number[],
  group_ids: [] as number[],
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
  const [allModules, setAllModules] = useState<ModuleLite[]>([]);
  const [allGroups, setAllGroups] = useState<GroupLite[]>([]);
  const [allFilieres, setAllFilieres] = useState<FiliereLite[]>([]);
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

  // URL-triggered create/edit — the entry point for creating a Formateur lives
  // on /admin/utilisateurs (single add-user UX), which hands off here.
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (!canWrite) return;
    const createFlag = searchParams.get('create');
    const editId     = searchParams.get('edit');
    if (createFlag === '1') {
      setEditing(null);
      setForm(emptyForm);
      setFormOpen(true);
      searchParams.delete('create');
      setSearchParams(searchParams, { replace: true });
    } else if (editId) {
      formateursApi.getById(Number(editId))
        .then(res => {
          const full = res.data.data as any;
          const moduleIds: number[] = (full.modules || []).map((m: any) => m.id);
          const groupIds: number[]  = (full.groups  || []).map((g: any) => g.id);
          const filiereIds: number[] = Array.from(new Set([
            ...((full.modules || []).map((m: any) => m.filiere_id ?? m.filiere?.id).filter(Boolean)),
            ...((full.groups  || []).map((g: any) => g.filiere_id ?? g.filiere?.id).filter(Boolean)),
          ]));
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
            filiere_ids: filiereIds,
            module_ids: moduleIds,
            group_ids: groupIds,
          });
          setFormOpen(true);
          searchParams.delete('edit');
          setSearchParams(searchParams, { replace: true });
        })
        .catch(() => toast.error('Formateur introuvable'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, canWrite]);

  useEffect(() => {
    if (!canWrite) return;
    // Full catalog needed so the Filière → Modules → Groupes cascade has data.
    modulesApi.getAll({ per_page: 500 })
      .then(res => setAllModules(res.data.data || []))
      .catch(() => {});
    dropdownApi.groups()
      .then(res => setAllGroups((res.data?.data || []).map((g: any) => ({ id: g.id, nom: g.nom, filiere_id: g.filiere_id }))))
      .catch(() => {});
    dropdownApi.filieres()
      .then(res => setAllFilieres((res.data?.data || []).map((f: any) => ({ id: f.id, nom: f.nom, code: f.code }))))
      .catch(() => {});
  }, [canWrite]);

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

  const openEdit = async (f: Formateur) => {
    setOpenMenuId(null);
    try {
      const res = await formateursApi.getById(f.id);
      const full = res.data.data;
      setEditing(full);
      const moduleIds: number[] = (full.modules || []).map((m: any) => m.id);
      const groupIds: number[] = (full.groups || []).map((g: any) => g.id);
      // Filiere set = union of filières implied by assigned modules + groups.
      // Covers the edge case where a filière has a group assigned but no module
      // (or vice-versa) — the cascade UI still shows everything consistently.
      const filiereIds: number[] = Array.from(new Set([
        ...((full.modules || []).map((m: any) => m.filiere_id ?? m.filiere?.id).filter(Boolean)),
        ...((full.groups || []).map((g: any) => g.filiere_id ?? g.filiere?.id).filter(Boolean)),
      ]));
      setForm({
        nom: full.user?.nom || '',
        prenom: full.user?.prenom || '',
        email: full.user?.email || '',
        password: '',
        telephone: full.user?.telephone || '',
        matricule: full.matricule || '',
        specialisation: full.specialisation || '',
        date_recrutement: (full.date_recrutement || '').slice(0, 10),
        filiere_ids: filiereIds,
        module_ids: moduleIds,
        group_ids: groupIds,
      });
      setFormOpen(true);
    } catch {
      toast.error('Erreur lors du chargement du formateur');
    }
  };

  // Cascading toggles — un-checking a filière clears the modules + groups
  // that belonged to it so the DB stays consistent with what the UI shows.
  const toggleFiliere = (id: number) => {
    setForm(p => {
      if (p.filiere_ids.includes(id)) {
        return {
          ...p,
          filiere_ids: p.filiere_ids.filter(x => x !== id),
          module_ids: p.module_ids.filter(mid => {
            const m = allModules.find(mm => mm.id === mid);
            return m ? m.filiere_id !== id : true;
          }),
          group_ids: p.group_ids.filter(gid => {
            const g = allGroups.find(gg => gg.id === gid);
            return g ? g.filiere_id !== id : true;
          }),
        };
      }
      return { ...p, filiere_ids: [...p.filiere_ids, id] };
    });
  };

  const toggleModule = (id: number) => {
    setForm(p => ({
      ...p,
      module_ids: p.module_ids.includes(id) ? p.module_ids.filter(x => x !== id) : [...p.module_ids, id],
    }));
  };

  const toggleGroup = (id: number) => {
    setForm(p => ({
      ...p,
      group_ids: p.group_ids.includes(id) ? p.group_ids.filter(x => x !== id) : [...p.group_ids, id],
    }));
  };

  const handleSave = async () => {
    // Sanity: user must have picked at least one filière so modules/groups can
    // be meaningfully scoped. Server accepts empty arrays too, but we nudge
    // against it in the UI.
    if (form.filiere_ids.length === 0) {
      toast.error('Sélectionnez au moins une filière');
      return;
    }
    setSaving(true);
    try {
      const base: any = {
        nom: form.nom, prenom: form.prenom, email: form.email,
        telephone: form.telephone || null,
        matricule: form.matricule,
        specialisation: form.specialisation,
        date_recrutement: form.date_recrutement,
        module_ids: form.module_ids,
        group_ids: form.group_ids,
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
      label: 'Modules',
      render: (item) => {
        const count = item.modules?.length || 0;
        if (count === 0) return <span className="text-gray-400">-</span>;
        return <span className="text-gray-700 dark:text-gray-300">{count} module{count > 1 ? 's' : ''}</span>;
      },
    },
    {
      key: 'groups',
      label: 'Groupes',
      render: (item) => {
        const count = item.groups?.length || 0;
        if (count === 0) return <span className="text-gray-400">-</span>;
        return <span className="text-gray-700 dark:text-gray-300">{count} groupe{count > 1 ? 's' : ''}</span>;
      },
    },
    {
      key: 'filiere',
      label: 'Filières',
      render: (item) => {
        // Union of filières from modules + groups — both sources feed a
        // formateur's scope, and a filière can appear via either one.
        const fromModules = (item.modules || []).map((m: any) => m.filiere?.nom).filter(Boolean);
        const fromGroups = (item.groups || []).map((g: any) => g.filiere?.nom).filter(Boolean);
        const unique = Array.from(new Set([...fromModules, ...fromGroups]));
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

  // Modules grouped by the filières the user has chosen — only these show up.
  const selectedFilieresData = useMemo(
    () => allFilieres.filter(f => form.filiere_ids.includes(f.id)),
    [allFilieres, form.filiere_ids]
  );

  const modulesByFiliere = useMemo(() => {
    const map: Record<number, ModuleLite[]> = {};
    for (const m of allModules) {
      if (!form.filiere_ids.includes(m.filiere_id)) continue;
      if (!map[m.filiere_id]) map[m.filiere_id] = [];
      map[m.filiere_id].push(m);
    }
    return map;
  }, [allModules, form.filiere_ids]);

  const groupsByFiliere = useMemo(() => {
    const map: Record<number, GroupLite[]> = {};
    for (const g of allGroups) {
      if (!form.filiere_ids.includes(g.filiere_id)) continue;
      if (!map[g.filiere_id]) map[g.filiere_id] = [];
      map[g.filiere_id].push(g);
    }
    return map;
  }, [allGroups, form.filiere_ids]);

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
              <Input label="Matricule" value={form.matricule} onChange={e => setForm(p => ({ ...p, matricule: e.target.value }))} required />
              <Input label="Spécialisation" value={form.specialisation} onChange={e => setForm(p => ({ ...p, specialisation: e.target.value }))} required />
              <Input label="Date de recrutement" type="date" value={form.date_recrutement} onChange={e => setForm(p => ({ ...p, date_recrutement: e.target.value }))} required />
            </div>
          </div>

          {/* Cascade dropdowns: Filière → Modules (of those filières) → Groupes (of those filières) */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Affectation pédagogique
              </h4>
              <span className="text-[11px] text-gray-400 dark:text-gray-500">
                Filière → Modules → Groupes
              </span>
            </div>

            <div className="space-y-4">
              <MultiSelect
                label="Filière enseignée"
                placeholder={allFilieres.length === 0 ? 'Chargement...' : 'Choisir une ou plusieurs filières'}
                options={allFilieres.map(f => ({
                  value: f.id,
                  label: f.code ? `${f.code} — ${f.nom}` : f.nom,
                }))}
                selectedIds={form.filiere_ids}
                onToggle={toggleFiliere}
                onSelectAll={() => setForm(p => ({ ...p, filiere_ids: allFilieres.map(f => f.id) }))}
                onClearAll={() => setForm(p => ({
                  ...p,
                  filiere_ids: [],
                  module_ids: [],
                  group_ids: [],
                }))}
              />

              <MultiSelect
                label="Modules"
                placeholder={form.filiere_ids.length === 0 ? 'Sélectionnez d\'abord une filière' : 'Choisir les modules'}
                disabled={form.filiere_ids.length === 0}
                disabledMessage="Sélectionnez d'abord une filière"
                options={selectedFilieresData.flatMap(f => {
                  const mods = modulesByFiliere[f.id] || [];
                  return mods.map(m => ({
                    value: m.id,
                    label: m.nom,
                    sub: m.code || undefined,
                    groupKey: f.code ? `${f.code} — ${f.nom}` : f.nom,
                  }));
                })}
                selectedIds={form.module_ids}
                onToggle={toggleModule}
                onSelectAll={() => {
                  const allIds = selectedFilieresData.flatMap(f => (modulesByFiliere[f.id] || []).map(m => m.id));
                  setForm(p => ({ ...p, module_ids: Array.from(new Set(allIds)) }));
                }}
                onClearAll={() => setForm(p => ({ ...p, module_ids: [] }))}
              />

              <MultiSelect
                label="Groupes"
                placeholder={form.filiere_ids.length === 0 ? 'Sélectionnez d\'abord une filière' : 'Choisir les groupes'}
                disabled={form.filiere_ids.length === 0}
                disabledMessage="Sélectionnez d'abord une filière"
                options={selectedFilieresData.flatMap(f => {
                  const grps = groupsByFiliere[f.id] || [];
                  return grps.map(g => ({
                    value: g.id,
                    label: g.nom,
                    groupKey: f.code ? `${f.code} — ${f.nom}` : f.nom,
                  }));
                })}
                selectedIds={form.group_ids}
                onToggle={toggleGroup}
                onSelectAll={() => {
                  const allIds = selectedFilieresData.flatMap(f => (groupsByFiliere[f.id] || []).map(g => g.id));
                  setForm(p => ({ ...p, group_ids: Array.from(new Set(allIds)) }));
                }}
                onClearAll={() => setForm(p => ({ ...p, group_ids: [] }))}
              />
            </div>

            <div className="mt-3 text-[11px] text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
              Ce formateur verra uniquement les stagiaires des groupes cochés et les modules cochés quand il se connectera.
            </div>
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
