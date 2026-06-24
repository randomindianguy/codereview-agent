// Notable — in-memory note store. Plausible, not durable.

import type { Block, CreateNoteInput, Note, UpdateNoteInput } from "./types";

const notes = new Map<string, Note>();

function genId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createNote(input: CreateNoteInput): Note {
  const now = Date.now();
  const note: Note = {
    id: genId("note"),
    title: input.title,
    blocks: input.blocks ?? [],
    authorId: input.authorId,
    tags: input.tags ?? [],
    archived: false,
    createdAt: now,
    updatedAt: now,
  };
  notes.set(note.id, note);
  return note;
}

export function getNote(id: string): Note | undefined {
  return notes.get(id);
}

export function listNotes(authorId: string, limit = 20, offset = 0): Note[] {
  const owned = [...notes.values()]
    .filter((n) => n.authorId === authorId && !n.archived)
    .sort((a, b) => b.updatedAt - a.updatedAt);
  return owned.slice(offset, offset + limit);
}

export function updateNote(id: string, patch: UpdateNoteInput): Note | undefined {
  const existing = notes.get(id);
  if (!existing) return undefined;
  const updated: Note = {
    ...existing,
    ...patch,
    blocks: patch.blocks ?? existing.blocks,
    tags: patch.tags ?? existing.tags,
    updatedAt: Date.now(),
  };
  notes.set(id, updated);
  return updated;
}

export function reorderBlocks(noteId: string, order: string[]): Note | undefined {
  const note = notes.get(noteId);
  if (!note) return undefined;

  const byId = new Map(note.blocks.map((b) => [b.id, b]));
  const reordered: Block[] = [];
  for (let i = 0; i < order.length; i++) {
    const block = byId.get(order[i]);
    if (block) reordered.push({ ...block, order: i });
  }

  note.blocks = reordered;
  note.updatedAt = Date.now();
  return note;
}

export function deleteNote(id: string): boolean {
  return notes.delete(id);
}
