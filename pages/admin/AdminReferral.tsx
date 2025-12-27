import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../../components/AdminLayout'; 
import { UserProfile, RegistrationRequest, RegistrationStatus } from '../../types';
import { Skeleton } from '../../components/Skeleton';
import { 
  Copy, CheckCircle, Plus, Trash2, FileText, 
  DollarSign, Send, Download, RotateCcw, ShieldCheck,
  ClipboardPaste, Mail, ChevronRight, AlertTriangle, Calendar, Clock,
  FileSpreadsheet, ChevronDown, ChevronLeft, Search, ArrowUp
} from 'lucide-react';
import { 
  collection, query, orderBy, serverTimestamp, 
  deleteDoc, doc, updateDoc, writeBatch, getDoc, onSnapshot 
} from 'firebase/firestore';
import { db } from '../../firebase';
import { utils, writeFile } from 'xlsx';

interface Props {
  user: UserProfile;
}

// --- INTERNAL COMPONENTS ---

// 1. Custom Confirmation Modal
const ConfirmationModal = ({ 
  isOpen, title, message, onConfirm, onCancel, isProcessing, confirmLabel = "Delete", isDestructive = true 
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
              Cancel
            </button>
            <button 
              onClick={onConfirm}
              disabled={isProcessing}
              className={`px-4 py-2 rounded-lg text-white font-bold text-xs transition-colors flex items-center gap-2 shadow-md ${isDestructive ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'}`}
            >
              {isProcessing ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const RequestCard: React.FC<{ 
  req: RegistrationRequest; 
  onDeleteClick: (req: RegistrationRequest, e: React.MouseEvent) => void;
  onUpdateStatus: (id: string, status: RegistrationStatus, req?: RegistrationRequest) => void;
  formatDate: (ts: any) => string;
}> = ({ req, onDeleteClick, onUpdateStatus, formatDate }) => {
  
  const StatusBadge = ({ status }: { status: RegistrationStatus }) => {
    const config = {
      'DRAFT': { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', label: 'Draft / Unpaid' },
      'SENT_TO_DB': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Paid & Queued' }, // Diganti Labelnya
      'VERIFIED': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Registered' },
      'PAID': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'Paid' } // Fallback
    };
    const s = config[status] || config['DRAFT'];
    return (
      <span className={`px-2 py-1 rounded-md text-[10px] md:text-xs font-bold border ${s.bg} ${s.text} ${s.border} flex items-center gap-1.5 w-fit shadow-sm uppercase tracking-wider`}>
        {status === 'VERIFIED' && <ShieldCheck size={12} />}
        {status === 'SENT_TO_DB' && <Clock size={12} className="animate-pulse"/>}
        {s.label}
      </span>
    );
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-4 relative overflow-hidden">
       <div className={`absolute top-0 left-0 w-1.5 h-full 
         ${req.status === 'VERIFIED' ? 'bg-emerald-500' : 
           req.status === 'SENT_TO_DB' ? 'bg-amber-500' : 'bg-slate-300'}`} 
       />
       <div className="pl-3">
         <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="font-bold text-slate-800 text-lg leading-tight">{req.fullName}</h3>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                 <Mail size={12} /> {req.email}
              </p>
            </div>
            <StatusBadge status={req.status} />
         </div>
         <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
               <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Generated Key</span>
               <code className="text-sm font-bold text-indigo-600 font-mono break-all">{req.generatedReferralCode}</code>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
               <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Referral Used</span>
               <span className="text-sm font-medium text-slate-700">{req.usedReferralCode}</span>
            </div>
         </div>
         <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div className="text-xs text-slate-400 font-mono flex items-center gap-1">
               <span className="bg-slate-100 px-1.5 py-0.5 rounded">{formatDate(req.createdAt)}</span>
               <span>•</span>
               <span>{req.whatsapp}</span>
            </div>
            <div className="flex gap-2">
               {/* TOMBOL SUDAH BAYAR: Langsung kirim ke DB (SENT_TO_DB) */}
               {req.status === 'DRAFT' && (
                  <button 
                    onClick={() => onUpdateStatus(req.id, 'SENT_TO_DB', req)} 
                    className="bg-indigo-600 text-white px-3 py-2 rounded-lg shadow-sm hover:bg-indigo-700 text-xs font-bold flex items-center gap-1" 
                    title="Konfirmasi Bayar & Kirim ke DB"
                  >
                    <DollarSign size={14}/> Sudah Bayar
                  </button>
               )}
               <button 
                onClick={(e) => onDeleteClick(req, e)} 
                className="text-slate-400 p-2 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
                title="Hapus Data Antrian"
               >
                 <Trash2 size={16}/>
               </button>
            </div>
         </div>
       </div>
    </div>
  );
};

export const AdminReferral: React.FC<Props> = ({ user }) => {
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [rawData, setRawData] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Search & Pagination State
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal States
  const [deleteTarget, setDeleteTarget] = useState<RegistrationRequest | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // --- HELPER: DATE FORMATTER ---
  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    // Handle Firestore Timestamp or standard Date
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit', month: 'short', year: '2-digit',
      hour: '2-digit', minute: '2-digit'
    }).format(date);
  };

  // --- 1. REALTIME DATA LISTENER (The Reception Desk) ---
  useEffect(() => {
    setLoading(true);
    setErrorMsg(null);
    
    // UPDATE: Hapus orderBy('createdAt', 'desc') agar tidak butuh index complex
    // Kita akan sort manual di client side (FIFO - Ascending)
    const q = query(collection(db, "registrations"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
       const items: RegistrationRequest[] = [];
       snapshot.forEach(doc => {
           items.push({ id: doc.id, ...doc.data() } as RegistrationRequest);
       });

       // CLIENT SIDE SORTING: FIFO (First In First Out)
       // Data terlama (tanggal kecil) di atas
       items.sort((a, b) => {
         const tA = a.createdAt?.seconds || 0;
         const tB = b.createdAt?.seconds || 0;
         return tA - tB; // Ascending
       });

       setRequests(items);
       setLoading(false);
    }, (error) => {
       console.error("Listen failed:", error);
       if (error.code === 'permission-denied') {
          setErrorMsg("Access Denied: You do not have permission to view registrations.");
       } else {
          setErrorMsg(`Error loading data: ${error.message}`);
       }
       setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // --- 2. AUTO-VERIFICATION ROBOT ---
  useEffect(() => {
    const checkVerificationStatus = async () => {
        const pendingVerification = requests.filter(r => r.status === 'SENT_TO_DB');
        if (pendingVerification.length === 0) return;

        for (const req of pendingVerification) {
            try {
                // Check if User Account exists in 'users' collection
                const userDocRef = doc(db, 'users', req.email.toLowerCase());
                const userSnap = await getDoc(userDocRef);

                if (userSnap.exists()) {
                    // If exists, Admin Database has done their job. Mark as VERIFIED.
                    await updateDoc(doc(db, "registrations", req.id), {
                        status: 'VERIFIED'
                    });
                }
            } catch (err) {
                console.error("Auto-verify check failed:", err);
            }
        }
    };

    const intervalId = setInterval(checkVerificationStatus, 5000); 
    checkVerificationStatus(); 

    return () => clearInterval(intervalId);
  }, [requests]);

  // --- 3. GENERATOR LOGIC ---
  const generateReferralCode = (email: string, whatsapp: string, usedRef: string, dailySequence: number) => {
    const cleanEmail = email.replace(/[^a-zA-Z]/g, '');
    const AA = (cleanEmail.length >= 2 ? cleanEmail.substring(0, 2) : cleanEmail.padEnd(2, 'X')).toUpperCase();
    const cleanWA = whatsapp.replace(/\D/g, '');
    const WW = cleanWA.length >= 2 ? cleanWA.slice(-2) : cleanWA.padStart(2, '0');
    const hasReferral = usedRef && usedRef !== '-' && usedRef.trim() !== '';
    const R = hasReferral ? '1' : '2';
    const date = new Date();
    const MM = String(date.getMonth() + 1).padStart(2, '0');
    const DD = String(date.getDate()).padStart(2, '0');
    const YY = String(date.getFullYear()).slice(-2);
    const N = dailySequence;

    return `${AA}${WW}${R}${MM}${DD}${YY}${N}`;
  };

  const getTodayRegistrationCount = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return requests.filter(req => {
       const reqDate = req.createdAt?.seconds ? new Date(req.createdAt.seconds * 1000) : new Date();
       reqDate.setHours(0,0,0,0);
       return reqDate.getTime() === today.getTime();
    }).length;
  };

  // --- 4. DATA PARSING & GENERATION ---
  const handleProcessRawData = async () => {
    if (!rawData.trim()) return;
    setProcessing(true);
    setErrorMsg(null);

    try {
      const batch = writeBatch(db);
      let count = 0;
      let currentSequence = getTodayRegistrationCount() + 1;
      let processedLines: string[] = [];
      
      const isLabelledFormat = /Full Name:|Email:|WhatsApp:/i.test(rawData);

      if (isLabelledFormat) {
        const blocks = rawData.split(/Full Name:/i);
        for (const block of blocks) {
           if (!block.trim()) continue;
           const waMatch = block.match(/(?:WhatsApp|WA)\s*:\s*([\d\-\+]+)/i);
           const emailMatch = block.match(/Email\s*:\s*([^\s\n]+)/i);
           const refMatch = block.match(/Referral\s*:\s*([^\s\n]+)/i);
           const nameLine = block.trim().split('\n')[0].replace(/[:]/g, '').trim();

           if (nameLine && emailMatch && waMatch) {
              const uName = nameLine;
              const uWA = waMatch[1].trim();
              const uEmail = emailMatch[1].trim();
              const uRef = refMatch ? refMatch[1].trim() : '-';
              processedLines.push(`${uName},${uWA},${uEmail},${uRef}`);
           }
        }
      } else {
        processedLines = rawData.split('\n');
      }

      for (const line of processedLines) {
        if (!line.trim()) continue;
        const parts = line.split(/,|\||\t/).map(s => s.trim());
        if (parts.length >= 3) {
          const fullName = parts[0];
          const whatsapp = parts[1];
          const email = parts[2].toLowerCase();
          const usedRef = parts[3] || '-'; 

          if (email.includes('@') && fullName.toLowerCase() !== 'full name') {
             
             // VALIDASI: Cek apakah email sudah ada di collection 'users'
             const existingUserRef = doc(db, "users", email);
             const existingUserSnap = await getDoc(existingUserRef);

             if (existingUserSnap.exists()) {
                 setErrorMsg(`Gagal Memuat: Email ${email} sudah terdaftar sebagai User Aktif di sistem.`);
                 setProcessing(false);
                 return; // Stop process
             }

             const newCode = generateReferralCode(email, whatsapp, usedRef, currentSequence);
             const newDocRef = doc(db, "registrations", email);
             
             // Default Status: DRAFT (Belum Bayar)
             batch.set(newDocRef, {
               fullName, whatsapp, email,
               usedReferralCode: usedRef,
               generatedReferralCode: newCode,
               status: 'DRAFT',
               createdAt: serverTimestamp(),
               createdBy: user.uid,
               notifiedRewardAdmin: false
             });
             count++;
             currentSequence++;
          }
        }
      }

      if (count > 0) {
        await batch.commit();
        setRawData('');
        setErrorMsg(null);
      } else if (!errorMsg) {
        setErrorMsg("Format tidak dikenali. Pastikan ada Full Name, WA, dan Email.");
      }
    } catch (error: any) {
      console.error("Error processing:", error);
      setErrorMsg("Error processing data: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  // --- 5. ACTION HANDLERS ---
  const updateStatus = async (id: string, newStatus: RegistrationStatus, reqData?: RegistrationRequest) => {
    try {
      const updates: any = { status: newStatus };
      if (newStatus === 'SENT_TO_DB' && reqData && reqData.usedReferralCode !== '-') {
         updates.notifiedRewardAdmin = true; 
      }
      const ref = doc(db, "registrations", id);
      await updateDoc(ref, updates);
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  // --- TRIGGER MODAL DELETE ---
  const handleDeleteClick = (req: RegistrationRequest, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setDeleteTarget(req);
  };

  // --- EKSEKUSI DELETE SETELAH KONFIRMASI ---
  const executeDelete = async () => {
    if (!deleteTarget) return;

    setProcessing(true);
    try {
      if (!deleteTarget.id) throw new Error("ID Dokumen tidak valid");
      await deleteDoc(doc(db, "registrations", deleteTarget.id));
      setDeleteTarget(null); // Tutup modal
    } catch (error: any) {
      console.error("Error deleting:", error);
      setErrorMsg(`Gagal menghapus: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  // --- TRIGGER MODAL RESET ---
  const handleResetClick = () => {
    setShowResetConfirm(true);
  };

  // --- EKSEKUSI RESET SETELAH KONFIRMASI ---
  const executeReset = async () => {
    setLoading(true);
    try {
      const toDelete = requests.filter(r => r.status === 'DRAFT' || r.status === 'PAID');
      const batch = writeBatch(db);
      toDelete.forEach(req => batch.delete(doc(db, "registrations", req.id)));
      await batch.commit();
      setShowResetConfirm(false); // Tutup modal
    } catch (err) { 
        console.error(err); 
    } finally { 
        setLoading(false); 
    }
  };

  // --- DOWNLOAD HANDLERS ---
  const handleDownloadCSV = () => {
    const headers = "Date,Full Name,WhatsApp,Email,Used Referral,Generated Code,Status\n";
    const rows = requests.map(r => 
      `"${formatDate(r.createdAt)}","${r.fullName}","${r.whatsapp}","${r.email}","${r.usedReferralCode}","${r.generatedReferralCode}","${r.status}"`
    ).join("\n");
    
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RECEPTION_DATA_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    setShowExportMenu(false);
  };

  const handleDownloadExcel = () => {
    const data = requests.map(r => ({
      Date: formatDate(r.createdAt),
      "Full Name": r.fullName,
      WhatsApp: r.whatsapp,
      Email: r.email,
      "Used Referral": r.usedReferralCode,
      "Generated Code": r.generatedReferralCode,
      Status: r.status
    }));

    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Registrations");
    writeFile(wb, `RECEPTION_DATA_${new Date().toISOString().split('T')[0]}.xlsx`);
    setShowExportMenu(false);
  };

  // --- INTERNAL COMPONENTS ---
  const StatusBadge = ({ status }: { status: RegistrationStatus }) => {
    const config = {
      'DRAFT': { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', label: 'Draft / Unpaid' },
      'SENT_TO_DB': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Paid & Queued' },
      'VERIFIED': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Registered' },
      'PAID': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'Paid' }
    };
    const s = config[status] || config['DRAFT'];
    return (
      <span className={`px-2 py-1 rounded-md text-[10px] md:text-xs font-bold border ${s.bg} ${s.text} ${s.border} flex items-center gap-1.5 w-fit shadow-sm uppercase tracking-wider`}>
        {status === 'VERIFIED' && <ShieldCheck size={12} />}
        {status === 'SENT_TO_DB' && <Clock size={12} className="animate-pulse"/>}
        {s.label}
      </span>
    );
  };

  // FILTER & PAGINATION Logic
  const filteredRequests = requests.filter(req => {
     if (!searchQuery) return true;
     const lowerQ = searchQuery.toLowerCase();
     return (
        req.fullName.toLowerCase().includes(lowerQ) ||
        req.email.toLowerCase().includes(lowerQ) ||
        req.generatedReferralCode.toLowerCase().includes(lowerQ) ||
        (req.usedReferralCode && req.usedReferralCode.toLowerCase().includes(lowerQ))
     );
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredRequests.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);

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
    <AdminLayout user={user} title="Referral Generator">
      
      {/* 1. DATA ENTRY AREA */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start mb-4 gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <ClipboardPaste className="text-indigo-600" size={20} />
              Input Data
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              Supports: <b>WhatsApp Copy-Paste</b> or <b>CSV Format</b>.
            </p>
          </div>
        </div>
        
        <textarea 
          value={rawData}
          onChange={(e) => {
            const cleanText = e.target.value.replace(/\*/g, '');
            setRawData(cleanText);
          }}
          placeholder={`Halo Admin, saya ingin mendaftar:
Full Name: Fuad Muslim
WhatsApp: 082338792512
Email: fuad@gmail.com
Referral: fu3312...`}
          className="w-full h-48 p-4 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none font-medium text-slate-900 placeholder:text-slate-400 text-sm mb-4 resize-none transition-all"
        />

        <div className="flex justify-end">
          <button 
            onClick={handleProcessRawData}
            disabled={processing || !rawData}
            className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-bold shadow-md shadow-indigo-200 flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-sm"
          >
            {processing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus size={18} />}
            <span>Generate Referral Code</span>
          </button>
        </div>
      </div>

      {/* 2. DASHBOARD METRICS & TOOLBAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm sticky top-[70px] z-20 mb-6">
        <div className="flex flex-col xl:flex-row justify-between items-center gap-4">
            
            {/* Left: Metrics */}
            <div className="flex gap-4 md:gap-6 text-sm w-full xl:w-auto overflow-x-auto pb-1 xl:pb-0">
                <div className="flex items-center gap-2 whitespace-nowrap">
                    <span className="font-bold text-slate-700">Total: {requests.length}</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-700 whitespace-nowrap">
                    <ShieldCheck size={16} className="text-emerald-500"/>
                    <span className="font-bold">Registered: {requests.filter(r => r.status === 'VERIFIED').length}</span>
                </div>
                <div className="flex items-center gap-2 text-amber-600 whitespace-nowrap">
                    <Clock size={16} className="text-amber-500"/>
                    <span className="font-bold">Queued to DB: {requests.filter(r => r.status === 'SENT_TO_DB').length}</span>
                </div>
            </div>

            {/* Right: Actions & Search */}
            <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto items-stretch md:items-center">
                
                {/* Search Bar */}
                <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="Search Name / Email / Code..." 
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        className="w-full pl-9 pr-4 py-2 bg-slate-100 border-transparent focus:bg-white focus:border-indigo-500 rounded-lg text-sm transition-all focus:ring-2 focus:ring-indigo-100 outline-none"
                    />
                </div>

                <div className="flex gap-2">
                    {/* EXPORT DROPDOWN */}
                    <div className="relative flex-1 md:flex-none">
                        <button 
                        onClick={() => setShowExportMenu(!showExportMenu)} 
                        className="w-full justify-center bg-slate-100 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-200 text-xs font-bold flex items-center gap-2 transition-colors"
                        >
                        <Download size={14} /> 
                        <span>Export</span>
                        <ChevronDown size={14} className={`transition-transform duration-200 ${showExportMenu ? 'rotate-180' : ''}`}/>
                        </button>
                        
                        {showExportMenu && (
                            <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)}></div>
                            <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-20 p-1 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                                <button 
                                    onClick={handleDownloadCSV}
                                    className="w-full text-left px-4 py-3 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-700 flex items-center gap-2 transition-colors"
                                >
                                    <FileText size={16} className="text-indigo-500" />
                                    <span>Download CSV</span>
                                </button>
                                <button 
                                    onClick={handleDownloadExcel}
                                    className="w-full text-left px-4 py-3 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-700 flex items-center gap-2 transition-colors"
                                >
                                    <FileSpreadsheet size={16} className="text-emerald-500" />
                                    <span>Download Sheet</span>
                                </button>
                            </div>
                            </>
                        )}
                    </div>
                    
                    <button onClick={handleResetClick} className="flex-1 md:flex-none justify-center bg-red-50 text-red-600 px-3 py-2 rounded-lg hover:bg-red-100 border border-red-100 text-xs font-bold flex items-center gap-2 transition-colors">
                        <RotateCcw size={14} /> Clear
                    </button>
                </div>
            </div>
        </div>
        
        {/* Sorting Indicator */}
        <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-400 font-medium">
             <ArrowUp size={12} className="text-indigo-500" />
             <span>Sorting: FIFO (Terlama di atas)</span>
        </div>
      </div>

      {/* ERROR MESSAGE */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 flex items-start gap-3">
           <AlertTriangle size={20} className="mt-0.5 shrink-0" />
           <div>
             <h4 className="font-bold text-sm">Notification</h4>
             <p className="text-xs mt-1">{errorMsg}</p>
           </div>
        </div>
      )}

      {/* 3. MOBILE CARD VIEW */}
      <div className="md:hidden">
        {loading ? <Skeleton className="h-40 w-full mb-4" /> : currentItems.map((req) => (
          <RequestCard 
            key={req.id} 
            req={req} 
            onDeleteClick={handleDeleteClick}
            onUpdateStatus={updateStatus}
            formatDate={formatDate}
          />
        ))}
        {!loading && requests.length === 0 && !errorMsg && (
          <div className="text-center py-10 text-slate-400">No guests pending.</div>
        )}
        <PaginationControls />
      </div>

      {/* 4. DESKTOP TABLE VIEW */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date (FIFO)</th>
                <th className="px-6 py-4">User Details</th>
                <th className="px-6 py-4">Generated Key</th>
                <th className="px-6 py-4">Referral Used</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                 <tr><td colSpan={6} className="p-8"><Skeleton className="h-12 w-full mb-2" /></td></tr>
              ) : currentItems.length === 0 ? (
                 <tr><td colSpan={6} className="p-16 text-center text-slate-400">{errorMsg ? "No notifications." : "No data matching search."}</td></tr>
              ) : (
                currentItems.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4"><StatusBadge status={req.status} /></td>
                    <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                       <div className="flex items-center gap-1.5">
                         <Calendar size={12} className="text-slate-400"/>
                         {formatDate(req.createdAt)}
                       </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800">{req.fullName}</div>
                      <div className="text-slate-500 text-xs">{req.email}</div>
                      <div className="text-slate-400 text-xs font-mono mt-0.5">{req.whatsapp}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <code className="bg-slate-100 px-2 py-1 rounded border border-slate-200 text-indigo-700 font-mono font-bold">{req.generatedReferralCode}</code>
                        <button onClick={() => navigator.clipboard.writeText(req.generatedReferralCode)} className="text-slate-400 hover:text-indigo-600"><Copy size={14} /></button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {req.usedReferralCode !== '-' ? <span className="text-xs font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded">{req.usedReferralCode}</span> : <span className="text-slate-300">-</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {req.status === 'DRAFT' && (
                          <button 
                            onClick={() => updateStatus(req.id, 'SENT_TO_DB', req)} 
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-xs font-bold transition-colors shadow-md shadow-indigo-100"
                            title="Konfirmasi Pembayaran & Kirim ke DB"
                          >
                            <DollarSign size={14} /> Sudah Bayar
                          </button>
                        )}
                        <button 
                          onClick={(e) => handleDeleteClick(req, e)} 
                          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus Data"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
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

      {/* --- CONFIRMATION MODALS --- */}
      
      {/* 1. DELETE MODAL */}
      <ConfirmationModal 
         isOpen={!!deleteTarget}
         title="Hapus Data Antrian?"
         message={deleteTarget ? `Anda yakin ingin menghapus data antrian untuk:\n\nNama: ${deleteTarget.fullName}\nEmail: ${deleteTarget.email}\n\nPERHATIAN: Tindakan ini hanya menghapus data dari list pendaftaran ini.` : ''}
         onConfirm={executeDelete}
         onCancel={() => setDeleteTarget(null)}
         isProcessing={processing}
         confirmLabel="Ya, Hapus Data"
         isDestructive={true}
      />

      {/* 2. RESET MODAL */}
      <ConfirmationModal 
         isOpen={showResetConfirm}
         title="Reset List Antrian?"
         message="Apakah Anda yakin ingin menghapus SEMUA data dengan status DRAFT dan PAID?\n\nData dengan status Pending (Sent to DB) dan Verified akan tetap AMAN dan tidak terhapus."
         onConfirm={executeReset}
         onCancel={() => setShowResetConfirm(false)}
         isProcessing={loading}
         confirmLabel="Reset Sekarang"
         isDestructive={true}
      />

    </AdminLayout>
  );
};