import React, { useState, useEffect, useRef } from "react";
import {
  Terminal,
  Cpu,
  RefreshCw,
  Send,
  Sparkles,
  HelpCircle,
  Code2,
  FileCode,
  LayoutGrid,
  Settings,
  AlertTriangle,
  Bookmark,
  CheckCircle2,
  Lightbulb,
} from "lucide-react";
import { ReferenceFile, MinescriptFunction, ScriptItem, ChatMessage } from "./types";
import FunctionExplorer from "./components/FunctionExplorer";
import ScriptEditor from "./components/ScriptEditor";

// Loading phrases to entertain the user while generating code
const MINECRAFT_TIPS = [
  "Baue Werkzeuge, um schnellere Skripte zu schmieden...",
  "Bereite Redstone-Kabel vor...",
  "Grabe nach Diamanten in der Wissensdatenbank...",
  "Befehle an den Command Block senden...",
  "Beseitige Creeper-Halluzinationen...",
  "Erzeuge flüssige Block-Logiken...",
  "Überprüfe Python-Syntax auf Minecraft-Konformität...",
  "Verbinde Schaltungen mit Minescript...",
  "Lese das Buch des Zaubertischs..."
];

export default function App() {
  // State for Reference Library & Functions
  const [files, setFiles] = useState<ReferenceFile[]>(() => {
    if (typeof window === "undefined") return [];
    const localFiles = localStorage.getItem("minescript_custom_files");
    const initial: ReferenceFile[] = [];
    if (localFiles) {
      try {
        initial.push(...JSON.parse(localFiles));
      } catch (e) {
        console.error("Failed to parse custom reference files on init", e);
      }
    }
    return initial;
  });
  const [activeFunctions, setActiveFunctions] = useState<MinescriptFunction[]>(() => {
    if (typeof window === "undefined") return [];
    const localFiles = localStorage.getItem("minescript_custom_files");
    const initial: ReferenceFile[] = [];
    if (localFiles) {
      try {
        initial.push(...JSON.parse(localFiles));
      } catch (e) {}
    }
    const list: MinescriptFunction[] = [];
    initial.forEach((file) => {
      if (file.isActive && file.functions) {
        list.push(...file.functions);
      }
    });
    return list;
  });
  const [selectedFunction, setSelectedFunction] = useState<MinescriptFunction | null>(null);

  // State for Code Generation & Editor
  const [currentScript, setCurrentScript] = useState<string>(`import minescript

# Begrüßungsskript - Hol deine Position und sende einen Echo-Chat
def main():
    # Hole aktuelle Koordinaten des Spielers
    x, y, z = minescript.player_position()
    
    # Sende eine Nachricht in den lokalen Chat
    minescript.echo("§aMinescript AI Assistant erfolgreich geladen!§r")
    minescript.echo(f"Deine Position: X={x:.1f}, Y={y:.1f}, Z={z:.1f}")

if __name__ == "__main__":
    main()
`);
  const [scriptPrompt, setScriptPrompt] = useState<string>("Starter Begrüßungsskript");
  const [savedScripts, setSavedScripts] = useState<ScriptItem[]>([]);

  // Console Chat State
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "model",
      text: "Hallo! Ich bin dein spezialisierter **Minescript AI Coding Assistant**.\n\nIch bin strictly darauf trainiert, **nur** Funktionen aus deinen geladenen Referenzdateien zu nutzen, um Halluzinationen zu vermeiden. Drücke links auf eine Funktion, um ihre Details zu sehen!",
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
  ]);
  const [promptInput, setPromptInput] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [loadingTip, setLoadingTip] = useState<string>(MINECRAFT_TIPS[0]);

  // Model & Mode Settings
  const [selectedModel, setSelectedModel] = useState<string>("gemini-3.5-flash");
  const [strictMode, setStrictMode] = useState<boolean>(true);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // UI status message
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const [parseProgress, setParseProgress] = useState<number | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load Saved Scripts & Custom Reference Files from LocalStorage
  useEffect(() => {
    // 1. Saved Scripts
    const localScripts = localStorage.getItem("minescript_saved_scripts");
    if (localScripts) {
      try {
        setSavedScripts(JSON.parse(localScripts));
      } catch (e) {
        console.error("Failed to parse saved scripts", e);
      }
    }
  }, []);

  // Sync active functions list whenever files list or their active state changes
  useEffect(() => {
    const list: MinescriptFunction[] = [];
    files.forEach((file) => {
      if (file.isActive && file.functions) {
        list.push(...file.functions);
      }
    });
    setActiveFunctions(list);
  }, [files]);

  // Scroll Chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // Cycle loading phrases during generation
  useEffect(() => {
    let interval: any;
    if (isGenerating) {
      let idx = 0;
      interval = setInterval(() => {
        idx = (idx + 1) % MINECRAFT_TIPS.length;
        setLoadingTip(MINECRAFT_TIPS[idx]);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  // Toast / Status Message Helper
  const showStatus = (text: string, type: "success" | "error" | "info") => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Chunks Python code into segments of maxLines (e.g. 150 lines), breaking only on module-level declarations
  const chunkPythonCode = (code: string, maxLines = 150): string[] => {
    const lines = code.split("\n");
    const chunks: string[] = [];
    let currentChunk: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      currentChunk.push(line);

      if (currentChunk.length >= maxLines) {
        const nextLine = lines[i + 1];
        // Break only when the next line is not indented (a top-level definition or empty)
        if (
          nextLine === undefined ||
          (!nextLine.startsWith(" ") && !nextLine.startsWith("\t"))
        ) {
          chunks.push(currentChunk.join("\n"));
          currentChunk = [];
        }
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join("\n"));
    }

    return chunks;
  };

  // Upload Custom File Handler (Progressive chunked parsing)
  const handleUploadFile = async (name: string, content: string) => {
    try {
      setParseProgress(0);
      const chunks = chunkPythonCode(content, 150);
      const allFunctions: any[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const currentProgress = Math.round((i / chunks.length) * 100);
        setParseProgress(currentProgress);

        const response = await fetch("/api/parse-functions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileContent: chunks[i], fileName: `${name} (Teil ${i + 1})` })
        });

        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }

        if (data.functions) {
          allFunctions.push(...data.functions);
        }
      }

      setParseProgress(100);

      // De-duplicate functions just in case
      const seen = new Set<string>();
      const uniqueFunctions = allFunctions.filter((f: any) => {
        const key = `${f.name}-${f.params}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const newFile: ReferenceFile = {
        id: `custom-${Date.now()}`,
        name: name,
        content: content,
        size: content.length,
        isActive: true,
        functions: uniqueFunctions.map((f: any) => ({
          ...f,
          sourceFile: name
        }))
      };

      const updatedFiles = [...files, newFile];
      setFiles(updatedFiles);

      // Save custom files to localStorage (filter out default reference)
      const customOnly = updatedFiles.filter((f) => f.id !== "minescript-default");
      localStorage.setItem("minescript_custom_files", JSON.stringify(customOnly));

      showStatus(`Datei "${name}" erfolgreich hochgeladen und ${newFile.functions?.length || 0} Funktionen analysiert!`, "success");
    } catch (err: any) {
      console.error(err);
      showStatus(err.message || "Fehler beim Analysieren der Datei.", "error");
    } finally {
      setTimeout(() => {
        setParseProgress(null);
      }, 1000);
    }
  };

  // Toggle active status for files
  const handleToggleFile = (id: string) => {
    const updated = files.map((f) => (f.id === id ? { ...f, isActive: !f.isActive } : f));
    setFiles(updated);

    // Sync back custom files to localStorage
    const customOnly = updated.filter((f) => f.id !== "minescript-default");
    localStorage.setItem("minescript_custom_files", JSON.stringify(customOnly));

    showStatus("Dateistatus aktualisiert. Grounding-Kontext neu geladen.", "info");
  };

  // Delete uploaded custom files or default reference
  const handleDeleteFile = (id: string) => {
    const updated = files.filter((f) => f.id !== id);
    setFiles(updated);

    if (id === "minescript-default") {
      localStorage.setItem("minescript_default_deleted", "true");
    } else {
      const customOnly = updated.filter((f) => f.id !== "minescript-default");
      localStorage.setItem("minescript_custom_files", JSON.stringify(customOnly));
    }

    showStatus("Referenzdatei gelöscht.", "info");
  };

  // Helper to append function names to prompt input
  const handleInsertFunction = (fnName: string, params: string) => {
    setPromptInput((prev) => {
      const spacing = prev ? (prev.endsWith(" ") ? "" : " ") : "";
      return `${prev}${spacing}minescript.${fnName}(${params ? "..." : ""})`;
    });
    showStatus(`"minescript.${fnName}" zum Prompt hinzugefügt!`, "success");
  };

  // Save Script to library
  const handleSaveScript = (title: string, code: string, prompt: string) => {
    const newScript: ScriptItem = {
      id: `script-${Date.now()}`,
      title,
      code,
      prompt,
      createdAt: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    const updated = [newScript, ...savedScripts];
    setSavedScripts(updated);
    localStorage.setItem("minescript_saved_scripts", JSON.stringify(updated));
    showStatus(`Skript "${title}.py" in Bibliothek gespeichert!`, "success");
  };

  // Delete saved script
  const handleDeleteScript = (id: string) => {
    const updated = savedScripts.filter((s) => s.id !== id);
    setSavedScripts(updated);
    localStorage.setItem("minescript_saved_scripts", JSON.stringify(updated));
    showStatus("Skript aus Bibliothek entfernt.", "info");
  };

  // Load Script back to editor
  const handleLoadScript = (script: ScriptItem) => {
    setCurrentScript(script.code);
    setScriptPrompt(script.prompt);
    showStatus(`"${script.title}.py" in den Editor geladen!`, "success");
  };

  // Quick Start template buttons
  const applyTemplate = (prompt: string) => {
    setPromptInput(prompt);
  };

  // Generate Minescript code via server API
  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!promptInput.trim() || isGenerating) return;

    const userPrompt = promptInput.trim();
    setPromptInput("");
    setIsGenerating(true);

    // Append user message to chat
    const userMsgId = `user-${Date.now()}`;
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setChatHistory((prev) => [
      ...prev,
      { id: userMsgId, role: "user", text: userPrompt, createdAt: timestamp }
    ]);

    try {
      // Collect all active files content to send as grounding context
      const activeFiles = files
        .filter((f) => f.isActive)
        .map((f) => ({ name: f.name, content: f.content }));

      // Map chat history to API representation (excluding system or welcome message)
      const mappedHistory = chatHistory
        .filter((h) => h.id !== "welcome")
        .map((h) => ({ role: h.role, text: h.text }));

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userPrompt,
          files: activeFiles,
          history: mappedHistory,
          model: selectedModel
        })
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      const replyText = data.text || "Entschuldigung, ich konnte keine Antwort generieren.";

      // Extract python code block if present
      const codeRegex = /```python\n([\s\S]*?)\n```/;
      const match = replyText.match(codeRegex);

      if (match && match[1]) {
        setCurrentScript(match[1]);
        setScriptPrompt(userPrompt);
        showStatus("Code erfolgreich im Editor aktualisiert!", "success");
      }

      // Append assistant reply to chat
      setChatHistory((prev) => [
        ...prev,
        { id: `model-${Date.now()}`, role: "model", text: replyText, createdAt: timestamp }
      ]);
    } catch (err: any) {
      console.error(err);
      setChatHistory((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "model",
          text: `❌ **Fehler beim Generieren:** ${err.message || "Der Server konnte nicht erreicht werden."}\n\nBitte stelle sicher, dass du deinen **GEMINI_API_KEY** im Settings/Secrets Panel eingetragen hast.`,
          createdAt: timestamp
        }
      ]);
      showStatus("Fehler bei der Code-Generierung.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0C0C0C] text-[#E0E0E0] font-sans flex flex-col selection:bg-green-500/30 selection:text-green-300">
      {/* Top Banner / Navigation */}
      <header className="h-14 border-b border-[#2A2A2A] bg-[#141414] px-6 flex items-center justify-between sticky top-0 z-50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center">
            <div className="w-4 h-4 bg-[#141414] rounded-sm"></div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm md:text-base font-bold tracking-tight text-white uppercase font-display">
                MINESCRIPT <span className="text-green-500 text-[10px] md:text-xs font-mono ml-1 uppercase">v1.2.0-CO-PILOT</span>
              </h1>
            </div>
            <p className="text-[10px] text-gray-400">Minecraft Python API Specialist</p>
          </div>
        </div>

        {/* Global Stats and Settings */}
        <div className="flex items-center gap-4">
          {/* Active library summary badge */}
          <div className="hidden sm:flex items-center gap-2 bg-[#1A1A1A] border border-[#2A2A2A] px-3 py-1.5 rounded-lg text-xs font-mono">
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]"></div>
            <span className="text-gray-400 uppercase tracking-widest text-[9px]">Context:</span>
            <span className="text-white">{files.filter((f) => f.isActive).length} Files ({activeFunctions.length} fns)</span>
          </div>

          {/* Model Selector and Settings Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-gray-400 hover:text-white transition-colors"
              title="Einstellungen & Modell wechseln"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Settings Panel (collapsible) */}
      {showSettings && (
        <div className="bg-[#141414] border-b border-[#2A2A2A] p-4 shrink-0 transition-all">
          <div className="max-w-7xl mx-auto grid sm:grid-cols-2 gap-6">
            {/* Model Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-300 block">KI-Modell auswählen</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <button
                  onClick={() => setSelectedModel("gemini-3.5-flash")}
                  className={`p-2 rounded-lg text-left border text-xs transition-all ${
                    selectedModel === "gemini-3.5-flash"
                      ? "bg-green-950/30 border-green-500/50 text-green-400"
                      : "bg-[#0C0C0C] border-[#2A2A2A] text-gray-400 hover:border-[#333]"
                  }`}
                >
                  <div className="font-semibold">Gemini 3.5 Flash</div>
                  <div className="text-[10px] text-gray-500">Schnell & riesiges Kontextfenster</div>
                </button>
                <button
                  onClick={() => setSelectedModel("gemini-3.1-flash-lite")}
                  className={`p-2 rounded-lg text-left border text-xs transition-all ${
                    selectedModel === "gemini-3.1-flash-lite"
                      ? "bg-green-950/30 border-green-500/50 text-green-400"
                      : "bg-[#0C0C0C] border-[#2A2A2A] text-gray-400 hover:border-[#333]"
                  }`}
                >
                  <div className="font-semibold">Gemini 3.1 Lite</div>
                  <div className="text-[10px] text-gray-500">Extrem schnell & hochverfügbar</div>
                </button>
                <button
                  onClick={() => setSelectedModel("gemini-3.1-pro-preview")}
                  className={`p-2 rounded-lg text-left border text-xs transition-all ${
                    selectedModel === "gemini-3.1-pro-preview"
                      ? "bg-green-950/30 border-green-500/50 text-green-400"
                      : "bg-[#0C0C0C] border-[#2A2A2A] text-gray-400 hover:border-[#333]"
                  }`}
                >
                  <div className="font-semibold">Gemini 3.1 Pro</div>
                  <div className="text-[10px] text-gray-500">Beste Codequalität (Bezahlt)</div>
                </button>
              </div>
            </div>

            {/* Anti-Hallucination strict toggle */}
            <div className="space-y-2 flex flex-col justify-center">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="strict-mode"
                  checked={strictMode}
                  onChange={(e) => setStrictMode(e.target.checked)}
                  className="w-4 h-4 rounded border-[#2A2A2A] text-green-500 focus:ring-green-500/20 bg-[#0C0C0C] cursor-pointer"
                />
                <div>
                  <label htmlFor="strict-mode" className="text-xs font-semibold text-gray-200 cursor-pointer flex items-center gap-1.5">
                    Strikter Referenzmodus (Anti-Halluzination)
                  </label>
                  <p className="text-[10px] text-gray-500">
                    Kombiniert hochgeladene Dateien im System-Instruction-Block, um nicht-existente Funktionen vollständig zu verbieten.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Toasts */}
      {statusMessage && (
        <div className="fixed bottom-4 right-4 z-50 animate-bounce">
          <div className={`px-4 py-2.5 rounded-lg shadow-lg border text-xs font-mono flex items-center gap-2 ${
            statusMessage.type === "success"
              ? "bg-[#141414] border-green-500/40 text-green-400"
              : statusMessage.type === "error"
              ? "bg-[#141414] border-red-500/40 text-red-400"
              : "bg-[#141414] border-[#2A2A2A] text-gray-300"
          }`}>
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span>{statusMessage.text}</span>
          </div>
        </div>
      )}

      {/* Main Workspace Layout (Three panels) */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden min-h-0">
        {/* PANEL 1: Reference Library & Function Explorer (Left column - lg:col-span-3) */}
        <div className="lg:col-span-3 h-[450px] lg:h-full min-h-0 flex flex-col">
          <FunctionExplorer
            files={files}
            activeFunctions={activeFunctions}
            selectedFunction={selectedFunction}
            setSelectedFunction={setSelectedFunction}
            onUploadFile={handleUploadFile}
            onToggleFile={handleToggleFile}
            onDeleteFile={handleDeleteFile}
            onInsertFunction={handleInsertFunction}
            parseProgress={parseProgress}
          />
        </div>

        {/* PANEL 2: AI Code Generator & Console Chat (Middle column - lg:col-span-5) */}
        <div className="lg:col-span-5 h-[600px] lg:h-full min-h-0 flex flex-col bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden relative shadow-2xl">
          {/* Panel Header */}
          <div className="p-3 bg-[#1A1A1A] border-b border-[#2A2A2A] flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-gray-400">$ chat --agent minescript</span>
            </div>
            <div className="flex gap-1">
              <div className="w-2.5 h-2.5 rounded-full bg-[#333]"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#333]"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#333]"></div>
            </div>
          </div>

          {/* Console Output (Chat list) */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 select-text bg-[#0C0C0C]/40">
            {chatHistory.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[90%] ${
                  msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
                }`}
              >
                <span className="text-[10px] text-gray-500 font-mono mb-1 px-1 uppercase tracking-wider">
                  {msg.role === "user" ? "User Request" : "Console AI Verified"} • {msg.createdAt}
                </span>
                <div
                  className={`p-4 rounded-lg border text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#252525] border-[#333] text-gray-200"
                      : "bg-[#0C0C0C] border-[#2A2A2A] text-gray-300"
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-normal font-mono text-xs">
                    {msg.text.includes("```python") ? (
                      msg.text.replace(/```python[\s\S]*?```/, "*(Code wurde generiert und in den Editor geladen!)*")
                    ) : (
                      msg.text
                    )}
                  </p>
                </div>
              </div>
            ))}

            {isGenerating && (
              <div className="mr-auto items-start max-w-[90%] flex flex-col animate-pulse">
                <span className="text-[10px] text-gray-500 font-mono mb-1 uppercase tracking-wider">
                  Console AI • Working...
                </span>
                <div className="p-4 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-xs text-gray-400 font-mono flex items-center gap-3">
                  <RefreshCw className="w-4 h-4 text-green-500 animate-spin" />
                  <div>
                    <span className="text-green-500 font-semibold uppercase tracking-wider text-[11px]">Generiere...</span>
                    <p className="text-[10px] text-gray-500 mt-0.5 font-mono">{loadingTip}</p>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Prompt Entry Input Form */}
          <form
            onSubmit={handleGenerate}
            className="p-4 bg-[#1A1A1A] border-t border-[#2A2A2A] shrink-0"
          >
            <div className="relative bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg focus-within:border-green-600 transition-all p-1">
              <textarea
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
                placeholder="Ask a technical question about Minescript functions or generate code..."
                className="w-full bg-transparent text-sm text-[#E0E0E0] placeholder-gray-600 border-none outline-none focus:ring-0 resize-none h-14 p-2 custom-scrollbar"
                disabled={isGenerating}
              />
              <div className="flex items-center justify-between border-t border-[#1A1A1A] px-2 py-1.5 shrink-0">
                <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-mono">
                  <Sparkles className="w-3.5 h-3.5 text-green-500" />
                  <span className="uppercase tracking-widest text-[9px]">STRICT_VALIDATION: ON</span>
                </div>
                <button
                  type="submit"
                  disabled={!promptInput.trim() || isGenerating}
                  className="bg-green-600 hover:bg-green-700 text-black font-bold disabled:opacity-40 disabled:cursor-not-allowed px-4 py-1.5 rounded text-xs tracking-wider transition-colors"
                >
                  SEND
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* PANEL 3: Active Script Editor (Right column - lg:col-span-4) */}
        <div className="lg:col-span-4 h-full min-h-0 flex flex-col">
          <div className="flex-1 min-h-0">
            <ScriptEditor
              currentScript={currentScript}
              savedScripts={savedScripts}
              onSaveScript={handleSaveScript}
              onDeleteScript={handleDeleteScript}
              onLoadScript={handleLoadScript}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
