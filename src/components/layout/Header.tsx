import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { HiBell, HiChevronDown, HiLogout, HiCog, HiUser, HiSearch } from 'react-icons/hi';
import { useNavigate } from 'react-router-dom';

const ACADEMIC_YEARS = [
  '2021 / 2022',
  '2022 / 2023',
  '2023 / 2024',
  '2024 / 2025',
  '2025 / 2026',
];

const SEARCH_PAGES: { label: string; keywords: string[]; path: string }[] = [
  { label: 'Stagiaires', keywords: ['stagiaire', 'stagaire', 'etudiant', 'eleve'], path: '/admin/stagiaires' },
  { label: 'Formateurs', keywords: ['formateur', 'professeur', 'prof', 'enseignant'], path: '/admin/formateurs' },
  { label: 'Groupes', keywords: ['groupe', 'group', 'classe', 'class'], path: '/admin/groupes' },
  { label: 'Salles', keywords: ['salle', 'room'], path: '/admin/salles' },
  { label: 'Modules', keywords: ['module', 'matiere', 'cours'], path: '/admin/modules' },
  { label: 'Filières', keywords: ['filiere', 'filière', 'programme'], path: '/admin/filieres' },
  { label: 'Emploi du temps', keywords: ['emploi', 'temps', 'horaire', 'schedule'], path: '/admin/emploi-du-temps' },
  { label: 'Examens & Notes', keywords: ['examen', 'exam', 'note', 'test'], path: '/admin/examens' },
  { label: 'Absences', keywords: ['absence', 'retard', 'present'], path: '/admin/absences' },
  { label: 'Utilisateurs', keywords: ['utilisateur', 'user', 'compte'], path: '/admin/utilisateurs' },
  { label: 'Paramètres', keywords: ['parametre', 'paramètre', 'setting', 'config'], path: '/admin/parametres' },
];

const NOTIFICATIONS = [
  { id: 1, message: 'Formateur Omar Lhmidi n\'est pas présent au cours Dev 101', time: 'Il y a 5 min', unread: true },
  { id: 2, message: 'Stagiaire Ahmed Tazi a déposé une justification d\'absence', time: 'Il y a 30 min', unread: true },
  { id: 3, message: 'Examen de Base de Données programmé pour demain - Salle A2', time: 'Il y a 1h', unread: false },
];

const getRolePrefix = (role?: string) => {
  switch (role) {
    case 'directeur': return '/admin';
    case 'formateur': return '/formateur';
    case 'stagiaire': return '/stagiaire';
    case 'surveillant': return '/surveillant';
    default: return '/admin';
  }
};

const BACKEND_URL = (process.env.REACT_APP_API_URL || 'http://localhost:8000/api').replace('/api', '');

const getAvatarUrl = (avatar?: string | null) => {
  if (!avatar) return null;
  if (avatar.startsWith('http')) return avatar;
  return `${BACKEND_URL}${avatar}`;
};

const AvatarCircle: React.FC<{ user: any }> = ({ user }) => {
  const [imgError, setImgError] = useState(false);
  const avatarUrl = getAvatarUrl(user?.avatar);
  const showImg = avatarUrl && !imgError;
  return (
    <div className="h-9 w-9 bg-primary-600 rounded-full ring-2 ring-primary-100 overflow-hidden flex items-center justify-center text-white text-sm font-semibold">
      {showImg ? (
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" onError={() => setImgError(true)} />
      ) : (
        <>{user?.prenom?.charAt(0)}{user?.nom?.charAt(0)}</>
      )}
    </div>
  );
};

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState('2024 / 2025');
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const yearRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const prefix = getRolePrefix(user?.role);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setDropdownOpen(false);
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) setNotifOpen(false);
      if (yearRef.current && !yearRef.current.contains(event.target as Node)) setYearOpen(false);
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredPages = searchQuery.trim()
    ? SEARCH_PAGES.filter(p =>
        p.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.keywords.some(k => k.includes(searchQuery.toLowerCase()))
      )
    : [];

  const handleSearchSelect = (path: string) => {
    setSearchQuery('');
    setSearchOpen(false);
    navigate(path);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && filteredPages.length > 0) {
      handleSearchSelect(filteredPages[0].path);
    }
  };

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Search */}
        <div className="relative w-72" ref={searchRef}>
          <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={handleSearchKeyDown}
            className="w-full pl-9 pr-10 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder-gray-400"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            <kbd className="text-xs bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 font-sans">&#8984;</kbd>
          </div>
          {searchOpen && filteredPages.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
              {filteredPages.map(p => (
                <button key={p.path} onClick={() => handleSearchSelect(p.path)}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                  <HiSearch className="h-4 w-4 text-gray-400" />
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Academic Year Dropdown */}
          <div className="relative" ref={yearRef}>
            <button
              onClick={() => setYearOpen(!yearOpen)}
              className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <HiCog className="h-4 w-4 text-gray-400" />
              <span>Année Scolaire : {selectedYear}</span>
              <HiChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${yearOpen ? 'rotate-180' : ''}`} />
            </button>
            {yearOpen && (
              <div className="absolute right-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
                {ACADEMIC_YEARS.map(year => (
                  <button key={year} onClick={() => { setSelectedYear(year); setYearOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${selectedYear === year ? 'text-primary-600 font-medium bg-primary-50' : 'text-gray-700'}`}>
                    {year}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Settings */}
          <button
            onClick={() => navigate(`${prefix}/parametres`)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
          >
            <HiCog className="h-5 w-5" />
          </button>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
            >
              <HiBell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-danger-500 rounded-full" />
            </button>
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {NOTIFICATIONS.map(notif => (
                    <div key={notif.id} className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer ${notif.unread ? 'bg-blue-50/30' : ''}`}>
                      <p className="text-sm text-gray-700">{notif.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{notif.time}</p>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2 text-center">
                  <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">Voir tout</button>
                </div>
              </div>
            )}
          </div>

          {/* User avatar dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center"
            >
              <AvatarCircle user={user} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{user?.prenom} {user?.nom}</p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                </div>
                <button
                  onClick={() => { setDropdownOpen(false); navigate(`${prefix}/parametres`); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <HiUser className="h-4 w-4" /> Profile
                </button>
                <button
                  onClick={() => { setDropdownOpen(false); navigate(`${prefix}/parametres`); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <HiCog className="h-4 w-4" /> Settings
                </button>
                <hr className="my-1 border-gray-100" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-danger-600 hover:bg-danger-50"
                >
                  <HiLogout className="h-4 w-4" /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
