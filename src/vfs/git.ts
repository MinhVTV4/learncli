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
}

const DEFAULT_STATE: GitState = {
  currentBranch: 'main',
  branches: { main: '' }, // Empty string means no commits yet
  commits: {},
  staging: {},
};

export class GitService {
  
  // Helper: Find repo root (directory containing .git) walking up from cwd
  async findRepoRoot(cwdId: string): Promise<{ id: string, path: string } | null> {
    let currentId = cwdId;
    let pathAcc = ''; // This path is relative to the *found* repo root, which is tricky. 
    // Actually we need the absolute path of the repo root to resolve files correctly.
    
    // Better approach: Walk up checking for .git
    // Since we don't have "parent" pointers easily accessible without querying DB, 
    // and we assume VFS is small, let's rely on the fact that we can resolve paths.
    // But wait, VFSNode has parentId.
    
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

  async getGitState(repoRootId: string): Promise<GitState> {
    const gitDir = await vfsCore.getChildByName(repoRootId, '.git');
    if (!gitDir) throw new Error('Not a git repository');
    
    const stateFile = await vfsCore.getChildByName(gitDir.id, 'state.json');
    if (!stateFile || !stateFile.content) {
      return JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
    return JSON.parse(stateFile.content);
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
      throw new Error('Not a fast-forward merge (merge commits not supported yet in this tutorial)');
    }
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
