import React, { useEffect, useRef, useState, useCallback } from "react";
import { db } from '../vfs/persistence';
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { SearchAddon } from "@xterm/addon-search";
import { Unicode11Addon } from "@xterm/addon-unicode11";
import { WebglAddon } from "@xterm/addon-webgl";
import "@xterm/xterm/css/xterm.css";
import { Shell } from "../lib/Shell";
import { getAISuggestions } from "../lib/ai";
import fuzzysort from "fuzzysort";
import { NanoEditor } from "./NanoEditor";
import {
  Terminal as TerminalIcon,
  Sparkles,
  History,
  Command,
  Lightbulb,
} from "lucide-react";

type Suggestion = {
  text: string;
  source: "history" | "ai" | "command" | "hint";
  score?: number;
};

const AVAILABLE_COMMANDS = [
  "ls",
  "cd",
  "pwd",
  "mkdir",
  "touch",
  "rm",
  "cat",
  "echo",
  "whoami",
  "clear",
  "help",
  "git",
  "branch",
  "checkout",
  "merge",
  "remote",
  "push",
  "clone",
  "find",
  "grep",
  "chmod",
  "sudo",
  "history",
  "diff",
  "nano",
  "npm",
  "node",
  "curl",
  "docker"
];

export function TerminalComponent({ 
  onCommandExecuted,
  onCommandParsed,
  currentTask
}: { 
  onCommandExecuted?: () => void;
  onCommandParsed?: (cmd: string, vfs: any) => void;
  currentTask?: { commandHint: string; description: string };
}) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const shellRef = useRef<Shell>(new Shell());

  const [input, setInput] = useState("");
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Nano Editor State
  const [isNanoOpen, setIsNanoOpen] = useState(false);
  const [nanoFile, setNanoFile] = useState("");
  const [nanoContent, setNanoContent] = useState("");
  
  // Advanced Line Editing Refs
  const currentLineRef = useRef("");
  const cursorIndexRef = useRef(0); // Position within the current line

  // Load history from DB
  useEffect(() => {
    db.table('history').orderBy('timestamp').toArray().then(items => {
      setHistory(items.map(i => i.command));
    });
  }, []);

  // Debounced AI suggestions
  const aiTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateSuggestions = useCallback(
    async (currentInput: string) => {
      if (!currentInput.trim()) {
        setShowSuggestions(false);
        return;
      }

      setShowSuggestions(true);
      setSelectedIndex(0);

      const suggestions: Suggestion[] = [];

      // 0. Current Task Hint (Highest Priority)
      if (currentTask && currentTask.commandHint) {
        const hint = currentTask.commandHint;
        // Simple check: if input is a prefix of hint, or hint contains input
        if (hint.startsWith(currentInput) || hint.includes(currentInput)) {
           suggestions.push({
             text: hint,
             source: "hint",
             score: 1000 // High score
           });
        }
      }

      // 1. Fuzzy match history
      const historyMatches = fuzzysort
        .go(currentInput, history, { limit: 3 })
        .map((r) => ({
          text: r.target,
          source: "history" as const,
          score: r.score,
        }));

      // 2. Fuzzy match commands
      const commandMatches = fuzzysort
        .go(currentInput, AVAILABLE_COMMANDS, { limit: 3 })
        .map((r) => ({
          text: r.target,
          source: "command" as const,
          score: r.score,
        }));

      let combined = [...suggestions, ...historyMatches, ...commandMatches].sort(
        (a, b) => (b.score || 0) - (a.score || 0),
      );

      // Deduplicate
      const seen = new Set<string>();
      combined = combined.filter((s) => {
        if (seen.has(s.text)) return false;
        seen.add(s.text);
        return true;
      });

      setSuggestions(combined.slice(0, 5));

      // 3. Fetch AI suggestions
      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
      aiTimeoutRef.current = setTimeout(async () => {
        const aiSugs = await getAISuggestions(currentInput, history);
        if (aiSugs.length > 0) {
          setSuggestions((prev) => {
            const newSugs = aiSugs.map((text) => ({
              text,
              source: "ai" as const,
            }));
            const merged = [...prev, ...newSugs];
            const seenMerged = new Set<string>();
            return merged
              .filter((s) => {
                if (seenMerged.has(s.text)) return false;
                seenMerged.add(s.text);
                return true;
              })
              .slice(0, 7);
          });
        }
      }, 500);
    },
    [history],
  );

  useEffect(() => {
    if (!terminalRef.current) return;

    const initTerminal = async () => {
      const term = new XTerm({
        cursorBlink: true,
        theme: {
          background: "#1e1e1e",
          foreground: "#d4d4d4",
          cursor: "#ffffff",
          selectionBackground: "#4d4d4d",
        },
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 14,
        allowProposedApi: true,
      });

      // Initialize Addons
      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();
      const searchAddon = new SearchAddon();
      const unicode11Addon = new Unicode11Addon();
      
      term.loadAddon(fitAddon);
      term.loadAddon(webLinksAddon);
      term.loadAddon(searchAddon);
      term.loadAddon(unicode11Addon);
      
      // WebGL might fail in some environments, wrap in try-catch
      try {
        const webglAddon = new WebglAddon();
        webglAddon.onContextLoss(e => {
          webglAddon.dispose();
        });
        term.loadAddon(webglAddon);
      } catch (e) {
        console.warn("WebGL addon failed to load, falling back to canvas renderer", e);
      }

      term.unicode.activeVersion = '11';

      // Intercept keys when suggestions are shown
      term.attachCustomKeyEventHandler((e) => {
        // We need to know if suggestions are shown. We can check the DOM for the suggestions panel.
        const suggestionsPanel = document.getElementById("hintshell-suggestions");
        if (suggestionsPanel) {
          if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "Tab") {
            return false; // Prevent xterm from handling this
          }
        }
        return true;
      });

      term.open(terminalRef.current!);
      fitAddon.fit();

      xtermRef.current = term;
      fitAddonRef.current = fitAddon;

      const shell = shellRef.current;
      await shell.init();
      term.write(await shell.getPrompt());

      const currentLineRef = { current: "" };

      term.onData(async (e) => {
        const char = e;

        // Handle Enter
        if (char === "\r") {
          term.write("\r\n");
          const cmd = currentLineRef.current.trim();
          if (cmd) {
            // Check for Nano command
            if (cmd.startsWith("nano")) {
              const args = cmd.split(/\s+/);
              const filename = args[1];
              if (filename) {
                let content = "";
                try {
                  content = await shell.vfs.cat(filename);
                } catch (e) {
                  // File doesn't exist, start empty
                }
                setNanoFile(filename);
                setNanoContent(content);
                setIsNanoOpen(true);
                
                // Add to history manually since we bypass shell.execute
                await db.table('history').add({
                  command: cmd,
                  timestamp: Date.now()
                });
                setHistory((prev) => [...prev, cmd]);
                
                currentLineRef.current = "";
                setInput("");
                setShowSuggestions(false);
                return;
              } else {
                 term.write("Usage: nano <filename>\r\n");
              }
            } else if (cmd === "clear") {
              term.clear();
            } else {
              const output = await shell.execute(cmd);
              if (output) {
                term.write(output.replace(/\n/g, "\r\n") + "\r\n");
              }
            }
            
            // Save to DB (if not nano, which handled it above)
            if (!cmd.startsWith("nano")) {
              await db.table('history').add({
                command: cmd,
                timestamp: Date.now()
              });
              setHistory((prev) => [...prev, cmd]);
            }

            if (onCommandExecuted) onCommandExecuted();
            if (onCommandParsed) onCommandParsed(cmd, shell.vfs);
          }
          currentLineRef.current = "";
          setInput("");
          setShowSuggestions(false);
          term.write(await shell.getPrompt());
          return;
        }

      // Handle Backspace
      if (char === "\x7F") {
        if (currentLineRef.current.length > 0) {
          currentLineRef.current = currentLineRef.current.slice(0, -1);
          term.write("\b \b");
          setInput(currentLineRef.current);
          updateSuggestions(currentLineRef.current);
        }
        return;
      }

      // Handle Tab (Autocomplete)
      if (char === "\t") {
        // We will handle this in onKey to prevent default
        return;
      }

      // Printable characters
      if (
        char >= String.fromCharCode(0x20) &&
        char <= String.fromCharCode(0x7e)
      ) {
        currentLineRef.current += char;
        term.write(char);
        setInput(currentLineRef.current);
        updateSuggestions(currentLineRef.current);
      }
    });

    const handleAutocomplete = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      currentLineRef.current = customEvent.detail;
    };
    window.addEventListener("terminal-autocomplete", handleAutocomplete);

    term.onKey(({ key, domEvent }) => {
      if (domEvent.key === "ArrowUp" || domEvent.key === "ArrowDown") {
        // If suggestions are visible, navigate them
        // We need to handle this in React state, but term.onKey runs outside React's render cycle easily.
        // We'll dispatch a custom event or use a ref.
      }
    });

      const handleResize = () => {
        fitAddon.fit();
      };
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("terminal-autocomplete", handleAutocomplete);
        term.dispose();
      };
    };

    const cleanup = initTerminal();
    
    return () => {
      cleanup.then(fn => fn && fn());
    };
  }, []); // Re-init if history changes? No, history is ref-accessed or state-accessed. 

  const historyRef = useRef(history);
  useEffect(() => { historyRef.current = history; }, [history]);

  // Update cursor position
  useEffect(() => {
    const term = xtermRef.current;
    const termEl = terminalRef.current;
    if (!term || !termEl) return;

    const updatePos = () => {
      const cellWidth = termEl.clientWidth / term.cols;
      const cellHeight = termEl.clientHeight / term.rows;

      // Calculate cursor position relative to the terminal container
      const x = term.buffer.active.cursorX * cellWidth;
      const y = (term.buffer.active.cursorY + 1) * cellHeight;

      setCursorPos({ x, y });
    };

    term.onCursorMove(updatePos);
    updatePos();
  }, [input]);

  // Handle keyboard navigation for suggestions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showSuggestions || suggestions.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(
          (prev) => (prev - 1 + suggestions.length) % suggestions.length,
        );
      } else if (e.key === "Tab" || e.key === "Enter") {
        if (e.key === "Tab") e.preventDefault();

        const selected = suggestions[selectedIndex];
        if (selected && xtermRef.current) {
          const term = xtermRef.current;
          // Clear current input in terminal
          for (let i = 0; i < input.length; i++) {
            term.write("\b \b");
          }
          // Write new input
          term.write(selected.text);

          const event = new CustomEvent("terminal-autocomplete", {
            detail: selected.text,
          });
          window.dispatchEvent(event);

          setInput(selected.text);
          setShowSuggestions(false);
        }
      } else if (e.key === "Escape") {
        setShowSuggestions(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showSuggestions, suggestions, selectedIndex, input]);

  return (
    <div className="relative w-full h-full bg-[#1e1e1e] rounded-lg overflow-hidden border border-white/10 shadow-2xl">
      <div className="flex items-center px-4 py-2 bg-[#2d2d2d] border-b border-white/5">
        <div className="flex space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
        <div className="mx-auto flex items-center text-xs text-gray-400 font-mono">
          <TerminalIcon size={14} className="mr-2" />
          user@learn-cli:~
        </div>
      </div>

      <div ref={terminalRef} className="w-full h-[calc(100%-40px)] p-4" />

      {isNanoOpen && (
        <div className="absolute top-[40px] left-0 right-0 bottom-0 z-40">
          <NanoEditor 
            filename={nanoFile}
            initialContent={nanoContent}
            onSave={async (content) => {
              await shellRef.current.vfs.writeFile(nanoFile, content);
              if (onCommandExecuted) onCommandExecuted(); // Refresh file explorer
            }}
            onExit={() => {
              setIsNanoOpen(false);
              xtermRef.current?.focus();
              shellRef.current.getPrompt().then(p => {
                xtermRef.current?.write(p);
              });
            }}
          />
        </div>
      )}

      {showSuggestions && suggestions.length > 0 && !isNanoOpen && (
        <div
          id="hintshell-suggestions"
          className="absolute z-50 bg-[#252526] border border-[#454545] rounded-md shadow-xl overflow-hidden min-w-[300px]"
          style={{
            left: `${Math.min(cursorPos.x + 20, terminalRef.current?.clientWidth || 0 - 320)}px`,
            top: `${Math.min(cursorPos.y + 50, terminalRef.current?.clientHeight || 0 - 200)}px`,
          }}
        >
          <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 border-b border-[#454545] flex items-center justify-between bg-[#2d2d2d]">
            <span>HintShell Suggestions</span>
            <span className="text-[10px] opacity-70">Tab to accept</span>
          </div>
          <ul className="py-1">
            {suggestions.map((sug, idx) => (
              <li
                key={idx}
                className={`px-3 py-1.5 text-sm font-mono flex items-center space-x-2 cursor-pointer transition-colors ${
                  idx === selectedIndex
                    ? "bg-[#094771] text-white"
                    : "text-gray-300 hover:bg-[#2a2d2e]"
                }`}
                onClick={() => {
                  setSelectedIndex(idx);
                  // Trigger accept
                }}
              >
                {sug.source === "ai" && (
                  <Sparkles size={14} className="text-purple-400 shrink-0" />
                )}
                {sug.source === "history" && (
                  <History size={14} className="text-blue-400 shrink-0" />
                )}
                {sug.source === "command" && (
                  <Command size={14} className="text-green-400 shrink-0" />
                )}
                {sug.source === "hint" && (
                  <Lightbulb size={14} className="text-yellow-400 shrink-0" />
                )}
                <span className="truncate">{sug.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
