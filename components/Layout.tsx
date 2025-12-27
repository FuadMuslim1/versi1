import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { logout, db } from '../firebase';
import { 
  Menu, X, LogOut, LayoutDashboard, Bell, BookOpen, 
  TrendingUp, Gift, ExternalLink, ChevronRight, Coins, Smartphone
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';

interface LayoutProps {
  children: React.ReactNode;
  user: UserProfile | null;
  title: string;
}

// Simple Modal Component Internal
const Modal: React.FC<{ title: string, onClose: () => void, children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <h3 className="font-bold text-lg text-slate-800">{title}</h3>
        <button onClick={onClose} className="p-2 bg-slate-200 rounded-full hover:bg-slate-300 transition-colors">
          <X size={16} className="text-slate-600" />
        </button>
      </div>
      <div className="p-6 max-h-[70vh] overflow-y-auto">
        {children}
      </div>
    </div>
  </div>
);

export const Layout: React.FC<LayoutProps> = ({ children, user, title }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // --- GLOBAL STATE FOR MODALS ---
  const [activeModal, setActiveModal] = useState<'NONE' | 'PROGRESS' | 'REWARD' | 'TUTORIAL'>('NONE');
  const [showNotification, setShowNotification] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

  // Trigger untuk update progress bar saat local storage berubah
  const [progressUpdateTrigger, setProgressUpdateTrigger] = useState(0);

  // --- REALTIME NOTIFICATIONS STATE ---
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    // Listener khusus untuk update progress bar dari Pronunciation Page
    const handleStorageUpdate = () => {
        setProgressUpdateTrigger(prev => prev + 1);
    };
    window.addEventListener('storage_update_pronunciation', handleStorageUpdate);
    return () => window.removeEventListener('storage_update_pronunciation', handleStorageUpdate);
  }, []);

  useEffect(() => {
    if (!user || !user.email) return;

    // 1. QUERY BROADCASTS (All Users)
    const qBroadcast = query(
        collection(db, 'admin_notification'),
        where('target', '==', 'ALL'),
        limit(5)
    );

    // 2. QUERY PERSONAL NOTIFICATIONS (Reward Payouts, etc)
    const qPersonal = query(
        collection(db, 'user_notifications'),
        where('userEmail', '==', user.email),
        limit(10)
    );

    const unsubscribeBroadcast = onSnapshot(qBroadcast, (snap) => {
        const broadcasts = snap.docs.map(d => ({ id: d.id, ...d.data(), type: 'BROADCAST' }));
        updateNotificationsList(broadcasts, 'BROADCAST');
    });

    const unsubscribePersonal = onSnapshot(qPersonal, (snap) => {
        const personals = snap.docs.map(d => ({ id: d.id, ...d.data(), type: 'PERSONAL' }));
        updateNotificationsList(personals, 'PERSONAL');
    });

    return () => {
        unsubscribeBroadcast();
        unsubscribePersonal();
    };
  }, [user]);

  // Helper untuk merge notification lists
  const [rawBroadcasts, setRawBroadcasts] = useState<any[]>([]);
  const [rawPersonals, setRawPersonals] = useState<any[]>([]);

  const updateNotificationsList = (newData: any[], type: 'BROADCAST' | 'PERSONAL') => {
      if (type === 'BROADCAST') setRawBroadcasts(newData);
      if (type === 'PERSONAL') setRawPersonals(newData);
  };

  useEffect(() => {
      const combined = [...rawBroadcasts, ...rawPersonals].sort((a, b) => {
          const tA = a.createdAt?.seconds || 0;
          const tB = b.createdAt?.seconds || 0;
          return tB - tA; // Newest first
      });
      setNotifications(combined);
  }, [rawBroadcasts, rawPersonals]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const tutorialItems = [
    { title: 'Cara Melihat Progress', desc: 'Klik menu "View Progress" lalu pilih level bahasa inggris Anda (A1-C2).' },
    { title: 'Cara Mengklaim Reward', desc: 'Kumpulkan poin dari latihan soal dan tukarkan di menu "Reward".' },
  ];

  const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  
  // LOGIC: GET PROGRESS DATA
  // Jika Level A1, ambil data Pronunciation dari LocalStorage
  const getProgressData = (level: string) => {
    const base = level.charCodeAt(1); 
    
    let pronValue = (base * 2) % 100; // Default dummy untuk yang lain

    if (level === 'A1') {
      const savedPron = localStorage.getItem('geuwat_local_progress_pronunciation');
      if (savedPron) {
        const scores = JSON.parse(savedPron);
        const values = Object.values(scores) as number[];
        if (values.length > 0) {
          // LOGIKA UTAMA: 
          // Total Score dibagi 4 (karena ada 4 modul di Pronunciation Menu).
          // Jika baru mengerjakan 1 dari 4, progress bar akan terisi 25% (jika nilai 100).
          const sum = values.reduce((a, b) => a + b, 0);
          pronValue = Math.round(sum / 4); 
        } else {
          pronValue = 0;
        }
      } else {
        pronValue = 0;
      }
    }

    return [
      { subject: 'Pronunciation', value: pronValue, isLocal: level === 'A1' },
      { subject: 'Vocabulary', value: (base * 3) % 100 },
      { subject: 'Grammar', value: (base * 4) % 100 },
      { subject: 'Speaking', value: (base * 5) % 100 },
    ];
  };

  const formatNumber = (num?: number) => {
    return num ? new Intl.NumberFormat('id-ID').format(num) : '0';
  };

  // --- NAVIGATION ITEM COMPONENT ---
  const NavItem = ({ icon: Icon, label, onClick, isActive, colorClass }: { icon: any, label: string, onClick: () => void, isActive?: boolean, colorClass?: string }) => {
    return (
      <button 
        onClick={() => {
          onClick();
          setIsSidebarOpen(false); // Close sidebar on mobile after click
        }}
        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 font-medium 
          ${isActive 
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
            : 'text-slate-500 hover:bg-slate-50'
          }`}
      >
        <div className={`${isActive ? 'text-white' : colorClass || 'text-slate-400'}`}>
          <Icon size={22} />
        </div>
        <span>{label}</span>
        {!isActive && <ChevronRight size={16} className="ml-auto opacity-0 group-hover:opacity-50" />}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`
        fixed lg:sticky top-0 left-0 h-screen w-[280px] bg-white border-r border-slate-100 z-50
        transition-transform duration-300 ease-in-out flex flex-col
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 flex flex-col h-full">
          {/* Header - LOGO ONLY (Text Removed) */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-indigo-200 shadow-md transform rotate-3">
                <span className="text-white font-bold text-xl">G</span>
              </div>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400">
              <X size={24} />
            </button>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 space-y-2 overflow-y-auto">
             <NavItem 
                icon={LayoutDashboard} 
                label="Dashboard" 
                onClick={() => navigate('/dashboard')} 
                isActive={location.pathname === '/dashboard'} 
             />
             
             <div className="pt-4 pb-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-4 mb-2">Activities</p>
                <NavItem 
                    icon={TrendingUp} 
                    label="View Progress" 
                    onClick={() => setActiveModal('PROGRESS')} 
                    colorClass="text-emerald-500"
                />
                <NavItem 
                    icon={Gift} 
                    label="Rewards" 
                    onClick={() => setActiveModal('REWARD')} 
                    colorClass="text-amber-500"
                />
                <NavItem 
                    icon={BookOpen} 
                    label="Tutorial" 
                    onClick={() => setActiveModal('TUTORIAL')} 
                    colorClass="text-blue-500"
                />
             </div>
          </div>

          {/* User Footer */}
          <div className="mt-auto pt-6 border-t border-slate-100">
            <div className="flex items-center gap-3 mb-4 p-3 bg-slate-50 rounded-2xl">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-indigo-500 font-bold border border-indigo-100">
                  {user?.displayName?.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate">{user?.displayName}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-red-600 hover:bg-red-50 py-3 rounded-xl transition-colors text-sm font-bold"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col h-screen">
        {/* HEADER (Mobile & Desktop) */}
        <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-100 z-30 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden text-slate-500 hover:bg-slate-50 p-2 rounded-lg">
              <Menu size={24} />
            </button>
          </div>
          
          {/* Notification Bell (Top Right) */}
          <div className="relative">
            <button 
              onClick={() => setShowNotification(!showNotification)}
              className="relative p-2 text-slate-400 hover:bg-slate-50 rounded-full transition-colors"
            >
               <Bell size={24} />
               {notifications.length > 0 && (
                   <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white animate-pulse"></span>
               )}
            </button>

            {/* Notification Dropdown */}
            {showNotification && (
              <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 p-4 animate-in fade-in slide-in-from-top-2">
                <div className="flex justify-between items-center mb-3 px-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Notifications</h4>
                    <button onClick={() => setShowNotification(false)}><X size={14} className="text-slate-400"/></button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {notifications.length === 0 ? (
                      <div className="text-center py-4 text-slate-400 text-xs">Tidak ada notifikasi baru.</div>
                  ) : (
                      notifications.map(notif => (
                        <div key={notif.id} className={`p-3 rounded-xl transition-colors ${notif.type === 'PERSONAL' ? 'bg-indigo-50 border border-indigo-100' : 'bg-slate-50'}`}>
                          <h5 className="font-bold text-slate-800 text-sm flex items-center gap-1">
                             {notif.title}
                             {notif.type === 'PERSONAL' && <span className="bg-indigo-500 w-1.5 h-1.5 rounded-full"></span>}
                          </h5>
                          <p className="text-xs text-slate-500 mt-1 leading-snug">{notif.message || notif.desc}</p>
                          {notif.link && (
                            <a href={notif.link} className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 mt-2 hover:underline">
                                Lihat Detail <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                      ))
                  )}
                </div>
              </div>
            )}
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-5xl mx-auto">
            {children}
          </div>
        </div>
      </main>

      {/* --- SHARED MODALS --- */}
      
      {/* 1. PROGRESS MODAL */}
      {activeModal === 'PROGRESS' && (
        <Modal title="Your Learning Progress" onClose={() => { setActiveModal('NONE'); setSelectedLevel(null); }}>
          {!selectedLevel ? (
            <div className="text-center">
              <p className="text-sm text-slate-500 mb-4">Pilih Level Bahasa Inggris Anda untuk melihat statistik:</p>
              <div className="grid grid-cols-2 gap-3">
                {levels.map(lvl => (
                  <button 
                    key={lvl} 
                    onClick={() => setSelectedLevel(lvl)}
                    className="p-4 rounded-xl border-2 border-slate-100 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 font-bold text-slate-600 transition-all text-lg"
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="animate-in slide-in-from-right-4 duration-300">
               <button onClick={() => setSelectedLevel(null)} className="mb-4 text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1">
                 ← Pilih Level Lain
               </button>
               <div className="flex items-center justify-between mb-6">
                 <h4 className="font-bold text-2xl text-slate-800">Level {selectedLevel}</h4>
                 <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">Active</div>
               </div>
               
               <div className="space-y-4">
                 {getProgressData(selectedLevel).map((stat) => (
                   <div key={stat.subject}>
                     <div className="flex justify-between text-sm mb-1">
                       <span className="font-medium text-slate-600 flex items-center gap-1">
                         {stat.subject}
                         {stat.isLocal && <Smartphone size={12} className="text-slate-400" />}
                       </span>
                       <span className="font-bold text-slate-800">{stat.value}%</span>
                     </div>
                     <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                       <div 
                         className="bg-emerald-500 h-full rounded-full transition-all duration-1000 ease-out" 
                         style={{ width: `${stat.value}%` }}
                       />
                     </div>
                   </div>
                 ))}
               </div>

               {selectedLevel === 'A1' && (
                  <div className="mt-6 bg-amber-50 border border-amber-100 p-3 rounded-xl flex gap-2">
                    <Smartphone className="text-amber-500 shrink-0 mt-0.5" size={16} />
                    <p className="text-[10px] text-amber-800 leading-relaxed">
                       <strong>Perhatian:</strong> Data progress "Pronunciation" A1 tersimpan secara lokal di perangkat ini (Saved Progress). Data akan hilang jika Anda login menggunakan perangkat atau browser yang berbeda.
                    </p>
                  </div>
               )}
            </div>
          )}
        </Modal>
      )}

      {/* 2. REWARD MODAL */}
      {activeModal === 'REWARD' && user && (
        <Modal title="My Rewards Info" onClose={() => setActiveModal('NONE')}>
           <div className="text-center py-4">
             <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600">
                <Gift size={40} />
             </div>
             
             <div className="space-y-4">
               <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Referral Code</div>
                  <div className="text-xl font-mono font-bold text-indigo-600 mt-1">{user.referralCode || '-'}</div>
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                 <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Current Level</div>
                    <div className="text-lg font-bold text-slate-800 mt-1">{user.level || 'Rookie'}</div>
                 </div>
                 <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Balance</div>
                    <div className="text-lg font-bold text-amber-600 mt-1 flex items-center justify-center gap-1">
                      <Coins size={16} /> {formatNumber(user.balance)}
                    </div>
                 </div>
               </div>
             </div>
           </div>
        </Modal>
      )}

      {/* 3. TUTORIAL MODAL */}
      {activeModal === 'TUTORIAL' && (
        <Modal title="Help & Tutorials" onClose={() => setActiveModal('NONE')}>
          <div className="space-y-3">
             {tutorialItems.map((tut, idx) => (
               <div key={idx} className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm hover:border-indigo-300 transition-colors">
                  <h5 className="font-bold text-slate-800 flex items-center gap-2 mb-1 text-sm">
                    <BookOpen size={14} className="text-blue-500" />
                    {tut.title}
                  </h5>
                  <p className="text-xs text-slate-500 leading-relaxed ml-6">
                    {tut.desc}
                  </p>
               </div>
             ))}
          </div>
        </Modal>
      )}

    </div>
  );
};