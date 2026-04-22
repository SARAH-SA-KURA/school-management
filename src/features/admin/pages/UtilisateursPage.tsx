import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usersApi } from '../../../api/crudApi';
import { User, TableColumn } from '../../../types';
import { DataTable, Button, Modal, Input, ConfirmDialog } from '../../../components/ui';
import {
  HiPlus, HiPencil, HiTrash, HiSortAscending, HiDotsVertical,
  HiAcademicCap, HiShieldCheck, HiUser, HiArrowRight,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useDebounce } from '../../../hooks/useDebounce';
import { useRolePath } from '../../../hooks/useRolePath';

type Role = 'directeur' | 'formateur' | 'stagiaire' | 'surveillant';

const ROLE_LABELS: Record<Role, string> = {
  directeur:   'Directeur',
  formateur:   'Formateur',
  stagiaire:   'Stagiaire',
  surveillant: 'Surveillant General',
};

const roleBadge = (role: string) => {
  const styles: Record<string, string> = {
    directeur:   'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
    formateur:   'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
    stagiaire:   'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    surveillant: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[role] || 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
      {ROLE_LABELS[role as Role] || role}
    </span>
  );
};

// Roles that have their own profile table — edits and creates go through
// the dedicated page so the User row + profile row stay in sync.
const ROLE_HAS_PROFILE: Record<Role, boolean> = {
  directeur: false,
  surveillant: false,
  formateur: true,
  stagiaire: true,
};

// Where the dedicated page lives for profile-backed roles.
const profilePathFor = (role: Role, basePath: string) => {
  if (role === 'formateur') return `${basePath}/formateurs`;
  if (role === 'stagiaire') return `${basePath}/stagiaires`;
  return null;
};

const UtilisateursPage: React.FC = () => {
  const basePath = useRolePath();
  const navigate = useNavigate();

  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const debouncedSearch = useDebounce(search);

  const [rolePickerOpen, setRolePickerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);

  // Basic form only covers Directeur + Surveillant — the two roles without
  // a separate profile table. Role is chosen upstream (picker), so no select.
  const [creatingRole, setCreatingRole] = useState<Role>('directeur');
  const [form, setForm] = useState({
    nom: '', prenom: '', email: '', password: '', telephone: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await usersApi.getAll({
        page, search: debouncedSearch, per_page: perPage, sort_dir: sortDir,
      });
      setData(res.data.data);
      setTotalPages(res.data.meta.last_page);
      setTotalItems(res.data.meta.total);
    } catch {
      toast.error('Erreur de chargement');
    }
    setLoading(false);
  }, [page, debouncedSearch, perPage, sortDir]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePerPageChange = (newPerPage: number) => { setPerPage(newPerPage); setPage(1); };
  const toggleSort = () => setSortDir(d => d === 'asc' ? 'desc' : 'asc');

  const openRolePicker = () => {
    setSelected(null);
    setRolePickerOpen(true);
  };

  const pickRole = (role: Role) => {
    setRolePickerOpen(false);
    if (ROLE_HAS_PROFILE[role]) {
      const path = profilePathFor(role, basePath);
      if (path) navigate(`${path}?create=1`);
      return;
    }
    setCreatingRole(role);
    setForm({ nom: '', prenom: '', email: '', password: '', telephone: '' });
    setModalOpen(true);
  };

  const openEdit = (item: User) => {
    const role = item.role as Role;
    if (ROLE_HAS_PROFILE[role]) {
      const path = profilePathFor(role, basePath);
      if (path) { navigate(`${path}?edit=${item.id}`); return; }
    }
    setSelected(item);
    setCreatingRole(role);
    setForm({
      nom: item.nom,
      prenom: item.prenom,
      email: item.email,
      password: '',
      telephone: item.telephone || '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.prenom.trim() || !form.nom.trim() || !form.email.trim()) {
      toast.error('Prénom, nom et email requis');
      return;
    }
    if (!selected && !form.password.trim()) {
      toast.error('Mot de passe requis pour un nouveau compte');
      return;
    }
    setSaving(true);
    try {
      if (selected) {
        const payload: any = {
          nom: form.nom, prenom: form.prenom, email: form.email,
          telephone: form.telephone || null,
        };
        if (form.password.trim()) payload.password = form.password;
        await usersApi.update(selected.id, payload);
        toast.success('Utilisateur mis à jour');
      } else {
        await usersApi.create({
          nom: form.nom, prenom: form.prenom, email: form.email,
          password: form.password, telephone: form.telephone || null,
          role: creatingRole,
        } as any);
        toast.success('Utilisateur créé');
      }
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      const errors = err.response?.data?.errors;
      const firstErr = errors ? Object.values(errors).flat()[0] : null;
      toast.error((firstErr as string) || err.response?.data?.message || 'Erreur');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!selected) return;
    try {
      await usersApi.delete(selected.id);
      toast.success('Utilisateur désactivé');
      setDeleteOpen(false);
      fetchData();
    } catch {
      toast.error('Erreur');
    }
  };

  const columns: TableColumn<User>[] = [
    {
      key: 'id', label: 'ID', sortable: true,
      render: (item) => (
        <span className="text-primary-600 dark:text-primary-400 font-medium">
          USR-{String(item.id).padStart(3, '0')}
        </span>
      ),
    },
    { key: 'nom_complet', label: 'Nom Complet', sortable: true, render: (item) => `${item.prenom} ${item.nom}` },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'role', label: 'Role', sortable: true, render: (item) => roleBadge(item.role) },
    {
      key: 'actions', label: 'Action',
      render: (item) => (
        <div className="relative group">
          <button className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
            <HiDotsVertical className="h-5 w-5" />
          </button>
          <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-10 hidden group-hover:block min-w-[160px]">
            <button onClick={() => openEdit(item)} className="w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-2">
              <HiPencil className="h-4 w-4" /> Modifier
            </button>
            <button onClick={() => { setSelected(item); setDeleteOpen(true); }} className="w-full text-left px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2">
              <HiTrash className="h-4 w-4" /> Désactiver
            </button>
          </div>
        </div>
      ),
    },
  ];

  const roleCards: Array<{
    role: Role;
    title: string;
    desc: string;
    icon: React.ReactNode;
    accent: string;
  }> = [
    {
      role: 'directeur',
      title: 'Directeur',
      desc: 'Responsable de l\'établissement : catalogue, emploi du temps, validation des notes.',
      icon: <HiShieldCheck className="h-7 w-7" />,
      accent: 'from-purple-500 to-purple-600',
    },
    {
      role: 'surveillant',
      title: 'Surveillant General',
      desc: 'Gestion opérationnelle : groupes, stagiaires, absences, justificatifs.',
      icon: <HiUser className="h-7 w-7" />,
      accent: 'from-blue-500 to-blue-600',
    },
    {
      role: 'formateur',
      title: 'Formateur',
      desc: 'Enseigne un ou plusieurs modules, planifie les examens, enregistre les notes.',
      icon: <HiAcademicCap className="h-7 w-7" />,
      accent: 'from-orange-500 to-orange-600',
    },
    // Stagiaire onboarding belongs to the Surveillant General — handled on his side.
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Utilisateurs</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            <Link to={`${basePath}/dashboard`} className="text-primary-600 dark:text-primary-400 hover:text-primary-700">Tableau de bord</Link>
            {' / '}
            <span className="text-primary-600 dark:text-primary-400">Gestion des utilisateurs</span>
            {' / '}
            <span>Utilisateurs</span>
          </p>
        </div>
        <button
          onClick={openRolePicker}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <HiPlus className="h-4 w-4" />
          Ajouter Utilisateur
        </button>
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
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Liste des utilisateurs</h3>
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

      {/* Role picker */}
      <Modal
        isOpen={rolePickerOpen}
        onClose={() => setRolePickerOpen(false)}
        title="Quel type d'utilisateur ?"
        size="lg"
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Choisissez le rôle — les informations demandées ensuite dépendent du rôle choisi.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {roleCards.map(rc => (
              <button
                key={rc.role}
                onClick={() => pickRole(rc.role)}
                className="group text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-primary-400 dark:hover:border-primary-500 hover:shadow-sm transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className={`h-12 w-12 rounded-lg bg-gradient-to-br ${rc.accent} text-white flex items-center justify-center flex-shrink-0`}>
                    {rc.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100">{rc.title}</h4>
                      <HiArrowRight className="h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-primary-500 transition-colors" />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                      {rc.desc}
                    </p>
                    {ROLE_HAS_PROFILE[rc.role] && (
                      <p className="text-[11px] text-primary-600 dark:text-primary-400 mt-2">
                        Ouvre la page dédiée (informations étendues)
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </Modal>

      {/* Basic user form — Directeur / Surveillant only */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selected
          ? `Modifier ${ROLE_LABELS[creatingRole]}`
          : `Ajouter un ${ROLE_LABELS[creatingRole]}`}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} loading={saving}>{selected ? 'Modifier' : 'Créer'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2 text-sm">
            <span className="text-gray-500 dark:text-gray-400">Rôle :</span>
            {roleBadge(creatingRole)}
            {!selected && (
              <button
                type="button"
                onClick={() => { setModalOpen(false); setRolePickerOpen(true); }}
                className="ml-auto text-xs text-primary-600 dark:text-primary-400 hover:underline"
              >
                Changer
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Prénom" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} required />
            <Input label="Nom" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required />
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <Input label="Téléphone" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} placeholder="06..." />
            <Input
              label={selected ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe'}
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required={!selected}
              placeholder={selected ? 'Laisser vide pour conserver' : 'Min. 8 caractères'}
            />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Désactiver l'utilisateur"
        message={`Désactiver le compte de "${selected?.prenom} ${selected?.nom}" ?`}
      />
    </div>
  );
};

export default UtilisateursPage;
