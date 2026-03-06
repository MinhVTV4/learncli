import React, { useEffect, useState } from 'react';
import { gitService, GitState, GitCommit } from '../vfs/git';
import { GitBranch, GitCommit as GitCommitIcon, GitMerge, RefreshCw } from 'lucide-react';

interface GitGraphProps {
  refreshTrigger: number;
}

export function GitGraph({ refreshTrigger }: GitGraphProps) {
  const [repoPath, setRepoPath] = useState<string | null>(null);
  const [state, setState] = useState<GitState | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadGit = async () => {
      setLoading(true);
      try {
        const repos = await gitService.findAllRepos();
        if (repos.length > 0) {
          const repo = repos[0]; // Just show the first one for now
          setRepoPath(repo.path);
          const s = await gitService.getGitState(repo.id);
          setState(s);
        } else {
          setRepoPath(null);
          setState(null);
        }
      } catch (e) {
        console.error("Failed to load git graph", e);
      } finally {
        setLoading(false);
      }
    };
    loadGit();
  }, [refreshTrigger]);

  if (loading && !state) return <div className="p-4 text-gray-500 text-sm">Loading Git Graph...</div>;
  
  if (!repoPath || !state) return (
    <div className="h-full flex flex-col bg-[#1e1e1e]">
        <div className="flex items-center px-4 py-2 bg-[#2d2d2d] border-b border-white/5">
            <div className="text-xs text-gray-400 font-mono flex items-center">
            <GitBranch size={14} className="mr-2" />
            Git Graph
            </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-4 text-center">
            <GitBranch size={48} className="mb-4 opacity-20" />
            <p className="text-sm">No Git repository found.</p>
            <p className="text-xs mt-2 opacity-60">Try running <code className="bg-gray-800 px-1 rounded text-gray-300">git init</code></p>
        </div>
    </div>
  );

  const sortedCommits = Object.values(state.commits).sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e]">
      <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-white/5">
        <div className="text-xs text-gray-400 font-mono flex items-center truncate max-w-[150px]">
          <GitBranch size={14} className="mr-2 shrink-0" />
          <span className="truncate">{repoPath || '/'} ({state.currentBranch})</span>
        </div>
        <div className="flex items-center space-x-2 shrink-0">
           <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
             {Object.keys(state.commits).length} commits
           </span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 relative">
        {/* Simple Vertical Timeline */}
        {sortedCommits.length > 0 && (
            <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-gray-700" />
        )}
        
        <div className="space-y-6 relative z-10">
          {sortedCommits.map((commit) => {
            const branches = Object.entries(state.branches)
              .filter(([_, hash]) => hash === commit.hash)
              .map(([name]) => name);
            
            const isHead = state.branches[state.currentBranch] === commit.hash;

            return (
              <div key={commit.hash} className="flex items-start group">
                {/* Node */}
                <div className={`
                  w-4 h-4 rounded-full border-2 shrink-0 z-20 mt-1 mr-3 transition-all
                  ${isHead ? 'bg-blue-500 border-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.5)] scale-110' : 'bg-[#1e1e1e] border-gray-500 group-hover:border-gray-300'}
                `} />
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2 mb-1">
                    <span className="font-mono text-[10px] text-yellow-500 opacity-80">{commit.hash.slice(0, 7)}</span>
                    {branches.map(b => (
                      <span key={b} className={`
                        text-[10px] px-1.5 rounded font-medium border flex items-center
                        ${b === state.currentBranch 
                          ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                          : 'bg-gray-700 text-gray-300 border-gray-600'}
                      `}>
                        <GitBranch size={8} className="mr-1" />
                        {b}
                      </span>
                    ))}
                    {isHead && <span className="text-[10px] text-blue-400 font-bold ml-1">HEAD</span>}
                  </div>
                  
                  <p className="text-sm text-gray-200 font-medium truncate" title={commit.message}>{commit.message}</p>
                  <div className="flex items-center text-[10px] text-gray-500 mt-1">
                    <span>{commit.author.split('<')[0].trim()}</span>
                    <span className="mx-1">•</span>
                    <span>{new Date(commit.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            );
          })}
          
          {sortedCommits.length === 0 && (
             <div className="text-center text-gray-500 text-sm italic py-4">
               No commits yet. Stage files and commit to see history.
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
