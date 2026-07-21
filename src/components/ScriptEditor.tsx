import React, { useState, useEffect } from "react";
import { Download, Copy, Check, Save, FileCode, Trash2, Calendar, Lightbulb, Play } from "lucide-react";
import { ScriptItem } from "../types";

interface ScriptEditorProps {
  currentScript: string;
  savedScripts: ScriptItem[];
  onSaveScript: (title: string, code: string, prompt: string) => void;
  onDeleteScript: (id: string) => void;
  onLoadScript: (script: ScriptItem) => void;
}

// Simple robust token-based Python syntax highlighter
function highlightPython(code: string) {
  if (!code) return <span className="text-gray-500">No script generated yet. Enter a request and click Send.</span>;

  const lines = code.split("\n");
  const highlightedLines = lines.map((line, lineIdx) => {
    // Regex matching comments, strings, numbers, words/identifiers, whitespaces, and other chars
    const tokenRegex = /(#.*)|("[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*')|(\b\d+(?:\.\d+)?\b)|([a-zA-Z_][a-zA-Z0-9_]*)|(\s+)|(.)/g;
    
    const elements: React.ReactNode[] = [];
    let match;
    let keyIdx = 0;
    
    tokenRegex.lastIndex = 0;
    
    const keywords = new Set([
      "def", "import", "from", "as", "return", "if", "elif", "else", "for", "while",
      "in", "and", "or", "not", "is", "try", "except", "pass", "class", "with", "break", "continue"
    ]);
    
    const builtins = new Set([
      "None", "True", "False", "print", "len", "range", "list", "dict", "str", "int", "float", "abs"
    ]);

    while ((match = tokenRegex.exec(line)) !== null) {
      const [_, comment, string, number, word, whitespace, char] = match;
      const key = `${lineIdx}-${keyIdx++}`;
      
      if (comment !== undefined) {
        elements.push(<span key={key} className="text-green-600/70 italic">{comment}</span>);
      } else if (string !== undefined) {
        elements.push(<span key={key} className="text-orange-400">{string}</span>);
      } else if (number !== undefined) {
        elements.push(<span key={key} className="text-amber-500">{number}</span>);
      } else if (word !== undefined) {
        if (word === "minescript") {
          elements.push(<span key={key} className="text-green-400 font-bold">{word}</span>);
        } else if (keywords.has(word)) {
          elements.push(<span key={key} className="text-purple-400 font-bold">{word}</span>);
        } else if (builtins.has(word)) {
          elements.push(<span key={key} className="text-blue-400 font-semibold">{word}</span>);
        } else {
          elements.push(<span key={key}>{word}</span>);
        }
      } else if (whitespace !== undefined) {
        elements.push(<span key={key}>{whitespace}</span>);
      } else if (char !== undefined) {
        elements.push(<span key={key}>{char}</span>);
      }
    }

    return (
      <div key={lineIdx} className="table-row group hover:bg-[#1A1A1A]/40">
        <span className="table-cell select-none text-right pr-4 text-gray-600 text-[10px] font-mono w-8">
          {lineIdx + 1}
        </span>
        <span className="table-cell whitespace-pre font-mono text-xs leading-relaxed pl-1">
          {elements.length > 0 ? elements : " "}
        </span>
      </div>
    );
  });

  return <div className="table w-full border-collapse">{highlightedLines}</div>;
}

export default function ScriptEditor({
  currentScript,
  savedScripts,
  onSaveScript,
  onDeleteScript,
  onLoadScript,
}: ScriptEditorProps) {
  const [scriptTitle, setScriptTitle] = useState("");
  const [copied, setCopied] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<"editor" | "library">("editor");

  const handleCopy = () => {
    if (!currentScript) return;
    navigator.clipboard.writeText(currentScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!currentScript) return;
    const blob = new Blob([currentScript], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${scriptTitle.endsWith(".py") ? scriptTitle : scriptTitle + ".py"}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSave = () => {
    if (!currentScript) return;
    onSaveScript(scriptTitle, currentScript, scriptPrompt || "Custom edited script");
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden shadow-xl">
      {/* Tabs */}
      <div className="flex border-b border-[#2A2A2A] bg-[#1A1A1A]">
        <button
          onClick={() => setActiveTab("editor")}
          className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
            activeTab === "editor"
              ? "border-green-500 text-green-400 bg-green-500/5 font-bold"
              : "border-transparent text-gray-400 hover:text-gray-250"
          }`}
        >
          <FileCode className="w-4 h-4" />
          Script Editor
        </button>
        <button
          onClick={() => setActiveTab("library")}
          className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
            activeTab === "library"
              ? "border-green-500 text-green-400 bg-green-500/5 font-bold"
              : "border-transparent text-gray-400 hover:text-gray-250"
          }`}
        >
          <Save className="w-4 h-4" />
          Saved Scripts ({savedScripts.length})
        </button>
      </div>

      {activeTab === "editor" ? (
        // --- EDITOR VIEW ---
        <div className="flex-1 flex flex-col min-h-0">
          {/* Filename & Controls */}
          <div className="p-3 border-b border-[#2A2A2A] bg-[#1A1A1A]/30 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <span className="text-xs text-gray-500 font-mono">File:</span>
              <div className="flex items-center bg-[#0C0C0C] border border-[#2A2A2A] rounded px-2 py-1 flex-1">
                <input
                  type="text"
                  value={scriptTitle}
                  onChange={(e) => setScriptTitle(e.target.value.replace(/[^a-zA-Z0-9_.-]/g, ""))}
                  placeholder="filename"
                  className="bg-transparent text-xs text-green-500 font-mono focus:outline-none w-full"
                  title="Rename your Python file"
                />
                <span className="text-gray-500 text-xs font-mono">.py</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleCopy}
                disabled={!currentScript}
                className="p-1.5 bg-[#0C0C0C] border border-[#2A2A2A] rounded hover:border-[#333] hover:bg-[#141414] text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                title="Copy to clipboard"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                onClick={handleDownload}
                disabled={!currentScript}
                className="p-1.5 bg-[#0C0C0C] border border-[#2A2A2A] rounded hover:border-[#333] hover:bg-[#141414] text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                title="Download Python Script"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={handleSave}
                disabled={!currentScript}
                className="bg-green-600 hover:bg-green-700 text-black font-bold border-none rounded p-1.5 px-3 transition-all flex items-center gap-1 text-xs"
                title="Save script to Library"
              >
                <Save className="w-4 h-4" />
                {saveSuccess ? "Saved!" : "Save"}
              </button>
            </div>
          </div>

          {/* Code Area */}
          <div className="flex-1 bg-[#050505] p-4 font-mono text-xs overflow-auto custom-scrollbar select-text">
            {highlightPython(currentScript)}
          </div>
        </div>
      ) : (
        // --- LIBRARY VIEW ---
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
          <div className="flex items-center gap-2 p-3 bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg">
            <Lightbulb className="w-4 h-4 text-green-500 shrink-0" />
            <p className="text-xs text-gray-400 leading-relaxed">
              Scripts are saved locally in your browser's Cache. Click any script card to load it back into the Editor.
            </p>
          </div>

          {savedScripts.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-xs font-mono">
              Your Script Library is empty. Write and save some scripts in the editor!
            </div>
          ) : (
            <div className="grid gap-2">
              {savedScripts.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    onLoadScript(item);
                    setActiveTab("editor");
                  }}
                  className="p-3 rounded bg-[#0C0C0C] border border-[#2A2A2A] hover:border-green-500/50 hover:bg-[#141414] cursor-pointer transition-all flex justify-between items-start group"
                >
                  <div className="space-y-1 overflow-hidden mr-2">
                    <h4 className="font-mono text-xs font-bold text-green-500 flex items-center gap-1.5 truncate">
                      <FileCode className="w-3.5 h-3.5 text-gray-500" />
                      {item.title}.py
                    </h4>
                    <p className="text-[11px] text-gray-400 truncate leading-normal" title={item.prompt}>
                      Prompt: "{item.prompt}"
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono pt-1">
                      <Calendar className="w-3 h-3" />
                      <span>{item.createdAt}</span>
                      <span>•</span>
                      <span>{item.code.split("\n").length} lines</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteScript(item.id);
                    }}
                    className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-[#1A1A1A] rounded transition-all"
                    title="Delete script"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
