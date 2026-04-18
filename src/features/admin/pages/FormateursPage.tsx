import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { formateursApi } from '../../../api/crudApi';
import { Formateur, TableColumn } from '../../../types';
import { DataTable } from '../../../components/ui';
import { HiSortAscending, HiX, HiMail, HiPhone, HiCalendar, HiIdentification, HiAcademicCap, HiBookOpen } from 'react-icons/hi';
import { formatDate } from '../../../utils/formatters';
import toast from 'react-hot-toast';
import { useDebounce } from '../../../hooks/useDebounce';
import { useRolePath } from '../../../hooks/useRolePath';
import Spinner from '../../../components/ui/Spinner';

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
      render: (item) => (
        <button
          onClick={(e) => { e.stopPropagation(); openProfile(item.id); }}
          className="px-4 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
        >
          Voir Profile
        </button>
      ),
    },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Formateurs</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          <Link to={`${basePath}/dashboard`} className="text-primary-600 dark:text-primary-400 hover:text-primary-700">Tableau de bord</Link>
          {' / '}
          <span className="text-primary-600 dark:text-primary-400">Personnes</span>
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
    </div>
  );
};

export default FormateursPage;
