import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/ui';
import { HiUpload, HiDownload } from 'react-icons/hi';

const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const timeSlots = [
  { start: '08:30', end: '10:50' },
  { start: '11:10', end: '13:20' },
  { start: '13:30', end: '15:50' },
  { start: '16:10', end: '18:30' },
];

interface Slot { module: string; salle: string; formateur: string; type: string; }

const mockData: Record<string, Record<number, Slot>> = {
  lundi: { 0: { module: 'Algorithme', salle: 'Salle A1', formateur: 'Mohamed Alaoui', type: 'presentiele' } },
  mercredi: { 0: { module: 'Français', salle: 'Salle C1', formateur: 'Sanae hatim', type: 'presentiele' } },
  vendredi: { 0: { module: 'Front-end', salle: 'Info salle A1', formateur: 'Bilal omari', type: 'presentiele' }, 2: { module: 'Algorithme', salle: 'Salle A1', formateur: 'Mohamed Alaoui', type: 'presentiele' } },
  samedi: { 0: { module: 'Front-end', salle: 'Info salle A1', formateur: 'Bilal omari', type: 'presentiele' }, 2: { module: 'Database', salle: 'Salle A2', formateur: 'Farid alamari', type: 'presentiele' } },
  mardi: { 2: { module: 'Database', salle: 'Salle A2', formateur: 'Farid alamari', type: 'presentiele' } },
  jeudi: { 2: { module: 'Algorithme', salle: 'Salle A1', formateur: 'Mohamed Alaoui', type: 'presentiele' } },
};

const slotColors = ['border-l-primary-400 bg-primary-50/30', 'border-l-primary-400 bg-primary-50/30', 'border-l-emerald-400 bg-emerald-50/30', 'border-l-yellow-500 bg-yellow-50/30'];

const FormateurEmploiPage: React.FC = () => {
  const [filiere, setFiliere] = useState('');
  const [groupe, setGroupe] = useState('');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Emploi du temps</h1>
          <p className="text-sm text-gray-500">
            <Link to="/formateur" className="text-primary-600 hover:text-primary-700">Tableau de bord</Link>
            {' / '}
            <span className="text-primary-600">Académique</span>
            {' / '}
            <span>Emploi du temps</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" icon={<HiUpload className="h-4 w-4" />}>Import</Button>
          <Button variant="secondary" icon={<HiDownload className="h-4 w-4" />}>Export</Button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="flex items-center gap-4 px-6 py-4 flex-wrap">
          <h2 className="text-lg font-semibold text-gray-900">Time Table</h2>
          <select value={filiere} onChange={(e) => setFiliere(e.target.value)}
            className="text-sm border border-primary-200 text-primary-600 rounded-full px-4 py-1.5 bg-white ml-4">
            <option value="">Filière : –choisir filière</option>
          </select>
          <select value={groupe} onChange={(e) => setGroupe(e.target.value)}
            className="text-sm border border-primary-200 text-primary-600 rounded-full px-4 py-1.5 bg-white">
            <option value="">Groupe : –choisir groupe</option>
          </select>
          <button className="text-sm border border-primary-200 text-primary-600 rounded-full px-4 py-1.5 bg-white">
            Semaine : 10 - 14 Fév 2025
          </button>
        </div>

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
                    const entry = mockData[day.toLowerCase()]?.[slotIdx];
                    return (
                      <td key={day} className="px-2 py-2 align-top" style={{ minWidth: 140, height: 120 }}>
                        {entry && (
                          <div className={`rounded-lg p-3 h-full border-l-4 ${slotColors[slotIdx % slotColors.length]}`}>
                            <div className="text-sm font-bold text-gray-800 mb-1">{entry.module}</div>
                            {entry.salle && <div className="text-xs text-gray-500 mb-2">📎 {entry.salle}</div>}
                            <div className="text-xs text-gray-500 mb-1">👤 {entry.formateur}</div>
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                              entry.type === 'presentiele' ? 'bg-primary-600 text-white' : 'bg-yellow-600 text-white'
                            }`}>
                              {entry.type === 'presentiele' ? 'Présentiele' : 'à distance'}
                            </span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-2 gap-4 px-6 py-4">
          <div className="border border-gray-100 rounded-lg p-4">
            <span className="inline-block px-2 py-0.5 bg-primary-600 text-white rounded text-xs font-medium mb-2">Morning Break</span>
            <p className="text-sm text-gray-600">10:50 to 11 :10 AM</p>
          </div>
          <div className="border border-gray-100 rounded-lg p-4">
            <span className="inline-block px-2 py-0.5 bg-red-500 text-white rounded text-xs font-medium mb-2">Evening Break</span>
            <p className="text-sm text-gray-600">15:50 PM to 16:10 PM</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormateurEmploiPage;
