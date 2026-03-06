import { vfsCore } from './core';
import { resolvePath } from './pathResolver';

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  timestamp: number;
  parent: string | null;
  files: Record<string, string>; // Snapshot: path -> content
}

export interface GitState {
  currentBranch: string;
  branches: Record<string, string>; // branchName -> commitHash (HEAD of branch)
  commits: Record<string, GitCommit>; // hash -> commit
  staging: Record<string, string>; // path -> content (Index)
  remotes: Record<string, string>; // remoteName -> url
}

const DEFAULT_STATE: GitState = {
  currentBranch: 'main',
  branches: { main: '' }, // Empty string means no commits yet
  commits: {},
  staging: {},
  remotes: {},
};

export class GitService {
  
  // Helper: Find repo root (directory containing .git) walking up from cwd
  async findRepoRoot(cwdId: string): Promise<{ id: string, path: string } | null> {
    let currentId = cwdId;
    let node = await vfsCore.getNode(currentId);
    while (node) {
      const gitDir = await vfsCore.getChildByName(node.id, '.git');
      if (gitDir && gitDir.type === 'directory') {
        return { id: node.id, path: '' }; // Found it
      }
      if (!node.parentId) break;
      node = await vfsCore.getNode(node.parentId);
    }
    return null;
  }

  // Helper to find all git repos in the VFS (for UI visualization)
  async findAllRepos(): Promise<{ id: string, path: string }[]> {
    const repos: { id: string, path: string }[] = [];
    const nodes = await vfsCore.getChildren('root'); // Start from root? Or scan all nodes?
    // Scanning all nodes for .git is expensive but accurate in IDB
    // Let's just scan for directories named .git
    // Actually, we can query DB directly if we had access, but via vfsCore is cleaner abstraction.
    // But vfsCore doesn't expose "find by name globally".
    // Let's assume typical structure: /home/user/repo/.git
    // We can just walk from root.
    
    const queue = [{ id: 'root', path: '/' }];
    while (queue.length > 0) {
      const { id, path } = queue.shift()!;
      const children = await vfsCore.getChildren(id);
      
      for (const child of children) {
        if (child.type === 'directory') {
          if (child.name === '.git') {
            repos.push({ id: id, path: path }); // id is parent of .git
          } else {
            queue.push({ id: child.id, path: path === '/' ? `/${child.name}` : `${path}/${child.name}` });
          }
        }
      }
    }
    return repos;
  }

  async getGitState(repoRootId: string): Promise<GitState> {
    const gitDir = await vfsCore.getChildByName(repoRootId, '.git');
    if (!gitDir) throw new Error('Not a git repository');
    
    const stateFile = await vfsCore.getChildByName(gitDir.id, 'state.json');
    if (!stateFile || !stateFile.content) {
      return JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
    const state = JSON.parse(stateFile.content);
    // Ensure remotes exists for backward compatibility
    if (!state.remotes) state.remotes = {};
    return state;
  }

  async saveGitState(repoRootId: string, state: GitState) {
    const gitDir = await vfsCore.getChildByName(repoRootId, '.git');
    if (!gitDir) throw new Error('Not a git repository');
    
    let stateFile = await vfsCore.getChildByName(gitDir.id, 'state.json');
    if (stateFile) {
      await vfsCore.updateNode(stateFile.id, { content: JSON.stringify(state, null, 2) });
    } else {
      await vfsCore.createNode({
        name: 'state.json',
        type: 'file',
        parentId: gitDir.id,
        content: JSON.stringify(state, null, 2),
        permissions: 'rw-r--r--'
      });
    }
  }

  async init(cwdId: string): Promise<string> {
    const existing = await this.findRepoRoot(cwdId);
    if (existing && existing.id === cwdId) {
      return 'Git repository already initialized';
    }

    // Create .git directory
    const gitDir = await vfsCore.createNode({
      name: '.git',
      type: 'directory',
      parentId: cwdId,
      permissions: 'rwxr-xr-x'
    });

    // Create initial state
    await this.saveGitState(cwdId, DEFAULT_STATE);
    return 'Initialized empty Git repository in .git/';
  }

  async status(cwdId: string): Promise<string> {
    const repo = await this.findRepoRoot(cwdId);
    if (!repo) throw new Error('fatal: not a git repository (or any of the parent directories): .git');

    const state = await this.getGitState(repo.id);
    const headHash = state.branches[state.currentBranch];
    const headCommit = state.commits[headHash];
    const headFiles = headCommit ? headCommit.files : {};

    // 1. Scan workspace files (recursive)
    const workFiles = await this.scanWorkspace(repo.id);
    
    const untracked: string[] = [];
    const modified: string[] = [];
    const staged: string[] = [];
    const deleted: string[] = [];

    // Check Staged vs HEAD (Changes to be committed)
    for (const [path, content] of Object.entries(state.staging)) {
      if (headFiles[path] !== content) {
        staged.push(path);
      }
    }

    // Check Workspace vs Staging (Changes not staged for commit)
    // If not in staging, check Workspace vs HEAD
    for (const [path, content] of Object.entries(workFiles)) {
      if (path.startsWith('.git/')) continue; // Ignore .git folder

      const inStaging = state.staging[path];
      const inHead = headFiles[path];

      if (inStaging !== undefined) {
        if (inStaging !== content) {
          modified.push(path);
        }
      } else if (inHead !== undefined) {
        if (inHead !== content) {
          modified.push(path);
        }
      } else {
        untracked.push(path);
      }
    }

    // Check for deleted files (in HEAD/Staging but not in Workspace)
    const allTracked = new Set([...Object.keys(state.staging), ...Object.keys(headFiles)]);
    for (const path of allTracked) {
      if (!workFiles[path]) {
        // If it was staged, it's deleted from workspace but still in staging (unless we git rm'd it, which we don't support yet)
        // For simplicity: if in staging, and not in workspace -> modified (deleted)
        // if in HEAD, not in staging, not in workspace -> modified (deleted)
        deleted.push(path);
      }
    }

    let output = `On branch ${state.currentBranch}\n`;
    if (!headHash) output += "No commits yet\n";

    if (staged.length > 0) {
      output += "\nChanges to be committed:\n  (use \"git rm --cached <file>...\" to unstage)\n";
      staged.forEach(f => output += `\x1b[32m\tmodified:   ${f}\x1b[0m\n`); // Green
      // Note: Logic above for 'modified' in staged is simplified. New files are also 'new file'.
      // Let's refine: if not in HEAD, it's 'new file'.
    }

    const changesNotStaged = [...modified, ...deleted].filter(f => !staged.includes(f)); // distinct? No, a file can be staged AND modified.
    // Actually, modified array above captures "Workspace != Staging".
    
    if (modified.length > 0 || deleted.length > 0) {
      output += "\nChanges not staged for commit:\n  (use \"git add <file>...\" to update what will be committed)\n";
      modified.forEach(f => output += `\x1b[31m\tmodified:   ${f}\x1b[0m\n`); // Red
      deleted.forEach(f => output += `\x1b[31m\tdeleted:    ${f}\x1b[0m\n`);
    }

    if (untracked.length > 0) {
      output += "\nUntracked files:\n  (use \"git add <file>...\" to include in what will be committed)\n";
      untracked.forEach(f => output += `\x1b[31m\t${f}\x1b[0m\n`);
    }

    if (staged.length === 0 && modified.length === 0 && untracked.length === 0 && deleted.length === 0) {
      output += "\nnothing to commit, working tree clean";
    }

    return output;
  }

  async diff(cwdId: string): Promise<string> {
    const repo = await this.findRepoRoot(cwdId);
    if (!repo) throw new Error('fatal: not a git repository');

    const state = await this.getGitState(repo.id);
    const workFiles = await this.scanWorkspace(repo.id);
    
    let output = '';

    // Diff Workspace vs Staging
    for (const [path, content] of Object.entries(workFiles)) {
      if (path.startsWith('.git/')) continue;

      const stagedContent = state.staging[path];
      // If not in staging, check HEAD?
      // git diff (without args) shows changes not staged.
      // So we compare Workspace vs Index (Staging).
      // If file not in Index, it's untracked (git diff doesn't show untracked)
      // OR it's in HEAD but not Index (modified but not staged).
      
      // If file is in Index (Staging)
      if (stagedContent !== undefined) {
        if (content !== stagedContent) {
          output += `diff --git a/${path} b/${path}\n`;
          output += `--- a/${path}\n`;
          output += `+++ b/${path}\n`;
          output += `@@ -1 +1 @@\n`;
          output += `-\x1b[31m${stagedContent}\x1b[0m\n`;
          output += `+\x1b[32m${content}\x1b[0m\n`;
        }
      } else {
        // Not in Index. Check HEAD.
        const headHash = state.branches[state.currentBranch];
        const headCommit = state.commits[headHash];
        const headContent = headCommit?.files[path];
        
        if (headContent !== undefined && content !== headContent) {
           output += `diff --git a/${path} b/${path}\n`;
           output += `--- a/${path}\n`;
           output += `+++ b/${path}\n`;
           output += `@@ -1 +1 @@\n`;
           output += `-\x1b[31m${headContent}\x1b[0m\n`;
           output += `+\x1b[32m${content}\x1b[0m\n`;
        }
      }
    }
    
    return output;
  }

  async add(cwdId: string, filePattern: string): Promise<string> {
    const repo = await this.findRepoRoot(cwdId);
    if (!repo) throw new Error('fatal: not a git repository');

    const state = await this.getGitState(repo.id);
    const workFiles = await this.scanWorkspace(repo.id);

    // Handle "git add ."
    if (filePattern === '.') {
      for (const [path, content] of Object.entries(workFiles)) {
        if (path.startsWith('.git/')) continue;
        state.staging[path] = content;
      }
    } else {
      // Handle single file (relative path resolution needed)
      // Simplified: assume filePattern matches a key in workFiles (which are relative to repo root)
      // We need to resolve filePattern relative to cwd, then make it relative to repo root.
      // This is getting complex. Let's assume cwd is repo root for now or simplify path matching.
      
      // If user is in subfolder, filePattern "foo.txt" means "subfolder/foo.txt".
      // workFiles keys are "subfolder/foo.txt".
      
      // Let's just support exact match from repo root for simplicity, 
      // OR: implement proper relative path logic.
      // Since we don't have full path resolution in GitService easily, let's try:
      
      // 1. Resolve absolute path of filePattern
      // 2. Make it relative to repo root.
      // We can't do this easily inside GitService without VFSCommands context.
      // BUT, we can just scan workFiles and see if any end with filePattern? No, dangerous.
      
      // Let's assume filePattern is relative to CWD.
      // We need to know CWD path relative to Repo Root.
      // Let's just support "git add ." for now as it covers 90% of learning cases.
      // And simple filenames if they exist in workFiles.
      
      if (workFiles[filePattern]) {
        state.staging[filePattern] = workFiles[filePattern];
      } else {
        // Check if it's a directory?
        // For now, throw if not found
        // Try to find exact match
        if (workFiles[filePattern]) {
             state.staging[filePattern] = workFiles[filePattern];
        } else {
             throw new Error(`pathspec '${filePattern}' did not match any files`);
        }
      }
    }

    await this.saveGitState(repo.id, state);
    return '';
  }

  async commit(cwdId: string, message: string): Promise<string> {
    const repo = await this.findRepoRoot(cwdId);
    if (!repo) throw new Error('fatal: not a git repository');

    const state = await this.getGitState(repo.id);
    
    // Check if anything to commit
    if (Object.keys(state.staging).length === 0) {
      return 'On branch ' + state.currentBranch + '\nnothing to commit, working tree clean';
    }

    const parentHash = state.branches[state.currentBranch] || null;
    const newHash = Math.random().toString(16).slice(2, 9); // Short hash
    
    const newCommit: GitCommit = {
      hash: newHash,
      message,
      author: 'User <user@example.com>',
      timestamp: Date.now(),
      parent: parentHash,
      files: { ...state.staging } // Snapshot staging
    };

    state.commits[newHash] = newCommit;
    state.branches[state.currentBranch] = newHash;
    // Note: In real git, commit doesn't clear staging of tracked files, but it matches HEAD.
    // Here, we keep staging as is (it matches HEAD now).
    // Actually, git commit consumes the index. The index remains, but it is now identical to HEAD.
    // So we don't "clear" staging, we just leave it.
    // But for our status logic: "Check Staged vs HEAD". If they are equal, it's not staged.
    // So we are good.

    await this.saveGitState(repo.id, state);
    return `[${state.currentBranch} ${newHash}] ${message}`;
  }

  async log(cwdId: string): Promise<string> {
    const repo = await this.findRepoRoot(cwdId);
    if (!repo) throw new Error('fatal: not a git repository');

    const state = await this.getGitState(repo.id);
    let currentHash = state.branches[state.currentBranch];
    
    if (!currentHash) {
      throw new Error("fatal: your current branch '" + state.currentBranch + "' does not have any commits yet");
    }

    let output = '';
    while (currentHash) {
      const commit = state.commits[currentHash];
      if (!commit) break;

      output += `\x1b[33mcommit ${commit.hash}\x1b[0m\n`;
      output += `Author: ${commit.author}\n`;
      output += `Date:   ${new Date(commit.timestamp).toString()}\n\n`;
      output += `    ${commit.message}\n\n`;

      currentHash = commit.parent || '';
    }
    return output;
  }

  async createBranch(cwdId: string, branchName: string): Promise<string> {
    const repo = await this.findRepoRoot(cwdId);
    if (!repo) throw new Error('fatal: not a git repository');
    const state = await this.getGitState(repo.id);
    
    if (state.branches[branchName]) {
      throw new Error(`fatal: A branch named '${branchName}' already exists.`);
    }
    
    const headHash = state.branches[state.currentBranch];
    state.branches[branchName] = headHash || ''; // Point to same commit (or empty if init)
    
    await this.saveGitState(repo.id, state);
    return '';
  }

  async listBranches(cwdId: string): Promise<string> {
    const repo = await this.findRepoRoot(cwdId);
    if (!repo) throw new Error('fatal: not a git repository');
    const state = await this.getGitState(repo.id);
    
    let output = '';
    for (const branch of Object.keys(state.branches)) {
      if (branch === state.currentBranch) {
        output += `* \x1b[32m${branch}\x1b[0m\n`;
      } else {
        output += `  ${branch}\n`;
      }
    }
    return output;
  }

  async checkout(cwdId: string, branchName: string): Promise<string> {
    const repo = await this.findRepoRoot(cwdId);
    if (!repo) throw new Error('fatal: not a git repository');
    const state = await this.getGitState(repo.id);

    if (!state.branches.hasOwnProperty(branchName)) {
      throw new Error(`error: pathspec '${branchName}' did not match any file(s) known to git`);
    }

    if (state.currentBranch === branchName) {
      return `Already on '${branchName}'`;
    }

    const currentHash = state.branches[state.currentBranch];
    const targetHash = state.branches[branchName];
    
    const currentCommit = state.commits[currentHash];
    const targetCommit = state.commits[targetHash];

    // Update Workspace
    // 1. Delete files in current commit that are NOT in target commit
    if (currentCommit) {
      for (const path of Object.keys(currentCommit.files)) {
        if (!targetCommit || !targetCommit.files[path]) {
          await this.deleteFile(repo.id, path);
        }
      }
    }

    // 2. Write/Update files from target commit
    if (targetCommit) {
      for (const [path, content] of Object.entries(targetCommit.files)) {
        // Optimization: Skip if content is identical to current commit
        if (currentCommit && currentCommit.files[path] === content) continue;
        await this.createFileRecursive(repo.id, path, content);
      }
      // Update staging to match new HEAD (clean slate)
      state.staging = { ...targetCommit.files };
    } else {
      // Target is empty (e.g. fresh init branch? actually fresh init has no branch usually until commit)
      // If we switched to an empty branch (orphan), clear staging
      state.staging = {};
    }

    state.currentBranch = branchName;
    await this.saveGitState(repo.id, state);
    return `Switched to branch '${branchName}'`;
  }

  async merge(cwdId: string, branchName: string): Promise<string> {
    const repo = await this.findRepoRoot(cwdId);
    if (!repo) throw new Error('fatal: not a git repository');
    const state = await this.getGitState(repo.id);

    if (!state.branches[branchName]) {
      throw new Error(`merge: ${branchName} - not something we can merge`);
    }
    
    const currentHeadHash = state.branches[state.currentBranch];
    const targetHeadHash = state.branches[branchName];
    
    if (currentHeadHash === targetHeadHash) {
      return 'Already up to date.';
    }
    
    // Check for Fast-forward
    let iterator = targetHeadHash;
    let isFastForward = false;
    while (iterator) {
      if (iterator === currentHeadHash) {
        isFastForward = true;
        break;
      }
      const commit = state.commits[iterator];
      if (!commit) break;
      iterator = commit.parent || '';
    }
    
    if (isFastForward) {
      state.branches[state.currentBranch] = targetHeadHash;
      await this.saveGitState(repo.id, state);
      
      // Sync workspace
      await this.checkout(cwdId, state.currentBranch);
      
      return `Updating ${currentHeadHash?.slice(0,7) || 'empty'}..${targetHeadHash.slice(0,7)}\nFast-forward`;
    } else {
      // Not a fast-forward merge. Check for conflicts.
      // Simple 3-way merge logic simulation
      
      const ancestorHash = await this.findCommonAncestor(state, currentHeadHash, targetHeadHash);
      const ancestorCommit = ancestorHash ? state.commits[ancestorHash] : null;
      const currentCommit = state.commits[currentHeadHash];
      const targetCommit = state.commits[targetHeadHash];
      
      const ancestorFiles = ancestorCommit ? ancestorCommit.files : {};
      const currentFiles = currentCommit ? currentCommit.files : {};
      const targetFiles = targetCommit ? targetCommit.files : {};
      
      const allFiles = new Set([
        ...Object.keys(ancestorFiles),
        ...Object.keys(currentFiles),
        ...Object.keys(targetFiles)
      ]);
      
      let hasConflict = false;
      const mergedFiles: Record<string, string> = { ...currentFiles };
      
      for (const file of allFiles) {
        const ancContent = ancestorFiles[file];
        const curContent = currentFiles[file];
        const tgtContent = targetFiles[file];
        
        if (curContent === tgtContent) {
          // No change or same change -> keep current (which is same as target)
          continue;
        }
        
        if (ancContent === curContent) {
          // Only target changed -> take target
          if (tgtContent === undefined) {
             delete mergedFiles[file]; // Target deleted it
          } else {
             mergedFiles[file] = tgtContent;
          }
        } else if (ancContent === tgtContent) {
          // Only current changed -> keep current
          continue;
        } else {
          // Both changed -> Conflict!
          hasConflict = true;
          const conflictContent = `<<<<<<< HEAD\n${curContent || ''}\n=======\n${tgtContent || ''}\n>>>>>>> ${branchName}\n`;
          mergedFiles[file] = conflictContent;
          console.log(`Conflict in ${file}`);
        }
      }
      
      // Apply changes to workspace
      for (const [file, content] of Object.entries(mergedFiles)) {
        await this.createFileRecursive(repo.id, file, content);
      }
      
      // Also delete files that were removed in merge result
      for (const file of Object.keys(currentFiles)) {
        if (!mergedFiles[file]) {
          await this.deleteFile(repo.id, file);
        }
      }

      if (hasConflict) {
        return `Auto-merging...\nCONFLICT (content): Merge conflict in file(s).\nAutomatic merge failed; fix conflicts and then commit the result.`;
      } else {
        // Auto-merge successful -> Create Merge Commit
        const newHash = Math.random().toString(16).slice(2, 9);
        const newCommit: GitCommit = {
          hash: newHash,
          message: `Merge branch '${branchName}'`,
          author: 'User <user@example.com>',
          timestamp: Date.now(),
          parent: currentHeadHash, // TODO: Should support multiple parents for real merge commit
          files: mergedFiles
        };
        state.commits[newHash] = newCommit;
        state.branches[state.currentBranch] = newHash;
        await this.saveGitState(repo.id, state);
        return `Merge made by the 'ort' strategy.`;
      }
    }
  }

  // Simple BFS to find common ancestor
  private async findCommonAncestor(state: GitState, hash1: string, hash2: string): Promise<string | null> {
    const visited1 = new Set<string>();
    const queue1 = [hash1];
    while (queue1.length > 0) {
      const h = queue1.shift()!;
      visited1.add(h);
      const commit = state.commits[h];
      if (commit && commit.parent) queue1.push(commit.parent);
    }
    
    const queue2 = [hash2];
    while (queue2.length > 0) {
      const h = queue2.shift()!;
      if (visited1.has(h)) return h; // Found it!
      const commit = state.commits[h];
      if (commit && commit.parent) queue2.push(commit.parent);
    }
    return null;
  }

  async remote(cwdId: string, subCmd: string, name?: string, url?: string): Promise<string> {
    const repo = await this.findRepoRoot(cwdId);
    if (!repo) throw new Error('fatal: not a git repository');
    const state = await this.getGitState(repo.id);

    if (subCmd === 'add') {
      if (!name || !url) throw new Error('usage: git remote add <name> <url>');
      if (state.remotes[name]) throw new Error(`fatal: remote ${name} already exists.`);
      state.remotes[name] = url;
      await this.saveGitState(repo.id, state);
      return '';
    } else if (subCmd === 'remove' || subCmd === 'rm') {
       if (!name) throw new Error('usage: git remote remove <name>');
       if (!state.remotes[name]) throw new Error(`fatal: No such remote: '${name}'`);
       delete state.remotes[name];
       await this.saveGitState(repo.id, state);
       return '';
    } else if (!subCmd || subCmd === 'list' || subCmd === '-v') {
      let output = '';
      for (const [r, u] of Object.entries(state.remotes)) {
        output += `${r}\t${u} (fetch)\n${r}\t${u} (push)\n`;
      }
      return output;
    }
    return `git: '${subCmd}' is not a git command. See 'git --help'.`;
  }

  async push(cwdId: string, remote: string, branch: string): Promise<string> {
    const repo = await this.findRepoRoot(cwdId);
    if (!repo) throw new Error('fatal: not a git repository');
    const state = await this.getGitState(repo.id);
    
    if (!state.remotes[remote]) {
      throw new Error(`fatal: '${remote}' does not appear to be a git repository`);
    }
    // Simulate network delay
    await new Promise(r => setTimeout(r, 1000));
    return `Enumerating objects: 5, done.\nCounting objects: 100% (5/5), done.\nWriting objects: 100% (3/3), 280 bytes | 280.00 KiB/s, done.\nTotal 3 (delta 0), reused 0 (delta 0)\nTo ${state.remotes[remote]}\n   ${state.branches[state.currentBranch]?.slice(0,7)}..${state.branches[state.currentBranch]?.slice(0,7)}  ${branch} -> ${branch}`;
  }

  async clone(cwdId: string, url: string): Promise<string> {
    // Simulate clone: create directory from url basename, init git
    const parts = url.split('/');
    let dirName = parts.pop() || 'repo';
    if (dirName.endsWith('.git')) dirName = dirName.slice(0, -4);
    
    // Create dir
    const newDir = await vfsCore.createNode({
      name: dirName,
      type: 'directory',
      parentId: cwdId,
      permissions: 'rwxr-xr-x'
    });
    
    // Init git inside
    await this.init(newDir.id);
    const state = await this.getGitState(newDir.id);
    state.remotes['origin'] = url;
    await this.saveGitState(newDir.id, state);
    
    return `Cloning into '${dirName}'...\nwarning: You appear to have cloned an empty repository.`;
  }

  private async deleteFile(rootId: string, path: string) {
    let currentId = rootId;
    const parts = path.split('/');
    const fileName = parts.pop()!;
    
    for (const part of parts) {
      const child = await vfsCore.getChildByName(currentId, part);
      if (!child || child.type !== 'directory') return;
      currentId = child.id;
    }
    
    const fileNode = await vfsCore.getChildByName(currentId, fileName);
    if (fileNode) {
      await vfsCore.deleteNode(fileNode.id);
    }
  }

  private async createFileRecursive(rootId: string, path: string, content: string) {
    const parts = path.split('/');
    const fileName = parts.pop()!;
    let currentId = rootId;
    
    for (const part of parts) {
      const child = await vfsCore.getChildByName(currentId, part);
      if (child && child.type === 'directory') {
        currentId = child.id;
      } else {
        const newDir = await vfsCore.createNode({
          name: part,
          type: 'directory',
          parentId: currentId,
          permissions: 'rwxr-xr-x'
        });
        currentId = newDir.id;
      }
    }
    
    // Check if file exists to update or create
    const existing = await vfsCore.getChildByName(currentId, fileName);
    if (existing) {
      await vfsCore.updateNode(existing.id, { content });
    } else {
      await vfsCore.createNode({
        name: fileName,
        type: 'file',
        parentId: currentId,
        content: content,
        permissions: 'rw-r--r--'
      });
    }
  }

  // Helper to scan all files in repo and return map of "path/to/file" -> content
  private async scanWorkspace(rootId: string, prefix = ''): Promise<Record<string, string>> {
    const files: Record<string, string> = {};
    const children = await vfsCore.getChildren(rootId);
    
    for (const child of children) {
      const path = prefix ? `${prefix}/${child.name}` : child.name;
      if (child.type === 'file') {
        files[path] = child.content || '';
      } else {
        if (child.name === '.git') continue;
        const subFiles = await this.scanWorkspace(child.id, path);
        Object.assign(files, subFiles);
      }
    }
    return files;
  }
}

export const gitService = new GitService();
