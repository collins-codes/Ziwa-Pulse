import { maskKenyanPhone } from "@/lib/kenyanPhone";

export function AdminSubscriberList({ subscribers, beaches }) {
  const beachNames = new Map(beaches.map((beach) => [beach.id, beach.name]));

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 sm:p-5">
      <h3 className="font-semibold text-white">Subscribers</h3>
      {subscribers.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">No subscribers yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-800">
          {subscribers.map((subscriber) => (
            <li className="py-3 first:pt-0 last:pb-0" key={subscriber.id}>
              <p className="font-medium text-slate-200">{subscriber.name}</p>
              <p className="mt-1 text-sm text-slate-400">
                {maskKenyanPhone(subscriber.phone)} · {subscriber.role}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {(subscriber.beaches ?? [])
                  .map((id) => beachNames.get(id) ?? "Beach unavailable")
                  .join(", ")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
