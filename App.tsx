import React, { useEffect, useState, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { db, auth } from './firebase'; 
import { doc, onSnapshot, Unsubscribe, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { AuthState, UserRole } from './types';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { UserDashboard } from './pages/UserDashboard';
import { Subject } from './pages/Subject'; 
import { Pronunciation } from './pages/Pronunciation';
import { AdminReferral } from './pages/admin/AdminReferral';
import { AdminDatabase } from './pages/admin/AdminDatabase';
import { AdminReward } from './pages/admin/AdminReward';
import { AdminNotification } from './pages/admin/AdminNotification';
import { AdminLord } from './pages/admin/AdminLord';
import { Loader2, MonitorX, RefreshCw } from 'lucide-react';

const App: React.FC = () => {
  // GENERATE UNIQUE SESSION ID PER TAB/WINDOW
  // Ini memastikan setiap tab memiliki identitas unik
  const SESSION_ID = useRef(`sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`).current;
  
  const [isMultiSession, setIsMultiSession] = useState(false);
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    // Variable untuk menyimpan fungsi pemutus koneksi listener Firestore
    let unsubscribeSnapshot: Unsubscribe | null = null;

    // Menggunakan Auth Listener resmi dari Firebase Modular SDK
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      
      // PENTING: Matikan listener Firestore sebelumnya setiap kali status Auth berubah
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      if (firebaseUser && firebaseUser.email) {
        // User Login, sekarang listen ke data profil di Firestore
        const normalizedEmail = firebaseUser.email.toLowerCase();
        
        const isAdminReferralEmail = normalizedEmail === 'adminreferralcodegeuwat@email.com';
        const isAdminDatabaseEmail = normalizedEmail === 'admindatabasegeuwat@email.com';
        const isAdminRewardEmail = normalizedEmail === 'adminrewardgeuwat@email.com';
        const isAdminNotificationEmail = normalizedEmail === 'adminnotificationgeuwat@email.com';
        const isAdminLordEmail = normalizedEmail === 'adminlordgeuwat@email.com';

        // KHUSUS: Pilih collection berdasarkan email
        let collectionName = 'users';
        if (isAdminReferralEmail) collectionName = 'admin_referral_code';
        else if (isAdminDatabaseEmail) collectionName = 'admin_database'; 
        else if (isAdminRewardEmail) collectionName = 'admin_reward';
        else if (isAdminNotificationEmail) collectionName = 'admin_notification';
        else if (isAdminLordEmail) collectionName = 'admin_lord';

        const userDocRef = doc(db, collectionName, normalizedEmail);
        
        // 1. CLAIM SESSION (SINGLE SESSION LOGIC)
        // Saat login/load, kita klaim bahwa sesi ini adalah sesi yang valid di DB.
        try {
           await updateDoc(userDocRef, { lastSessionId: SESSION_ID });
        } catch (e) {
           console.warn("Session claim warning (mungkin dokumen belum ada):", e);
        }

        // 2. LISTEN REALTIME
        unsubscribeSnapshot = onSnapshot(userDocRef, 
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();

              // --- SINGLE SESSION ENFORCEMENT ---
              // Jika ID sesi di database berbeda dengan ID sesi tab ini,
              // berarti ada tab/perangkat lain yang baru saja login.
              if (data.lastSessionId && data.lastSessionId !== SESSION_ID) {
                  setIsMultiSession(true);
                  // Jangan set authState user, biarkan UI blocker muncul
                  return;
              }
              // Jika cocok, pastikan blocker mati
              setIsMultiSession(false);
              // ----------------------------------

              const rawRole = data.role || 'user';
              
              // Normalisasi Role
              let role = UserRole.USER;
              if (isAdminReferralEmail) role = UserRole.ADMIN_REFERRAL;
              else if (isAdminDatabaseEmail) role = UserRole.ADMIN_DATABASE;
              else if (isAdminRewardEmail) role = UserRole.ADMIN_REWARD;
              else if (isAdminNotificationEmail) role = UserRole.ADMIN_NOTIFICATION;
              else if (isAdminLordEmail) role = UserRole.ADMIN_LORD;
              else if (Object.values(UserRole).includes(rawRole as UserRole)) role = rawRole as UserRole;
              else if (rawRole === 'adminReferral') role = UserRole.ADMIN_REFERRAL;
              else if (rawRole === 'adminDatabase') role = UserRole.ADMIN_DATABASE;
              else if (rawRole === 'adminReward') role = UserRole.ADMIN_REWARD;
              else if (rawRole === 'adminNotification') role = UserRole.ADMIN_NOTIFICATION;
              else if (rawRole === 'adminLord') role = UserRole.ADMIN_LORD;
              else if (rawRole === 'admin') role = UserRole.ADMIN_DATABASE;

              setAuthState({
                user: {
                  uid: firebaseUser.uid,
                  email: normalizedEmail,
                  displayName: data.fullName || data.displayName || normalizedEmail.split('@')[0],
                  photoURL: data.photoURL || null,
                  role: role,
                  createdAt: data.createdAt,
                  balance: data.balance,
                  level: data.level,
                  referralCode: data.referralCode,
                  validUntil: data.validUntil,
                  lastSessionId: data.lastSessionId
                },
                loading: false,
                error: null
              });
            } else {
              // User Auth ada, tapi Data Firestore tidak ada (Fallback)
              let role = UserRole.USER;
              if (isAdminReferralEmail) role = UserRole.ADMIN_REFERRAL;
              if (isAdminDatabaseEmail) role = UserRole.ADMIN_DATABASE;
              if (isAdminRewardEmail) role = UserRole.ADMIN_REWARD;
              if (isAdminNotificationEmail) role = UserRole.ADMIN_NOTIFICATION;
              if (isAdminLordEmail) role = UserRole.ADMIN_LORD;

              setAuthState({
                user: {
                  uid: firebaseUser.uid,
                  email: normalizedEmail,
                  displayName: normalizedEmail.split('@')[0] || 'User',
                  photoURL: null,
                  role: role,
                  createdAt: new Date()
                },
                loading: false,
                error: null
              });
            }
          },
          (err) => {
            // Error Handling (sama seperti sebelumnya)
            if (isAdminReferralEmail || isAdminDatabaseEmail || isAdminRewardEmail || isAdminNotificationEmail || isAdminLordEmail) {
               console.warn("Firestore access restricted, using system fallback for Admin.");
               // ... fallback logic code ...
               let role = UserRole.USER;
               if (isAdminReferralEmail) role = UserRole.ADMIN_REFERRAL;
               if (isAdminDatabaseEmail) role = UserRole.ADMIN_DATABASE;
               if (isAdminRewardEmail) role = UserRole.ADMIN_REWARD;
               if (isAdminNotificationEmail) role = UserRole.ADMIN_NOTIFICATION;
               if (isAdminLordEmail) role = UserRole.ADMIN_LORD;

               setAuthState({
                  user: {
                    uid: firebaseUser.uid,
                    email: normalizedEmail,
                    displayName: 'System Admin (Fallback)',
                    photoURL: null,
                    role: role,
                    createdAt: new Date()
                  },
                  loading: false,
                  error: null
               });
            } else {
              console.error("Firestore sync error:", err);
              if (auth.currentUser) {
                  setAuthState(prev => ({ ...prev, loading: false, error: "Gagal memuat data profil." }));
              }
            }
          }
        );
        
      } else {
        // User Logout
        setAuthState({ user: null, loading: false, error: null });
        setIsMultiSession(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, []);

  const getHomeRoute = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN_LORD: return '/admin/lord';
      case UserRole.ADMIN_REFERRAL: return '/admin/referral';
      case UserRole.ADMIN_DATABASE: return '/admin/database';
      case UserRole.ADMIN_REWARD: return '/admin/reward';
      case UserRole.ADMIN_NOTIFICATION: return '/admin/notification';
      case UserRole.USER: default: return '/dashboard';
    }
  };

  // --- UI: SESSION BLOCKER (KICK SCREEN) ---
  if (isMultiSession) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6 text-center animate-in fade-in duration-500">
         <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-black ring-4 ring-slate-700">
            <MonitorX size={40} className="text-red-500" />
         </div>
         <h1 className="text-2xl font-bold mb-2">Koneksi Terputus</h1>
         <p className="text-slate-400 max-w-md mb-8 leading-relaxed">
            Akun Anda <strong>English Learning Geuwat</strong> sedang dibuka di jendela, tab, atau perangkat lain.
            <br/><br/>
            Klik tombol di bawah untuk menggunakan akun di sini dan mengeluarkan sesi lainnya.
         </p>
         <button 
           onClick={() => window.location.reload()}
           className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-indigo-900/50"
         >
            <RefreshCw size={18} />
            Gunakan Di Sini
         </button>
      </div>
    );
  }

  if (authState.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  const ProtectedRoute: React.FC<{ children: React.ReactNode, allowedRoles?: UserRole[] }> = ({ children, allowedRoles }) => {
    if (!authState.user) return <Navigate to="/" />;
    
    if (allowedRoles) {
      const userRole = authState.user.role;
      const isAllowed = allowedRoles.includes(userRole) || userRole === UserRole.ADMIN_LORD;

      if (!isAllowed) {
         return <Navigate to={getHomeRoute(userRole)} />; 
      }
    }
    return <>{children}</>;
  };

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={authState.user ? <Navigate to={getHomeRoute(authState.user.role)} replace /> : <Login />} />
        <Route path="/register" element={authState.user ? <Navigate to={getHomeRoute(authState.user.role)} replace /> : <Register />} />
        
        <Route path="/dashboard" element={<ProtectedRoute><UserDashboard user={authState.user!} /></ProtectedRoute>} />
        <Route path="/subject" element={<ProtectedRoute><Subject user={authState.user!} /></ProtectedRoute>} />
        <Route path="/pronunciation" element={<ProtectedRoute><Pronunciation user={authState.user!} /></ProtectedRoute>} />

        {/* --- ADMIN ROUTES --- */}
        <Route path="/admin/lord" element={<ProtectedRoute allowedRoles={[UserRole.ADMIN_LORD]}><AdminLord user={authState.user!} /></ProtectedRoute>} />
        <Route path="/admin/referral" element={<ProtectedRoute allowedRoles={[UserRole.ADMIN_REFERRAL]}><AdminReferral user={authState.user!} /></ProtectedRoute>} />
        <Route path="/admin/database" element={<ProtectedRoute allowedRoles={[UserRole.ADMIN_DATABASE]}><AdminDatabase user={authState.user!} /></ProtectedRoute>} />
        <Route path="/admin/reward" element={<ProtectedRoute allowedRoles={[UserRole.ADMIN_REWARD]}><AdminReward user={authState.user!} /></ProtectedRoute>} />
        <Route path="/admin/notification" element={<ProtectedRoute allowedRoles={[UserRole.ADMIN_NOTIFICATION]}><AdminNotification user={authState.user!} /></ProtectedRoute>} />
      </Routes>
    </HashRouter>
  );
};

export default App;