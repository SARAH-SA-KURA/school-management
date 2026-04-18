import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useTheme } from '../../../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { HiPencil, HiBookOpen, HiClipboardCheck, HiAcademicCap } from 'react-icons/hi';
import axiosInstance from '../../../utils/axios';

interface Module {
  id: number;
  code: string;
  nom: string;
  average: number;
}

interface Stats {
  total_absences: number;
  upcoming_exams: number;
  active_modules: number;
  overall_average: number;
}

const DEMO_MODULES: Module[] = [
  { id: 1, code: 'M101', nom: 'Programmation Web', average: 14.25 },
  { id: 2, code: 'M102', nom: 'Base de donnees', average: 11.70 },
  { id: 3, code: 'M103', nom: 'Programmation Java', average: 8.80 },
  { id: 4, code: 'M201', nom: 'Reseaux Informatiques', average: 15.00 },
  { id: 5, code: 'M301', nom: 'Mathematiques Appliquees', average: 13.50 },
];

const DEMO_STATS: Stats = {
  total_absences: 4,
  upcoming_exams: 3,
  active_modules: 5,
  overall_average: 13.5,
};

const StagiaireDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes] = await Promise.all([
        axiosInstance.get('/stagiaire/stats').catch(() => null),
        axiosInstance.get('/stagiaire/modules').catch(() => null),
      ]);
      setStats(statsRes?.data?.data || DEMO_STATS);
      setModules(DEMO_MODULES);
    } catch {
      setStats(DEMO_STATS);
      setModules(DEMO_MODULES);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#121217]' : 'bg-gray-50'}`}>
        <p className={isDark ? 'text-[#8b8b9e]' : 'text-gray-500'}>Chargement...</p>
      </div>
    );
  }

  const statCards = stats ? [
    { label: 'Totales Absences', value: stats.total_absences, icon: HiAcademicCap, accent: isDark ? 'text-[#e8a0bf]' : 'text-rose-500', iconBg: isDark ? 'bg-[#2a1f28]' : 'bg-rose-50' },
    { label: 'Examens a venir', value: stats.upcoming_exams, icon: HiClipboardCheck, accent: isDark ? 'text-[#d4a574]' : 'text-amber-500', iconBg: isDark ? 'bg-[#2a2520]' : 'bg-amber-50' },
    { label: 'Modules Actifs', value: stats.active_modules, icon: HiBookOpen, accent: isDark ? 'text-[#7fa8d4]' : 'text-blue-500', iconBg: isDark ? 'bg-[#1d2331]' : 'bg-blue-50' },
  ] : [];

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#121217]' : 'bg-gray-50'}`}>
      <div className="mb-6">
        <h1 className={`text-2xl font-bold ${isDark ? 'text-[#e4e4ed]' : 'text-gray-900'}`}>
          Stagiaires Dashboard
        </h1>
      </div>

      {/* Welcome Banner */}
      <div className={`relative rounded-2xl p-6 mb-6 overflow-hidden ${
        isDark ? 'bg-[#1c1c24]' : 'bg-gray-900'
      }`}>
        <div className="relative z-10 flex items-center gap-3">
          <h2 className={`text-2xl font-bold ${isDark ? 'text-[#e4e4ed]' : 'text-white'}`}>
            Bienvenue, Mr. {user?.nom || 'Herald'}
          </h2>
          <button onClick={() => navigate('/stagiaire/parametres')} className={`${isDark ? 'text-[#5c5c6e]' : 'text-white/60'} hover:text-white/80 transition-colors`}>
            <HiPencil className="h-5 w-5" />
          </button>
        </div>
        <div className="absolute top-0 right-0 w-48 h-full opacity-5">
          <div className="absolute top-4 right-4 w-16 h-16 border-2 border-white rounded-full" />
          <div className="absolute top-12 right-20 w-10 h-10 border-2 border-white rounded-full" />
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {statCards.map((card, i) => (
          <div key={i} className={`rounded-2xl border p-5 flex items-center gap-4 ${
            isDark ? 'bg-[#1a1a22] border-[#2a2a35]' : 'bg-white border-gray-100'
          }`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.iconBg}`}>
              <card.icon className={`h-6 w-6 ${card.accent}`} />
            </div>
            <div className="flex-1">
              <span className={`text-2xl font-bold ${isDark ? 'text-[#e4e4ed]' : 'text-gray-900'}`}>
                {card.value}
              </span>
              <p className={`text-sm ${isDark ? 'text-[#6e6e82]' : 'text-gray-500'}`}>
                {card.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Module Averages */}
      <div className={`rounded-2xl border ${isDark ? 'bg-[#1a1a22] border-[#2a2a35]' : 'bg-white border-gray-200'}`}>
        <div className={`px-6 py-4 border-b ${isDark ? 'border-[#2a2a35]' : 'border-gray-200'}`}>
          <h2 className={`text-lg font-semibold ${isDark ? 'text-[#e4e4ed]' : 'text-gray-900'}`}>
            Moyennes par Module
          </h2>
        </div>
        <div className="space-y-3 p-6">
          {modules.map((mod) => {
            const avg = mod.average || 0;
            const isPass = avg >= 10;
            return (
              <div
                key={mod.id}
                className={`flex items-center justify-between p-4 rounded-xl border ${
                  isDark
                    ? isPass ? 'bg-[#162016] border-[#1e331e]' : 'bg-[#201616] border-[#331e1e]'
                    : isPass ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'
                }`}
              >
                <span className={`text-sm font-medium ${isDark ? 'text-[#c8c8d8]' : 'text-gray-800'}`}>
                  {mod.code} - {mod.nom}
                </span>
                <span className={`text-sm font-bold ${
                  isDark
                    ? isPass ? 'text-[#6dbf6d]' : 'text-[#cf6b6b]'
                    : isPass ? 'text-green-600' : 'text-red-600'
                }`}>
                  Moyenne: {avg.toFixed(2)}/20
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Overall Average */}
      {stats && (
        <div className={`mt-6 rounded-2xl border p-6 ${isDark ? 'bg-[#1a1a22] border-[#2a2a35]' : 'bg-white border-gray-200'}`}>
          <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-[#e4e4ed]' : 'text-gray-900'}`}>
            Moyenne Generale
          </h3>
          <div className={`text-4xl font-bold ${
            isDark
              ? stats.overall_average >= 10 ? 'text-[#6dbf6d]' : 'text-[#cf6b6b]'
              : stats.overall_average >= 10 ? 'text-green-600' : 'text-red-600'
          }`}>
            {stats.overall_average.toFixed(2)}/20
          </div>
        </div>
      )}
    </div>
  );
};

export default StagiaireDashboardPage;
