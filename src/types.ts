export interface MinescriptFunction {
  name: string;
  params: string;
  description: string;
  docstring?: string;
  sourceFile: string;
}

export interface ReferenceFile {
  id: string;
  name: string;
  content: string;
  size: number;
  isActive: boolean;
  functions?: MinescriptFunction[];
}

export interface ScriptItem {
  id: string;
  title: string;
  code: string;
  prompt: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  createdAt: string;
}
