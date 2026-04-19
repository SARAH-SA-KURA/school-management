import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { stagiairesApi } from '../../../api/crudApi';
import { Stagiaire, TableColumn } from '../../../types';
import { DataTable } from '../../../components/ui';
import { HiSortAscending, HiX, HiMail, HiPhone, HiLocationMarker, HiCalendar, HiIdentification, HiAcademicCap, HiUserGroup } from 'react-icons/hi';
import { formatDate } from '../../../utils/formatters';
import toast from 'react-hot-toast';
import { useDebounce } from '../../../hooks/useDebounce';
import { useAuth } from '../../../hooks/useAuth';

const BACKEND_URL = (process.env.REACT_APP_API_URL || 'http://localhost:8000/api').replace('/api', '');
const getAvatarUrl = (avatar?: string | null) => {
  if (!avatar) return null;
  if (avatar.startsWith('http')) return avatar;
  return `${BACKEND_URL}${avatar}`;
};

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  actif: { label: 'Actif', bg: 'bg-green-100', text: 'text-green-700' },
  abandon: { label: 'Abandon', bg: 'bg-red-100', text: 'text-red-700' },
  suspendu: { label: 'Suspendu', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  diplome: { label: 'Diplômé', bg: 'bg-blue-100', text: 'text-blue-700' },
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

const ProfileModal: React.FC<{ stagiaire: any; onClose: () => void }> = ({ stagiaire, onClose }) => {
  if (!stagiaire) return null;

  const s = stagiaire;
  const status = statusConfig[s.status] || statusConfig.actif;

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
            <AvatarCircle user={s.user} />
            <div>
              <h2 className="text-xl font-bold">{s.user?.prenom} {s.user?.nom}</h2>
              <p className="text-sm text-gray-300">{s.cef}</p>
            </div>
          </div>
          <span className={`absolute top-5 right-14 px-3 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text} dark:bg-opacity-20`}>
            {status.label}
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
                  <p className="text-xs text-gray-500 dark:text-gray-400">CIN</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{s.cin}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <HiIdentification className="h-5 w-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">CNE</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{s.cne}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <HiCalendar className="h-5 w-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Date de naissance</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatDate(s.date_naissance)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <HiPhone className="h-5 w-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Téléphone</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{s.user?.telephone || '-'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 col-span-2">
                <HiMail className="h-5 w-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{s.user?.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 col-span-2">
                <HiLocationMarker className="h-5 w-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Adresse</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{s.adresse || '-'}</p>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-gray-100 dark:border-gray-700" />

          {/* Academic Info */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Informations académiques</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <HiUserGroup className="h-5 w-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Groupe</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{s.group?.nom || '-'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <HiAcademicCap className="h-5 w-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Filière</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{s.group?.filiere?.nom || '-'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <HiCalendar className="h-5 w-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Date d'inscription</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatDate(s.date_inscription)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Absences summary */}
          {s.absences && s.absences.length > 0 && (
            <>
              <hr className="border-gray-100 dark:border-gray-700" />
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                  Absences ({s.absences.length})
                </h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {s.absences.slice(0, 5).map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-lg px-4 py-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{a.module?.nom || 'Module'}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(a.date_absence)} - {a.heure_debut}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        a.status === 'justifiee' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                        a.status === 'en_attente' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                        'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      }`}>
                        {a.status === 'justifiee' ? 'Justifiée' : a.status === 'en_attente' ? 'En attente' : 'Non justifiée'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
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

const StagiairesPage: React.FC = () => {
  const { user } = useAuth();
  const basePath = user?.role === 'surveillant' ? '/surveillant' : '/admin';
  const [data, setData] = useState<Stagiaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [sortBy, setSortBy] = useState('nom');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [profileData, setProfileData] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const debouncedSearch = useDebounce(search);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await stagiairesApi.getAll({ page, search: debouncedSearch, per_page: perPage, sort_by: sortBy, sort_dir: sortDir });
      setData(res.data.data);
      setTotalPages(res.data.meta.last_page);
      setTotalItems(res.data.meta.total);
    } catch {
      toast.error('Erreur de chargement');
    }
    setLoading(false);
  }, [page, debouncedSearch, perPage, sortBy, sortDir]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePerPageChange = (newPerPage: number) => {
    setPerPage(newPerPage);
    setPage(1);
  };

  const toggleSort = () => {
    setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    setPage(1);
  };

  const openProfile = async (id: number) => {
    setProfileLoading(true);
    setProfileData(null);
    try {
      const res = await stagiairesApi.getById(id);
      setProfileData(res.data.data);
    } catch {
      toast.error('Erreur lors du chargement du profil');
    }
    setProfileLoading(false);
  };

  const columns: TableColumn<Stagiaire>[] = [
    {
      key: 'cef',
      label: 'ID',
      sortable: true,
      render: (item) => (
        <span className="text-primary-600 dark:text-primary-400 font-medium">{item.cef}</span>
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
      key: 'date_naissance',
      label: 'Date de naissance',
      sortable: true,
      render: (item) => formatDate(item.date_naissance),
    },
    {
      key: 'telephone',
      label: 'Téléphone',
      sortable: true,
      render: (item) => item.user?.telephone || '-',
    },
    {
      key: 'group',
      label: 'Groupe',
      sortable: true,
      render: (item) => item.group?.nom || '-',
    },
    {
      key: 'filiere',
      label: 'Filière',
      render: (item) => item.group?.filiere?.nom || '-',
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Stagiaires</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          <Link to={`${basePath}/dashboard`} className="text-primary-600 dark:text-primary-400 hover:text-primary-700">Tableau de bord</Link>
          {' / '}
          <span className="text-primary-600 dark:text-primary-400">Personnes</span>
          {' / '}
          <span>Stagiaires</span>
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
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Tous les stagiaires</h3>
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
            <div className="relative bg-white dark:bg-gray-800 rounded-xl p-8 shadow-xl">
              <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full mx-auto" />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">Chargement du profil...</p>
            </div>
          </div>
        ) : (
          <ProfileModal stagiaire={profileData} onClose={() => setProfileData(null)} />
        )
      )}
    </div>
  );
};

export default StagiairesPage;
