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
}

const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const daysLower = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const timeSlots = [
  { start: '08:30', end: '10:50' },
  { start: '11:10', end: '13:20' },
  { start: '13:30', end: '15:50' },
  { start: '16:10', end: '18:30' },
];

const GROUP_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-pink-500',
  'bg-teal-600',
  'bg-amber-600',
  'bg-indigo-600',
  'bg-purple-500',
  'bg-orange-500',
];

const getSlotIndex = (heureDebut: string): number => {
  const h = parseInt(heureDebut.split(':')[0], 10);
  if (h < 10) return 0;
  if (h < 13) return 1;
  if (h < 16) return 2;
  return 3;
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
          type: item.id % 7 === 0 ? 'a_distance' : 'presentiel',
          jour: item.jour || '',
          slot: getSlotIndex(item.heure_debut || '08:30'),
        }));
        setEntries(mapped);
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  // Build color map only from this formateur's groups
  const colorMap = useMemo(() => {
    const map = new Map<string, string>();
    let idx = 0;
    const source = formateurId ? entries.filter(e => e.formateurId === formateurId) : entries;
    const uniqueGroups = source.map(e => e.groupe).filter((v, i, a) => a.indexOf(v) === i);
    uniqueGroups.forEach(g => { map.set(g, GROUP_COLORS[idx % GROUP_COLORS.length]); idx++; });
    return map;
  }, [entries, formateurId]);

  const filteredEntries = useMemo(() => {
    if (!formateurId) return entries;
    return entries.filter(e => e.formateurId === formateurId);
  }, [entries, formateurId]);

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
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
        <div className="flex items-center gap-3 px-6 py-4 flex-wrap">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mr-1">Time Table</h2>

        </div>

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
                        <td key={day} className="px-2 py-2 align-top" style={{ minWidth: 150 }}>
                          <div className="flex flex-col gap-1.5">
                            {cellEntries.slice(0, 2).map(entry => {
                              const borderColor = getGroupColor(entry.groupe);
                              return (
                                <div key={entry.id} className={`relative pl-3 rounded-md bg-gray-50 dark:bg-gray-700/40 py-1.5 pr-2`}>
                                  <div className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-md ${borderColor}`} />
                                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 mb-1 leading-tight truncate">{entry.module}</p>
                                  {entry.salle && (
                                    <div className="flex items-center gap-1 mb-0.5">
                                      <svg className="w-3 h-3 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                      </svg>
                                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{entry.salle}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1 mb-1.5">
                                    <svg className="w-3 h-3 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{entry.groupe}</span>
                                  </div>
                                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium text-white ${entry.type === 'a_distance' ? 'bg-amber-600' : 'bg-green-600'}`}>
                                    {entry.type === 'a_distance' ? 'À distance' : 'Présentiel'}
                                  </span>
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

        <div className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
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

          {/* Group color legend */}
          {colorMap.size > 0 && (
            <div className="border border-gray-100 dark:border-gray-700 rounded-lg p-4">
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
    </div>
  );
};

export default FormateurEmploiPage;
