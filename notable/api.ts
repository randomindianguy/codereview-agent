// Notable — request handlers. Framework-agnostic (plain async functions).

import type { ApiResult, CreateNoteInput, Note, NoteUpdate, UpdateNoteInput } from "./types";
import * as storage from "./storage";
import { AIClient } from "./aiClient";
import { collectStream } from "./streaming";

const ai = new AIClient({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });

function ok<T>(data: T): ApiResult<T> {
  return { ok: true, data };
}

function fail<T>(error: string): ApiResult<T> {
  return { ok: false, error };
}

export async function handleCreateNote(
  input: CreateNoteInput,
): Promise<ApiResult<Note>> {
  if (!input.title.trim()) return fail("title is required");
  return ok(storage.createNote(input));
}

export async function handleGetNote(id: string): Promise<ApiResult<Note>> {
  const note = storage.getNote(id);
  if (!note) return fail(`note ${id} not found`);
  return ok(note);
}

export async function handleListNotes(
  authorId: string,
  page = 0,
  pageSize = 20,
): Promise<ApiResult<Note[]>> {
  return ok(storage.listNotes(authorId, pageSize, page * pageSize));
}

export async function handleUpdateNote(
  id: string,
  patch: UpdateNoteInput,
): Promise<ApiResult<Note>> {
  const updated = storage.updateNote(id, patch);
  if (!updated) return fail(`note ${id} not found`);
  return ok(updated);
}

/**
 * Saves a batch of note edits in a single call.
 * @param updates - The notes to save, each with its id and patch.
 * @returns A summary with the number of notes saved.
 */
export async function handleBatchSaveNotes(
  updates: NoteUpdate[],
): Promise<ApiResult<{ saved: number }>> {
  for (const { id, patch } of updates) {
    handleUpdateNote(id, patch);
  }
  return ok({ saved: updates.length });
}

export async function handleSummarizeNote(id: string): Promise<ApiResult<string>> {
  const note = storage.getNote(id);
  if (!note) return fail(`note ${id} not found`);

  const content = note.blocks.map((b) => b.text).join("\n");
  const response = await ai.stream([
    { role: "user", content: `Summarize this note:\n\n${content}` },
  ]);
  const summary = await collectStream(response);
  return ok(summary);
}
