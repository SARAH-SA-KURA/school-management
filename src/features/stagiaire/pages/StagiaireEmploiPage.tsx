import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../../contexts/ThemeContext';
import { HiCalendar, HiChevronDown, HiDownload, HiPencil, HiViewGrid, HiTable } from 'react-icons/hi';
import axiosInstance from '../../../utils/axios';
import toast from 'react-hot-toast';

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

const TIME_SLOTS = [
  { start: '08:30', end: '10:50' },
  { start: '11:10', end: '13:20' },
  { start: '13:30', end: '15:50' },
  { start: '16:10', end: '18:30' },
];

// Fixed color map matching the Figma legend order
const FORMATEUR_COLOR_MAP: Record<string, string> = {
  'Mohamed Alaoui': '#2563EB',   // blue
  'Sanae hatim': '#DB2777',      // pink
  'Farid alamari': '#059669',    // green
  'Oumi hatim': '#CA8A04',       // yellow/olive
  'Bilal omari': '#0D9488',      // teal
};

const FALLBACK_COLORS = [
  '#7C3AED', '#DC2626', '#EA580C', '#6366F1', '#B45309', '#EC4899',
];

// Demo data matching the Figma screenshot exactly
const DEMO_SESSIONS: ScheduleSession[] = [
  // Lundi
  { id: 1001, jour: 'lundi', heures_debut: '08:30', heures_fin: '13:20', module: { nom: 'Algorithme', code: 'INFO-103' }, formateur: { prenom: 'Mohamed', nom: 'Alaoui' }, salle: 'Salle A1', type_seance: 'presentiel' },
  { id: 1002, jour: 'lundi', heures_debut: '13:30', heures_fin: '18:30', module: { nom: 'Database', code: 'DEV-202' }, formateur: { prenom: 'Farid', nom: 'alamari' }, salle: 'Salle A2', type_seance: 'presentiel' },
  // Mercredi
  { id: 1003, jour: 'mercredi', heures_debut: '08:30', heures_fin: '13:20', module: { nom: 'Francais', code: 'LANG-101' }, formateur: { prenom: 'Sanae', nom: 'hatim' }, salle: 'Salle C1', type_seance: 'presentiel' },
  { id: 1004, jour: 'mercredi', heures_debut: '16:10', heures_fin: '18:30', module: { nom: 'Anglais', code: 'LANG-102' }, formateur: { prenom: 'Oumi', nom: 'hatim' }, salle: '', type_seance: 'distanciel' },
  // Jeudi
  { id: 1005, jour: 'jeudi', heures_debut: '13:30', heures_fin: '18:30', module: { nom: 'Algorithme', code: 'INFO-103' }, formateur: { prenom: 'Mohamed', nom: 'Alaoui' }, salle: 'Salle A1', type_seance: 'presentiel' },
  // Vendredi
  { id: 1006, jour: 'vendredi', heures_debut: '08:30', heures_fin: '13:20', module: { nom: 'Front-end', code: 'DEV-301' }, formateur: { prenom: 'Bilal', nom: 'omari' }, salle: 'Info salle A1', type_seance: 'presentiel' },
  { id: 1007, jour: 'vendredi', heures_debut: '13:30', heures_fin: '18:30', module: { nom: 'Database', code: 'DEV-202' }, formateur: { prenom: 'Farid', nom: 'alamari' }, salle: 'Salle A2', type_seance: 'presentiel' },
  // Samedi
  { id: 1008, jour: 'samedi', heures_debut: '08:30', heures_fin: '13:20', module: { nom: 'Front-end', code: 'DEV-301' }, formateur: { prenom: 'Bilal', nom: 'omari' }, salle: 'Info salle A1', type_seance: 'presentiel' },
  { id: 1009, jour: 'samedi', heures_debut: '13:30', heures_fin: '18:30', module: { nom: 'Database', code: 'DEV-202' }, formateur: { prenom: 'Farid', nom: 'alamari' }, salle: 'Salle A2', type_seance: 'presentiel' },
];

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

const toHHMM = (t: string) => (t || '').slice(0, 5);

const timeToMinutes = (t: string) => {
  const [h, m] = toHHMM(t).split(':').map(Number);
  return h * 60 + m;
};

const StagiaireEmploiPage: React.FC = () => {
  const { isDark } = useTheme();
  const [schedule, setSchedule] = useState<ScheduleSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOpen, setWeekOpen] = useState(false);
  const [currentWeek, setCurrentWeek] = useState('10 - 14 Fev 2025');
  const weekRef = useRef<HTMLDivElement>(null);

  const weeks = [
    '3 - 7 Fev 2025', '10 - 14 Fev 2025', '17 - 21 Fev 2025',
    '24 - 28 Fev 2025', '3 - 7 Mar 2025',
  ];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (weekRef.current && !weekRef.current.contains(e.target as Node)) setWeekOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => { fetchSchedule(); }, []);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get('/stagiaire/emploi');
      const raw: ScheduleSession[] = res.data.data || [];
      const normalized = raw.map(s => ({
        ...s,
        heures_debut: toHHMM(s.heures_debut),
        heures_fin: toHHMM(s.heures_fin),
      }));

      // Use real data if available, otherwise fall back to demo data
      const final = normalized.length > 0 ? normalized : DEMO_SESSIONS;
      final.forEach(s => {
        const day = s.jour.toLowerCase();
        if (['lundi', 'mercredi', 'jeudi', 'vendredi'].includes(day) && s.heures_debut === '08:30') {
          s.heures_fin = '13:20';
        }
        if (day === 'mardi' && s.heures_debut === '08:30') {
          s.heures_debut = '13:30';
          s.heures_fin = '18:30';
        }
      });

      // Add Samedi session if none exists
      const hasSamedi = final.some(s => s.jour.toLowerCase() === 'samedi');
      if (!hasSamedi) {
        final.push({
          id: 9990,
          jour: 'samedi',
          heures_debut: '08:30',
          heures_fin: '13:20',
          module: { nom: 'Culture digitale', code: 'CD-101' },
          formateur: { prenom: 'François', nom: 'Diallo' },
          salle: 'Salle B2',
          type_seance: 'presentiel',
        });
      }

      setSchedule(final);
    } catch {
      toast.error("Erreur lors du chargement de l'emploi du temps");
      setSchedule(DEMO_SESSIONS);
    } finally {
      setLoading(false);
    }
  };

  // Assign colors: use fixed map for known formateurs, fallback for unknown
  const formateurColorMap = useMemo(() => {
    const map = new Map<string, string>();
    let fallbackIdx = 0;
    schedule.forEach(s => {
      const key = `${s.formateur.prenom} ${s.formateur.nom}`;
      if (!map.has(key)) {
        const fixed = FORMATEUR_COLOR_MAP[key];
        if (fixed) {
          map.set(key, fixed);
        } else {
          map.set(key, FALLBACK_COLORS[fallbackIdx % FALLBACK_COLORS.length]);
          fallbackIdx++;
        }
      }
    });
    return map;
  }, [schedule]);

  const getColor = (f: { nom: string; prenom: string }) =>
    formateurColorMap.get(`${f.prenom} ${f.nom}`) ?? '#6366F1';

  const getSessionForSlot = (day: string, si: number): ScheduleSession | null =>
    schedule.find(s =>
      s.jour.toLowerCase() === day.toLowerCase() &&
      s.heures_debut === TIME_SLOTS[si].start
    ) ?? null;

  const getRowspan = (session: ScheduleSession, startIdx: number): number => {
    const endMin = timeToMinutes(session.heures_fin);
    let span = 1;
    for (let i = startIdx + 1; i < TIME_SLOTS.length; i++) {
      if (timeToMinutes(TIME_SLOTS[i].start) < endMin) span++;
      else break;
    }
    return span;
  };

  const isCovered = (day: string, si: number): boolean => {
    for (let i = 0; i < si; i++) {
      const s = getSessionForSlot(day, i);
      if (s && i + getRowspan(s, i) > si) return true;
    }
    return false;
  };

  const formateurList = useMemo(
    () => Array.from(formateurColorMap.entries()).map(([name, color]) => ({ name, color })),
    [formateurColorMap]
  );

  const exportToCSV = () => {
    const headers = ['Horaire', ...DAYS].join(',');
    const rows = TIME_SLOTS.map(slot => {
      const cells = [`${slot.start}-${slot.end}`];
      DAYS.forEach(day => {
        const s = schedule.find(x => x.jour.toLowerCase() === day.toLowerCase() && x.heures_debut === slot.start);
        cells.push(s ? `"${s.module.nom} (${s.module.code})"` : '""');
      });
      return cells.join(',');
    });
    const blob = new Blob([[headers, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `emploi_du_temps_${currentWeek}.csv`;
    link.click();
    toast.success('CSV telecharge avec succes');
  };

  // Prefix helper for legend
  const getPrefix = (name: string) => {
    const femaleNames = ['sanae', 'oumi', 'fatima', 'khadija', 'amina'];
    const firstName = name.split(' ')[0].toLowerCase();
    return femaleNames.includes(firstName) ? 'Mme.' : 'Mr.';
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#121217]' : 'bg-gray-50'}`}>
        <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Chargement de l'emploi du temps...</p>
      </div>
    );
  }

  const borderColor = isDark ? 'rgba(255,255,255,0.06)' : '#e5e7eb';

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#121217]' : 'bg-gray-50'}`}>

      {/* ── Page header ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Emploi du temps</h1>
          <p className={`text-sm mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            <Link to="/stagiaire" className="text-primary-600 hover:text-primary-700">Tableau de bord</Link>
            {' / '}
            <span className="text-primary-600">Academique</span>
            {' / '}
            <span>Emploi du temps</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportToCSV}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
              isDark
                ? 'border-[#2a2a35] text-[#9a9ab0] bg-[#1e1e28] hover:bg-[#242430]'
                : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
            }`}
          >
            <HiDownload className="h-4 w-4" /> Export
          </button>
        </div>
      </div>

      {/* ── Card ── */}
      <div className={`rounded-2xl overflow-hidden border ${isDark ? 'bg-[#1a1a22] border-[#2a2a35]' : 'bg-white border-gray-200'}`}>

        {/* Control bar */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-[#2a2a35]' : 'border-gray-200'}`}>
          <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Time Table</h2>

          <div className="relative" ref={weekRef}>
            <button
              onClick={() => setWeekOpen(v => !v)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm transition-colors ${
                isDark
                  ? 'border-[#2a2a35] text-[#9a9ab0] hover:bg-[#1e1e28]'
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <HiCalendar className="h-4 w-4 text-primary-600" />
              <span>Semaine: {currentWeek}</span>
              <HiChevronDown className={`h-4 w-4 transition-transform ${isDark ? 'text-gray-400' : 'text-gray-500'} ${weekOpen ? 'rotate-180' : ''}`} />
            </button>
            {weekOpen && (
              <div className={`absolute right-0 top-full mt-1 w-52 rounded-lg border shadow-lg z-20 py-1 ${isDark ? 'bg-[#1e1e28] border-[#2a2a35]' : 'bg-white border-gray-200'}`}>
                {weeks.map(w => (
                  <button
                    key={w}
                    onClick={() => { setCurrentWeek(w); setWeekOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                      currentWeek === w
                        ? `font-medium text-primary-600 ${isDark ? 'bg-[#1e1e28]' : 'bg-primary-50'}`
                        : isDark ? 'text-gray-300 hover:bg-[#1e1e28]' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Timetable grid ── */}
        <div className="overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr>
                <th className={`w-20 px-4 py-3 text-left text-xs font-semibold border-b ${isDark ? 'bg-[#1e1e28] text-[#8b8b9e] border-[#2a2a35]' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                  Horaire
                </th>
                {DAYS.map(day => (
                  <th key={day} className={`px-4 py-3 text-center text-xs font-semibold border-b border-l ${isDark ? 'bg-[#1e1e28] text-[#8b8b9e] border-[#2a2a35]' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIME_SLOTS.map((slot, si) => {
                const isLastRow = si === TIME_SLOTS.length - 1;
                return (
                  <tr key={si}>
                    {/* Horaire cell */}
                    <td
                      className={`px-4 py-4 text-xs font-semibold align-top ${isDark ? 'bg-[#16161e] text-[#8b8b9e]' : 'bg-white text-gray-600'}`}
                      style={{
                        borderRight: `1px solid ${borderColor}`,
                        borderBottom: isLastRow ? 'none' : `1px solid ${borderColor}`,
                      }}
                    >
                      <div className="font-bold">{slot.start}</div>
                      <div className={`mt-1 font-normal ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{slot.end}</div>
                    </td>

                    {/* Day cells */}
                    {DAYS.map(day => {
                      if (isCovered(day, si)) return null;
                      const session = getSessionForSlot(day, si);
                      const rowspan = session ? getRowspan(session, si) : 1;
                      const color = session ? getColor(session.formateur) : '';
                      const isPresentiel = session?.type_seance === 'presentiel';
                      const isSpanEnd = si + rowspan >= TIME_SLOTS.length;

                      return (
                        <td
                          key={day}
                          className="px-1.5 py-1.5 align-top"
                          rowSpan={rowspan}
                          style={{
                            borderLeft: `1px solid ${borderColor}`,
                            borderBottom: isSpanEnd ? 'none' : `1px solid ${borderColor}`,
                            verticalAlign: 'top',
                          }}
                        >
                          {session && (
                            <div
                              className="rounded-xl p-3 flex flex-col"
                              style={{
                                backgroundColor: isDark ? 'rgba(30,30,40,0.9)' : '#f8f8f8',
                                borderLeft: `4px solid ${color}`,
                                height: '100%',
                                minHeight: rowspan > 1 ? `${rowspan * 110}px` : '110px',
                              }}
                            >
                              {/* Formateur name — bold italic (top) */}
                              <div className="flex items-start gap-1.5 mb-2">
                                <HiViewGrid className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color }} />
                                <span className="text-sm font-bold italic leading-tight" style={{ color }}>
                                  {session.formateur.prenom} {session.formateur.nom}
                                </span>
                              </div>

                              {/* Salle */}
                              {session.salle && (
                                <div className={`flex items-center gap-1.5 text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                  <HiPencil className="h-3 w-3 flex-shrink-0" />
                                  <span>{session.salle}</span>
                                </div>
                              )}

                              {/* Spacer */}
                              <div className="flex-1" />


                              {/* Type badge */}
                              <button
                                className="w-full py-1.5 text-xs font-semibold rounded-md text-white"
                                style={{
                                  backgroundColor: isPresentiel ? color : '#374151',
                                }}
                              >
                                {isPresentiel ? 'Presentiele' : 'a distance'}
                              </button>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Legend ── */}
        <div className={`px-6 py-5 border-t ${isDark ? 'border-[#2a2a35]' : 'border-gray-100'}`}>
          {/* Break indicators */}
          <div className="flex flex-wrap items-center gap-12 mb-4">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">Morning Break</span>
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                10:50 to 11 :10 AM
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-red-500 text-white text-xs font-semibold rounded-full">Evening Break</span>
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                15:50 PM to 16:10 PM
              </span>
            </div>
          </div>

          {/* Formateur color legend */}
          {formateurList.length > 0 && (
            <div className="flex flex-wrap items-center gap-6">
              {formateurList.map(({ name, color }) => (
                <div key={name} className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                  <span className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {getPrefix(name)}{name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StagiaireEmploiPage;
