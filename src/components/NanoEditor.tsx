import React, { useState, useEffect, useRef } from 'react';

interface NanoEditorProps {
  filename: string;
  initialContent: string;
  onSave: (content: string) => Promise<void>;
  onExit: () => void;
}

export function NanoEditor({ filename, initialContent, onSave, onExit }: NanoEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [message, setMessage] = useState("");
  const [isModified, setIsModified] = useState(false);
  const [showExitPrompt, setShowExitPrompt] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      // Move cursor to end
      textareaRef.current.setSelectionRange(textareaRef.current.value.length, textareaRef.current.value.length);
    }
  }, []);

  const handleSave = async () => {
    try {
      await onSave(content);
      const lines = content.split('\n').length;
      setMessage(`[ Wrote ${lines} lines ]`);
      setIsModified(false);
      setShowExitPrompt(false);
      // Clear message after 2s
      setTimeout(() => setMessage(""), 2000);
    } catch (err: any) {
      setMessage(`[ Error writing file: ${err.message || err} ]`);
    }
  };

  const handleExit = () => {
    if (isModified && !showExitPrompt) {
      setShowExitPrompt(true);
      setMessage("Save modified buffer?  (Answering \"No\" will DESTROY changes) ");
      return;
    }
    onExit();
  };

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    // Handle Exit Prompt Logic
    if (showExitPrompt) {
      e.preventDefault();
      const key = e.key.toLowerCase();
      if (key === 'y') {
        await handleSave();
        onExit();
      } else if (key === 'n') {
        onExit();
      } else if (key === 'c' && e.ctrlKey) {
        setShowExitPrompt(false);
        setMessage("Cancelled.");
      }
      return;
    }

    // Handle Main Editor Shortcuts
    if (e.ctrlKey) {
      const key = e.key.toLowerCase();
      switch (key) {
        case 'o': // Write Out
          e.preventDefault();
          await handleSave();
          break;
        case 'x': // Exit
          e.preventDefault();
          handleExit();
          break;
        // Add more shortcuts if needed
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setIsModified(true);
    if (message && !showExitPrompt) setMessage("");
  };

  return (
    <div 
      className="absolute inset-0 bg-[#1e1e1e] text-white font-mono flex flex-col z-50 overflow-hidden" 
      onKeyDown={handleKeyDown}
    >
      {/* Header */}
      <div className="bg-[#d4d4d4] text-black px-2 py-0.5 flex justify-between items-center text-sm shrink-0 font-bold">
        <span className="w-1/3">GNU nano 4.8</span>
        <span className="w-1/3 text-center truncate">{filename || "New Buffer"}</span>
        <span className="w-1/3 text-right">{isModified ? "Modified" : ""}</span>
      </div>

      {/* Editor Body */}
      <textarea
        ref={textareaRef}
        className="flex-1 bg-[#1e1e1e] text-[#d4d4d4] p-2 resize-none outline-none border-none font-mono text-sm leading-normal w-full"
        value={content}
        onChange={handleChange}
        spellCheck={false}
        autoFocus
      />

      {/* Message Bar */}
      <div className="bg-[#1e1e1e] text-white px-2 py-1 min-h-[24px] text-sm shrink-0 truncate font-bold">
        {message}
      </div>

      {/* Footer Menu */}
      {showExitPrompt ? (
         <div className="grid grid-cols-2 gap-x-4 gap-y-1 px-2 py-1 bg-[#1e1e1e] text-sm shrink-0 border-t border-white/10">
            <div><span className="bg-white text-black px-1 mr-1 font-bold"> Y </span> Yes</div>
            <div><span className="bg-white text-black px-1 mr-1 font-bold"> N </span> No</div>
            <div><span className="bg-white text-black px-1 mr-1 font-bold">^C</span> Cancel</div>
         </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 px-2 py-1 bg-[#1e1e1e] text-sm shrink-0 border-t border-white/10">
          <div><span className="bg-white text-black px-1 mr-1 font-bold">^G</span> Get Help</div>
          <div><span className="bg-white text-black px-1 mr-1 font-bold">^O</span> Write Out</div>
          <div><span className="bg-white text-black px-1 mr-1 font-bold">^W</span> Where Is</div>
          <div><span className="bg-white text-black px-1 mr-1 font-bold">^K</span> Cut Text</div>
          <div><span className="bg-white text-black px-1 mr-1 font-bold">^X</span> Exit</div>
          <div><span className="bg-white text-black px-1 mr-1 font-bold">^R</span> Read File</div>
          <div><span className="bg-white text-black px-1 mr-1 font-bold">^\</span> Replace</div>
          <div><span className="bg-white text-black px-1 mr-1 font-bold">^U</span> Uncut Text</div>
        </div>
      )}
    </div>
  );
}
