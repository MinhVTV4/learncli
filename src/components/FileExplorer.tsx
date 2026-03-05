import React, { useEffect, useState } from 'react';
import { db } from '../vfs/persistence';
import { VFSNode } from '../vfs/types';
import { Folder, FolderOpen, File, ChevronRight, ChevronDown, HardDrive, X } from 'lucide-react';

export function FileExplorer({ refreshTrigger }: { refreshTrigger: number }) {
  const [nodes, setNodes] = useState<VFSNode[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['root']));
  const [selectedFile, setSelectedFile] = useState<VFSNode | null>(null);

  useEffect(() => {
    const loadNodes = async () => {
      const allNodes = await db.nodes.toArray();
      setNodes(allNodes);
    };
    loadNodes();
  }, [refreshTrigger]);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const rootNode = nodes.find(n => n.id === 'root');
  if (!rootNode) return <div className="p-4 text-gray-500 text-sm">Loading VFS...</div>;

  const getChildren = (parentId: string) => {
    return nodes.filter(n => n.parentId === parentId).sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'directory' ? -1 : 1;
    });
  };

  const renderNode = (node: VFSNode, depth: number = 0) => {
    const children = getChildren(node.id);
    const isDir = node.type === 'directory';
    const isExpanded = expanded.has(node.id);
    
    return (
      <div key={node.id} className="flex flex-col select-none">
        <div 
          className="flex items-center py-1 px-2 hover:bg-white/5 cursor-pointer text-sm text-gray-300 transition-colors"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => {
            if (isDir) {
              toggleExpand(node.id);
            } else {
              setSelectedFile(node);
            }
          }}
        >
          {isDir ? (
            isExpanded ? <ChevronDown size={14} className="mr-1 text-gray-500" /> : <ChevronRight size={14} className="mr-1 text-gray-500" />
          ) : (
            <span className="w-[18px]" />
          )}
          {isDir ? (
            isExpanded ? <FolderOpen size={14} className="mr-2 text-blue-400" /> : <Folder size={14} className="mr-2 text-blue-400" />
          ) : (
            <File size={14} className="mr-2 text-gray-400" />
          )}
          <span className="truncate">{node.name}</span>
        </div>
        {isDir && isExpanded && children.map(child => renderNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] rounded-lg overflow-hidden border border-white/10 shadow-2xl">
      <div className="flex items-center px-4 py-2 bg-[#2d2d2d] border-b border-white/5">
        <div className="text-xs text-gray-400 font-mono flex items-center">
          <HardDrive size={14} className="mr-2" />
          IndexedDB VFS
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {renderNode(rootNode)}
      </div>

      {selectedFile && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1e1e1e] border border-white/10 rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-full">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#252526] rounded-t-xl">
              <div className="flex items-center text-sm font-medium text-gray-200">
                <File size={16} className="mr-2 text-gray-400" />
                {selectedFile.name}
              </div>
              <button 
                onClick={() => setSelectedFile(null)}
                className="text-gray-400 hover:text-white transition-colors p-1"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <pre className="text-sm font-mono text-gray-300 whitespace-pre-wrap break-words">
                {selectedFile.content || <span className="text-gray-600 italic">Empty file</span>}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
