import { useState, useEffect } from 'react';
import { challenges, Challenge } from './challenges';
import { VFSCommands } from '../vfs/commands';

export function useChallenges(vfs: VFSCommands) {
  const [activeChallengeId, setActiveChallengeId] = useState<string | null>(null);
  const [completedChallenges, setCompletedChallenges] = useState<Set<string>>(new Set());
  const [challengeStatus, setChallengeStatus] = useState<'idle' | 'running' | 'success' | 'failed'>('idle');
  const [feedback, setFeedback] = useState<string>('');

  const activeChallenge = challenges.find(c => c.id === activeChallengeId);

  const [showSolution, setShowSolution] = useState(false);

  const startChallenge = async (id: string) => {
    const challenge = challenges.find(c => c.id === id);
    if (!challenge) return;

    setActiveChallengeId(id);
    setChallengeStatus('running');
    setFeedback('');
    setShowSolution(false);
    
    try {
      await challenge.setup(vfs);
      setFeedback('Môi trường thử thách đã sẵn sàng. Chúc may mắn!');
    } catch (e) {
      setFeedback('Không thể khởi tạo thử thách: ' + e);
      setChallengeStatus('failed');
    }
  };

  const checkSolution = async () => {
    if (!activeChallenge) return;

    try {
      const result = await activeChallenge.verify(vfs);
      if (result === true) {
        setChallengeStatus('success');
        setFeedback('Chúc mừng! Bạn đã hoàn thành thử thách.');
        setCompletedChallenges(prev => new Set(prev).add(activeChallenge.id));
      } else {
        setChallengeStatus('failed');
        setFeedback(typeof result === 'string' ? result : 'Giải pháp chưa chính xác. Hãy thử lại.');
      }
    } catch (e) {
      setChallengeStatus('failed');
      setFeedback('Lỗi khi kiểm tra: ' + e);
    }
  };

  const revealSolution = () => {
    setShowSolution(true);
  };

  const resetChallenge = async () => {
    if (activeChallenge) {
      await startChallenge(activeChallenge.id);
    }
  };

  return {
    challenges,
    activeChallenge,
    activeChallengeId,
    completedChallenges,
    challengeStatus,
    feedback,
    showSolution,
    startChallenge,
    checkSolution,
    revealSolution,
    resetChallenge
  };
}
