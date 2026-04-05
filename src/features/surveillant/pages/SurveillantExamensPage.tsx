import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import axiosInstance from '../../../utils/axios';
import toast from 'react-hot-toast';
import { HiFilter, HiChevronUp, HiChevronDown } from 'react-icons/hi';

interface ExamNote {
  id: number;
  note: number;
  stagiaire: { user: { nom: string; prenom: string } };
  examen: {
    id: number;
    type: string;
    date_examen: string;
    module: { id: number; nom: string; code: string };
    formateur?: { user?: { nom: string; prenom: string } };
  };
}

interface Filiere {
  id: number;
  nom: string;
}

interface Module {
  id: number;
  nom: string;
  code: string;
}

const SurveillantExamensPage: React.FC = () => {
  const { isDark } = useTheme();
  const [notes, setNotes] = useState<ExamNote[]>([]);
  const [filieres, setFilieres] = useState<Filiere[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedFiliere, setSelectedFiliere] = useState('');
  const [selectedModule, setSelectedModule] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [selectedFiliere, selectedModule]);

  const fetchInitialData = async () => {
    try {
      const [filieresRes, modulesRes] = await Promise.all([
        axiosInstance.get('/filieres'),
        axiosInstance.get('/modules'),
      ]);
      setFilieres(filieresRes.data.data || []);
      setModules(modulesRes.data.data || []);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      toast.error('Erreur lors du chargement des filtres');
    }
  };

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const params: any = { per_page: 20 };
      if (selectedFiliere) params.filiere_id = selectedFiliere;
      if (selectedModule) params.module_id = selectedModule;

      const res = await axiosInstance.get('/surveillant/exam-results', { params });
      setNotes(res.data.data || []);
      setCurrentPage(1);
    } catch (error) {
      console.error('Error fetching exam results:', error);
      toast.error('Erreur lors du chargement des résultats');
    } finally {
      setLoading(false);
    }
  };

  // Group notes by stagiaire for display
  const stagiairesMap = new Map<string, ExamNote[]>();
  notes.forEach(note => {
    const key = `${note.stagiaire.user.nom}-${note.stagiaire.user.prenom}`;
    if (!stagiairesMap.has(key)) {
      stagiairesMap.set(key, []);
    }
    stagiairesMap.get(key)!.push(note);
  });

  const displayRows = Array.from(stagiairesMap.entries()).map(([name, exams]) => ({
    name,
    exams,
  }));

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-950' : 'bg-gray-50'}`}>
      <div className="mb-6">
        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Examens & Notes
        </h1>
        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Tableau de bord / Académique / Examens & Notes
        </p>
      </div>

      <div className={`border rounded-xl ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className={`flex items-center justify-between px-6 pt-5 pb-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Examens & Notes
          </h2>
          <div className="flex items-center gap-3">
            <button className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm transition-colors ${
              isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
              <HiFilter className="h-4 w-4" /> Filtrer
            </button>
          </div>
        </div>

        <div className={`flex items-center gap-4 px-6 py-4 border-b flex-wrap ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2">
            <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Filières</span>
            <select
              value={selectedFiliere}
              onChange={e => setSelectedFiliere(e.target.value)}
              className={`text-sm border rounded-lg px-3 py-1.5 ${
                isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'
              }`}
            >
              <option value="">Toutes</option>
              {filieres.map(f => (
                <option key={f.id} value={f.id}>{f.nom}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Modules</span>
            <select
              value={selectedModule}
              onChange={e => setSelectedModule(e.target.value)}
              className={`text-sm border rounded-lg px-3 py-1.5 ${
                isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'
              }`}
            >
              <option value="">Tous</option>
              {modules.map(m => (
                <option key={m.id} value={m.id}>{m.nom}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`border-b ${isDark ? 'bg-gray-700/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                <th className={`w-10 px-4 py-3 ${isDark ? 'text-gray-300' : ''}`}>
                  <input type="checkbox" className="rounded border-gray-300 text-primary-600" />
                </th>
                {['Stagiaire', 'Module', 'Type Examen', 'Note', 'Date'].map(c => (
                  <th
                    key={c}
                    className={`px-4 py-3 text-left text-sm font-semibold ${
                      isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    <span className="inline-flex items-center">
                      {c}
                      <span className="inline-flex flex-col ml-1 -space-y-1">
                        <HiChevronUp className={`h-3 w-3 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                        <HiChevronDown className={`h-3 w-3 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                      </span>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-100'}`}>
              {loading ? (
                <tr>
                  <td colSpan={6} className={`px-4 py-8 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Chargement...
                  </td>
                </tr>
              ) : displayRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className={`px-4 py-8 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Aucune donnée trouvée
                  </td>
                </tr>
              ) : (
                displayRows.map((row, idx) =>
                  row.exams.map((exam, eIdx) => (
                    <tr
                      key={`${idx}-${eIdx}`}
                      className={`transition-colors ${isDark ? 'hover:bg-gray-700/30' : 'hover:bg-gray-50'}`}
                    >
                      {eIdx === 0 && (
                        <td rowSpan={row.exams.length} className="px-4 py-3.5">
                          <input type="checkbox" className="rounded border-gray-300 text-primary-600" />
                        </td>
                      )}
                      {eIdx === 0 && (
                        <td
                          rowSpan={row.exams.length}
                          className={`px-4 py-3.5 text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}
                        >
                          {row.name}
                        </td>
                      )}
                      <td className={`px-4 py-3.5 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {exam.examen.module.nom} ({exam.examen.module.code})
                      </td>
                      <td className={`px-4 py-3.5 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {exam.examen.type}
                      </td>
                      <td className={`px-4 py-3.5 text-sm font-semibold ${exam.note >= 10 ? 'text-green-600' : 'text-red-600'}`}>
                        {exam.note.toFixed(2)}/20
                      </td>
                      <td className={`px-4 py-3.5 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {new Date(exam.examen.date_examen).toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  ))
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SurveillantExamensPage;
