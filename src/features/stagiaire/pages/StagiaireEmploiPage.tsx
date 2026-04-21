import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../../../utils/axios';
import toast from 'react-hot-toast';

interface ScheduleEntry {
  id: number;
  module: string;
  salle: string;
  formateur: string;
  type: 'presentiel' | 'a_distance';
  jour: string;
  slot: number;
  heureDebut: string;
  heureFin: string;
}

const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const daysLower = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

const timeSlots = [
  { start: '08:30', end: '11:00' },
  { start: '11:00', end: '13:30' },
  { start: '13:30', end: '16:00' },
  { start: '16:00', end: '18:30' },
];

const WEEKS = [
  { id: 'jan', label: '12 - 17 Jan 2026' },
  { id: 'feb', label: '9 - 14 Fév 2026' },
  { id: 'mar', label: '23 - 28 Mar 2026' },
];

const COLOR_SCHEMES = [
  { border: 'bg-blue-500',    badge: 'bg-green-600'  },
  { border: 'bg-emerald-500', badge: 'bg-emerald-600' },
  { border: 'bg-pink-500',    badge: 'bg-pink-600'   },
  { border: 'bg-teal-600',    badge: 'bg-teal-600'   },
  { border: 'bg-amber-600',   badge: 'bg-amber-700'  },
  { border: 'bg-indigo-600',  badge: 'bg-indigo-600' },
  { border: 'bg-purple-500',  badge: 'bg-purple-600' },
  { border: 'bg-orange-500',  badge: 'bg-orange-600' },
];

const toMinutes = (t: string): number => {
  const [h, m] = (t || '').split(':').map(n => parseInt(n, 10));
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
};

const getSlotIndex = (heureDebut: string): number => {
  const mins = toMinutes(heureDebut);
  let idx = 0;
  for (let i = 0; i < timeSlots.length; i++) {
    if (toMinutes(timeSlots[i].start) <= mins) idx = i;
  }
  return idx;
};

const transformForWeek = (baseEntries: ScheduleEntry[], weekId: string): ScheduleEntry[] => {
  if (weekId === 'mar') return baseEntries;
  if (weekId === 'feb') {
    return baseEntries
      .filter(e => e.id % 7 !== 0)
      .map(e => {
        const dayIdx = daysLower.indexOf(e.jour);
        const newDayIdx = dayIdx >= 0 ? (dayIdx + 1) % 5 : dayIdx;
        return { ...e, jour: newDayIdx >= 0 ? daysLower[newDayIdx] : e.jour, slot: (e.slot + 1) % 4 };
      });
  }
  return baseEntries
    .filter(e => e.id % 5 !== 0)
    .map(e => {
      const dayIdx = daysLower.indexOf(e.jour);
      const newDayIdx = dayIdx >= 0 ? (dayIdx + 2) % 5 : dayIdx;
      return { ...e, jour: newDayIdx >= 0 ? daysLower[newDayIdx] : e.jour, slot: (e.slot + 2) % 4 };
    });
};

const StagiaireEmploiPage: React.FC = () => {
  const [semaine, setSemaine] = useState('mar');
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosInstance.get('/stagiaire/emploi')
      .then(res => {
        const raw: any[] = res.data?.data || [];
        const mapped: ScheduleEntry[] = raw.map((s: any) => ({
          id: s.id,
          module: s.module?.nom || '',
          salle: s.salle?.nom || s.salle || '',
          formateur: s.formateur?.user
            ? `${s.formateur.user.prenom} ${s.formateur.user.nom}`
            : (s.formateur ? `${s.formateur.prenom || ''} ${s.formateur.nom || ''}`.trim() : ''),
          type: 'presentiel',
          jour: s.jour || '',
          slot: getSlotIndex((s.heure_debut || '').slice(0, 5)),
          heureDebut: (s.heure_debut || '').slice(0, 5),
          heureFin: (s.heure_fin || '').slice(0, 5),
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
    weekEntries.map(e => e.module).filter((v, i, a) => a.indexOf(v) === i)
      .forEach(mod => { map.set(mod, COLOR_SCHEMES[idx % COLOR_SCHEMES.length]); idx++; });
    return map;
  }, [weekEntries]);

  // Total study hours this week
  const totalHeures = useMemo(() => {
    const total = weekEntries.reduce((acc, e) => acc + Math.max(0, toMinutes(e.heureFin) - toMinutes(e.heureDebut)), 0);
    const h = Math.floor(total / 60);
    const m = total % 60;
    return total > 0 ? (m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`) : null;
  }, [weekEntries]);

  // rowSpan map — stagiaire views own group, always apply spans for 5h sessions
  const spanMap = useMemo(() => {
    const hasSpan: Record<string, Record<number, boolean>> = {};
    const consumed: Record<string, Record<number, boolean>> = {};
    days.forEach(d => { hasSpan[d] = {}; consumed[d] = {}; });
    weekEntries.forEach(e => {
      if (toMinutes(e.heureFin) - toMinutes(e.heureDebut) < 300) return;
      const dayKey = days.find(d => d.toLowerCase() === e.jour.toLowerCase());
      if (!dayKey) return;
      const si = e.slot;
      if (si + 1 < timeSlots.length) {
        hasSpan[dayKey][si] = true;
        consumed[dayKey][si + 1] = true;
      }
    });
    return { hasSpan, consumed };
  }, [weekEntries]);

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
        {totalHeures && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" strokeWidth={2} />
              <path strokeWidth={2} d="M12 6v6l4 2" />
            </svg>
            Volume horaire : {totalHeures} / semaine
          </span>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
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

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
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
                      if (spanMap.consumed[day]?.[slotIdx]) return null;
                      const isSaturdayAfterNoon = day === 'Samedi' && slotIdx >= 2;
                      const cellEntries = isSaturdayAfterNoon ? [] : getSlotEntries(day, slotIdx);
                      const rowSpan = (!isSaturdayAfterNoon && spanMap.hasSpan[day]?.[slotIdx]) ? 2 : 1;
                      return (
                        <td key={day} rowSpan={rowSpan}
                          className={`px-2 py-2 align-top border-l border-gray-50 dark:border-gray-700 ${isSaturdayAfterNoon ? 'bg-gray-50 dark:bg-gray-800/30' : ''}`}
                          style={{ minWidth: 145, height: rowSpan === 2 ? 300 : 140 }}
                        >
                          {isSaturdayAfterNoon && (
                            <div className="h-full flex items-center justify-center">
                              <span className="text-[10px] text-gray-400 dark:text-gray-600 italic">Fermé</span>
                            </div>
                          )}
                          {cellEntries.length > 0 && (
                            <div className="space-y-1.5 h-full">
                              {cellEntries.slice(0, 2).map(entry => {
                                const colors = getColor(entry.module);
                                const isLong = toMinutes(entry.heureFin) - toMinutes(entry.heureDebut) >= 300;
                                return (
                                  <div key={entry.id}
                                    className={`relative pl-3.5 ${isLong ? 'py-3 flex flex-col justify-between' : 'h-full'}`}
                                    style={isLong ? { minHeight: 260 } : {}}
                                  >
                                    <div className={`absolute left-0 top-1 bottom-1 w-[3px] rounded-full ${colors.border}`} />
                                    <div className="py-1 pr-1">
                                      {isLong && (
                                        <span className={`inline-block mb-1 px-1.5 py-0.5 rounded text-[9px] font-bold text-white ${colors.badge}`}>5h00</span>
                                      )}
                                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">{entry.module}</p>
                                      <p className={`font-medium mt-0.5 ${isLong ? 'text-[11px] text-primary-700 dark:text-primary-300' : 'text-[10px] text-primary-600 dark:text-primary-400'}`}>
                                        {entry.heureDebut} → {entry.heureFin}
                                      </p>
                                    </div>
                                    <div className="pr-1">
                                      {entry.salle && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-0.5">{entry.salle}</p>
                                      )}
                                      {entry.formateur && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-1">{entry.formateur}</p>
                                      )}
                                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium text-white ${entry.type === 'a_distance' ? 'bg-yellow-700' : colors.badge}`}>
                                        {entry.type === 'a_distance' ? 'À distance' : 'Présentiel'}
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
      </div>
    </div>
  );
};

export default StagiaireEmploiPage;
