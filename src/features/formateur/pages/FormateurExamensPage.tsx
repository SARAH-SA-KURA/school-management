import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../../contexts/ThemeContext';
import axiosInstance from '../../../utils/axios';
import toast from 'react-hot-toast';
import { HiDownload, HiUpload, HiChevronDown } from 'react-icons/hi';

interface Module {
  id: number;
  nom: string;
  code: string;
  coefficient: number;
}

interface GradeRow {
  stagiaire_id: number;
  name: string;
  // key: `cc_${n}` or 'efm'  →  value: number | null
  notes: Record<string, number | null>;
  abs: Record<string, boolean>;
}

interface ExamenRecord {
  id: number;
  type: string;
  numero: number | null;
}

// Grade options for the dropdown (0–20 in 0.25 steps)
const GRADE_OPTIONS: number[] = [];
for (let i = 0; i <= 20; i += 0.25) {
  GRADE_OPTIONS.push(Math.round(i * 100) / 100);
}

const FormateurExamensPage: React.FC = () => {
  const { isDark } = useTheme();

  const [filieres, setFilieres]   = useState<any[]>([]);
  const [groups, setGroups]       = useState<any[]>([]);
  const [modules, setModules]     = useState<Module[]>([]);
  const [formateur, setFormateur] = useState<any>(null);

  const [selectedFiliere,  setSelectedFiliere]  = useState('');
  const [selectedGroupe,   setSelectedGroupe]   = useState('');
  const [selectedModule,   setSelectedModule]   = useState('');
  const [numControle,      setNumControle]       = useState(2); // N° de contrôle

  // Map of column key → examen record (already saved in DB)
  const [examenMap, setExamenMap] = useState<Record<string, ExamenRecord>>({});

  const [gradeRows,   setGradeRows]   = useState<GradeRow[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [loadingNotes,setLoadingNotes]= useState(false);
  const [saving,      setSaving]      = useState(false);
  const [isSaved,     setIsSaved]     = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 7;

  const exportRef  = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exportOpen, setExportOpen] = useState(false);

  // Column keys derived from numControle: ['cc_1', 'cc_2', ..., 'efm']
  const columns = [
    ...Array.from({ length: numControle }, (_, i) => `cc_${i + 1}`),
    'efm',
  ];

  const colLabel = (key: string) =>
    key === 'efm' ? 'EFM' : `CC${key.split('_')[1]}`;

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const [filRes, grpRes, fmtRes] = await Promise.all([
          axiosInstance.get('/filieres'),
          axiosInstance.get('/groups'),
          axiosInstance.get('/auth/formateur'),
        ]);
        setFilieres(filRes.data.data);
        setGroups(grpRes.data.data);
        const fmt = fmtRes.data.data;
        setFormateur(fmt);
        setModules(fmt.modules || []);
      } catch {
        toast.error('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };
    init();

    const outsideClick = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node))
        setExportOpen(false);
    };
    document.addEventListener('mousedown', outsideClick);
    return () => document.removeEventListener('mousedown', outsideClick);
  }, []);

  // ── Load stagiaires when groupe changes ───────────────────────────────────
  useEffect(() => {
    if (!selectedGroupe) { setGradeRows([]); return; }
    axiosInstance.get(`/groups/${selectedGroupe}/stagiaires`).then(res => {
      setGradeRows(
        res.data.data.map((s: any) => ({
          stagiaire_id: s.id,
          name: `${s.user.prenom} ${s.user.nom}`,
          notes: {},
          abs: {},
        }))
      );
    }).catch(() => toast.error('Erreur lors du chargement des stagiaires'));
  }, [selectedGroupe]);

  // ── Lookup existing exams + notes when filters are fully set ──────────────
  const lookupExistingData = useCallback(async () => {
    if (!selectedModule || !selectedGroupe || !formateur) return;
    setLoadingNotes(true);
    setExamenMap({});
    setIsSaved(false);

    try {
      // Fetch all exams for this formateur+module+group combo
      const examRes = await axiosInstance.get('/examens', {
        params: {
          formateur_id: formateur.id,
          module_id: selectedModule,
          group_id: selectedGroupe,
          per_page: 20,
        },
      });
      const exams: any[] = examRes.data.data;
      if (exams.length === 0) { setLoadingNotes(false); return; }

      // Build examenMap: 'cc_1' → exam, 'efm' → exam, etc.
      const map: Record<string, ExamenRecord> = {};
      exams.forEach(ex => {
        const key = ex.type === 'controle' ? `cc_${ex.numero}` : ex.type;
        map[key] = { id: ex.id, type: ex.type, numero: ex.numero };
      });
      setExamenMap(map);

      // Detect numControle from loaded exams (max CC numero found)
      const ccNums = exams
        .filter(ex => ex.type === 'controle' && ex.numero)
        .map(ex => ex.numero as number);
      if (ccNums.length > 0) setNumControle(Math.max(...ccNums));

      // Fetch notes for each exam in parallel
      const noteRequests = Object.values(map).map(ex =>
        axiosInstance.get('/notes', { params: { examen_id: ex.id, per_page: 200 } })
          .then(r => ({ key: Object.keys(map).find(k => map[k].id === ex.id)!, notes: r.data.data }))
      );
      const allNotes = await Promise.all(noteRequests);

      // Merge into gradeRows
      setGradeRows(prev =>
        prev.map(row => {
          const updatedNotes = { ...row.notes };
          const updatedAbs   = { ...row.abs };
          allNotes.forEach(({ key, notes }) => {
            const found = notes.find((n: any) => n.stagiaire_id === row.stagiaire_id);
            if (found) {
              updatedNotes[key] = found.note;
              updatedAbs[key]   = found.note === 0;
            }
          });
          return { ...row, notes: updatedNotes, abs: updatedAbs };
        })
      );

      setIsSaved(true);
    } catch {
      // No data yet — form stays empty
    } finally {
      setLoadingNotes(false);
    }
  }, [selectedModule, selectedGroupe, formateur]);

  useEffect(() => { lookupExistingData(); }, [lookupExistingData]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleNoteChange = (stagiaireId: number, col: string, value: string) => {
    setGradeRows(rows =>
      rows.map(row =>
        row.stagiaire_id === stagiaireId
          ? { ...row, notes: { ...row.notes, [col]: value !== '' ? parseFloat(value) : null }, abs: { ...row.abs, [col]: false } }
          : row
      )
    );
  };

  const handleAbsChange = (stagiaireId: number, col: string, checked: boolean) => {
    setGradeRows(rows =>
      rows.map(row =>
        row.stagiaire_id === stagiaireId
          ? { ...row, abs: { ...row.abs, [col]: checked }, notes: { ...row.notes, [col]: checked ? 0 : null } }
          : row
      )
    );
  };

  const calcMoyenne = (row: GradeRow): string => {
    const vals = columns
      .filter(c => !row.abs[c])
      .map(c => row.notes[c])
      .filter((n): n is number => n !== null && n !== undefined);
    if (vals.length === 0) return '—';
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
  };

  const handleSave = async () => {
    if (!selectedGroupe || !selectedModule || !formateur) return;

    const hasAny = gradeRows.some(r =>
      columns.some(c => r.notes[c] !== null && r.notes[c] !== undefined || r.abs[c])
    );
    if (!hasAny) { toast.error('Veuillez saisir au moins une note'); return; }

    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const updatedMap = { ...examenMap };

      // Ensure an exam record exists for each column
      for (const col of columns) {
        if (!updatedMap[col]) {
          const isCC = col.startsWith('cc_');
          const examRes = await axiosInstance.post('/examens', {
            module_id:    parseInt(selectedModule),
            group_id:     parseInt(selectedGroupe),
            formateur_id: formateur.id,
            type:         isCC ? 'controle' : col,
            numero:       isCC ? parseInt(col.split('_')[1]) : null,
            date_examen:  today,
            heure_debut:  '08:30',
            heure_fin:    '10:50',
          });
          updatedMap[col] = { id: examRes.data.data.id, type: examRes.data.data.type, numero: examRes.data.data.numero };
        }
      }
      setExamenMap(updatedMap);

      // Batch save all notes per column
      for (const col of columns) {
        const examId = updatedMap[col]?.id;
        if (!examId) continue;
        const notesData = gradeRows
          .filter(r => r.notes[col] !== null && r.notes[col] !== undefined || r.abs[col])
          .map(r => ({
            stagiaire_id: r.stagiaire_id,
            examen_id:    examId,
            note:         r.abs[col] ? 0 : r.notes[col],
          }));
        if (notesData.length > 0)
          await axiosInstance.post('/notes/batch', { notes: notesData });
      }

      toast.success('Notes enregistrées avec succès');
      setIsSaved(true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setIsSaved(false);
    setSelectedFiliere('');
    setSelectedGroupe('');
    setSelectedModule('');
    setNumControle(2);
    setExamenMap({});
    setGradeRows([]);
    setCurrentPage(1);
  };

  const exportToCSV = () => {
    const headers = ['Stagiaire', ...columns.map(colLabel), 'Moyenne'];
    const rows = gradeRows.map(r => [
      r.name,
      ...columns.map(c => r.abs[c] ? 'ABS' : r.notes[c] ?? ''),
      calcMoyenne(r),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `notes_module${selectedModule}.csv`;
    link.click();
    setExportOpen(false);
    toast.success('CSV téléchargé');
  };

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages   = Math.max(1, Math.ceil(gradeRows.length / rowsPerPage));
  const pagedRows    = gradeRows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const selectedModuleData = modules.find(m => m.id === parseInt(selectedModule));
  const inputDisabled = isSaved || saving;

  // Pill-select style classes
  const pillCls = (disabled = false) =>
    `flex items-center gap-1 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${
      disabled
        ? isDark ? 'bg-gray-700 border-gray-600 text-gray-400 cursor-not-allowed' : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
        : isDark ? 'bg-gray-800 border-gray-600 text-white hover:border-primary-500' : 'bg-white border-gray-300 text-gray-700 hover:border-primary-400'
    }`;

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-950' : 'bg-gray-50'}`}>

      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Examens & notes</h1>
          <p className={`text-sm mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            <Link to="/formateur/dashboard" className="text-primary-600 hover:underline">Tableau de bord</Link>
            {' / '}
            <span className="text-primary-600">Académique</span>
            {' / '}
            <span>Examens & notes</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
          >
            <HiUpload className="h-4 w-4" /> Import
          </button>
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx" className="hidden" />

          <div className="relative" ref={exportRef}>
            <button
              onClick={() => setExportOpen(!exportOpen)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              <HiDownload className="h-4 w-4" /> Export
            </button>
            {exportOpen && (
              <div className={`absolute right-0 mt-2 w-44 rounded-lg shadow-lg border z-20 overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <button onClick={exportToCSV} className={`w-full text-left px-4 py-2.5 text-sm ${isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'}`}>
                  CSV
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Main card ── */}
      <div className={`rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>

        {/* ── Title row ── */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Examens & notes</h2>
          <div className="flex items-center gap-2">
            <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
              Sort By A-Z <HiChevronDown className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Filter pills ── */}
        <div className={`flex items-center gap-3 px-6 py-3 border-b flex-wrap ${isDark ? 'border-gray-700 bg-gray-700/30' : 'border-gray-100 bg-gray-50'}`}>

          {/* Filières */}
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Filières</span>
            <select
              value={selectedFiliere}
              onChange={e => { setSelectedFiliere(e.target.value); setSelectedGroupe(''); setIsSaved(false); setGradeRows([]); setExamenMap({}); }}
              disabled={inputDisabled}
              className={pillCls(inputDisabled)}
            >
              <option value="">Toutes</option>
              {filieres.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
            </select>
          </div>

          {/* Groupes */}
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Groupes</span>
            <select
              value={selectedGroupe}
              onChange={e => { setSelectedGroupe(e.target.value); setIsSaved(false); setExamenMap({}); }}
              disabled={inputDisabled || !selectedFiliere}
              className={pillCls(inputDisabled || !selectedFiliere)}
            >
              <option value="">—</option>
              {groups
                .filter(g => !selectedFiliere || g.filiere_id === parseInt(selectedFiliere))
                .map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
            </select>
          </div>

          {/* Modules */}
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Modules</span>
            <select
              value={selectedModule}
              onChange={e => { setSelectedModule(e.target.value); setIsSaved(false); setExamenMap({}); }}
              disabled={inputDisabled || !selectedGroupe}
              className={pillCls(inputDisabled || !selectedGroupe)}
            >
              <option value="">—</option>
              {modules.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
            </select>
          </div>

          {/* Coeff (read-only display) */}
          {selectedModuleData && (
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Coeff</span>
              <span className={pillCls()}>{selectedModuleData.coefficient}</span>
            </div>
          )}

          {/* N° de contrôle */}
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>N° de contrôle</span>
            <select
              value={numControle}
              onChange={e => { setNumControle(parseInt(e.target.value)); setIsSaved(false); setExamenMap({}); }}
              disabled={inputDisabled}
              className={pillCls(inputDisabled)}
            >
              {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          {isSaved && (
            <span className="ml-auto px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
              ✓ Enregistré
            </span>
          )}
        </div>

        {/* ── Table ── */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`border-b ${isDark ? 'bg-gray-700/40 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                <th className="w-10 px-4 py-3">
                  <input type="checkbox" className="rounded border-gray-300" />
                </th>
                <th className={`px-4 py-3 text-left text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Stagiaire
                </th>
                {columns.map(col => (
                  <th key={col} className={`px-4 py-3 text-center text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {colLabel(col)}
                  </th>
                ))}
                <th className={`px-4 py-3 text-center text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Moyenne
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-100'}`}>
              {loading || loadingNotes ? (
                <tr>
                  <td colSpan={columns.length + 3} className={`px-4 py-10 text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Chargement...
                  </td>
                </tr>
              ) : pagedRows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 3} className={`px-4 py-10 text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Sélectionnez une filière, un groupe et un module
                  </td>
                </tr>
              ) : (
                pagedRows.map((row) => (
                  <tr key={row.stagiaire_id} className={`transition-colors ${isDark ? 'hover:bg-gray-700/30' : 'hover:bg-gray-50'}`}>
                    <td className="px-4 py-3">
                      <input type="checkbox" className="rounded border-gray-300" />
                    </td>
                    <td className={`px-4 py-3 text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {row.name}
                    </td>
                    {columns.map(col => (
                      <td key={col} className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          {/* Grade dropdown */}
                          <select
                            value={row.abs[col] ? '' : row.notes[col] ?? ''}
                            onChange={e => handleNoteChange(row.stagiaire_id, col, e.target.value)}
                            disabled={row.abs[col] || inputDisabled}
                            className={`w-16 text-sm border rounded px-1.5 py-1 text-center ${
                              row.abs[col] || inputDisabled
                                ? isDark ? 'bg-gray-600 border-gray-500 text-gray-400 cursor-not-allowed' : 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                                : isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                            }`}
                          >
                            <option value="">—</option>
                            {GRADE_OPTIONS.map(g => (
                              <option key={g} value={g}>{g % 1 === 0 ? g : g.toFixed(2)}</option>
                            ))}
                          </select>
                          {/* ABS label + checkbox */}
                          <label className={`flex items-center gap-1 text-xs select-none ${inputDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            <input
                              type="checkbox"
                              checked={row.abs[col] || false}
                              onChange={e => handleAbsChange(row.stagiaire_id, col, e.target.checked)}
                              disabled={inputDisabled}
                              className="rounded border-gray-300 text-primary-600"
                            />
                            ABS
                          </label>
                        </div>
                      </td>
                    ))}
                    <td className={`px-4 py-3 text-center text-sm font-bold ${
                      calcMoyenne(row) === '—'
                        ? isDark ? 'text-gray-500' : 'text-gray-400'
                        : parseFloat(calcMoyenne(row)) >= 12
                          ? isDark ? 'text-green-400' : 'text-green-600'
                          : isDark ? 'text-red-400' : 'text-red-600'
                    }`}>
                      {calcMoyenne(row)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {gradeRows.length > rowsPerPage && (
          <div className={`flex items-center justify-end gap-1 px-6 py-3 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                currentPage === 1
                  ? isDark ? 'text-gray-600 cursor-not-allowed' : 'text-gray-300 cursor-not-allowed'
                  : isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Pre
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setCurrentPage(p)}
                className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                  p === currentPage
                    ? 'bg-primary-600 text-white'
                    : isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                currentPage === totalPages
                  ? isDark ? 'text-gray-600 cursor-not-allowed' : 'text-gray-300 cursor-not-allowed'
                  : isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* ── Bottom action bar ── */}
      <div className="flex justify-end gap-3 mt-6">
        {isSaved && (
          <button
            onClick={() => setIsSaved(false)}
            className={`px-6 py-3 rounded-xl text-sm font-medium transition-colors ${isDark ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
          >
            Modifier
          </button>
        )}
        {isSaved && (
          <button
            onClick={handleReset}
            className={`px-6 py-3 rounded-xl text-sm font-medium transition-colors ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            Nouvelle saisie
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={!selectedGroupe || !selectedModule || inputDisabled}
          className={`px-8 py-3 rounded-xl text-sm font-medium transition-colors ${
            !selectedGroupe || !selectedModule || inputDisabled
              ? isDark ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-primary-600 text-white hover:bg-primary-700'
          }`}
        >
          {saving ? 'Enregistrement...' : 'Enregistrer les notes'}
        </button>
      </div>
    </div>
  );
};

export default FormateurExamensPage;
