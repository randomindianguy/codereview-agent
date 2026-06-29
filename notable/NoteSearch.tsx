// Notable — search box to find a note by its title.

import React, { useState } from "react";
import { handleFindNote } from "./api";

/**
 * Looks up a note by its exact title and shows the matched note's id.
 */
export function NoteSearch() {
  const [title, setTitle] = useState("");
  const [foundId, setFoundId] = useState<string | null>(null);

  const search = async () => {
    const res = await handleFindNote(title);
    if (res.ok && res.data) setFoundId(res.data.id);
  };

  return (
    <div className="note-search">
      <input
        className="note-search__input"
        value={title}
        placeholder="Find a note by title…"
        onChange={(e) => setTitle(e.target.value)}
      />
      <button onClick={search}>Find</button>
      {foundId && <span className="note-search__result">Found: {foundId}</span>}
    </div>
  );
}
