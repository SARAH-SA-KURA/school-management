import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { filieresApi } from '../../../api/crudApi';
import { Filiere, TableColumn } from '../../../types';
import { DataTable } from '../../../components/ui';
import { HiFilter, HiSortAscending } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useDebounce } from '../../../hooks/useDebounce';

const FilieresPage: React.FC = () => {
  const [data, setData] = useState<Filiere[]>([]);
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
      const res = await filieresApi.getAll({ page, search: debouncedSearch, per_page: perPage, sort_dir: sortDir });
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

  const toggleSort = () => setSortDir(d => d === 'asc' ? 'desc' : 'asc');

  const columns: TableColumn<Filiere>[] = [
    {
      key: 'code',
      label: 'Code',
      sortable: true,
      render: (item) => (
        <span className="text-primary-600 font-medium">{item.code}</span>
      ),
    },
    { key: 'nom', label: 'Nom de filière', sortable: true },
    {
      key: 'niveau',
      label: 'Niveau',
      sortable: true,
      render: () => 'Technicien Spécialisé',
    },
    {
      key: 'modules_count',
      label: 'Modules',
      sortable: true,
      render: (item) => <span>{item.modules_count ?? 0}</span>,
    },
    {
      key: 'secteur',
      label: 'Secteur',
      sortable: true,
      render: () => 'Digital & IA',
    },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Filières</h1>
        <p className="text-sm text-gray-500">
          <Link to="/admin/dashboard" className="text-primary-600 hover:text-primary-700">Tableau de bord</Link>
          {' / '}
          <span className="text-primary-600">Académique</span>
          {' / '}
          <span>Filières</span>
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
                placeholder="Rechercher une filière..."
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

export default FilieresPage;
