import React, { useState } from 'react';
import { UserProfile, UserRole } from '../types';
import { logout } from '../firebase';
import { 
  Menu, X, LogOut, LayoutDashboard, Database, 
  Gift, Bell, Users, Shield, ChevronRight, Crown
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface AdminLayoutProps {
  children: React.ReactNode;
  user: UserProfile | null;
  title: string;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, user, title }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Default open for desktop admin
  const navigate = useNavigate();
  const location = useLocation();

  const isLord = user?.role === UserRole.ADMIN_LORD;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const NavItem = ({ icon: Icon, label, path }: { icon: any, label: string, path: string }) => {
    const isActive = location.pathname === path;
    const activeClass = isLord 
        ? 'bg-amber-500/20 text-amber-400 shadow-lg shadow-amber-900/20 border-l-4 border-amber-500' // Gold theme for Lord
        : 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20';

    return (
      <button 
        onClick={() => navigate(path)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-r-lg transition-all duration-200 text-sm font-medium mb-1
        ${isActive 
          ? activeClass
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
      >
        <Icon size={18} />
        <span>{label}</span>
        {isActive && <ChevronRight size={14} className="ml-auto opacity-50" />}
      </button>
    );
  };

  const renderAdminNav = () => {
    if (!user) return null;
    const role = user.role;
    
    // UPDATED: Strict Navigation but Lord sees ALL
    
    return (
      <div className="space-y-1">
        <div className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
          <span>Console</span>
          {isLord && <Crown size={12} className="text-amber-500" />}
        </div>
        
        {isLord && (
           <NavItem icon={Crown} label="Lord Dashboard" path="/admin/lord" />
        )}

        {(role === UserRole.ADMIN_REFERRAL || isLord) && (
          <NavItem icon={Users} label="Referral / Reception" path="/admin/referral" />
        )}
        
        {(role === UserRole.ADMIN_DATABASE || isLord) && (
          <NavItem icon={Database} label="Master Database" path="/admin/database" />
        )}

        {(role === UserRole.ADMIN_REWARD || isLord) && (
          <NavItem icon={Gift} label="Reward Inventory" path="/admin/reward" />
        )}

        {(role === UserRole.ADMIN_NOTIFICATION || isLord) && (
          <NavItem icon={Bell} label="Broadcast Center" path="/admin/notification" />
        )}
      </div>
    );
  };

  return (
    <div className={`min-h-screen flex font-sans ${isLord ? 'bg-slate-950' : 'bg-slate-100'}`}>
      {/* Mobile Sidebar Overlay */}
      {!isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(true)}
        />
      )}

      {/* ADMIN SIDEBAR - Dark Theme */}
      <aside className={`
        fixed lg:sticky top-0 left-0 h-screen w-64 bg-slate-900 border-r border-slate-800 z-50 text-white
        transition-transform duration-300 ease-in-out flex flex-col
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-20 lg:hover:w-64 group'}
      `}>
        {/* Brand */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-950">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isLord ? 'bg-amber-500 shadow-lg shadow-amber-500/20' : 'bg-indigo-600'}`}>
            <Shield size={18} className="text-white" />
          </div>
          <span className={`ml-3 font-bold text-lg tracking-tight transition-opacity duration-200 ${!isSidebarOpen && 'lg:hidden lg:group-hover:block'} ${isLord ? 'text-amber-500' : 'text-white'}`}>
            {isLord ? 'Lord Access' : 'Geuwat Admin'}
          </span>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto py-6 pr-3">
          {renderAdminNav()}
        </div>

        {/* Admin Profile Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3 mb-4">
             <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${isLord ? 'bg-amber-900 border-amber-600 text-amber-400' : 'bg-slate-800 border-slate-700'}`}>
               {user?.displayName?.charAt(0) || 'A'}
             </div>
             <div className={`overflow-hidden transition-all ${!isSidebarOpen && 'lg:hidden lg:group-hover:block'}`}>
               <div className={`text-sm font-medium truncate ${isLord ? 'text-amber-400' : 'text-white'}`}>{user?.displayName}</div>
               <div className="text-[10px] text-slate-500 uppercase font-bold">{user?.role}</div>
             </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-red-400 hover:bg-slate-900 rounded-lg transition-colors text-sm"
          >
            <LogOut size={18} />
            <span className={`transition-all ${!isSidebarOpen && 'lg:hidden lg:group-hover:block'}`}>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className={`h-16 border-b flex items-center justify-between px-6 sticky top-0 z-30 ${isLord ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-slate-500 hover:bg-slate-800 p-2 rounded-lg lg:hidden">
              <Menu size={20} />
            </button>
            <h1 className={`text-lg font-bold ${isLord ? 'text-amber-500' : 'text-slate-800'}`}>{title}</h1>
          </div>
          <div className="flex items-center gap-3">
             <span className={`text-xs font-mono px-2 py-1 rounded ${isLord ? 'bg-amber-900/30 text-amber-500 border border-amber-900' : 'bg-slate-100 text-slate-500'}`}>
                {isLord ? 'GOD MODE ACTIVE' : 'v1.0.0'}
             </span>
          </div>
        </header>
        
        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto">
             {children}
          </div>
        </div>
      </main>
    </div>
  );
};