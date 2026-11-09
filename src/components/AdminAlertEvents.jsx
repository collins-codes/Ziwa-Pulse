const dateFormatter = new Intl.DateTimeFormat("en-KE", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function AdminAlertEvents({ events, beaches }) {
  const beachNames = new Map(beaches.map((beach) => [beach.id, beach.name]));

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 sm:p-5">
      <h3 className="font-semibold text-white">Recent alert events</h3>
      {events.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">No alert events recorded yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-800">
          {events.map((event) => (
            <li className="py-3 first:pt-0 last:pb-0" key={event.id}>
              <p className="text-sm font-medium text-slate-200">
                {beachNames.get(event.beach) ?? "Beach"}: {event.old_level} → {event.new_level}
              </p>
              <time className="mt-1 block text-xs text-slate-500" dateTime={event.created_at}>
                {dateFormatter.format(new Date(event.created_at))}
              </time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
