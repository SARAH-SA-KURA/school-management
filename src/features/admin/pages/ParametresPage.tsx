import React, { useState, useRef, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { Button, Input } from '../../../components/ui';
import { HiPencil, HiEye, HiEyeOff, HiCheckCircle } from 'react-icons/hi';
import toast from 'react-hot-toast';

type Tab = 'account' | 'security' | 'notification';

const ParametresPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as Tab | null;
  const [activeTab, setActiveTab] = useState<Tab>(tabParam || 'account');
  const [showOldPwd, setShowOldPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('La taille du fichier ne doit pas dépasser 5 Mo');
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        setAvatarPreview(ev.target?.result as string);
        toast.success('Photo mise à jour');
      };
      reader.readAsDataURL(file);
    }
  };

  const [profile, setProfile] = useState({
    firstName: user?.prenom || 'Ahemed',
    lastName: user?.nom || 'Hamoudi',
    anneeScolaire: '2025-2026',
    gender: 'Male',
    birthday: '23 Desember 2003',
    etablissement: 'ISTA – Institut Spécialisé de Technologie Appliquée',
    phone: '+212 647 1723 1123',
    email: user?.email || 'ahemed@gmail.com',
    address: 'Ben guerir, Hay salam',
  });

  const [passwords, setPasswords] = useState({ old: '', new: '', confirm: '' });
  const [notifications, setNotifications] = useState({ email: true, exams: true, system: false });

  const tabs: { key: Tab; label: string }[] = [
    { key: 'account', label: 'Account' },
    { key: 'security', label: 'Security' },
    { key: 'notification', label: 'Notification' },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Paramètre généraux</h1>
        <p className="text-sm text-gray-500">
          <Link to="/admin" className="text-primary-600 hover:text-primary-700">Tableau de bord</Link>
          {' / '}
          <span className="text-primary-600">Paramètres</span>
          {' / '}
          <span>Paramètres généraux</span>
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border border-gray-200 rounded-xl overflow-hidden mb-6">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.key ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Account Tab */}
      {activeTab === 'account' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Profile Information</h2>

            {/* Avatar */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gray-200 rounded-xl overflow-hidden">
                <img src={avatarPreview || user?.avatar || '/images/logo.png'} alt="avatar" className="w-full h-full object-cover" />
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                Change Pictures <HiPencil className="h-4 w-4" />
              </button>
            </div>

            {/* Fields */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input value={profile.firstName} onChange={(e) => setProfile({...profile, firstName: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input value={profile.lastName} onChange={(e) => setProfile({...profile, lastName: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Anneé scolaire</label>
                <input value={profile.anneeScolaire} onChange={(e) => setProfile({...profile, anneeScolaire: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <input value={profile.gender} onChange={(e) => setProfile({...profile, gender: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Birthday</label>
                <input value={profile.birthday} onChange={(e) => setProfile({...profile, birthday: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Non de l'établisement</label>
                <input value={profile.etablissement} onChange={(e) => setProfile({...profile, etablissement: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={() => toast.success('Profil mis à jour')}>Update</Button>
              <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">Cancel</button>
            </div>
          </div>

          {/* Contact Detail */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Contact Detail</h2>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                Edit <HiPencil className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input value={profile.phone} readOnly className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input value={profile.email} readOnly className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Addres</label>
                <input value={profile.address} readOnly className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Password</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Old Password</label>
              <div className="relative">
                <input type={showOldPwd ? 'text' : 'password'} value={passwords.old}
                  onChange={(e) => setPasswords({...passwords, old: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm pr-10" />
                <button onClick={() => setShowOldPwd(!showOldPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showOldPwd ? <HiEye className="h-5 w-5" /> : <HiEyeOff className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <div className="relative">
                <input type={showNewPwd ? 'text' : 'password'} value={passwords.new}
                  onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm pr-10" />
                <button onClick={() => setShowNewPwd(!showNewPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showNewPwd ? <HiEye className="h-5 w-5" /> : <HiEyeOff className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <div className="relative">
                <input type={showConfirmPwd ? 'text' : 'password'} value={passwords.confirm}
                  onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm pr-10" />
                <button onClick={() => setShowConfirmPwd(!showConfirmPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showConfirmPwd ? <HiEye className="h-5 w-5" /> : <HiEyeOff className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-2 mb-6">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <HiCheckCircle className="h-5 w-5 text-green-500" /> Minimum 8 characters.
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <HiCheckCircle className="h-5 w-5 text-green-500" /> Use combination of uppercase and lowercase letters.
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <HiCheckCircle className="h-5 w-5 text-green-500" /> Use of special characters (e.g., !, @, #, $, %)
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={() => toast.success('Mot de passe mis à jour')}>Update Password</Button>
            <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">Cancel</button>
          </div>
        </div>
      )}

      {/* Notification Tab */}
      {activeTab === 'notification' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Notification</h2>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-base font-medium text-gray-800">Notifications par email</span>
              <button onClick={() => setNotifications({...notifications, email: !notifications.email})}
                className={`relative w-12 h-6 rounded-full transition-colors ${notifications.email ? 'bg-primary-600' : 'bg-gray-300'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${notifications.email ? 'left-6' : 'left-0.5'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-base font-medium text-gray-800">Alertes d'examens / notes</span>
              <button onClick={() => setNotifications({...notifications, exams: !notifications.exams})}
                className={`relative w-12 h-6 rounded-full transition-colors ${notifications.exams ? 'bg-primary-600' : 'bg-gray-300'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${notifications.exams ? 'left-6' : 'left-0.5'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-base font-medium text-gray-800">Mises à jour système</span>
              <button onClick={() => setNotifications({...notifications, system: !notifications.system})}
                className={`relative w-12 h-6 rounded-full transition-colors ${notifications.system ? 'bg-primary-600' : 'bg-gray-300'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${notifications.system ? 'left-6' : 'left-0.5'}`} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-8">
            <Button onClick={() => toast.success('Notifications sauvegardées')}>Enregistrer</Button>
            <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParametresPage;
