import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { formateursApi } from '../../../api/crudApi';
import { Formateur, TableColumn } from '../../../types';
import { DataTable } from '../../../components/ui';
import { HiFilter, HiSortAscending } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useDebounce } from '../../../hooks/useDebounce';

const FormateursPage: React.FC = () => {
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

  const handlePerPageChange = (newPerPage: number) => {
    setPerPage(newPerPage);
    setPage(1);
  };

  const toggleSort = () => {
    setSortDir(d => d === 'asc' ? 'desc' : 'asc');
  };

  const columns: TableColumn<Formateur>[] = [
    {
      key: 'matricule',
      label: 'ID',
      sortable: true,
      render: (item) => (
        <span className="text-primary-600 font-medium">{item.matricule}</span>
      ),
    },
    {
      key: 'user',
      label: 'Nom Complet',
      sortable: true,
      render: (item) => (
        <span className="text-gray-900">{item.user?.prenom} {item.user?.nom}</span>
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
      render: () => (
        <button className="px-4 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors">
          Voir Profile
        </button>
      ),
    },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Formateurs</h1>
        <p className="text-sm text-gray-500">
          <Link to="/admin/dashboard" className="text-primary-600 hover:text-primary-700">Tableau de bord</Link>
          {' / '}
          <span className="text-primary-600">Personnes</span>
          {' / '}
          <span>Formateurs</span>
        </p>
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
                placeholder="Rechercher un formateur..."
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
    </div>
  );
};

export default FormateursPage;
