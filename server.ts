import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const app = express();
app.use(express.json({ limit: "15mb" }));

let aiClient: GoogleGenAI | null = null;

function getGenAI() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log("Checking GEMINI_API_KEY: ", apiKey ? "Found" : "Missing");
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing. Please add it via the Secrets panel in the Settings menu.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

app.post("/api/feedback", async (req, res) => {
  try {
    const { scriptId, feedback } = req.body;
    const feedbackPath = path.join(process.cwd(), "feedback.json");
    let feedbackData = [];
    if (fs.existsSync(feedbackPath)) {
      feedbackData = JSON.parse(fs.readFileSync(feedbackPath, "utf-8"));
    }
    feedbackData.push({ scriptId, feedback, timestamp: new Date().toISOString() });
    fs.writeFileSync(feedbackPath, JSON.stringify(feedbackData, null, 2));
    res.json({ status: "ok" });
  } catch (err: any) {
    console.error("Error saving feedback:", err);
    res.status(500).json({ error: "Failed to save feedback" });
  }
});

app.get("/api/history", async (req, res) => {
  try {
    const historyPath = path.join(process.cwd(), "script_history.json");
    if (!fs.existsSync(historyPath)) {
      return res.json([]);
    }
    const historyData = JSON.parse(fs.readFileSync(historyPath, "utf-8"));
    res.json(historyData);
  } catch (err: any) {
    console.error("Error reading history:", err);
    res.status(500).json({ error: "Failed to read history" });
  }
});

app.get("/api/history-code/:filename", async (req, res) => {
  try {
    const filename = req.params.filename;
    const codePath = path.join(process.cwd(), "history", filename);
    if (!fs.existsSync(codePath)) {
      return res.status(404).json({ error: "File not found" });
    }
    const code = fs.readFileSync(codePath, "utf-8");
    res.json({ code });
  } catch (err: any) {
    console.error("Error reading history code:", err);
    res.status(500).json({ error: "Failed to read history code" });
  }
});

// API: Parse Python library file to extract list of functions, signatures and docstrings
app.post("/api/parse-functions", async (req, res) => {
  try {
    const { fileContent, fileName } = req.body;
    if (!fileContent) {
      return res.status(400).json({ error: "Missing fileContent" });
    }

    const ai = getGenAI();

    const prompt = `Analyze the following Python library file content and extract ALL public functions and class methods.
For each function or class method, provide its name (for class methods, format the name as "ClassName.method_name", e.g. "Inventory.click_slot"), its parameters (excluding 'self' or 'cls' parameter), and a short description derived from its docstring or comments.

Be extremely thorough. Do not skip any classes (such as Inventory, Screen, Gui, Key, Client, Player, Server, World, Trading, Util, Hud) or their static methods, class methods, or instance methods.

File Name: ${fileName}

File Content:
\`\`\`python
${fileContent}
\`\`\`
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Name of the function or class-prefixed method, e.g. 'Hud.add_text' or 'echo'" },
              params: { type: Type.STRING, description: "Parameters list, e.g. 'message' or 'x, y, z, block_type', excluding 'self' or 'cls'" },
              description: { type: Type.STRING, description: "Short description of the function's purpose" },
              docstring: { type: Type.STRING, description: "Optional full docstring, details or notes on return values" }
            },
            required: ["name", "params", "description"]
          }
        },
        systemInstruction: "You are a precise Python parser. Extract ALL public module-level functions AND class-level methods (including static methods, class methods, and instance methods). If a method belongs to a class (e.g. class Hud), prefix its name with the class name (e.g. 'Hud.add_text'). For any class methods, exclude the 'self' or 'cls' parameter from the parameters list. Do not include helper methods starting with an underscore unless they are part of the public API. Be extremely thorough and extract every public method."
      }
    });

    const textResult = response.text || "[]";
    const parsedData = JSON.parse(textResult);
    res.json({ functions: parsedData });
  } catch (err: any) {
    console.error("Error parsing functions:", err);
    res.status(500).json({ error: err.message || "Failed to parse library file" });
  }
});

// API: Generate Minescript Python Code
app.post("/api/generate", async (req, res) => {
  console.log("POST /api/generate called");
  try {
    const { prompt, files, history, model } = req.body;
    if (!prompt) {
      console.error("Missing prompt");
      return res.status(400).json({ error: "Missing prompt" });
    }

    const ai = getGenAI();
    console.log("GenAI initialized");
    const selectedModel = model || "gemini-3.5-flash";

    // Format knowledge files as reference context
    const knowledgeDir = path.join(process.cwd(), "knowledge");
    let serverKnowledgeStr = "";
    if (fs.existsSync(knowledgeDir)) {
      const serverFiles = fs.readdirSync(knowledgeDir);
      for (const file of serverFiles) {
        const filePath = path.join(knowledgeDir, file);
        if (fs.statSync(filePath).isFile() && !file.startsWith(".")) {
          const content = fs.readFileSync(filePath, "utf-8");
          serverKnowledgeStr += `--- SERVER REFERENCE FILE: ${file} ---\n${content}\n-----------------------------\n\n`;
        }
      }
    }

    let contextStr = "";
    if (serverKnowledgeStr) {
      contextStr += "The following server-side reference files are permanently loaded for your knowledge base. You MUST strictly use ONLY the functions, classes, and variable signatures specified in these files.\n\n" + serverKnowledgeStr;
    }

    const feedbackPath = path.join(process.cwd(), "feedback.json");
    if (fs.existsSync(feedbackPath)) {
      const feedbackContent = fs.readFileSync(feedbackPath, "utf-8");
      contextStr += `\n\n--- PREVIOUS USER FEEDBACK (Use this to improve code quality) ---\n${feedbackContent}\n-----------------------------\n\n`;
    }

    if (files && files.length > 0) {
      contextStr += "The user has also uploaded the following custom reference files:\n\n";
      files.forEach((file: { name: string; content: string }) => {
        contextStr += `--- UPLOADED REFERENCE FILE: ${file.name} ---\n${file.content}\n-----------------------------\n\n`;
      });
    } else if (!serverKnowledgeStr) {
      contextStr = "No reference files have been uploaded or provided on the server. Remind the user politely to upload a reference file or add one to the /knowledge folder.\n\n";
    }

    const systemInstruction = `You are an elite, specialized AI Coding Assistant for Minescript, a Python library for Minecraft.
Your main job is to generate flawless Python scripts and help write Minecraft automation code.

CRITICAL DIRECTIVE ON HALLUCINATIONS:
- You MUST only use functions, signatures, classes, and variables that are defined in the provided REFERENCE FILES.
- If a function is not explicitly documented or defined in the provided reference files, YOU MUST NOT USE IT.
- If the user asks for a feature that requires a function not present in the reference files, explain clearly that the library does not seem to support it and show them the exact functions you are restricted to.
- IMPORTANT: DO NOT include any code comments in the generated script. Keep it purely functional, clean, and uncommented unless explicitly requested.

Reference Context:
${contextStr}

When generating code:
1. Always return complete, copy-pasteable Python scripts. Include imports (e.g., 'import minescript' or custom imports defined in the references).
2. Structure your response with a short conceptual explanation followed by the code block (strictly inside \`\`\`python ... \`\`\` blocks), and then brief instructions on how to run it.
3. If they ask a general informational question, answer it concisely using only the reference rules.
`;

    const contents: any[] = [];
    if (history && history.length > 0) {
      history.forEach((h: { role: string; text: string }) => {
        contents.push({
          role: h.role === "user" ? "user" : "model",
          parts: [{ text: h.text }]
        });
      });
    }
    contents.push({
      role: "user",
      parts: [{ text: prompt }]
    });

    // Generate code
    let response;
    try {
      console.log(`Sending generateContent request to primary model: ${selectedModel}`);
      response = await ai.models.generateContent({
        model: selectedModel,
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.1, // low temperature to ensure strict alignment with the reference files
        }
      });
    } catch (firstErr: any) {
      console.warn(`Primary model ${selectedModel} failed. Error:`, firstErr.message || firstErr);
      
      // Determine secondary fallback model
      const fallbackModel = selectedModel === "gemini-3.1-flash-lite" ? "gemini-3.5-flash" : "gemini-3.1-flash-lite";
      console.log(`Attempting automatic fallback to highly available model: ${fallbackModel}`);
      
      try {
        response = await ai.models.generateContent({
          model: fallbackModel,
          contents: contents,
          config: {
            systemInstruction: systemInstruction,
            temperature: 0.1,
          }
        });
        console.log(`Fallback to ${fallbackModel} succeeded!`);
      } catch (secondErr: any) {
        console.error("Fallback model also failed:", secondErr.message || secondErr);
        // Throw the original error so the user knows what failed first
        throw firstErr;
      }
    }

    console.log("Gemini API call successful, response received");

    // Save prompt and generated code to history
    const historyDir = path.join(process.cwd(), "history");
    if (!fs.existsSync(historyDir)) {
      fs.mkdirSync(historyDir);
    }
    const codeFilename = `script_${Date.now()}.py`;
    const codePath = path.join(historyDir, codeFilename);
    fs.writeFileSync(codePath, response.text);

    const historyPath = path.join(process.cwd(), "script_history.json");
    let historyData = [];
    if (fs.existsSync(historyPath)) {
      historyData = JSON.parse(fs.readFileSync(historyPath, "utf-8"));
    }
    historyData.push({ 
        prompt, 
        codeFile: codeFilename,
        timestamp: new Date().toISOString() 
    });

    // Limit to 5
    while (historyData.length > 5) {
        const removed = historyData.shift(); // Remove oldest
        // Delete the file
        const oldCodePath = path.join(process.cwd(), "history", removed.codeFile);
        if (fs.existsSync(oldCodePath)) {
            fs.unlinkSync(oldCodePath);
        }
    }
    fs.writeFileSync(historyPath, JSON.stringify(historyData, null, 2));

    res.json({ text: response.text });
  } catch (err: any) {
    console.error("Error generating code:", err);
    res.status(500).json({ error: err.message || "Failed to generate code", stack: err.stack });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
