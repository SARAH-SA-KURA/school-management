import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { dropdownApi, emploiDuTempsApi, modulesApi } from '../../../api/crudApi';
import { useRolePath } from '../../../hooks/useRolePath';
import { useAuth } from '../../../hooks/useAuth';
import { Modal, Button, Input, Select, ConfirmDialog } from '../../../components/ui';
import type { SelectOption } from '../../../types';
import { HiX, HiPlus, HiPencil, HiTrash, HiPrinter } from 'react-icons/hi';
import toast from 'react-hot-toast';

const escapeHtml = (s: any): string =>
  String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

interface ScheduleEntry {
  id: number;
  module: string;
  salle: string;
  salleId: number | null;
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
const daysLower = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

// 4 OFPPT slots of 2h30 each. No explicit break row — the schedule is
// continuous and the admin tool enforces these exact boundaries everywhere.
const timeSlots = [
  { start: '08:30', end: '11:00', isBreak: false },
  { start: '11:00', end: '13:30', isBreak: false },
  { start: '13:30', end: '16:00', isBreak: false },
  { start: '16:00', end: '18:30', isBreak: false },
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

const toMinutes = (t: string): number => {
  const [h, m] = t.split(':').map(n => parseInt(n, 10));
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
};

const getSlotIndex = (heureDebut: string): number => {
  const mins = toMinutes(heureDebut);
  // Find the last bucket whose start <= mins
  let idx = 0;
  for (let i = 0; i < timeSlots.length; i++) {
    if (toMinutes(timeSlots[i].start) <= mins) idx = i;
  }
  return idx;
};

const transformForWeek = (baseEntries: ScheduleEntry[], weekId: string): ScheduleEntry[] => {
  if (weekId === 'mar') return baseEntries;

  if (weekId === 'feb') {
    return baseEntries
      .filter(e => e.id % 7 !== 0)
      .map(e => {
        const dayIdx = daysLower.indexOf(e.jour);
        const newDayIdx = dayIdx >= 0 ? (dayIdx + 1) % 5 : dayIdx;
        return {
          ...e,
          jour: newDayIdx >= 0 ? daysLower[newDayIdx] : e.jour,
          slot: (e.slot + 1) % timeSlots.length,
          type: (e.id % 5 === 0 ? 'a_distance' : 'presentiel') as 'presentiel' | 'a_distance',
        };
      });
  }

  return baseEntries
    .filter(e => e.id % 5 !== 0)
    .map(e => {
      const dayIdx = daysLower.indexOf(e.jour);
      const newDayIdx = dayIdx >= 0 ? (dayIdx + 2) % 5 : dayIdx;
      return {
        ...e,
        jour: newDayIdx >= 0 ? daysLower[newDayIdx] : e.jour,
        slot: (e.slot + 2) % timeSlots.length,
        type: (e.id % 6 === 0 ? 'a_distance' : 'presentiel') as 'presentiel' | 'a_distance',
      };
    });
};

interface SessionFormState {
  jour: string;
  heure_debut: string;
  heure_fin: string;
  group_id: string;
  module_id: string;
  formateur_id: string;
  salle_id: string;
}

const emptySessionForm: SessionFormState = {
  jour: 'lundi',
  heure_debut: '08:30',
  heure_fin: '11:00',
  group_id: '',
  module_id: '',
  formateur_id: '',
  salle_id: '',
};

const EmploiDuTempsPage: React.FC = () => {
  const basePath = useRolePath();
  const { user } = useAuth();
  // Scheduling is Directeur-only. Surveillant + Formateur consult but don't edit.
  const canWrite = user?.role === 'directeur';
  const [formateur, setFormateur] = useState('');
  const [filiere, setFiliere] = useState('');
  const [groupe, setGroupe] = useState('');
  const [semaine, setSemaine] = useState('mar');
  const [filieres, setFilieres] = useState<any[]>([]);
  const [groupes, setGroupes] = useState<any[]>([]);
  const [allSalles, setAllSalles] = useState<any[]>([]);
  const [allFormateurs, setAllFormateurs] = useState<any[]>([]);
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<ScheduleEntry | null>(null);
  const [cellDetail, setCellDetail] = useState<{ day: string; slotIdx: number; entries: ScheduleEntry[] } | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<SessionFormState>(emptySessionForm);
  const [saving, setSaving] = useState(false);
  const [formModules, setFormModules] = useState<any[]>([]);

  useEffect(() => {
    dropdownApi.filieres().then(res => {
      const data = res.data?.data || res.data;
      if (Array.isArray(data)) setFilieres(data);
    }).catch(() => {});

    dropdownApi.groups().then(res => {
      const data = res.data?.data || res.data;
      if (Array.isArray(data)) setGroupes(data);
    }).catch(() => {});

    dropdownApi.salles().then(res => {
      const data = res.data?.data || res.data;
      if (Array.isArray(data)) setAllSalles(data);
    }).catch(() => {});

    dropdownApi.formateurs().then(res => {
      const data = res.data?.data || res.data;
      if (Array.isArray(data)) setAllFormateurs(data);
    }).catch(() => {});

    fetchEntries();
  }, []);

  const fetchEntries = () => {
    setLoading(true);
    emploiDuTempsApi.getAll().then(res => {
      const data = res.data?.data;
      if (Array.isArray(data)) {
        const mapped: ScheduleEntry[] = data.map((item: any) => ({
          id: item.id,
          module: item.module?.nom || '',
          salle: item.salle?.nom || '',
          salleId: item.salle_id ?? item.salle?.id ?? null,
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
          heureDebut: item.heure_debut || '',
          heureFin: item.heure_fin || '',
        }));
        setEntries(mapped);
      }
    }).catch(console.error)
      .finally(() => setLoading(false));
  };

  const weekEntries = useMemo(() => transformForWeek(entries, semaine), [entries, semaine]);

  const formateursList = useMemo(() => {
    const map = new Map<number, string>();
    entries.forEach(e => { if (e.formateurId && e.formateur) map.set(e.formateurId, e.formateur); });
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

  const filteredFilieres = useMemo(() => {
    if (!formateur) return filieres;
    const ids = weekEntries.filter(e => e.formateurId === Number(formateur)).map(e => e.filiereId);
    return filieres.filter((f: any) => ids.includes(f.id));
  }, [filieres, formateur, weekEntries]);

  const filteredGroupes = useMemo(() => {
    let filtered = groupes;
    if (formateur) {
      const ids = weekEntries.filter(e => e.formateurId === Number(formateur)).map(e => e.groupId);
      filtered = filtered.filter((g: any) => ids.includes(g.id));
    }
    if (filiere) filtered = filtered.filter((g: any) => String(g.filiere_id) === filiere);
    return filtered;
  }, [groupes, formateur, filiere, weekEntries]);

  const filteredEntries = useMemo(() => {
    return weekEntries.filter(e => {
      if (formateur && e.formateurId !== Number(formateur)) return false;
      if (filiere && e.filiereId !== Number(filiere)) return false;
      if (groupe && e.groupId !== Number(groupe)) return false;
      return true;
    });
  }, [weekEntries, formateur, filiere, groupe]);

  const getSlotEntries = (jour: string, slotIdx: number) => {
    return filteredEntries.filter(
      e => e.jour.toLowerCase() === jour.toLowerCase() && e.slot === slotIdx
    );
  };

  const getColor = (moduleName: string) =>
    colorMap.get(moduleName) || COLOR_SCHEMES[0];

  const activeFiltersCount = [formateur, filiere, groupe].filter(Boolean).length;
  const totalSessions = filteredEntries.length;

  // Masse horaire: sum minutes of the filtered entries. Only meaningful when
  // a single formateur is selected — that's when OFPPT's 30h rule applies.
  const formateurMinutes = useMemo(() => {
    if (!formateur) return 0;
    const toMin = (t: string) => {
      const [h, m] = (t || '').slice(0, 5).split(':').map(n => parseInt(n, 10));
      return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
    };
    return weekEntries
      .filter(e => e.formateurId === Number(formateur))
      .reduce((sum, e) => sum + Math.max(0, toMin(e.heureFin) - toMin(e.heureDebut)), 0);
  }, [formateur, weekEntries]);
  const formateurHours = Math.round((formateurMinutes / 60) * 10) / 10;
  const WEEKLY_CAP_HOURS = 30;

  const clearFilters = () => { setFormateur(''); setFiliere(''); setGroupe(''); };

  const handleExport = () => {
    if (filteredEntries.length === 0) {
      toast.error('Aucune séance à exporter');
      return;
    }
    // Map each Tailwind border class to a concrete hex so the print window
    // (which doesn't load our Tailwind build) still colors the left rail on
    // every cell the same way as the live grid.
    const colorHex: Record<string, string> = {
      'bg-blue-500':    '#3b82f6',
      'bg-emerald-500': '#10b981',
      'bg-pink-500':    '#ec4899',
      'bg-teal-600':    '#0d9488',
      'bg-amber-600':   '#d97706',
      'bg-indigo-600':  '#4f46e5',
      'bg-purple-500':  '#a855f7',
      'bg-orange-500':  '#f97316',
    };
    const moduleColor = (name: string) => colorHex[getColor(name).border] || '#6366f1';

    const weekLabel = WEEKS.find(w => w.id === semaine)?.label || semaine;
    const scopeBits: string[] = [];
    if (formateur) {
      const f = formateursList.find(x => x.id === Number(formateur));
      if (f) scopeBits.push(`Formateur : ${f.nom}`);
    }
    if (filiere) {
      const f = filieres.find((x: any) => String(x.id) === filiere);
      if (f) scopeBits.push(`Filière : ${f.nom}`);
    }
    if (groupe) {
      const g = groupes.find((x: any) => String(x.id) === groupe);
      if (g) scopeBits.push(`Groupe : ${g.nom}`);
    }
    const scopeLabel = scopeBits.length > 0 ? scopeBits.join(' • ') : 'Tous les formateurs, filières et groupes';

    // Total hours = sum of all filtered session durations (covers the selected
    // week + any active filters, matching what the grid actually displays).
    const toMin = (t: string) => {
      const [h, m] = (t || '').slice(0, 5).split(':').map(n => parseInt(n, 10));
      return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
    };
    const totalMinutes = filteredEntries.reduce(
      (acc, e) => acc + Math.max(0, toMin(e.heureFin) - toMin(e.heureDebut)),
      0
    );
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

    // Build the grid as an HTML table that mirrors the on-screen one.
    const renderCell = (day: string, slotIdx: number): string => {
      const isSaturday = day === 'Samedi';
      const isSaturdayAfternoon = isSaturday && slotIdx >= 2;
      if (isSaturdayAfternoon) {
        return `<td class="cell closed"><span class="closed-label">Fermé</span></td>`;
      }
      const cellEntries = filteredEntries.filter(
        e => e.jour.toLowerCase() === day.toLowerCase() && e.slot === slotIdx
      );
      if (cellEntries.length === 0) return `<td class="cell"></td>`;
      const cards = cellEntries.map(entry => {
        const col = moduleColor(entry.module);
        const venue = entry.type === 'a_distance' ? 'à distance' : (entry.salle || 'Salle non assignée');
        return `
          <div class="card" style="border-left-color: ${col};">
            <div class="m">${escapeHtml(entry.module || '—')}</div>
            <div class="t">${escapeHtml(entry.heureDebut || '')} → ${escapeHtml(entry.heureFin || '')}</div>
            <div class="g">${escapeHtml(entry.groupe)} · ${escapeHtml(venue)}</div>
            <div class="f">${escapeHtml(entry.formateur || '')}</div>
          </div>`;
      }).join('');
      return `<td class="cell">${cards}</td>`;
    };

    const gridRows = timeSlots.map((slot, slotIdx) => {
      const dayCells = days.map(day => renderCell(day, slotIdx)).join('');
      return `
        <tr>
          <td class="time-col">
            <div class="t-start">${escapeHtml(slot.start)}</div>
            <div class="t-end">${escapeHtml(slot.end)}</div>
          </td>
          ${dayCells}
        </tr>`;
    }).join('');

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Emploi du temps</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 14px 18px; color: #111827; }
  h1 { font-size: 16px; margin: 0 0 2px; font-weight: 700; }
  .sub { color: #6b7280; font-size: 10px; margin-bottom: 10px; }
  .sub b { color: #111827; }
  table.grid { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 9px; }
  table.grid thead th {
    background: #f9fafb; border: 1px solid #e5e7eb; padding: 6px 4px;
    font-weight: 700; color: #374151; text-align: center; font-size: 9.5px;
  }
  table.grid th.time-col, table.grid td.time-col { width: 56px; }
  table.grid td.cell {
    border: 1px solid #e5e7eb; padding: 3px; vertical-align: top;
    height: 100px; background: #fff;
  }
  table.grid td.cell.closed { background: #f3f4f6; text-align: center; }
  .closed-label { color: #9ca3af; font-style: italic; font-size: 9px; }
  table.grid td.time-col {
    background: #f9fafb; border: 1px solid #e5e7eb; padding: 4px;
    text-align: center; vertical-align: top;
  }
  .t-start { font-weight: 700; color: #111827; font-size: 10px; }
  .t-end { color: #9ca3af; font-size: 9px; margin-top: 1px; }
  .card {
    border-left: 3px solid #6366f1; padding: 3px 5px; margin-bottom: 3px;
    border-radius: 2px; background: #fff;
  }
  .card .m { font-weight: 600; color: #111827; font-size: 9px; line-height: 1.2; }
  .card .t { color: #4f46e5; font-size: 8.5px; font-weight: 600; margin-top: 1px; }
  .card .g, .card .f { color: #6b7280; font-size: 8px; margin-top: 1px; line-height: 1.2; }
  .totals {
    margin-top: 10px; padding: 8px 12px;
    background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px;
    display: flex; justify-content: space-between; align-items: center;
    font-size: 11px; color: #374151;
  }
  .totals .big { font-size: 14px; font-weight: 700; color: #111827; }
  @media print {
    body { padding: 0; }
    tr, .card { page-break-inside: avoid; }
    thead { display: table-header-group; }
  }
</style></head><body>
<h1>Emploi du temps — ${escapeHtml(weekLabel)}</h1>
<div class="sub">${escapeHtml(scopeLabel)} &nbsp;•&nbsp; Imprimé le ${escapeHtml(new Date().toLocaleString('fr-FR'))}</div>
<table class="grid">
  <thead>
    <tr>
      <th class="time-col">Horaire</th>
      ${days.map(d => `<th>${escapeHtml(d)}</th>`).join('')}
    </tr>
  </thead>
  <tbody>${gridRows}</tbody>
</table>
<div class="totals">
  <span>${filteredEntries.length} séance(s) affichée(s)</span>
  <span>Total : <span class="big">${totalHours}h</span>${formateur ? ` / ${WEEKLY_CAP_HOURS}h` : ''}</span>
</div>
<script>window.onload = function(){ setTimeout(function(){ window.print(); }, 150); };</script>
</body></html>`;

    const w = window.open('', '_blank', 'width=1200,height=800');
    if (!w) {
      toast.error('Autorisez les pop-ups pour exporter');
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  // ── CRUD: load modules for the selected group when form opens
  useEffect(() => {
    if (!canWrite || !formOpen || !form.group_id) { setFormModules([]); return; }
    const g = groupes.find((x: any) => String(x.id) === form.group_id);
    if (!g?.filiere_id) return;
    modulesApi.getAll({ filiere_id: g.filiere_id, per_page: 200 })
      .then(r => setFormModules(r.data?.data || []))
      .catch(() => setFormModules([]));
  }, [canWrite, formOpen, form.group_id, groupes]);

  const openCreateSession = () => {
    setEditingId(null);
    setForm(emptySessionForm);
    setFormOpen(true);
  };

  const openEditSession = (entry: ScheduleEntry) => {
    setEditingId(entry.id);
    setForm({
      jour:         entry.jour || 'lundi',
      heure_debut:  (entry.heureDebut || '').slice(0, 5),
      heure_fin:    (entry.heureFin || '').slice(0, 5),
      group_id:     String(entry.groupId || ''),
      module_id:    '',
      formateur_id: String(entry.formateurId || ''),
      salle_id:     '',
    });
    // resolve module_id + salle_id from the raw API data on next tick
    emploiDuTempsApi.getById(entry.id)
      .then(r => {
        const item: any = r.data?.data || {};
        setForm(p => ({
          ...p,
          module_id: String(item.module_id || item.module?.id || ''),
          salle_id:  String(item.salle_id || item.salle?.id || ''),
        }));
      })
      .catch(() => {});
    setFormOpen(true);
    setDetail(null);
  };

  const handleSaveSession = async () => {
    if (!form.jour || !form.heure_debut || !form.heure_fin || !form.group_id || !form.module_id || !form.formateur_id || !form.salle_id) {
      toast.error('Tous les champs sont requis');
      return;
    }
    if (form.heure_debut >= form.heure_fin) {
      toast.error('L\'heure de fin doit être après l\'heure de début');
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        jour:         form.jour,
        heure_debut:  form.heure_debut,
        heure_fin:    form.heure_fin,
        group_id:     Number(form.group_id),
        module_id:    Number(form.module_id),
        formateur_id: Number(form.formateur_id),
        salle_id:     Number(form.salle_id),
      };
      if (editingId) {
        await emploiDuTempsApi.update(editingId, payload);
        toast.success('Séance mise à jour');
      } else {
        await emploiDuTempsApi.create(payload);
        toast.success('Séance ajoutée');
      }
      setFormOpen(false);
      fetchEntries();
    } catch (err: any) {
      const errors = err.response?.data?.errors;
      const firstErr = errors ? Object.values(errors).flat()[0] : null;
      toast.error((firstErr as string) || err.response?.data?.message || 'Erreur');
    }
    setSaving(false);
  };

  const askDeleteSession = (entry: ScheduleEntry) => {
    setEditingId(entry.id);
    setDetail(null);
    setDeleteOpen(true);
  };

  const handleDeleteSession = async () => {
    if (!editingId) return;
    try {
      await emploiDuTempsApi.delete(editingId);
      toast.success('Séance supprimée');
      setDeleteOpen(false);
      setEditingId(null);
      fetchEntries();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur');
    }
  };

  const formGroupOptions: SelectOption[] = groupes.map((g: any) => ({
    value: String(g.id),
    label: g.filiere?.nom ? `${g.nom} — ${g.filiere.nom}` : g.nom,
  }));
  const formModuleOptions: SelectOption[] = formModules.map((m: any) => ({ value: String(m.id), label: m.nom }));

  // Formateurs for this form:
  // 1) must be assigned to the selected module (via formateurs pivot)
  // 2) must be free at the selected day + time (no overlapping session)
  // Fallback to all formateurs when no module picked yet.
  const overlapsSlot = (eHd: string, eHf: string): boolean => {
    if (!form.heure_debut || !form.heure_fin) return false;
    return eHd < form.heure_fin && eHf > form.heure_debut;
  };

  const selectedModule = useMemo(
    () => formModules.find((m: any) => String(m.id) === form.module_id),
    [formModules, form.module_id]
  );

  const formFormateurOptions: SelectOption[] = useMemo(() => {
    // Candidates: those assigned to the module if we know it; otherwise all
    const moduleFormateurIds: Set<number> | null = selectedModule?.formateurs
      ? new Set(selectedModule.formateurs.map((f: any) => f.id))
      : null;

    const busyFormateurIds = new Set(
      entries
        .filter(e =>
          e.id !== editingId &&
          e.jour.toLowerCase() === form.jour.toLowerCase() &&
          overlapsSlot((e.heureDebut || '').slice(0, 5), (e.heureFin || '').slice(0, 5))
        )
        .map(e => e.formateurId)
    );

    return allFormateurs
      .filter((f: any) => !moduleFormateurIds || moduleFormateurIds.has(f.id))
      .filter((f: any) => !busyFormateurIds.has(f.id))
      .map((f: any) => ({
        value: String(f.id),
        label: `${f.user?.prenom || ''} ${f.user?.nom || ''}`.trim() || `#${f.id}`,
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allFormateurs, selectedModule, entries, editingId, form.jour, form.heure_debut, form.heure_fin]);

  const formSalleOptions: SelectOption[] = useMemo(() => {
    const busySalleIds = new Set(
      entries
        .filter(e =>
          e.id !== editingId &&
          e.jour.toLowerCase() === form.jour.toLowerCase() &&
          overlapsSlot((e.heureDebut || '').slice(0, 5), (e.heureFin || '').slice(0, 5))
        )
        .map(e => e.salleId)
        .filter((id): id is number => id !== null)
    );

    return allSalles
      .filter((s: any) => !busySalleIds.has(s.id))
      .map((s: any) => ({ value: String(s.id), label: s.nom }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSalles, entries, editingId, form.jour, form.heure_debut, form.heure_fin]);
  const JOUR_OPTIONS: SelectOption[] = [
    { value: 'lundi', label: 'Lundi' }, { value: 'mardi', label: 'Mardi' },
    { value: 'mercredi', label: 'Mercredi' }, { value: 'jeudi', label: 'Jeudi' },
    { value: 'vendredi', label: 'Vendredi' }, { value: 'samedi', label: 'Samedi' },
  ];

  return (
    <div>
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
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={filteredEntries.length === 0}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-sm font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Ouvre la boîte d'impression — enregistrez en PDF"
          >
            <HiPrinter className="h-4 w-4" /> Export PDF
          </button>
          {canWrite && (
            <button
              onClick={openCreateSession}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <HiPlus className="h-4 w-4" /> Ajouter séance
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
        <div className="flex items-center gap-3 px-6 py-4 flex-wrap">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mr-1">Time Table</h2>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {loading ? '...' : `${totalSessions} séance${totalSessions > 1 ? 's' : ''}`}
            {activeFiltersCount > 0 && ' (filtré)'}
          </span>

          {formateur && (
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                formateurHours >= WEEKLY_CAP_HOURS
                  ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
                  : formateurHours >= 24
                    ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                    : 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 border-primary-200 dark:border-primary-800'
              }`}
              title="Masse horaire hebdomadaire de ce formateur (cap OFPPT : 30h)"
            >
              Masse horaire : {formateurHours}h / {WEEKLY_CAP_HOURS}h
              {formateurHours >= WEEKLY_CAP_HOURS && ' · plein'}
            </span>
          )}

          <div className="flex-1" />

          <select
            value={formateur}
            onChange={(e) => { setFormateur(e.target.value); setFiliere(''); setGroupe(''); }}
            className="text-sm border border-primary-200 dark:border-primary-800 text-primary-600 dark:text-primary-400 rounded-full px-4 py-1.5 bg-white dark:bg-gray-800 appearance-none cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors pr-8"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234F46E5' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
          >
            <option value="">Tous les formateurs</option>
            {formateursList.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
          </select>

          <select
            value={filiere}
            onChange={(e) => { setFiliere(e.target.value); setGroupe(''); }}
            className="text-sm border border-primary-200 dark:border-primary-800 text-primary-600 dark:text-primary-400 rounded-full px-4 py-1.5 bg-white dark:bg-gray-800 appearance-none cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors pr-8"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234F46E5' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
          >
            <option value="">Toutes les filières</option>
            {filteredFilieres.map((f: any) => <option key={f.id} value={f.id}>{f.nom}</option>)}
          </select>

          <select
            value={groupe}
            onChange={(e) => setGroupe(e.target.value)}
            className="text-sm border border-primary-200 dark:border-primary-800 text-primary-600 dark:text-primary-400 rounded-full px-4 py-1.5 bg-white dark:bg-gray-800 appearance-none cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors pr-8"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234F46E5' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
          >
            <option value="">Tous les groupes</option>
            {filteredGroupes.map((g: any) => <option key={g.id} value={g.id}>{g.nom}</option>)}
          </select>

          <select
            value={semaine}
            onChange={(e) => setSemaine(e.target.value)}
            className="text-sm border border-primary-200 dark:border-primary-800 text-primary-600 dark:text-primary-400 rounded-full px-4 py-1.5 bg-white dark:bg-gray-800 appearance-none cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors pr-8"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234F46E5' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
          >
            {WEEKS.map(w => <option key={w.id} value={w.id}>Semaine : {w.label}</option>)}
          </select>

          {activeFiltersCount > 0 && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 px-2 py-1"
              title="Effacer les filtres"
            >
              <HiX className="h-3.5 w-3.5" /> Effacer
            </button>
          )}
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
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400 w-24 border-b border-gray-100 dark:border-gray-700">Horaire</th>
                  {days.map(day => (
                    <th key={day} className="px-3 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((slot, slotIdx) => (
                  <tr key={slotIdx} className="border-b border-gray-50 dark:border-gray-700">
                    <td className="px-4 py-3 align-top w-24">
                      <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{slot.start}</div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{slot.end}</div>
                    </td>
                    {days.map(day => {
                      const isSaturdayAfterNoon = day === 'Samedi' && slotIdx >= 2;
                      const cellEntries = isSaturdayAfterNoon ? [] : getSlotEntries(day, slotIdx);
                      const max = 3;
                      return (
                        <td
                          key={day}
                          className={`px-2 py-2 align-top border-l border-gray-50 dark:border-gray-700 ${isSaturdayAfterNoon ? 'bg-gray-50 dark:bg-gray-800/30' : ''}`}
                          style={{ minWidth: 160, height: 150 }}
                          onDoubleClick={() => {
                            if (cellEntries.length > 0) {
                              setCellDetail({ day, slotIdx, entries: cellEntries });
                            }
                          }}
                        >
                          {isSaturdayAfterNoon && (
                            <div className="h-full flex items-center justify-center">
                              <span className="text-[10px] text-gray-400 dark:text-gray-600 italic">Fermé</span>
                            </div>
                          )}
                          {!isSaturdayAfterNoon && cellEntries.length > 0 && (
                            <div className="space-y-1.5 h-full">
                              {cellEntries.slice(0, max).map(entry => {
                                const colors = getColor(entry.module);
                                return (
                                  <div
                                    key={entry.id}
                                    onDoubleClick={(e) => { e.stopPropagation(); setDetail(entry); }}
                                    className="relative pl-3 py-1.5 pr-1 rounded hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer"
                                    title="Double-cliquer pour voir les détails"
                                  >
                                    <div className={`absolute left-0 top-1 bottom-1 w-[3px] rounded-full ${colors.border}`} />
                                    <div className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                                      {entry.module || '—'}
                                    </div>
                                    {(entry.heureDebut || entry.heureFin) && (
                                      <div className="text-[10px] text-primary-600 dark:text-primary-400 font-medium mt-0.5">
                                        {entry.heureDebut} → {entry.heureFin}
                                      </div>
                                    )}
                                    <div className="flex items-center gap-1 mt-0.5">
                                      <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{entry.groupe}</span>
                                      {entry.type === 'a_distance' ? (
                                        <span className="text-[10px] text-yellow-700 dark:text-yellow-400">· à distance</span>
                                      ) : entry.salle ? (
                                        <span className="text-[10px] text-gray-400 dark:text-gray-500">· {entry.salle}</span>
                                      ) : null}
                                    </div>
                                    <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{entry.formateur}</div>
                                  </div>
                                );
                              })}
                              {cellEntries.length > max && (
                                <button
                                  onClick={() => setCellDetail({ day, slotIdx, entries: cellEntries })}
                                  className="w-full text-[10px] text-primary-600 dark:text-primary-400 hover:underline font-medium text-center py-0.5"
                                >
                                  +{cellEntries.length - max} autres
                                </button>
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
      </div>

      {/* Single session detail modal */}
      <Modal
        isOpen={!!detail}
        onClose={() => setDetail(null)}
        title="Détails de la séance"
        size="md"
        footer={canWrite && detail ? (
          <>
            <Button variant="secondary" onClick={() => askDeleteSession(detail)} className="!bg-red-50 !text-red-600 hover:!bg-red-100 dark:!bg-red-900/20 dark:!text-red-400">
              <HiTrash className="h-4 w-4" /> Supprimer
            </Button>
            <Button onClick={() => openEditSession(detail)}>
              <HiPencil className="h-4 w-4" /> Modifier
            </Button>
          </>
        ) : undefined}
      >
        {detail && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className={`w-1 self-stretch rounded-full ${getColor(detail.module).border}`} />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{detail.module}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                  {detail.jour} · {detail.heureDebut || '—'} → {detail.heureFin || '—'}
                </p>
              </div>
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium text-white h-fit ${
                detail.type === 'a_distance' ? 'bg-yellow-700' : getColor(detail.module).badge
              }`}>
                {detail.type === 'a_distance' ? 'À distance' : 'Présentiel'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
              <div>
                <p className="text-xs uppercase text-gray-400 dark:text-gray-500 font-medium">Formateur</p>
                <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">{detail.formateur || '—'}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-400 dark:text-gray-500 font-medium">Groupe</p>
                <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">{detail.groupe || '—'}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-400 dark:text-gray-500 font-medium">Salle</p>
                <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                  {detail.type === 'a_distance' ? (
                    <span className="text-yellow-700 dark:text-yellow-400 italic">N/A (à distance)</span>
                  ) : (detail.salle || '—')}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-400 dark:text-gray-500 font-medium">Module</p>
                <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">{detail.module || '—'}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Multi-session cell detail modal */}
      <Modal
        isOpen={!!cellDetail}
        onClose={() => setCellDetail(null)}
        title={cellDetail ? `${cellDetail.day} · ${timeSlots[cellDetail.slotIdx].start} - ${timeSlots[cellDetail.slotIdx].end}` : ''}
        size="lg"
      >
        {cellDetail && (
          <div className="space-y-2">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              {cellDetail.entries.length} séance{cellDetail.entries.length > 1 ? 's' : ''} en parallèle
            </p>
            {cellDetail.entries.map(entry => {
              const colors = getColor(entry.module);
              return (
                <button
                  key={entry.id}
                  onClick={() => { setDetail(entry); setCellDetail(null); }}
                  className="w-full text-left flex items-center gap-3 p-3 border border-gray-100 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className={`w-1 self-stretch rounded-full ${colors.border}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{entry.module}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {entry.formateur} · {entry.groupe} · {entry.type === 'a_distance' ? 'à distance' : (entry.salle || 'Salle non assignée')}
                    </p>
                  </div>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium text-white flex-shrink-0 ${
                    entry.type === 'a_distance' ? 'bg-yellow-700' : colors.badge
                  }`}>
                    {entry.type === 'a_distance' ? 'À distance' : 'Présentiel'}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </Modal>

      {/* Create / Edit session modal */}
      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingId ? 'Modifier la séance' : 'Ajouter une séance'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>Annuler</Button>
            <Button onClick={handleSaveSession} loading={saving}>Enregistrer</Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <Select
              label="Jour"
              value={form.jour}
              onChange={e => setForm(p => ({ ...p, jour: e.target.value }))}
              options={JOUR_OPTIONS}
              required
            />
            <Input label="Heure début" type="time" value={form.heure_debut} onChange={e => setForm(p => ({ ...p, heure_debut: e.target.value }))} required />
            <Input label="Heure fin" type="time" value={form.heure_fin} onChange={e => setForm(p => ({ ...p, heure_fin: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Groupe"
              value={form.group_id}
              onChange={e => setForm(p => ({ ...p, group_id: e.target.value, module_id: '' }))}
              options={[{ value: '', label: 'Choisir un groupe' }, ...formGroupOptions]}
              required
            />
            <Select
              label="Module"
              value={form.module_id}
              onChange={e => setForm(p => ({ ...p, module_id: e.target.value }))}
              options={[{ value: '', label: form.group_id ? 'Choisir un module' : 'Choisir un groupe d\'abord' }, ...formModuleOptions]}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Select
                label="Formateur"
                value={form.formateur_id}
                onChange={e => setForm(p => ({ ...p, formateur_id: e.target.value }))}
                options={[{ value: '', label: 'Choisir un formateur' }, ...formFormateurOptions]}
                required
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {form.module_id
                  ? (formFormateurOptions.length === 0
                      ? <span className="text-red-600 dark:text-red-400">Aucun formateur disponible (vérifiez le créneau ou les affectations du module)</span>
                      : `${formFormateurOptions.length} formateur(s) disponible(s) pour ce module à ce créneau`)
                  : 'Choisissez un module pour filtrer les formateurs'}
              </p>
            </div>
            <div>
              <Select
                label="Salle"
                value={form.salle_id}
                onChange={e => setForm(p => ({ ...p, salle_id: e.target.value }))}
                options={[{ value: '', label: 'Choisir une salle' }, ...formSalleOptions]}
                required
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {formSalleOptions.length === 0
                  ? <span className="text-red-600 dark:text-red-400">Aucune salle libre à ce créneau — changez l'horaire</span>
                  : `${formSalleOptions.length} salle(s) libre(s) à ce créneau`}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-lg px-3 py-2">
            Les conflits (même formateur, même salle ou même groupe au même créneau) sont détectés automatiquement côté serveur.
          </p>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDeleteSession}
        title="Supprimer la séance"
        message="Supprimer cette séance de l'emploi du temps ? Cette action est irréversible."
      />
    </div>
  );
};

export default EmploiDuTempsPage;
