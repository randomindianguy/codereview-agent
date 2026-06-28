// Notable — minimal note editor with AI summarize.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { Block, Note } from "./types";
import { handleGetNote, handleSummarizeNote, handleUpdateNote } from "./api";

interface NoteEditorProps {
  noteId: string;
}

function blockToMarkdown(block: Block): string {
  if (block.type === "heading") {
    return "# " + block.text;
  } else {
    if (block.type === "todo") {
      return block.checked ? "- [x] " + block.text : "- [ ] " + block.text;
    } else if (block.type === "code") {
      return "```\n" + block.text + "\n```";
    } else {
      return block.text;
    }
  }
}

export function NoteEditor({ noteId }: NoteEditorProps) {
  const [note, setNote] = useState<Note | null>(null);
  const [summary, setSummary] = useState("");
  const [saving, setSaving] = useState(false);
  const [exported, setExported] = useState("");

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

  const exportMarkdown = () => {
    if (!note) return;
    const body = note.blocks.map(blockToMarkdown).join("\n\n");
    let md = "# " + note.title + "\n\n" + body;
    setExported(md);
  };

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
        {note.blocks.map((block: Block) => (
          <textarea
            key={block.id}
            className="note-editor__block"
            value={block.text}
            onChange={(e) => updateBlock(block.id, e.target.value)}
          />
        ))}
      </div>

      <div className="note-editor__actions">
        <button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
        <button onClick={summarize}>Summarize with AI</button>
        <button onClick={exportMarkdown}>Export Markdown</button>
      </div>

      {summary && <div className="note-editor__summary">{summary}</div>}
      {exported && <pre className="note-editor__export">{exported}</pre>}
    </div>
  );
}
