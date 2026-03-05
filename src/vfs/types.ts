export type VFSNodeType = 'file' | 'directory';

export interface VFSNode {
  id: string;
  name: string;
  type: VFSNodeType;
  parentId: string | null;
  content?: string;
  permissions?: string; // e.g., 'rwxr-xr-x'
  createdAt: number;
  updatedAt: number;
}
