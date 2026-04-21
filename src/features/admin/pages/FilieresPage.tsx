import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { filieresApi, dropdownApi } from '../../../api/crudApi';
import { Filiere, TableColumn, SelectOption } from '../../../types';
import { DataTable, Modal, Button, Input, Select, ConfirmDialog } from '../../../components/ui';
import { HiSortAscending, HiPlus, HiPencil, HiTrash, HiDotsHorizontal, HiX, HiUpload } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useDebounce } from '../../../hooks/useDebounce';
import { useRolePath } from '../../../hooks/useRolePath';
import { useCan } from '../../../hooks/useCan';

const NIVEAU_OPTIONS: SelectOption[] = [
  { value: 'Technicien Spécialisé', label: 'Technicien Spécialisé' },
  { value: 'Technicien', label: 'Technicien' },
  { value: 'Qualification', label: 'Qualification' },
  { value: 'Spécialisation', label: 'Spécialisation' },
];

interface ModuleDraft {
  nom: string;
  heures_total: number | string;
}

const emptyForm = {
  code: '',
  nom: '',
  niveau: 'Technicien Spécialisé',
  secteur: '',
  modules: [] as ModuleDraft[],
};

const parseModulesCsv = (text: string): ModuleDraft[] => {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const out: ModuleDraft[] = [];
  for (const line of lines) {
    const parts = line.split(/[,;\t]/).map(s => s.trim());
    if (parts.length < 2) continue;
    const [nom, heuresRaw] = parts;
    if (/^nom/i.test(nom) || /^name/i.test(nom)) continue; // skip header row
    const heures = parseInt(String(heuresRaw).replace(/[^\d]/g, ''), 10);
    if (!nom || isNaN(heures)) continue;
    out.push({ nom, heures_total: heures });
  }
  return out;
};

const FilieresPage: React.FC = () => {
  const basePath = useRolePath();
  const can = useCan();
  const canWrite = can('write', 'filieres');
  const [data, setData] = useState<Filiere[]>([]);
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
  const [editing, setEditing] = useState<Filiere | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [secteurSuggestions, setSecteurSuggestions] = useState<string[]>([]);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const debouncedSearch = useDebounce(search);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await filieresApi.getAll({ page, search: debouncedSearch, per_page: perPage, sort_by: 'nom', sort_dir: sortDir });
      setData(res.data.data);
      setTotalPages(res.data.meta.last_page);
      setTotalItems(res.data.meta.total);
    } catch {
      toast.error('Erreur de chargement');
    }
    setLoading(false);
  }, [page, debouncedSearch, perPage, sortDir]);

  useEffect(() => { fetchData(); }, [fetchData]);

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
        const unique = Array.from(new Set(list.map(f => f.secteur).filter(Boolean))) as string[];
        setSecteurSuggestions(unique.sort());
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
    setForm({ ...emptyForm, modules: [] });
    setFormOpen(true);
  };

  const openEdit = (f: Filiere) => {
    setEditing(f);
    setForm({
      code: f.code || '',
      nom: f.nom || '',
      niveau: (f as any).niveau || 'Technicien Spécialisé',
      secteur: (f as any).secteur || '',
      modules: [],
    });
    setFormOpen(true);
    setOpenMenuId(null);
  };

  const addModuleRow = () => {
    setForm(p => ({ ...p, modules: [...p.modules, { nom: '', heures_total: 60 }] }));
  };

  const updateModuleRow = (i: number, patch: Partial<ModuleDraft>) => {
    setForm(p => ({
      ...p,
      modules: p.modules.map((m, idx) => idx === i ? { ...m, ...patch } : m),
    }));
  };

  const removeModuleRow = (i: number) => {
    setForm(p => ({ ...p, modules: p.modules.filter((_, idx) => idx !== i) }));
  };

  const handleCsvImport = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = parseModulesCsv(text);
      if (parsed.length === 0) {
        toast.error('Aucun module valide trouvé dans le CSV');
        return;
      }
      setForm(p => ({ ...p, modules: [...p.modules, ...parsed] }));
      toast.success(`${parsed.length} module(s) importé(s)`);
    } catch {
      toast.error('Impossible de lire le fichier');
    }
    if (csvInputRef.current) csvInputRef.current.value = '';
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const base: any = {
        code: form.code,
        nom: form.nom,
        niveau: form.niveau,
        secteur: form.secteur.trim() || null,
      };
      if (!editing) base.duree_mois = 24;
      if (editing) {
        await filieresApi.update(editing.id, base);
        toast.success('Filière mise à jour');
      } else {
        const modules = form.modules
          .filter(m => m.nom.trim() && Number(m.heures_total) > 0)
          .map(m => ({ nom: m.nom.trim(), heures_total: Number(m.heures_total) }));
        await filieresApi.create({ ...base, modules } as any);
        toast.success(
          modules.length > 0
            ? `Filière créée avec ${modules.length} module(s)`
            : 'Filière créée'
        );
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

  const askDelete = (f: Filiere) => {
    setEditing(f);
    setDeleteOpen(true);
    setOpenMenuId(null);
  };

  const handleDelete = async () => {
    if (!editing) return;
    try {
      await filieresApi.delete(editing.id);
      toast.success('Filière supprimée');
      setDeleteOpen(false);
      setEditing(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur');
    }
  };

  const columns: TableColumn<Filiere>[] = [
    {
      key: 'code',
      label: 'Code',
      sortable: true,
      render: (item) => (
        <span className="text-primary-600 dark:text-primary-400 font-medium">{item.code}</span>
      ),
    },
    {
      key: 'nom',
      label: 'Nom de filière',
      sortable: true,
      render: (item) => (
        <Link
          to={`${basePath}/modules?filiere_id=${item.id}&filiere_nom=${encodeURIComponent(item.nom)}`}
          className="text-gray-900 dark:text-gray-100 hover:text-primary-600 dark:hover:text-primary-400 hover:underline font-medium"
        >
          {item.nom}
        </Link>
      ),
    },
    {
      key: 'niveau',
      label: 'Niveau',
      sortable: true,
      render: (item) => (item as any).niveau || '-',
    },
    {
      key: 'modules_count',
      label: 'Modules',
      sortable: true,
      render: (item) => <span>{item.modules_count ?? 0}</span>,
    },
    {
      key: 'secteur',
      label: 'Secteur',
      sortable: true,
      render: (item) => (item as any).secteur || '-',
    },
    ...(canWrite ? [{
      key: 'actions',
      label: 'Action',
      render: (item: Filiere) => (
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
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Filières</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            <Link to={`${basePath}/dashboard`} className="text-primary-600 dark:text-primary-400 hover:text-primary-700">Tableau de bord</Link>
            {' / '}
            <span className="text-primary-600 dark:text-primary-400">Académique</span>
            {' / '}
            <span>Filières</span>
          </p>
        </div>
        {canWrite && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <HiPlus className="h-4 w-4" />
            Ajouter Filière
          </button>
        )}
      </div>

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
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Tous les Filières</h3>
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
        title={editing ? 'Modifier la filière' : 'Ajouter une filière'}
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
            <Input label="Code" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} required placeholder="DD, GE, IDOSR..." />
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Secteur</label>
              <input
                list="secteur-options"
                value={form.secteur}
                onChange={e => setForm(p => ({ ...p, secteur: e.target.value }))}
                placeholder="Choisir ou saisir un secteur"
                className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-600"
              />
              <datalist id="secteur-options">
                {secteurSuggestions.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
          </div>
          <Input label="Nom de filière" value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} required placeholder="Développement Digital..." />
          <Select
            label="Niveau"
            value={form.niveau}
            onChange={e => setForm(p => ({ ...p, niveau: e.target.value }))}
            options={NIVEAU_OPTIONS}
            required
          />

          {!editing && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Modules ({form.modules.length})
                </label>
                <div className="flex items-center gap-2">
                  <input
                    ref={csvInputRef}
                    type="file"
                    accept=".csv,.txt"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleCsvImport(f); }}
                  />
                  <button
                    type="button"
                    onClick={() => csvInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-xs font-medium rounded-lg transition-colors"
                  >
                    <HiUpload className="h-3.5 w-3.5" /> Import CSV
                  </button>
                  <button
                    type="button"
                    onClick={addModuleRow}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    <HiPlus className="h-3.5 w-3.5" /> Ajouter module
                  </button>
                </div>
              </div>

              {form.modules.length === 0 ? (
                <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
                  <p className="text-sm text-gray-400 dark:text-gray-500">Aucun module ajouté</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    CSV format: <code className="text-gray-500 dark:text-gray-400">nom,heures</code> (une ligne par module)
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {form.modules.map((m, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={m.nom}
                        onChange={e => updateModuleRow(i, { nom: e.target.value })}
                        placeholder="Nom du module"
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-gray-100 placeholder-gray-400"
                      />
                      <div className="relative w-24">
                        <input
                          type="number"
                          value={m.heures_total}
                          onChange={e => updateModuleRow(i, { heures_total: e.target.value === '' ? '' : Number(e.target.value) })}
                          min={0}
                          className="w-full pl-3 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-gray-100"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500 pointer-events-none">H</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeModuleRow(i)}
                        className="p-2 text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                      >
                        <HiX className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {editing && (
            <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-lg px-4 py-3">
              Pour ajouter, modifier ou supprimer des modules, utilisez la page <Link to={`${basePath}/modules`} className="text-primary-600 dark:text-primary-400 font-medium hover:underline">Modules</Link>.
            </p>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Supprimer la filière"
        message={`Supprimer la filière "${editing?.nom}" ? Cette action est irréversible.`}
      />
    </div>
  );
};

export default FilieresPage;
