import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import axiosInstance from '../../../utils/axios';
import toast from 'react-hot-toast';

interface ScheduleEntry {
  id: number;
  jour: string;
  heure_debut: string;
  heure_fin: string;
  module: { nom: string; code: string };
  group: { nom: string; filiere?: { nom: string } };
  formateur?: { user?: { nom: string; prenom: string } };
  salle: { nom: string };
}

const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const timeSlots = [
  { start: '08:30', end: '10:50' },
  { start: '11:10', end: '13:20' },
  { start: '13:30', end: '15:50' },
  { start: '16:10', end: '18:30' },
];

const slotColors = [
  'border-l-primary-400 bg-primary-50/30 dark:bg-primary-900/20',
  'border-l-emerald-400 bg-emerald-50/30 dark:bg-emerald-900/20',
  'border-l-yellow-500 bg-yellow-50/30 dark:bg-yellow-900/20',
  'border-l-blue-500 bg-blue-50/30 dark:bg-blue-900/20',
];

const SurveillantEmploiPage: React.FC = () => {
  const { isDark } = useTheme();
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterFiliere, setFilterFiliere] = useState('');
  const [filieres, setFilieres] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [filterFiliere]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filterFiliere) {
        params.filiere_id = filterFiliere;
      }

      const scheduleRes = await axiosInstance.get('/surveillant/schedule', { params });
      setSchedule(scheduleRes.data.data || []);

      if (!filterFiliere) {
        const filieresRes = await axiosInstance.get('/filieres');
        setFilieres(filieresRes.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
      toast.error('Erreur lors du chargement de l\'emploi du temps');
    } finally {
      setLoading(false);
    }
  };

  const getScheduleForSlot = (dayName: string, slotIndex: number): ScheduleEntry | undefined => {
    const dayKey = dayName.toLowerCase();
    return schedule.find(s => {
      const sDayKey = s.jour.toLowerCase();
      if (sDayKey !== dayKey) return false;
      const hour = parseInt(s.heure_debut.split(':')[0]);
      if (slotIndex === 0 && hour === 8) return true;
      if (slotIndex === 1 && hour === 11) return true;
      if (slotIndex === 2 && hour === 13 || hour === 14) return true;
      if (slotIndex === 3 && hour >= 16) return true;
      return false;
    });
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-950' : 'bg-gray-50'}`}>
      <div className="mb-6">
        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Emploi du Temps
        </h1>
        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Tableau de bord / Emploi du Temps
        </p>
      </div>

      <div className={`border rounded-xl ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className={`flex items-center gap-4 px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Emploi du Temps
          </h2>
          <select
            value={filterFiliere}
            onChange={(e) => setFilterFiliere(e.target.value)}
            className={`text-sm border rounded-lg px-3 py-1.5 ${
              isDark
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="">Toutes les filières</option>
            {filieres.map(f => (
              <option key={f.id} value={f.id}>{f.nom}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className={`px-6 py-8 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Chargement...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className={isDark ? 'bg-gray-700/50' : 'bg-gray-50'}>
                  <th className={`px-4 py-3 text-left text-sm font-medium w-24 border-b ${
                    isDark ? 'text-gray-300 border-gray-700' : 'text-gray-600 border-gray-200'
                  }`}>
                    Horaire
                  </th>
                  {days.map(d => (
                    <th
                      key={d}
                      className={`px-4 py-3 text-center text-sm font-medium border-b ${
                        isDark ? 'text-gray-300 border-gray-700' : 'text-gray-600 border-gray-200'
                      }`}
                    >
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((slot, slotIndex) => (
                  <tr key={slotIndex} className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                    <td className={`px-4 py-2 align-top ${isDark ? 'text-gray-300' : ''}`}>
                      <div className="text-sm font-medium">{slot.start}</div>
                      <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        {slot.end}
                      </div>
                    </td>
                    {days.map(day => {
                      const entry = getScheduleForSlot(day, slotIndex);
                      return (
                        <td
                          key={day}
                          className="px-2 py-2 align-top"
                          style={{ minWidth: 140, height: 120 }}
                        >
                          {entry && (
                            <div className={`rounded-lg p-3 h-full border-l-4 ${slotColors[slotIndex % slotColors.length]}`}>
                              <div className={`text-sm font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                {entry.module.nom}
                              </div>
                              <div className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                📎 {entry.salle.nom}
                              </div>
                              <div className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                👥 {entry.group.nom}
                              </div>
                              {entry.formateur?.user && (
                                <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                  👤 {entry.formateur.user.prenom} {entry.formateur.user.nom}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SurveillantEmploiPage;
