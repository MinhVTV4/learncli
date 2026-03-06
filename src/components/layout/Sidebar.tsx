import React from "react";
import { BookOpen, CheckCircle, RotateCcw, Trophy, Sparkles } from "lucide-react";
import { Lesson, Task } from "../../engine/lessons";
import { Challenge } from "../../engine/challenges";
import { marked } from "marked";

interface SidebarProps {
  showSidebar: boolean;
  setShowSidebar: (show: boolean) => void;
  mode: 'learn' | 'challenge';
  lessons: Lesson[];
  activeLessonId: string;
  setActiveLessonId: (id: string) => void;
  completedTasks: Set<string>;
  resetProgress: () => void;
  challenges: Challenge[];
  activeChallengeId: string | null;
  startChallenge: (id: string) => void;
  completedChallenges: Set<string>;
}

export function Sidebar({
  showSidebar,
  setShowSidebar,
  mode,
  lessons,
  activeLessonId,
  setActiveLessonId,
  completedTasks,
  resetProgress,
  challenges,
  activeChallengeId,
  startChallenge,
  completedChallenges
}: SidebarProps) {
  return (
    <>
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
                Lộ trình học tập
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
                          Đang học
                        </div>
                      ) : null}
                    </div>
                    <p className="text-sm text-gray-400 mb-3">{lesson.description}</p>
                    
                    {isActive && (
                      <div className="space-y-3">
                        {lesson.theory && (
                          <div className="bg-[#111] p-3 rounded border border-indigo-500/20 mb-3">
                            <h4 className="text-xs font-bold text-indigo-400 uppercase mb-2 flex items-center">
                              <BookOpen size={12} className="mr-1.5" />
                              Lý thuyết
                            </h4>
                            <div 
                              className="text-xs text-gray-300 leading-relaxed prose prose-invert prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0.5"
                              dangerouslySetInnerHTML={{ __html: marked.parse(lesson.theory) as string }}
                            />
                          </div>
                        )}

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
                  <strong>HintShell (Mô phỏng)</strong> đang hoạt động. Hãy gõ lệnh và hệ thống sẽ gợi ý cú pháp đúng!
                </p>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-amber-500 flex items-center">
                <Trophy size={16} className="mr-2" />
                Thử thách
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
                          challenge.difficulty === 'Dễ' ? 'border-green-500/30 text-green-400 bg-green-500/10' :
                          challenge.difficulty === 'Trung bình' ? 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10' :
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
    </>
  );
}
