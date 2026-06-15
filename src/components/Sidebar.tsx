import React from "react";
import { 
  Sparkles, 
  Flame, 
  Globe, 
  Atom, 
  Binary, 
  Dna, 
  History
} from "lucide-react";
import { UserStats } from "../types";

interface SidebarProps {
  currentSubject: string;
  onSelectSubject: (subject: string) => void;
  userStats: UserStats;
  customTopic: string;
  setCustomTopic: (val: string) => void;
  onGenerateCustom: (e: React.FormEvent) => void;
  isGenerating: boolean;
}

const SUBJECTS = [
  { id: "all", label: "For You", icon: Globe },
  { id: "Space & Physics", label: "Space & Physics", icon: Atom },
  { id: "World History", label: "World History", icon: History },
  { id: "Biology & Chemistry", label: "Biology & Chemistry", icon: Dna },
  { id: "Math & CS", label: "Math & CS", icon: Binary },
];

export default function Sidebar({
  currentSubject,
  onSelectSubject,
  userStats,
  customTopic,
  setCustomTopic,
  onGenerateCustom,
  isGenerating
}: SidebarProps) {
  return (
    <aside 
      id="left-navigation-sidebar"
      className="no-scrollbar w-full md:w-56 bg-black border-b md:border-b-0 md:border-r border-white/5 flex flex-col p-4 space-y-4 h-auto md:h-screen sticky top-0 font-sans text-white select-none overflow-y-auto shrink-0"
    >
      {/* Immersive UI Brand Section - Professional Custom Vector Logo */}
      <div className="flex items-center space-x-3 px-1 group py-1">
        <div className="relative w-8 h-8 flex items-center justify-center bg-gradient-to-br from-cyan-950/40 via-black to-indigo-950/40 rounded-xl border border-white/[0.08] shadow-inner transition-all duration-300 group-hover:border-cyan-500/40 group-hover:shadow-[0_0_15px_rgba(34,211,238,0.12)]">
          {/* Custom vector geometry logo */}
          <svg className="w-5.2 h-5.2 text-cyan-400 transition-transform duration-700 group-hover:rotate-[360deg]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" className="opacity-25 stroke-white" strokeWidth="1" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" className="stroke-indigo-500/85" />
            <path d="M2 12h20" className="opacity-25 stroke-white" strokeWidth="1" />
            <circle cx="12" cy="12" r="3.5" className="fill-black stroke-cyan-400" strokeWidth="2" />
          </svg>
          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping opacity-60" />
          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-cyan-400 rounded-full" />
        </div>
        <div className="flex flex-col">
          <span className="text-[13px] font-black tracking-[0.25em] uppercase leading-none text-white group-hover:text-cyan-400 transition-colors">
            CURIO
          </span>
          <span className="text-[7.5px] font-mono text-white/35 tracking-[0.1em] uppercase font-bold mt-1 block">
            Academic Lab
          </span>
        </div>
      </div>

      {/* Dynamic Daily Goal Target Card - Scaled Down */}
      <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[9px] font-bold text-white/50 tracking-wider">DAILY GOAL</p>
          <Flame className="h-3 w-3 text-cyan-400" />
        </div>
        <p className="text-sm font-black">
          {userStats.completedQuizzesCount}/5 <span className="text-[10px] font-medium text-white/40">completed</span>
        </p>
        <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
          <div 
            className="bg-cyan-400 h-full transition-all duration-500"
            style={{ width: `${Math.min((userStats.completedQuizzesCount / 5) * 100, 100)}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[9px] text-white/40">
          <span>Streak: {userStats.streak}d</span>
          <span className="font-mono text-cyan-400">+{userStats.completedQuizzesCount * 50} XP</span>
        </div>
      </div>

      {/* Subject Feeds Navigation - Slimmer Buttons */}
      <div className="flex-1 flex flex-col gap-1">
        <h3 className="px-1 text-[9px] font-bold text-white/30 uppercase tracking-widest mb-1 mt-1">
          Academic Feeds
        </h3>
        
        <div className="space-y-0.5">
          {SUBJECTS.map((sub) => {
            const Icon = sub.icon;
            const isActive = currentSubject === sub.id;
            return (
              <button
                id={`subject-tab-${sub.id.replace(/\s+/g, '-')}`}
                key={sub.id}
                onClick={() => onSelectSubject(sub.id)}
                className={`w-full flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all duration-150 group text-xs ${
                  isActive 
                    ? "bg-white/5 text-cyan-400 font-bold" 
                    : "text-white/60 hover:bg-white/[0.02] hover:text-white"
                }`}
              >
                <div className="flex items-center space-x-2.5 truncate">
                  <Icon className={`h-4 w-4 ${isActive ? "text-cyan-400" : "text-white/30 group-hover:text-white/65"}`} />
                  <span className="truncate">{sub.label}</span>
                </div>
                {isActive && (
                  <span className="w-1 h-1 bg-cyan-400 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* AI custom lab generator panel - Downscaled and polished */}
      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
        <div className="flex items-center space-x-1.5 mb-1">
          <Sparkles className="h-3 w-3 text-cyan-400 animate-pulse" />
          <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">Topic Lab</h4>
        </div>
        <p className="text-[10px] text-white/40 leading-snug mb-2">
          Synthesize curated custom micro-feed topic utilizing Gemini AI.
        </p>
        
        <form onSubmit={onGenerateCustom} className="space-y-1.5">
          <input
            id="ai-topic-input-field"
            type="text"
            placeholder="CRISPR gene editing..."
            value={customTopic}
            disabled={isGenerating}
            onChange={(e) => setCustomTopic(e.target.value)}
            className="w-full bg-black border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] text-white placeholder-white/20 focus:outline-none focus:border-cyan-400 disabled:opacity-50 transition-colors"
          />
          
          <button
            id="ai-generate-lesson-button"
            type="submit"
            disabled={isGenerating || !customTopic.trim()}
            className="w-full py-1.5 px-2 bg-white hover:bg-cyan-400 text-black font-black text-[10px] uppercase rounded-lg flex items-center justify-center gap-1 transition-all duration-150 shadow-sm active:scale-95 disabled:opacity-30 cursor-pointer"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin h-3 w-3 text-black" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Synthesizing...</span>
              </>
            ) : (
              <span>Compile Concept</span>
            )}
          </button>
        </form>
      </div>
    </aside>
  );
}

