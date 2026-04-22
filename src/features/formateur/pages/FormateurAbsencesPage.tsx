import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../../contexts/ThemeContext';
import axiosInstance from '../../../utils/axios';
import toast from 'react-hot-toast';
import { HiChevronDown } from 'react-icons/hi';

interface Group {
  id: number;
  nom: string;
  filiere_id: number;
}

interface AbsenceRow {
  stagiaire_id: number;
  nom: string;
  absence_id: number | null; // existing DB record id (if any)
  statut: 'present' | 'absent' | null;
}

const TIME_SLOTS = [
  { label: '08:30 - 10:50', start: '08:30', end: '10:50' },
  { label: '11:10 - 13:30', start: '11:10', end: '13:30' },
  { label: '13:30 - 15:50', start: '13:30', end: '15:50' },
  { label: '16:10 - 18:30', start: '16:10', end: '18:30' },
];

const FormateurAbsencesPage: React.FC = () => {
  const { isDark } = useTheme();

  const [groups, setGroups] = useState<Group[]>([]);

  const [selectedDate,   setSelectedDate]   = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedGroupe, setSelectedGroupe] = useState('');
  const [selectedSeance, setSelectedSeance] = useState('');

  const [rows,        setRows]        = useState<AbsenceRow[]>([]);
  const [sortAZ,      setSortAZ]      = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [isSaved,     setIsSaved]     = useState(false);

  // ── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        // Only groups this formateur is assigned to — fed by the formateur_group
        // pivot set from the Directeur's Ajouter/Modifier formateur cascade.
        const grpRes = await axiosInstance.get('/formateur/groups');
        setGroups(grpRes.data.data);
      } catch {
        toast.error('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // ── Load stagiaires THEN check for existing absences (sequential — no race) ─
  useEffect(() => {
    if (!selectedGroupe || !selectedSeance) { setRows([]); setIsSaved(false); return; }

    let cancelled = false;
    setLoadingRows(true);
    setIsSaved(false);

    (async () => {
      try {
        // Step 1: fetch stagiaires for this group
        const grpRes = await axiosInstance.get(`/groups/${selectedGroupe}/stagiaires`);
        if (cancelled) return;

        const loadedRows: AbsenceRow[] = grpRes.data.data.map((s: any) => ({
          stagiaire_id: s.id,
          nom: `${s.user.prenom} ${s.user.nom}`,
          absence_id: null,
          statut: 'present' as const,
        }));

        // Step 2: check for previously saved absences for this date + time slot
        const slot = TIME_SLOTS.find(s => s.label === selectedSeance);
        if (slot && selectedDate) {
          try {
            const absRes = await axiosInstance.get('/absences', {
              params: { date_from: selectedDate, date_to: selectedDate, per_page: 100 },
            });
            if (cancelled) return;

            const existing: any[] = absRes.data.data;
            const stagiaireIds = new Set(loadedRows.map(r => r.stagiaire_id));
            const relevant = existing.filter(
              a => stagiaireIds.has(a.stagiaire_id) &&
                   a.heure_debut?.substring(0, 5) === slot.start
            );

            if (relevant.length > 0) {
              setIsSaved(true);
              setRows(loadedRows.map(row => {
                const found = relevant.find(a => a.stagiaire_id === row.stagiaire_id);
                return found
                  ? { ...row, absence_id: found.id, statut: 'absent' as const }
                  : row;
              }));
              return;
            }
          } catch { /* silent — no saved data is fine */ }
        }

        // No saved session found — show all present
        setRows(loadedRows);
      } catch {
        if (!cancelled) toast.error('Erreur lors du chargement des stagiaires');
      } finally {
        if (!cancelled) setLoadingRows(false);
      }
    })();

    return () => { cancelled = true; };
  }, [selectedGroupe, selectedSeance, selectedDate]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleStatusChange = (stagiaireId: number, status: 'present' | 'absent') => {
    setIsSaved(false);
    setRows(prev =>
      prev.map(row =>
        row.stagiaire_id === stagiaireId ? { ...row, statut: status } : row
      )
    );
  };

  const handleSave = async () => {
    if (!selectedGroupe || !selectedDate || !selectedSeance) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    const slot = TIME_SLOTS.find(s => s.label === selectedSeance)!;

    if (rows.every(r => r.statut === null)) {
      toast.error('Veuillez marquer le statut d\'au moins un stagiaire');
      return;
    }

    // Everyone present and no existing records to clean up → nothing to do
    const absentRows  = rows.filter(r => r.statut === 'absent');
    const toDelete    = rows.filter(r => r.statut === 'present' && r.absence_id !== null);
    const toCreate    = absentRows.filter(r => r.absence_id === null);

    if (absentRows.length === 0 && toDelete.length === 0) {
      toast.success('Tout le monde est présent — aucune absence à enregistrer');
      setIsSaved(true);
      return;
    }

    setSaving(true);
    let saved = 0;
    let deleted = 0;
    let failed = 0;

    // Create new absence records
    for (const row of toCreate) {
      try {
        const res = await axiosInstance.post('/absences', {
          stagiaire_id: row.stagiaire_id,
          date_absence: selectedDate,
          heure_debut:  slot.start,
          heure_fin:    slot.end,
          status:       'non_justifiee',
        });
        // Update local row with the new DB id
        setRows(prev => prev.map(r =>
          r.stagiaire_id === row.stagiaire_id
            ? { ...r, absence_id: res.data.data?.id ?? null }
            : r
        ));
        saved++;
      } catch {
        failed++;
      }
    }

    // Delete records for students now marked present
    for (const row of toDelete) {
      try {
        await axiosInstance.delete(`/absences/${row.absence_id}`);
        setRows(prev => prev.map(r =>
          r.stagiaire_id === row.stagiaire_id ? { ...r, absence_id: null } : r
        ));
        deleted++;
      } catch {
        failed++;
      }
    }

    setSaving(false);

    if (failed > 0) {
      toast.error(`${failed} opération(s) ont échoué`);
    } else if (saved > 0 || deleted > 0) {
      const parts = [];
      if (saved > 0)   parts.push(`${saved} absence(s) enregistrée(s)`);
      if (deleted > 0) parts.push(`${deleted} retrait(s) effectué(s)`);
      toast.success(parts.join(' · '));
      setIsSaved(true);
    } else {
      toast.success('Aucun changement à enregistrer');
      setIsSaved(true);
    }
  };

  const handleReset = () => {
    setIsSaved(false);
    // Keep absence_id so the save can delete records that get changed to present
    setRows(prev => prev.map(r => ({ ...r, statut: r.absence_id ? 'absent' as const : 'present' as const })));
  };

  const canSave = selectedGroupe && selectedDate && selectedSeance && rows.some(r => r.statut !== null);

  const displayRows = sortAZ
    ? [...rows].sort((a, b) => b.nom.localeCompare(a.nom, 'fr'))
    : [...rows].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-950' : 'bg-gray-50'}`}>

      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Absences</h1>
          <p className={`text-sm mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            <Link to="/formateur/dashboard" className="text-primary-600 hover:underline">Tableau de bord</Link>
            {' / '}
            <span className="text-primary-600">Gestion</span>
            {' / '}
            <span>Absences</span>
          </p>
        </div>
      </div>

      {/* ── Main card ── */}
      <div className={`rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>

        {/* ── Card title + action buttons ── */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Saisir les absences</h2>
          <button
            onClick={() => setSortAZ(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
              sortAZ
                ? 'bg-primary-600 text-white border-primary-600'
                : isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {sortAZ ? 'Sort By Z-A' : 'Sort By A-Z'} <HiChevronDown className="h-4 w-4" />
          </button>
        </div>

        {/* ── Filters ── */}
        <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700 bg-gray-700/20' : 'border-gray-100 bg-gray-50'}`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => { setSelectedDate(e.target.value); setIsSaved(false); }}
                className={`w-full px-3 py-2 border rounded-lg text-sm ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              />
            </div>

            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Groupe</label>
              <select
                value={selectedGroupe}
                onChange={e => { setSelectedGroupe(e.target.value); setIsSaved(false); }}
                className={`w-full px-3 py-2 border rounded-lg text-sm ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              >
                <option value="">-- Choisir --</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
              </select>
            </div>

            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Séance</label>
              <select
                value={selectedSeance}
                onChange={e => { setSelectedSeance(e.target.value); setIsSaved(false); }}
                className={`w-full px-3 py-2 border rounded-lg text-sm ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              >
                <option value="">-- Choisir --</option>
                {TIME_SLOTS.map(s => <option key={s.label} value={s.label}>{s.label}</option>)}
              </select>
            </div>

          </div>

          {isSaved && (
            <div className="mt-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                ✓ Absences enregistrées pour cette séance
              </span>
            </div>
          )}
        </div>

        {/* ── Table ── */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`border-b ${isDark ? 'bg-gray-700/40 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                <th className="w-10 px-4 py-3">
                  <input type="checkbox" className="rounded border-gray-300 text-primary-600" />
                </th>
                {['Stagiaire', "Bille d'absence", 'Statut'].map(col => (
                  <th key={col} className={`px-4 py-3 text-left text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-100'}`}>
              {loading || loadingRows ? (
                <tr>
                  <td colSpan={4} className={`px-4 py-10 text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Chargement...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className={`px-4 py-10 text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {!selectedGroupe ? 'Sélectionnez un groupe' : !selectedSeance ? 'Sélectionnez une séance' : 'Aucun stagiaire trouvé'}
                  </td>
                </tr>
              ) : (
                displayRows.map(row => (
                  <tr key={row.stagiaire_id} className={`transition-colors ${isDark ? 'hover:bg-gray-700/30' : 'hover:bg-gray-50'}`}>
                    <td className="px-4 py-3.5">
                      <input type="checkbox" className="rounded border-gray-300 text-primary-600" />
                    </td>

                    <td className={`px-4 py-3.5 text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {row.nom}
                    </td>

                    <td className="px-4 py-3.5">
                      {row.statut === 'absent' ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600'}`}>
                          Non justifiée
                        </span>
                      ) : (
                        <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>–</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleStatusChange(row.stagiaire_id, 'present')}
                          className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                            row.statut === 'present'
                              ? isDark ? 'bg-green-900/30 text-green-400 border-green-700' : 'bg-green-100 text-green-700 border-green-200'
                              : isDark ? 'bg-gray-700 text-gray-300 border-gray-600 hover:border-gray-500' : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                          }`}
                        >
                          Présent
                        </button>
                        <button
                          onClick={() => handleStatusChange(row.stagiaire_id, 'absent')}
                          className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                            row.statut === 'absent'
                              ? isDark ? 'bg-red-900/30 text-red-400 border-red-700' : 'bg-red-100 text-red-700 border-red-200'
                              : isDark ? 'bg-gray-700 text-gray-300 border-gray-600 hover:border-gray-500' : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                          }`}
                        >
                          Absent
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Bottom action bar ── */}
      <div className="flex justify-end gap-3 mt-6">
        {isSaved && (
          <button
            onClick={handleReset}
            className={`px-6 py-3 rounded-xl text-sm font-medium transition-colors ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            Modifier
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={!canSave || saving || isSaved}
          className={`px-8 py-3 rounded-xl text-sm font-medium transition-colors ${
            !canSave || saving || isSaved
              ? isDark ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-primary-600 text-white hover:bg-primary-700'
          }`}
        >
          {saving ? 'Enregistrement...' : 'Enregistrer les absences'}
        </button>
      </div>
    </div>
  );
};

export default FormateurAbsencesPage;
