import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { absencesApi, stagiairesApi } from '../../../api/crudApi';
import { Absence } from '../../../types';
import { Modal, Button, Select } from '../../../components/ui';
import toast from 'react-hot-toast';
import { formatDate } from '../../../utils/formatters';
import { HiArrowLeft, HiX, HiPencil, HiDotsHorizontal, HiCheck, HiClock, HiBan } from 'react-icons/hi';
import { HiDocumentText } from 'react-icons/hi2';

const BACKEND_URL = (process.env.REACT_APP_API_URL || 'http://localhost:8000/api').replace('/api', '');

const STATUS_LABELS: Record<string, string> = {
  non_justifiee: 'Non justifiée',
  justifiee:     'Justifiée',
  en_attente:    'En attente',
};

const statusBadge = (status: string) => {
  const styles: Record<string, string> = {
    non_justifiee: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    justifiee:     'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    en_attente:    'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
};

const minutesOf = (a: Absence) => {
  const [h1, m1] = (a.heure_debut || '00:00').split(':').map(Number);
  const [h2, m2] = (a.heure_fin   || '00:00').split(':').map(Number);
  return Math.max(0, (h2 * 60 + m2) - (h1 * 60 + m1));
};

const SurveillantAbsenceDetailPage: React.FC = () => {
  const { stagiaireId } = useParams<{ stagiaireId: string }>();
  const navigate = useNavigate();

  const [stag, setStag] = useState<any | null>(null);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [loading, setLoading] = useState(true);

  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [statusEditOpen, setStatusEditOpen] = useState(false);
  const [statusEditing, setStatusEditing] = useState<Absence | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [statusNote, setStatusNote] = useState('');
  const [justifFile, setJustifFile] = useState<File | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');

  const load = useCallback(async () => {
    if (!stagiaireId) return;
    setLoading(true);
    try {
      const [sRes, aRes] = await Promise.all([
        stagiairesApi.getById(Number(stagiaireId)),
        absencesApi.getAll({ stagiaire_id: stagiaireId, per_page: 500 }),
      ]);
      setStag(sRes.data?.data || null);
      setAbsences(aRes.data?.data || []);
    } catch {
      toast.error('Erreur de chargement');
    }
    setLoading(false);
  }, [stagiaireId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const handler = () => setOpenMenuId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const totals = useMemo(() => {
    const byStatus = { justifiee: 0, non_justifiee: 0, en_attente: 0 } as Record<string, number>;
    absences.forEach(a => { byStatus[a.status] = (byStatus[a.status] || 0) + minutesOf(a); });
    const all = byStatus.justifiee + byStatus.non_justifiee + byStatus.en_attente;
    const toHours = (m: number) => Math.round((m / 60) * 10) / 10;
    return {
      total:        toHours(all),
      justifiee:    toHours(byStatus.justifiee),
      non_justifiee: toHours(byStatus.non_justifiee),
      en_attente:   toHours(byStatus.en_attente),
    };
  }, [absences]);

  const visibleAbsences = useMemo(() => {
    const list = filterStatus ? absences.filter(a => a.status === filterStatus) : absences;
    return [...list].sort((a, b) => String(b.date_absence).localeCompare(String(a.date_absence)));
  }, [absences, filterStatus]);

  const openStatusEdit = (a: Absence, target: string) => {
    setStatusEditing(a);
    setNewStatus(target);
    setStatusNote(target === 'justifiee' ? '' : (a.motif || ''));
    setJustifFile(null);
    setStatusEditOpen(true);
    setOpenMenuId(null);
  };

  const quickSetStatus = async (a: Absence, target: string) => {
    setOpenMenuId(null);
    try {
      await absencesApi.update(a.id, { status: target } as any);
      toast.success('Statut mis à jour');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur');
    }
  };

  const handleSaveStatus = async () => {
    if (!statusEditing) return;
    if (newStatus === 'justifiee' && !justifFile && !statusEditing.justification) {
      toast.error('Veuillez choisir un document justificatif');
      return;
    }
    setSavingStatus(true);
    try {
      if (newStatus === 'justifiee' && justifFile) {
        await absencesApi.justify(statusEditing.id, justifFile, statusNote.trim() || undefined);
      } else {
        const payload: any = { status: newStatus };
        if (newStatus === 'en_attente') {
          payload.motif = statusNote.trim() || null;
          payload.justification = null;
        } else if (newStatus === 'non_justifiee') {
          payload.motif = null;
          payload.justification = null;
        } else if (newStatus === 'justifiee') {
          payload.motif = statusNote.trim() || null;
        }
        await absencesApi.update(statusEditing.id, payload);
      }
      toast.success('Statut mis à jour');
      setStatusEditOpen(false);
      setStatusEditing(null);
      setJustifFile(null);
      load();
    } catch (err: any) {
      const errors = err.response?.data?.errors;
      const firstErr = errors ? Object.values(errors).flat()[0] : null;
      toast.error((firstErr as string) || err.response?.data?.message || 'Erreur');
    }
    setSavingStatus(false);
  };

  const handleDelete = async (a: Absence) => {
    setOpenMenuId(null);
    if (!window.confirm(`Supprimer l'absence du ${formatDate(a.date_absence)} en ${a.module?.nom || 'module'} ?`)) return;
    try {
      await absencesApi.delete(a.id);
      toast.success('Absence supprimée');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur');
    }
  };

  const renderMotif = (item: Absence) => {
    if (item.status === 'non_justifiee') {
      return <span className="text-gray-400 dark:text-gray-500">-</span>;
    }
    if (item.status === 'justifiee') {
      const docUrl = item.justification
        ? (item.justification.startsWith('http') ? item.justification : `${BACKEND_URL}${item.justification}`)
        : null;
      return docUrl ? (
        <button
          onClick={(e) => { e.stopPropagation(); setPreviewDoc(docUrl); }}
          className="flex items-center gap-1.5 text-primary-600 dark:text-primary-400 hover:text-primary-700 transition-colors"
          title="Voir le justificatif"
        >
          <HiDocumentText className="h-5 w-5" />
          <span className="text-xs underline">Justificatif</span>
        </button>
      ) : (
        <span className="text-xs text-gray-500 dark:text-gray-400 italic">Texte</span>
      );
    }
    if (item.status === 'en_attente') {
      return (
        <span className="text-sm text-gray-700 dark:text-gray-300 max-w-[220px] truncate block" title={item.motif || ''}>
          {item.motif || '-'}
        </span>
      );
    }
    return <span className="text-gray-400 dark:text-gray-500">-</span>;
  };

  const displayName = stag?.user ? `${stag.user.prenom} ${stag.user.nom}` : 'Stagiaire';

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/surveillant/absences')}
          className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-3"
        >
          <HiArrowLeft className="h-4 w-4" /> Retour à la synthèse
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {loading && !stag ? 'Chargement…' : displayName}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          <Link to="/surveillant/dashboard" className="text-primary-600 dark:text-primary-400 hover:text-primary-700">Tableau de bord</Link>
          {' / '}
          <Link to="/surveillant/absences" className="text-primary-600 dark:text-primary-400 hover:text-primary-700">Absences</Link>
          {' / '}
          <span>{displayName}</span>
        </p>
      </div>

      {/* Identity card */}
      {stag && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">CEF</p>
              <p className="text-base font-semibold text-gray-900 dark:text-gray-100">{stag.cef || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Groupe</p>
              <p className="text-base font-semibold text-gray-900 dark:text-gray-100">{stag.group?.nom || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Filière</p>
              <p className="text-base font-semibold text-gray-900 dark:text-gray-100">{stag.group?.filiere?.nom || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Statut</p>
              {(() => {
                const s = (stag.status as string) || 'actif';
                const label = ({
                  actif: 'Actif', abandon: 'Abandon', diplome: 'Diplômé', suspendu: 'Suspendu',
                } as Record<string, string>)[s] || s;
                const cls = ({
                  actif:    'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
                  abandon:  'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
                  diplome:  'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
                  suspendu: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
                } as Record<string, string>)[s] || 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
                return (
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
                    {label}
                  </span>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <button
          onClick={() => setFilterStatus('')}
          className={`text-left bg-white dark:bg-gray-800 rounded-xl border p-4 transition-colors ${
            filterStatus === '' ? 'border-primary-500 ring-2 ring-primary-100 dark:ring-primary-900/30' : 'border-gray-100 dark:border-gray-700 hover:border-gray-300'
          }`}
        >
          <p className="text-sm text-gray-500 dark:text-gray-400">Total heures</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totals.total}h</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{absences.length} absence{absences.length > 1 ? 's' : ''}</p>
        </button>
        <button
          onClick={() => setFilterStatus('justifiee')}
          className={`text-left bg-white dark:bg-gray-800 rounded-xl border p-4 transition-colors ${
            filterStatus === 'justifiee' ? 'border-green-500 ring-2 ring-green-100 dark:ring-green-900/30' : 'border-gray-100 dark:border-gray-700 hover:border-gray-300'
          }`}
        >
          <p className="text-sm text-gray-500 dark:text-gray-400">Justifiées</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{totals.justifiee}h</p>
        </button>
        <button
          onClick={() => setFilterStatus('non_justifiee')}
          className={`text-left bg-white dark:bg-gray-800 rounded-xl border p-4 transition-colors ${
            filterStatus === 'non_justifiee' ? 'border-red-500 ring-2 ring-red-100 dark:ring-red-900/30' : 'border-gray-100 dark:border-gray-700 hover:border-gray-300'
          }`}
        >
          <p className="text-sm text-gray-500 dark:text-gray-400">Non justifiées</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{totals.non_justifiee}h</p>
          {totals.non_justifiee >= 36 && (
            <p className="text-xs mt-0.5 font-medium text-red-600 dark:text-red-400">
              {totals.non_justifiee >= 54 ? 'Risque de suspension' : 'Avertissement OFPPT'}
            </p>
          )}
        </button>
        <button
          onClick={() => setFilterStatus('en_attente')}
          className={`text-left bg-white dark:bg-gray-800 rounded-xl border p-4 transition-colors ${
            filterStatus === 'en_attente' ? 'border-yellow-500 ring-2 ring-yellow-100 dark:ring-yellow-900/30' : 'border-gray-100 dark:border-gray-700 hover:border-gray-300'
          }`}
        >
          <p className="text-sm text-gray-500 dark:text-gray-400">En attente</p>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{totals.en_attente}h</p>
        </button>
      </div>

      {/* Absence list */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Détail des absences</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{visibleAbsences.length} ligne{visibleAbsences.length > 1 ? 's' : ''}</p>
          </div>
          {filterStatus && (
            <button
              onClick={() => setFilterStatus('')}
              className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-red-600"
            >
              <HiX className="h-3.5 w-3.5" /> Retirer le filtre
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Horaire</th>
                <th className="px-4 py-3 text-left font-medium">Module</th>
                <th className="px-4 py-3 text-left font-medium">Motif / Doc</th>
                <th className="px-4 py-3 text-left font-medium">Statut</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">Chargement...</td></tr>
              ) : visibleAbsences.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                  {filterStatus ? 'Aucune absence dans cette catégorie' : 'Aucune absence enregistrée'}
                </td></tr>
              ) : visibleAbsences.map(a => (
                <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{formatDate(a.date_absence)}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{a.heure_debut?.slice(0,5)} - {a.heure_fin?.slice(0,5)}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{a.module?.nom || '-'}</td>
                  <td className="px-4 py-3">{renderMotif(a)}</td>
                  <td className="px-4 py-3">{statusBadge(a.status)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="relative inline-block">
                      <button
                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === a.id ? null : a.id); }}
                        className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      >
                        <HiDotsHorizontal className="h-5 w-5" />
                      </button>
                      {openMenuId === a.id && (
                        <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-20 min-w-[210px]">
                          {a.status !== 'justifiee' && (
                            <button onClick={(e) => { e.stopPropagation(); openStatusEdit(a, 'justifiee'); }} className="w-full text-left px-3 py-2 text-sm text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center gap-2">
                              <HiCheck className="h-4 w-4" /> Marquer justifiée
                            </button>
                          )}
                          {a.status !== 'en_attente' && (
                            <button onClick={(e) => { e.stopPropagation(); openStatusEdit(a, 'en_attente'); }} className="w-full text-left px-3 py-2 text-sm text-yellow-700 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 flex items-center gap-2">
                              <HiClock className="h-4 w-4" /> Mettre en attente
                            </button>
                          )}
                          {a.status !== 'non_justifiee' && (
                            <button onClick={(e) => { e.stopPropagation(); quickSetStatus(a, 'non_justifiee'); }} className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2">
                              <HiBan className="h-4 w-4" /> Marquer non justifiée
                            </button>
                          )}
                          <hr className="my-1 border-gray-100 dark:border-gray-700" />
                          <button onClick={(e) => { e.stopPropagation(); openStatusEdit(a, a.status); }} className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-2">
                            <HiPencil className="h-4 w-4" /> Modifier note/motif
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(a); }} className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2">
                            <HiX className="h-4 w-4" /> Supprimer
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status edit modal */}
      <Modal
        isOpen={statusEditOpen}
        onClose={() => setStatusEditOpen(false)}
        title="Modifier le statut"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setStatusEditOpen(false)}>Annuler</Button>
            <Button onClick={handleSaveStatus} loading={savingStatus}>Enregistrer</Button>
          </>
        }
      >
        {statusEditing && (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-sm">
              <p className="text-gray-500 dark:text-gray-400">Absence</p>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {statusEditing.module?.nom || '—'}{' · '}{formatDate(statusEditing.date_absence)}{' · '}{statusEditing.heure_debut?.slice(0,5)}-{statusEditing.heure_fin?.slice(0,5)}
              </p>
            </div>
            <Select
              label="Nouveau statut"
              value={newStatus}
              onChange={e => setNewStatus(e.target.value)}
              options={[
                { value: 'non_justifiee', label: 'Non justifiée' },
                { value: 'en_attente',    label: 'En attente (motif verbal)' },
                { value: 'justifiee',     label: 'Justifiée (document fourni)' },
              ]}
              required
            />
            {newStatus === 'en_attente' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Motif verbal</label>
                <textarea
                  value={statusNote}
                  onChange={e => setStatusNote(e.target.value)}
                  rows={3}
                  placeholder="Ex: maladie, rendez-vous médical..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-gray-100 placeholder-gray-400"
                />
              </div>
            )}
            {newStatus === 'justifiee' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Document justificatif <span className="text-red-500">*</span>
                  </label>
                  {statusEditing?.justification && !justifFile && (
                    <div className="mb-2 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
                      <HiDocumentText className="h-4 w-4 text-primary-500" />
                      <span>Document actuel conservé si aucun nouveau fichier n'est choisi</span>
                    </div>
                  )}
                  <label className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,application/pdf"
                      className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) {
                          if (f.size > 5 * 1024 * 1024) {
                            toast.error('Fichier trop lourd (max 5 Mo)');
                            return;
                          }
                          setJustifFile(f);
                        }
                      }}
                    />
                    <HiDocumentText className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                    <div className="flex-1">
                      {justifFile ? (
                        <>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{justifFile.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{(justifFile.size / 1024).toFixed(1)} Ko</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Choisir un fichier</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG ou PDF — max 5 Mo</p>
                        </>
                      )}
                    </div>
                    {justifFile && (
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setJustifFile(null); }}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
                        <HiX className="h-4 w-4" />
                      </button>
                    )}
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Note (optionnel)</label>
                  <textarea
                    value={statusNote}
                    onChange={e => setStatusNote(e.target.value)}
                    rows={2}
                    placeholder="Ex: certificat médical du Dr. Bennani"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-gray-100 placeholder-gray-400"
                  />
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Document Preview */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setPreviewDoc(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Justificatif</h3>
              <button onClick={() => setPreviewDoc(null)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <HiX className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 overflow-auto max-h-[calc(90vh-80px)]">
              {previewDoc.toLowerCase().endsWith('.pdf') ? (
                <iframe src={previewDoc} title="Justificatif" className="w-full h-[75vh] rounded-lg border border-gray-200 dark:border-gray-700" />
              ) : (
                <img src={previewDoc} alt="Justificatif" className="max-w-full h-auto rounded-lg shadow-sm mx-auto" />
              )}
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 break-all">
                <a href={previewDoc} target="_blank" rel="noreferrer" className="hover:underline">Ouvrir dans un nouvel onglet ↗</a>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SurveillantAbsenceDetailPage;
