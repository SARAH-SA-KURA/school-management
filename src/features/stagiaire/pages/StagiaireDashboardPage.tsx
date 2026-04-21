import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import {
  HiAcademicCap, HiClipboardList, HiCalendar, HiClock, HiLocationMarker,
  HiChevronRight, HiUserGroup,
} from 'react-icons/hi';
import axiosInstance from '../../../utils/axios';

interface StagiaireProfile {
  id: number;
  cef: string;
  user: { nom: string; prenom: string };
  group?: { nom: string; annee_scolaire?: string; filiere?: { nom: string } };
}

interface EmploiEntry {
  id: number;
  jour: string;
  heures_debut: string;
  heures_fin: string;
  module: { nom: string; code?: string };
  formateur: { prenom?: string; nom?: string };
  salle: string;
}

interface ExamRow {
  id: number;
  type: string;
  date: string;
  note_cc?: number | null;
  note_efm?: number | null;
}

interface ModuleExam {
  id: number;
  code: string;
  nom: string;
  average: number;
  exams: ExamRow[];
}

interface AbsenceStats {
  total_absences_hours: number;
  total_absences_count: number;
  unjustified_hours: number;
}

const JOUR_IDX: Record<string, number> = { lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6 };
const JOUR_LABEL: Record<string, string> = { lundi: 'Lundi', mardi: 'Mardi', mercredi: 'Mercredi', jeudi: 'Jeudi', vendredi: 'Vendredi', samedi: 'Samedi' };

const toMinutes = (t: string): number => {
  const [h, m] = (t || '').split(':').map(n => parseInt(n, 10));
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
};
const formatTime = (t?: string) => (t || '').slice(0, 5);

const typeBadge = (type: string): { label: string; cls: string } => {
  switch (type) {
    case 'controle':   return { label: 'CC',         cls: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' };
    case 'efm':        return { label: 'EFM',        cls: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' };
    case 'eff':        return { label: 'EFF',        cls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' };
    case 'rattrapage': return { label: 'Rattrapage', cls: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' };
    default:           return { label: type,         cls: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' };
  }
};

const StagiaireDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<StagiaireProfile | null>(null);
  const [emploi, setEmploi] = useState<EmploiEntry[]>([]);
  const [modules, setModules] = useState<ModuleExam[]>([]);
  const [absenceStats, setAbsenceStats] = useState<AbsenceStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [p, e, m, a] = await Promise.all([
        axiosInstance.get('/auth/stagiaire').catch(() => null),
        axiosInstance.get('/stagiaire/emploi').catch(() => null),
        axiosInstance.get('/stagiaire/exams').catch(() => null),
        axiosInstance.get('/stagiaire/absences').catch(() => null),
      ]);
      if (p?.data?.data) setProfile(p.data.data);
      if (Array.isArray(e?.data?.data)) setEmploi(e.data.data);
      if (Array.isArray(m?.data?.data?.modules)) setModules(m.data.data.modules);
      if (a?.data?.data?.stats) setAbsenceStats(a.data.data.stats);
    } catch {}
    setLoading(false);
  };

  const today = new Date();
  const dowIdx = today.getDay();
  const todayJour = Object.keys(JOUR_IDX).find(k => JOUR_IDX[k] === dowIdx) || '';
  const nowMins = today.getHours() * 60 + today.getMinutes();

  const todaysSessions = useMemo(() =>
    emploi.filter(e => e.jour?.toLowerCase() === todayJour)
      .sort((a, b) => toMinutes(a.heures_debut) - toMinutes(b.heures_debut)),
  [emploi, todayJour]);

  const nextOrCurrent = useMemo(() =>
    todaysSessions.find(e => toMinutes(e.heures_fin) > nowMins) || null,
  [todaysSessions, nowMins]);

  const upcomingExams = useMemo(() => {
    const all: Array<{ module: string; type: string; date: string; daysUntil: number }> = [];
    modules.forEach(m => {
      m.exams?.forEach(ex => {
        if (!ex.date) return;
        const d = new Date(ex.date);
        const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diff >= 0) all.push({ module: m.nom, type: ex.type, date: ex.date, daysUntil: diff });
      });
    });
    return all.sort((a, b) => a.daysUntil - b.daysUntil).slice(0, 4);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modules]);

  const recentGrades = useMemo(() => {
    const all: Array<{ module: string; type: string; note: number; date: string }> = [];
    modules.forEach(m => {
      m.exams?.forEach(ex => {
        const note = ex.note_efm ?? ex.note_cc;
        if (note !== null && note !== undefined && ex.date) {
          all.push({ module: m.nom, type: ex.type, note: Number(note), date: ex.date });
        }
      });
    });
    return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 4);
  }, [modules]);

  const fullName = `${profile?.user?.prenom || user?.prenom || ''} ${profile?.user?.nom || user?.nom || ''}`.trim();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Bonjour, {fullName || 'Stagiaire'}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex flex-wrap gap-x-3 gap-y-1">
          <span>{profile?.cef}</span>
          <span>·</span>
          <span>{profile?.group?.nom}</span>
          <span>·</span>
          <span>{profile?.group?.filiere?.nom}</span>
          {profile?.group?.annee_scolaire && <><span>·</span><span>{profile.group.annee_scolaire}</span></>}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs mb-1">
            <HiAcademicCap className="h-4 w-4" /> Modules
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{modules.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs mb-1">
            <HiClipboardList className="h-4 w-4" /> Examens à venir
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{upcomingExams.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs mb-1">
            <HiCalendar className="h-4 w-4" /> Cours aujourd'hui
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{todaysSessions.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs mb-1">
            <HiUserGroup className="h-4 w-4" /> Absences (h)
          </div>
          <p className={`text-2xl font-bold ${
            (absenceStats?.unjustified_hours ?? 0) >= 36 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'
          }`}>
            {absenceStats?.unjustified_hours ?? 0}h
          </p>
        </div>
      </div>

      {/* Two columns: Next class + Upcoming exams */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Next class */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Prochain cours</h2>
            <button onClick={() => navigate('/stagiaire/emploi-du-temps')} className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1">
              Emploi du temps <HiChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {nextOrCurrent ? (
            <div className="p-5">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{nextOrCurrent.module?.nom}</h3>
              <div className="mt-2 flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                <HiClock className="h-4 w-4 text-gray-400" />
                <span className="capitalize">{JOUR_LABEL[nextOrCurrent.jour?.toLowerCase()]}</span>
                <span>·</span>
                <span>{formatTime(nextOrCurrent.heures_debut)} → {formatTime(nextOrCurrent.heures_fin)}</span>
              </div>
              {nextOrCurrent.salle && (
                <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                  <HiLocationMarker className="h-4 w-4 text-gray-400" /> Salle {nextOrCurrent.salle}
                </div>
              )}
              {nextOrCurrent.formateur?.prenom && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {nextOrCurrent.formateur.prenom} {nextOrCurrent.formateur.nom}
                </p>
              )}
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Aucun cours prévu aujourd'hui</p>
            </div>
          )}
        </div>

        {/* Upcoming exams */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Prochains examens</h2>
            <button onClick={() => navigate('/stagiaire/examens')} className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1">
              Tout voir <HiChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {upcomingExams.length > 0 ? (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {upcomingExams.map((ex, i) => {
                const t = typeBadge(ex.type);
                return (
                  <div key={i} className="px-5 py-3 flex items-center gap-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium flex-shrink-0 ${t.cls}`}>{t.label}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{ex.module}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(ex.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                      </p>
                    </div>
                    <span className={`text-xs font-medium flex-shrink-0 ${
                      ex.daysUntil <= 3 ? 'text-red-600 dark:text-red-400' :
                      ex.daysUntil <= 7 ? 'text-orange-500 dark:text-orange-400' :
                      'text-gray-500 dark:text-gray-400'
                    }`}>
                      {ex.daysUntil === 0 ? "aujourd'hui" : `dans ${ex.daysUntil}j`}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Aucun examen planifié</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent grades */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Dernières notes</h2>
          <button onClick={() => navigate('/stagiaire/examens')} className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1">
            Toutes <HiChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        {recentGrades.length > 0 ? (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {recentGrades.map((g, i) => {
              const t = typeBadge(g.type);
              const color = g.note >= 14 ? 'text-green-600 dark:text-green-400'
                : g.note >= 10 ? 'text-gray-900 dark:text-gray-100'
                : 'text-red-600 dark:text-red-400';
              return (
                <div key={i} className="px-5 py-3 flex items-center gap-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium flex-shrink-0 ${t.cls}`}>{t.label}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{g.module}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(g.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <div className={`text-lg font-bold flex-shrink-0 ${color}`}>
                    {g.note.toFixed(2)}<span className="text-xs text-gray-400 font-normal">/20</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">Aucune note publiée</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Vos notes apparaîtront ici après les examens</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StagiaireDashboardPage;
