import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { sallesApi } from '../../../api/crudApi';
import { Salle, TableColumn } from '../../../types';
import { DataTable, Button, Modal, Input, Select, ConfirmDialog } from '../../../components/ui';
import { HiPlus, HiPencil, HiTrash, HiFilter, HiSortAscending, HiDotsHorizontal } from 'react-icons/hi';
import { SALLE_TYPES } from '../../../utils/constants';
import toast from 'react-hot-toast';
import { useDebounce } from '../../../hooks/useDebounce';

const DISPONIBILITE_OPTIONS = [
  { value: 'disponible', label: 'Disponible' },
  { value: 'occupee', label: 'Occupée' },
];

const SallesPage: React.FC = () => {
  const [data, setData] = useState<Salle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<Salle | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const debouncedSearch = useDebounce(search);
  const [form, setForm] = useState({ nom: '', type: 'cours', capacite: 30, disponibilite: 'disponible' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await sallesApi.getAll({ page, search: debouncedSearch, per_page: perPage, sort_dir: sortDir });
      setData(res.data.data);
      setTotalPages(res.data.meta.last_page);
      setTotalItems(res.data.meta.total);
    } catch { toast.error('Erreur de chargement'); }
    setLoading(false);
  }, [page, debouncedSearch, perPage, sortDir]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Close menu on outside click
  useEffect(() => {
    const handler = () => setOpenMenuId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const handlePerPageChange = (newPerPage: number) => {
    setPerPage(newPerPage);
    setPage(1);
  };

  const toggleSort = () => setSortDir(d => d === 'asc' ? 'desc' : 'asc');

  const openCreate = () => { setSelected(null); setForm({ nom: '', type: 'cours', capacite: 30, disponibilite: 'disponible' }); setModalOpen(true); };
  const openEdit = (item: Salle) => { setSelected(item); setForm({ nom: item.nom, type: item.type, capacite: item.capacite, disponibilite: 'disponible' }); setModalOpen(true); setOpenMenuId(null); };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { nom: form.nom, type: form.type, capacite: form.capacite, batiment: '' };
      if (selected) { await sallesApi.update(selected.id, payload as any); toast.success('Salle mise à jour'); }
      else { await sallesApi.create(payload as any); toast.success('Salle créée'); }
      setModalOpen(false); fetchData();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!selected) return;
    try { await sallesApi.delete(selected.id); toast.success('Salle supprimée'); setDeleteOpen(false); fetchData(); }
    catch { toast.error('Erreur'); }
  };

  const typeLabel = (type: string) => SALLE_TYPES.find(t => t.value === type)?.label || type;

  const columns: TableColumn<Salle>[] = [
    {
      key: 'nom',
      label: 'Nom de la Salle',
      sortable: true,
      render: (item) => (
        <span className="text-primary-600 font-medium cursor-pointer hover:text-primary-700">
          {item.nom}
        </span>
      ),
    },
    { key: 'type', label: 'Type', sortable: true, render: (item) => typeLabel(item.type) },
    { key: 'capacite', label: 'Capacité', sortable: true },
    {
      key: 'disponibilite',
      label: 'Disponibilité',
      sortable: true,
      render: () => (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
          <span className="w-2 h-2 rounded-full bg-green-500"></span>
          Disponible
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Action',
      render: (item) => (
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === item.id ? null : item.id); }}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <HiDotsHorizontal className="h-5 w-5" />
          </button>
          {openMenuId === item.id && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[140px]">
              <button onClick={(e) => { e.stopPropagation(); openEdit(item); }} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                <HiPencil className="h-4 w-4" /> Modifier
              </button>
              <button onClick={(e) => { e.stopPropagation(); setSelected(item); setDeleteOpen(true); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                <HiTrash className="h-4 w-4" /> Supprimer
              </button>
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
          <h1 className="text-2xl font-bold text-gray-900">Salles</h1>
          <p className="text-sm text-gray-500">
            <Link to="/admin/dashboard" className="text-primary-600 hover:text-primary-700">Tableau de bord</Link>
            {' / '}
            <span className="text-primary-600">Académique</span>
            {' / '}
            <span>Salles</span>
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <HiPlus className="h-4 w-4" />
          Ajouter Salle
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
            <div className="flex items-center border border-gray-200 rounded-lg px-3 py-2 flex-1 max-w-md">
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Rechercher une salle..."
                className="flex-1 text-sm text-gray-700 bg-transparent outline-none placeholder-gray-400"
              />
              <HiFilter className="h-5 w-5 text-gray-400" />
            </div>
            <div className="flex items-center gap-3">
              <button onClick={toggleSort}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                <HiSortAscending className="h-4 w-4" /> Trier {sortDir === 'asc' ? 'A-Z' : 'Z-A'}
              </button>
            </div>
          </div>
        }
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={selected ? 'Modifier la salle' : 'Ajouter une Salle'}
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button><Button onClick={handleSave} loading={saving}>Enregistrer</Button></>}>
        <div className="space-y-4">
          <Input label="Nom de salle" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required />
          <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} options={SALLE_TYPES} required />
          <Input label="Capacité" type="number" value={String(form.capacite)} onChange={(e) => setForm({ ...form, capacite: Number(e.target.value) })} required />
          <Select label="Disponibilité" value={form.disponibilite} onChange={(e) => setForm({ ...form, disponibilite: e.target.value })} options={DISPONIBILITE_OPTIONS} required />
        </div>
      </Modal>

      <ConfirmDialog isOpen={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={handleDelete}
        title="Supprimer la salle" message={`Supprimer la salle "${selected?.nom}" ?`} />
    </div>
  );
};

export default SallesPage;
