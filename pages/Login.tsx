import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginWithCredentials, sendResetPasswordEmail } from '../firebase';
import { UserRole } from '../types';
import { Loader2, ArrowRight, Mail, Lock, AlertCircle, ArrowLeft, CheckCircle, Eye, EyeOff, Check } from 'lucide-react';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // View State: 'login' | 'forgot'
  const [view, setView] = useState<'login' | 'forgot'>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // State Login Otomatis (Hanya Email)
  const [rememberEmail, setRememberEmail] = useState(false);

  // Load saved email on mount
  useEffect(() => {
    // KEAMANAN: Hanya mengambil email dari storage, JANGAN ambil password.
    // Password biarkan diurus oleh Password Manager browser (Chrome/Edge/Safari)
    const savedEmail = localStorage.getItem('geuwat_remember_email');
    if (savedEmail) {
        setEmail(savedEmail);
        setRememberEmail(true);
    }
    
    // Cleanup: Hapus key lama yang menyimpan password tidak aman (jika ada dari versi sebelumnya)
    localStorage.removeItem('geuwat_remember_key'); 
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Mohon isi Email dan Password");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Normalize email
      const userProfile = await loginWithCredentials(email.trim().toLowerCase(), password);
      
      // Save Email Only if requested
      if (rememberEmail) {
          localStorage.setItem('geuwat_remember_email', email.trim());
      } else {
          localStorage.removeItem('geuwat_remember_email');
      }
      
      switch (userProfile.role) {
        case UserRole.ADMIN_LORD:
          navigate('/admin/lord');
          break;
        case UserRole.ADMIN_REFERRAL:
          navigate('/admin/referral');
          break;
        case UserRole.ADMIN_DATABASE:
          navigate('/admin/database');
          break;
        case UserRole.ADMIN_REWARD:
          navigate('/admin/reward');
          break;
        case UserRole.ADMIN_NOTIFICATION:
          navigate('/admin/notification');
          break;
        case UserRole.USER:
        default:
          navigate('/dashboard');
          break;
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Gagal masuk. Periksa kembali Email dan Password Anda.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Mohon isi email Anda.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await sendResetPasswordEmail(email.trim().toLowerCase());
      setSuccessMsg("Link reset password telah dikirim ke email Anda. Cek Folder Inbox atau Spam.");
    } catch (err: any) {
      setError(err.message || "Gagal mengirim link reset password.");
    } finally {
      setLoading(false);
    }
  };

  const switchView = (newView: 'login' | 'forgot') => {
    setView(newView);
    setError(null);
    setSuccessMsg(null);
  };

  const getTitle = () => {
    if (view === 'forgot') return 'Reset Password';
    return 'Welcome Back';
  };

  const getSubtitle = () => {
    if (view === 'forgot') return 'Recover your account access';
    return 'Learning English Geuwat Platform';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
      <div className="bg-white w-full max-w-md p-8 rounded-3xl shadow-xl border border-slate-100 relative overflow-hidden transition-all duration-300">
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-indigo-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-purple-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

        <div className="text-center mb-8 relative z-10">
          <div className="w-16 h-16 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-lg shadow-slate-200">
            <span className="text-white text-3xl font-bold tracking-tight">G</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            {getTitle()}
          </h1>
          <p className="text-slate-500 text-sm">
            {getSubtitle()}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
           <div className="mb-6 p-4 bg-emerald-50 text-emerald-600 text-sm rounded-xl border border-emerald-100 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
             <CheckCircle size={18} className="mt-0.5 shrink-0" />
             <span>{successMsg}</span>
           </div>
        )}

        {/* LOGIN FORM */}
        {view === 'login' && (
          <form onSubmit={handleLogin} className="space-y-5 relative z-10 animate-in fade-in slide-in-from-left-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                
                {/* INPUT EMAIL */}
                <input 
                  type="email" 
                  name="email"
                  id="email"
                  list="saved-emails"
                  autoComplete="username" // Memberitahu browser ini adalah username
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400"
                  placeholder="Enter your email"
                  required
                />
                
                {/* DATA SARAN EMAIL ADMIN */}
                <datalist id="saved-emails">
                   <option value="adminlordgeuwat@email.com" />
                   <option value="admindatabasegeuwat@email.com" />
                   <option value="adminreferralcodegeuwat@email.com" />
                   <option value="adminrewardgeuwat@email.com" />
                   <option value="adminnotificationgeuwat@email.com" />
                </datalist>

              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                <input 
                  type={showPassword ? "text" : "password"}
                  name="password"
                  id="password" 
                  autoComplete="current-password" // Memberitahu browser ini password untuk user di atas
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 focus:outline-none transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {/* REMEMBER EMAIL & FORGOT PASSWORD ROW */}
              <div className="flex items-center justify-between pt-2">
                 <label className="flex items-center gap-2 cursor-pointer group select-none">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all duration-200 ${rememberEmail ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300 group-hover:border-indigo-400'}`}>
                       {rememberEmail && <Check size={12} className="text-white" strokeWidth={3} />}
                    </div>
                    <input type="checkbox" className="hidden" checked={rememberEmail} onChange={(e) => setRememberEmail(e.target.checked)} />
                    <span className={`text-xs font-bold transition-colors ${rememberEmail ? 'text-indigo-700' : 'text-slate-500 group-hover:text-indigo-600'}`}>Ingat Email Saya</span>
                 </label>

                <button 
                  type="button" 
                  onClick={() => switchView('forgot')}
                  className="text-xs font-bold text-slate-500 hover:text-indigo-600 hover:underline transition-colors"
                >
                  Lupa Password?
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-indigo-200 hover:shadow-indigo-300 mt-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <span>Sign In</span>}
              {!loading && <ArrowRight size={18} />}
            </button>
            
            {/* Register Link */}
            <div className="pt-6 text-center">
              <p className="text-sm text-slate-500">
                Tidak punya akun?{' '}
                <Link to="/register" className="font-bold text-indigo-600 hover:text-indigo-700 hover:underline">
                  Daftar
                </Link>
              </p>
            </div>
          </form>
        )}

        {/* FORGOT PASSWORD FORM */}
        {view === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-5 relative z-10 animate-in fade-in slide-in-from-right-4">
             <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                <input 
                  type="email" 
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400"
                  placeholder="Enter your registered email"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !!successMsg}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-slate-200 mt-8"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <span>Send Reset Link</span>}
            </button>
            
            <button 
              type="button"
              onClick={() => switchView('login')}
              className="w-full text-slate-500 font-medium py-3 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft size={18} />
              <span>Back to Sign In</span>
            </button>
          </form>
        )}
        
        <div className="mt-8 text-center">
            <p className="text-xs text-slate-400">© 2025 Learning English Geuwat</p>
        </div>
      </div>
    </div>
  );
};