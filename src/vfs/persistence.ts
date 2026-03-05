import Dexie, { Table } from 'dexie';
import { VFSNode } from './types';

export class VFSDatabase extends Dexie {
  nodes!: Table<VFSNode, string>;

  constructor() {
    super('cli-vfs-db');
    this.version(1).stores({
      nodes: 'id, parentId, [parentId+name], type',
    });
  }
}

export const db = new VFSDatabase();

export async function initRoot(): Promise<void> {
  await db.transaction('rw', db.nodes, async () => {
    const root = await db.nodes.get('root');
    if (root) return;

    await db.nodes.add({
      id: 'root',
      name: '/',
      type: 'directory',
      parentId: null,
      permissions: 'rwxr-xr-x',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    // Create home/user directory for default workspace
    const homeId = crypto.randomUUID();
    await db.nodes.add({
      id: homeId,
      name: 'home',
      type: 'directory',
      parentId: 'root',
      permissions: 'rwxr-xr-x',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    const userId = crypto.randomUUID();
    await db.nodes.add({
      id: userId,
      name: 'user',
      type: 'directory',
      parentId: homeId,
      permissions: 'rwxr-xr-x',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await db.nodes.add({
      id: crypto.randomUUID(),
      name: 'readme.txt',
      type: 'file',
      parentId: userId,
      content: 'Welcome to the CLI Learning App!\nThis file system is persisted in your browser using IndexedDB.',
      permissions: 'rw-r--r--',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });
}
