import React, { useState, useEffect, useRef } from "react";
import { useLessons } from "./engine/useLessons";
import { useChallenges } from "./engine/useChallenges";
import { Shell } from "./lib/Shell";
import confetti from "canvas-confetti";
import { Header } from "./components/layout/Header";
import { Sidebar } from "./components/layout/Sidebar";
import { Workspace } from "./components/workspace/Workspace";

export default function App() {
  const [showSidebar, setShowSidebar] = useState(false);
  const [vfsRefreshTrigger, setVfsRefreshTrigger] = useState(0);
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
  } = useChallenges(shell?.vfs as any);

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
      <Header 
        showSidebar={showSidebar} 
        setShowSidebar={setShowSidebar} 
        mode={mode} 
        setMode={setMode} 
      />

      <main className="flex-1 flex overflow-hidden relative">
        <Sidebar 
          showSidebar={showSidebar}
          setShowSidebar={setShowSidebar}
          mode={mode}
          lessons={lessons}
          activeLessonId={activeLessonId}
          setActiveLessonId={setActiveLessonId}
          completedTasks={completedTasks}
          resetProgress={resetProgress}
          challenges={challenges}
          activeChallengeId={activeChallengeId}
          startChallenge={startChallenge}
          completedChallenges={completedChallenges}
        />

        <Workspace 
          mode={mode}
          setVfsRefreshTrigger={setVfsRefreshTrigger}
          vfsRefreshTrigger={vfsRefreshTrigger}
          checkCommand={checkCommand}
          currentTask={currentTask}
          setShell={setShell}
          activeChallenge={activeChallenge}
          checkSolution={checkSolution}
          challengeStatus={challengeStatus}
          feedback={feedback}
          showSolution={showSolution}
          revealSolution={revealSolution}
        />
      </main>
    </div>
  );
}
