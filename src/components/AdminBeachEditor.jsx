import { useState } from "react";
import { CoverBadge } from "@/components/CoverBadge";

const levels = ["Low", "Medium", "High"];

export function AdminBeachEditor({ beaches, onSave }) {
  const [beachId, setBeachId] = useState("");
  const [level, setLevel] = useState("");
  const selected = beaches.find((beach) => beach.id === beachId);

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 sm:p-5">
      <h3 className="font-semibold text-white">Update cover level</h3>
      <p className="mt-1 text-sm text-slate-400">
        A change records an alert event and updates the map.
      </p>
      {beaches.length === 0 ? (
        <p className="mt-4 text-sm text-amber-300">
          No saved Beach records are available. Sample map locations cannot be edited.
        </p>
      ) : (
        <form
          className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            if (selected && level) onSave(selected, level);
          }}
        >
          <label className="text-sm text-slate-300">
            Beach
            <select
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-3 text-white"
              onChange={(event) => setBeachId(event.target.value)}
              required
              value={beachId}
            >
              <option disabled value="">Choose a beach</option>
              {beaches.map((beach) => (
                <option key={beach.id} value={beach.id}>{beach.name}</option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-300">
            New cover level
            <select
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-3 text-white"
              onChange={(event) => setLevel(event.target.value)}
              required
              value={level}
            >
              <option disabled value="">Choose a level</option>
              {levels.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
          <button
            className="self-end rounded-lg bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50"
            disabled={!selected || !level || level === selected.cover_level}
            type="submit"
          >
            Save change
          </button>
        </form>
      )}
      {selected && (
        <p className="mt-3 flex items-center gap-2 text-sm text-slate-400">
          Current level: <CoverBadge level={selected.cover_level} />
        </p>
      )}
    </section>
  );
}
