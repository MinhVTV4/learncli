import { useState, useCallback } from 'react';
import { lessons } from './lessons';
import { VFSCommands } from '../vfs/commands';

export function useLessons() {
  const [activeLessonId, setActiveLessonId] = useState(lessons[0].id);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());

  const checkCommand = useCallback(async (cmd: string, vfs: VFSCommands) => {
    const activeLesson = lessons.find(l => l.id === activeLessonId);
    if (!activeLesson) return;

    for (const task of activeLesson.tasks) {
      if (!completedTasks.has(task.id)) {
        const isPassed = await task.verify(vfs, cmd);
        if (isPassed) {
          setCompletedTasks(prev => {
            const next = new Set(prev);
            next.add(task.id);
            return next;
          });
        }
        break; // Only check the current pending task in sequence
      }
    }
  }, [activeLessonId, completedTasks]);

  const resetProgress = useCallback(() => {
    setCompletedTasks(new Set());
    setActiveLessonId(lessons[0].id);
  }, []);

  return {
    lessons,
    activeLessonId,
    setActiveLessonId,
    completedTasks,
    checkCommand,
    resetProgress
  };
}
