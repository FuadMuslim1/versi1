import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { UserProfile } from '../types';
import { Mic, PlayCircle, Music, Activity, ArrowLeft, Star, RotateCcw, X, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  user: UserProfile;
}

// Interface untuk penyimpanan lokal
interface LocalProgress {
  [lessonId: number]: number;
}

export const Pronunciation: React.FC<Props> = ({ user }) => {
  const navigate = useNavigate();
  const [activeLesson, setActiveLesson] = useState<any | null>(null);
  const [scores, setScores] = useState<LocalProgress>({});

  const lessons = [
    { id: 1, title: 'Vowel Sounds', icon: Music, color: 'bg-rose-500', desc: 'Master short and long vowels.' },
    { id: 2, title: 'Consonants', icon: Mic, color: 'bg-indigo-500', desc: 'Tricky sounds like TH, R, and L.' },
    { id: 3, title: 'Word Stress', icon: Activity, color: 'bg-emerald-500', desc: 'Rhythm and intonation practice.' },
    { id: 4, title: 'Practice Test', icon: PlayCircle, color: 'bg-amber-500', desc: 'Test your pronunciation skills.' },
  ];

  // Load progress from LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('geuwat_local_progress_pronunciation');
    if (saved) {
      setScores(JSON.parse(saved));
    }
  }, []);

  const saveScore = (score: number) => {
    if (!activeLesson) return;
    
    const newScores = { ...scores, [activeLesson.id]: score };
    setScores(newScores);
    localStorage.setItem('geuwat_local_progress_pronunciation', JSON.stringify(newScores));
    
    // Trigger event agar Layout bisa update progress bar secara real-time
    window.dispatchEvent(new Event('storage_update_pronunciation'));
    
    setActiveLesson(null);
  };

  const resetScore = () => {
    if (!activeLesson) return;
    
    const newScores = { ...scores };
    delete newScores[activeLesson.id];
    
    setScores(newScores);
    localStorage.setItem('geuwat_local_progress_pronunciation', JSON.stringify(newScores));
    window.dispatchEvent(new Event('storage_update_pronunciation'));
    
    setActiveLesson(null);
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return { text: 'Excellent', color: 'text-emerald-700 bg-emerald-100 border-emerald-200' };
    if (score >= 75) return { text: 'Good', color: 'text-blue-700 bg-blue-100 border-blue-200' };
    if (score >= 50) return { text: 'Enough', color: 'text-amber-700 bg-amber-100 border-amber-200' };
    return { text: 'Lack', color: 'text-red-700 bg-red-100 border-red-200' };
  };

  return (
    <Layout user={user} title="Pronunciation">
      <div className="mb-6">
        <button 
            onClick={() => navigate('/subject')} 
            className="text-sm text-slate-500 hover:text-indigo-600 mb-3 font-bold flex items-center gap-1 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Subjects
        </button>
        <h2 className="text-2xl font-bold text-slate-800">Pronunciation Menu</h2>
        <p className="text-slate-500 text-sm">Select a lesson to update your saved progress.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {lessons.map((lesson) => {
          const score = scores[lesson.id];
          const badge = score ? getScoreLabel(score) : null;

          return (
            <button 
              key={lesson.id}
              onClick={() => setActiveLesson(lesson)}
              className="group relative bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg transition-all text-left flex items-start gap-4 overflow-hidden w-full"
            >
              <div className={`absolute top-0 right-0 w-24 h-24 ${lesson.color} opacity-10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-150`}></div>
              <div className={`${lesson.color} w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md`}>
                <lesson.icon size={24} />
              </div>
              <div className="relative z-10 flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-lg text-slate-800">{lesson.title}</h3>
                  {badge && (
                    <span className={`text-[10px] font-bold px-2 py-1 rounded border ${badge.color} animate-in fade-in`}>
                      {badge.text}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 mt-1">{lesson.desc}</p>
                
                <div className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-400 group-hover:text-indigo-600 transition-colors">
                   {badge ? (
                     <>
                        <Check size={14} className="text-emerald-500" /> 
                        <span>Saved</span>
                     </>
                   ) : (
                     <>
                        <Star size={14} /> 
                        <span>Tap to Grade</span>
                     </>
                   )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* RATING MODAL */}
      {activeLesson && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
             <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                   <h3 className="font-bold text-slate-800">{activeLesson.title}</h3>
                   <p className="text-xs text-slate-500">Update Saved Progress</p>
                </div>
                <button onClick={() => setActiveLesson(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={18} />
                </button>
             </div>
             
             <div className="p-6 space-y-3">
                <p className="text-xs text-slate-400 text-center mb-4 uppercase font-bold tracking-wider">Pilih Pencapaian Anda</p>
                
                <button 
                  onClick={() => saveScore(100)}
                  className="w-full p-4 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold flex justify-between items-center transition-colors group relative overflow-hidden"
                >
                  <span className="relative z-10">Excellent</span>
                  <span className="text-xs font-mono bg-white px-2 py-1 rounded text-emerald-600 border border-emerald-200 group-hover:scale-110 transition-transform relative z-10">90 - 100</span>
                </button>

                <button 
                  onClick={() => saveScore(85)}
                  className="w-full p-4 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold flex justify-between items-center transition-colors group"
                >
                  <span>Good</span>
                  <span className="text-xs font-mono bg-white px-2 py-1 rounded text-blue-600 border border-blue-200 group-hover:scale-110 transition-transform">75 - 89</span>
                </button>

                <button 
                  onClick={() => saveScore(65)}
                  className="w-full p-4 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold flex justify-between items-center transition-colors group"
                >
                  <span>Enough</span>
                  <span className="text-xs font-mono bg-white px-2 py-1 rounded text-amber-600 border border-amber-200 group-hover:scale-110 transition-transform">50 - 74</span>
                </button>

                <button 
                  onClick={() => saveScore(40)}
                  className="w-full p-4 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-800 font-bold flex justify-between items-center transition-colors group"
                >
                  <span>Lack</span>
                  <span className="text-xs font-mono bg-white px-2 py-1 rounded text-red-600 border border-red-200 group-hover:scale-110 transition-transform">&lt; 50</span>
                </button>

                <div className="pt-4 mt-4 border-t border-slate-100">
                  <button 
                    onClick={resetScore}
                    className="w-full py-3 rounded-xl border-2 border-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-600 hover:border-red-100 font-bold text-sm flex items-center justify-center gap-2 transition-all"
                  >
                    <RotateCcw size={16} /> Reset / Hapus Nilai
                  </button>
                </div>
             </div>
          </div>
        </div>
      )}
    </Layout>
  );
};