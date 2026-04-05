import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dropdownApi, emploiDuTempsApi } from '../../../api/crudApi';

interface TimeSlot {
  id: string;
  salle: string;
  formateur: string;
  groupe: string;
  type: 'presentiele' | 'a_distance';
  jour: string;
  slot: number;
}

const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const timeSlots = [
  { start: '08:30', end: '10:50' },
  { start: '11:10', end: '13:20' },
  { start: '13:30', end: '15:50' },
  { start: '16:10', end: '18:30' },
];

// Color palette for group/teacher color coding
const COLOR_PALETTE = [
  'border-l-4 border-l-blue-400 bg-blue-50/40',
  'border-l-4 border-l-emerald-400 bg-emerald-50/40',
  'border-l-4 border-l-purple-400 bg-purple-50/40',
  'border-l-4 border-l-orange-400 bg-orange-50/40',
  'border-l-4 border-l-pink-400 bg-pink-50/40',
  'border-l-4 border-l-teal-400 bg-teal-50/40',
  'border-l-4 border-l-yellow-400 bg-yellow-50/40',
  'border-l-4 border-l-red-400 bg-red-50/40',
];

const EmploiDuTempsPage: React.FC = () => {
  const [formateur, setFormateur] = useState('');
  const [filiere, setFiliere] = useState('');
  const [groupe, setGroupe] = useState('');
  const [semaine, setSemaine] = useState('10 - 14 Fev 2025');
  const [formateurs, setFormateurs] = useState<any[]>([]);
  const [filieres, setFilieres] = useState<any[]>([]);
  const [groupes, setGroupes] = useState<any[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);

  useEffect(() => {
    dropdownApi.filieres().then(res => {
      if (res.data?.data) setFilieres(res.data.data);
    }).catch(() => {});
    dropdownApi.groups().then(res => {
      if (res.data?.data) setGroupes(res.data.data);
    }).catch(() => {});
    // Load formateurs from the emploi du temps or formateurs API
    emploiDuTempsApi.getAll({ per_page: 100 }).then(res => {
      if (res.data?.data) {
        const mapped = res.data.data.map((item: any, idx: number) => ({
          id: String(item.id || idx),
          salle: item.salle?.nom || '',
          formateur: item.formateur?.user ? `${item.formateur.user.prenom} ${item.formateur.user.nom}` : (item.formateur_name || ''),
          groupe: item.group?.nom || item.groupe?.nom || '',
          type: item.type || 'presentiele',
          jour: item.jour || '',
          slot: item.creneau || 0,
        }));
        setSlots(mapped);
        // Extract unique formateurs
        const fmts = mapped.map((s: TimeSlot) => s.formateur).filter(Boolean);
        const uniqueFmts = fmts.filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);
        setFormateurs(uniqueFmts.map((f: string) => ({ id: f, nom: f })));
      }
    }).catch(() => {});
  }, []);

  // Build color maps for consistent group/teacher coloring
  const colorMap = new Map<string, string>();
  let colorIdx = 0;
  const getColor = (key: string) => {
    if (!colorMap.has(key)) {
      colorMap.set(key, COLOR_PALETTE[colorIdx % COLOR_PALETTE.length]);
      colorIdx++;
    }
    return colorMap.get(key)!;
  };

  const filteredSlots = slots.filter(s => {
    if (formateur && s.formateur !== formateur) return false;
    if (groupe) {
      const selectedGroup = groupes.find((g: any) => String(g.id) === groupe);
      if (selectedGroup && s.groupe !== selectedGroup.nom) return false;
    }
    return true;
  });

  const getSlot = (jour: string, slotIdx: number) => {
    return filteredSlots.filter(s => s.jour.toLowerCase() === jour.toLowerCase() && s.slot === slotIdx);
  };

  // Determine color key: if filtering by formateur, color by group; otherwise by formateur
  const getSlotColor = (entry: TimeSlot) => {
    const key = formateur ? entry.groupe : entry.formateur;
    return getColor(key || 'default');
  };

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Emploi du temps</h1>
        <p className="text-sm text-gray-500">
          <Link to="/admin/dashboard" className="text-primary-600 hover:text-primary-700">Tableau de bord</Link>
          {' / '}
          <span className="text-primary-600">Académique</span>
          {' / '}
          <span>Emploi du temps</span>
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-white border border-gray-200 rounded-xl">
        {/* Filter Chips */}
        <div className="flex items-center gap-3 px-6 py-4 flex-wrap">
          <select value={formateur} onChange={(e) => setFormateur(e.target.value)}
            className="text-sm border border-primary-200 text-primary-600 rounded-full px-4 py-1.5 bg-white appearance-none cursor-pointer hover:bg-primary-50 transition-colors">
            <option value="">Formateur : Tous</option>
            {formateurs.map((f: any) => (
              <option key={f.id} value={f.nom}>{f.nom}</option>
            ))}
          </select>
          <select value={filiere} onChange={(e) => setFiliere(e.target.value)}
            className="text-sm border border-primary-200 text-primary-600 rounded-full px-4 py-1.5 bg-white appearance-none cursor-pointer hover:bg-primary-50 transition-colors">
            <option value="">Filière : Toutes</option>
            {filieres.map((f: any) => (
              <option key={f.id} value={f.id}>{f.nom}</option>
            ))}
          </select>
          <select value={groupe} onChange={(e) => setGroupe(e.target.value)}
            className="text-sm border border-primary-200 text-primary-600 rounded-full px-4 py-1.5 bg-white appearance-none cursor-pointer hover:bg-primary-50 transition-colors">
            <option value="">Groupe : Tous</option>
            {groupes
              .filter((g: any) => !filiere || String(g.filiere_id) === filiere)
              .map((g: any) => (
                <option key={g.id} value={g.id}>{g.nom}</option>
              ))}
          </select>
          <button className="text-sm border border-primary-200 text-primary-600 rounded-full px-4 py-1.5 bg-white hover:bg-primary-50 transition-colors">
            Semaine : {semaine}
          </button>
        </div>

        {/* Timetable Grid */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 w-24 border-b border-gray-100">Horaire</th>
                {days.map(day => (
                  <th key={day} className="px-4 py-3 text-center text-sm font-medium text-gray-500 border-b border-gray-100">{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((slot, slotIdx) => (
                <tr key={slotIdx} className="border-b border-gray-50">
                  <td className="px-4 py-2 align-top">
                    <div className="text-sm font-medium text-gray-700">{slot.start}</div>
                    <div className="text-xs text-gray-400">{slot.end}</div>
                  </td>
                  {days.map(day => {
                    const entries = getSlot(day, slotIdx);
                    return (
                      <td key={day} className="px-2 py-2 align-top" style={{ minWidth: 140, height: 120 }}>
                        {entries.map(entry => (
                          <div key={entry.id} className={`rounded-lg p-3 h-full ${getSlotColor(entry)}`}>
                            {entry.salle && (
                              <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                                {entry.salle}
                              </div>
                            )}
                            <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              {entry.formateur}
                            </div>
                            {entry.groupe && (
                              <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                {entry.groupe}
                              </div>
                            )}
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                              entry.type === 'presentiele' ? 'bg-teal-600 text-white' : 'bg-yellow-600 text-white'
                            }`}>
                              {entry.type === 'presentiele' ? 'Présentiel' : 'À distance'}
                            </span>
                          </div>
                        ))}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Break Info */}
        <div className="grid grid-cols-2 gap-4 px-6 py-4">
          <div className="border border-gray-100 rounded-lg p-4">
            <span className="inline-block px-2 py-0.5 bg-primary-600 text-white rounded text-xs font-medium mb-2">Pause Matin</span>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" strokeWidth={2} />
                <path strokeWidth={2} d="M12 6v6l4 2" />
              </svg>
              10:50 - 11:10
            </div>
          </div>
          <div className="border border-gray-100 rounded-lg p-4">
            <span className="inline-block px-2 py-0.5 bg-red-500 text-white rounded text-xs font-medium mb-2">Pause Après-midi</span>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" strokeWidth={2} />
                <path strokeWidth={2} d="M12 6v6l4 2" />
              </svg>
              15:50 - 16:10
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmploiDuTempsPage;
