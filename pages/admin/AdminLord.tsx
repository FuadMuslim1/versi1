import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { UserProfile } from '../../types';
import { 
  Crown, Database, Users, Gift, Bell, ArrowRight, 
  Terminal, Save, Trash2, RefreshCw, AlertTriangle, Search
} from 'lucide-react';
import { collection, getDocs, doc, deleteDoc, updateDoc, query, limit } from 'firebase/firestore';
import { db } from '../../firebase';

interface Props {
  user: UserProfile;
}

export const AdminLord: React.FC<Props> = ({ user }) => {
  // State for Raw Data Viewer
  const [selectedCollection, setSelectedCollection] = useState('users');
  const [rawData, setRawData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);
  
  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const collections = [
    'users', 
    'registrations', 
    'admin_referral_code', 
    'admin_database', 
    'admin_reward', 
    'admin_notification',
    'reward_calculations'
  ];

  const fetchData = async () => {
    setLoading(true);
    setRawData([]);
    try {
      const q = query(collection(db, selectedCollection), limit(50)); // Safety limit
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRawData(data);
    } catch (error) {
      console.error("Lord Access Error:", error);
      alert("Failed to fetch data. Check console.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCollection]);

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setEditContent(JSON.stringify(item, null, 2));
    setJsonError(null);
  };

  const handleSave = async () => {
    if (!editingId) return;
    try {
      const parsed = JSON.parse(editContent);
      // Remove ID from payload if exists to avoid duplication inside doc
      const { id, ...data } = parsed; 
      
      await updateDoc(doc(db, selectedCollection, editingId), data);
      
      setRawData(prev => prev.map(item => item.id === editingId ? { id: editingId, ...data } : item));
      setEditingId(null);
      alert("Document updated directly.");
    } catch (e: any) {
      setJsonError("Invalid JSON: " + e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`ARE YOU SURE? This will permanently delete document ${id} from ${selectedCollection}.`)) return;
    try {
      await deleteDoc(doc(db, selectedCollection, id));
      setRawData(prev => prev.filter(item => item.id !== id));
    } catch (e: any) {
      alert("Delete failed: " + e.message);
    }
  };

  const StatCard = ({ title, count, icon: Icon, color }: any) => (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex items-center justify-between group hover:border-amber-500/50 transition-all">
       <div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-white group-hover:text-amber-400 transition-colors">{count}</h3>
       </div>
       <div className={`p-3 rounded-lg ${color} bg-opacity-20`}>
          <Icon className={color.replace('bg-', 'text-')} size={24} />
       </div>
    </div>
  );

  return (
    <AdminLayout user={user} title="Lord Command Center">
      
      {/* 1. Quick Stats / Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
         <div onClick={() => window.location.hash = '#/admin/referral'} className="cursor-pointer">
            <StatCard title="Referral System" count="Access" icon={Users} color="bg-indigo-500" />
         </div>
         <div onClick={() => window.location.hash = '#/admin/database'} className="cursor-pointer">
            <StatCard title="Database Master" count="Access" icon={Database} color="bg-purple-500" />
         </div>
         <div onClick={() => window.location.hash = '#/admin/reward'} className="cursor-pointer">
            <StatCard title="Reward Vault" count="Access" icon={Gift} color="bg-emerald-500" />
         </div>
         <div onClick={() => window.location.hash = '#/admin/notification'} className="cursor-pointer">
            <StatCard title="Broadcasts" count="Access" icon={Bell} color="bg-rose-500" />
         </div>
      </div>

      {/* 2. Raw Data Editor (The Power Tool) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl shadow-black">
         
         {/* Toolbar */}
         <div className="p-4 border-b border-slate-800 bg-slate-950 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
               <Terminal size={20} className="text-amber-500" />
               <h3 className="font-bold text-slate-200">Raw Data Viewer (God Mode)</h3>
            </div>
            
            <div className="flex items-center gap-2 w-full md:w-auto">
               <select 
                  value={selectedCollection}
                  onChange={(e) => setSelectedCollection(e.target.value)}
                  className="bg-slate-800 text-slate-300 text-sm border-none rounded-lg py-2 px-4 outline-none focus:ring-1 focus:ring-amber-500"
               >
                  {collections.map(c => <option key={c} value={c}>{c}</option>)}
               </select>
               <button onClick={fetchData} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
                  <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
               </button>
            </div>
         </div>

         {/* Editor Area */}
         <div className="flex flex-col lg:flex-row h-[600px]">
            
            {/* List */}
            <div className="w-full lg:w-1/3 border-r border-slate-800 overflow-y-auto p-2 bg-slate-900/50">
               {loading ? (
                  <div className="p-4 text-slate-500 text-sm">Scanning sector...</div>
               ) : rawData.length === 0 ? (
                  <div className="p-4 text-slate-600 text-sm">Collection is empty.</div>
               ) : (
                  rawData.map(item => (
                     <div 
                        key={item.id} 
                        onClick={() => handleEdit(item)}
                        className={`p-3 rounded-lg cursor-pointer mb-1 border transition-all
                           ${editingId === item.id 
                              ? 'bg-amber-900/20 border-amber-500/50 text-amber-100' 
                              : 'bg-transparent border-transparent hover:bg-slate-800 text-slate-400'}
                        `}
                     >
                        <div className="font-mono text-xs font-bold truncate">{item.id}</div>
                        <div className="text-[10px] opacity-70 truncate">
                           {item.email || item.fullName || item.title || 'No Label'}
                        </div>
                     </div>
                  ))
               )}
            </div>

            {/* Code Editor */}
            <div className="w-full lg:w-2/3 bg-slate-950 p-4 flex flex-col relative">
               {editingId ? (
                  <>
                     <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-mono text-slate-500">Editing: {editingId}</span>
                        <div className="flex gap-2">
                           <button onClick={() => handleDelete(editingId)} className="text-red-500 hover:bg-red-900/20 p-2 rounded transition-colors"><Trash2 size={16}/></button>
                           <button onClick={handleSave} className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-1.5 rounded text-xs font-bold flex items-center gap-2"><Save size={14}/> Save Changes</button>
                        </div>
                     </div>
                     <textarea 
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="flex-1 bg-slate-900 text-green-400 font-mono text-xs p-4 rounded-lg outline-none border border-slate-800 focus:border-amber-900 resize-none"
                        spellCheck={false}
                     />
                     {jsonError && (
                        <div className="absolute bottom-6 left-6 right-6 bg-red-900/80 text-white text-xs p-3 rounded border border-red-500 backdrop-blur-sm flex items-center gap-2">
                           <AlertTriangle size={14} /> {jsonError}
                        </div>
                     )}
                  </>
               ) : (
                  <div className="flex-1 flex items-center justify-center text-slate-700 flex-col gap-4">
                     <Crown size={64} className="opacity-20" />
                     <p>Select a document from the left to edit directly.</p>
                  </div>
               )}
            </div>
         </div>
      </div>

    </AdminLayout>
  );
};