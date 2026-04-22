import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { filieresApi, modulesApi, dropdownApi } from '../../../api/crudApi';
import { Filiere, TableColumn, SelectOption } from '../../../types';
import { DataTable, Modal, Button, Input, Select, ConfirmDialog } from '../../../components/ui';
import { HiSortAscending, HiPlus, HiPencil, HiTrash, HiDotsHorizontal, HiSearch, HiBookOpen, HiLockClosed } from 'react-icons/hi';
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

interface ModuleItem {
  id: number;
  nom: string;
  code?: string;
  filiere_id: number | null;
  filiere?: { id: number; nom: string; code?: string };
}

const emptyForm = {
  code: '',
  nom: '',
  niveau: 'Technicien Spécialisé',
  secteur: '',
  // IDs of modules selected to be attached to this filière after save.
  // On edit, pre-populated with the filière's currently-attached modules.
  module_ids: [] as number[],
};

interface ModulesPickerProps {
  loading: boolean;
  allModules: ModuleItem[];
  selectedIds: number[];
  initiallyAttached: Set<number>;
  editingFiliereId: number | null;
  editingFiliereNom: string;
  onToggle: (id: number) => void;
  search: string;
  onSearchChange: (s: string) => void;
}

const ModulesPicker: React.FC<ModulesPickerProps> = ({
  loading, allModules, selectedIds, initiallyAttached,
  editingFiliereId, editingFiliereNom, onToggle,
  search, onSearchChange,
}) => {
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allModules;
    return allModules.filter(m =>
      m.nom.toLowerCase().includes(q) || (m.code || '').toLowerCase().includes(q)
    );
  }, [allModules, search]);

  // Sort so modules already in this filière float to the top, then modules of
  // other filières, preserving name order within each group.
  const ordered = useMemo(() => {
    const bucket = (m: ModuleItem) =>
      initiallyAttached.has(m.id) ? 0 : 1;
    return [...filtered].sort((a, b) => {
      const ba = bucket(a), bb = bucket(b);
      if (ba !== bb) return ba - bb;
      return a.nom.localeCompare(b.nom);
    });
  }, [filtered, initiallyAttached]);

  const newAttachCount = selectedIds.filter(id => !initiallyAttached.has(id)).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Modules rattachés ({selectedIds.length})
          {newAttachCount > 0 && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
              +{newAttachCount} nouveau(x)
            </span>
          )}
        </label>
        <span className="text-[11px] text-gray-400 dark:text-gray-500">
          {allModules.length} module(s) dans le catalogue
        </span>
      </div>

      <div className="relative mb-3">
        <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Rechercher un module par nom ou code..."
          className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder-gray-400"
        />
      </div>

      <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700/60">
        {loading ? (
          <p className="p-4 text-xs text-gray-400 dark:text-gray-500 text-center">Chargement des modules...</p>
        ) : ordered.length === 0 ? (
          <p className="p-4 text-xs text-gray-400 dark:text-gray-500 text-center">
            {search ? 'Aucun module ne correspond à la recherche' : 'Aucun module disponible'}
          </p>
        ) : (
          ordered.map(m => {
            const isAttachedHere = initiallyAttached.has(m.id);
            const isChecked = selectedIds.includes(m.id);
            const inOtherFiliere = !isAttachedHere && m.filiere_id != null && m.filiere_id !== editingFiliereId;

            return (
              <label
                key={m.id}
                className={`flex items-start gap-3 px-3 py-2.5 transition-colors ${
                  isAttachedHere
                    ? 'bg-green-50/60 dark:bg-green-900/10 cursor-not-allowed'
                    : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  disabled={isAttachedHere}
                  onChange={() => onToggle(m.id)}
                  className="mt-0.5 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500 disabled:opacity-60"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{m.nom}</span>
                    {m.code && (
                      <span className="text-[11px] text-gray-400 dark:text-gray-500 font-mono">{m.code}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {isAttachedHere ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-green-700 dark:text-green-400">
                        <HiLockClosed className="h-3 w-3" />
                        Déjà dans {editingFiliereNom || 'cette filière'}
                      </span>
                    ) : inOtherFiliere ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400">
                        <HiBookOpen className="h-3 w-3" />
                        Actuellement dans {m.filiere?.nom || `filière #${m.filiere_id}`}
                        {isChecked && ' → sera déplacé ici'}
                      </span>
                    ) : (
                      <span className="text-[11px] text-gray-500 dark:text-gray-400">Non attribué</span>
                    )}
                  </div>
                </div>
              </label>
            );
          })
        )}
      </div>
      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
        Les modules déjà rattachés sont verrouillés ici. Pour les détacher, ouvrez-les depuis la page Modules.
      </p>
    </div>
  );
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
  const [allModules, setAllModules] = useState<ModuleItem[]>([]);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [moduleSearch, setModuleSearch] = useState('');
  // Snapshot of which modules were attached to this filière when the modal opened.
  // Used to render "déjà attaché" badge + lock their checkboxes (only ADD flow).
  const [initiallyAttached, setInitiallyAttached] = useState<Set<number>>(new Set());
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

  // Catalog of all modules (across every filière) — source for the picker.
  // Refreshed each time the modal opens so freshly-added modules appear.
  useEffect(() => {
    if (!canWrite || !formOpen) return;
    setModulesLoading(true);
    modulesApi.getAll({ per_page: 1000, sort_by: 'nom', sort_dir: 'asc' })
      .then(res => {
        const list: any[] = res.data?.data || [];
        setAllModules(list.map(m => ({
          id: m.id,
          nom: m.nom,
          code: m.code,
          filiere_id: m.filiere_id ?? m.filiere?.id ?? null,
          filiere: m.filiere ? { id: m.filiere.id, nom: m.filiere.nom, code: m.filiere.code } : undefined,
        })));
      })
      .catch(() => toast.error('Erreur lors du chargement des modules'))
      .finally(() => setModulesLoading(false));
  }, [canWrite, formOpen]);

  const handlePerPageChange = (newPerPage: number) => {
    setPerPage(newPerPage);
    setPage(1);
  };

  const toggleSort = () => { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); setPage(1); };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, module_ids: [] });
    setInitiallyAttached(new Set());
    setModuleSearch('');
    setFormOpen(true);
  };

  const openEdit = async (f: Filiere) => {
    setOpenMenuId(null);
    setModuleSearch('');
    setEditing(f);
    // Set base form fields immediately so the UI doesn't wait.
    setForm({
      code: f.code || '',
      nom: f.nom || '',
      niveau: (f as any).niveau || 'Technicien Spécialisé',
      secteur: (f as any).secteur || '',
      module_ids: [],
    });
    setInitiallyAttached(new Set());
    setFormOpen(true);
    // Fetch the detail payload to get the currently-attached modules.
    try {
      const res = await filieresApi.getById(f.id);
      const detail: any = res.data.data;
      const attachedIds = (detail.modules || []).map((m: any) => m.id);
      setForm(p => ({ ...p, module_ids: attachedIds }));
      setInitiallyAttached(new Set(attachedIds));
    } catch {
      // Non-fatal — the picker still works, just without pre-checks.
    }
  };

  const toggleModule = (id: number) => {
    // Pre-attached modules are locked — unchecking here doesn't detach them.
    // Directeur must attach them to another filière to move them.
    if (initiallyAttached.has(id)) return;
    setForm(p => ({
      ...p,
      module_ids: p.module_ids.includes(id)
        ? p.module_ids.filter(x => x !== id)
        : [...p.module_ids, id],
    }));
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
      // Only send module IDs that are NEWLY selected (not already attached).
      // Backend "attach = reassign" semantic; sending already-attached IDs is a
      // safe no-op but sending new ones moves them to this filière.
      const newAttachIds = form.module_ids.filter(id => !initiallyAttached.has(id));
      if (newAttachIds.length > 0) base.module_ids = newAttachIds;

      if (editing) {
        await filieresApi.update(editing.id, base);
        toast.success(
          newAttachIds.length > 0
            ? `Filière mise à jour, ${newAttachIds.length} module(s) rattaché(s)`
            : 'Filière mise à jour'
        );
      } else {
        await filieresApi.create(base as any);
        toast.success(
          newAttachIds.length > 0
            ? `Filière créée avec ${newAttachIds.length} module(s) rattaché(s)`
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

          <ModulesPicker
            loading={modulesLoading}
            allModules={allModules}
            selectedIds={form.module_ids}
            initiallyAttached={initiallyAttached}
            editingFiliereId={editing?.id ?? null}
            editingFiliereNom={editing?.nom || form.nom}
            onToggle={toggleModule}
            search={moduleSearch}
            onSearchChange={setModuleSearch}
          />

          <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-lg px-4 py-3">
            Pour créer, modifier ou supprimer un module, utilisez la page <Link to={`${basePath}/modules`} className="text-primary-600 dark:text-primary-400 font-medium hover:underline">Modules</Link>.
          </p>
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
