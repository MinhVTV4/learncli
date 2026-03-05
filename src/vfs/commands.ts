import { vfsCore } from './core';
import { resolvePath, getAbsolutePath } from './pathResolver';

export class VFSCommands {
  cwdId: string = 'root';

  async init() {
    await vfsCore.init();
    // Try to set cwd to /home/user
    const homeUser = await resolvePath('/home/user', 'root');
    if (homeUser && homeUser.type === 'directory') {
      this.cwdId = homeUser.id;
    }
  }

  async pwd(): Promise<string> {
    return await getAbsolutePath(this.cwdId);
  }

  async ls(path: string = '.', flags: string[] = []): Promise<string[]> {
    const target = await resolvePath(path, this.cwdId);
    if (!target) throw new Error('No such file or directory');
    if (target.type === 'file') return [target.name];
    
    const children = await vfsCore.getChildren(target.id);
    const sortedChildren = children.sort((a, b) => a.name.localeCompare(b.name));

    if (flags.includes('-l')) {
      return sortedChildren.map(c => {
        const typeChar = c.type === 'directory' ? 'd' : '-';
        const perms = c.permissions || (c.type === 'directory' ? 'rwxr-xr-x' : 'rw-r--r--');
        const size = c.content ? c.content.length : 0;
        const date = new Date(c.updatedAt).toLocaleString();
        return `${typeChar}${perms} 1 user user ${String(size).padStart(5)} ${date} ${c.name}`;
      });
    }

    return sortedChildren.map(c => c.name);
  }

  async chmod(mode: string, path: string): Promise<void> {
    const target = await resolvePath(path, this.cwdId);
    if (!target) throw new Error(`chmod: cannot access '${path}': No such file or directory`);
    
    // Simple chmod implementation: only supports setting full string like 'rwxrwxrwx' or '+x' (simplified)
    // For this learning app, let's support:
    // 1. Absolute mode: '755', '644' (mapped to strings)
    // 2. Symbolic mode: '+x' (adds x to all)

    let newPerms = target.permissions || (target.type === 'directory' ? 'rwxr-xr-x' : 'rw-r--r--');

    if (mode === '+x') {
      // Add x to user, group, other
      // rwx r-x r-x -> rwx r-x r-x (already has x)
      // rw- r-- r-- -> rwx r-x r-x
      // Simplified: just replace - with x in positions 2, 5, 8
      const chars = newPerms.split('');
      if (chars[2] === '-') chars[2] = 'x';
      if (chars[5] === '-') chars[5] = 'x';
      if (chars[8] === '-') chars[8] = 'x';
      newPerms = chars.join('');
    } else if (mode === '755') {
      newPerms = 'rwxr-xr-x';
    } else if (mode === '644') {
      newPerms = 'rw-r--r--';
    } else if (mode === '777') {
      newPerms = 'rwxrwxrwx';
    } else if (mode === '700') {
      newPerms = 'rwx------';
    } else if (mode === '600') {
      newPerms = 'rw-------';
    } else {
      // Assume it's a direct permission string if length is 9
      if (mode.length === 9) {
        newPerms = mode;
      } else {
        throw new Error(`chmod: invalid mode: '${mode}'`);
      }
    }

    await vfsCore.updateNode(target.id, { permissions: newPerms });
  }

  async cd(path: string): Promise<void> {
    const target = await resolvePath(path, this.cwdId);
    if (!target) throw new Error('No such file or directory');
    if (target.type !== 'directory') throw new Error('Not a directory');
    this.cwdId = target.id;
  }

  async mkdir(path: string): Promise<void> {
    const parts = path.split('/');
    const name = parts.pop()!;
    const parentPath = parts.join('/') || (path.startsWith('/') ? '/' : '.');
    
    const parent = await resolvePath(parentPath, this.cwdId);
    if (!parent || parent.type !== 'directory') throw new Error('No such file or directory');
    
    const existing = await vfsCore.getChildByName(parent.id, name);
    if (existing) throw new Error('File exists');
    
    await vfsCore.createNode({
      name,
      type: 'directory',
      parentId: parent.id,
    });
  }

  async touch(path: string): Promise<void> {
    const parts = path.split('/');
    const name = parts.pop()!;
    const parentPath = parts.join('/') || (path.startsWith('/') ? '/' : '.');
    
    const parent = await resolvePath(parentPath, this.cwdId);
    if (!parent || parent.type !== 'directory') throw new Error('No such file or directory');
    
    const existing = await vfsCore.getChildByName(parent.id, name);
    if (!existing) {
      await vfsCore.createNode({
        name,
        type: 'file',
        parentId: parent.id,
        content: '',
      });
    }
  }

  async rm(path: string): Promise<void> {
    const target = await resolvePath(path, this.cwdId);
    if (!target) throw new Error('No such file or directory');
    if (target.id === 'root') throw new Error('Cannot remove root');
    
    await vfsCore.deleteNode(target.id);
  }

  async cat(path: string): Promise<string> {
    const target = await resolvePath(path, this.cwdId);
    if (!target) throw new Error('No such file or directory');
    if (target.type !== 'file') throw new Error('Is a directory');
    
    return target.content || '';
  }

  async grep(pattern: string, filePath?: string, stdin?: string): Promise<string> {
    let content = '';
    
    if (filePath) {
      const target = await resolvePath(filePath, this.cwdId);
      if (!target) throw new Error(`grep: ${filePath}: No such file or directory`);
      if (target.type === 'directory') throw new Error(`grep: ${filePath}: Is a directory`);
      content = target.content || '';
    } else if (stdin !== undefined) {
      content = stdin;
    } else {
      throw new Error('grep: missing file operand or stdin');
    }

    const lines = content.split('\n');
    // Simple regex search if pattern looks like regex, otherwise substring
    // For simplicity in this learning app, we'll use simple includes or strict regex if wrapped in /
    let isMatch: (line: string) => boolean;
    
    if (pattern.startsWith('/') && pattern.endsWith('/')) {
      try {
        const regex = new RegExp(pattern.slice(1, -1));
        isMatch = (line) => regex.test(line);
      } catch {
        // Fallback to substring if invalid regex
        isMatch = (line) => line.includes(pattern);
      }
    } else {
      isMatch = (line) => line.includes(pattern);
    }

    return lines.filter(isMatch).join('\n');
  }

  async find(startPath: string = '.', namePattern?: string): Promise<string[]> {
    const root = await resolvePath(startPath, this.cwdId);
    if (!root) throw new Error(`find: '${startPath}': No such file or directory`);
    
    const results: string[] = [];
    
    const traverse = async (nodeId: string, currentPath: string) => {
      const node = await vfsCore.getNode(nodeId);
      if (!node) return;

      // Check match
      if (!namePattern || node.name.includes(namePattern.replace(/\*/g, ''))) {
         // Very basic glob handling: just remove * and check includes
         // For a learning app, exact match or simple includes is often enough, 
         // but let's try to be slightly smarter: if pattern has *, treat as substring match
         // if no *, treat as exact match? 
         // Let's stick to: if namePattern provided, check if node.name includes it (simplified)
         // Or better: simple wildcard matcher
         if (this.matchesPattern(node.name, namePattern)) {
            results.push(currentPath);
         }
      } else if (!namePattern) {
        results.push(currentPath);
      }

      if (node.type === 'directory') {
        const children = await vfsCore.getChildren(nodeId);
        for (const child of children) {
          const childPath = currentPath === '/' ? `/${child.name}` : `${currentPath}/${child.name}`;
          await traverse(child.id, childPath);
        }
      }
    };

    // If startPath is '.', use current directory name? No, find output is relative to startPath usually.
    // But here we return full paths or relative? 
    // Let's return paths relative to startPath for simplicity, or just full paths if easier.
    // Standard find . returns ./file
    
    // Let's simplify: always traverse from the resolved node
    // If root is the node for startPath.
    
    await traverse(root.id, startPath === '.' ? '.' : startPath);
    return results;
  }

  private matchesPattern(name: string, pattern?: string): boolean {
    if (!pattern) return true;
    // Simple * wildcard support
    if (pattern.includes('*')) {
      const parts = pattern.split('*').filter(p => p);
      return parts.every(part => name.includes(part));
    }
    return name === pattern;
  }

  async cp(srcPath: string, destPath: string): Promise<void> {
    const srcNode = await resolvePath(srcPath, this.cwdId);
    if (!srcNode) throw new Error(`cp: cannot stat '${srcPath}': No such file or directory`);
    
    if (srcNode.type === 'directory') throw new Error(`cp: -r not specified; omitting directory '${srcPath}'`);

    const destParts = destPath.split('/');
    const destName = destParts.pop()!;
    const destParentPath = destParts.join('/') || (destPath.startsWith('/') ? '/' : '.');
    
    let destParent = await resolvePath(destParentPath, this.cwdId);
    if (!destParent) throw new Error(`cp: cannot create regular file '${destPath}': No such file or directory`);
    
    let finalDestParentId = destParent.id;
    let finalDestName = destName;

    const existingDest = await resolvePath(destPath, this.cwdId);
    if (existingDest && existingDest.type === 'directory') {
      finalDestParentId = existingDest.id;
      finalDestName = srcNode.name;
    }

    const existingFile = await vfsCore.getChildByName(finalDestParentId, finalDestName);
    if (existingFile) {
      if (existingFile.type === 'directory') throw new Error(`cp: cannot overwrite directory '${finalDestName}' with non-directory`);
      await vfsCore.updateNode(existingFile.id, { content: srcNode.content });
    } else {
      await vfsCore.createNode({
        name: finalDestName,
        type: 'file',
        parentId: finalDestParentId,
        content: srcNode.content,
      });
    }
  }

  async mv(srcPath: string, destPath: string): Promise<void> {
    const srcNode = await resolvePath(srcPath, this.cwdId);
    if (!srcNode) throw new Error(`mv: cannot stat '${srcPath}': No such file or directory`);
    if (srcNode.id === 'root') throw new Error(`mv: cannot move root`);

    const destParts = destPath.split('/');
    const destName = destParts.pop()!;
    const destParentPath = destParts.join('/') || (destPath.startsWith('/') ? '/' : '.');
    
    let destParent = await resolvePath(destParentPath, this.cwdId);
    if (!destParent) throw new Error(`mv: cannot move to '${destPath}': No such file or directory`);

    let finalDestParentId = destParent.id;
    let finalDestName = destName;

    const existingDest = await resolvePath(destPath, this.cwdId);
    if (existingDest && existingDest.type === 'directory') {
      finalDestParentId = existingDest.id;
      finalDestName = srcNode.name;
    }

    const existingFile = await vfsCore.getChildByName(finalDestParentId, finalDestName);
    if (existingFile) {
      if (existingFile.id === srcNode.id) return;
      if (existingFile.type === 'directory' && srcNode.type !== 'directory') throw new Error(`mv: cannot overwrite directory '${finalDestName}' with non-directory`);
      if (existingFile.type !== 'directory' && srcNode.type === 'directory') throw new Error(`mv: cannot overwrite non-directory '${finalDestName}' with directory`);
      
      await vfsCore.deleteNode(existingFile.id);
    }

    await vfsCore.updateNode(srcNode.id, { name: finalDestName, parentId: finalDestParentId });
  }

  async writeFile(path: string, content: string): Promise<void> {
    const parts = path.split('/');
    const name = parts.pop()!;
    const parentPath = parts.join('/') || (path.startsWith('/') ? '/' : '.');
    
    const parent = await resolvePath(parentPath, this.cwdId);
    if (!parent || parent.type !== 'directory') throw new Error('No such file or directory');
    
    const existing = await vfsCore.getChildByName(parent.id, name);
    if (existing) {
      if (existing.type !== 'file') throw new Error('Is a directory');
      await vfsCore.updateNode(existing.id, { content });
    } else {
      await vfsCore.createNode({
        name,
        type: 'file',
        parentId: parent.id,
        content,
      });
    }
  }

  async appendFile(path: string, content: string): Promise<void> {
    const parts = path.split('/');
    const name = parts.pop()!;
    const parentPath = parts.join('/') || (path.startsWith('/') ? '/' : '.');
    
    const parent = await resolvePath(parentPath, this.cwdId);
    if (!parent || parent.type !== 'directory') throw new Error('No such file or directory');
    
    const existing = await vfsCore.getChildByName(parent.id, name);
    if (existing) {
      if (existing.type !== 'file') throw new Error('Is a directory');
      await vfsCore.updateNode(existing.id, { content: (existing.content || '') + content });
    } else {
      await vfsCore.createNode({
        name,
        type: 'file',
        parentId: parent.id,
        content,
      });
    }
  }
}
