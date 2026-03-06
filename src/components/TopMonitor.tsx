
import React, { useEffect, useState } from 'react';
import { processManager, Process } from '../lib/ProcessManager';

interface TopMonitorProps {
  onExit: () => void;
}

export const TopMonitor: React.FC<TopMonitorProps> = ({ onExit }) => {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [uptime, setUptime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProcesses(processManager.list());
      setUptime(prev => prev + 1);
    }, 1000);

    // Initial load
    setProcesses(processManager.list());

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'q' || e.ctrlKey && e.key === 'c') {
        onExit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onExit]);

  const formatUptime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute inset-0 bg-black text-green-400 font-mono p-2 overflow-hidden z-20">
      <div className="mb-2">
        top - {new Date().toLocaleTimeString()} up {formatUptime(uptime)},  1 user,  load average: 0.00, 0.01, 0.05
      </div>
      <div className="mb-2">
        Tasks: {processes.length} total,   {processes.filter(p => p.status === 'R').length} running, {processes.filter(p => p.status === 'S').length} sleeping,   0 stopped,   0 zombie
      </div>
      <div className="mb-2">
        %Cpu(s):  {(Math.random() * 10).toFixed(1)} us,  {(Math.random() * 5).toFixed(1)} sy,  0.0 ni, {(80 + Math.random() * 10).toFixed(1)} id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st
      </div>
      <div className="mb-4">
        MiB Mem :   7961.2 total,   {(2000 + Math.random() * 500).toFixed(1)} free,   {(3000 + Math.random() * 100).toFixed(1)} used,   {(2000 + Math.random() * 100).toFixed(1)} buff/cache
      </div>

      <div className="bg-gray-800 text-white flex px-1">
        <div className="w-16">PID</div>
        <div className="w-20">USER</div>
        <div className="w-16">%CPU</div>
        <div className="w-16">%MEM</div>
        <div className="w-20">TIME+</div>
        <div className="flex-1">COMMAND</div>
      </div>

      <div className="overflow-y-auto h-[calc(100%-160px)]">
        {processes.sort((a, b) => b.cpu - a.cpu).map(p => (
          <div key={p.pid} className="flex px-1 hover:bg-gray-900">
            <div className="w-16">{p.pid}</div>
            <div className="w-20">{p.user}</div>
            <div className="w-16">{p.cpu.toFixed(1)}</div>
            <div className="w-16">{p.mem.toFixed(1)}</div>
            <div className="w-20">{p.time}</div>
            <div className="flex-1">{p.command}</div>
          </div>
        ))}
      </div>
      
      <div 
        className="absolute bottom-0 left-0 w-full bg-gray-800 text-black px-2 cursor-pointer hover:bg-gray-700 hover:text-white transition-colors flex items-center justify-center py-1"
        onClick={onExit}
      >
        Press 'q' or click here to exit
      </div>
    </div>
  );
};
