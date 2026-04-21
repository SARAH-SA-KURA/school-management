import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useTheme } from '../../../contexts/ThemeContext';
import { HiPencil, HiEye, HiEyeOff, HiCheck } from 'react-icons/hi';
import toast from 'react-hot-toast';
import axiosInstance from '../../../utils/axios';
import { useAppDispatch } from '../../../app/hooks';
import { setUser } from '../../auth/authSlice';
import { storage } from '../../../utils/storage';

interface FormateurProfile { specialisation: string; }

const getAnneeScolaire = () => {
  const y = new Date().getFullYear();
  return new Date().getMonth() >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
};

const FormateurParametresPage: React.FC = () => {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'account';

  // ── Avatar ────────────────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(() => storage.getAvatar());

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Fichier non valide'); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      const b64 = ev.target?.result as string;
      setAvatarPreview(b64);
      storage.setAvatar(b64);
      window.dispatchEvent(new Event('avatarUpdated'));
      toast.success('Photo mise à jour');
    };
    reader.readAsDataURL(file);
  };

  // ── Formateur extra info ──────────────────────────────────────────────────
  const [formateurProfile, setFormateurProfile] = useState<FormateurProfile | null>(null);
  useEffect(() => {
    axiosInstance.get('/auth/formateur').then(r => setFormateurProfile(r.data.data ?? r.data)).catch(() => {});
  }, []);

  // ── Account form ──────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    prenom: '', nom: '', telephone: '', address: '',
    specialite: '', anneeScolaire: getAnneeScolaire(),
  });
  const [savingAccount, setSavingAccount] = useState(false);
  const [editingContact, setEditingContact] = useState(false);

  useEffect(() => {
    const s = storage.getUser();
    if (!s) return;
    setForm(p => ({ ...p, prenom: s.prenom || '', nom: s.nom || '', telephone: s.telephone || '' }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (formateurProfile?.specialisation)
      setForm(p => ({ ...p, specialite: formateurProfile.specialisation }));
  }, [formateurProfile]);

  const handleAccountSave = async () => {
    const cu = storage.getUser();
    if (!cu?.id) { toast.error('Session expirée'); return; }
    setSavingAccount(true);
    try {
      const res = await axiosInstance.post('/auth/profile', {
        nom: form.nom, prenom: form.prenom, telephone: form.telephone || null,
      });
      const updated = { ...cu, ...(res.data.data ?? {}) };
      storage.setUser(updated);
      dispatch(setUser(updated));
      toast.success('Profil mis à jour');
      setEditingContact(false);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erreur');
    } finally { setSavingAccount(false); }
  };

  const handleCancel = () => {
    const s = storage.getUser();
    setForm(p => ({ ...p, prenom: s?.prenom || '', nom: s?.nom || '', telephone: s?.telephone || '' }));
    setEditingContact(false);
  };

  // ── Password ──────────────────────────────────────────────────────────────
  const [pwd, setPwd] = useState({ current: '', newPwd: '', confirm: '' });
  const [showPwd, setShowPwd] = useState({ current: false, newPwd: false, confirm: false });
  const [savingPwd, setSavingPwd] = useState(false);
  const pwdMinLength = pwd.newPwd.length >= 8;
  const pwdMixed    = /[a-z]/.test(pwd.newPwd) && /[A-Z]/.test(pwd.newPwd);
  const pwdSpecial  = /[@#$%^&*!]/.test(pwd.newPwd);

  const handlePwdSave = async () => {
    if (pwd.newPwd !== pwd.confirm) { toast.error('Mots de passe différents'); return; }
    if (!pwdMinLength) { toast.error('Minimum 8 caractères'); return; }
    setSavingPwd(true);
    try {
      await axiosInstance.post('/auth/change-password', {
        current_password: pwd.current,
        new_password: pwd.newPwd,
        new_password_confirmation: pwd.confirm,
      });
      toast.success('Mot de passe modifié');
      setPwd({ current: '', newPwd: '', confirm: '' });
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erreur');
    } finally { setSavingPwd(false); }
  };

  // ── Notifications ─────────────────────────────────────────────────────────
  const [notifs, setNotifs] = useState({ email: true, examens: false, systeme: true });
  const [savingNotifs, setSavingNotifs] = useState(false);
  const handleNotifsSave = async () => {
    setSavingNotifs(true);
    await new Promise(r => setTimeout(r, 400));
    setSavingNotifs(false);
    toast.success('Notifications enregistrées');
  };

  const initials = `${user?.prenom?.[0] ?? ''}${user?.nom?.[0] ?? ''}`.toUpperCase();

  // ── Figma design tokens ───────────────────────────────────────────────────
  // Colors from Figma:
  // #1A71F6  = primary blue (active tab text, buttons)
  // #D9EDFF  = active tab bg (light blue)
  // #737373  = inactive tab text
  // #D1D1D1  = border (tab bar, inputs)
  // #E7E7E7  = card border (lighter)
  // #E7E7E7  = disabled input bg (same hex)
  // #323130  = label text (Dark Grey)
  // #454545  = body text
  // #B0B0B0  = edit button border

  // Card — dark: deep slate bg, subtle white border
  const card = `rounded-[24px] border p-6 ${
    isDark ? 'bg-gray-900 border-white/10' : 'bg-white border-[#E7E7E7]'
  }`;

  // Input label
  const lbl = `block text-sm font-bold mb-1.5 ${isDark ? 'text-gray-400' : 'text-[#323130]'}`;

  // Input — dark: dark bg, visible border, clear text
  const inp = (disabled?: boolean) =>
    `w-full border rounded-xl px-4 py-3 text-sm outline-none transition-colors ${
      disabled
        ? isDark
          ? 'bg-white/5 border-white/10 text-gray-600 cursor-default'
          : 'bg-[#E7E7E7] border-[#D1D1D1] text-[#737373] cursor-default'
        : isDark
          ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20'
          : 'bg-white border-[#D1D1D1] text-[#454545] focus:border-[#1A71F6]'
    }`;

  // Primary button
  const btnPrimary = `px-6 py-3 rounded-xl text-sm font-bold bg-[#1A71F6] hover:bg-blue-600 text-white transition-colors disabled:opacity-50`;

  // Cancel button — text only
  const btnText = `px-4 py-3 text-sm font-bold transition-colors ${
    isDark ? 'text-blue-400 hover:text-blue-300' : 'text-[#1A71F6] hover:text-blue-700'
  }`;

  // Section title
  const sectionTitle = `text-[22px] font-semibold leading-tight ${isDark ? 'text-white' : 'text-[#454545]'}`;

  const Req = ({ ok, text }: { ok: boolean; text: string }) => (
    <div className="flex items-center gap-2">
      <span className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
        ok ? 'bg-green-500' : isDark ? 'bg-gray-700' : 'bg-gray-200'
      }`}>
        {ok && <HiCheck className="w-2.5 h-2.5 text-white" />}
      </span>
      <span className={`text-xs font-medium ${
        ok ? isDark ? 'text-green-400' : 'text-green-600'
           : isDark ? 'text-gray-500' : 'text-[#737373]'
      }`}>{text}</span>
    </div>
  );

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button onClick={onChange} className={`relative inline-flex h-5 w-9 rounded-full transition-colors focus:outline-none flex-shrink-0 ${
      checked ? 'bg-blue-500' : isDark ? 'bg-gray-700' : 'bg-gray-300'
    }`}>
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform mt-0.5 ${
        checked ? 'translate-x-4' : 'translate-x-0.5'
      }`} />
    </button>
  );

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-950' : 'bg-gray-50'}`}>

      {/* ── Breadcrumb ── */}
      <div className="mb-5">
        <h1 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Paramètre généraux</h1>
        <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          <Link to="/formateur/dashboard" className="text-[#1A71F6] hover:underline">Tableau de bord</Link>
          {' / '}
          <span>Paramètres</span>
          {' / '}
          <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Paramètre généraux</span>
        </p>
      </div>

      {/* ── Tab Bar — standalone card, full width ── */}
      {/* Figma: white bg, #D1D1D1 border, 14px radius, padding 8px 12px, gap 8px */}
      {/* Each tab is flex-1 (equal thirds), active fills its section with #D9EDFF */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-[14px] border w-full mb-5 ${
        isDark ? 'bg-gray-800 border-gray-600' : 'bg-white border-[#D1D1D1]'
      }`}>
        {(['account', 'security', 'notification'] as const).map(t => {
          const label = { account: 'Account', security: 'Security', notification: 'Notification' }[t];
          const isActive = activeTab === t;
          return (
            <button
              key={t}
              onClick={() => setSearchParams({ tab: t })}
              className={`flex-1 text-sm font-bold transition-colors rounded-lg text-center ${
                isActive
                  ? 'bg-[#D9EDFF] text-[#1A71F6] py-1.5'
                  : `py-1 ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-[#737373] hover:text-gray-900'}`
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ══════════════════ ACCOUNT TAB ══════════════════ */}
      {activeTab === 'account' && (
        <div className="flex flex-col gap-5">

          {/* Profile Information Card */}
          <div className={card}>
            <p className={`${sectionTitle} mb-5`}>Profile Information</p>

            {/* Avatar + Change Pictures */}
            <div className="flex items-center gap-3 mb-5">
              {/* Avatar — 73x68 rectangle, 12px radius */}
              <div className="cursor-pointer flex-shrink-0" onClick={() => fileInputRef.current?.click()}>
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="avatar"
                    className="w-[68px] h-[68px] rounded-xl object-cover"
                  />
                ) : (
                  <div className={`w-[68px] h-[68px] rounded-xl flex items-center justify-center text-white font-bold text-lg select-none ${
                    isDark ? 'bg-[#1A71F6]/70' : 'bg-[#1A71F6]'
                  }`}>
                    {initials}
                  </div>
                )}
              </div>

              {/* Change Pictures button — border #B0B0B0, radius 12px, padding 8px 8px 8px 12px */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`flex items-center gap-1.5 pl-3 pr-2 py-2 rounded-xl text-xs font-bold border transition-colors ${
                  isDark
                    ? 'border-gray-500 text-gray-300 hover:bg-gray-700'
                    : 'border-[#B0B0B0] text-[#454545] hover:bg-gray-50'
                }`}
              >
                Change Pictures
                <HiPencil className="w-3 h-3 text-[#1A71F6]" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>

            {/* Row 1: First Name | Last Name | Année scolaire */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className={lbl}>First Name</label>
                <input value={form.prenom} onChange={e => setForm(p => ({ ...p, prenom: e.target.value }))} className={inp()} placeholder="Prénom" />
              </div>
              <div>
                <label className={lbl}>Last Name</label>
                <input value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} className={inp()} placeholder="Nom" />
              </div>
              <div>
                <label className={lbl}>Année scolaire</label>
                <input value={form.anneeScolaire} readOnly className={inp(true)} />
              </div>
            </div>

            {/* Row 2: Garde | Spécialité | Nom de l'établissement */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <label className={lbl}>Garde</label>
                <input value="Formateur" readOnly className={inp(true)} />
              </div>
              <div>
                <label className={lbl}>Spécialité</label>
                <input value={form.specialite} readOnly className={inp(true)} />
              </div>
              <div>
                <label className={lbl}>Nom de l'établissement</label>
                <input value="ISTA - Institut Spécialisé de Technologie Appliquée" readOnly className={inp(true)} />
              </div>
            </div>

            {/* CTA row — gap 16px, Update (primary) + Cancel (text/blue) */}
            <div className="flex items-center gap-4">
              <button onClick={handleAccountSave} disabled={savingAccount} className={btnPrimary}>
                {savingAccount ? 'Updating...' : 'Update'}
              </button>
              <button onClick={handleCancel} className={btnText}>Cancel</button>
            </div>
          </div>

          {/* Contact Detail Card */}
          <div className={card}>
            {/* Header row: title (space-between) edit button */}
            <div className="flex items-center justify-between mb-5">
              <p className={sectionTitle}>Contact Detail</p>
              {/* Edit button — border #B0B0B0, radius 12px, padding 8px 8px 8px 12px */}
              <button
                onClick={() => setEditingContact(v => !v)}
                className={`flex items-center gap-1.5 pl-3 pr-2 py-2 rounded-xl text-xs font-bold border transition-colors ${
                  isDark
                    ? 'border-gray-500 text-gray-300 hover:bg-gray-700'
                    : 'border-[#B0B0B0] text-[#454545] hover:bg-gray-50'
                }`}
              >
                {editingContact ? 'Done' : 'Edit'}
                <HiPencil className="w-3 h-3 text-[#1A71F6]" />
              </button>
            </div>

            {/* Contact fields — Phone | Email | Address */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={lbl}>Phone Number</label>
                <input type="tel" value={form.telephone || ''} onChange={e => setForm(p => ({ ...p, telephone: e.target.value }))} readOnly={!editingContact} placeholder={editingContact ? '+212...' : '—'} className={inp(!editingContact)} />
              </div>
              <div>
                <label className={lbl}>Email</label>
                <input value={user?.email || '—'} readOnly className={inp(true)} />
              </div>
              <div>
                <label className={lbl}>Address</label>
                <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} readOnly={!editingContact} placeholder={editingContact ? 'Votre adresse' : '—'} className={inp(!editingContact)} />
              </div>
            </div>

            {editingContact && (
              <div className="flex items-center gap-4 mt-5">
                <button onClick={handleAccountSave} disabled={savingAccount} className={btnPrimary}>
                  {savingAccount ? 'Saving...' : 'Save'}
                </button>
                <button onClick={() => setEditingContact(false)} className={btnText}>Cancel</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════ SECURITY TAB ══════════════════ */}
      {activeTab === 'security' && (
        <div className={card}>
          <p className={`${sectionTitle} mb-5`}>Password</p>

          {/* 3 password fields */}
          <div className="grid grid-cols-3 gap-4 mb-5">
            {(['current', 'newPwd', 'confirm'] as const).map(k => {
              const labels = { current: 'Old Password', newPwd: 'New Password', confirm: 'Confirm Password' };
              return (
                <div key={k}>
                  <label className={lbl}>{labels[k]}</label>
                  <div className="relative">
                    <input
                      type={showPwd[k] ? 'text' : 'password'}
                      value={pwd[k]}
                      onChange={e => setPwd(p => ({ ...p, [k]: e.target.value }))}
                      className={`${inp()} pr-10`}
                    />
                    <button type="button" onClick={() => setShowPwd(p => ({ ...p, [k]: !p[k] }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPwd[k] ? <HiEyeOff className="h-4 w-4" /> : <HiEye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Requirements checklist */}
          <div className="flex flex-col gap-2 mb-6">
            <Req ok={pwdMinLength} text="Minimum 8 characters" />
            <Req ok={pwdMixed}     text="Use a combination of uppercase and lowercase letters" />
            <Req ok={pwdSpecial}   text="Use of special characters (e.g., @, #, $, %)" />
          </div>

          <div className="flex items-center gap-4">
            <button onClick={handlePwdSave} disabled={savingPwd} className={btnPrimary}>
              {savingPwd ? 'Updating...' : 'Update Password'}
            </button>
            <button onClick={() => setPwd({ current: '', newPwd: '', confirm: '' })} className={btnText}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════ NOTIFICATION TAB ══════════════════ */}
      {activeTab === 'notification' && (
        <div className={card}>
          <p className={`${sectionTitle} mb-5`}>Notification</p>

          <div className="space-y-4 mb-6">
            {([
              { k: 'email',   label: 'Notifications par email' },
              { k: 'examens', label: "Alertes d'examens / notes" },
              { k: 'systeme', label: 'Mises à jour système' },
            ] as const).map(({ k, label }) => (
              <div key={k} className="flex items-center justify-between">
                <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-[#454545]'}`}>{label}</span>
                <Toggle checked={notifs[k]} onChange={() => setNotifs(p => ({ ...p, [k]: !p[k] }))} />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <button onClick={handleNotifsSave} disabled={savingNotifs} className={btnPrimary}>
              {savingNotifs ? 'Saving...' : 'Enregistrer'}
            </button>
            <button onClick={() => setNotifs({ email: true, examens: false, systeme: true })} className={btnText}>
              Annuler
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default FormateurParametresPage;
