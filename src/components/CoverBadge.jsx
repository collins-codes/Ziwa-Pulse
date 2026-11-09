import { getCoverLabel } from "@/lib/i18n";

const styles = {
  Low: "border-green-400/20 bg-green-400/10 text-green-300",
  Medium: "border-orange-400/20 bg-orange-400/10 text-orange-300",
  High: "border-red-400/20 bg-red-400/10 text-red-300",
};

export function CoverBadge({ level, language = "en" }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium ${styles[level]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {getCoverLabel(level, language)}
    </span>
  );
}
