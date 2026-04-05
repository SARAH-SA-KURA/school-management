import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { dropdownApi, notesApi } from '../../../api/crudApi';
import { HiFilter, HiSortAscending, HiChevronUp, HiChevronDown, HiSearch } from 'react-icons/hi';
import toast from 'react-hot-toast';

interface StudentGrade {
  id: number;
  name: string;
  cc1: number | null;
  cc2: number | null;
  cc3: number | null;
  efm: number | null;
  moyenne: number | null;
}

const ExamensPage: React.FC = () => {
  const [filieres, setFilieres] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [allGroups, setAllGroups] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [selectedFiliere, setSelectedFiliere] = useState('');
  const [selectedGroupe, setSelectedGroupe] = useState('');
  const [selectedModule, setSelectedModule] = useState('');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [students, setStudents] = useState<StudentGrade[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    dropdownApi.filieres().then(res => {
      if (res.data?.data) setFilieres(res.data.data);
    }).catch(() => {});
    dropdownApi.groups().then(res => {
      if (res.data?.data) {
        setAllGroups(res.data.data);
        setGroups(res.data.data);
      }
    }).catch(() => {});
  }, []);

  // Filter groups when filiere changes
  useEffect(() => {
    if (selectedFiliere) {
      setGroups(allGroups.filter((g: any) => String(g.filiere_id) === selectedFiliere));
    } else {
      setGroups(allGroups);
    }
    setSelectedGroupe('');
  }, [selectedFiliere, allGroups]);

  // Load modules for selected group/filiere
  useEffect(() => {
    if (selectedGroupe) {
      const group = allGroups.find((g: any) => String(g.id) === selectedGroupe);
      if (group?.filiere_id) {
        // We'll use the filiere's modules
        import('../../../api/crudApi').then(({ modulesApi }) => {
          modulesApi.getAll({ filiere_id: group.filiere_id, per_page: 100 }).then(res => {
            if (res.data?.data) setModules(res.data.data);
          }).catch(() => {});
        });
      }
    }
  }, [selectedGroupe, allGroups]);

  // Load notes when filters change
  const fetchNotes = useCallback(async () => {
    if (!selectedGroupe || !selectedModule) return;
    setLoading(true);
    try {
      const res = await notesApi.getAll({
        group_id: selectedGroupe,
        module_id: selectedModule,
        per_page: 50,
      });
      if (res.data?.data) {
        const mapped = res.data.data.map((item: any) => ({
          id: item.id || item.stagiaire_id,
          name: item.stagiaire?.user ? `${item.stagiaire.user.prenom} ${item.stagiaire.user.nom}` : 'Stagiaire',
          cc1: item.cc1 ?? null,
          cc2: item.cc2 ?? null,
          cc3: item.cc3 ?? null,
          efm: item.efm ?? null,
          moyenne: item.moyenne ?? null,
        }));
        setStudents(mapped);
      }
    } catch {
      // If API not ready, keep empty
    }
    setLoading(false);
  }, [selectedGroupe, selectedModule]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const toggleAll = () => {
    if (selectedIds.size === filteredStudents.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredStudents.map(s => s.id)));
  };

  const toggleOne = (id: number) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  // Filter by search
  const filteredStudents = students.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase())
  );

  // Sort
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    if (!sortKey) return 0;
    const aVal = (a as any)[sortKey] ?? 0;
    const bVal = (b as any)[sortKey] ?? 0;
    if (typeof aVal === 'string') return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
  });

  const SortIcon = ({ col }: { col: string }) => (
    <span className="inline-flex flex-col ml-1 -space-y-1">
      <HiChevronUp className={`h-3 w-3 ${sortKey === col && sortDir === 'asc' ? 'text-primary-600' : 'text-gray-300'}`} />
      <HiChevronDown className={`h-3 w-3 ${sortKey === col && sortDir === 'desc' ? 'text-primary-600' : 'text-gray-300'}`} />
    </span>
  );

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Examens & notes</h1>
        <p className="text-sm text-gray-500">
          <Link to="/admin/dashboard" className="text-primary-600 hover:text-primary-700">Tableau de bord</Link>
          {' / '}
          <span className="text-primary-600">Académique</span>
          {' / '}
          <span>Examens & notes</span>
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-white border border-gray-200 rounded-xl">
        {/* Card Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <h2 className="text-lg font-semibold text-gray-900">Examens & notes</h2>
          <div className="flex items-center gap-3">
            <button onClick={() => handleSort('name')}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              <HiSortAscending className="h-4 w-4" /> Trier {sortDir === 'asc' ? 'A-Z' : 'Z-A'}
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex items-center gap-4 px-6 pb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Filières</span>
            <select value={selectedFiliere} onChange={(e) => setSelectedFiliere(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 bg-white">
              <option value="">Toutes</option>
              {filieres.map((f: any) => <option key={f.id} value={f.id}>{f.nom}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Groupes</span>
            <select value={selectedGroupe} onChange={(e) => setSelectedGroupe(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 bg-white">
              <option value="">Tous</option>
              {groups.map((g: any) => <option key={g.id} value={g.id}>{g.nom}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Modules</span>
            <select value={selectedModule} onChange={(e) => setSelectedModule(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 bg-white">
              <option value="">Tous</option>
              {modules.map((m: any) => <option key={m.id} value={m.id}>{m.nom}</option>)}
            </select>
          </div>
          <div className="ml-auto">
            <div className="flex items-center border border-gray-200 rounded-lg px-3 py-1.5">
              <HiSearch className="h-4 w-4 text-gray-400 mr-2" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..."
                className="text-sm bg-transparent outline-none placeholder-gray-400 w-32" />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50 border-y border-gray-100">
                <th className="w-10 px-4 py-3">
                  <input type="checkbox" checked={selectedIds.size === sortedStudents.length && sortedStudents.length > 0}
                    onChange={toggleAll} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                </th>
                {['Stagiaire', 'CC1', 'CC2', 'CC3', 'EFM', 'Moyenne'].map(col => (
                  <th key={col} className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer select-none"
                    onClick={() => handleSort(col.toLowerCase())}>
                    <span className="inline-flex items-center">{col}<SortIcon col={col.toLowerCase()} /></span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Chargement...</td></tr>
              ) : sortedStudents.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  {selectedGroupe && selectedModule ? 'Aucune note trouvée' : 'Sélectionnez un groupe et un module'}
                </td></tr>
              ) : (
                sortedStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3.5">
                      <input type="checkbox" checked={selectedIds.has(student.id)} onChange={() => toggleOne(student.id)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-900 font-medium">{student.name}</td>
                    <td className="px-4 py-3.5 text-sm text-gray-600">{student.cc1 ?? '-'}</td>
                    <td className="px-4 py-3.5 text-sm text-gray-600">{student.cc2 ?? '-'}</td>
                    <td className="px-4 py-3.5 text-sm text-gray-600">{student.cc3 ?? '-'}</td>
                    <td className="px-4 py-3.5 text-sm text-gray-600">{student.efm ?? '-'}</td>
                    <td className="px-4 py-3.5 text-sm font-semibold text-gray-900">{student.moyenne ?? '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-gray-100">
          <div className="text-sm text-gray-500">
            {sortedStudents.length} résultat(s)
          </div>
        </div>
      </div>

      {/* Valider Button */}
      <div className="flex justify-end mt-6">
        <button
          onClick={() => toast.success('Notes validées')}
          className="px-8 py-3 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          Valider les notes
        </button>
      </div>
    </div>
  );
};

export default ExamensPage;
