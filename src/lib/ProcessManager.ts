
export interface Process {
  pid: number;
  user: string;
  cpu: number;
  mem: number;
  time: string;
  command: string;
  status: 'R' | 'S' | 'Z'; // Running, Sleeping, Zombie
  startTime: number;
}

export class ProcessManager {
  private processes: Process[] = [];
  private nextPid: number = 100;

  constructor() {
    // Init default processes
    this.spawn("root", "init", false);
    this.spawn("root", "systemd", false);
    this.spawn("user", "bash", false);
    this.spawn("user", "dockerd", false);
  }

  spawn(user: string, command: string, isBackground: boolean): Process {
    const pid = this.nextPid++;
    const process: Process = {
      pid,
      user,
      cpu: Math.random() * 5, // Random initial CPU usage
      mem: Math.random() * 2, // Random initial Mem usage
      time: "0:00",
      command,
      status: 'S', // Default sleeping
      startTime: Date.now()
    };

    // Simulate running state logic
    if (command.includes("node") || command.includes("python") || command.includes("top")) {
      process.status = 'R';
      process.cpu += 10 + Math.random() * 20;
      process.mem += 5 + Math.random() * 10;
    }

    this.processes.push(process);
    return process;
  }

  kill(pid: number): boolean {
    const index = this.processes.findIndex(p => p.pid === pid);
    if (index !== -1) {
      // Don't allow killing init or bash easily in this sim (optional safety)
      if (this.processes[index].command === 'init' || this.processes[index].command === 'bash') {
        return false;
      }
      this.processes.splice(index, 1);
      return true;
    }
    return false;
  }

  list(): Process[] {
    // Update stats slightly to simulate realism
    this.processes.forEach(p => {
      if (p.status === 'R') {
        p.cpu = Math.max(0, Math.min(100, p.cpu + (Math.random() - 0.5) * 5));
        
        // Update time
        const diff = Date.now() - p.startTime;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const displaySec = seconds % 60;
        p.time = `${minutes}:${displaySec.toString().padStart(2, '0')}`;
      }
    });
    return [...this.processes];
  }

  get(pid: number): Process | undefined {
    return this.processes.find(p => p.pid === pid);
  }
}

export const processManager = new ProcessManager();
