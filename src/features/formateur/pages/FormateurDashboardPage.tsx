import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useTheme } from '../../../contexts/ThemeContext';
import { HiSearch, HiEye, HiPencil, HiUsers, HiAcademicCap, HiClipboardList, HiBookOpen } from 'react-icons/hi';
import axiosInstance from '../../../utils/axios';
import toast from 'react-hot-toast';

interface Note {
  id: number;
  note: number;
  examen: {
    type: string;
    date_examen: string;
    module: {
      nom: string;
      code: string;
      coefficient: number;
    };
  };
  stagiaire: {
    user: {
      nom: string;
      prenom: string;
    };
    group: {
      nom: string;
    };
  };
}

interface Stats {
  totalStagiaires: number;
  absencesNonEnregistrees: number;
  examensAVenir: number;
  modulesEnseignes: number;
}

const FormateurDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [stats, setStats] = useState<Stats>({
    totalStagiaires: 0,
    absencesNonEnregistrees: 0,
    examensAVenir: 0,
    modulesEnseignes: 0,
  });
  const [notes, setNotes] = useState<Note[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    // Filter notes based on search query
    if (!searchQuery.trim()) {
      setFilteredNotes(notes.slice(0, 6)); // Show max 6 rows
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = notes.filter(note =>
      (note.stagiaire?.user?.nom ?? '').toLowerCase().includes(query) ||
      (note.stagiaire?.user?.prenom ?? '').toLowerCase().includes(query) ||
      (note.stagiaire?.group?.nom ?? '').toLowerCase().includes(query) ||
      (note.examen?.module?.nom ?? '').toLowerCase().includes(query) ||
      (note.examen?.module?.code ?? '').toLowerCase().includes(query)
    );

    setFilteredNotes(filtered.slice(0, 6));
  }, [searchQuery, notes]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch current formateur
      const formateurRes = await axiosInstance.get('/auth/formateur');

      const currentFormateur = formateurRes.data.data;

      if (currentFormateur) {
        // Calculate stats from real API data
        setStats({
          totalStagiaires: currentFormateur.total_stagiaires || 0,
          absencesNonEnregistrees: 0,
          examensAVenir: currentFormateur.examens_a_venir_count || 0,
          modulesEnseignes: currentFormateur.modules?.length || 0,
        });

        // Fetch recent notes
        const notesRes = await axiosInstance.get('/notes', {
          params: { formateur_id: currentFormateur.id, per_page: 50 },
        });

        const sortedNotes = notesRes.data.data.sort(
          (a: Note, b: Note) =>
            new Date(b.examen.date_examen).getTime() -
            new Date(a.examen.date_examen).getTime()
        );

        setNotes(sortedNotes);
        setFilteredNotes(sortedNotes.slice(0, 6));
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const mockStats = [
    { label: 'Total Stagiaires', value: stats.totalStagiaires, badge: '', icon: <HiUsers className={`h-6 w-6 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} /> },
    { label: 'Notes saisies', value: notes.length, badge: '', icon: <HiAcademicCap className={`h-6 w-6 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} /> },
    { label: 'Examens à venir', value: stats.examensAVenir, badge: '', icon: <HiClipboardList className={`h-6 w-6 ${isDark ? 'text-purple-400' : 'text-purple-500'}`} /> },
    { label: 'Modules enseignés', value: stats.modulesEnseignes, badge: '', icon: <HiBookOpen className={`h-6 w-6 ${isDark ? 'text-green-400' : 'text-green-500'}`} /> },
  ];

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-950' : 'bg-gray-50'}`}>
      <div className="mb-10">
        <h1 className={`text-4xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Tableau de Bord Formateur</h1>
        <p className={`text-sm font-medium ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
          <span>Formateur</span>
          <span className={`mx-2 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>/</span>
          <span>Dashboard</span>
        </p>
      </div>

      {/* Welcome Banner */}
      <div className={`relative rounded-2xl p-8 mb-8 overflow-hidden bg-gradient-to-r from-[#1e293b] to-[#0f172a]`}>
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white">
              Bienvenue, {user?.prenom} {user?.nom}
            </h2>
            <button
              onClick={() => navigate('/formateur/parametres?tab=account')}
              className="transition-opacity hover:opacity-100 opacity-80 cursor-pointer"
              title="Edit Profile"
            >
              <HiPencil className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>

        {/* Decorative shapes */}
        <svg className="absolute top-0 right-0 w-96 h-48 opacity-20" viewBox="0 0 400 200" preserveAspectRatio="none">
          {/* Orange circle */}
          <circle cx="80" cy="50" r="40" fill="#f59e0b" />
          {/* Teal arc */}
          <path d="M 300 20 Q 350 50 300 80" stroke="#14b8a6" strokeWidth="30" fill="none" strokeLinecap="round" />
          {/* White dots */}
          <circle cx="200" cy="150" r="8" fill="#ffffff" opacity="0.5" />
          <circle cx="250" cy="120" r="6" fill="#ffffff" opacity="0.5" />
          <circle cx="320" cy="140" r="7" fill="#ffffff" opacity="0.5" />
        </svg>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {mockStats.map((card, i) => (
          <div
            key={i}
            className={`rounded-xl p-5 flex flex-col transition-all duration-200 border ${
              isDark ? 'bg-gray-800/50 border-gray-700 hover:bg-gray-800 hover:border-gray-600 shadow-md' : 'bg-white border-gray-200 hover:shadow-lg hover:border-gray-300 shadow-sm'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                {card.icon}
              </div>
              <div>
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {loading ? '-' : card.value}
                </p>
                <p className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{card.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Grades Table */}
      <div className={`rounded-2xl overflow-hidden shadow-lg border ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`border-b ${isDark ? 'bg-gray-700/30 border-gray-700' : 'bg-gray-50/50 border-gray-200'}`}>
                {['Stagiaire', 'Groupe', 'Module', 'Type', 'Date', 'Coeff', 'Note'].map(h => (
                  <th
                    key={h}
                    className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-700'}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-100'}`}>
              {loading ? (
                <tr>
                  <td colSpan={7} className={`px-6 py-12 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Chargement...
                  </td>
                </tr>
              ) : filteredNotes.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className={`px-6 py-12 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                  >
                    Aucune note trouvée
                  </td>
                </tr>
              ) : (
                filteredNotes.map((row, i) => (
                  <tr
                    key={i}
                    className={`transition-all duration-150 ${isDark ? 'hover:bg-gray-700/40 border-b border-gray-700' : 'hover:bg-blue-50/50 border-b border-gray-100'}`}
                  >
                    <td className={`px-6 py-4 text-sm font-semibold ${isDark ? 'text-white' : 'text-primary-700'}`}>
                      {row.stagiaire?.user?.prenom ?? ''} {row.stagiaire?.user?.nom ?? ''}
                    </td>
                    <td className={`px-6 py-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {row.stagiaire?.group?.nom ?? '—'}
                    </td>
                    <td className={`px-6 py-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {row.examen?.module?.nom ?? '—'}
                    </td>
                    <td className={`px-6 py-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                        {row.examen.type}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {row.examen?.date_examen ? new Date(row.examen.date_examen).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td className={`px-6 py-4 text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>
                      {row.examen?.module?.coefficient ?? '—'}
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold ${row.note >= 12 ? isDark ? 'text-green-400' : 'text-green-600' : isDark ? 'text-red-400' : 'text-red-600'}`}>
                      {typeof row.note === 'number' ? `${row.note.toFixed(2)}/20` : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FormateurDashboardPage;
