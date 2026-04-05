import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { usersApi } from '../../../api/crudApi';
import { User, TableColumn } from '../../../types';
import { DataTable, Button, Modal, Input, Select, ConfirmDialog } from '../../../components/ui';
import { HiPlus, HiPencil, HiTrash, HiFilter, HiSortAscending, HiDotsVertical } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useDebounce } from '../../../hooks/useDebounce';

const ROLE_OPTIONS = [
  { value: 'directeur', label: 'Directeur' },
  { value: 'formateur', label: 'Formateur' },
  { value: 'stagiaire', label: 'Stagiaire' },
  { value: 'surveillant', label: 'Surveillant General' },
];

const roleBadge = (role: string) => {
  const styles: Record<string, string> = {
    directeur: 'bg-purple-100 text-purple-700',
    formateur: 'bg-orange-100 text-orange-700',
    stagiaire: 'bg-green-100 text-green-700',
    surveillant: 'bg-blue-100 text-blue-700',
  };
  const labels: Record<string, string> = {
    directeur: 'Directeur',
    formateur: 'Formateur',
    stagiaire: 'Stagiaire',
    surveillant: 'Surveillant General',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[role] || 'bg-gray-100 text-gray-700'}`}>
      {labels[role] || role}
    </span>
  );
};

const UtilisateursPage: React.FC = () => {
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
  const [filterRole, setFilterRole] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
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
        <span className="text-primary-600 font-medium cursor-pointer hover:text-primary-700">
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
          <button className="p-1.5 text-gray-400 hover:text-gray-600">
            <HiDotsVertical className="h-5 w-5" />
          </button>
          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 hidden group-hover:block min-w-[120px]">
            <button onClick={() => openEdit(item)} className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
              <HiPencil className="h-4 w-4" /> Modifier
            </button>
            <button onClick={() => { setSelected(item); setDeleteOpen(true); }} className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
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
          <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
          <p className="text-sm text-gray-500">
            <Link to="/admin/dashboard" className="text-primary-600 hover:text-primary-700">Tableau de bord</Link>
            {' / '}
            <span className="text-primary-600">Gestion des utilisateurs</span>
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
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Liste des utilisateurs</h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-gray-200 rounded-lg px-3 py-1.5">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Rechercher..."
                  className="text-sm bg-transparent outline-none placeholder-gray-400 w-40"
                />
              </div>
              <div className="relative">
                <button onClick={() => setFilterOpen(!filterOpen)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                  <HiFilter className="h-4 w-4" /> {filterRole ? ROLE_OPTIONS.find(r => r.value === filterRole)?.label : 'Filtrer'}
                </button>
                {filterOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[160px]">
                    <button onClick={() => { setFilterRole(''); setFilterOpen(false); setPage(1); }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${!filterRole ? 'text-primary-600 font-medium' : 'text-gray-700'}`}>
                      Tous les rôles
                    </button>
                    {ROLE_OPTIONS.map(r => (
                      <button key={r.value} onClick={() => { setFilterRole(r.value); setFilterOpen(false); setPage(1); }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${filterRole === r.value ? 'text-primary-600 font-medium' : 'text-gray-700'}`}>
                        {r.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={toggleSort}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                <HiSortAscending className="h-4 w-4" /> Trier {sortDir === 'asc' ? 'A-Z' : 'Z-A'}
              </button>
            </div>
          </div>
        }
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
