import React, { useState, useEffect, useRef } from "react";
import { TerminalComponent } from "./components/Terminal";
import { FileExplorer } from "./components/FileExplorer";
import { useLessons } from "./engine/useLessons";
import confetti from "canvas-confetti";
import {
  BookOpen,
  CheckCircle,
  Terminal as TermIcon,
  Zap,
  Sparkles,
  Menu,
  X,
  RotateCcw
} from "lucide-react";

export default function App() {
  const [showSidebar, setShowSidebar] = useState(false);
  const [vfsRefreshTrigger, setVfsRefreshTrigger] = useState(0);
  const { lessons, activeLessonId, setActiveLessonId, completedTasks, checkCommand, resetProgress } = useLessons();
  const prevCompletedTasksSize = useRef(completedTasks.size);

  useEffect(() => {
    if (completedTasks.size > prevCompletedTasksSize.current) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#8b5cf6', '#d946ef', '#10b981']
      });
    }
    prevCompletedTasksSize.current = completedTasks.size;
  }, [completedTasks]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200 font-sans flex flex-col">
      {/* Header */}
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
        <div className="flex items-center space-x-4 text-sm font-medium">
          <a
            href="https://github.com/philau2512/hintshell"
            target="_blank"
            rel="noreferrer"
            className="hidden md:flex items-center text-gray-400 hover:text-white transition-colors"
          >
            <Zap size={16} className="mr-1.5 text-yellow-500" />
            Powered by HintShell Concept
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Sidebar - Lessons */}
        <aside className={`
          absolute md:relative z-40 h-full w-[280px] md:w-80 
          border-r border-white/10 bg-[#111111] flex flex-col
          transition-transform duration-300 ease-in-out
          ${showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <div className="p-5 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 flex items-center">
              <BookOpen size={16} className="mr-2" />
              Learning Path
            </h2>
            <button 
              onClick={resetProgress}
              className="text-gray-500 hover:text-white transition-colors"
              title="Reset Progress"
            >
              <RotateCcw size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {lessons.map((lesson, index) => {
              const isActive = lesson.id === activeLessonId;
              const isCompleted = lesson.tasks.every(t => completedTasks.has(t.id));

              return (
                <div 
                  key={lesson.id}
                  onClick={() => setActiveLessonId(lesson.id)}
                  className={`
                    border rounded-xl p-4 transition-all cursor-pointer relative overflow-hidden
                    ${isActive 
                      ? 'bg-[#1a1a1a] border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.1)]' 
                      : 'bg-[#1a1a1a] border-white/5 hover:border-indigo-500/30 opacity-60 hover:opacity-100'
                    }
                  `}
                >
                  {isActive && <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>}
                  
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-white">{lesson.title}</h3>
                    {isCompleted ? (
                      <CheckCircle size={18} className="text-emerald-500" />
                    ) : isActive ? (
                      <div className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-wide">
                        Active
                      </div>
                    ) : null}
                  </div>
                  <p className="text-sm text-gray-400 mb-3">{lesson.description}</p>
                  
                  {isActive && (
                    <div className="space-y-3">
                      {lesson.tasks.map((task, i) => {
                        const taskCompleted = completedTasks.has(task.id);
                        return (
                          <div key={task.id} className={`bg-[#111] p-2 rounded border ${taskCompleted ? 'border-emerald-500/30' : 'border-white/5'}`}>
                            <div className="flex items-center text-xs mb-1 font-medium">
                              <div className={`w-4 h-4 rounded border flex items-center justify-center mr-2 ${taskCompleted ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' : 'border-gray-600 text-transparent'}`}>
                                {taskCompleted && <CheckCircle size={10} />}
                              </div>
                              <span className={taskCompleted ? 'text-gray-500 line-through' : 'text-gray-300'}>
                                {i + 1}. {task.description}
                              </span>
                            </div>
                            {!taskCompleted && (
                              <code className="ml-6 text-indigo-400 bg-indigo-400/10 px-1.5 py-0.5 rounded text-xs font-mono">
                                {task.commandHint}
                              </code>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-4 border-t border-white/5 bg-[#0a0a0a]">
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3 flex items-start">
              <Sparkles
                className="text-indigo-400 shrink-0 mt-0.5 mr-2"
                size={16}
              />
              <p className="text-xs text-indigo-200 leading-relaxed">
                <strong>HintShell (Simulated)</strong> is active. Start typing a command
                and it will suggest the right completions based on predefined rules!
              </p>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {showSidebar && (
          <div 
            className="absolute inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
            onClick={() => setShowSidebar(false)}
          />
        )}

        {/* Terminal Area */}
        <section className="flex-1 p-2 md:p-6 bg-[#050505] flex flex-col w-full">
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4">
            <div className="flex-1 min-h-0">
              <TerminalComponent 
                onCommandExecuted={() => setVfsRefreshTrigger(prev => prev + 1)}
                onCommandParsed={checkCommand}
              />
            </div>
            <div className="w-full lg:w-72 h-64 lg:h-full shrink-0">
              <FileExplorer refreshTrigger={vfsRefreshTrigger} />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
