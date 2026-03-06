import React, { useState } from "react";
import { TerminalComponent } from "../Terminal";
import { FileExplorer } from "../FileExplorer";
import { GitGraph } from "../GitGraph";
import { FileText, GitBranch, AlertCircle, Play, CheckCircle } from "lucide-react";
import { Shell } from "../../lib/Shell";
import { Challenge } from "../../engine/challenges";

interface WorkspaceProps {
  mode: 'learn' | 'challenge';
  setVfsRefreshTrigger: React.Dispatch<React.SetStateAction<number>>;
  vfsRefreshTrigger: number;
  checkCommand: (cmd: string, vfs: any) => void;
  currentTask?: { commandHint: string; description: string };
  setShell: (shell: Shell) => void;
  activeChallenge: Challenge | undefined;
  checkSolution: () => void;
  challengeStatus: 'idle' | 'running' | 'success' | 'failed';
  feedback: string;
  showSolution: boolean;
  revealSolution: () => void;
}

export function Workspace({
  mode,
  setVfsRefreshTrigger,
  vfsRefreshTrigger,
  checkCommand,
  currentTask,
  setShell,
  activeChallenge,
  checkSolution,
  challengeStatus,
  feedback,
  showSolution,
  revealSolution
}: WorkspaceProps) {
  const [activeTab, setActiveTab] = useState<'files' | 'git'>('files');

  return (
    <section className="flex-1 p-2 md:p-6 bg-[#050505] flex flex-col w-full">
      {mode === 'challenge' && activeChallenge && (
         <div className="mb-4 bg-[#1a1a1a] border border-amber-500/20 rounded-xl p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-white mb-1 flex items-center">
                  <AlertCircle size={18} className="text-amber-500 mr-2" />
                  Nhiệm vụ: {activeChallenge.title}
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
              Tệp tin
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
  );
}
