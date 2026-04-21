import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { groupsApi, dropdownApi } from '../../../api/crudApi';
import { Group, TableColumn, SelectOption } from '../../../types';
import { DataTable, Modal, Button, Input, Select, ConfirmDialog } from '../../../components/ui';
import { HiSortAscending, HiPlus, HiPencil, HiTrash, HiDotsHorizontal, HiUserGroup } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useDebounce } from '../../../hooks/useDebounce';
import { useRolePath } from '../../../hooks/useRolePath';
import { useAuth } from '../../../hooks/useAuth';

const ANNEE_OPTIONS: SelectOption[] = [
  { value: '1', label: '1ère année' },
  { value: '2', label: '2ème année' },
  { value: '3', label: '3ème année' },
];

const STATUT_OPTIONS: SelectOption[] = [
  { value: 'true', label: 'Actif' },
  { value: 'false', label: 'Inactif' },
];

interface FiliereOption { id: number; code: string; nom: string }

interface GroupFormState {
  nom: string;
  filiere_id: string;
  annee: string;
  annee_scolaire: string;
  max_stagiaires: number | string;
  is_active: string;
}

const currentSchoolYear = () => {
  const y = new Date().getFullYear();
  const m = new Date().getMonth();
  return m >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
};

const emptyForm: GroupFormState = {
  nom: '',
  filiere_id: '',
  annee: '1',
  annee_scolaire: currentSchoolYear(),
  max_stagiaires: 30,
  is_active: 'true',
};

const GroupesPage: React.FC = () => {
  const basePath = useRolePath();
  const { user } = useAuth();
  const canWrite = user?.role === 'surveillant';

  const [data, setData] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Group | null>(null);
  const [form, setForm] = useState<GroupFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filiereOptions, setFiliereOptions] = useState<FiliereOption[]>([]);
  const debouncedSearch = useDebounce(search);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await groupsApi.getAll({ page, search: debouncedSearch, per_page: perPage, sort_by: 'nom', sort_dir: sortDir });
      setData(res.data.data);
      setTotalPages(res.data.meta.last_page);
      setTotalItems(res.data.meta.total);
    } catch { toast.error('Erreur de chargement'); }
    setLoading(false);
  }, [page, debouncedSearch, perPage, sortDir]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const handler = () => setOpenMenuId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  useEffect(() => {
    if (!canWrite) return;
    dropdownApi.filieres()
      .then(res => {
        const list: any[] = res.data?.data || [];
        setFiliereOptions(list.map(f => ({ id: f.id, code: f.code, nom: f.nom })));
      })
      .catch(() => {});
  }, [canWrite, formOpen]);

  const handlePerPageChange = (newPerPage: number) => { setPerPage(newPerPage); setPage(1); };
  const toggleSort = () => { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); setPage(1); };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, annee_scolaire: currentSchoolYear() });
    setFormOpen(true);
  };

  const openEdit = (g: Group) => {
    setEditing(g);
    const anyG = g as any;
    setForm({
      nom: g.nom || '',
      filiere_id: String(anyG.filiere_id || anyG.filiere?.id || ''),
      annee: String(anyG.annee || 1),
      annee_scolaire: anyG.annee_scolaire || currentSchoolYear(),
      max_stagiaires: anyG.max_stagiaires ?? 30,
      is_active: anyG.is_active === false ? 'false' : 'true',
    });
    setFormOpen(true);
    setOpenMenuId(null);
  };

  const handleSave = async () => {
    if (!form.nom.trim() || !form.filiere_id || !form.annee_scolaire.trim()) {
      toast.error('Nom, filière et année scolaire sont requis');
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        nom: form.nom.trim(),
        filiere_id: Number(form.filiere_id),
        annee: Number(form.annee),
        annee_scolaire: form.annee_scolaire.trim(),
        max_stagiaires: Number(form.max_stagiaires),
        is_active: form.is_active === 'true',
      };
      if (editing) {
        await groupsApi.update(editing.id, payload);
        toast.success('Groupe mis à jour');
      } else {
        await groupsApi.create(payload);
        toast.success('Groupe créé');
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

  const askDelete = (g: Group) => {
    setEditing(g);
    setDeleteOpen(true);
    setOpenMenuId(null);
  };

  const handleDelete = async () => {
    if (!editing) return;
    try {
      await groupsApi.delete(editing.id);
      toast.success('Groupe supprimé');
      setDeleteOpen(false);
      setEditing(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur');
    }
  };

  const filiereSelectOptions: SelectOption[] = filiereOptions.map(f => ({
    value: String(f.id),
    label: `${f.code} — ${f.nom}`,
  }));

  const columns: TableColumn<Group>[] = [
    {
      key: 'nom',
      label: 'Nom',
      sortable: true,
      render: (item) => (
        <Link
          to={`${basePath}/stagiaires?group_id=${item.id}&group_nom=${encodeURIComponent(item.nom)}`}
          className="text-primary-600 dark:text-primary-400 font-medium hover:underline flex items-center gap-1.5"
        >
          <HiUserGroup className="h-3.5 w-3.5" />
          {item.nom}
        </Link>
      ),
    },
    { key: 'filiere', label: 'Filière', sortable: true, render: (item) => item.filiere?.nom || '-' },
    { key: 'annee', label: 'Année', sortable: true, render: (item: any) => `${item.annee}ère` },
    { key: 'annee_scolaire', label: 'Année scolaire', sortable: true, render: (item: any) => item.annee_scolaire },
    {
      key: 'stagiaires_count',
      label: 'N. Stagiaire',
      sortable: true,
      render: (item: any) => {
        const count = item.stagiaires_count ?? 0;
        const max = item.max_stagiaires ?? 30;
        const ratio = max > 0 ? count / max : 0;
        const color = ratio >= 1 ? 'text-red-600 dark:text-red-400' : ratio >= 0.8 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-700 dark:text-gray-300';
        return <span className={color}>{count} / {max}</span>;
      },
    },
    {
      key: 'statut',
      label: 'Statut',
      sortable: true,
      render: (item) => (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${item.is_active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
          {item.is_active ? 'Actif' : 'Inactif'}
        </span>
      ),
    },
    ...(canWrite ? [{
      key: 'actions',
      label: 'Action',
      render: (item: Group) => (
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === item.id ? null : item.id); }}
            className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <HiDotsHorizontal className="h-5 w-5" />
          </button>
          {openMenuId === item.id && (
            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-10 min-w-[140px]">
              <button onClick={(e) => { e.stopPropagation(); openEdit(item); }} className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-2">
                <HiPencil className="h-4 w-4" /> Modifier
              </button>
              <button onClick={(e) => { e.stopPropagation(); askDelete(item); }} className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2">
                <HiTrash className="h-4 w-4" /> Supprimer
              </button>
            </div>
          )}
        </div>
      ),
    }] : []),
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Groupes</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            <Link to={`${basePath}/dashboard`} className="text-primary-600 dark:text-primary-400 hover:text-primary-700">Tableau de bord</Link>
            {' / '}
            <span className="text-primary-600 dark:text-primary-400">Académique</span>
            {' / '}
            <span>Groupes</span>
          </p>
        </div>
        {canWrite && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <HiPlus className="h-4 w-4" /> Ajouter Groupe
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
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Group List</h3>
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

      {/* Create / Edit Modal */}
      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Modifier le groupe' : 'Ajouter un groupe'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} loading={saving}>Enregistrer</Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nom du groupe" value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} required placeholder="DD-101A" />
            <Select
              label="Filière"
              value={form.filiere_id}
              onChange={e => setForm(p => ({ ...p, filiere_id: e.target.value }))}
              options={[{ value: '', label: 'Choisir une filière' }, ...filiereSelectOptions]}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Année"
              value={form.annee}
              onChange={e => setForm(p => ({ ...p, annee: e.target.value }))}
              options={ANNEE_OPTIONS}
              required
            />
            <Input label="Année scolaire" value={form.annee_scolaire} onChange={e => setForm(p => ({ ...p, annee_scolaire: e.target.value }))} required placeholder="2025-2026" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Effectif maximum"
              type="number"
              min={1}
              value={form.max_stagiaires}
              onChange={e => setForm(p => ({ ...p, max_stagiaires: e.target.value === '' ? '' : Number(e.target.value) }))}
              required
            />
            <Select
              label="Statut"
              value={form.is_active}
              onChange={e => setForm(p => ({ ...p, is_active: e.target.value }))}
              options={STATUT_OPTIONS}
            />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Supprimer le groupe"
        message={`Supprimer le groupe "${editing?.nom}" ? Cette action est irréversible.`}
      />
    </div>
  );
};

export default GroupesPage;
