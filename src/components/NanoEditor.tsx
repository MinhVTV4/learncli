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

  const handleSaveAction = async () => {
    await handleSave();
  };

  const handleExitAction = () => {
    handleExit();
  };

  const handleCancelAction = () => {
    setShowExitPrompt(false);
    setMessage("Cancelled.");
  };

  const handleConfirmExit = (save: boolean) => {
    if (save) {
      handleSaveAction().then(onExit);
    } else {
      onExit();
    }
  };

  // ... (keep handleKeyDown but use these new functions)

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (showExitPrompt) {
      e.preventDefault();
      const key = e.key.toLowerCase();
      if (key === 'y') handleConfirmExit(true);
      else if (key === 'n') handleConfirmExit(false);
      else if (key === 'c' && e.ctrlKey) handleCancelAction();
      return;
    }

    if (e.ctrlKey) {
      const key = e.key.toLowerCase();
      switch (key) {
        case 'o': // Write Out
          e.preventDefault();
          await handleSaveAction();
          break;
        case 'x': // Exit
          e.preventDefault();
          handleExitAction();
          break;
      }
    }
  };

  // ...

  return (
    <div className="absolute inset-0 bg-[#1e1e1e] text-white font-mono flex flex-col z-50 overflow-hidden">
      {/* Header */}
      <div className="bg-[#d4d4d4] text-black px-2 py-0.5 flex justify-between items-center text-sm shrink-0 font-bold">
        <span className="w-1/3 truncate">GNU nano 4.8</span>
        <span className="w-1/3 text-center truncate">{filename || "New Buffer"}</span>
        <span className="w-1/3 text-right truncate">{isModified ? "Modified" : ""}</span>
      </div>

      {/* Editor Body */}
      <textarea
        ref={textareaRef}
        className="flex-1 bg-[#1e1e1e] text-[#d4d4d4] p-2 resize-none outline-none border-none font-mono text-sm leading-normal w-full"
        value={content}
        onChange={(e) => {
            setContent(e.target.value);
            setIsModified(true);
            if (message && !showExitPrompt) setMessage("");
        }}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        autoFocus
      />

      {/* Message Bar */}
      <div className="bg-[#1e1e1e] text-white px-2 py-1 min-h-[24px] text-sm shrink-0 truncate font-bold border-t border-white/5">
        {message}
      </div>

      {/* Footer Menu - Interactive */}
      {showExitPrompt ? (
         <div className="grid grid-cols-2 gap-2 px-2 py-2 bg-[#1e1e1e] text-sm shrink-0 border-t border-white/10">
            <button 
              onClick={() => handleConfirmExit(true)}
              className="flex items-center justify-center bg-[#333] hover:bg-[#444] p-2 rounded active:bg-[#555]"
            >
              <span className="bg-white text-black px-1 mr-2 font-bold rounded-sm">Y</span> Yes
            </button>
            <button 
              onClick={() => handleConfirmExit(false)}
              className="flex items-center justify-center bg-[#333] hover:bg-[#444] p-2 rounded active:bg-[#555]"
            >
              <span className="bg-white text-black px-1 mr-2 font-bold rounded-sm">N</span> No
            </button>
            <button 
              onClick={handleCancelAction}
              className="col-span-2 flex items-center justify-center bg-[#333] hover:bg-[#444] p-2 rounded active:bg-[#555]"
            >
              <span className="bg-white text-black px-1 mr-2 font-bold rounded-sm">^C</span> Cancel
            </button>
         </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 px-2 py-2 bg-[#1e1e1e] text-xs shrink-0 border-t border-white/10">
          <button className="flex items-center bg-[#252526] hover:bg-[#333] p-1.5 rounded active:bg-[#444] transition-colors">
            <span className="bg-white text-black px-1 mr-1.5 font-bold rounded-sm min-w-[20px] text-center">^G</span> Get Help
          </button>
          <button 
            onClick={handleSaveAction}
            className="flex items-center bg-[#252526] hover:bg-[#333] p-1.5 rounded active:bg-[#444] transition-colors"
          >
            <span className="bg-white text-black px-1 mr-1.5 font-bold rounded-sm min-w-[20px] text-center">^O</span> Write Out
          </button>
          <button className="flex items-center bg-[#252526] hover:bg-[#333] p-1.5 rounded active:bg-[#444] transition-colors opacity-50 cursor-not-allowed">
            <span className="bg-white text-black px-1 mr-1.5 font-bold rounded-sm min-w-[20px] text-center">^W</span> Where Is
          </button>
          <button className="flex items-center bg-[#252526] hover:bg-[#333] p-1.5 rounded active:bg-[#444] transition-colors opacity-50 cursor-not-allowed">
            <span className="bg-white text-black px-1 mr-1.5 font-bold rounded-sm min-w-[20px] text-center">^K</span> Cut Text
          </button>
          <button 
            onClick={handleExitAction}
            className="flex items-center bg-[#252526] hover:bg-[#333] p-1.5 rounded active:bg-[#444] transition-colors"
          >
            <span className="bg-white text-black px-1 mr-1.5 font-bold rounded-sm min-w-[20px] text-center">^X</span> Exit
          </button>
          <button className="flex items-center bg-[#252526] hover:bg-[#333] p-1.5 rounded active:bg-[#444] transition-colors opacity-50 cursor-not-allowed">
            <span className="bg-white text-black px-1 mr-1.5 font-bold rounded-sm min-w-[20px] text-center">^R</span> Read File
          </button>
          <button className="flex items-center bg-[#252526] hover:bg-[#333] p-1.5 rounded active:bg-[#444] transition-colors opacity-50 cursor-not-allowed">
            <span className="bg-white text-black px-1 mr-1.5 font-bold rounded-sm min-w-[20px] text-center">^\</span> Replace
          </button>
          <button className="flex items-center bg-[#252526] hover:bg-[#333] p-1.5 rounded active:bg-[#444] transition-colors opacity-50 cursor-not-allowed">
            <span className="bg-white text-black px-1 mr-1.5 font-bold rounded-sm min-w-[20px] text-center">^U</span> Uncut Text
          </button>
        </div>
      )}
    </div>
  );
}
