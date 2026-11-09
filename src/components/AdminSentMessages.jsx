import { maskKenyanPhone } from "@/lib/kenyanPhone";

const timeFormatter = new Intl.DateTimeFormat("en-KE", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function AdminSentMessages({ messages, beaches }) {
  const beachNames = new Map(beaches.map((beach) => [beach.id, beach.name]));

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-white">Sent messages</h3>
        <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-xs font-medium text-amber-300">
          DRY_RUN · ON
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Preview only. No SMS provider is called.
      </p>
      {messages.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">
          No messages prepared yet. Change a beach&apos;s cover level to create
          an alert.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-800">
          {messages.map((message) => (
            <li className="py-3 first:pt-0 last:pb-0" key={message.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-200">
                  {beachNames.get(message.beach) ?? "Beach"}
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    {message.message_kind === "harvest" ? "Harvest offer" : "Alert"}
                  </span>
                  {message.is_sample && (
                    <span className="ml-2 text-xs font-normal text-amber-300">
                      Sample data
                    </span>
                  )}
                </p>
                <span className="text-xs text-slate-400">
                  {maskKenyanPhone(message.to)} · {message.status}
                </span>
              </div>
              <p className="mt-2 break-words text-sm leading-6 text-slate-300">
                {message.text}
              </p>
              <time
                className="mt-1 block text-xs text-slate-500"
                dateTime={message.time}
              >
                {timeFormatter.format(new Date(message.time))}
              </time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
