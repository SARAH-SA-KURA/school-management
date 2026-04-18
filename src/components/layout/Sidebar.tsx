import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';
import { ROLES } from '../../utils/constants';
import {
  HiHome,
  HiUsers,
  HiAcademicCap,
  HiBookOpen,
  HiCalendar,
  HiClipboardList,
  HiCog,
  HiOfficeBuilding,
  HiUserGroup,
  HiClock,
  HiDocumentText,
  HiShieldCheck,
  HiChevronRight,
} from 'react-icons/hi';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  hasSubmenu?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();

  const getNavGroups = (): NavGroup[] => {
    if (!user) return [];

    switch (user.role) {
      case ROLES.DIRECTEUR:
        return [
          {
            title: 'Main',
            items: [
              { label: 'Tableau de bord', path: '/admin/dashboard', icon: <HiHome className="h-5 w-5" /> },
            ],
          },
          {
            title: 'Personnes',
            items: [
              { label: 'Stagiaires', path: '/admin/stagiaires', icon: <HiUsers className="h-5 w-5" />, hasSubmenu: true },
              { label: 'Formateurs', path: '/admin/formateurs', icon: <HiAcademicCap className="h-5 w-5" />, hasSubmenu: true },
            ],
          },
          {
            title: 'Académique',
            items: [
              { label: 'Groupes', path: '/admin/groupes', icon: <HiUserGroup className="h-5 w-5" /> },
              { label: 'Salles', path: '/admin/salles', icon: <HiOfficeBuilding className="h-5 w-5" /> },
              { label: 'Modules', path: '/admin/modules', icon: <HiDocumentText className="h-5 w-5" /> },
              { label: 'Filières', path: '/admin/filieres', icon: <HiBookOpen className="h-5 w-5" /> },
              { label: 'Emploi du temps', path: '/admin/emploi-du-temps', icon: <HiCalendar className="h-5 w-5" /> },
              { label: 'Examens & Note', path: '/admin/examens', icon: <HiClipboardList className="h-5 w-5" /> },
            ],
          },
          {
            title: 'Gestion',
            items: [
              { label: 'Absences', path: '/admin/absences', icon: <HiClock className="h-5 w-5" />, hasSubmenu: true },
            ],
          },
          {
            title: 'Gestion des utilisateurs',
            items: [
              { label: 'Utilisateurs', path: '/admin/utilisateurs', icon: <HiShieldCheck className="h-5 w-5" /> },
            ],
          },
          {
            title: 'Paramètres',
            items: [
              { label: 'Paramètres généraux', path: '/admin/parametres', icon: <HiCog className="h-5 w-5" /> },
            ],
          },
        ];
      case ROLES.FORMATEUR:
        return [
          {
            title: 'Main',
            items: [
              { label: 'Tableau de bord', path: '/formateur/dashboard', icon: <HiHome className="h-5 w-5" /> },
            ],
          },
          {
            title: 'Académique',
            items: [
              { label: 'Modules', path: '/formateur/modules', icon: <HiBookOpen className="h-5 w-5" /> },
              { label: 'Emploi du temps', path: '/formateur/emploi-du-temps', icon: <HiCalendar className="h-5 w-5" /> },
              { label: 'Examens & Notes', path: '/formateur/examens', icon: <HiClipboardList className="h-5 w-5" /> },
              { label: 'Absences', path: '/formateur/absences', icon: <HiClock className="h-5 w-5" /> },
            ],
          },
          {
            title: 'Paramètres',
            items: [
              { label: 'Paramètres', path: '/formateur/parametres', icon: <HiCog className="h-5 w-5" /> },
            ],
          },
        ];
      case ROLES.STAGIAIRE:
        return [
          {
            title: 'Main',
            items: [
              { label: 'Tableau de bord', path: '/stagiaire/dashboard', icon: <HiHome className="h-5 w-5" /> },
            ],
          },
          {
            title: 'Académique',
            items: [
              { label: 'Modules', path: '/stagiaire/modules', icon: <HiBookOpen className="h-5 w-5" /> },
              { label: 'Emploi du temps', path: '/stagiaire/emploi-du-temps', icon: <HiCalendar className="h-5 w-5" /> },
              { label: 'Absences', path: '/stagiaire/absences', icon: <HiClock className="h-5 w-5" /> },
              { label: 'Examens & Notes', path: '/stagiaire/examens', icon: <HiClipboardList className="h-5 w-5" /> },
            ],
          },
          {
            title: 'Paramètres',
            items: [
              { label: 'Paramètres', path: '/stagiaire/parametres', icon: <HiCog className="h-5 w-5" /> },
            ],
          },
        ];
      case ROLES.SURVEILLANT:
        return [
          {
            title: 'Main',
            items: [
              { label: 'Tableau de bord', path: '/surveillant/dashboard', icon: <HiHome className="h-5 w-5" /> },
            ],
          },
          {
            title: 'Personnes',
            items: [
              { label: 'Stagiaires', path: '/surveillant/stagiaires', icon: <HiUsers className="h-5 w-5" />, hasSubmenu: true },
              { label: 'Formateurs', path: '/surveillant/formateurs', icon: <HiAcademicCap className="h-5 w-5" />, hasSubmenu: true },
            ],
          },
          {
            title: 'Académique',
            items: [
              { label: 'Groupes', path: '/surveillant/groupes', icon: <HiUserGroup className="h-5 w-5" /> },
              { label: 'Salles', path: '/surveillant/salles', icon: <HiOfficeBuilding className="h-5 w-5" /> },
              { label: 'Modules', path: '/surveillant/modules', icon: <HiDocumentText className="h-5 w-5" /> },
              { label: 'Filières', path: '/surveillant/filieres', icon: <HiBookOpen className="h-5 w-5" /> },
              { label: 'Emploi du temps', path: '/surveillant/emploi-du-temps', icon: <HiCalendar className="h-5 w-5" /> },
              { label: 'Examens & Note', path: '/surveillant/examens', icon: <HiClipboardList className="h-5 w-5" /> },
            ],
          },
          {
            title: 'Gestion',
            items: [
              { label: 'Absences', path: '/surveillant/absences', icon: <HiClock className="h-5 w-5" />, hasSubmenu: true },
            ],
          },
          {
            title: 'Paramètres',
            items: [
              { label: 'Paramètres généraux', path: '/surveillant/parametres', icon: <HiCog className="h-5 w-5" /> },
            ],
          },
        ];
      default:
        return [];
    }
  };

  const navGroups = getNavGroups();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 w-56 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-colors">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-4">
        <img src={isDark ? '/images/logo-dark.png' : '/images/logo.png'} alt="MACOMPUS" className="h-8" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        {navGroups.map((group, idx) => (
          <div key={group.title} className={idx > 0 ? 'mt-5' : ''}>
            <div className="flex items-center gap-2 px-3 mb-3">
              <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-[0.12em] whitespace-nowrap">
                {group.title}
              </p>
              <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
            </div>
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-semibold'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                    }`
                  }
                >
                  {item.icon}
                  <span className="flex-1">{item.label}</span>
                  {item.hasSubmenu && <HiChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-600" />}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
