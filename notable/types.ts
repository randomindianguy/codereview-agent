// Notable — core domain & API types.

export type BlockType = "text" | "heading" | "todo" | "code";

export interface Block {
  id: string;
  type: BlockType;
  text: string;
  /** Only meaningful for `todo` blocks. */
  checked?: boolean;
  order: number;
}

export interface Note {
  id: string;
  title: string;
  blocks: Block[];
  authorId: string;
  tags: string[];
  archived: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

// --- API request/response shapes ---

export interface CreateNoteInput {
  title: string;
  authorId: string;
  blocks?: Block[];
  tags?: string[];
}

export interface UpdateNoteInput {
  title?: string;
  blocks?: Block[];
  tags?: string[];
  archived?: boolean;
}

export interface NoteUpdate {
  id: string;
  patch: UpdateNoteInput;
}

export interface ApiResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

// --- AI types ---

export interface AIMessage {
  role: "user" | "assistant";
  content: string;
}

export interface CompletionRequest {
  model: string;
  messages: AIMessage[];
  maxTokens: number;
  stream?: boolean;
}

export interface StreamChunk {
  delta: string;
  done: boolean;
}
