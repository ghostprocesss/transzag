import React, { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon, Send, Eraser, Play } from 'lucide-react';
import { TerminalLogEntry } from '../types';
import { executeConsoleCommand } from '../api';

interface Props {
  logs: TerminalLogEntry[];
  onAddLog: (entry: Omit<TerminalLogEntry, 'id'>) => void;
  onClearLogs: () => void;
  onAction?: (action: string, data: any) => void;
  heightClass?: string;
}

export const CommandConsole: React.FC<Props> = ({
  logs,
  onAddLog,
  onClearLogs,
  onAction,
  heightClass = 'h-72',
}) => {
  const [inputCmd, setInputCmd] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);
  const [isExecuting, setIsExecuting] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleExecute = async (commandToRun?: string) => {
    const cmd = (commandToRun ?? inputCmd).trim();
    if (!cmd) return;

    // Record in history
    setHistory((prev) => [...prev, cmd]);
    setHistoryIdx(-1);
    setInputCmd('');

    const nowStr = new Date().toTimeString().split(' ')[0];

    // Log the user command entry
    onAddLog({
      timestamp: nowStr,
      type: 'CMD',
      message: `root@blockscope:~$ ${cmd}`,
    });

    if (cmd.toLowerCase() === 'clear') {
      onClearLogs();
      return;
    }

    setIsExecuting(true);
    try {
      const res = await executeConsoleCommand(cmd);
      const resTime = new Date().toTimeString().split(' ')[0];

      if (res.status === 'clear') {
        onClearLogs();
      } else if (res.output) {
        // Output can have multiple lines
        const lines = res.output.split('\n');
        for (const line of lines) {
          let logType: TerminalLogEntry['type'] = 'INFO';
          if (line.includes('[WARN]')) logType = 'WARN';
          else if (line.includes('[ERROR]') || line.includes('[CRITICAL')) logType = 'ERROR';
          else if (line.includes('[SCAN]')) logType = 'SCAN';
          else if (line.includes('[DONE]')) logType = 'DONE';

          onAddLog({
            timestamp: resTime,
            type: logType,
            message: line,
          });
        }
      }

      // If command returned a GUI action callback (e.g. open wallet, highlight path)
      if (res.action && onAction) {
        onAction(res.action, res.data);
      }
    } catch (err: any) {
      onAddLog({
        timestamp: new Date().toTimeString().split(' ')[0],
        type: 'ERROR',
        message: `[ERROR] Failed to execute: ${err.message}`,
      });
    } finally {
      setIsExecuting(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleExecute();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const nextIdx = historyIdx === -1 ? history.length - 1 : Math.max(0, historyIdx - 1);
        setHistoryIdx(nextIdx);
        setInputCmd(history[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx !== -1) {
        const nextIdx = historyIdx + 1;
        if (nextIdx < history.length) {
          setHistoryIdx(nextIdx);
          setInputCmd(history[nextIdx]);
        } else {
          setHistoryIdx(-1);
          setInputCmd('');
        }
      }
    }
  };

  const quickCommands = ['help', 'status', 'stats', 'scan all', 'bench', 'demo', 'clear'];

  const getLogColor = (type: TerminalLogEntry['type']) => {
    switch (type) {
      case 'CMD':
        return 'text-[#00f0ff] font-bold';
      case 'SCAN':
        return 'text-[#00ff66]';
      case 'WARN':
        return 'text-[#ffb000]';
      case 'ERROR':
        return 'text-[#ff3344]';
      case 'DONE':
        return 'text-[#00ff66] font-semibold';
      case 'INFO':
      default:
        return 'text-[#88c5a0]';
    }
  };

  return (
    <div className={`border border-[#132e1f] bg-[#050a07] flex flex-col ${heightClass} text-xs font-mono`}>
      {/* Console Top Bar */}
      <div className="flex items-center justify-between border-b border-[#132e1f] bg-[#07120a] px-3 py-1.5 text-[11px]">
        <div className="flex items-center space-x-2">
          <TerminalIcon className="h-3.5 w-3.5 text-[#00ff66]" />
          <span className="font-bold text-[#00ff66] tracking-wider">COMMAND INTERPRETER // INTERACTIVE CONSOLE</span>
          <span className="text-[#5a8a6e]">[TTY_1]</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <button
            onClick={onClearLogs}
            className="flex items-center space-x-1 px-1.5 py-0.5 border border-[#132e1f] hover:border-[#ff3344] text-[#5a8a6e] hover:text-[#ff3344] transition-colors"
            title="Clear display logs"
          >
            <Eraser className="h-3 w-3" />
            <span>CLR</span>
          </button>
        </div>
      </div>

      {/* Quick Command Ribbon */}
      <div className="border-b border-[#132e1f] bg-[#040805] px-2 py-1 flex flex-wrap items-center gap-1.5 text-[10px]">
        <span className="text-[#5a8a6e] font-semibold">PRESETS:</span>
        {quickCommands.map((qc) => (
          <button
            key={qc}
            onClick={() => handleExecute(qc)}
            disabled={isExecuting}
            className="border border-[#132e1f] hover:border-[#00f0ff] hover:bg-[#00f0ff]/10 px-1.5 py-0.5 text-[#5a8a6e] hover:text-[#00f0ff] transition-colors"
          >
            ${qc}
          </button>
        ))}
      </div>

      {/* Terminal Log Stream */}
      <div
        ref={logContainerRef}
        className="flex-1 overflow-y-auto p-3 space-y-1 select-text cursor-text bg-[#030604]"
      >
        {logs.map((log) => (
          <div key={log.id} className="leading-relaxed flex items-start space-x-2">
            <span className="text-[#39664c] shrink-0 font-mono text-[10px]">[{log.timestamp}]</span>
            <span className="text-[#5a8a6e] shrink-0 font-bold text-[10px]">[{log.type}]</span>
            <pre className={`whitespace-pre-wrap break-all font-mono text-xs ${getLogColor(log.type)}`}>
              {log.message}
            </pre>
          </div>
        ))}
        {isExecuting && (
          <div className="text-[#00f0ff] animate-pulse flex items-center space-x-2 text-[11px]">
            <span>[*] Executing instruction stream...</span>
          </div>
        )}
      </div>

      {/* Command Input Prompt */}
      <div className="border-t border-[#132e1f] bg-[#060e08] p-2 flex items-center space-x-2">
        <span className="text-[#00ff66] font-bold tracking-tight">root@blockscope:~$</span>
        <input
          ref={inputRef}
          type="text"
          value={inputCmd}
          onChange={(e) => setInputCmd(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isExecuting}
          placeholder="type command (e.g. 'help', 'scan all', 'path 0x... 0x...', 'bench')..."
          className="flex-1 bg-transparent border-none text-[#00f0ff] placeholder-[#38614a] focus:outline-none font-mono text-xs"
        />
        <button
          onClick={() => handleExecute()}
          disabled={isExecuting || !inputCmd.trim()}
          className="border border-[#00ff66]/40 hover:border-[#00ff66] bg-[#00ff66]/10 px-2 py-1 text-[11px] text-[#00ff66] transition-colors disabled:opacity-30"
        >
          <Send className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};
