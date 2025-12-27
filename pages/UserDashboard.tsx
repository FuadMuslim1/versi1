import React from 'react';
import { Layout } from '../components/Layout';
import { UserProfile } from '../types';
import { TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  user: UserProfile;
}

export const UserDashboard: React.FC<Props> = ({ user }) => {
  const navigate = useNavigate();

  return (
    <Layout user={user} title="Dashboard">
      
      {/* Welcome Header */}
      <div className="mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
           <h2 className="text-2xl font-bold text-slate-800">Hi, {user.displayName?.split(' ')[0] || 'User'}!</h2>
           <p className="text-slate-500 text-sm mt-1">Siap untuk belajar bahasa Inggris hari ini?</p>
        </div>
      </div>

      {/* Main Action Card */}
      <div className="bg-indigo-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-lg shadow-indigo-200 mb-8">
         <div className="relative z-10 max-w-lg">
           <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-xs font-bold mb-4 backdrop-blur-sm border border-white/20">
              <TrendingUp size={14} /> Start Learning
           </div>
           <h3 className="text-3xl font-bold mb-3">Welcome to your workspace</h3>
           <p className="text-indigo-100 leading-relaxed mb-8 opacity-90 text-sm">
             Akses semua fitur pembelajaran melalui menu di <strong>Sidebar</strong>. 
             Mulai dari latihan, cek progress, hingga klaim hadiah.
           </p>
           <button 
             onClick={() => navigate('/subject')}
             className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-colors inline-flex items-center gap-2 shadow-lg"
           >
             Mulai Belajar
           </button>
         </div>
         
         <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-indigo-500 rounded-full opacity-50 blur-3xl"></div>
         <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-indigo-400 rounded-full opacity-30 blur-2xl"></div>
      </div>

      <div className="mt-12 text-center text-slate-400 text-xs">
        <p>© 2025 English Learning Geuwat</p>
      </div>

    </Layout>
  );
};