import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { UserProfile } from '../../types';
import { Skeleton } from '../../components/Skeleton';
import { 
  Gift, ArrowRight, Wallet, Medal, CheckCircle,
  FileSpreadsheet, Clock, Search, Edit3, Tag, TrendingUp, AlertTriangle, Trophy
} from 'lucide-react';
import { 
  collection, getDocs, doc, serverTimestamp, 
  query, orderBy, where, writeBatch, increment 
} from 'firebase/firestore';
import { db } from '../../firebase';

interface Props {
  user: UserProfile;
}

// --- INTERNAL COMPONENT: CONFIRMATION MODAL ---
const ConfirmationModal = ({ 
  isOpen, title, message, onConfirm, onCancel, isProcessing, confirmLabel = "Ya, Proses"
}: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-3 text-slate-800">
             <div className="p-2 bg-amber-100 rounded-full text-amber-600">
               <AlertTriangle size={20} />
             </div>
             <h3 className="font-bold text-lg">{title}</h3>
          </div>
          <p className="text-slate-600 text-sm whitespace-pre-wrap leading-relaxed mb-6 pl-1">{message}</p>
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
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AdminReward: React.FC<Props> = ({ user }) => {
  // NAVIGATION TABS
  const [activeTab, setActiveTab] = useState<'INCOMING' | 'PAYOUT' | 'HISTORY' | 'MANUAL'>('INCOMING');
  
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // --- PRICE CONFIGURATION STATE ---
  const [appPrice, setAppPrice] = useState<number>(100000); 
  const [tempPrice, setTempPrice] = useState<string>('100000');
  const [isPriceLocked, setIsPriceLocked] = useState(true);

  // DATA STATES
  const [incomingData, setIncomingData] = useState<any[]>([]); // Tab: INCOMING
  const [payoutData, setPayoutData] = useState<any[]>([]); // Tab: PAYOUT
  const [historyData, setHistoryData] = useState<any[]>([]); // Tab: HISTORY
  
  // Achievement Form State (Manual)
  const [achForm, setAchForm] = useState({ email: '', title: '', amount: '', description: '' });

  // History Search
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // MODAL & TOAST
  const [confirmation, setConfirmation] = useState<{
    isOpen: boolean;
    type: 'ENTER_POIN' | 'PAYOUT' | null;
    data: any;
  }>({ isOpen: false, type: null, data: null });

  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000); 
  };

  // --- FETCH DATA ---
  const fetchAllData = async () => {
    setLoading(true);
    try {
      // 1. INCOMING (New Registrations)
      const qInc = query(collection(db, 'registrations'), where('status', '==', 'VERIFIED'));
      const snapInc = await getDocs(qInc);
      const incoming = snapInc.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .filter(item => (!item.rewardStatus || item.rewardStatus === 'PENDING'))
        .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)); // FIFO

      // 2. PROCESSED (Payouts & History)
      const qProc = query(collection(db, 'reward_calculations'), orderBy('createdAt', 'desc'));
      const snapProc = await getDocs(qProc);
      const allCalculations = snapProc.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

      const readyPayouts = allCalculations.filter(d => d.status === 'READY_TO_SEND');
      const finishedHistory = allCalculations.filter(d => d.status === 'SENT');

      setIncomingData(incoming);
      setPayoutData(readyPayouts);
      setHistoryData(finishedHistory);

    } catch (error) {
      console.error("Fetch data error:", error);
      showToast("Gagal mengambil data.", 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [activeTab]); // Refresh when tab changes

  // --- ACTIONS ---

  // 1. CONFIG PRICE
  const handleSetPrice = () => {
    const val = parseInt(tempPrice.replace(/\D/g, ''));
    if (!val || val <= 0) return showToast("Nominal tidak valid.", 'error');
    setAppPrice(val);
    setIsPriceLocked(true);
    showToast(`Harga dikunci: Rp ${val.toLocaleString()}`, 'success');
  };

  // 2. ENTER POIN
  const triggerEnterPoin = (item: any) => setConfirmation({ isOpen: true, type: 'ENTER_POIN', data: item });
  
  const executeEnterPoin = async () => {
    const item = confirmation.data;
    if (!item) return;
    setProcessingId(item.id);
    try {
      const batch = writeBatch(db);
      
      // REFERRAL BONUS
      if (item.usedReferralCode && item.usedReferralCode !== '-') {
        const usersRef = collection(db, 'users');
        const qUser = query(usersRef, where('referralCode', '==', item.usedReferralCode));
        const userSnap = await getDocs(qUser);

        if (!userSnap.empty) {
            const referrerData = userSnap.docs[0].data();
            const qRefList = query(usersRef, where('referredBy', '==', item.usedReferralCode));
            const refListSnap = await getDocs(qRefList);
            const activeCount = refListSnap.size;

            let tier = 'Rookie', percentage = 0.05;
            if (activeCount > 30) { tier = 'Legend'; percentage = 0.10; } 
            else if (activeCount > 10) { tier = 'Pro'; percentage = 0.07; }

            const bonusAmount = appPrice * percentage;
            const refBonusDoc = doc(collection(db, 'reward_calculations'));
            batch.set(refBonusDoc, {
                sourceId: item.id, type: 'REFERRAL_BONUS',
                targetEmail: userSnap.docs[0].id, targetName: referrerData.fullName || 'Unknown',
                tier, referralCount: activeCount, percentage, transactionBase: appPrice, bonusAmount,
                status: 'READY_TO_SEND', createdAt: serverTimestamp(),
                description: `Referral Bonus (Tier ${tier}) dari: ${item.fullName}`
            });
        }
      }

      // CASHBACK
      const cashbackPercentage = 0.10;
      const cashbackAmount = appPrice * cashbackPercentage;
      const cashbackDoc = doc(collection(db, 'reward_calculations'));
      batch.set(cashbackDoc, {
          sourceId: item.id, type: 'CASHBACK',
          targetEmail: item.email, targetName: item.fullName,
          transactionBase: appPrice, percentage: cashbackPercentage, bonusAmount: cashbackAmount,
          status: 'READY_TO_SEND', createdAt: serverTimestamp(),
          description: `Welcome Cashback (10%) - New Member`
      });

      const regDoc = doc(db, 'registrations', item.id);
      batch.update(regDoc, { rewardStatus: 'CALCULATED' });

      await batch.commit();
      
      // Optimistic Update
      setIncomingData(prev => prev.filter(p => p.id !== item.id));
      fetchAllData(); // Background refresh to update payout tab
      setConfirmation({ isOpen: false, type: null, data: null });
      showToast(`Sukses menghitung reward!`, 'success');

    } catch (error: any) {
      showToast("Gagal: " + error.message, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // 3. PAYOUT
  const triggerPayout = (item: any) => setConfirmation({ isOpen: true, type: 'PAYOUT', data: item });

  const executePayout = async () => {
    const calcItem = confirmation.data;
    if (!calcItem) return;
    setProcessingId(calcItem.id);
    try {
        const batch = writeBatch(db);
        const userRef = doc(db, 'users', calcItem.targetEmail);
        batch.update(userRef, { balance: increment(calcItem.bonusAmount) });

        const calcRef = doc(db, 'reward_calculations', calcItem.id);
        batch.update(calcRef, { status: 'SENT', sentAt: serverTimestamp() });

        const notifRef = doc(collection(db, 'user_notifications'));
        batch.set(notifRef, {
            userEmail: calcItem.targetEmail,
            title: calcItem.type === 'CASHBACK' ? 'Cashback Diterima!' : 'Referral Reward Masuk!',
            message: `Saldo +${calcItem.bonusAmount.toLocaleString()}. (${calcItem.description})`,
            isRead: false, createdAt: serverTimestamp(), type: 'REWARD', link: '/dashboard'
        });

        await batch.commit();
        setPayoutData(prev => prev.filter(p => p.id !== calcItem.id));
        setHistoryData(prev => [{...calcItem, status: 'SENT'}, ...prev]);
        setConfirmation({ isOpen: false, type: null, data: null });
        showToast(`Payout terkirim!`, 'success');
    } catch (error: any) {
        showToast("Gagal payout: " + error.message, 'error');
    } finally {
        setProcessingId(null);
    }
  };

  // 4. MANUAL EVENT
  const handleSendAchievement = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!achForm.email || !achForm.amount) return;
    setLoading(true);
    try {
       const userEmail = achForm.email.toLowerCase();
       const batch = writeBatch(db);
       const userRef = doc(db, 'users', userEmail);
       batch.update(userRef, { balance: increment(Number(achForm.amount)) });

       const historyRef = doc(collection(db, 'reward_calculations'));
       batch.set(historyRef, {
         type: 'ACHIEVEMENT', targetEmail: userEmail, targetName: 'Manual Event',
         bonusAmount: Number(achForm.amount), title: achForm.title, description: achForm.description,
         status: 'SENT', sentAt: serverTimestamp(), createdAt: serverTimestamp()
       });

        const notifRef = doc(collection(db, 'user_notifications'));
        batch.set(notifRef, {
            userEmail: userEmail, title: `Event Reward: ${achForm.title}`, message: `+${achForm.amount} Poin! ${achForm.description}`,
            isRead: false, createdAt: serverTimestamp(), type: 'ACHIEVEMENT'
        });

       await batch.commit();
       showToast(`Event Reward sent!`, 'success');
       setAchForm({ email: '', title: '', amount: '', description: '' });
       setLoading(false);
    } catch (error: any) {
       showToast("Gagal: " + error.message, 'error');
       setLoading(false);
    }
  };

  // HISTORY FILTERING
  const filteredHistory = historyData.filter(d => {
      if(!searchQuery) return true;
      const lowerQ = searchQuery.toLowerCase();
      return (d.targetName || '').toLowerCase().includes(lowerQ) || (d.targetEmail || '').toLowerCase().includes(lowerQ);
  });
  const currentHistory = filteredHistory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // --- UI HELPERS ---
  const NavButton = ({ id, label, icon: Icon, count, colorClass }: any) => (
    <button 
      onClick={() => setActiveTab(id)}
      className={`flex-1 min-w-[140px] py-4 px-2 text-xs md:text-sm font-bold border-b-2 flex flex-col md:flex-row items-center justify-center gap-2 transition-all
        ${activeTab === id ? `border-indigo-600 text-indigo-600 bg-indigo-50/50` : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700'}
      `}
    >
        <div className={`relative ${activeTab === id ? 'text-indigo-600' : 'text-slate-400'}`}>
            <Icon size={18} />
            {count > 0 && (
                <span className={`absolute -top-2 -right-2 ${colorClass} text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full shadow-sm`}>
                    {count}
                </span>
            )}
        </div>
        <span>{label}</span>
    </button>
  );

  return (
    <AdminLayout user={user} title="Reward Center">
      
      {/* 1. TOP STATS (GLOBAL) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs text-slate-500 font-bold uppercase">Base Price</div>
            <div className="flex items-center gap-2 mt-1">
                <input 
                    type="text" value={tempPrice} onChange={(e) => setTempPrice(e.target.value)} disabled={isPriceLocked}
                    className={`w-full text-sm font-bold font-mono outline-none ${isPriceLocked ? 'bg-transparent' : 'border-b border-indigo-300'}`} 
                />
                <button onClick={() => isPriceLocked ? setIsPriceLocked(false) : handleSetPrice()} className="text-indigo-500 hover:text-indigo-700">
                    {isPriceLocked ? <Edit3 size={14}/> : <CheckCircle size={14}/>}
                </button>
            </div>
         </div>
         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs text-slate-500 font-bold uppercase">To Process</div>
            <div className="text-lg font-bold text-slate-800">{incomingData.length}</div>
         </div>
         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs text-slate-500 font-bold uppercase">Pending Payout</div>
            <div className="text-lg font-bold text-amber-600">{payoutData.length}</div>
         </div>
         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs text-slate-500 font-bold uppercase">Paid Out</div>
            <div className="text-lg font-bold text-emerald-600">Rp {historyData.reduce((a, b) => a + (b.bonusAmount || 0), 0).toLocaleString()}</div>
         </div>
      </div>

      {/* 2. NAVIGATION TABS */}
      <div className="bg-white rounded-t-xl border-b border-slate-200 flex flex-wrap shadow-sm sticky top-[70px] z-20">
         <NavButton id="INCOMING" label="New Registrations" icon={Clock} count={incomingData.length} colorClass="bg-blue-500" />
         <NavButton id="PAYOUT" label="Ready for Payout" icon={Wallet} count={payoutData.length} colorClass="bg-amber-500" />
         <NavButton id="HISTORY" label="Transaction History" icon={FileSpreadsheet} count={0} colorClass="" />
         <NavButton id="MANUAL" label="Manual / Event" icon={Medal} count={0} colorClass="" />
      </div>

      <div className="bg-white p-6 rounded-b-xl border border-slate-200 border-t-0 min-h-[500px]">
         
         {/* TAB 1: NEW REGISTRATIONS */}
         {activeTab === 'INCOMING' && (
            <div className="animate-in fade-in space-y-4">
                <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm border border-blue-100">
                   <Tag size={16} />
                   <p>User di bawah ini sudah <strong>Verified</strong> tapi belum dihitung bonus/reward-nya. Klik "Hitung" untuk memproses.</p>
                </div>
                {loading && incomingData.length === 0 ? <Skeleton className="h-20 w-full" /> :
                 incomingData.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-100 rounded-xl">Tidak ada registrasi baru.</div>
                 ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                       {incomingData.map(item => (
                          <div key={item.id} className="border border-slate-200 p-4 rounded-xl hover:border-blue-400 transition-all shadow-sm group bg-white">
                             <div className="flex justify-between items-start mb-3">
                                <div>
                                   <div className="font-bold text-slate-800">{item.fullName}</div>
                                   <div className="text-xs text-slate-500">{item.email}</div>
                                </div>
                                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded">Ref: {item.usedReferralCode}</span>
                             </div>
                             <button onClick={() => triggerEnterPoin(item)} disabled={!!processingId}
                                className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 group-hover:bg-blue-700"
                             >
                                {processingId === item.id ? 'Calculating...' : <><ArrowRight size={14}/> Hitung Reward</>}
                             </button>
                          </div>
                       ))}
                    </div>
                 )
                }
            </div>
         )}

         {/* TAB 2: READY FOR PAYOUT */}
         {activeTab === 'PAYOUT' && (
            <div className="animate-in fade-in space-y-4">
                <div className="flex items-center gap-2 mb-4 p-3 bg-amber-50 text-amber-800 rounded-lg text-sm border border-amber-100">
                   <Wallet size={16} />
                   <p>Reward sudah dihitung. Klik "Kirim Saldo" untuk memasukkan poin ke akun user.</p>
                </div>
                {payoutData.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-100 rounded-xl">Semua reward sudah dibayarkan (Clean).</div>
                 ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                       {payoutData.map(item => (
                          <div key={item.id} className="border border-amber-200 bg-amber-50/30 p-4 rounded-xl shadow-sm">
                             <div className="flex items-center gap-3 mb-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs ${item.type === 'CASHBACK' ? 'bg-emerald-500' : 'bg-indigo-500'}`}>
                                    {item.type === 'CASHBACK' ? 'CB' : 'REF'}
                                </div>
                                <div>
                                    <div className="font-bold text-slate-800 text-sm">{item.targetName}</div>
                                    <div className="text-xs font-mono font-bold text-emerald-600">+ {item.bonusAmount?.toLocaleString()}</div>
                                </div>
                             </div>
                             <p className="text-[10px] text-slate-500 mb-3 line-clamp-2">{item.description}</p>
                             <button onClick={() => triggerPayout(item)} disabled={!!processingId}
                                className="w-full py-2 bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-900"
                             >
                                {processingId === item.id ? 'Sending...' : <><CheckCircle size={14}/> Kirim Saldo</>}
                             </button>
                          </div>
                       ))}
                    </div>
                 )
                }
            </div>
         )}

         {/* TAB 3: HISTORY */}
         {activeTab === 'HISTORY' && (
            <div className="animate-in fade-in">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-700 text-sm">Completed Transactions</h3>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input type="text" placeholder="Cari nama/email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                           className="pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-500 w-48" />
                    </div>
                </div>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                   <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold uppercase">
                          <tr><th className="p-3">User</th><th className="p-3">Type</th><th className="p-3">Amount</th><th className="p-3">Status</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {currentHistory.length === 0 ? <tr><td colSpan={4} className="p-4 text-center text-slate-400">Tidak ada data.</td></tr> :
                            currentHistory.map(h => (
                                <tr key={h.id} className="hover:bg-slate-50">
                                    <td className="p-3">
                                        <div className="font-bold text-slate-700">{h.targetName}</div>
                                        <div className="text-slate-400">{h.targetEmail}</div>
                                    </td>
                                    <td className="p-3"><span className="bg-slate-100 px-2 py-1 rounded">{h.type}</span></td>
                                    <td className="p-3 font-mono font-bold text-emerald-600">{h.bonusAmount?.toLocaleString()}</td>
                                    <td className="p-3 text-emerald-600 font-bold flex items-center gap-1"><CheckCircle size={12}/> Sent</td>
                                </tr>
                            ))
                          }
                      </tbody>
                   </table>
                </div>
            </div>
         )}

         {/* TAB 4: MANUAL */}
         {activeTab === 'MANUAL' && (
            <div className="max-w-xl mx-auto py-6 animate-in fade-in">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6"><Trophy size={20} className="text-amber-500"/> Input Event Reward</h3>
                    <form onSubmit={handleSendAchievement} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Email User</label>
                            <input type="email" required value={achForm.email} onChange={e => setAchForm({...achForm, email: e.target.value})}
                                className="w-full p-3 rounded-lg border border-slate-200 bg-slate-50 outline-none text-sm" placeholder="user@email.com" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Event Title</label>
                                <input type="text" required value={achForm.title} onChange={e => setAchForm({...achForm, title: e.target.value})}
                                    className="w-full p-3 rounded-lg border border-slate-200 bg-slate-50 outline-none text-sm" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Amount (Rp)</label>
                                <input type="number" required value={achForm.amount} onChange={e => setAchForm({...achForm, amount: e.target.value})}
                                    className="w-full p-3 rounded-lg border border-slate-200 bg-slate-50 outline-none text-sm font-bold" />
                            </div>
                        </div>
                        <textarea value={achForm.description} onChange={e => setAchForm({...achForm, description: e.target.value})}
                                className="w-full p-3 rounded-lg border border-slate-200 bg-slate-50 outline-none text-sm h-24" placeholder="Deskripsi..." />
                        <button disabled={loading} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center justify-center gap-2">
                            {loading ? 'Sending...' : <><Gift size={18}/> Kirim Reward</>}
                        </button>
                    </form>
                </div>
            </div>
         )}

      </div>

      <ConfirmationModal 
        isOpen={confirmation.isOpen}
        title={confirmation.type === 'ENTER_POIN' ? "Konfirmasi Hitung Reward" : "Konfirmasi Payout"}
        message={confirmation.type === 'ENTER_POIN' 
            ? `Hitung reward untuk ${confirmation.data?.fullName}?` 
            : `Kirim saldo Rp ${confirmation.data?.bonusAmount?.toLocaleString()} ke ${confirmation.data?.targetEmail}?`}
        onConfirm={confirmation.type === 'ENTER_POIN' ? executeEnterPoin : executePayout}
        onCancel={() => setConfirmation({ isOpen: false, type: null, data: null })}
        confirmLabel={confirmation.type === 'ENTER_POIN' ? "Hitung Sekarang" : "Kirim Saldo"}
        isProcessing={!!processingId}
      />
      
      {toast.show && (
          <div className={`fixed top-6 right-6 z-[110] p-4 rounded-xl shadow-xl flex items-center gap-3 animate-in slide-in-from-right ${toast.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
             <div className="font-bold text-sm">{toast.message}</div>
          </div>
      )}
    </AdminLayout>
  );
};