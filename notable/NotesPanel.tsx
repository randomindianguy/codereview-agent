// Notable — panel listing open notes with a batch "save all" action.

import React, { useState } from "react";
import type { Note } from "./types";
import { handleBatchSaveNotes } from "./api";

interface NotesPanelProps {
  notes: Note[];
}

/**
 * Renders the open notes and persists all pending edits in one batch call.
 */
export function NotesPanel({ notes }: NotesPanelProps) {
  const [savedCount, setSavedCount] = useState<number | null>(null);

  const saveAll = async () => {
    const updates = notes.map((note) => ({ id: note.id, patch: { blocks: note.blocks } }));
    const res = await handleBatchSaveNotes(updates);
    if (res.ok && res.data) setSavedCount(res.data.saved);
  };

  return (
    <div className="notes-panel">
      <button onClick={saveAll}>Save all</button>
      {savedCount !== null && (
        <span className="notes-panel__status">{savedCount} saved</span>
      )}
    </div>
  );
}
