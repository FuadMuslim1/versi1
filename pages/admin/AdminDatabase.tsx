import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { UserProfile, UserRole } from '../../types';
import { Skeleton } from '../../components/Skeleton';
import { 
  Database, Search, RefreshCw, CheckCircle, Clock, ArrowRight,
  Calendar, ShieldAlert, Key, Eye, AlertTriangle, Users, FileText,
  CreditCard, UserCheck, XCircle, FileClock, ChevronLeft, ChevronRight
} from 'lucide-react';
import { 
  collection, query, getDocs, doc, setDoc, serverTimestamp, updateDoc, orderBy, limit, getDoc, addDoc, where 
} from 'firebase/firestore';
import { db, registerUserByAdmin } from '../../firebase';

interface Props {
  user: UserProfile;
}

// Internal Confirmation Modal Component
const ConfirmationModal = ({ 
  isOpen, title, message, onConfirm, onCancel, isProcessing 
}: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <h3 className="font-bold text-lg text-slate-800 mb-2">{title}</h3>
          <p className="text-slate-600 text-sm whitespace-pre-wrap leading-relaxed mb-6">{message}</p>
          <div className="flex justify-end gap-3">
            <button 
              onClick={onCancel}
              disabled={isProcessing}
              className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-bold text-xs transition-colors"
            >
              Batal
            </button>
            <button 
              onClick={onConfirm}
              disabled={isProcessing}
              className="px-4 py-2 rounded-lg text-white font-bold text-xs transition-colors bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 flex items-center gap-2"
            >
              {isProcessing && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Ya, Proses
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AdminDatabase: React.FC<Props> = ({ user }) => {
  // Tab State
  const [activeTab, setActiveTab] = useState<'QUEUE' | 'DATABASE'>('QUEUE');

  // Data States
  const [pendingQueue, setPendingQueue] = useState<any[]>([]); // Collection: registrations
  
  // State for Single User Search (Database Tab)
  const [searchedUser, setSearchedUser] = useState<any | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Search States
  const [searchTerm, setSearchTerm] = useState(''); // For Database Tab (Server Search)
  const [queueSearch, setQueueSearch] = useState(''); // For Queue Tab (Client Search)

  // Modal State
  const [targetReg, setTargetReg] = useState<any | null>(null);

  // Pagination State (Queue Tab)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // --- FETCH DATA (QUEUE ONLY) ---
  const fetchQueue = async () => {
    if (!user) return;
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setPendingQueue([]);

    try {
        // FIX: Hanya ambil data yang statusnya 'SENT_TO_DB' (Pending)
        // Kita tidak menggunakan orderBy di query firestore untuk menghindari kebutuhan index composite (status+createdAt)
        // Sorting dilakukan di client-side (Javascript)
        
        const qRegs = query(
            collection(db, "registrations"), 
            where("status", "==", "SENT_TO_DB")
        );
        
        const snapRegs = await getDocs(qRegs);
        const regsData = snapRegs.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // SORTING FIFO (First In First Out) -> Tanggal Lama di Atas
        regsData.sort((a: any, b: any) => {
            const tA = a.createdAt?.seconds || 0;
            const tB = b.createdAt?.seconds || 0;
            return tA - tB; // Ascending: Kecil (Lama) ke Besar (Baru)
        });

        setPendingQueue(regsData);
        
        if (regsData.length === 0) {
            // Optional: Jika queue kosong, bisa fetch sedikit history verified biar ga kosong banget?
            // Tapi untuk "Data Entry Mode" yang strict, kosong berarti "All Done".
            // Kita biarkan kosong agar admin tahu pekerjaan selesai.
        }

      } catch (error: any) {
      console.error("Error fetching queue:", error);
      setErrorMsg(error.message || "Failed to load queue.");
    } finally {
      setLoading(false);
    }
  };

  // --- SEARCH USER (DATABASE ONLY) ---
  const handleSearchUser = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchTerm.trim()) {
        setErrorMsg("Mohon masukkan email user.");
        return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setSearchedUser(null);
    setHasSearched(true);

    try {
        const normalizedEmail = searchTerm.toLowerCase().trim();
        const docRef = doc(db, "users", normalizedEmail);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            setSearchedUser({ id: docSnap.id, ...docSnap.data() });
        } else {
            setErrorMsg(`User dengan email "${normalizedEmail}" tidak ditemukan.`);
        }
    } catch (error: any) {
        console.error("Search error:", error);
        setErrorMsg("Terjadi kesalahan saat mencari data.");
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'QUEUE') {
        fetchQueue();
    } else {
        setSearchedUser(null);
        setHasSearched(false);
        setErrorMsg(null);
        setSuccessMsg(null);
        setSearchTerm('');
    }
  }, [user, activeTab]);

  // --- TRIGGER MODAL ---
  const initiateProcessing = (regData: any) => {
      setErrorMsg(null);
      setSuccessMsg(null);
      
      // Validasi Kelengkapan Data sebelum buka modal
      if (!regData.generatedReferralCode) {
        const msg = "Gagal: Kode Password (Generated Code) kosong. Cek data pendaftaran.";
        console.error(msg);
        setErrorMsg(msg);
        return;
      }
      
      setTargetReg(regData);
  };

  // --- ACTION: EXECUTE PROCESSING ---
  const executeProcessData = async () => {
    if (!targetReg) return;
    const regData = targetReg;

    console.group(`[AdminDatabase] Processing: ${regData.fullName}`);
    console.log("Raw Data:", regData);
    
    setProcessingId(regData.id);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const targetEmail = regData.email.toLowerCase();
      console.log(`Target Email: ${targetEmail}`);

      // LANGKAH 1: Buat Akun Autentikasi (Login Email/Pass)
      console.time("Step 1: Auth Creation");
      try {
        console.log("Attempting to create Auth User...");
        await registerUserByAdmin(targetEmail, regData.generatedReferralCode);
        console.log("Auth user created successfully.");
      } catch (authErr: any) {
        console.warn("Auth Creation Warning:", authErr);
        // Jika errornya karena email sudah ada, kita anggap sukses dan lanjut update data Firestorenya
        if (authErr.message && (
            authErr.message.includes('email-already-in-use') || 
            authErr.message.includes('terdaftar') ||
            authErr.code === 'auth/email-already-in-use'
        )) {
            console.log("Info: User auth already exists. Syncing firestore data...");
        } else {
            console.error("Critical Auth Error:", authErr);
        }
      }
      console.timeEnd("Step 1: Auth Creation");

      // LANGKAH 2: Salin Data ke Collection 'users' (Firestore)
      console.time("Step 2: Firestore Sync");
      const now = new Date();
      const validUntil = new Date();
      validUntil.setDate(now.getDate() + 30); // Default aktif 30 hari

      const newUserPayload = {
        email: targetEmail,
        fullName: regData.fullName,
        displayName: regData.fullName,
        whatsapp: regData.whatsapp || '-',
        
        // PENTING: Mapping Kode Referral
        referralCode: regData.generatedReferralCode, // Kode milik dia (jadi password juga)
        referredBy: regData.usedReferralCode !== '-' ? regData.usedReferralCode : null, // Siapa yang mengajak
        
        // Default Values
        role: UserRole.USER,
        balance: 0,
        level: 'Rookie',
        createdAt: serverTimestamp(),
        validUntil: validUntil.toISOString().split('T')[0],
        photoURL: null
      };
      
      console.log("Saving to Firestore 'users'...", newUserPayload);
      
      // Gunakan setDoc dengan merge: true. 
      await setDoc(doc(db, "users", targetEmail), newUserPayload, { merge: true });
      console.log("Firestore 'users' document updated.");
      console.timeEnd("Step 2: Firestore Sync");

      // LANGKAH 3: Update Status di Antrian (Registrations)
      console.time("Step 3: Update Status");
      await updateDoc(doc(db, "registrations", regData.id), {
        status: 'VERIFIED'
      });
      console.log("Registration status updated to VERIFIED.");
      console.timeEnd("Step 3: Update Status");

      // LANGKAH 4: Create Audit Log (Persistent History)
      try {
        await addDoc(collection(db, "audit_logs"), {
          action: "PROCESS_REGISTRATION",
          executor: user.email,
          targetUser: targetEmail,
          timestamp: serverTimestamp(),
          details: {
             fullName: regData.fullName,
             referralCode: regData.generatedReferralCode,
             status: "SUCCESS"
          }
        });
        console.log("Audit log entry created in 'audit_logs'.");
      } catch (logErr) {
        console.warn("Failed to create audit log:", logErr);
      }

      // Update UI (Optimistic)
      const updatedQueue = pendingQueue.map(p => 
        p.id === regData.id ? { ...p, status: 'VERIFIED' } : p
      );
      setPendingQueue(updatedQueue);
      
      console.log("Process Completed Successfully.");
      setSuccessMsg(`Berhasil! Data ${regData.fullName} sudah masuk ke database Users.`);
      setTargetReg(null); // Close modal

    } catch (error: any) {
      console.error("Entry Failed Critical Error:", error);
      setErrorMsg(`Gagal memproses data: ${error.message}`);
      
      // Attempt to log failure
      try {
        await addDoc(collection(db, "audit_logs"), {
            action: "PROCESS_REGISTRATION_FAILED",
            executor: user.email,
            targetUser: regData.email,
            timestamp: serverTimestamp(),
            error: error.message
        });
      } catch (e) {}

    } finally {
      setProcessingId(null);
      console.groupEnd();
    }
  };

  const getStatusBadge = (status: string) => {
      switch(status) {
          case 'VERIFIED': return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100"><CheckCircle size={10} /> Registered</span>;
          case 'SENT_TO_DB': return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100"><Clock size={10} /> Queued</span>;
          case 'PAID': return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">Paid</span>;
          default: return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Draft</span>;
      }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit'
    }).format(date);
  };

  // Pagination & Filtering Logic
  const filteredQueue = pendingQueue.filter(u => {
     if (!queueSearch) return true;
     const lowerQ = queueSearch.toLowerCase();
     return (
        u.fullName.toLowerCase().includes(lowerQ) ||
        u.email.toLowerCase().includes(lowerQ) ||
        (u.usedReferralCode && u.usedReferralCode.toLowerCase().includes(lowerQ))
     );
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredQueue.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredQueue.length / itemsPerPage);

  const PaginationControls = () => {
    if (totalPages <= 1) return null;
    return (
      <div className="flex justify-center items-center gap-4 mt-6">
        <button 
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className="p-2 rounded-full hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <ChevronLeft size={20} className="text-slate-600" />
        </button>
        <span className="text-sm font-bold text-slate-500">
          Page {currentPage} of {totalPages}
        </span>
        <button 
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="p-2 rounded-full hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <ChevronRight size={20} className="text-slate-600" />
        </button>
      </div>
    );
 };

  return (
    <AdminLayout user={user} title="Master Database">
      
      {/* --- NAVBAR BUTTONS (Switcher) --- */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap gap-4 sticky top-0 z-30 shadow-sm">
        <button 
          onClick={() => setActiveTab('QUEUE')}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all duration-200
            ${activeTab === 'QUEUE' 
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105' 
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'}
          `}
        >
          <FileText size={18} /> 
          Antrian (Prioritas Lama)
          {pendingQueue.filter(i => i.status === 'SENT_TO_DB').length > 0 && (
            <span className="ml-2 bg-amber-400 text-amber-900 text-[10px] px-2 py-0.5 rounded-full shadow-sm">
              {pendingQueue.filter(i => i.status === 'SENT_TO_DB').length}
            </span>
          )}
        </button>
        <button 
          onClick={() => setActiveTab('DATABASE')}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all duration-200
            ${activeTab === 'DATABASE' 
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105' 
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'}
          `}
        >
          <Search size={18} /> 
          Cari User Aktif
        </button>
      </div>

      <div className="p-4 md:p-6 space-y-6">

        {/* --- ALERT / INFO --- */}
        <div className="bg-indigo-50 border border-indigo-200 text-indigo-700 p-4 rounded-xl flex items-start gap-3">
            <Eye size={20} className="mt-0.5 shrink-0" />
            <div>
            <h4 className="font-bold text-sm">
                {activeTab === 'QUEUE' ? 'Mode: Data Entry (FIFO)' : 'Mode: Check User Status'}
            </h4>
            <p className="text-xs mt-1">
                {activeTab === 'QUEUE' 
                  ? "Menampilkan antrian dari TERLAMA ke TERBARU. Harap proses data paling atas terlebih dahulu agar pelanggan tidak menunggu lama."
                  : "Masukkan Email User untuk mengecek status, saldo, dan level mereka secara spesifik (Hemat Data)."}
            </p>
            </div>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3 animate-in fade-in">
             <AlertTriangle size={20} className="mt-0.5 shrink-0" />
             <div><h4 className="font-bold text-sm">Ada Masalah</h4><p className="text-xs mt-1">{errorMsg}</p></div>
          </div>
        )}

        {successMsg && (
           <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl flex items-start gap-3 animate-in fade-in">
              <CheckCircle size={20} className="mt-0.5 shrink-0" />
              <div><h4 className="font-bold text-sm">Berhasil</h4><p className="text-xs mt-1">{successMsg}</p></div>
           </div>
        )}

        {/* VIEW 1: REGISTRATION QUEUE (LIST MODE) */}
        {activeTab === 'QUEUE' && (
          <>
             <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-3">
                <div className="flex items-center gap-3">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                        <Clock size={18} className="text-amber-500" /> Antrian Pending
                    </h3>
                    <button 
                        onClick={fetchQueue} 
                        className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                    >
                        <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh List
                    </button>
                </div>
                {/* CLIENT SEARCH BAR */}
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                       type="text"
                       placeholder="Filter Name/Email..."
                       value={queueSearch}
                       onChange={(e) => { setQueueSearch(e.target.value); setCurrentPage(1); }}
                       className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
             </div>

             <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Waktu Daftar</th>
                        <th className="px-6 py-4">Identity</th>
                        <th className="px-6 py-4">Codes</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loading ? (
                         <tr><td colSpan={5} className="p-8"><Skeleton className="h-10 w-full" /></td></tr>
                      ) : currentItems.length === 0 ? (
                         <tr><td colSpan={5} className="p-16 text-center text-slate-400">{pendingQueue.length === 0 ? "Antrian kosong. Semua data sudah diproses." : "Tidak ada data yang cocok dengan pencarian."}</td></tr>
                      ) : (
                        currentItems.map((u, index) => (
                          <tr key={u.id} className={`hover:bg-slate-50 transition-colors ${u.status === 'SENT_TO_DB' && index === 0 ? 'bg-amber-50/50' : ''}`}>
                             <td className="px-6 py-4">
                                <div className="text-xs font-mono text-slate-500">
                                   {formatDate(u.createdAt)}
                                </div>
                                {index === 0 && u.status === 'SENT_TO_DB' && (
                                   <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1 rounded animate-pulse">PRIORITY</span>
                                )}
                             </td>
                             <td className="px-6 py-4">
                               <div className="font-bold text-slate-800">{u.fullName}</div>
                               <div className="text-xs text-slate-500">{u.email}</div>
                               <div className="text-[10px] text-slate-400 font-mono">{u.whatsapp}</div>
                             </td>
                             <td className="px-6 py-4">
                                <div className="flex flex-col gap-1">
                                  <div className="text-xs text-slate-400">Ref: <span className="font-bold text-slate-600">{u.usedReferralCode}</span></div>
                                  <div className="text-xs text-slate-400">Key: <span className="font-bold text-indigo-600 bg-indigo-50 px-1 rounded">{u.generatedReferralCode}</span></div>
                                </div>
                             </td>
                             <td className="px-6 py-4">
                                  {getStatusBadge(u.status)}
                             </td>
                             <td className="px-6 py-4 text-right">
                               {u.status === 'SENT_TO_DB' && (
                                   <button 
                                     onClick={() => initiateProcessing(u)}
                                     disabled={!!processingId}
                                     className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold text-xs flex items-center justify-center gap-1 transition-colors w-full md:w-auto shadow-md shadow-indigo-100"
                                   >
                                      {processingId === u.id ? 'Processing...' : <><ArrowRight size={14} /> Proses</>}
                                   </button>
                               )}
                             </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="pb-6">
                    <PaginationControls />
                </div>
             </div>
          </>
        )}

        {/* VIEW 2: SINGLE USER SEARCH (DATABASE MODE) */}
        {activeTab === 'DATABASE' && (
          <div className="max-w-2xl mx-auto mt-8">
             <form onSubmit={handleSearchUser} className="relative mb-8">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                   <Search className="text-slate-400" size={20} />
                </div>
                <input 
                  type="email"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Masukkan email user lengkap (misal: budi@gmail.com)"
                  className="w-full pl-12 pr-4 py-4 bg-white border border-slate-300 rounded-xl shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  required
                />
                <button 
                   type="submit"
                   disabled={loading}
                   className="absolute right-2 top-2 bottom-2 bg-indigo-600 text-white px-6 rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                >
                   {loading ? <RefreshCw className="animate-spin" size={18} /> : 'Cek Status'}
                </button>
             </form>

             {searchedUser ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in zoom-in-95 duration-300">
                   <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 p-6 text-white">
                      <div className="flex items-center gap-4">
                         <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-2xl font-bold border-2 border-white/30">
                            {searchedUser.displayName?.charAt(0)}
                         </div>
                         <div>
                            <h2 className="text-2xl font-bold">{searchedUser.fullName}</h2>
                            <p className="text-indigo-100 text-sm font-mono opacity-80">{searchedUser.email}</p>
                            <div className="flex items-center gap-2 mt-2">
                               <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-white/20">
                                  {searchedUser.role}
                               </span>
                               <span className="bg-emerald-500/80 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                                  <UserCheck size={10} /> Active
                               </span>
                            </div>
                         </div>
                      </div>
                   </div>
                   
                   <div className="p-6 grid grid-cols-2 gap-6">
                      <div className="space-y-1">
                         <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Current Level</div>
                         <div className="text-xl font-bold text-slate-800">{searchedUser.level || 'Rookie'}</div>
                      </div>
                      <div className="space-y-1">
                         <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Wallet Balance</div>
                         <div className="text-xl font-bold text-amber-600 flex items-center gap-1">
                            <CreditCard size={20} /> {searchedUser.balance || 0}
                         </div>
                      </div>
                      <div className="space-y-1 col-span-2 border-t border-slate-100 pt-4">
                         <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Referral Info</div>
                         <div className="flex justify-between items-center mt-1">
                            <span className="text-sm text-slate-600">Own Code: <b className="font-mono text-indigo-600">{searchedUser.referralCode}</b></span>
                            <span className="text-sm text-slate-600">Upline: <b className="font-mono text-slate-500">{searchedUser.referredBy || '-'}</b></span>
                         </div>
                      </div>
                   </div>
                   
                   <div className="bg-slate-50 p-4 text-center border-t border-slate-200">
                      <button className="text-xs font-bold text-indigo-600 hover:underline">
                         Lihat Detail Transaksi (Coming Soon)
                      </button>
                   </div>
                </div>
             ) : hasSearched && !loading && (
                <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                   <XCircle size={48} className="mx-auto text-slate-300 mb-3" />
                   <h3 className="text-slate-500 font-bold">User Tidak Ditemukan</h3>
                   <p className="text-xs text-slate-400 mt-1">Pastikan penulisan email sudah benar.</p>
                </div>
             )}
          </div>
        )}
      </div>

      {/* CONFIRMATION MODAL */}
      <ConfirmationModal 
         isOpen={!!targetReg}
         title="Konfirmasi Proses Data"
         message={targetReg ? `Nama: ${targetReg.fullName}\nEmail: ${targetReg.email}\n\nData akan disalin ke database User agar bisa login. Lanjutkan?` : ''}
         onConfirm={executeProcessData}
         onCancel={() => setTargetReg(null)}
         isProcessing={!!processingId}
      />
    </AdminLayout>
  );
};