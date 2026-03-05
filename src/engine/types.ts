import { VFSCommands } from '../vfs/commands';

export interface Task {
  id: string;
  description: string;
  commandHint: string;
  verify: (vfs: VFSCommands, lastCommand: string) => Promise<boolean>;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  tasks: Task[];
}
