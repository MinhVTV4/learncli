import { vfsCore } from './core';
import { VFSNode } from './types';

export async function resolvePath(path: string, cwdId: string): Promise<VFSNode | null> {
  if (path === '/') return await vfsCore.getNode('root') || null;

  const parts = path.split('/').filter(p => p !== '');
  let currentId = path.startsWith('/') ? 'root' : cwdId;

  for (const part of parts) {
    if (part === '.') continue;
    
    const current = await vfsCore.getNode(currentId);
    if (!current || current.type !== 'directory') return null;

    if (part === '..') {
      if (current.parentId) {
        currentId = current.parentId;
      }
      continue;
    }

    const child = await vfsCore.getChildByName(currentId, part);
    if (!child) return null;
    currentId = child.id;
  }

  return await vfsCore.getNode(currentId) || null;
}

export async function getAbsolutePath(nodeId: string): Promise<string> {
  if (nodeId === 'root') return '/';
  
  const parts: string[] = [];
  let currentId: string | null = nodeId;
  
  while (currentId && currentId !== 'root') {
    const node = await vfsCore.getNode(currentId);
    if (!node) break;
    parts.unshift(node.name);
    currentId = node.parentId;
  }
  
  return '/' + parts.join('/');
}
