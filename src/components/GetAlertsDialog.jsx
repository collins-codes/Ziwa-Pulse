import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { normalizeKenyanPhone } from "@/lib/kenyanPhone";
import { getTranslations } from "@/lib/i18n";

const roles = [
  ["Fisher", "fisher"],
  ["BMU official", "bmuOfficial"],
  ["Boat operator", "boatOperator"],
  ["Fish trader", "fishTrader"],
  ["Harvester", "harvester"],
  ["Briquette or biogas maker", "briquetteMaker"],
  ["Other", "other"],
];

export function GetAlertsDialog({ beaches, beachesAreSaved, onClose, language = "en" }) {
  const t = getTranslations(language);
  const [availableBeaches, setAvailableBeaches] = useState(() => beachesAreSaved ? beaches : []);
  const [hasSavedBeaches, setHasSavedBeaches] = useState(beachesAreSaved);
  const [beachLoadError, setBeachLoadError] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedBeaches, setSelectedBeaches] = useState([]);
  const [role, setRole] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    base44.entities.Beach.list()
      .then((rows) => {
        if (!active) return;
        setAvailableBeaches(rows);
        setHasSavedBeaches(rows.length > 0);
        setBeachLoadError("");
      })
      .catch((loadError) => {
        if (!active) return;
        setAvailableBeaches(beachesAreSaved ? beaches : []);
        setHasSavedBeaches(beachesAreSaved);
        setBeachLoadError(`Beach list could not be loaded: ${loadError.message}`);
      });
    return () => {
      active = false;
    };
  }, [beaches, beachesAreSaved]);

  const toggleBeach = (id) => {
    setSelectedBeaches((selected) =>
      selected.includes(id)
        ? selected.filter((selectedId) => selectedId !== id)
        : [...selected, id]
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const normalizedPhone = normalizeKenyanPhone(phone);
    if (!normalizedPhone) {
      setError(t.invalidPhone);
      return;
    }
    if (!name.trim()) {
      setError(t.nameRequired);
      return;
    }
    if (!hasSavedBeaches || selectedBeaches.length === 0) {
      setError(t.chooseBeach);
      return;
    }

    setSaving(true);
    try {
      await base44.entities.Subscriber.create({
        name: name.trim(),
        phone: normalizedPhone,
        beaches: selectedBeaches,
        role,
        language,
      });
      setSaved(true);
    } catch (saveError) {
      setError(t.signUpFailed(saveError.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-end justify-center bg-slate-950/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        aria-labelledby="alerts-title"
        aria-modal="true"
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl sm:rounded-2xl sm:p-7"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300 sm:tracking-[0.2em]">
              {t.lakeUpdates}
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-white" id="alerts-title">
              {saved ? t.youreOnList : t.getAlerts}
            </h2>
          </div>
          <button
            aria-label={t.closeSignUp}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={20} />
          </button>
        </div>
        {saved ? (
          <div className="mt-6 rounded-xl border border-green-400/20 bg-green-400/10 p-4 text-sm leading-6 text-green-200">
            {t.savedThanks}
          </div>
        ) : (
          <form className="mt-6 min-w-0 space-y-5" onSubmit={handleSubmit}>
            <label className="block text-sm text-slate-300">
              {t.nameOrGroup}
              <input
                autoComplete="name"
                className="mt-2 block w-full min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none focus:border-cyan-400"
                maxLength={120}
                onChange={(event) => setName(event.target.value)}
                required
                value={name}
              />
            </label>
            <label className="block text-sm text-slate-300">
              {t.phoneNumber}
              <input
                autoComplete="tel"
                className="mt-2 block w-full min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none focus:border-cyan-400"
                inputMode="tel"
                onChange={(event) => setPhone(event.target.value)}
                placeholder={t.phonePlaceholder}
                required
                type="tel"
                value={phone}
              />
            </label>
            <fieldset>
              <legend className="text-sm text-slate-300">{t.beaches}</legend>
              {!hasSavedBeaches && (
                <p className="mt-2 break-words text-sm text-amber-300">
                  {t.sampleLocationsNotice}
                </p>
              )}
              {beachLoadError && (
                <p className="mt-2 break-words text-sm text-red-200" role="alert">
                  {beachLoadError}
                </p>
              )}
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {availableBeaches.map((beach) => (
                  <label
                    className="flex min-w-0 items-center gap-3 rounded-lg border border-slate-800 p-3 text-sm text-slate-300"
                    key={beach.id}
                  >
                    <input
                      checked={selectedBeaches.includes(beach.id)}
                      className="h-4 w-4 accent-cyan-400"
                      disabled={!hasSavedBeaches}
                      onChange={() => toggleBeach(beach.id)}
                      type="checkbox"
                    />
                    <span className="min-w-0 break-words">{beach.name}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="block text-sm text-slate-300">
              {t.yourRole}
              <select
                className="mt-2 block w-full min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none focus:border-cyan-400"
                onChange={(event) => setRole(event.target.value)}
                required
                value={role}
              >
                <option disabled value="">{t.chooseRole}</option>
                {roles.map(([option, key]) => (
                  <option key={option} value={option}>{t[key]}</option>
                ))}
              </select>
            </label>
            <div className="space-y-1">
              <p className="text-xs leading-5 text-slate-400">{t.consent}</p>
              <p className="text-xs leading-5 text-slate-500">{t.alertLanguage(language)}</p>
            </div>
            {error && (
              <p className="rounded-lg border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200" role="alert">
                {error}
              </p>
            )}
            <button
              className="w-full rounded-lg bg-cyan-300 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={saving}
              type="submit"
            >
              {saving ? t.savingSignUp : t.signMeUp}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
