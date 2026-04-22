import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications, AppNotification } from '../../hooks/useNotifications';
import { useTheme } from '../../contexts/ThemeContext';
import { useAcademicYear } from '../../contexts/AcademicYearContext';
import { HiBell, HiChevronDown, HiLogout, HiCog, HiUser, HiSearch, HiSun, HiMoon } from 'react-icons/hi';
import { useNavigate } from 'react-router-dom';

// Display helper: store "2025-2026" internally, show "2025 / 2026" in UI.
const yearLabel = (y: string) => y.replace('-', ' / ');

// Routes registered per role. `adminOnly: true` = only directeur (e.g. Utilisateurs).
const SEARCH_PAGES: { label: string; keywords: string[]; slug: string; adminOnly?: boolean }[] = [
  { label: 'Tableau de bord', keywords: ['dashboard', 'tableau'], slug: 'dashboard' },
  { label: 'Stagiaires', keywords: ['stagiaire', 'stagaire', 'etudiant', 'eleve'], slug: 'stagiaires' },
  { label: 'Formateurs', keywords: ['formateur', 'professeur', 'prof', 'enseignant'], slug: 'formateurs' },
  { label: 'Groupes', keywords: ['groupe', 'group', 'classe', 'class'], slug: 'groupes' },
  { label: 'Salles', keywords: ['salle', 'room'], slug: 'salles' },
  { label: 'Modules', keywords: ['module', 'matiere', 'cours'], slug: 'modules' },
  { label: 'Filières', keywords: ['filiere', 'filière', 'programme'], slug: 'filieres' },
  { label: 'Emploi du temps', keywords: ['emploi', 'temps', 'horaire', 'schedule'], slug: 'emploi-du-temps' },
  { label: 'Examens & Notes', keywords: ['examen', 'exam', 'note', 'test'], slug: 'examens' },
  { label: 'Absences', keywords: ['absence', 'retard', 'present'], slug: 'absences' },
  { label: 'Utilisateurs', keywords: ['utilisateur', 'user', 'compte'], slug: 'utilisateurs', adminOnly: true },
  { label: 'Paramètres', keywords: ['parametre', 'paramètre', 'setting', 'config'], slug: 'parametres' },
];

// Lightweight "il y a N min/h/j" formatter (French)
const timeAgo = (iso?: string | null): string => {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (isNaN(then)) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return 'à l\u2019instant';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `il y a ${diffD} j`;
  const diffMo = Math.floor(diffD / 30);
  if (diffMo < 12) return `il y a ${diffMo} mois`;
  const diffY = Math.floor(diffMo / 12);
  return `il y a ${diffY} an${diffY > 1 ? 's' : ''}`;
};

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
    <div className="h-9 w-9 bg-primary-600 rounded-full ring-2 ring-primary-100 dark:ring-primary-900/50 overflow-hidden flex items-center justify-center text-white text-sm font-semibold">
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
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { year: selectedYear, setYear: setSelectedYear, availableYears } = useAcademicYear();
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
    ? SEARCH_PAGES.filter(p => {
        if (p.adminOnly && user?.role !== 'directeur') return false;
        const q = searchQuery.toLowerCase();
        return p.label.toLowerCase().includes(q) || p.keywords.some(k => k.includes(q));
      })
    : [];

  const handleSearchSelect = (slug: string) => {
    setSearchQuery('');
    setSearchOpen(false);
    navigate(`${prefix}/${slug}`);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && filteredPages.length > 0) {
      handleSearchSelect(filteredPages[0].slug);
    }
  };

  const iconBtn = "p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors border border-gray-200 dark:border-gray-700";

  return (
    <header className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-3 transition-colors">
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
            className="w-full pl-9 pr-10 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder-gray-400 dark:placeholder-gray-500"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            <kbd className="text-xs bg-gray-100 dark:bg-gray-700 dark:text-gray-300 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-600 font-sans">&#8984;</kbd>
          </div>
          {searchOpen && filteredPages.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 py-1">
              {filteredPages.map(p => (
                <button key={p.slug} onClick={() => handleSearchSelect(p.slug)}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
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
              className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <HiCog className="h-4 w-4 text-gray-400" />
              <span>Année Scolaire : {yearLabel(selectedYear)}</span>
              <HiChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${yearOpen ? 'rotate-180' : ''}`} />
            </button>
            {yearOpen && (
              <div className="absolute right-0 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 py-1">
                {availableYears.map(year => (
                  <button key={year} onClick={() => { setSelectedYear(year); setYearOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedYear === year ? 'text-primary-600 dark:text-primary-400 font-medium bg-primary-50 dark:bg-primary-900/30' : 'text-gray-700 dark:text-gray-200'}`}>
                    {yearLabel(year)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className={iconBtn}
          >
            {isDark ? <HiSun className="h-5 w-5" /> : <HiMoon className="h-5 w-5" />}
          </button>

          {/* Settings */}
          <button
            onClick={() => navigate(`${prefix}/parametres`)}
            className={iconBtn}
          >
            <HiCog className="h-5 w-5" />
          </button>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className={`relative ${iconBtn}`}
              aria-label="Notifications"
            >
              <HiBell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-danger-500 text-white text-[10px] font-bold rounded-full ring-2 ring-white dark:ring-gray-900">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</span>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                      Aucune notification
                    </div>
                  ) : (
                    notifications.map((notif: AppNotification) => {
                      const unread = !notif.read_at;
                      const handleClick = async () => {
                        if (unread) await markRead(notif.id);
                        if (notif.action_url) {
                          navigate(notif.action_url);
                          setNotifOpen(false);
                        }
                      };
                      return (
                        <button
                          type="button"
                          key={notif.id}
                          onClick={handleClick}
                          className={`w-full text-left px-4 py-3 border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${unread ? 'bg-blue-50/30 dark:bg-primary-900/20' : ''}`}
                        >
                          <div className="flex items-start gap-2">
                            {unread && (
                              <span className="mt-1.5 h-2 w-2 rounded-full bg-primary-500 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{notif.title}</p>
                              <p className="text-sm text-gray-700 dark:text-gray-200 mt-0.5">{notif.message}</p>
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{timeAgo(notif.created_at)}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
                {notifications.length > 0 && (
                  <div className="px-4 py-2 text-center border-t border-gray-100 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={() => markAllRead()}
                      disabled={unreadCount === 0}
                      className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Tout marquer lu
                    </button>
                  </div>
                )}
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
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user?.prenom} {user?.nom}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role}</p>
                </div>
                <button
                  onClick={() => { setDropdownOpen(false); navigate(`${prefix}/parametres`); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <HiUser className="h-4 w-4" /> Profile
                </button>
                <button
                  onClick={() => { setDropdownOpen(false); navigate(`${prefix}/parametres`); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <HiCog className="h-4 w-4" /> Settings
                </button>
                <hr className="my-1 border-gray-100 dark:border-gray-700" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20"
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
