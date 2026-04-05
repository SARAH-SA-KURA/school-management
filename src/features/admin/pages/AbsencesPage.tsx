import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { absencesApi, dropdownApi } from '../../../api/crudApi';
import { Absence, TableColumn } from '../../../types';
import { DataTable, Button, Modal, Select, ConfirmDialog } from '../../../components/ui';
import { HiFilter, HiSortAscending, HiPencil, HiTrash, HiDotsHorizontal } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useDebounce } from '../../../hooks/useDebounce';
import { formatDate } from '../../../utils/formatters';
import { ABSENCE_STATUSES } from '../../../utils/constants';

const statusBadge = (status: string) => {
  const styles: Record<string, string> = {
    non_justifiee: 'bg-red-50 text-red-600',
    justifiee: 'bg-green-50 text-green-700',
    en_attente: 'bg-yellow-50 text-yellow-700',
  };
  const labels: Record<string, string> = {
    non_justifiee: 'Non justifiée',
    justifiee: 'Justifiée',
    en_attente: 'En attente',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      {labels[status] || status}
    </span>
  );
};

const AbsencesPage: React.FC = () => {
  const [data, setData] = useState<Absence[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<Absence | null>(null);
  const [editForm, setEditForm] = useState({ status: 'non_justifiee', justification: '' });
  const [saving, setSaving] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const debouncedSearch = useDebounce(search);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, search: debouncedSearch, per_page: perPage, sort_dir: sortDir };
      if (filterStatus) params.status = filterStatus;
      const res = await absencesApi.getAll(params);
      setData(res.data.data);
      setTotalPages(res.data.meta.last_page);
      setTotalItems(res.data.meta.total);
    } catch {
      toast.error('Erreur de chargement');
    }
    setLoading(false);
  }, [page, debouncedSearch, perPage, sortDir, filterStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);

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

  const openEdit = (item: Absence) => {
    setSelected(item);
    setEditForm({ status: item.status, justification: item.justification || '' });
    setEditOpen(true);
    setOpenMenuId(null);
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await absencesApi.update(selected.id, editForm as any);
      toast.success('Absence mise à jour');
      setEditOpen(false);
      fetchData();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!selected) return;
    try {
      await absencesApi.delete(selected.id);
      toast.success('Absence supprimée');
      setDeleteOpen(false);
      fetchData();
    } catch { toast.error('Erreur'); }
  };

  const columns: TableColumn<Absence>[] = [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      render: (item) => (
        <span className="text-primary-600 font-medium">ABS-{String(item.id).padStart(3, '0')}</span>
      ),
    },
    {
      key: 'stagiaire',
      label: 'Stagiaire',
      sortable: true,
      render: (item) => {
        const user = item.stagiaire?.user;
        return user ? `${user.prenom} ${user.nom}` : '-';
      },
    },
    {
      key: 'module',
      label: 'Module',
      sortable: true,
      render: (item) => item.module?.nom || '-',
    },
    {
      key: 'date_absence',
      label: 'Date',
      sortable: true,
      render: (item) => formatDate(item.date_absence),
    },
    {
      key: 'heure',
      label: 'Heure',
      render: (item) => `${item.heure_debut} - ${item.heure_fin}`,
    },
    {
      key: 'motif',
      label: 'Motif',
      render: (item) => item.motif || <span className="text-gray-400">-</span>,
    },
    {
      key: 'status',
      label: 'Statut',
      sortable: true,
      render: (item) => statusBadge(item.status),
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

  const statusOptions = ABSENCE_STATUSES.map(s => ({ value: s.value, label: s.label }));

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Absences</h1>
        <p className="text-sm text-gray-500">
          <Link to="/admin/dashboard" className="text-primary-600 hover:text-primary-700">Tableau de bord</Link>
          {' / '}
          <span className="text-primary-600">Gestion</span>
          {' / '}
          <span>Absences</span>
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Total Absences</p>
          <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Non justifiées</p>
          <p className="text-2xl font-bold text-red-600">{data.filter(a => a.status === 'non_justifiee').length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-sm text-gray-500">En attente</p>
          <p className="text-2xl font-bold text-yellow-600">{data.filter(a => a.status === 'en_attente').length}</p>
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
          <div className="flex items-center justify-between">
            <div className="flex items-center border border-gray-200 rounded-lg px-3 py-2 flex-1 max-w-md">
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Rechercher par stagiaire..."
                className="flex-1 text-sm text-gray-700 bg-transparent outline-none placeholder-gray-400"
              />
              <HiFilter className="h-5 w-5 text-gray-400" />
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <button onClick={() => setFilterOpen(!filterOpen)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                  <HiFilter className="h-4 w-4" />
                  {filterStatus ? ABSENCE_STATUSES.find(s => s.value === filterStatus)?.label : 'Statut'}
                </button>
                {filterOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[160px]">
                    <button onClick={() => { setFilterStatus(''); setFilterOpen(false); setPage(1); }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${!filterStatus ? 'text-primary-600 font-medium' : 'text-gray-700'}`}>
                      Tous
                    </button>
                    {ABSENCE_STATUSES.map(s => (
                      <button key={s.value} onClick={() => { setFilterStatus(s.value); setFilterOpen(false); setPage(1); }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${filterStatus === s.value ? 'text-primary-600 font-medium' : 'text-gray-700'}`}>
                        {s.label}
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

      {/* Edit Modal - Update status/justification */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Modifier l'absence"
        footer={<><Button variant="secondary" onClick={() => setEditOpen(false)}>Annuler</Button><Button onClick={handleSave} loading={saving}>Enregistrer</Button></>}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stagiaire</label>
            <p className="text-sm text-gray-900">{selected?.stagiaire?.user?.prenom} {selected?.stagiaire?.user?.nom}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Module</label>
            <p className="text-sm text-gray-900">{selected?.module?.nom || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <p className="text-sm text-gray-900">{selected?.date_absence} ({selected?.heure_debut} - {selected?.heure_fin})</p>
          </div>
          <Select
            label="Statut"
            value={editForm.status}
            onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
            options={statusOptions}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Justification</label>
            <textarea
              value={editForm.justification}
              onChange={(e) => setEditForm({ ...editForm, justification: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Motif de justification..."
            />
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={handleDelete}
        title="Supprimer l'absence" message="Êtes-vous sûr de vouloir supprimer cette absence ?" />
    </div>
  );
};

export default AbsencesPage;
