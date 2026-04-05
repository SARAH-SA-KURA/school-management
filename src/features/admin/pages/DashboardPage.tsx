import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HiUsers, HiAcademicCap, HiBookOpen, HiDocumentText } from 'react-icons/hi';
import { useAuth } from '../../../hooks/useAuth';
import { dashboardApi } from '../../../api/dashboardApi';
import { stagiairesApi } from '../../../api/crudApi';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ stagiaires: 0, formateurs: 0, filieres: 0, modules: 0 });
  const [filiereData, setFiliereData] = useState<{ filiere: string; count: number }[]>([]);
  const [recentStagiaires, setRecentStagiaires] = useState<any[]>([]);

  useEffect(() => {
    dashboardApi.getStats().then(res => {
      if (res.data?.data) setStats(prev => ({ ...prev, ...res.data.data }));
    }).catch(() => {});

    dashboardApi.getStagiairesByFiliere().then(res => {
      if (res.data?.data) setFiliereData(res.data.data);
    }).catch(() => {});

    stagiairesApi.getAll({ per_page: 5 }).then(res => {
      if (res.data?.data) setRecentStagiaires(res.data.data);
    }).catch(() => {});
  }, []);

  const totalByFiliere = filiereData.reduce((sum, f) => sum + f.count, 0) || stats.stagiaires || 1;

  const statCards = [
    { label: 'Total Stagiaires', value: stats.stagiaires, icon: <HiUsers className="h-8 w-8 text-primary-600" />, bgIcon: 'bg-blue-50' },
    { label: 'Total Formateurs', value: stats.formateurs, icon: <HiAcademicCap className="h-8 w-8 text-green-600" />, bgIcon: 'bg-green-50' },
    { label: 'Total Filières', value: stats.filieres, icon: <HiBookOpen className="h-8 w-8 text-yellow-600" />, bgIcon: 'bg-yellow-50' },
    { label: 'Total Modules', value: stats.modules, icon: <HiDocumentText className="h-8 w-8 text-purple-600" />, bgIcon: 'bg-purple-50' },
  ];

  return (
    <div>
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-sm text-gray-500">Tableau de bord / Admin</p>
      </div>

      {/* Welcome Banner */}
      <div className="relative bg-gray-900 rounded-xl p-6 mb-6 overflow-hidden">
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
          <div key={card.label} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
            <div className={`${card.bgIcon} rounded-xl p-3`}>
              {card.icon}
            </div>
            <div className="flex-1">
              <p className="text-2xl font-bold text-gray-900">{card.value.toLocaleString()}</p>
              <p className="text-xs text-gray-500">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Absences Chart */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Absences</h3>
            <div className="flex items-center gap-2 text-sm text-gray-500 border border-gray-200 rounded-lg px-3 py-1">
              <span>Aujourd'hui</span>
            </div>
          </div>
          <div className="border-b border-primary-600 inline-block pb-1 mb-4">
            <span className="text-sm font-medium text-primary-600">Stagiaires</span>
          </div>
          <div className="flex justify-center gap-8 mb-4">
            <div className="text-center bg-gray-50 rounded-lg px-6 py-3">
              <p className="text-2xl font-bold text-gray-900">01</p>
              <p className="text-xs text-gray-500">Absent</p>
            </div>
            <div className="text-center bg-gray-50 rounded-lg px-6 py-3">
              <p className="text-2xl font-bold text-gray-900">01</p>
              <p className="text-xs text-gray-500">Retard</p>
            </div>
          </div>
          <div className="flex items-center justify-center h-48">
            <div className="relative">
              <svg className="w-40 h-40" viewBox="0 0 36 36">
                <path d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#93c5fd" strokeWidth="3" />
                <path d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#3b82f6" strokeWidth="3" strokeDasharray="98, 100" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-xl font-bold text-gray-900">{stats.stagiaires || 0}</p>
                <p className="text-xs text-gray-500">Présent</p>
              </div>
              <div className="absolute -bottom-2 -right-4 bg-white rounded-lg shadow px-2 py-1 text-center">
                <p className="text-sm font-bold text-gray-900">0</p>
                <p className="text-xs text-gray-500">Absent</p>
              </div>
            </div>
          </div>
        </div>

        {/* Répartition par Filière */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition par Filière</h3>
          <div className="border-b border-primary-600 inline-block pb-1 mb-4">
            <span className="text-sm font-medium text-primary-600">Filière</span>
          </div>
          <div className="grid grid-cols-4 gap-3 mb-4">
            {(filiereData.length > 0 ? filiereData.slice(0, 4) : [
              { filiere: 'Chargement...', count: 0 },
            ]).map((f) => (
              <div key={f.filiere} className="text-center bg-gray-50 rounded-lg px-2 py-3">
                <p className="text-lg font-bold text-gray-900">
                  {totalByFiliere > 0 ? Math.round((f.count / totalByFiliere) * 100) : 0}%
                </p>
                <p className="text-xs text-gray-500 truncate">{f.filiere}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center h-48">
            <div className="relative">
              <svg className="w-40 h-40" viewBox="0 0 36 36">
                <path d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#93c5fd" strokeWidth="3" />
                <path d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#3b82f6" strokeWidth="3" strokeDasharray="70, 100" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-xl font-bold text-gray-900">{stats.stagiaires || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stagiaires List Table */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Liste Stagiaires</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 font-medium text-gray-500">ID</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Nom</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Groupe</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Filière</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentStagiaires.map((s: any) => (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-600">{s.cef}</td>
                  <td className="py-3 px-4 text-gray-900 font-medium">{s.user?.prenom} {s.user?.nom}</td>
                  <td className="py-3 px-4 text-gray-600">{s.group?.nom || '-'}</td>
                  <td className="py-3 px-4 text-gray-600">{s.group?.filiere?.nom || '-'}</td>
                  <td className="py-3 px-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      s.statut === 'actif' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {s.statut === 'actif' ? 'Actif' : s.statut || 'Inactif'}
                    </span>
                  </td>
                </tr>
              ))}
              {recentStagiaires.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-gray-400">Chargement...</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4">
          <Link to="/admin/stagiaires" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            Voir tout
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
