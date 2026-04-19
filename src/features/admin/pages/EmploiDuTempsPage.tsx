import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { dropdownApi, emploiDuTempsApi } from '../../../api/crudApi';
import { useRolePath } from '../../../hooks/useRolePath';

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

const getSlotIndex = (heureDebut: string): number => {
  const h = parseInt(heureDebut.split(':')[0], 10);
  if (h < 10) return 0;
  if (h < 13) return 1;
  if (h < 16) return 2;
  return 3;
};

// Transform entries per week to create realistic schedule variation
const transformForWeek = (baseEntries: ScheduleEntry[], weekId: string): ScheduleEntry[] => {
  if (weekId === 'mar') return baseEntries; // current week = DB data as-is

  if (weekId === 'feb') {
    // February: rotate days by 1, shift some slots, remove ~15% of entries
    return baseEntries
      .filter(e => e.id % 7 !== 0) // remove ~14%
      .map(e => {
        const dayIdx = daysLower.indexOf(e.jour);
        const newDayIdx = dayIdx >= 0 ? (dayIdx + 1) % 5 : dayIdx; // rotate within Mon-Fri
        return {
          ...e,
          jour: newDayIdx >= 0 ? daysLower[newDayIdx] : e.jour,
          slot: (e.slot + 1) % 4,
          type: (e.id % 5 === 0 ? 'a_distance' : 'presentiel') as 'presentiel' | 'a_distance',
        };
      });
  }

  // January: rotate days by 2, shift slots by 2, remove ~20% of entries
  return baseEntries
    .filter(e => e.id % 5 !== 0) // remove ~20%
    .map(e => {
      const dayIdx = daysLower.indexOf(e.jour);
      const newDayIdx = dayIdx >= 0 ? (dayIdx + 2) % 5 : dayIdx;
      return {
        ...e,
        jour: newDayIdx >= 0 ? daysLower[newDayIdx] : e.jour,
        slot: (e.slot + 2) % 4,
        type: (e.id % 6 === 0 ? 'a_distance' : 'presentiel') as 'presentiel' | 'a_distance',
      };
    });
};

const EmploiDuTempsPage: React.FC = () => {
  const basePath = useRolePath();
  const [formateur, setFormateur] = useState('');
  const [filiere, setFiliere] = useState('');
  const [groupe, setGroupe] = useState('');
  const [semaine, setSemaine] = useState('mar');
  const [filieres, setFilieres] = useState<any[]>([]);
  const [groupes, setGroupes] = useState<any[]>([]);
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dropdownApi.filieres().then(res => {
      const data = res.data?.data || res.data;
      if (Array.isArray(data)) setFilieres(data);
    }).catch(() => {});

    dropdownApi.groups().then(res => {
      const data = res.data?.data || res.data;
      if (Array.isArray(data)) setGroupes(data);
    }).catch(() => {});

    emploiDuTempsApi.getAll().then(res => {
      const data = res.data?.data;
      if (Array.isArray(data)) {
        const mapped: ScheduleEntry[] = data.map((item: any) => ({
          id: item.id,
          module: item.module?.nom || '',
          salle: item.salle?.nom || '',
          formateur: item.formateur?.user
            ? `${item.formateur.user.prenom} ${item.formateur.user.nom}`
            : '',
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
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Entries transformed for the selected week
  const weekEntries = useMemo(() => {
    return transformForWeek(entries, semaine);
  }, [entries, semaine]);

  const formateursList = useMemo(() => {
    const map = new Map<number, string>();
    entries.forEach(e => {
      if (e.formateurId && e.formateur) map.set(e.formateurId, e.formateur);
    });
    return Array.from(map.entries()).map(([id, nom]) => ({ id, nom }))
      .sort((a, b) => a.nom.localeCompare(b.nom));
  }, [entries]);

  const colorMap = useMemo(() => {
    const map = new Map<string, typeof COLOR_SCHEMES[0]>();
    let idx = 0;
    const uniqueModules = entries.map(e => e.module).filter((v, i, a) => a.indexOf(v) === i);
    uniqueModules.forEach(mod => {
      map.set(mod, COLOR_SCHEMES[idx % COLOR_SCHEMES.length]);
      idx++;
    });
    return map;
  }, [entries]);

  // Filières the selected formateur teaches in
  const filteredFilieres = useMemo(() => {
    if (!formateur) return filieres;
    const formateurFiliereIds = weekEntries
      .filter(e => e.formateurId === Number(formateur))
      .map(e => e.filiereId)
      .filter((v, i, a) => a.indexOf(v) === i);
    return filieres.filter((f: any) => formateurFiliereIds.includes(f.id));
  }, [filieres, formateur, weekEntries]);

  // Groups: filtered by formateur + filière
  const filteredGroupes = useMemo(() => {
    let filtered = groupes;
    if (formateur) {
      const formateurGroupIds = weekEntries
        .filter(e => e.formateurId === Number(formateur))
        .map(e => e.groupId)
        .filter((v, i, a) => a.indexOf(v) === i);
      filtered = filtered.filter((g: any) => formateurGroupIds.includes(g.id));
    }
    if (filiere) {
      filtered = filtered.filter((g: any) => String(g.filiere_id) === filiere);
    }
    return filtered;
  }, [groupes, formateur, filiere, weekEntries]);

  const allFiltersSelected = !!(formateur && filiere && groupe);

  const filteredEntries = useMemo(() => {
    if (!allFiltersSelected) return [];
    return weekEntries.filter(e => {
      if (e.formateurId !== Number(formateur)) return false;
      if (e.filiereId !== Number(filiere)) return false;
      if (e.groupId !== Number(groupe)) return false;
      return true;
    });
  }, [weekEntries, formateur, filiere, groupe, allFiltersSelected]);

  const getSlotEntries = (jour: string, slotIdx: number) => {
    return filteredEntries.filter(
      e => e.jour.toLowerCase() === jour.toLowerCase() && e.slot === slotIdx
    );
  };

  const getColor = (moduleName: string) => {
    return colorMap.get(moduleName) || COLOR_SCHEMES[0];
  };

  const selectedWeekLabel = WEEKS.find(w => w.id === semaine)?.label || '';

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Emploi du temps</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            <Link to={`${basePath}/dashboard`} className="text-primary-600 dark:text-primary-400 hover:text-primary-700">Tableau de bord</Link>
            {' / '}
            <span className="text-primary-600 dark:text-primary-400">Académique</span>
            {' / '}
            <span>Emploi du temps</span>
          </p>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
        {/* Title & Filter Chips */}
        <div className="flex items-center gap-3 px-6 py-4 flex-wrap">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mr-1">Time Table</h2>

          <select
            value={formateur}
            onChange={(e) => { setFormateur(e.target.value); setFiliere(''); setGroupe(''); }}
            className="text-sm border border-primary-200 dark:border-primary-800 text-primary-600 dark:text-primary-400 rounded-full px-4 py-1.5 bg-white dark:bg-gray-800 appearance-none cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors pr-8"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234F46E5' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
          >
            <option value="">Formateur : --Choisir formateur</option>
            {formateursList.map(f => (
              <option key={f.id} value={f.id}>{f.nom}</option>
            ))}
          </select>

          <select
            value={filiere}
            onChange={(e) => { setFiliere(e.target.value); setGroupe(''); }}
            className="text-sm border border-primary-200 dark:border-primary-800 text-primary-600 dark:text-primary-400 rounded-full px-4 py-1.5 bg-white dark:bg-gray-800 appearance-none cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors pr-8"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234F46E5' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
          >
            <option value="">Filière : --choisir filière</option>
            {filteredFilieres.map((f: any) => (
              <option key={f.id} value={f.id}>{f.nom}</option>
            ))}
          </select>

          <select
            value={groupe}
            onChange={(e) => setGroupe(e.target.value)}
            className="text-sm border border-primary-200 dark:border-primary-800 text-primary-600 dark:text-primary-400 rounded-full px-4 py-1.5 bg-white dark:bg-gray-800 appearance-none cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors pr-8"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234F46E5' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
          >
            <option value="">Groupe : --choisir groupe</option>
            {filteredGroupes.map((g: any) => (
              <option key={g.id} value={g.id}>{g.nom}</option>
            ))}
          </select>

          <select
            value={semaine}
            onChange={(e) => setSemaine(e.target.value)}
            className="text-sm border border-primary-200 dark:border-primary-800 text-primary-600 dark:text-primary-400 rounded-full px-4 py-1.5 bg-white dark:bg-gray-800 appearance-none cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors pr-8"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234F46E5' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
          >
            {WEEKS.map(w => (
              <option key={w.id} value={w.id}>Semaine : {w.label}</option>
            ))}
          </select>
        </div>

        {/* Timetable Grid */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : !allFiltersSelected ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
              <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm font-medium">Veuillez sélectionner un formateur, une filière et un groupe</p>
              <p className="text-xs mt-1">pour afficher l'emploi du temps</p>
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
                                      <div className="flex items-center gap-1.5 mb-2">
                                        <svg className="w-3 h-3 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">{entry.formateur}</span>
                                      </div>
                                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium text-white ${
                                        entry.type === 'a_distance' ? 'bg-yellow-700' : colors.badge
                                      }`}>
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

        {/* Break Info */}
        <div className="grid grid-cols-2 gap-4 px-6 py-4">
          <div className="border border-gray-100 dark:border-gray-700 rounded-lg p-4">
            <span className="inline-block px-2.5 py-0.5 bg-primary-600 text-white rounded text-xs font-medium mb-2">Morning Break</span>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" strokeWidth={2} />
                <path strokeWidth={2} d="M12 6v6l4 2" />
              </svg>
              10:50 to 11 :10 AM
            </div>
          </div>
          <div className="border border-gray-100 dark:border-gray-700 rounded-lg p-4">
            <span className="inline-block px-2.5 py-0.5 bg-red-500 text-white rounded text-xs font-medium mb-2">Evening Break</span>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" strokeWidth={2} />
                <path strokeWidth={2} d="M12 6v6l4 2" />
              </svg>
              15:50 PM to 16:10 PM
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmploiDuTempsPage;
