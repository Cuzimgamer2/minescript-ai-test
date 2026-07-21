import React, { useState, useRef } from "react";
import { FileUp, BookOpen, Search, Code, CheckCircle, Trash2, Info, ChevronRight, ChevronDown } from "lucide-react";
import { ReferenceFile, MinescriptFunction } from "../types";

interface FunctionExplorerProps {
  files: ReferenceFile[];
  activeFunctions: MinescriptFunction[];
  selectedFunction: MinescriptFunction | null;
  setSelectedFunction: (fn: MinescriptFunction | null) => void;
  onUploadFile: (name: string, content: string) => Promise<void>;
  onToggleFile: (id: string) => void;
  onDeleteFile: (id: string) => void;
  onInsertFunction: (fnName: string, params: string) => void;
  parseProgress?: number | null;
}

export default function FunctionExplorer({
  files,
  activeFunctions,
  selectedFunction,
  setSelectedFunction,
  onUploadFile,
  onToggleFile,
  onDeleteFile,
  onInsertFunction,
  parseProgress,
}: FunctionExplorerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isFunctionsCollapsed, setIsFunctionsCollapsed] = useState(false);

  // Filter functions by search query
  const filteredFunctions = activeFunctions.filter(
    (fn) =>
      fn.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fn.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group functions by their source file
  const groupedFunctions: { [key: string]: MinescriptFunction[] } = {};
  filteredFunctions.forEach((fn) => {
    const file = fn.sourceFile || "minescript.py";
    if (!groupedFunctions[file]) {
      groupedFunctions[file] = [];
    }
    groupedFunctions[file].push(fn);
  });

  const sortedGroupKeys = Object.keys(groupedFunctions).sort((a, b) => {
    if (a.includes("minescript.py")) return -1;
    if (b.includes("minescript.py")) return 1;
    return a.localeCompare(b);
  });

  // File Upload Handlers
  const handleFile = async (file: File) => {
    if (!file) return;
    if (!file.name.endsWith(".py") && !file.name.endsWith(".txt") && !file.name.endsWith(".md")) {
      setUploadError("Please upload a .py, .txt, or .md file");
      return;
    }
    setUploadError("");
    setIsUploading(true);

    try {
      const text = await file.text();
      await onUploadFile(file.name, text);
    } catch (err: any) {
      console.error(err);
      setUploadError("Failed to read file contents.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      await handleFile(file);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleFile(file);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="p-3 bg-[#1A1A1A] border-b border-[#2A2A2A] flex justify-between items-center shrink-0">
        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 italic">Library Index</span>
        <span className="px-2 py-0.5 rounded text-[10px] bg-green-900/30 text-green-400 border border-green-800/50 uppercase tracking-wider font-mono">Strict</span>
      </div>

      {/* Upload Zone */}
      <div className="p-4 border-b border-[#2A2A2A] bg-[#1A1A1A]/10">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? "border-green-500 bg-green-950/10"
              : "border-[#2A2A2A] hover:border-[#333] bg-[#0C0C0C] hover:bg-[#141414]"
          }`}
          id="upload-dropzone"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            accept=".py,.txt,.md"
            className="hidden"
          />
          <FileUp className="w-5 h-5 mx-auto mb-2 text-gray-500" />
          <p className="text-xs font-medium text-gray-300">
            {isUploading ? "Uploading & parsing..." : "Add library file (.py, .txt, .md)"}
          </p>
          <p className="text-[10px] text-gray-600 mt-1">Drag & drop or click to browse</p>
        </div>
        {uploadError && <p className="text-xs text-red-400 mt-2 text-center font-mono">{uploadError}</p>}

        {/* Real, Working Progressive Progress Bar */}
        {parseProgress !== null && parseProgress !== undefined && (
          <div className="mt-3 bg-[#0C0C0C] border border-green-500/20 rounded-lg p-2.5 animate-pulse">
            <div className="flex justify-between items-center text-[10px] font-mono text-gray-400 mb-1.5">
              <span className="text-green-500 font-semibold uppercase tracking-wider">Parsing functions...</span>
              <span className="text-green-400">{parseProgress}%</span>
            </div>
            <div className="w-full bg-[#1F1F1F] rounded-full h-1.5 overflow-hidden border border-[#2A2A2A]/50">
              <div
                className="bg-green-500 h-1.5 rounded-full transition-all duration-300 ease-out shadow-[0_0_8px_rgba(34,197,94,0.5)]"
                style={{ width: `${parseProgress}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Active References List */}
      <div className="p-4 border-b border-[#2A2A2A] bg-[#1A1A1A]/5 max-h-36 overflow-y-auto custom-scrollbar">
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2 px-1">
          Loaded Files ({files.length})
        </span>
        <div className="space-y-1.5">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-2 rounded bg-[#0C0C0C] border border-[#2A2A2A] hover:border-[#333] transition-colors"
            >
              <div className="flex items-center gap-2 overflow-hidden mr-2">
                <input
                  type="checkbox"
                  checked={file.isActive}
                  onChange={() => onToggleFile(file.id)}
                  className="w-3.5 h-3.5 rounded border-[#2A2A2A] text-green-500 focus:ring-green-500/20 bg-[#0C0C0C] cursor-pointer"
                  title="Toggle active state for AI grounding"
                />
                <span className="text-xs font-mono text-gray-200 truncate" title={file.name}>
                  {file.name}
                </span>
                <span className="text-[10px] text-gray-500 shrink-0">
                  ({file.functions?.length || 0} fn)
                </span>
              </div>
              {file.id !== "minescript-default" && (
                <button
                  onClick={() => onDeleteFile(file.id)}
                  className="text-gray-500 hover:text-red-400 p-1 rounded hover:bg-[#1A1A1A] transition-colors"
                  title="Delete reference file"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-3 border-b border-[#2A2A2A] bg-[#1A1A1A]/20 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search API functions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-[#0C0C0C] text-xs border border-[#2A2A2A] rounded-lg focus:outline-none focus:border-green-600 text-gray-200 transition-colors"
          />
        </div>
      </div>

      {/* Functions List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
        <button
          onClick={() => setIsFunctionsCollapsed(!isFunctionsCollapsed)}
          className="w-full flex items-center justify-between text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1 px-1 hover:text-gray-300 transition-colors"
          title="Toggle functions list visibility"
        >
          <span>Available Functions ({filteredFunctions.length})</span>
          {isFunctionsCollapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>

        {!isFunctionsCollapsed && (
          <>
            {filteredFunctions.length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-xs font-mono">No functions found</div>
            ) : (
              sortedGroupKeys.map((sourceFile) => {
                const fns = groupedFunctions[sourceFile] || [];
                if (fns.length === 0) return null;

                return (
                  <div key={sourceFile} className="space-y-1">
                    {/* Source File Header */}
                    <div className="text-[10px] font-bold text-green-500/80 bg-green-950/5 px-2 py-1.5 rounded-md border border-green-950/20 mb-2 mt-3 font-mono flex items-center justify-between">
                      <div className="flex items-center gap-1.5 truncate">
                        <BookOpen className="w-3.5 h-3.5 text-green-600 shrink-0" />
                        <span className="truncate">{sourceFile}</span>
                      </div>
                      <span className="text-[9px] text-gray-500 font-normal bg-[#0C0C0C] px-1.5 py-0.5 rounded border border-[#2A2A2A] shrink-0 font-sans">
                        {fns.length} fn
                      </span>
                    </div>

                    {/* Functions List under this File */}
                    <div className="space-y-1 pl-1">
                      {fns.map((fn, idx) => {
                        const isSelected = selectedFunction?.name === fn.name && selectedFunction?.sourceFile === fn.sourceFile;
                        return (
                          <button
                            key={`${fn.name}-${idx}`}
                            onClick={() => setSelectedFunction(fn)}
                            className={`w-full text-left p-2 rounded-lg transition-all duration-150 border flex items-center justify-between ${
                              isSelected
                                ? "bg-green-950/20 border-green-500/30 text-green-400"
                                : "bg-transparent border-transparent hover:bg-[#1A1A1A] hover:border-[#2A2A2A] text-gray-300"
                            }`}
                          >
                            <div className="overflow-hidden mr-2">
                              <div className="font-mono text-xs font-semibold truncate flex items-center gap-1.5">
                                <Code className="w-3 h-3 text-gray-500 shrink-0" />
                                <span>{fn.name}</span>
                                <span className="text-[10px] text-gray-500 font-normal truncate">
                                  ({fn.params || ""})
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-400 truncate mt-0.5 pl-4 font-sans">
                                {fn.description}
                              </p>
                            </div>
                            <ChevronRight className={`w-3.5 h-3.5 transition-transform shrink-0 ${
                              isSelected ? "text-green-500 rotate-90" : "text-gray-600"
                            }`} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}
      </div>

      {/* Function Detail Modal/Panel (Bottom Expandable) */}
      {selectedFunction && (
        <div className="border-t border-[#2A2A2A] bg-[#0C0C0C] p-4 shrink-0 max-h-[50%] overflow-y-auto custom-scrollbar">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <span className="text-[9px] font-mono bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 px-1.5 py-0.5 rounded uppercase">
                {selectedFunction.sourceFile}
              </span>
              <h3 className="font-mono text-sm font-bold text-green-400 mt-1">
                {selectedFunction.name}({selectedFunction.params})
              </h3>
            </div>
            <button
              onClick={() => setSelectedFunction(null)}
              className="text-[10px] text-gray-500 hover:text-gray-300 font-mono uppercase tracking-wider"
            >
              [Close]
            </button>
          </div>

          <p className="text-xs text-gray-300 leading-relaxed mb-3">
            {selectedFunction.description}
          </p>

          {selectedFunction.docstring && (
            <div className="bg-[#141414] border border-[#2A2A2A] p-2 rounded-lg mb-3">
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-1">
                Documentation / Docstring
              </span>
              <pre className="text-[11px] text-gray-300 font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto">
                {selectedFunction.docstring}
              </pre>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => onInsertFunction(selectedFunction.name, selectedFunction.params)}
              className="flex-1 py-1.5 bg-[#141414] hover:bg-[#1A1A1A] text-gray-200 border border-[#2A2A2A] hover:border-[#333] text-xs font-semibold rounded transition-colors flex items-center justify-center gap-1.5"
            >
              <Code className="w-3.5 h-3.5 text-green-500" />
              Use in Prompt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
