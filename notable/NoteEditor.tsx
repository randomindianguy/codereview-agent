// Notable — minimal note editor with AI summarize.

import React, { useCallback, useEffect, useState } from "react";
import type { Block, Note } from "./types";
import {
  handleGetNote,
  handleReorderBlocks,
  handleSummarizeNote,
  handleUpdateNote,
} from "./api";

interface NoteEditorProps {
  noteId: string;
}

export function NoteEditor({ noteId }: NoteEditorProps) {
  const [note, setNote] = useState<Note | null>(null);
  const [summary, setSummary] = useState("");
  const [saving, setSaving] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    handleGetNote(noteId).then((res) => {
      if (active && res.ok && res.data) setNote(res.data);
    });
    return () => {
      active = false;
    };
  }, [noteId]);

  const updateBlock = useCallback((blockId: string, text: string) => {
    setNote((prev) => {
      if (!prev) return prev;
      const blocks = prev.blocks.map((b) =>
        b.id === blockId ? { ...b, text } : b,
      );
      return { ...prev, blocks };
    });
  }, []);

  const save = useCallback(async () => {
    if (!note) return;
    setSaving(true);
    const res = await handleUpdateNote(note.id, { blocks: note.blocks });
    if (res.ok && res.data) setNote(res.data);
    setSaving(false);
  }, [note]);

  const summarize = useCallback(async () => {
    const res = await handleSummarizeNote(noteId);
    if (res.ok && res.data) setSummary(res.data);
  }, [noteId]);

  const reorder = useCallback(
    async (from: number, to: number) => {
      if (!note || from === to) return;
      const blocks = [...note.blocks];
      const [moved] = blocks.splice(from, 1);
      blocks.splice(to, 0, moved);
      const res = await handleReorderBlocks(note.id, blocks.map((b) => b.id));
      if (res.ok && res.data) setNote(res.data);
    },
    [note],
  );

  if (!note) return <div className="note-editor note-editor--loading">Loading…</div>;

  return (
    <div className="note-editor">
      <input
        className="note-editor__title"
        value={note.title}
        onChange={(e) =>
          setNote((prev) => (prev ? { ...prev, title: e.target.value } : prev))
        }
      />

      <div className="note-editor__blocks">
        {note.blocks.map((block: Block, index: number) => (
          <div
            key={block.id}
            className="note-editor__block-row"
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIndex !== null) void reorder(dragIndex, index);
              setDragIndex(null);
            }}
          >
            <textarea
              className="note-editor__block"
              value={block.text}
              onChange={(e) => updateBlock(block.id, e.target.value)}
            />
          </div>
        ))}
      </div>

      <div className="note-editor__actions">
        <button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
        <button onClick={summarize}>Summarize with AI</button>
      </div>

      {summary && <div className="note-editor__summary">{summary}</div>}
    </div>
  );
}
