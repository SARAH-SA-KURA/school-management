import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { usersApi } from '../../../api/crudApi';
import { User, TableColumn } from '../../../types';
import { DataTable, Button, Modal, Input, Select, ConfirmDialog } from '../../../components/ui';
import { HiPlus, HiPencil, HiTrash, HiSortAscending, HiDotsVertical } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useDebounce } from '../../../hooks/useDebounce';
import { useRolePath } from '../../../hooks/useRolePath';

const ROLE_OPTIONS = [
  { value: 'directeur', label: 'Directeur' },
  { value: 'formateur', label: 'Formateur' },
  { value: 'stagiaire', label: 'Stagiaire' },
  { value: 'surveillant', label: 'Surveillant General' },
];

const roleBadge = (role: string) => {
  const styles: Record<string, string> = {
    directeur: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
    formateur: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
    stagiaire: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    surveillant: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  };
  const labels: Record<string, string> = {
    directeur: 'Directeur',
    formateur: 'Formateur',
    stagiaire: 'Stagiaire',
    surveillant: 'Surveillant General',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[role] || 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
      {labels[role] || role}
    </span>
  );
};

const UtilisateursPage: React.FC = () => {
  const basePath = useRolePath();
  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<User | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filterRole] = useState('');
  const debouncedSearch = useDebounce(search);
  const [form, setForm] = useState({ nom: '', prenom: '', email: '', password: '', role: 'formateur', telephone: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, search: debouncedSearch, per_page: perPage, sort_dir: sortDir };
      if (filterRole) params.role = filterRole;
      const res = await usersApi.getAll(params);
      setData(res.data.data);
      setTotalPages(res.data.meta.last_page);
      setTotalItems(res.data.meta.total);
    } catch { toast.error('Erreur de chargement'); }
    setLoading(false);
  }, [page, debouncedSearch, perPage, sortDir, filterRole]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePerPageChange = (newPerPage: number) => { setPerPage(newPerPage); setPage(1); };
  const toggleSort = () => setSortDir(d => d === 'asc' ? 'desc' : 'asc');

  const openCreate = () => { setSelected(null); setForm({ nom: '', prenom: '', email: '', password: '', role: 'formateur', telephone: '' }); setModalOpen(true); };
  const openEdit = (item: User) => {
    setSelected(item);
    setForm({ nom: item.nom, prenom: item.prenom, email: item.email, password: '', role: item.role, telephone: item.telephone || '' });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (selected) {
        const { password, ...rest } = form;
        await usersApi.update(selected.id, (password ? form : rest) as any);
        toast.success('Utilisateur mis à jour');
      } else {
        await usersApi.create(form as any);
        toast.success('Utilisateur créé');
      }
      setModalOpen(false); fetchData();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!selected) return;
    try { await usersApi.delete(selected.id); toast.success('Utilisateur supprimé'); setDeleteOpen(false); fetchData(); }
    catch { toast.error('Erreur'); }
  };

  const columns: TableColumn<User>[] = [
    {
      key: 'id', label: 'ID', sortable: true,
      render: (item) => (
        <span className="text-primary-600 dark:text-primary-400 font-medium cursor-pointer hover:text-primary-700">
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
          <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-10 hidden group-hover:block min-w-[120px]">
            <button onClick={() => openEdit(item)} className="w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-2">
              <HiPencil className="h-4 w-4" /> Modifier
            </button>
            <button onClick={() => { setSelected(item); setDeleteOpen(true); }} className="w-full text-left px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2">
              <HiTrash className="h-4 w-4" /> Supprimer
            </button>
          </div>
        </div>
      ),
    },
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
          onClick={openCreate}
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

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={selected ? 'Modifier l\'utilisateur' : 'Ajouter un utilisateur'} size="lg"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button><Button onClick={handleSave} loading={saving}>{selected ? 'Modifier' : 'Créer'}</Button></>}>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Prénom" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} required />
          <Input label="Nom" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          {!selected && <Input label="Mot de passe" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />}
          <Select label="Rôle" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} options={ROLE_OPTIONS} required />
          <Input label="Téléphone" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
        </div>
      </Modal>

      <ConfirmDialog isOpen={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={handleDelete}
        title="Supprimer l'utilisateur" message={`Supprimer "${selected?.prenom} ${selected?.nom}" ?`} />
    </div>
  );
};

export default UtilisateursPage;
