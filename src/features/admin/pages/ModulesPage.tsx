import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { modulesApi, dropdownApi } from '../../../api/crudApi';
import { Module, TableColumn, SelectOption } from '../../../types';
import { DataTable, Modal, Button, Input, Select, ConfirmDialog } from '../../../components/ui';
import { HiSortAscending, HiPlus, HiPencil, HiTrash, HiDotsHorizontal, HiX, HiUpload } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useDebounce } from '../../../hooks/useDebounce';
import { useRolePath } from '../../../hooks/useRolePath';
import { useCan } from '../../../hooks/useCan';

const SEMESTRE_OPTIONS: SelectOption[] = [
  { value: '1', label: 'Semestre 1' },
  { value: '2', label: 'Semestre 2' },
  { value: '3', label: 'Semestre 3' },
  { value: '4', label: 'Semestre 4' },
  { value: '5', label: 'Semestre 5' },
  { value: '6', label: 'Semestre 6' },
];

interface FiliereOption {
  id: number;
  code: string;
  nom: string;
}

interface FormateurOption {
  id: number;
  nom: string;
  prenom: string;
  specialisation?: string;
}

interface ModuleFormState {
  code: string;
  nom: string;
  description: string;
  filiere_id: string;
  heures_total: number | string;
  coefficient: number | string;
  semestre: string;
  formateur_ids: number[];
}

const emptyForm: ModuleFormState = {
  code: '',
  nom: '',
  description: '',
  filiere_id: '',
  heures_total: 60,
  coefficient: 1,
  semestre: '1',
  formateur_ids: [],
};

interface ModuleCsvRow {
  code?: string;
  nom: string;
  heures_total: number;
  coefficient?: number;
  semestre?: number;
  description?: string;
}

const parseModulesCsv = (text: string): ModuleCsvRow[] => {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  // Detect header
  const first = lines[0].toLowerCase();
  const hasHeader = /nom|name|module|code/.test(first) && /heure|hour|h_total|masse/.test(first);
  const rows: ModuleCsvRow[] = [];
  const start = hasHeader ? 1 : 0;

  // Build column map from header if present, else assume: nom, heures, [coef], [semestre], [code], [description]
  let headerMap: Record<string, number> = {};
  if (hasHeader) {
    const cols = lines[0].split(/[,;\t]/).map(c => c.trim().toLowerCase());
    cols.forEach((c, i) => {
      if (/^code$/.test(c)) headerMap.code = i;
      else if (/^nom|^name|^module/.test(c)) headerMap.nom = i;
      else if (/heure|hour|masse|h_total/.test(c)) headerMap.heures = i;
      else if (/coef/.test(c)) headerMap.coefficient = i;
      else if (/sem/.test(c)) headerMap.semestre = i;
      else if (/desc/.test(c)) headerMap.description = i;
    });
  }

  for (let idx = start; idx < lines.length; idx++) {
    const parts = lines[idx].split(/[,;\t]/).map(s => s.trim());
    let nom = '', heuresRaw = '', coefRaw = '', semRaw = '', codeVal = '', descVal = '';
    if (hasHeader) {
      nom = parts[headerMap.nom] || '';
      heuresRaw = parts[headerMap.heures] || '';
      coefRaw = headerMap.coefficient !== undefined ? parts[headerMap.coefficient] || '' : '';
      semRaw = headerMap.semestre !== undefined ? parts[headerMap.semestre] || '' : '';
      codeVal = headerMap.code !== undefined ? parts[headerMap.code] || '' : '';
      descVal = headerMap.description !== undefined ? parts[headerMap.description] || '' : '';
    } else {
      [nom, heuresRaw, coefRaw, semRaw, codeVal, descVal] = [
        parts[0] || '', parts[1] || '', parts[2] || '', parts[3] || '', parts[4] || '', parts[5] || '',
      ];
    }
    if (!nom) continue;
    const heures = parseInt(String(heuresRaw).replace(/[^\d]/g, ''), 10);
    if (isNaN(heures)) continue;
    const row: ModuleCsvRow = { nom, heures_total: heures };
    if (coefRaw) {
      const c = parseFloat(coefRaw.replace(',', '.'));
      if (!isNaN(c)) row.coefficient = c;
    }
    if (semRaw) {
      const s = parseInt(semRaw, 10);
      if (!isNaN(s) && s >= 1 && s <= 6) row.semestre = s;
    }
    if (codeVal) row.code = codeVal;
    if (descVal) row.description = descVal;
    rows.push(row);
  }
  return rows;
};

const ModulesPage: React.FC = () => {
  const basePath = useRolePath();
  const can = useCan();
  const canWrite = can('write', 'modules');
  const [searchParams, setSearchParams] = useSearchParams();
  const filiereIdParam = searchParams.get('filiere_id');
  const filiereNomParam = searchParams.get('filiere_nom');
  const [data, setData] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Module | null>(null);
  const [form, setForm] = useState<ModuleFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filiereOptions, setFiliereOptions] = useState<FiliereOption[]>([]);
  const [formateurOptions, setFormateurOptions] = useState<FormateurOption[]>([]);
  const [formateurSearch, setFormateurSearch] = useState('');
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvFiliereId, setCsvFiliereId] = useState('');
  const [csvRows, setCsvRows] = useState<ModuleCsvRow[]>([]);
  const [csvFileName, setCsvFileName] = useState('');
  const [csvImporting, setCsvImporting] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const debouncedSearch = useDebounce(search);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, search: debouncedSearch, per_page: perPage, sort_by: 'nom', sort_dir: sortDir };
      if (filiereIdParam) params.filiere_id = filiereIdParam;
      const res = await modulesApi.getAll(params);
      setData(res.data.data);
      setTotalPages(res.data.meta.last_page);
      setTotalItems(res.data.meta.total);
    } catch { toast.error('Erreur de chargement'); }
    setLoading(false);
  }, [page, debouncedSearch, perPage, sortDir, filiereIdParam]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => { setPage(1); }, [filiereIdParam]);

  useEffect(() => {
    const handler = () => setOpenMenuId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  useEffect(() => {
    if (!canWrite) return;
    dropdownApi.filieres()
      .then(res => {
        const list: any[] = res.data?.data || [];
        setFiliereOptions(list.map(f => ({ id: f.id, code: f.code, nom: f.nom })));
      })
      .catch(() => {});
  }, [canWrite, formOpen, csvOpen]);

  useEffect(() => {
    if (!canWrite || !formOpen) return;
    dropdownApi.formateurs()
      .then(res => {
        const list: any[] = res.data?.data || [];
        setFormateurOptions(list.map(f => ({
          id: f.id,
          nom: f.user?.nom || '',
          prenom: f.user?.prenom || '',
          specialisation: f.specialisation,
        })));
      })
      .catch(() => {});
  }, [canWrite, formOpen]);

  const handlePerPageChange = (newPerPage: number) => {
    setPerPage(newPerPage);
    setPage(1);
  };

  const toggleSort = () => { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); setPage(1); };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormateurSearch('');
    setFormOpen(true);
  };

  const openEdit = (m: Module) => {
    setEditing(m);
    const existingFormateurIds: number[] = Array.isArray((m as any).formateurs)
      ? (m as any).formateurs.map((f: any) => f.id).filter(Boolean)
      : [];
    setForm({
      code: m.code || '',
      nom: m.nom || '',
      description: (m as any).description || '',
      filiere_id: String(m.filiere_id ?? (m as any).filiere?.id ?? ''),
      heures_total: (m as any).heures_total ?? 60,
      coefficient: (m as any).coefficient ?? 1,
      semestre: String((m as any).semestre ?? 1),
      formateur_ids: existingFormateurIds,
    });
    setFormateurSearch('');
    setFormOpen(true);
    setOpenMenuId(null);
  };

  const toggleFormateur = (id: number) => {
    setForm(p => ({
      ...p,
      formateur_ids: p.formateur_ids.includes(id)
        ? p.formateur_ids.filter(x => x !== id)
        : [...p.formateur_ids, id],
    }));
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.nom.trim() || !form.filiere_id) {
      toast.error('Code, nom et filière sont requis');
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        code: form.code.trim(),
        nom: form.nom.trim(),
        description: form.description.trim() || null,
        filiere_id: Number(form.filiere_id),
        heures_total: Number(form.heures_total),
        coefficient: Number(form.coefficient),
        semestre: Number(form.semestre),
        formateur_ids: form.formateur_ids,
      };
      if (editing) {
        await modulesApi.update(editing.id, payload);
        toast.success('Module mis à jour');
      } else {
        await modulesApi.create(payload);
        toast.success('Module créé');
      }
      setFormOpen(false);
      fetchData();
    } catch (err: any) {
      const errors = err.response?.data?.errors;
      const firstErr = errors ? Object.values(errors).flat()[0] : null;
      toast.error((firstErr as string) || err.response?.data?.message || 'Erreur');
    }
    setSaving(false);
  };

  const askDelete = (m: Module) => {
    setEditing(m);
    setDeleteOpen(true);
    setOpenMenuId(null);
  };

  const handleDelete = async () => {
    if (!editing) return;
    try {
      await modulesApi.delete(editing.id);
      toast.success('Module supprimé');
      setDeleteOpen(false);
      setEditing(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur');
    }
  };

  const openCsv = () => {
    setCsvFiliereId('');
    setCsvRows([]);
    setCsvFileName('');
    setCsvOpen(true);
  };

  const handleCsvFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = parseModulesCsv(text);
      if (parsed.length === 0) {
        toast.error('Aucun module valide trouvé dans le CSV');
        return;
      }
      setCsvRows(parsed);
      setCsvFileName(file.name);
      toast.success(`${parsed.length} ligne(s) détectée(s)`);
    } catch {
      toast.error('Impossible de lire le fichier');
    }
    if (csvInputRef.current) csvInputRef.current.value = '';
  };

  const handleCsvImport = async () => {
    if (!csvFiliereId) {
      toast.error('Choisissez une filière');
      return;
    }
    if (csvRows.length === 0) {
      toast.error('Aucune ligne à importer');
      return;
    }
    setCsvImporting(true);
    try {
      const res = await modulesApi.bulkImport(Number(csvFiliereId), csvRows);
      const payload = res.data?.data || {};
      const skipped: Array<{ nom: string; reason: string }> = payload.skipped || [];
      toast.success(res.data?.message || 'Import terminé');
      if (skipped.length > 0) {
        const preview = skipped.slice(0, 3).map(s => `• ${s.nom} (${s.reason})`).join('\n');
        const more = skipped.length > 3 ? `\n+${skipped.length - 3} autres...` : '';
        toast(`Ignorés:\n${preview}${more}`, { icon: 'ℹ️', duration: 6000 });
      }
      setCsvOpen(false);
      fetchData();
    } catch (err: any) {
      const errors = err.response?.data?.errors;
      const firstErr = errors ? Object.values(errors).flat()[0] : null;
      toast.error((firstErr as string) || err.response?.data?.message || 'Erreur');
    }
    setCsvImporting(false);
  };

  const filiereSelectOptions: SelectOption[] = filiereOptions.map(f => ({
    value: String(f.id),
    label: `${f.code} — ${f.nom}`,
  }));

  const columns: TableColumn<Module>[] = [
    { key: 'code', label: 'Code', sortable: true, render: (item) => <span className="text-primary-600 dark:text-primary-400 font-medium">{item.code}</span> },
    { key: 'nom', label: 'Nom de module', sortable: true },
    { key: 'filiere', label: 'Filière', sortable: true, render: (item) => item.filiere?.nom || '-' },
    { key: 'heures_total', label: 'Masse Horaire', sortable: true, render: (item) => <span>{(item as any).heures_total}h</span> },
    { key: 'coefficient', label: 'Coef.', sortable: true, render: (item) => <span>{(item as any).coefficient}</span> },
    { key: 'semestre', label: 'Semestre', sortable: true, render: (item) => <span>S{(item as any).semestre}</span> },
    {
      key: 'formateur',
      label: 'Formateur',
      render: (item) => {
        const f = (item as any).formateurs?.[0] || (item as any).formateur;
        if (f) {
          const user = f.user || f;
          return <span>{user.prenom || ''} {user.nom || ''}</span>;
        }
        return <span className="text-gray-400 dark:text-gray-500">Non assigné</span>;
      },
    },
    ...(canWrite ? [{
      key: 'actions',
      label: 'Action',
      render: (item: Module) => (
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === item.id ? null : item.id); }}
            className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <HiDotsHorizontal className="h-5 w-5" />
          </button>
          {openMenuId === item.id && (
            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-10 min-w-[140px]">
              <button onClick={(e) => { e.stopPropagation(); openEdit(item); }} className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-2">
                <HiPencil className="h-4 w-4" /> Modifier
              </button>
              <button onClick={(e) => { e.stopPropagation(); askDelete(item); }} className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2">
                <HiTrash className="h-4 w-4" /> Supprimer
              </button>
            </div>
          )}
        </div>
      ),
    }] : []),
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Modules</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            <Link to={`${basePath}/dashboard`} className="text-primary-600 dark:text-primary-400 hover:text-primary-700">Tableau de bord</Link>
            {' / '}
            <span className="text-primary-600 dark:text-primary-400">Académique</span>
            {' / '}
            <span>Modules</span>
          </p>
        </div>
        {canWrite && (
          <div className="flex items-center gap-2">
            <button
              onClick={openCsv}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-sm font-medium rounded-lg transition-colors"
            >
              <HiUpload className="h-4 w-4" /> Import CSV
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <HiPlus className="h-4 w-4" /> Ajouter Module
            </button>
          </div>
        )}
      </div>

      {filiereIdParam && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Filtré par filière :</span>
          <span className="inline-flex items-center gap-2 px-3 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 text-sm font-medium rounded-full border border-primary-100 dark:border-primary-800">
            {filiereNomParam || `#${filiereIdParam}`}
            <button
              onClick={() => { setSearchParams({}); setPage(1); }}
              className="hover:bg-primary-100 dark:hover:bg-primary-900/40 rounded-full p-0.5"
              title="Retirer le filtre"
            >
              <HiX className="h-3.5 w-3.5" />
            </button>
          </span>
        </div>
      )}

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        currentPage={page}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={perPage}
        onPageChange={setPage}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        perPage={perPage}
        onPerPageChange={handlePerPageChange}
        headerContent={
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Les modules</h3>
        }
        toolbarExtra={
          <button onClick={toggleSort}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50">
            <HiSortAscending className="h-4 w-4" /> Sort By {sortDir === 'asc' ? 'A-Z' : 'Z-A'}
          </button>
        }
        searchValue={search}
        onSearchChange={(val) => { setSearch(val); setPage(1); }}
        searchPlaceholder="Search"
      />

      {/* Create / Edit Modal */}
      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Modifier le module' : 'Ajouter un module'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} loading={saving}>Enregistrer</Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Code" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} required placeholder="DD-M01, GE-M03..." />
            <Select
              label="Filière"
              value={form.filiere_id}
              onChange={e => setForm(p => ({ ...p, filiere_id: e.target.value }))}
              options={[{ value: '', label: 'Choisir une filière' }, ...filiereSelectOptions]}
              required
            />
          </div>
          <Input label="Nom de module" value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} required placeholder="Bases de données..." />
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Masse horaire</label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  value={form.heures_total}
                  onChange={e => setForm(p => ({ ...p, heures_total: e.target.value === '' ? '' : Number(e.target.value) }))}
                  className="w-full pl-3 pr-8 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-gray-100"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500 pointer-events-none">H</span>
              </div>
            </div>
            <Input
              label="Coefficient"
              type="number"
              step="0.1"
              min={0}
              value={form.coefficient}
              onChange={e => setForm(p => ({ ...p, coefficient: e.target.value === '' ? '' : Number(e.target.value) }))}
            />
            <Select
              label="Semestre"
              value={form.semestre}
              onChange={e => setForm(p => ({ ...p, semestre: e.target.value }))}
              options={SEMESTRE_OPTIONS}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={3}
              placeholder="Description du module (optionnel)"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-gray-100 placeholder-gray-400"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Formateurs responsables ({form.formateur_ids.length})
              </label>
              {form.formateur_ids.length > 0 && (
                <button
                  type="button"
                  onClick={() => setForm(p => ({ ...p, formateur_ids: [] }))}
                  className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 flex items-center gap-1"
                >
                  <HiX className="h-3.5 w-3.5" /> Tout désélectionner
                </button>
              )}
            </div>
            <input
              type="text"
              value={formateurSearch}
              onChange={e => setFormateurSearch(e.target.value)}
              placeholder="Rechercher un formateur..."
              className="w-full px-3 py-2 mb-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-gray-100 placeholder-gray-400"
            />
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-48 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
              {formateurOptions.length === 0 ? (
                <p className="px-3 py-4 text-sm text-gray-400 dark:text-gray-500 text-center">Aucun formateur disponible</p>
              ) : (
                formateurOptions
                  .filter(f => {
                    const q = formateurSearch.trim().toLowerCase();
                    if (!q) return true;
                    return (`${f.prenom} ${f.nom}`.toLowerCase().includes(q)) ||
                      (f.specialisation?.toLowerCase().includes(q) ?? false);
                  })
                  .map(f => {
                    const checked = form.formateur_ids.includes(f.id);
                    return (
                      <label
                        key={f.id}
                        className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleFormateur(f.id)}
                          className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                            {f.prenom} {f.nom}
                          </p>
                          {f.specialisation && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{f.specialisation}</p>
                          )}
                        </div>
                      </label>
                    );
                  })
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
              Un module peut être enseigné par plusieurs formateurs.
            </p>
          </div>
        </div>
      </Modal>

      {/* CSV Import Modal */}
      <Modal
        isOpen={csvOpen}
        onClose={() => setCsvOpen(false)}
        title="Importer des modules (CSV)"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCsvOpen(false)}>Annuler</Button>
            <Button onClick={handleCsvImport} loading={csvImporting} disabled={!csvFiliereId || csvRows.length === 0}>
              Importer {csvRows.length > 0 ? `(${csvRows.length})` : ''}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Filière"
            value={csvFiliereId}
            onChange={e => setCsvFiliereId(e.target.value)}
            options={[{ value: '', label: 'Choisir une filière' }, ...filiereSelectOptions]}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Fichier CSV</label>
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleCsvFile(f); }}
            />
            <button
              type="button"
              onClick={() => csvInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-sm font-medium rounded-lg transition-colors"
            >
              <HiUpload className="h-4 w-4" /> {csvFileName || 'Choisir un fichier'}
            </button>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Colonnes acceptées: <code className="text-gray-600 dark:text-gray-300">nom, heures_total, coefficient, semestre, code, description</code>
              <br />
              Exemple: <code className="text-gray-600 dark:text-gray-300">Bases de données,60,2,1</code>
            </p>
          </div>

          {csvRows.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Aperçu ({csvRows.length} ligne{csvRows.length > 1 ? 's' : ''})</label>
                <button
                  type="button"
                  onClick={() => { setCsvRows([]); setCsvFileName(''); }}
                  className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 flex items-center gap-1"
                >
                  <HiX className="h-3.5 w-3.5" /> Vider
                </button>
              </div>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-500 dark:text-gray-400 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Nom</th>
                      <th className="px-3 py-2 text-left font-medium">Heures</th>
                      <th className="px-3 py-2 text-left font-medium">Coef</th>
                      <th className="px-3 py-2 text-left font-medium">Sem</th>
                      <th className="px-3 py-2 text-left font-medium">Code</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {csvRows.map((r, i) => (
                      <tr key={i} className="text-gray-700 dark:text-gray-300">
                        <td className="px-3 py-2">{r.nom}</td>
                        <td className="px-3 py-2">{r.heures_total}h</td>
                        <td className="px-3 py-2">{r.coefficient ?? 1}</td>
                        <td className="px-3 py-2">S{r.semestre ?? 1}</td>
                        <td className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500">{r.code || 'auto'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Supprimer le module"
        message={`Supprimer le module "${editing?.nom}" ? Cette action est irréversible.`}
      />
    </div>
  );
};

export default ModulesPage;
