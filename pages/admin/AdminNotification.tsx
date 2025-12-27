import React, { useState } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { UserProfile } from '../../types';
import { 
  Bell, Send, CheckCircle, MessageSquare, Info
} from 'lucide-react';
import { 
  collection, addDoc, serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../firebase';

interface Props {
  user: UserProfile;
}

export const AdminNotification: React.FC<Props> = ({ user }) => {
  // Broadcast States
  const [sending, setSending] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);
  
  // Form States
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState('ALL');
  const [link, setLink] = useState('');

  // --- BROADCAST ACTION ---
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return;
    setSending(true);
    
    try {
      await addDoc(collection(db, 'admin_notification'), {
        title,
        message,
        target,
        link: link || null,
        createdBy: user.uid,
        createdAt: serverTimestamp()
      });
      setTitle(''); setMessage(''); setLink(''); setBroadcastSuccess(true);
      setTimeout(() => setBroadcastSuccess(false), 3000);
    } catch (err) {
      alert("Failed to send broadcast.");
    } finally {
      setSending(false);
    }
  };

  return (
    <AdminLayout user={user} title="Broadcast Center">
      
      {/* HEADER INFO */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 shadow-sm">
         <div className="flex items-center gap-3 text-indigo-600">
            <Bell size={20} />
            <span className="font-bold text-sm">System Announcement Manager</span>
         </div>
      </div>

      <div className="p-4 md:p-8 max-w-5xl mx-auto">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* COLUMN 1: COMPOSE FORM */}
            <div className="lg:col-span-1">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm sticky top-24">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6 text-lg">
                    <MessageSquare size={20} className="text-indigo-600" />
                    Compose Message
                </h3>
                
                {broadcastSuccess && (
                    <div className="mb-6 p-4 bg-emerald-50 text-emerald-700 text-sm rounded-xl flex items-center gap-2 border border-emerald-100 animate-in fade-in slide-in-from-top-2">
                        <CheckCircle size={16} /> 
                        <span className="font-bold">Message sent successfully!</span>
                    </div>
                )}

                <form onSubmit={handleSendBroadcast} className="space-y-5">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Title / Subject</label>
                        <input 
                            type="text" required value={title} onChange={e => setTitle(e.target.value)}
                            className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all bg-slate-50 focus:bg-white"
                            placeholder="e.g. System Maintenance"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Target Audience</label>
                        <select 
                            value={target} onChange={e => setTarget(e.target.value)}
                            className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-slate-50 focus:bg-white"
                        >
                            <option value="ALL">All Users</option>
                            <option value="PREMIUM">Premium Members</option>
                            <option value="FREE">Free Members</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Message Body</label>
                        <textarea 
                            required value={message} onChange={e => setMessage(e.target.value)}
                            className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm h-40 resize-none bg-slate-50 focus:bg-white leading-relaxed"
                            placeholder="Type your announcement here..."
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Action Link (Optional)</label>
                        <input 
                            type="text" value={link} onChange={e => setLink(e.target.value)}
                            className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-slate-50 focus:bg-white"
                            placeholder="https://..."
                        />
                    </div>
                    <button 
                        disabled={sending}
                        className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5"
                    >
                        {sending ? 'Sending...' : <><Send size={18} /> Send Broadcast</>}
                    </button>
                </form>
                </div>
            </div>

            {/* COLUMN 2: INFO / PREVIEW */}
            <div className="lg:col-span-2">
                <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200 h-full flex flex-col items-center justify-center text-center text-slate-400 min-h-[400px]">
                    <div className="max-w-sm">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100">
                            <Bell size={32} className="text-slate-300" />
                        </div>
                        <h4 className="font-bold text-slate-600 text-lg mb-2">How Broadcast Works</h4>
                        <p className="text-sm leading-relaxed mb-6">
                            Pesan yang Anda kirim di sini akan disimpan ke database <code>admin_notification</code>. Aplikasi User akan membaca data ini dan menampilkannya pada menu lonceng notifikasi di Dashboard mereka.
                        </p>
                        
                        <div className="bg-blue-50 text-blue-700 p-4 rounded-xl text-left text-xs border border-blue-100 flex gap-3">
                             <Info size={20} className="shrink-0" />
                             <p>
                                <strong>Tip:</strong> Gunakan fitur ini dengan bijak. Terlalu sering mengirim notifikasi dapat mengganggu pengalaman pengguna.
                             </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

      </div>
    </AdminLayout>
  );
};