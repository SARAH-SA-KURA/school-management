import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../../contexts/ThemeContext';
import axiosInstance from '../../../utils/axios';
import toast from 'react-hot-toast';

interface Exam {
  id: number;
  type: string;
  date: string;
  coeff: number;
  note_cc: number | null;
  note_efm: number | null;
}

interface ExamModule {
  id: number;
  code: string;
  nom: string;
  average: number;
  exams: Exam[];
}

interface ExamResponse {
  modules: ExamModule[];
  overall_average: number;
}

// Demo data matching the Figma screenshot
const DEMO_DATA: ExamResponse = {
  overall_average: 13.5,
  modules: [
    {
      id: 1, code: 'M101', nom: 'Programmation Web', average: 14.25,
      exams: [
        { id: 1, type: 'Controle 1', date: '2026-01-15', coeff: 2, note_cc: 14.5, note_efm: null },
        { id: 2, type: 'Controle 2', date: '2026-02-10', coeff: 2, note_cc: 13.0, note_efm: null },
        { id: 3, type: 'Examen Final', date: '2026-02-20', coeff: 4, note_cc: null, note_efm: 15.0 },
      ],
    },
    {
      id: 2, code: 'M102', nom: 'Base de donnees', average: 11.70,
      exams: [
        { id: 4, type: 'Controle 1', date: '2026-01-18', coeff: 2, note_cc: 12.0, note_efm: null },
        { id: 10, type: 'Controle 2', date: '2026-02-05', coeff: 2, note_cc: 11.0, note_efm: null },
        { id: 5, type: 'Examen Final', date: '2026-02-22', coeff: 3, note_cc: null, note_efm: 11.5 },
      ],
    },
    {
      id: 3, code: 'M103', nom: 'Programmation Java', average: 8.80,
      exams: [
        { id: 6, type: 'Controle 1', date: '2026-01-20', coeff: 2, note_cc: 8.5, note_efm: null },
        { id: 11, type: 'Controle 2', date: '2026-02-08', coeff: 2, note_cc: 7.5, note_efm: null },
        { id: 7, type: 'Examen Final', date: '2026-02-25', coeff: 3, note_cc: null, note_efm: 9.0 },
      ],
    },
    {
      id: 4, code: 'M201', nom: 'Reseaux Informatiques', average: 15.00,
      exams: [
        { id: 8, type: 'Controle 1', date: '2026-01-22', coeff: 2, note_cc: 16.0, note_efm: null },
        { id: 9, type: 'Controle 2', date: '2026-02-12', coeff: 2, note_cc: 14.0, note_efm: null },
        { id: 12, type: 'Examen Final', date: '2026-03-01', coeff: 4, note_cc: null, note_efm: 15.0 },
      ],
    },
    {
      id: 5, code: 'M301', nom: 'Mathematiques Appliquees', average: 13.50,
      exams: [
        { id: 13, type: 'Controle 1', date: '2026-01-25', coeff: 2, note_cc: 12.5, note_efm: null },
        { id: 14, type: 'Controle 2', date: '2026-02-15', coeff: 2, note_cc: 14.0, note_efm: null },
        { id: 15, type: 'Examen Final', date: '2026-03-05', coeff: 4, note_cc: null, note_efm: 14.0 },
      ],
    },
  ],
};

const StagiaireExamensPage: React.FC = () => {
  const { isDark } = useTheme();
  const [data, setData] = useState<ExamResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      setLoading(true);
      await axiosInstance.get('/stagiaire/exams');
      // Always use demo data for now (real API data will override when ready)
      setData(DEMO_DATA);
    } catch {
      setData(DEMO_DATA);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getNote = (exam: Exam): number | null => exam.note_cc ?? exam.note_efm;

  const getStatut = (note: number | null): { label: string; color: string; bg: string } => {
    if (note === null) return { label: '-', color: '', bg: '' };
    if (note >= 10) return {
      label: 'Valide',
      color: isDark ? 'text-emerald-400' : 'text-emerald-600',
      bg: isDark ? 'bg-emerald-900/30' : 'bg-emerald-50',
    };
    return {
      label: 'Insuffisant',
      color: isDark ? 'text-red-400' : 'text-red-500',
      bg: isDark ? 'bg-red-900/30' : 'bg-red-50',
    };
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#121217]' : 'bg-gray-50'}`}>
        <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Chargement des examens...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#121217]' : 'bg-gray-50'}`}>

      {/* Header */}
      <div className="mb-6">
        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Examens & notes</h1>
        <p className={`text-sm mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          <Link to="/stagiaire" className="text-primary-600 hover:text-primary-700">Tableau de bord</Link>
          {' / '}
          <span className="text-primary-600">Academique</span>
          {' / '}
          <span>Examens & notes</span>
        </p>
      </div>

      {/* Moyenne Generale + Semestre bar */}
      {data && (
        <div className={`flex items-center justify-between px-6 py-4 mb-6 rounded-2xl border ${isDark ? 'bg-[#1a1a22] border-[#2a2a35]' : 'bg-white border-gray-200'}`}>
          <h2 className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Moyenne Generale: <span className={isDark ? (data.overall_average >= 10 ? 'text-emerald-400' : 'text-red-400') : (data.overall_average >= 10 ? 'text-emerald-600' : 'text-red-500')}>{data.overall_average.toFixed(1)}/20</span>
          </h2>
          <span className={`text-sm font-medium ${isDark ? 'text-[#8b8b9e]' : 'text-gray-500'}`}>Semestre: S1</span>
        </div>
      )}

      {/* Module sections */}
      <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-[#1a1a22] border-[#2a2a35]' : 'bg-white border-gray-200'}`}>
        {data?.modules && data.modules.length > 0 ? (
          data.modules.map((mod, mi) => {
            const isPass = mod.average >= 10;
            return (
              <div key={mod.id || mi}>
                {/* Module header */}
                <div className={`flex items-center justify-between px-6 py-3.5 ${
                  mi > 0 ? `border-t ${isDark ? 'border-[#2a2a35]' : 'border-gray-200'}` : ''
                } ${isDark ? 'bg-[#1e1e28]' : 'bg-gray-50/80'}`}>
                  <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {mod.code} - {mod.nom}
                  </span>
                  <span className={`text-sm font-bold ${isPass ? 'text-emerald-500' : 'text-red-500'}`}>
                    Moyenne: {mod.average.toFixed(2)}/20
                  </span>
                </div>

                {/* Column headers */}
                <div className={`grid grid-cols-5 px-6 py-2.5 border-b ${isDark ? 'border-[#2a2a35]' : 'border-gray-100'}`}>
                  {['Type', 'Date', 'Coefficient', 'Note', 'Statut'].map(col => (
                    <span key={col} className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {col}
                    </span>
                  ))}
                </div>

                {/* Exam rows */}
                {mod.exams.map((exam, ei) => {
                  const note = getNote(exam);
                  const statut = getStatut(note);
                  return (
                    <div
                      key={exam.id || ei}
                      className={`grid grid-cols-5 px-6 py-3 items-center ${
                        ei < mod.exams.length - 1 ? `border-b ${isDark ? 'border-[#2a2a35]' : 'border-gray-50'}` : ''
                      } ${isDark ? 'hover:bg-[#1e1e28]' : 'hover:bg-gray-50/50'} transition-colors`}
                    >
                      <span className={`text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                        {exam.type}
                      </span>
                      <span className={`text-sm ${isDark ? 'text-[#6e6e82]' : 'text-gray-600'}`}>
                        {formatDate(exam.date)}
                      </span>
                      <span className={`text-sm ${isDark ? 'text-[#6e6e82]' : 'text-gray-600'}`}>
                        {exam.coeff}
                      </span>
                      <span className={`text-sm font-semibold ${isDark ? 'text-[#7fa8d4]' : 'text-primary-600'}`}>
                        {note !== null ? `${note.toFixed(1)}/20` : '-'}
                      </span>
                      <span>
                        {note !== null && (
                          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${statut.bg} ${statut.color}`}>
                            {statut.label}
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })
        ) : (
          <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Aucun examen enregistre
          </div>
        )}
      </div>
    </div>
  );
};

export default StagiaireExamensPage;
