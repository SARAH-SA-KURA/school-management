import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../../contexts/ThemeContext';
import axiosInstance from '../../../utils/axios';
import toast from 'react-hot-toast';

interface Absence {
  id: number;
  date: string;
  heures_debut: string;
  heures_fin: string;
  module: { nom: string };
  formateur: { nom: string; prenom: string };
  statut: string;
}

interface AbsenceStats {
  total_absences_hours: number;
  total_absences_count: number;
  justified_hours: number;
  justified_count: number;
  unjustified_hours: number;
  unjustified_count: number;
  max_allowed_hours: number;       // 32 — hard cap
  warning_threshold: number;        // 15 — 1er engagement
  suspension_threshold: number;     // 20 — 2eme engagement
  conseil_threshold?: number;       // 30 — Conseil de discipline
}

const StagiaireAbsencesPage: React.FC = () => {
  const { isDark } = useTheme();
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [stats, setStats] = useState<AbsenceStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAbsences();
  }, []);

  const fetchAbsences = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get('/stagiaire/absences');
      const data = res.data.data;
      setAbsences(data.absences || []);
      setStats(data.stats || null);
    } catch {
      toast.error('Erreur lors du chargement des absences');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR');
  };

  // The bar tracks NON-JUSTIFIED hours against the hard cap — only unjustified
  // absences count toward the OFPPT ladder (engagement → Conseil).
  const getAbsencePercentage = () => {
    if (!stats) return 0;
    return Math.min(100, (stats.unjustified_hours / stats.max_allowed_hours) * 100);
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#121217]' : 'bg-gray-50'}`}>
        <p className={isDark ? 'text-blue-300/60' : 'text-gray-500'}>Chargement des absences...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#121217]' : 'bg-gray-50'}`}>
      <div className="mb-6">
        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Absences</h1>
        <p className={`text-sm ${isDark ? 'text-[#6e6e82]' : 'text-gray-500'}`}>
          <Link to="/stagiaire" className="text-primary-600 hover:text-primary-700">Tableau de bord</Link>
          {' / '}
          <span className="text-primary-600">Academique</span>
          {' / '}
          <span>Les absences</span>
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className={`rounded-2xl border p-5 ${isDark ? 'bg-[#1a1a22] border-[#2a2a35]' : 'bg-white border-gray-200'}`}>
          <p className={`text-sm ${isDark ? 'text-[#6e6e82]' : 'text-gray-500'}`}>Totales Absences</p>
          <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats?.total_absences_hours.toFixed(1)}h</p>
          <p className={`text-sm ${isDark ? 'text-[#5c5c6e]' : 'text-gray-400'}`}>{stats?.total_absences_count} seances</p>
        </div>
        <div className={`rounded-2xl border p-5 ${isDark ? 'bg-[#162016] border-[#1e331e]' : 'bg-white border-gray-200'}`}>
          <p className={`text-sm ${isDark ? 'text-[#6e8e6e]' : 'text-gray-500'}`}>Justifiees</p>
          <p className={`text-3xl font-bold ${isDark ? 'text-[#6dbf6d]' : 'text-green-600'}`}>{stats?.justified_hours.toFixed(1)}h</p>
          <p className={`text-sm ${isDark ? 'text-[#4a6b4a]' : 'text-gray-400'}`}>{stats?.justified_count} seances</p>
        </div>
        <div className={`rounded-2xl border p-5 ${isDark ? 'bg-[#201616] border-[#331e1e]' : 'bg-white border-gray-200'}`}>
          <p className={`text-sm ${isDark ? 'text-[#8e6e6e]' : 'text-gray-500'}`}>Non Justifiees</p>
          <p className={`text-3xl font-bold ${isDark ? 'text-[#cf6b6b]' : 'text-red-600'}`}>{stats?.unjustified_hours.toFixed(1)}h</p>
          <p className={`text-sm ${isDark ? 'text-[#6b4a4a]' : 'text-gray-400'}`}>{stats?.unjustified_count} seances</p>
        </div>
      </div>

      {/* Progress Bar */}
      {stats && (
        <div className={`rounded-2xl border p-5 mb-6 ${isDark ? 'bg-[#1a1a22] border-[#2a2a35]' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Heures non justifiees</h3>
            <span className={`text-sm ${isDark ? 'text-[#6e6e82]' : 'text-gray-500'}`}>{stats.unjustified_hours.toFixed(1)}h / {stats.max_allowed_hours}h max</span>
          </div>
          {(() => {
            const cap = stats.max_allowed_hours;
            const t1 = stats.warning_threshold;
            const t2 = stats.suspension_threshold;
            const t3 = stats.conseil_threshold ?? 30;
            const pct = (v: number) => (v / cap) * 100;
            return (
              <div className={`relative w-full h-3 rounded-full overflow-visible mb-10 ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                <div className={`h-full rounded-full ${isDark ? 'bg-gradient-to-r from-blue-500 to-indigo-500' : 'bg-gradient-to-r from-primary-600 to-primary-400'}`} style={{ width: `${getAbsencePercentage()}%` }} />
                <div className={`absolute top-full mt-1 text-xs ${isDark ? 'text-[#5c5c6e]' : 'text-gray-400'}`} style={{ left: 0 }}>0h</div>
                {/* 1er engagement */}
                <div className={`absolute top-0 bottom-0 w-0.5 ${isDark ? 'bg-yellow-400/60' : 'bg-yellow-400'}`} style={{ left: `${pct(t1)}%` }} />
                <div className={`absolute top-full mt-1 text-xs ${isDark ? 'text-yellow-400/70' : 'text-yellow-600'}`} style={{ left: `${pct(t1)}%`, transform: 'translateX(-50%)' }}>{t1}h 1er engagement</div>
                {/* 2eme engagement */}
                <div className={`absolute top-0 bottom-0 w-0.5 ${isDark ? 'bg-orange-400/60' : 'bg-orange-400'}`} style={{ left: `${pct(t2)}%` }} />
                <div className={`absolute top-full mt-4 text-xs ${isDark ? 'text-orange-400/70' : 'text-orange-600'}`} style={{ left: `${pct(t2)}%`, transform: 'translateX(-50%)' }}>{t2}h 2eme engagement</div>
                {/* Conseil */}
                <div className={`absolute top-0 bottom-0 w-0.5 ${isDark ? 'bg-red-400/80' : 'bg-red-500'}`} style={{ left: `${pct(t3)}%` }} />
                <div className={`absolute top-full mt-1 text-xs font-medium ${isDark ? 'text-[#cf6b6b]' : 'text-red-600'}`} style={{ left: `${pct(t3)}%`, transform: 'translateX(-50%)' }}>{t3}h Conseil</div>
                {/* Plafond (hard cap) */}
                <div className={`absolute top-0 bottom-0 w-0.5 ${isDark ? 'bg-red-500' : 'bg-red-700'}`} style={{ left: '100%' }} />
                <div className={`absolute top-full mt-4 text-xs font-semibold ${isDark ? 'text-[#cf6b6b]' : 'text-red-700'}`} style={{ right: 0 }}>{cap}h plafond</div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Absences Table */}
      <div className={`rounded-2xl border ${isDark ? 'bg-[#1a1a22] border-[#2a2a35]' : 'bg-white border-gray-200'}`}>
        <div className={`px-6 pt-5 pb-4 border-b ${isDark ? 'border-[#2a2a35]' : 'border-gray-200'}`}>
          <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Les absences</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className={`border-y ${isDark ? 'bg-[#1e1e28] border-[#2a2a35]' : 'bg-gray-50/50 border-gray-100'}`}>
              <th className={`w-10 px-4 py-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><input type="checkbox" className="rounded border-gray-300 text-primary-600" /></th>
              <th className={`px-4 py-3 text-left text-sm font-semibold ${isDark ? 'text-[#8b8b9e]' : 'text-gray-700'}`}>Date</th>
              <th className={`px-4 py-3 text-left text-sm font-semibold ${isDark ? 'text-[#8b8b9e]' : 'text-gray-700'}`}>Module</th>
              <th className={`px-4 py-3 text-left text-sm font-semibold ${isDark ? 'text-[#8b8b9e]' : 'text-gray-700'}`}>Formateur</th>
              <th className={`px-4 py-3 text-left text-sm font-semibold ${isDark ? 'text-[#8b8b9e]' : 'text-gray-700'}`}>Statut</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-gray-50'}`}>
            {absences.length === 0 ? (
              <tr>
                <td colSpan={5} className={`px-4 py-8 text-center ${isDark ? 'text-[#5c5c6e]' : 'text-gray-500'}`}>
                  Aucune absence enregistree
                </td>
              </tr>
            ) : (
              absences.map((a, i) => (
                <tr key={i} className={isDark ? 'hover:bg-[#1e1e28]' : 'hover:bg-gray-50/50'}>
                  <td className="px-4 py-3.5"><input type="checkbox" className="rounded border-gray-300 text-primary-600" /></td>
                  <td className={`px-4 py-3.5 text-sm font-medium ${isDark ? 'text-[#7fa8d4]' : 'text-primary-600'}`}>{formatDate(a.date)}</td>
                  <td className={`px-4 py-3.5 text-sm ${isDark ? 'text-gray-200' : 'text-gray-600'}`}>{a.module.nom}</td>
                  <td className={`px-4 py-3.5 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{a.formateur.prenom} {a.formateur.nom}</td>
                  <td className="px-4 py-3.5">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      a.statut === 'justifiee'
                        ? isDark ? 'bg-emerald-500/15 text-[#6dbf6d]' : 'bg-green-50 text-green-700'
                        : isDark ? 'bg-red-500/15 text-[#cf6b6b]' : 'bg-red-50 text-red-600'
                    }`}>
                      {a.statut === 'justifiee' ? 'Justifiee' : 'Non justifiee'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StagiaireAbsencesPage;
