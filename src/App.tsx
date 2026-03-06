import React, { useState, useEffect, useRef } from "react";
import { TerminalComponent } from "./components/Terminal";
import { FileExplorer } from "./components/FileExplorer";
import { GitGraph } from "./components/GitGraph";
import { useLessons } from "./engine/useLessons";
import { useChallenges } from "./engine/useChallenges";
import { Shell } from "./lib/Shell";
import confetti from "canvas-confetti";
import {
  BookOpen,
  CheckCircle,
  Terminal as TermIcon,
  Zap,
  Sparkles,
  Menu,
  X,
  RotateCcw,
  FileText,
  GitBranch,
  Trophy,
  AlertCircle,
  Play
} from "lucide-react";

export default function App() {
  const [showSidebar, setShowSidebar] = useState(false);
  const [vfsRefreshTrigger, setVfsRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState<'files' | 'git'>('files');
  const [mode, setMode] = useState<'learn' | 'challenge'>('learn');
  const [shell, setShell] = useState<Shell | null>(null);

  const { lessons, activeLessonId, setActiveLessonId, completedTasks, checkCommand, resetProgress } = useLessons();
  const { 
    challenges, 
    activeChallengeId, 
    activeChallenge, 
    startChallenge, 
    checkSolution, 
    challengeStatus, 
    feedback,
    completedChallenges,
    showSolution,
    revealSolution
  } = useChallenges(shell?.vfs as any); // Type cast for now as shell might be null initially

  const prevCompletedTasksSize = useRef(completedTasks.size);

  const activeLesson = lessons.find(l => l.id === activeLessonId);
  const currentTask = activeLesson?.tasks.find(t => !completedTasks.has(t.id));

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

  useEffect(() => {
    if (challengeStatus === 'success') {
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#fbbf24', '#f59e0b', '#d97706']
      });
    }
  }, [challengeStatus]);

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
            Lessons
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
            Challenges
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

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Sidebar */}
        <aside className={`
          absolute md:relative z-40 h-full w-[280px] md:w-80 
          border-r border-white/10 bg-[#111111] flex flex-col
          transition-transform duration-300 ease-in-out
          ${showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          {mode === 'learn' ? (
            <>
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
                {lessons.map((lesson) => {
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
            </>
          ) : (
            <>
              <div className="p-5 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-amber-500 flex items-center">
                  <Trophy size={16} className="mr-2" />
                  Challenges
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                 {challenges.map((challenge) => {
                   const isActive = challenge.id === activeChallengeId;
                   const isCompleted = completedChallenges.has(challenge.id);
                   
                   return (
                     <div 
                       key={challenge.id}
                       onClick={() => startChallenge(challenge.id)}
                       className={`
                         border rounded-xl p-4 transition-all cursor-pointer relative overflow-hidden
                         ${isActive 
                           ? 'bg-[#1a1a1a] border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]' 
                           : 'bg-[#1a1a1a] border-white/5 hover:border-amber-500/30 opacity-80 hover:opacity-100'
                         }
                       `}
                     >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-white">{challenge.title}</h3>
                          {isCompleted && <CheckCircle size={18} className="text-emerald-500" />}
                        </div>
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                            challenge.difficulty === 'Easy' ? 'border-green-500/30 text-green-400 bg-green-500/10' :
                            challenge.difficulty === 'Medium' ? 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10' :
                            'border-red-500/30 text-red-400 bg-red-500/10'
                          }`}>
                            {challenge.difficulty}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400">{challenge.description}</p>
                     </div>
                   );
                 })}
              </div>
            </>
          )}
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
          {mode === 'challenge' && activeChallenge && (
             <div className="mb-4 bg-[#1a1a1a] border border-amber-500/20 rounded-xl p-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white mb-1 flex items-center">
                      <AlertCircle size={18} className="text-amber-500 mr-2" />
                      Mission: {activeChallenge.title}
                    </h2>
                    <p className="text-sm text-gray-300 whitespace-pre-line mb-3 pl-6 border-l border-white/10 ml-2">
                      {activeChallenge.story}
                    </p>
                  </div>
                  <button
                    onClick={checkSolution}
                    className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg transition-all flex items-center"
                  >
                    <Play size={16} className="mr-2" />
                    Kiểm tra
                  </button>
                </div>
                
                {feedback && (
                  <div className={`mt-3 p-3 rounded text-sm font-medium flex items-center ${
                    challengeStatus === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 
                    challengeStatus === 'failed' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {challengeStatus === 'success' ? <CheckCircle size={16} className="mr-2" /> : <AlertCircle size={16} className="mr-2" />}
                    {feedback}
                  </div>
                )}

                {challengeStatus === 'failed' && !showSolution && (
                  <button 
                    onClick={revealSolution}
                    className="mt-2 text-xs text-amber-500 hover:text-amber-400 underline"
                  >
                    Tôi bí rồi! Xem đáp án
                  </button>
                )}

                {showSolution && activeChallenge.solution && (
                  <div className="mt-3 bg-black/30 p-3 rounded border border-amber-500/10">
                    <h4 className="text-xs font-bold text-amber-500 mb-1 uppercase">Giải pháp:</h4>
                    <div className="text-sm text-gray-300 font-mono whitespace-pre-wrap">
                      {activeChallenge.solution}
                    </div>
                  </div>
                )}
             </div>
          )}

          <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4">
            <div className="flex-1 min-h-0">
              <TerminalComponent 
                onCommandExecuted={() => setVfsRefreshTrigger(prev => prev + 1)}
                onCommandParsed={mode === 'learn' ? checkCommand : undefined}
                currentTask={mode === 'learn' ? currentTask : undefined}
                onShellReady={setShell}
              />
            </div>
            <div className="w-full lg:w-72 h-64 lg:h-full shrink-0 flex flex-col bg-[#1e1e1e] rounded-lg border border-white/10 shadow-2xl overflow-hidden">
              {/* Tabs */}
              <div className="flex border-b border-white/5 bg-[#252526]">
                <button
                  onClick={() => setActiveTab('files')}
                  className={`flex-1 py-2 text-xs font-medium flex items-center justify-center transition-colors ${
                    activeTab === 'files' 
                      ? 'bg-[#1e1e1e] text-white border-t-2 border-t-indigo-500' 
                      : 'text-gray-500 hover:text-gray-300 hover:bg-[#2a2d2e]'
                  }`}
                >
                  <FileText size={14} className="mr-2" />
                  Files
                </button>
                <button
                  onClick={() => setActiveTab('git')}
                  className={`flex-1 py-2 text-xs font-medium flex items-center justify-center transition-colors ${
                    activeTab === 'git' 
                      ? 'bg-[#1e1e1e] text-white border-t-2 border-t-indigo-500' 
                      : 'text-gray-500 hover:text-gray-300 hover:bg-[#2a2d2e]'
                  }`}
                >
                  <GitBranch size={14} className="mr-2" />
                  Git Graph
                </button>
              </div>
              
              <div className="flex-1 min-h-0 relative">
                {activeTab === 'files' && (
                  <div className="absolute inset-0">
                    <FileExplorer refreshTrigger={vfsRefreshTrigger} />
                  </div>
                )}
                {activeTab === 'git' && (
                  <div className="absolute inset-0">
                    <GitGraph refreshTrigger={vfsRefreshTrigger} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
