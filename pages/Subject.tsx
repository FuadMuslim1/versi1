import React from 'react';
import { Layout } from '../components/Layout';
import { UserProfile } from '../types';
import { BookOpen, Mic, PenTool, Headphones } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  user: UserProfile;
}

export const Subject: React.FC<Props> = ({ user }) => {
  const navigate = useNavigate();

  const subjects = [
    { 
      id: 1, 
      title: 'Pronunciation', 
      icon: Mic, 
      color: 'bg-rose-500', 
      desc: 'Improve your pronunciation and fluency.',
      path: '/pronunciation' 
    },
    { 
      id: 2, 
      title: 'Grammar', 
      icon: PenTool, 
      color: 'bg-indigo-500', 
      desc: 'Master the rules of English structure.',
      path: null 
    },
    { 
      id: 3, 
      title: 'Listening', 
      icon: Headphones, 
      color: 'bg-emerald-500', 
      desc: 'Understand native speakers better.',
      path: null 
    },
    { 
      id: 4, 
      title: 'Vocabulary', 
      icon: BookOpen, 
      color: 'bg-amber-500', 
      desc: 'Expand your word bank daily.',
      path: null 
    },
  ];

  const handleNavigate = (path: string | null) => {
    if (path) {
      navigate(path);
    } else {
      // Placeholder untuk menu lain yang belum dibuat
      alert("Modul ini akan segera tersedia!");
    }
  };

  return (
    <Layout user={user} title="Subjects">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Select Subject</h2>
        <p className="text-slate-500 text-sm">Choose a topic to start learning today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {subjects.map((sub) => (
          <button 
            key={sub.id}
            onClick={() => handleNavigate(sub.path)}
            className="group relative bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg transition-all text-left flex items-start gap-4 overflow-hidden"
          >
            <div className={`absolute top-0 right-0 w-24 h-24 ${sub.color} opacity-10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-150`}></div>
            
            <div className={`${sub.color} w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md`}>
              <sub.icon size={24} />
            </div>
            
            <div className="relative z-10">
              <h3 className="font-bold text-lg text-slate-800">{sub.title}</h3>
              <p className="text-sm text-slate-500 mt-1">{sub.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </Layout>
  );
};