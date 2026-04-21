import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { emploiDuTempsApi } from '../../../api/crudApi';
import axiosInstance from '../../../api/axiosInstance';

interface ScheduleEntry {
  id: number;
  module: string;
  salle: string;
  formateur: string;
  formateurId: number;
  groupe: string;
  groupId: number;
  filiereId: number;
  type: 'presentiel' | 'a_distance';
  jour: string;
  slot: number;
  heureDebut: string;
  heureFin: string;
}

const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

const timeSlots = [
  { start: '08:30', end: '11:00' },
  { start: '11:00', end: '13:30' },
  { start: '13:30', end: '16:00' },
  { start: '16:00', end: '18:30' },
];

const GROUP_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-pink-500', 'bg-teal-600',
  'bg-amber-600', 'bg-indigo-600', 'bg-purple-500', 'bg-orange-500',
];

const toMinutes = (t: string): number => {
  const [h, m] = t.split(':').map(n => parseInt(n, 10));
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

const FormateurEmploiPage: React.FC = () => {
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [formateurId, setFormateurId] = useState<number | null>(null);

  useEffect(() => {
    axiosInstance.get('/auth/formateur').then(res => {
      const id = res.data?.data?.id;
      if (id) setFormateurId(id);
    }).catch(() => {});

    emploiDuTempsApi.getAll().then(res => {
      const data = res.data?.data;
      if (Array.isArray(data)) {
        const mapped: ScheduleEntry[] = data.map((item: any) => ({
          id: item.id,
          module: item.module?.nom || '',
          salle: item.salle?.nom || '',
          formateur: item.formateur?.user ? `${item.formateur.user.prenom} ${item.formateur.user.nom}` : '',
          formateurId: item.formateur_id,
          groupe: item.group?.nom || '',
          groupId: item.group_id,
          filiereId: item.group?.filiere_id || 0,
          type: 'presentiel',
          jour: item.jour || '',
          slot: getSlotIndex(item.heure_debut || '08:30'),
          heureDebut: (item.heure_debut || '').slice(0, 5),
          heureFin: (item.heure_fin || '').slice(0, 5),
        }));
        setEntries(mapped);
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filteredEntries = useMemo(() => {
    if (!formateurId) return entries;
    return entries.filter(e => e.formateurId === formateurId);
  }, [entries, formateurId]);

  const colorMap = useMemo(() => {
    const map = new Map<string, string>();
    let idx = 0;
    const uniqueGroups = filteredEntries.map(e => e.groupe).filter((v, i, a) => a.indexOf(v) === i);
    uniqueGroups.forEach(g => { map.set(g, GROUP_COLORS[idx % GROUP_COLORS.length]); idx++; });
    return map;
  }, [filteredEntries]);

  // Masse horaire: total hours this formateur works per week
  const masseHoraire = useMemo(() => {
    const total = filteredEntries.reduce((acc, e) => {
      return acc + Math.max(0, toMinutes(e.heureFin) - toMinutes(e.heureDebut));
    }, 0);
    const h = Math.floor(total / 60);
    const m = total % 60;
    return total > 0 ? (m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`) : null;
  }, [filteredEntries]);

  // rowSpan map for 5h sessions (formateur always views own schedule → always span)
  const spanMap = useMemo(() => {
    const hasSpan: Record<string, Record<number, boolean>> = {};
    const consumed: Record<string, Record<number, boolean>> = {};
    days.forEach(d => { hasSpan[d] = {}; consumed[d] = {}; });
    filteredEntries.forEach(e => {
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
  }, [filteredEntries]);

  const getSlotEntries = (jour: string, slotIdx: number) =>
    filteredEntries.filter(e => e.jour.toLowerCase() === jour.toLowerCase() && e.slot === slotIdx);

  const getGroupColor = (groupe: string) => colorMap.get(groupe) || GROUP_COLORS[0];

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Emploi du temps</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            <Link to="/formateur/dashboard" className="text-primary-600 dark:text-primary-400 hover:text-primary-700">Tableau de bord</Link>
            {' / '}
            <span className="text-primary-600 dark:text-primary-400">Académique</span>
            {' / '}
            <span>Emploi du temps</span>
          </p>
        </div>
        {masseHoraire && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" strokeWidth={2} />
              <path strokeWidth={2} d="M12 6v6l4 2" />
            </svg>
            Masse horaire : {masseHoraire} / semaine
          </span>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
        <div className="flex items-center gap-3 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Time Table</h2>
          {!loading && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {filteredEntries.length} séance{filteredEntries.length > 1 ? 's' : ''}
            </span>
          )}
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
                          style={{ minWidth: 150, height: rowSpan === 2 ? 300 : 150 }}
                        >
                          {isSaturdayAfterNoon && (
                            <div className="h-full flex items-center justify-center">
                              <span className="text-[10px] text-gray-400 dark:text-gray-600 italic">Fermé</span>
                            </div>
                          )}
                          <div className="flex flex-col gap-1.5 h-full">
                            {cellEntries.slice(0, 2).map(entry => {
                              const borderColor = getGroupColor(entry.groupe);
                              const isLong = toMinutes(entry.heureFin) - toMinutes(entry.heureDebut) >= 300;
                              return (
                                <div key={entry.id}
                                  className={`relative pl-3 rounded-md bg-gray-50 dark:bg-gray-700/40 pr-2 ${isLong ? 'py-3 flex flex-col justify-between' : 'py-1.5'}`}
                                  style={isLong ? { minHeight: 260 } : {}}
                                >
                                  <div className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-md ${borderColor}`} />
                                  <div>
                                    {isLong && (
                                      <span className={`inline-block mb-1 px-1.5 py-0.5 rounded text-[9px] font-bold text-white ${borderColor}`}>5h00</span>
                                    )}
                                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 leading-tight truncate">{entry.module}</p>
                                    <p className={`font-medium mt-0.5 ${isLong ? 'text-[11px] text-primary-700 dark:text-primary-300' : 'text-[10px] text-primary-600 dark:text-primary-400'}`}>
                                      {entry.heureDebut} → {entry.heureFin}
                                    </p>
                                  </div>
                                  <div className="mt-1">
                                    {entry.salle && (
                                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-0.5">{entry.salle}</p>
                                    )}
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{entry.groupe}</span>
                                      <span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium text-white ${entry.type === 'a_distance' ? 'bg-amber-600' : 'bg-green-600'}`}>
                                        {entry.type === 'a_distance' ? 'À distance' : 'Présentiel'}
                                      </span>
                                    </div>
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
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Group color legend */}
        {colorMap.size > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">Légende des groupes</p>
            <div className="flex flex-wrap gap-3">
              {Array.from(colorMap.entries()).map(([groupe, color]) => (
                <div key={groupe} className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full flex-shrink-0 ${color}`} />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{groupe}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FormateurEmploiPage;
