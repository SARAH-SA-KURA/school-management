import React from 'react';
import { Link } from 'react-router-dom';

const modules = [
  { code: 'M101', name: 'Programmation Orientee Objet', moyenne: 14.25, color: 'bg-blue-50', exams: [
    { type: 'Controle 1', date: '15/01/2026', coeff: 2, note: 14.5, status: 'Valide' },
    { type: 'Controle 2', date: '10/02/2026', coeff: 2, note: 13.0, status: 'Valide' },
    { type: 'Examen Final', date: '20/02/2026', coeff: 4, note: 15.0, status: 'Valide' },
  ]},
  { code: 'M102', name: 'Bases de Donnees', moyenne: 11.70, color: 'bg-blue-50', exams: [
    { type: 'Controle 1', date: '18/01/2026', coeff: 2, note: 12.0, status: 'Valide' },
    { type: 'Examen Final', date: '22/02/2026', coeff: 3, note: 11.5, status: 'Valide' },
  ]},
  { code: 'M201', name: 'Reseaux Informatiques', moyenne: 8.80, color: 'bg-red-50', exams: [
    { type: 'Controle 1', date: '20/01/2026', coeff: 2, note: 8.5, status: 'Insuffisant' },
    { type: 'Examen Final', date: '25/02/2026', coeff: 0, note: 9.0, status: 'Insuffisant' },
  ]},
  { code: 'M301', name: 'Mathematiques Appliquees', moyenne: 15.00, color: 'bg-green-50', exams: [
    { type: 'Controle 1', date: '22/01/2026', coeff: 2, note: 16.0, status: 'Valide' },
    { type: 'Controle 2', date: '12/02/2026', coeff: 2, note: 14.0, status: 'Valide' },
  ]},
];

const StagiaireExamensPage: React.FC = () => (
  <div>
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-gray-900">Examens & notes</h1>
      <p className="text-sm text-gray-500">
        <Link to="/stagiaire" className="text-primary-600 hover:text-primary-700">Tableau de bord</Link>{' / '}<span className="text-primary-600">Académique</span>{' / '}<span>Examens & notes</span>
      </p>
    </div>

    {/* General Average */}
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-lg font-semibold text-gray-800">Moyenne Generale: 13.5/20</h2>
      <span className="text-sm text-gray-500">Semestre: S1</span>
    </div>

    {/* Modules with Exams */}
    <div className="space-y-4">
      {modules.map((mod, mi) => (
        <div key={mi} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {/* Module Header */}
          <div className={`flex items-center justify-between px-6 py-3 ${mod.color}`}>
            <span className="text-sm font-semibold text-gray-800">{mod.code} - {mod.name}</span>
            <span className={`text-sm font-semibold ${mod.moyenne >= 10 ? 'text-green-600' : 'text-red-600'}`}>
              Moyenne: {mod.moyenne.toFixed(2)}/20
            </span>
          </div>
          {/* Exams Table */}
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-2.5 text-left text-xs font-medium text-gray-500">Type</th>
                <th className="px-6 py-2.5 text-left text-xs font-medium text-gray-500">Date</th>
                <th className="px-6 py-2.5 text-left text-xs font-medium text-gray-500">Coefficient</th>
                <th className="px-6 py-2.5 text-left text-xs font-medium text-gray-500">Note</th>
                <th className="px-6 py-2.5 text-left text-xs font-medium text-gray-500">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {mod.exams.map((exam, ei) => (
                <tr key={ei}>
                  <td className="px-6 py-3 text-sm text-gray-700">{exam.type}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{exam.date}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{exam.coeff}</td>
                  <td className="px-6 py-3 text-sm font-medium text-primary-600">{exam.note}/20</td>
                  <td className="px-6 py-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${exam.status === 'Valide' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                      {exam.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  </div>
);

export default StagiaireExamensPage;
