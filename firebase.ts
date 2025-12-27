import { initializeApp, getApp, getApps, deleteApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  enableIndexedDbPersistence, 
  serverTimestamp 
} from 'firebase/firestore';
import { UserRole, UserProfile } from './types';

const firebaseConfig = {
  apiKey: "AIzaSyDc24eHGwIFcltfsYOwuhig8whHQuhfJ7U",
  authDomain: "learning-english-geuwat-d7555.firebaseapp.com",
  projectId: "learning-english-geuwat-d7555",
  storageBucket: "learning-english-geuwat-d7555.firebasestorage.app",
  messagingSenderId: "110497450552",
  appId: "1:110497450552:web:1de6e8e96d77318988b4cd",
  measurementId: "G-SD5W12S7ZZ"
};

// Primary App (Untuk Sesi Admin/User saat ini)
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app); 

// AKTIFKAN LOGIN OTOMATIS (PERSISTENCE)
// Menggunakan browserLocalPersistence agar sesi bertahan meski tab/browser ditutup
setPersistence(auth, browserLocalPersistence)
  .then(() => {
     console.log("Auth Persistence enabled: SESSION KEPT");
  })
  .catch((error) => {
     console.warn("Auth Persistence setup warning:", error);
  });

export const db = getFirestore(app);

// FITUR GRATIS & PERFORMA: Mengaktifkan Offline Cache
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code == 'failed-precondition') {
      console.log('Persistence failed: Multiple tabs open');
  } else if (err.code == 'unimplemented') {
      console.log('Persistence not supported by browser');
  }
});

/**
 * Logika Login
 */
export const loginWithCredentials = async (email: string, password: string): Promise<UserProfile> => {
  try {
    // 1. Attempt Auth Login
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    if (!user.email) throw new Error("User email is missing");

    // 2. Fetch Firestore Profile
    const normalizedEmail = user.email.toLowerCase();
    
    // KHUSUS: Cek collection berbeda untuk Admin Spesifik
    // UPDATED: Sesuai struktur database yang diminta
    let collectionName = 'users';
    
    if (normalizedEmail === 'adminreferralcodegeuwat@email.com') {
        collectionName = 'admin_referral_code';
    } else if (normalizedEmail === 'admindatabasegeuwat@email.com') {
        collectionName = 'admin_database'; 
    } else if (normalizedEmail === 'adminrewardgeuwat@email.com') {
        collectionName = 'admin_reward'; 
    } else if (normalizedEmail === 'adminnotificationgeuwat@email.com') {
        collectionName = 'admin_notification';
    } else if (normalizedEmail === 'adminlordgeuwat@email.com') {
        collectionName = 'admin_lord';
    }

    const docRef = doc(db, collectionName, normalizedEmail);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const rawRole = data.role || 'user';
      
      // MAPPING ROLE
      let role = UserRole.USER;
      
      // 1. Cek kecocokan langsung dengan Enum
      if (Object.values(UserRole).includes(rawRole as UserRole)) {
         role = rawRole as UserRole;
      } 
      // 2. Fallback untuk kompatibilitas
      else if (rawRole === 'adminReferral') role = UserRole.ADMIN_REFERRAL;
      else if (rawRole === 'adminDatabase') role = UserRole.ADMIN_DATABASE;
      else if (rawRole === 'adminReward') role = UserRole.ADMIN_REWARD;
      else if (rawRole === 'adminNotification') role = UserRole.ADMIN_NOTIFICATION;
      else if (rawRole === 'adminLord') role = UserRole.ADMIN_LORD;
      else if (rawRole === 'admin') role = UserRole.ADMIN_DATABASE;

      return {
        uid: user.uid,
        email: normalizedEmail,
        displayName: data.fullName || data.displayName || normalizedEmail.split('@')[0],
        photoURL: data.photoURL || null,
        role: role,
        createdAt: data.createdAt,
        balance: data.balance || 0,
        level: data.level || 'Rookie',
        referralCode: data.referralCode || '-',
        validUntil: data.validUntil || null
      };
    } else {
      // Hardcode akses jika dokumen belum dibuat di DB untuk admin utama (Bootstrapping)
      if (normalizedEmail === 'admindatabasegeuwat@email.com') {
         return {
            uid: user.uid,
            email: normalizedEmail,
            displayName: "Super Admin Database",
            photoURL: null,
            role: UserRole.ADMIN_DATABASE,
            createdAt: new Date(),
         };
      }
      if (normalizedEmail === 'adminrewardgeuwat@email.com') {
         return {
            uid: user.uid,
            email: normalizedEmail,
            displayName: "Admin Reward Center",
            photoURL: null,
            role: UserRole.ADMIN_REWARD,
            createdAt: new Date(),
         };
      }
      if (normalizedEmail === 'adminnotificationgeuwat@email.com') {
         return {
            uid: user.uid,
            email: normalizedEmail,
            displayName: "System Notification Center",
            photoURL: null,
            role: UserRole.ADMIN_NOTIFICATION,
            createdAt: new Date(),
         };
      }
      // THE LORD ADMIN BOOTSTRAP
      if (normalizedEmail === 'adminlordgeuwat@email.com') {
         return {
            uid: user.uid,
            email: normalizedEmail,
            displayName: "THE LORD ADMIN",
            photoURL: null,
            role: UserRole.ADMIN_LORD,
            createdAt: new Date(),
         };
      }

      return {
        uid: user.uid,
        email: normalizedEmail,
        displayName: normalizedEmail.split('@')[0],
        photoURL: null,
        role: UserRole.USER,
        createdAt: new Date(),
      };
    }

  } catch (error: any) {
    const authErrorCodes = ['auth/user-not-found', 'auth/wrong-password', 'auth/invalid-credential'];
    
    if (authErrorCodes.includes(error.code)) {
      console.warn("Login attempt failed:", error.code);
      throw new Error("Email atau Password salah.");
    }
    
    if (error.code === 'auth/too-many-requests') {
      console.warn("Rate limited:", error.code);
      throw new Error("Terlalu banyak percobaan login gagal. Silakan coba lagi nanti atau reset password.");
    }

    if (error.code === 'permission-denied') {
        console.error("Firestore Permission Denied:", error);
        throw new Error("Izin ditolak oleh Database. Pastikan akun admin ada di collection yang benar.");
    }

    console.error("Login Process Error:", error);
    throw error;
  }
};

/**
 * Logika Register User Baru (Self Service)
 */
export const registerUser = async (fullName: string, email: string, password: string): Promise<void> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    if (!user.email) throw new Error("Gagal membuat user auth");
    const normalizedEmail = user.email.toLowerCase();

    await setDoc(doc(db, 'users', normalizedEmail), {
      fullName: fullName,
      displayName: fullName,
      email: normalizedEmail,
      role: UserRole.USER, 
      createdAt: serverTimestamp(),
      balance: 0,
      level: 'Rookie',
      referralCode: '-',
      photoURL: null
    });

  } catch (error: any) {
    console.error("Registration Error:", error);
    if (error.code === 'auth/email-already-in-use') {
      throw new Error("Email ini sudah terdaftar. Silakan login.");
    }
    if (error.code === 'auth/weak-password') {
      throw new Error("Password terlalu lemah. Gunakan minimal 6 karakter.");
    }
    throw error;
  }
};

/**
 * KHUSUS ADMIN DATABASE: Membuat User Tanpa Logout Admin
 * Menggunakan teknik Secondary App Instance.
 */
export const registerUserByAdmin = async (email: string, password: string): Promise<string> => {
  let secondaryApp: FirebaseApp | undefined;
  try {
    // Gunakan nama unik untuk secondary app agar tidak clash
    const appName = "SecondaryApp-" + new Date().getTime();
    secondaryApp = initializeApp(firebaseConfig, appName);
    const secondaryAuth = getAuth(secondaryApp);

    // Create user di auth instance kedua
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    
    // Langsung sign out dari secondary auth agar tidak ada side effect
    await signOut(secondaryAuth);
    
    return userCredential.user.uid;
  } catch (error: any) {
    console.error("Admin Create User Error:", error);
    if (error.code === 'auth/email-already-in-use') {
       throw new Error("Email sudah terdaftar di Authentication.");
    }
    throw error;
  } finally {
    // Bersihkan app instance kedua
    if (secondaryApp) {
      await deleteApp(secondaryApp);
    }
  }
};

export const logout = async () => {
  await signOut(auth);
  localStorage.removeItem('geuwat_session');
};

export const sendResetPasswordEmail = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    console.error("Reset Password Error:", error);
    throw error;
  }
};

export const getStoredSession = () => {
  const sess = localStorage.getItem('geuwat_session');
  return sess ? JSON.parse(sess) : null;
};