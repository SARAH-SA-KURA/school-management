import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HiUsers, HiAcademicCap, HiBookOpen, HiDocumentText } from 'react-icons/hi';
import { useAuth } from '../../../hooks/useAuth';
import { dashboardApi } from '../../../api/dashboardApi';
import { stagiairesApi } from '../../../api/crudApi';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const basePath = user?.role === 'surveillant' ? '/surveillant' : '/admin';
  const [stats, setStats] = useState({
    stagiaires: 0, formateurs: 0, filieres: 0, modules: 0,
    absences_today: 0, presents_today: 0,
  });
  const [filiereData, setFiliereData] = useState<{ filiere: string; count: number }[]>([]);
  const [recentStagiaires, setRecentStagiaires] = useState<any[]>([]);

  useEffect(() => {
    dashboardApi.getStats().then(res => {
      if (res.data?.data) setStats(prev => ({ ...prev, ...res.data.data }));
    }).catch(() => {});

    dashboardApi.getStagiairesByFiliere().then(res => {
      if (res.data?.data) setFiliereData(res.data.data);
    }).catch(() => {});

    stagiairesApi.getAll({ per_page: 5, sort_by: 'created_at', sort_dir: 'desc' }).then(res => {
      if (res.data?.data) setRecentStagiaires(res.data.data);
    }).catch(() => {});
  }, []);

  const totalByFiliere = filiereData.reduce((sum, f) => sum + f.count, 0) || 1;

  const filiereSegments = filiereData.map((f, i) => {
    const pct = (f.count / totalByFiliere) * 100;
    return { ...f, pct, color: COLORS[i % COLORS.length] };
  });

  let cumulativeOffset = 0;
  const donutPaths = filiereSegments.map((seg) => {
    const offset = cumulativeOffset;
    cumulativeOffset += seg.pct;
    return { ...seg, offset };
  });

  const absentCount = stats.absences_today;
  const presentCount = stats.presents_today;
  const totalForAbsence = absentCount + presentCount || 1;
  const presentPct = (presentCount / totalForAbsence) * 100;

  const statCards = [
    { label: 'Total Stagiaires', value: stats.stagiaires, icon: <HiUsers className="h-8 w-8 text-primary-600" />, bgIcon: 'bg-blue-50 dark:bg-primary-900/30' },
    { label: 'Total Formateurs', value: stats.formateurs, icon: <HiAcademicCap className="h-8 w-8 text-green-600" />, bgIcon: 'bg-green-50 dark:bg-green-900/30' },
    { label: 'Total Filières', value: stats.filieres, icon: <HiBookOpen className="h-8 w-8 text-yellow-600" />, bgIcon: 'bg-yellow-50 dark:bg-yellow-900/30' },
    { label: 'Total Modules', value: stats.modules, icon: <HiDocumentText className="h-8 w-8 text-purple-600" />, bgIcon: 'bg-purple-50 dark:bg-purple-900/30' },
  ];

  return (
    <div>
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Tableau de bord</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Tableau de bord / Admin</p>
      </div>

      {/* Welcome Banner */}
      <div className="relative bg-gray-900 dark:bg-gray-800 rounded-xl p-6 mb-6 overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold text-white">
            Bienvenue, Mr. {user?.nom || 'Admin'}
          </h2>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
          <div className="absolute top-4 right-4 w-16 h-16 border-2 border-white rounded-full" />
          <div className="absolute top-8 right-16 w-8 h-8 border-2 border-white rounded-full" />
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-4">
            <div className={`${card.bgIcon} rounded-xl p-3`}>
              {card.icon}
            </div>
            <div className="flex-1">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{card.value.toLocaleString()}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Absences Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Absences</h3>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1">
              <span>Aujourd'hui</span>
            </div>
          </div>
          <div className="border-b border-primary-600 inline-block pb-1 mb-4">
            <span className="text-sm font-medium text-primary-600 dark:text-primary-400">Stagiaires</span>
          </div>
          <div className="flex justify-center gap-8 mb-4">
            <div className="text-center bg-gray-50 dark:bg-gray-700/50 rounded-lg px-6 py-3">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{String(absentCount).padStart(2, '0')}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Absent</p>
            </div>
            <div className="text-center bg-gray-50 dark:bg-gray-700/50 rounded-lg px-6 py-3">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">00</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Retard</p>
            </div>
          </div>
          <div className="flex items-center justify-center h-48">
            <div className="relative">
              <svg className="w-40 h-40" viewBox="0 0 36 36">
                <path d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" className="text-gray-200 dark:text-gray-700" strokeWidth="3" />
                <path d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#3b82f6" strokeWidth="3" strokeDasharray={`${presentPct}, 100`} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{presentCount}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Présent</p>
              </div>
              <div className="absolute -bottom-2 -right-4 bg-white dark:bg-gray-700 rounded-lg shadow px-2 py-1 text-center">
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{absentCount}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Absent</p>
              </div>
            </div>
          </div>
        </div>

        {/* Répartition par Filière */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Répartition par Filière</h3>
          <div className="border-b border-primary-600 inline-block pb-1 mb-4">
            <span className="text-sm font-medium text-primary-600 dark:text-primary-400">Filière</span>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {filiereSegments.slice(0, 6).map((f, i) => (
              <div key={f.filiere} className="text-center bg-gray-50 dark:bg-gray-700/50 rounded-lg px-2 py-3">
                <p className="text-lg font-bold" style={{ color: COLORS[i % COLORS.length] }}>
                  {Math.round(f.pct)}%
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{f.filiere}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center h-48">
            <div className="relative">
              <svg className="w-40 h-40" viewBox="0 0 36 36">
                {donutPaths.map((seg, i) => (
                  <circle
                    key={i}
                    cx="18" cy="18" r="15.9155"
                    fill="none"
                    stroke={seg.color}
                    strokeWidth="3"
                    strokeDasharray={`${seg.pct} ${100 - seg.pct}`}
                    strokeDashoffset={`${-seg.offset}`}
                    transform="rotate(-90 18 18)"
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{totalByFiliere}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stagiaires List Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Liste Stagiaires</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">ID</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Nom</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Groupe</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Filière</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Date Inscription</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentStagiaires.map((s: any) => (
                <tr key={s.id} className="border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{s.cef}</td>
                  <td className="py-3 px-4 text-gray-900 dark:text-gray-100 font-medium">{s.user?.prenom} {s.user?.nom}</td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{s.group?.nom || '-'}</td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{s.group?.filiere?.nom || '-'}</td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{s.date_inscription ? new Date(s.date_inscription).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</td>
                  <td className="py-3 px-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      s.status === 'actif' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                      s.status === 'abandon' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                      s.status === 'suspendu' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                      'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}>
                      {s.status === 'actif' ? 'Actif' :
                       s.status === 'abandon' ? 'Abandon' :
                       s.status === 'suspendu' ? 'Suspendu' :
                       s.status || 'Inactif'}
                    </span>
                  </td>
                </tr>
              ))}
              {recentStagiaires.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-gray-400 dark:text-gray-500">Chargement...</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4">
          <Link to={`${basePath}/stagiaires`} className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 font-medium">
            Voir tout
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
