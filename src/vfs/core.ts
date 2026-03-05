import { db, initRoot } from './persistence';
import { VFSNode } from './types';

export class VFSCore {
  private cache: Map<string, VFSNode> = new Map();
  private isInitialized = false;

  async init() {
    if (this.isInitialized) return;
    await initRoot();
    this.isInitialized = true;
  }

  async getNode(id: string): Promise<VFSNode | undefined> {
    if (this.cache.has(id)) return this.cache.get(id);
    const node = await db.nodes.get(id);
    if (node) this.cache.set(id, node);
    return node;
  }

  async getChildren(parentId: string): Promise<VFSNode[]> {
    return await db.nodes.where('parentId').equals(parentId).toArray();
  }

  async getChildByName(parentId: string, name: string): Promise<VFSNode | undefined> {
    return await db.nodes.where({ parentId, name }).first();
  }

  async createNode(node: Omit<VFSNode, 'id' | 'createdAt' | 'updatedAt'>): Promise<VFSNode> {
    const newNode: VFSNode = {
      permissions: node.type === 'directory' ? 'rwxr-xr-x' : 'rw-r--r--',
      ...node,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.nodes.add(newNode);
    this.cache.set(newNode.id, newNode);
    return newNode;
  }

  async updateNode(id: string, updates: Partial<VFSNode>): Promise<void> {
    await db.nodes.update(id, { ...updates, updatedAt: Date.now() });
    this.cache.delete(id); // Invalidate cache
  }

  async deleteNode(id: string): Promise<void> {
    const children = await this.getChildren(id);
    for (const child of children) {
      await this.deleteNode(child.id);
    }
    await db.nodes.delete(id);
    this.cache.delete(id);
  }
}

export const vfsCore = new VFSCore();
