import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { HiBell, HiChevronDown, HiLogout, HiCog, HiUser, HiSearch, HiSun, HiMoon, HiCalendar } from 'react-icons/hi';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { storage } from '../../utils/storage';

const getAcademicYears = () => {
  const currentYear = new Date().getFullYear();
  return [
    `${currentYear - 2} / ${currentYear - 1}`,
    `${currentYear - 1} / ${currentYear}`,
    `${currentYear} / ${currentYear + 1}`,
    `${currentYear + 1} / ${currentYear + 2}`,
  ];
};

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

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const now = new Date();
  const currentYear = now.getFullYear();
  const academicStart = now.getMonth() >= 8 ? currentYear : currentYear - 1;
  const [selectedYear, setSelectedYear] = useState(`${academicStart} / ${academicStart + 1}`);
  const [searchQuery, setSearchQuery] = useState('');
  const [avatar, setAvatar] = useState<string | null>(() => storage.getAvatar());
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

  // Listen for avatar changes dispatched from the settings page
  useEffect(() => {
    const onAvatarChange = () => setAvatar(storage.getAvatar());
    window.addEventListener('avatarUpdated', onAvatarChange);
    return () => window.removeEventListener('avatarUpdated', onAvatarChange);
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
    <header className={`sticky top-0 z-20 border-b transition-colors ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className={`px-6 py-3 flex items-center justify-between`}>
        {/* Search */}
        <div className="relative w-72" ref={searchRef}>
          <HiSearch className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
          <input
            type="text"
            placeholder="Search modules, stagiaires, examens..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={handleSearchKeyDown}
            className={`w-full pl-9 pr-10 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${isDark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'}`}
          />
          <div className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            <kbd className={`text-xs px-1.5 py-0.5 rounded border font-sans ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-200'}`}>&#8984;</kbd>
          </div>
          {searchOpen && filteredPages.length > 0 && (
            <div className={`absolute top-full left-0 right-0 mt-1 rounded-lg shadow-lg z-50 py-1 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              {filteredPages.map(p => (
                <button key={p.path} onClick={() => handleSearchSelect(p.path)}
                  className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors ${isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'}`}>
                  <HiSearch className={`h-4 w-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
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
              className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-sm transition-colors ${isDark ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              <HiCalendar className={`h-4 w-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              <span>Année Scolaire : {selectedYear}</span>
              <HiChevronDown className={`h-4 w-4 transition-transform ${isDark ? 'text-gray-500' : 'text-gray-400'} ${yearOpen ? 'rotate-180' : ''}`} />
            </button>
            {yearOpen && (
              <div className={`absolute right-0 mt-1 w-full rounded-lg shadow-lg z-50 py-1 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                {getAcademicYears().map(year => (
                  <button key={year} onClick={() => { setSelectedYear(year); setYearOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${selectedYear === year ? `font-medium ${isDark ? 'text-primary-400 bg-primary-900/20' : 'text-primary-600 bg-primary-50'}` : isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'}`}>
                    {year}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dark/Light Mode Toggle */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg transition-colors border ${isDark ? 'text-gray-300 hover:text-white hover:bg-gray-800 border-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 border-gray-200'}`}
            title={isDark ? 'Light Mode' : 'Dark Mode'}
          >
            {isDark ? <HiSun className="h-5 w-5" /> : <HiMoon className="h-5 w-5" />}
          </button>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className={`relative p-2 rounded-lg transition-colors border ${isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800 border-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 border-gray-200'}`}
            >
              <HiBell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-danger-500 rounded-full" />
            </button>
            {notifOpen && (
              <div className={`absolute right-0 mt-2 w-80 rounded-lg shadow-lg border z-50 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className={`px-4 py-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                  <h3 className={`text-sm font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Notifications</h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {NOTIFICATIONS.map(notif => (
                    <div key={notif.id} className={`px-4 py-3 border-b cursor-pointer transition-colors ${isDark ? `border-gray-700 hover:bg-gray-700 ${notif.unread ? 'bg-primary-900/20' : ''}` : `border-gray-50 hover:bg-gray-50 ${notif.unread ? 'bg-blue-50/30' : ''}`}`}>
                      <p className={`text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{notif.message}</p>
                      <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>{notif.time}</p>
                    </div>
                  ))}
                </div>
                <div className={`px-4 py-2 text-center border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                  <button className="text-sm font-medium text-primary-500 hover:text-primary-400">Voir tout</button>
                </div>
              </div>
            )}
          </div>

          {/* User avatar dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center hover:opacity-80 transition-opacity"
              title="Profile menu"
            >
              {avatar ? (
                <img
                  src={avatar}
                  alt="avatar"
                  className={`h-9 w-9 rounded-full object-cover ring-2 transition-colors ${isDark ? 'ring-primary-900' : 'ring-primary-100'}`}
                />
              ) : (
                <div className={`h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-semibold ring-2 transition-colors ${isDark ? 'bg-primary-700 ring-primary-900' : 'bg-primary-600 ring-primary-100'}`}>
                  {user?.prenom?.charAt(0)}{user?.nom?.charAt(0)}
                </div>
              )}
            </button>

            {dropdownOpen && (
              <div className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg border py-1 z-50 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className={`px-4 py-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                  <p className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{user?.prenom} {user?.nom}</p>
                  <p className={`text-xs capitalize ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{user?.role}</p>
                </div>
                <button
                  onClick={() => { setDropdownOpen(false); navigate(`${prefix}/parametres?tab=account`); }}
                  className={`w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors ${isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  <HiUser className="h-4 w-4" /> Profile
                </button>
                <button
                  onClick={() => { setDropdownOpen(false); navigate(`${prefix}/parametres?tab=security`); }}
                  className={`w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors ${isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  <HiCog className="h-4 w-4" /> Paramètre
                </button>
                <div className={`my-1 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`} />
                <button
                  onClick={handleLogout}
                  className={`w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors ${isDark ? 'text-red-400 hover:bg-red-900/20' : 'text-danger-600 hover:bg-danger-50'}`}
                >
                  <HiLogout className="h-4 w-4" /> Se déconnecter
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
