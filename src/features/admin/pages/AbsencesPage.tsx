import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { absencesApi } from '../../../api/crudApi';
import { Absence, TableColumn } from '../../../types';
import { DataTable } from '../../../components/ui';
import toast from 'react-hot-toast';
import { useDebounce } from '../../../hooks/useDebounce';
import { useRolePath } from '../../../hooks/useRolePath';
import { formatDate } from '../../../utils/formatters';
import { HiSearch, HiX } from 'react-icons/hi';
import { HiDocumentText } from 'react-icons/hi2';

const BACKEND_URL = (process.env.REACT_APP_API_URL || 'http://localhost:8000/api').replace('/api', '');

const statusBadge = (status: string) => {
  const styles: Record<string, string> = {
    non_justifiee: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    justifiee: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    en_attente: 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  };
  const labels: Record<string, string> = {
    non_justifiee: 'Non justifiée',
    justifiee: 'Justifiée',
    en_attente: 'En attente',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
      {labels[status] || status}
    </span>
  );
};

const AbsencesPage: React.FC = () => {
  const basePath = useRolePath();
  const [data, setData] = useState<Absence[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());
  const [filterStatus, setFilterStatus] = useState('');
  const [previewDoc, setPreviewDoc] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, search: debouncedSearch, per_page: perPage };
      if (filterStatus) params.status = filterStatus;
      const res = await absencesApi.getAll(params);
      setData(res.data.data);
      setTotalPages(res.data.meta.last_page);
      setTotalItems(res.data.meta.total);
    } catch {
      toast.error('Erreur de chargement');
    }
    setLoading(false);
  }, [page, debouncedSearch, perPage, filterStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePerPageChange = (newPerPage: number) => {
    setPerPage(newPerPage);
    setPage(1);
  };

  // Motif column rendering based on status
  const renderMotif = (item: Absence) => {
    if (item.status === 'non_justifiee') {
      return <span className="text-gray-400 dark:text-gray-500">-</span>;
    }
    if (item.status === 'justifiee') {
      const docUrl = item.justification
        ? (item.justification.startsWith('http') ? item.justification : `${BACKEND_URL}${item.justification}`)
        : null;
      return docUrl ? (
        <button
          onClick={(e) => { e.stopPropagation(); setPreviewDoc(docUrl); }}
          className="flex items-center gap-1.5 text-primary-600 dark:text-primary-400 hover:text-primary-700 transition-colors"
          title="Voir le justificatif"
        >
          <HiDocumentText className="h-5 w-5" />
          <span className="text-xs underline">Justificatif</span>
        </button>
      ) : (
        <span className="text-gray-400 dark:text-gray-500">-</span>
      );
    }
    if (item.status === 'en_attente') {
      return (
        <span className="text-sm text-gray-700 dark:text-gray-300 max-w-[200px] truncate block" title={item.motif || ''}>
          {item.motif || '-'}
        </span>
      );
    }
    return <span className="text-gray-400 dark:text-gray-500">-</span>;
  };

  const columns: TableColumn<Absence>[] = [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      render: (item) => (
        <span className="text-primary-600 dark:text-primary-400 font-medium">ABS-{String(item.id).padStart(3, '0')}</span>
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
      render: renderMotif,
    },
    {
      key: 'status',
      label: 'Statut',
      sortable: true,
      render: (item) => statusBadge(item.status),
    },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Absences</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          <Link to={`${basePath}/dashboard`} className="text-primary-600 dark:text-primary-400 hover:text-primary-700">Tableau de bord</Link>
          {' / '}
          <span className="text-primary-600 dark:text-primary-400">Gestion</span>
          {' / '}
          <span>Absences</span>
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Absences</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalItems}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Non justifiées</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{data.filter(a => a.status === 'non_justifiee').length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">En attente</p>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{data.filter(a => a.status === 'en_attente').length}</p>
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
        searchValue={search}
        onSearchChange={(val) => { setSearch(val); setPage(1); }}
        headerContent={
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Absences</h3>
          </div>
        }
        toolbarExtra={
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-800"
          >
            <option value="">Tous les statuts</option>
            <option value="non_justifiee">Non justifiée</option>
            <option value="en_attente">En attente</option>
            <option value="justifiee">Justifiée</option>
          </select>
        }
      />

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setPreviewDoc(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Justificatif</h3>
              <button onClick={() => setPreviewDoc(null)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <HiX className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 overflow-auto max-h-[calc(90vh-80px)] flex items-center justify-center">
              <img src={previewDoc} alt="Justificatif" className="max-w-full h-auto rounded-lg shadow-sm" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AbsencesPage;
