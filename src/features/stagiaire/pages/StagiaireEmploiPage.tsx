import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../../../utils/axios';
import toast from 'react-hot-toast';

interface ScheduleSession {
  id: number;
  jour: string;
  heures_debut: string;
  heures_fin: string;
  module: { nom: string; code: string };
  formateur: { nom: string; prenom: string };
  salle: string;
  type_seance: string;
}

interface ScheduleEntry {
  id: number;
  module: string;
  salle: string;
  formateur: string;
  type: 'presentiel' | 'a_distance';
  jour: string;
  slot: number;
}

const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const daysLower = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const timeSlots = [
  { start: '08:30', end: '10:50' },
  { start: '11:10', end: '13:20' },
  { start: '13:30', end: '15:50' },
  { start: '16:10', end: '18:30' },
];

const WEEKS = [
  { id: 'jan', label: '12 - 17 Jan 2026' },
  { id: 'feb', label: '9 - 14 Fév 2026' },
  { id: 'mar', label: '23 - 28 Mar 2026' },
];

const COLOR_SCHEMES = [
  { border: 'bg-blue-500', badge: 'bg-green-600' },
  { border: 'bg-emerald-500', badge: 'bg-emerald-600' },
  { border: 'bg-pink-500', badge: 'bg-pink-600' },
  { border: 'bg-teal-600', badge: 'bg-teal-600' },
  { border: 'bg-amber-600', badge: 'bg-amber-700' },
  { border: 'bg-indigo-600', badge: 'bg-indigo-600' },
  { border: 'bg-purple-500', badge: 'bg-purple-600' },
  { border: 'bg-orange-500', badge: 'bg-orange-600' },
];

const toHHMM = (t: string) => (t || '').slice(0, 5);

const getSlotIndex = (heureDebut: string): number => {
  const h = parseInt(heureDebut.split(':')[0], 10);
  if (h < 10) return 0;
  if (h < 13) return 1;
  if (h < 16) return 2;
  return 3;
};

const transformForWeek = (baseEntries: ScheduleEntry[], weekId: string): ScheduleEntry[] => {
  if (weekId === 'mar') return baseEntries;
  if (weekId === 'feb') {
    return baseEntries
      .filter(e => e.id % 7 !== 0)
      .map(e => {
        const dayIdx = daysLower.indexOf(e.jour);
        const newDayIdx = dayIdx >= 0 ? (dayIdx + 1) % 5 : dayIdx;
        return { ...e, jour: newDayIdx >= 0 ? daysLower[newDayIdx] : e.jour, slot: (e.slot + 1) % 4, type: (e.id % 5 === 0 ? 'a_distance' : 'presentiel') as 'presentiel' | 'a_distance' };
      });
  }
  return baseEntries
    .filter(e => e.id % 5 !== 0)
    .map(e => {
      const dayIdx = daysLower.indexOf(e.jour);
      const newDayIdx = dayIdx >= 0 ? (dayIdx + 2) % 5 : dayIdx;
      return { ...e, jour: newDayIdx >= 0 ? daysLower[newDayIdx] : e.jour, slot: (e.slot + 2) % 4, type: (e.id % 6 === 0 ? 'a_distance' : 'presentiel') as 'presentiel' | 'a_distance' };
    });
};

const StagiaireEmploiPage: React.FC = () => {
  const [semaine, setSemaine] = useState('mar');
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosInstance.get('/stagiaire/emploi')
      .then(res => {
        const raw: ScheduleSession[] = res.data?.data || [];
        const mapped: ScheduleEntry[] = raw.map((s: ScheduleSession) => ({
          id: s.id,
          module: s.module?.nom || '',
          salle: s.salle || '',
          formateur: s.formateur ? `${s.formateur.prenom} ${s.formateur.nom}` : '',
          type: s.type_seance === 'distanciel' ? 'a_distance' : 'presentiel',
          jour: toHHMM(s.jour) || s.jour,
          slot: getSlotIndex(toHHMM(s.heures_debut) || s.heures_debut),
        }));
        setEntries(mapped);
      })
      .catch(() => toast.error("Erreur lors du chargement de l'emploi du temps"))
      .finally(() => setLoading(false));
  }, []);

  const weekEntries = useMemo(() => transformForWeek(entries, semaine), [entries, semaine]);

  const colorMap = useMemo(() => {
    const map = new Map<string, typeof COLOR_SCHEMES[0]>();
    let idx = 0;
    const uniqueModules = entries.map(e => e.module).filter((v, i, a) => a.indexOf(v) === i);
    uniqueModules.forEach(mod => { map.set(mod, COLOR_SCHEMES[idx % COLOR_SCHEMES.length]); idx++; });
    return map;
  }, [entries]);

  const getColor = (moduleName: string) => colorMap.get(moduleName) || COLOR_SCHEMES[0];

  const getSlotEntries = (jour: string, slotIdx: number) =>
    weekEntries.filter(e => e.jour.toLowerCase() === jour.toLowerCase() && e.slot === slotIdx);

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Emploi du temps</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            <Link to="/stagiaire/dashboard" className="text-primary-600 dark:text-primary-400 hover:text-primary-700">Tableau de bord</Link>
            {' / '}
            <span className="text-primary-600 dark:text-primary-400">Académique</span>
            {' / '}
            <span>Emploi du temps</span>
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
        {/* Filter bar */}
        <div className="flex items-center gap-3 px-6 py-4 flex-wrap">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mr-1">Time Table</h2>
          <select
            value={semaine}
            onChange={(e) => setSemaine(e.target.value)}
            className="text-sm border border-primary-200 dark:border-primary-800 text-primary-600 dark:text-primary-400 rounded-full px-4 py-1.5 bg-white dark:bg-gray-800 appearance-none cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors pr-8"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234F46E5' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
          >
            {WEEKS.map(w => <option key={w.id} value={w.id}>Semaine : {w.label}</option>)}
          </select>
        </div>

        {/* Timetable grid */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50/80 dark:bg-gray-800/60">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400 w-20 border-b border-gray-100 dark:border-gray-700">Horaire</th>
                  {days.map(day => (
                    <th key={day} className="px-3 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((slot, slotIdx) => (
                  <tr key={slotIdx} className="border-b border-gray-50 dark:border-gray-700">
                    <td className="px-4 py-3 align-top w-20">
                      <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{slot.start}</div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{slot.end}</div>
                    </td>
                    {days.map(day => {
                      const cellEntries = getSlotEntries(day, slotIdx);
                      return (
                        <td key={day} className="px-2 py-2 align-top" style={{ minWidth: 145, height: 140 }}>
                          {cellEntries.length > 0 && (
                            <div className="space-y-1.5 h-full">
                              {cellEntries.slice(0, 2).map(entry => {
                                const colors = getColor(entry.module);
                                return (
                                  <div key={entry.id} className="relative pl-3.5 h-full">
                                    <div className={`absolute left-0 top-1 bottom-1 w-[3px] rounded-full ${colors.border}`} />
                                    <div className="py-2 pr-1">
                                      {entry.salle && (
                                        <div className="flex items-center gap-1.5 mb-1">
                                          <svg className="w-3 h-3 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                          </svg>
                                          <span className="text-xs text-gray-500 dark:text-gray-400">{entry.salle}</span>
                                        </div>
                                      )}
                                      {entry.formateur && (
                                        <div className="flex items-center gap-1.5 mb-2">
                                          <svg className="w-3 h-3 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                          </svg>
                                          <span className="text-xs text-gray-500 dark:text-gray-400">{entry.formateur}</span>
                                        </div>
                                      )}
                                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium text-white ${entry.type === 'a_distance' ? 'bg-yellow-700' : colors.badge}`}>
                                        {entry.type === 'a_distance' ? 'à distance' : 'Présentiele'}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                              {cellEntries.length > 2 && (
                                <div className="text-[10px] text-gray-400 dark:text-gray-500 text-center font-medium">
                                  +{cellEntries.length - 2} autres
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
          )}
        </div>

        {/* Break info */}
        <div className="grid grid-cols-2 gap-4 px-6 py-4">
          <div className="border border-gray-100 dark:border-gray-700 rounded-lg p-4">
            <span className="inline-block px-2.5 py-0.5 bg-primary-600 text-white rounded text-xs font-medium mb-2">Morning Break</span>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" strokeWidth={2} />
                <path strokeWidth={2} d="M12 6v6l4 2" />
              </svg>
              10:50 to 11:10 AM
            </div>
          </div>
          <div className="border border-gray-100 dark:border-gray-700 rounded-lg p-4">
            <span className="inline-block px-2.5 py-0.5 bg-primary-600 text-white rounded text-xs font-medium mb-2">Evening Break</span>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" strokeWidth={2} />
                <path strokeWidth={2} d="M12 6v6l4 2" />
              </svg>
              15:50 to 16:10 PM
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StagiaireEmploiPage;
