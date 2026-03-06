import React from "react";
import { Menu, X, Terminal as TermIcon, Zap, Trophy } from "lucide-react";

interface HeaderProps {
  showSidebar: boolean;
  setShowSidebar: (show: boolean) => void;
  mode: 'learn' | 'challenge';
  setMode: (mode: 'learn' | 'challenge') => void;
}

export function Header({ showSidebar, setShowSidebar, mode, setMode }: HeaderProps) {
  return (
    <header className="border-b border-white/10 bg-[#141414] px-4 md:px-6 py-3 md:py-4 flex items-center justify-between z-50">
      <div className="flex items-center space-x-3">
        <button 
          className="md:hidden p-1 -ml-1 text-gray-400 hover:text-white"
          onClick={() => setShowSidebar(!showSidebar)}
        >
          {showSidebar ? <X size={24} /> : <Menu size={24} />}
        </button>
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <TermIcon className="text-white w-5 h-5 md:w-6 md:h-6" />
        </div>
        <div>
          <h1 className="text-base md:text-xl font-bold tracking-tight text-white">
            HintShell Learn
          </h1>
          <p className="hidden md:block text-xs text-gray-400 font-medium">
            Next-Gen AI-Ready CLI Training
          </p>
        </div>
      </div>
      
      {/* Mode Switcher */}
      <div className="flex bg-[#1e1e1e] rounded-lg p-1 border border-white/10">
        <button
          onClick={() => setMode('learn')}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
            mode === 'learn' 
              ? 'bg-indigo-500 text-white shadow-lg' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Bài học
        </button>
        <button
          onClick={() => setMode('challenge')}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-all flex items-center ${
            mode === 'challenge' 
              ? 'bg-amber-600 text-white shadow-lg' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Trophy size={12} className="mr-1.5" />
          Thử thách
        </button>
      </div>

      <div className="hidden md:flex items-center space-x-4 text-sm font-medium">
        <a
          href="https://github.com/philau2512/hintshell"
          target="_blank"
          rel="noreferrer"
          className="flex items-center text-gray-400 hover:text-white transition-colors"
        >
          <Zap size={16} className="mr-1.5 text-yellow-500" />
          Powered by HintShell Concept
        </a>
      </div>
    </header>
  );
}
