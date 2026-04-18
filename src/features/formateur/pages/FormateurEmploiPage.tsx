import React, { useState, useRef, useEffect } from 'react';
import { HiCalendar, HiChevronDown, HiDownload } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useTheme } from '../../../contexts/ThemeContext';

interface Seance {
  id: number;
  subject: string;
  room: string;
  code: string;
  type: 'Présentiel' | 'À distance';
  day: string;
  timeStart: string;
  timeEnd: string;
  bgColor: string;
  borderColor: string;
}

interface TimeSlot {
  start: string;
  end: string;
}

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

// Only CLASS time slots - NO breaks
const TIME_SLOTS: TimeSlot[] = [
  { start: '08:30', end: '10:50' },
  { start: '11:10', end: '13:20' },
  { start: '13:30', end: '15:50' },
  { start: '16:10', end: '18:30' },
];

const BREAKS = [
  { name: 'Morning Break', startTime: '10:50', endTime: '11:10' },
  { name: 'Evening Break', startTime: '15:50', endTime: '16:10' },
];

const demoSeances: Seance[] = [
  {
    id: 1,
    subject: 'Salle A1',
    room: 'Salle A1',
    code: 'INF-101',
    type: 'Présentiel',
    day: 'Lundi',
    timeStart: '08:30',
    timeEnd: '10:50',
    bgColor: 'rgba(248, 245, 245, 0.5)',
    borderColor: '#2563EB',
  },
  {
    id: 2,
    subject: 'Analyse',
    room: 'Salle A1',
    code: 'INFO-102',
    type: 'Présentiel',
    day: 'Mardi',
    timeStart: '08:30',
    timeEnd: '13:20',
    bgColor: 'rgba(248, 245, 245, 0.5)',
    borderColor: '#EC4899',
  },
  {
    id: 3,
    subject: 'Front-end',
    room: 'Info salle A1',
    code: 'DEV-201',
    type: 'Présentiel',
    day: 'Mercredi',
    timeStart: '08:30',
    timeEnd: '10:50',
    bgColor: 'rgba(248, 245, 245, 0.5)',
    borderColor: '#A0826D',
  },
  {
    id: 4,
    subject: 'Front-end',
    room: 'Info salle A1',
    code: 'DEV-201',
    type: 'Présentiel',
    day: 'Jeudi',
    timeStart: '08:30',
    timeEnd: '10:50',
    bgColor: 'rgba(248, 245, 245, 0.5)',
    borderColor: '#A0826D',
  },
  {
    id: 5,
    subject: 'Database',
    room: 'Salle A2',
    code: 'DEV-202',
    type: 'Présentiel',
    day: 'Vendredi',
    timeStart: '13:30',
    timeEnd: '18:30',
    bgColor: 'rgba(248, 245, 245, 0.5)',
    borderColor: '#22C55E',
  },
  {
    id: 6,
    subject: 'Algorithme',
    room: 'Salle A1',
    code: 'INFO-103',
    type: 'À distance',
    day: 'Mercredi',
    timeStart: '16:10',
    timeEnd: '18:30',
    bgColor: 'rgba(248, 245, 245, 0.5)',
    borderColor: '#B8860B',
  },
  {
    id: 8,
    subject: 'Algorithme',
    room: 'Salle A1',
    code: 'INFO-103',
    type: 'Présentiel',
    day: 'Jeudi',
    timeStart: '13:30',
    timeEnd: '15:50',
    bgColor: 'rgba(248, 245, 245, 0.5)',
    borderColor: '#B8860B',
  },
  {
    id: 9,
    subject: 'Front-end',
    room: 'Info salle A1',
    code: 'DEV-201',
    type: 'Présentiel',
    day: 'Samedi',
    timeStart: '08:30',
    timeEnd: '10:50',
    bgColor: 'rgba(248, 245, 245, 0.5)',
    borderColor: '#A0826D',
  },
];

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const getColorCode = (code: string) => {
  const colors: Record<string, string> = {
    'INF-101': '#2563EB',
    'INFO-102': '#EC4899',
    'DEV-201': '#A0826D',
    'INFO-103': '#B8860B',
    'DEV-202': '#22C55E',
  };
  return colors[code] || '#6366F1';
};

const FormateurEmploiPage: React.FC = () => {
  const { isDark } = useTheme();
  const [currentWeek, setCurrentWeek] = useState('10 - 14 Fév 2025');
  const [isWeekDropdownOpen, setIsWeekDropdownOpen] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  const weeks = [
    '3 - 7 Fév 2025',
    '10 - 14 Fév 2025',
    '17 - 21 Fév 2025',
    '24 - 28 Fév 2025',
    '3 - 7 Mar 2025',
  ];

  const dropdownRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsWeekDropdownOpen(false);
      }
      if (exportRef.current && !exportRef.current.contains(event.target as Node)) {
        setExportDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getSeanceForSlot = (day: string, slotIndex: number): Seance | null => {
    const slot = TIME_SLOTS[slotIndex];
    return demoSeances.find(s => {
      if (s.day !== day) return false;
      const seanceStart = timeToMinutes(s.timeStart);
      // Check if seance starts at this slot
      return seanceStart === timeToMinutes(slot.start);
    }) || null;
  };

  const getSeanceRowspan = (seance: Seance, startSlotIndex: number): number => {
    const seanceEnd = timeToMinutes(seance.timeEnd);
    let rowspan = 1;

    for (let i = startSlotIndex + 1; i < TIME_SLOTS.length; i++) {
      const slotStart = timeToMinutes(TIME_SLOTS[i].start);
      // If this slot starts before seance ends, include it in rowspan
      if (slotStart < seanceEnd) {
        rowspan++;
      } else {
        break;
      }
    }

    return rowspan;
  };

  const isCellCovered = (day: string, slotIndex: number): boolean => {
    // Check if any seance that started in an earlier slot covers this slot
    for (let i = 0; i < slotIndex; i++) {
      const seance = getSeanceForSlot(day, i);
      if (seance) {
        const rowspan = getSeanceRowspan(seance, i);
        if (i + rowspan > slotIndex) {
          return true;
        }
      }
    }
    return false;
  };

  const rowHasActiveRowspan = (slotIndex: number): boolean => {
    // Check if any cell in this row is part of a rowspan (either starting here or from above)
    for (const day of DAYS) {
      // Check if there's a seance starting at this row with rowspan > 1
      const seance = getSeanceForSlot(day, slotIndex);
      if (seance) {
        const rowspan = getSeanceRowspan(seance, slotIndex);
        if (rowspan > 1) {
          return true;
        }
      }

      // Check if this cell is covered by a rowspan from above
      if (isCellCovered(day, slotIndex)) {
        return true;
      }
    }
    return false;
  };

  const exportToCSV = () => {
    try {
      const headers = ['Horaire', ...DAYS].join(',');
      const rows = TIME_SLOTS.map(slot => {
        const cells = [`${slot.start}-${slot.end}`];
        DAYS.forEach(day => {
          const seance = demoSeances.find(
            s => s.day === day && s.timeStart === slot.start
          );
          cells.push(seance ? `${seance.subject} (${seance.code})` : '');
        });
        return cells.map(cell => `"${cell}"`).join(',');
      });

      const csvContent = [headers, ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `emploi_du_temps_${currentWeek}.csv`);
      link.click();
      setExportDropdownOpen(false);
      toast.success('CSV téléchargé avec succès');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Erreur lors de l\'export CSV');
    }
  };

  const exportToExcel = () => {
    try {
      const headers = ['Horaire', ...DAYS].join('\t');
      const rows = TIME_SLOTS.map(slot => {
        const cells = [`${slot.start}-${slot.end}`];
        DAYS.forEach(day => {
          const seance = demoSeances.find(
            s => s.day === day && s.timeStart === slot.start
          );
          cells.push(seance ? `${seance.subject} (${seance.code})` : '');
        });
        return cells.join('\t');
      });

      const excelContent = [headers, ...rows].join('\n');
      const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `emploi_du_temps_${currentWeek}.xlsx`);
      link.click();
      setExportDropdownOpen(false);
      toast.success('Excel téléchargé avec succès');
    } catch (error) {
      console.error('Error exporting Excel:', error);
      toast.error('Erreur lors de l\'export Excel');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="p-6">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Emploi du temps</h1>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span className="text-primary-600">Tableau de bord</span>
              <span>/</span>
              <span className="text-primary-600">Académique</span>
              <span>/</span>
              <span className="text-gray-900 dark:text-gray-200">Emploi du temps</span>
            </div>
          </div>
          <div className="flex items-center gap-2">

            {/* Export Dropdown */}
            <div className="relative" ref={exportRef}>
              <button
                onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                <HiDownload size={16} /> Export
              </button>
              {exportDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg shadow-xl border z-10 overflow-hidden bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Format d'export</p>
                  </div>
                  <button
                    onClick={exportToCSV}
                    className="w-full text-left px-4 py-3 text-sm font-medium transition-all duration-150 hover:bg-blue-50 dark:hover:bg-slate-700/30 text-gray-700 dark:text-gray-300"
                  >
                    <div className="flex items-center justify-between">
                      <span>CSV</span>
                      <span className="text-xs text-gray-400">→</span>
                    </div>
                  </button>
                  <button
                    onClick={exportToExcel}
                    className="w-full text-left px-4 py-3 text-sm font-medium border-t border-gray-200 dark:border-slate-700 transition-all duration-150 hover:bg-blue-50 dark:hover:bg-slate-700/30 text-gray-700 dark:text-gray-300"
                  >
                    <div className="flex items-center justify-between">
                      <span>Excel (.xlsx)</span>
                      <span className="text-xs text-gray-400">→</span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Control Bar */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Time Table</h2>
          <div className="flex items-center gap-4 relative" ref={dropdownRef}>
            {/* Week Selector */}
            <div
              onClick={() => setIsWeekDropdownOpen(!isWeekDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 cursor-pointer"
            >
              <HiCalendar size={16} className="text-primary-600" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">Semaine: {currentWeek}</span>
              <HiChevronDown size={16} className={`text-gray-600 dark:text-gray-400 transition-transform ${isWeekDropdownOpen ? 'rotate-180' : ''}`} />
            </div>

            {/* Week Dropdown Menu */}
            {isWeekDropdownOpen && (
              <div className="absolute top-full mt-2 left-0 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg z-10">
                {weeks.map(week => (
                  <div
                    key={week}
                    onClick={() => {
                      setCurrentWeek(week);
                      setIsWeekDropdownOpen(false);
                    }}
                    className="px-4 py-2 text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    {week}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Time Table */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-auto">
          <table className="w-full border-collapse">
            {/* Header Row */}
            <thead>
              <tr className="bg-gray-100 dark:bg-slate-700 border-b border-gray-200 dark:border-slate-600">
                <th className="w-20 px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Horaire</th>
                {DAYS.map(day => (
                  <th
                    key={day}
                    className="flex-1 px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 border-l border-gray-200 dark:border-slate-600"
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Body Rows */}
            <tbody>
              {TIME_SLOTS.map((slot, slotIndex) => {
                const hasRowspan = rowHasActiveRowspan(slotIndex);
                const isAfterBreak = slot.start === '13:30';

                return (
                <tr
                  key={`${slot.start}-${slot.end}`}
                  className={!hasRowspan ? 'border-b border-gray-200 dark:border-slate-600' : ''}
                  style={{
                    borderBottom: hasRowspan ? 'none' : undefined,
                    borderTop: isAfterBreak ? isDark ? '1px solid rgba(71, 85, 105, 0.6)' : '1px solid rgba(156, 163, 175, 0.4)' : undefined,
                  }}
                >
                  {/* Time Column */}
                  <td
                    className="bg-gray-50 dark:bg-slate-700/50 px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 border-r border-gray-200 dark:border-slate-600 align-top"
                    style={{ borderBottom: hasRowspan ? 'none' : isDark ? '1px solid #334155' : '1px solid #e5e7eb' }}
                  >
                    <div>{slot.start}</div>
                    <div className="text-gray-400 text-xs">{slot.end}</div>
                  </td>

                  {/* Day Columns */}
                  {DAYS.map(day => {
                    const seance = getSeanceForSlot(day, slotIndex);
                    const isCovered = isCellCovered(day, slotIndex);

                    if (isCovered) {
                      return null;
                    }

                    const rowspan = seance ? getSeanceRowspan(seance, slotIndex) : 1;

                    return (
                      <td
                        key={`${day}-${slotIndex}`}
                        className="px-3 py-2 align-top border-l border-gray-200 dark:border-slate-600"
                        rowSpan={rowspan}
                        style={{ height: `${rowspan * 160}px` }}
                      >
                        {seance ? (
                          <div
                            className="rounded-lg p-3 flex flex-col gap-1"
                            style={{
                              backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : seance.bgColor,
                              borderLeft: `4px solid ${seance.borderColor}`,
                              height: '100%',
                            }}
                          >
                            {/* Code - Bold */}
                            <div className="text-sm font-bold" style={{ color: seance.borderColor }}>
                              {seance.code}
                            </div>

                            {/* Room/Salle */}
                            <div className={`text-xs flex items-start gap-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                              <span className="flex-shrink-0">📍</span>
                              <span>{seance.room}</span>
                            </div>

                            {/* Status Button */}
                            <div className="mt-auto pt-2">
                              <button
                                className="w-full px-2 py-1 text-xs font-semibold rounded text-white"
                                style={{
                                  backgroundColor: seance.borderColor,
                                }}
                              >
                                {seance.type}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div />
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

        {/* Legend */}
        <div className="mt-6 bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4">
          <div className="flex flex-wrap items-center gap-8">
            {/* Breaks */}
            {BREAKS.map((breakItem, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">
                  {breakItem.name}
                </div>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {breakItem.startTime} to {breakItem.endTime}
                </span>
              </div>
            ))}

            <div className="h-6 w-px bg-gray-300 dark:bg-slate-600"></div>

            {/* Module Codes */}
            {Array.from(new Set(demoSeances.map(s => s.code))).sort().map(code => (
              <div key={code} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: getColorCode(code) }}
                ></div>
                <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">{code}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormateurEmploiPage;
