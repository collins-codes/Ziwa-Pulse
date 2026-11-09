import { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { normalizeKenyanPhone } from "@/lib/kenyanPhone";
import { getTranslations } from "@/lib/i18n";

function localDateTimeValue() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function formattedDate(value, language) {
  return new Intl.DateTimeFormat(language === "sw" ? "sw-KE" : "en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function errorText(error) {
  return error.response?.data?.error ?? error.message ?? "Unknown error";
}

export function HarvestBoardPage({ beaches, beachesAreSaved, language = "en", onBack }) {
  const t = getTranslations(language);
  const copy = t.harvestBoard;
  const [savedBeaches, setSavedBeaches] = useState(() => beachesAreSaved ? beaches : []);
  const [hasSavedBeaches, setHasSavedBeaches] = useState(beachesAreSaved);
  const [posts, setPosts] = useState([]);
  const [sampleBuyers, setSampleBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [posting, setPosting] = useState(false);
  const [joining, setJoining] = useState(false);
  const [harvesterName, setHarvesterName] = useState("");
  const [harvesterPhone, setHarvesterPhone] = useState("");
  const [postBeach, setPostBeach] = useState("");
  const [tonnes, setTonnes] = useState("");
  const [condition, setCondition] = useState("fresh");
  const [availableFrom, setAvailableFrom] = useState(localDateTimeValue);
  const [groupName, setGroupName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerType, setBuyerType] = useState("");
  const [buyerBeaches, setBuyerBeaches] = useState([]);
  const [maxTonnes, setMaxTonnes] = useState("");
  const [claimedPhones, setClaimedPhones] = useState({});
  const [claimPromptPostId, setClaimPromptPostId] = useState("");
  const [claimEmail, setClaimEmail] = useState("");
  const [claimPassword, setClaimPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  const loadBoard = useCallback(async () => {
    const [beachRows, response] = await Promise.all([
      base44.entities.Beach.list(),
      base44.functions.invoke("harvestBoard", { action: "list" }),
    ]);
    setSavedBeaches(beachRows);
    setHasSavedBeaches(beachRows.length > 0);
    setPosts(response.data.posts ?? []);
    setSampleBuyers(response.data.sampleBuyers ?? []);
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        await loadBoard();
        if (!active) return;
      } catch (loadError) {
        if (active) setError(`${copy.loadFailed}: ${errorText(loadError)}`);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [copy.loadFailed, loadBoard]);

  const toggleBuyerBeach = (beachId) => {
    setBuyerBeaches((current) =>
      current.includes(beachId)
        ? current.filter((id) => id !== beachId)
        : [...current, beachId]
    );
  };

  const submitPost = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    const normalizedPhone = normalizeKenyanPhone(harvesterPhone);
    if (!normalizedPhone) {
      setError(t.invalidPhone);
      return;
    }
    if (!hasSavedBeaches || !postBeach) {
      setError(copy.chooseSavedBeach);
      return;
    }

    setPosting(true);
    try {
      const response = await base44.functions.invoke("harvestBoard", {
        action: "createPost",
        harvester_name: harvesterName,
        phone: normalizedPhone,
        beach: postBeach,
        estimated_tonnes: Number(tonnes),
        condition,
        available_from: new Date(availableFrom).toISOString(),
      });
      const notification = response.data.notification ?? {};
      setNotice(
        notification.error
          ? copy.postSavedNotificationError(notification.error)
          : notification.failed
          ? copy.postSavedPartial(notification.notified, notification.failed)
          : copy.postSaved(notification.notified)
      );
      setHarvesterName("");
      setHarvesterPhone("");
      setTonnes("");
      await loadBoard();
    } catch (submitError) {
      setError(`${copy.postFailed}: ${errorText(submitError)}`);
    } finally {
      setPosting(false);
    }
  };

  const submitBuyer = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    const normalizedPhone = normalizeKenyanPhone(buyerPhone);
    if (!normalizedPhone) {
      setError(t.invalidPhone);
      return;
    }
    if (!hasSavedBeaches || buyerBeaches.length === 0) {
      setError(copy.chooseCollectionBeaches);
      return;
    }

    setJoining(true);
    try {
      await base44.functions.invoke("harvestBoard", {
        action: "joinBuyer",
        group_name: groupName,
        phone: normalizedPhone,
        type: buyerType,
        beaches: buyerBeaches,
        max_tonnes: Number(maxTonnes),
      });
      setNotice(copy.buyerJoined);
      setGroupName("");
      setBuyerPhone("");
      setBuyerType("");
      setBuyerBeaches([]);
      setMaxTonnes("");
      await loadBoard();
    } catch (joinError) {
      setError(`${copy.buyerJoinFailed}: ${errorText(joinError)}`);
    } finally {
      setJoining(false);
    }
  };

  const claimPost = async (postId) => {
    setError("");
    setNotice("");
    try {
      const response = await base44.functions.invoke("harvestBoard", {
        action: "claim",
        postId,
      });
      setClaimedPhones((current) => ({ ...current, [postId]: response.data.phone }));
      setClaimPromptPostId("");
      setNotice(copy.claimed);
      await loadBoard();
    } catch (claimError) {
      if (claimError.response?.status === 401) {
        setClaimPromptPostId(postId);
        setError(copy.signInToClaim);
        return;
      }
      setError(`${copy.claimFailed}: ${errorText(claimError)}`);
    }
  };

  const signInAndClaim = async (event) => {
    event.preventDefault();
    setSigningIn(true);
    setError("");
    try {
      await base44.auth.loginViaEmailPassword(claimEmail.trim(), claimPassword);
      await claimPost(claimPromptPostId);
    } catch (signInError) {
      setError(`${copy.signInFailed}: ${errorText(signInError)}`);
    } finally {
      setSigningIn(false);
    }
  };

  const fieldClass =
    "mt-2 block w-full min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none focus:border-cyan-400";
  const labelClass = "block min-w-0 text-sm text-slate-300";
  const beachOptions = hasSavedBeaches ? savedBeaches : beaches;

  return (
    <section className="mt-8 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
            {copy.eyebrow}
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-white">{copy.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            {copy.intro}
          </p>
        </div>
        <button
          className="rounded-lg border border-slate-700 px-3 py-2.5 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white"
          onClick={onBack}
          type="button"
        >
          {t.backToMap}
        </button>
      </div>

      <div className="rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
        <strong className="mr-2 uppercase tracking-wider">{t.sampleData}</strong>
        {copy.sampleNotice}
      </div>

      {error && (
        <p className="break-words rounded-lg border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="break-words rounded-lg border border-green-400/20 bg-green-400/10 p-3 text-sm text-green-200" role="status">
          {notice}
        </p>
      )}

      <div className="grid min-w-0 gap-5 lg:grid-cols-2">
        <section className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
          <h3 className="text-lg font-semibold text-white">{copy.postMaterial}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-400">{copy.postFormIntro}</p>
          <form className="mt-5 space-y-4" onSubmit={submitPost}>
            <label className={labelClass}>
              {copy.harvesterName}
              <input className={fieldClass} maxLength={120} onChange={(event) => setHarvesterName(event.target.value)} required value={harvesterName} />
            </label>
            <label className={labelClass}>
              {t.phoneNumber}
              <input autoComplete="tel" className={fieldClass} inputMode="tel" onChange={(event) => setHarvesterPhone(event.target.value)} placeholder={t.phonePlaceholder} required type="tel" value={harvesterPhone} />
            </label>
            <label className={labelClass}>
              {t.beach}
              <select className={fieldClass} disabled={!hasSavedBeaches} onChange={(event) => setPostBeach(event.target.value)} required value={postBeach}>
                <option value="">{copy.chooseBeach}</option>
                {beachOptions.map((beach) => <option key={beach.id} value={beach.id}>{beach.name}</option>)}
              </select>
            </label>
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <label className={labelClass}>
                {copy.estimatedTonnes}
                <input className={fieldClass} min="0.01" max="10000" onChange={(event) => setTonnes(event.target.value)} required step="0.01" type="number" value={tonnes} />
              </label>
              <label className={labelClass}>
                {copy.condition}
                <select className={fieldClass} onChange={(event) => setCondition(event.target.value)} value={condition}>
                  <option value="fresh">{copy.fresh}</option>
                  <option value="dried">{copy.dried}</option>
                </select>
              </label>
            </div>
            <label className={labelClass}>
              {copy.availableFrom}
              <input className={fieldClass} onChange={(event) => setAvailableFrom(event.target.value)} required type="datetime-local" value={availableFrom} />
            </label>
            <p className="text-xs leading-5 text-slate-500">{copy.phonePrivacy}</p>
            <button className="w-full rounded-lg bg-cyan-300 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-60" disabled={posting || !hasSavedBeaches} type="submit">
              {posting ? copy.posting : copy.postMaterial}
            </button>
          </form>
        </section>

        <section className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
          <h3 className="text-lg font-semibold text-white">{copy.joinAsBuyer}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-400">{copy.buyerFormIntro}</p>
          <form className="mt-5 space-y-4" onSubmit={submitBuyer}>
            <label className={labelClass}>
              {copy.groupName}
              <input className={fieldClass} maxLength={120} onChange={(event) => setGroupName(event.target.value)} required value={groupName} />
            </label>
            <label className={labelClass}>
              {t.phoneNumber}
              <input autoComplete="tel" className={fieldClass} inputMode="tel" onChange={(event) => setBuyerPhone(event.target.value)} placeholder={t.phonePlaceholder} required type="tel" value={buyerPhone} />
            </label>
            <label className={labelClass}>
              {copy.buyerType}
              <select className={fieldClass} onChange={(event) => setBuyerType(event.target.value)} required value={buyerType}>
                <option value="">{copy.chooseBuyerType}</option>
                <option value="briquettes">{copy.briquettes}</option>
                <option value="biogas">{copy.biogas}</option>
                <option value="crafts">{copy.crafts}</option>
              </select>
            </label>
            <fieldset>
              <legend className="text-sm text-slate-300">{copy.collectionBeaches}</legend>
              {!hasSavedBeaches && <p className="mt-2 text-sm text-amber-300">{copy.chooseSavedBeach}</p>}
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {beachOptions.map((beach) => (
                  <label className="flex min-w-0 items-center gap-3 rounded-lg border border-slate-800 p-3 text-sm text-slate-300" key={beach.id}>
                    <input checked={buyerBeaches.includes(beach.id)} className="h-4 w-4 accent-cyan-400" disabled={!hasSavedBeaches} onChange={() => toggleBuyerBeach(beach.id)} type="checkbox" />
                    <span className="min-w-0 break-words">{beach.name}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className={labelClass}>
              {copy.maxTonnes}
              <input className={fieldClass} min="0.01" max="10000" onChange={(event) => setMaxTonnes(event.target.value)} required step="0.01" type="number" value={maxTonnes} />
            </label>
            <p className="text-xs leading-5 text-slate-500">{copy.buyerPhonePrivacy}</p>
            <button className="w-full rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-4 py-3 font-semibold text-cyan-100 transition hover:bg-cyan-400/20 disabled:opacity-60" disabled={joining || !hasSavedBeaches} type="submit">
              {joining ? copy.joining : copy.joinAsBuyer}
            </button>
          </form>
          {sampleBuyers.length > 0 && (
            <div className="mt-6 border-t border-slate-800 pt-4">
              <h4 className="text-sm font-semibold text-slate-200">{copy.sampleBuyerGroups}</h4>
              <ul className="mt-2 space-y-2">
                {sampleBuyers.map((buyer) => (
                  <li className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-sm" key={buyer.group_name}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-slate-200">{buyer.group_name}</span>
                      <span className="text-xs text-amber-300">{t.sampleData}</span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      {copy.buyerTypeLabels[buyer.type]} · {buyer.max_tonnes} {copy.tonnes} · {buyer.beaches.join(", ")}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h3 className="text-lg font-semibold text-white">{copy.openPosts}</h3>
          <span className="text-sm text-slate-400">{posts.filter((post) => post.status === "open").length} {copy.posts}</span>
        </div>
        <p className="mt-1 text-sm leading-6 text-slate-400">{copy.openPostsIntro}</p>
        {loading ? (
          <p className="mt-4 text-sm text-slate-400">{copy.loading}</p>
        ) : posts.length === 0 ? (
          <p className="mt-4 rounded-xl border border-slate-800 p-4 text-sm text-slate-400">{copy.noOpenPosts}</p>
        ) : (
          <ul className="mt-4 grid min-w-0 gap-3 md:grid-cols-2">
            {posts.map((post) => (
              <li className="min-w-0 rounded-xl border border-slate-800 bg-slate-950/50 p-4" key={post.id}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="break-words font-semibold text-white">{post.beach_name}</h4>
                    <p className="mt-1 break-words text-sm text-slate-300">{post.harvester_name}</p>
                  </div>
                  {post.is_sample && <span className="rounded-full bg-amber-400/10 px-2.5 py-1 text-xs text-amber-300">{t.sampleData}</span>}
                  {post.claimed_by_me && <span className="rounded-full bg-green-400/10 px-2.5 py-1 text-xs text-green-300">{copy.claimedByYou}</span>}
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                  <div><dt className="text-xs text-slate-500">{copy.amount}</dt><dd className="mt-0.5 text-slate-200">{post.estimated_tonnes} {copy.tonnes}</dd></div>
                  <div><dt className="text-xs text-slate-500">{copy.condition}</dt><dd className="mt-0.5 text-slate-200">{post.condition === "fresh" ? copy.fresh : copy.dried}</dd></div>
                  <div className="col-span-2"><dt className="text-xs text-slate-500">{copy.availableFrom}</dt><dd className="mt-0.5 break-words text-slate-200">{formattedDate(post.available_from, language)}</dd></div>
                </dl>
                {claimedPhones[post.id] ? (
                  <p className="mt-4 break-all rounded-lg border border-green-400/20 bg-green-400/10 p-3 text-sm text-green-200">
                    {copy.claimContact}: <a className="underline" href={`tel:${claimedPhones[post.id]}`}>{claimedPhones[post.id]}</a>
                  </p>
                ) : (
                  <button className="mt-4 w-full rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20" onClick={() => claimPost(post.id)} type="button">
                    {post.claimed_by_me ? copy.revealContact : copy.claim}
                  </button>
                )}
                {claimPromptPostId === post.id && (
                  <form className="mt-4 space-y-3 rounded-lg border border-slate-800 p-3" onSubmit={signInAndClaim}>
                    <p className="text-sm leading-5 text-slate-300">{copy.localSignInNote}</p>
                    <label className={labelClass}>{copy.accountEmail}<input autoComplete="username" className={fieldClass} onChange={(event) => setClaimEmail(event.target.value)} required type="email" value={claimEmail} /></label>
                    <label className={labelClass}>{copy.password}<input autoComplete="current-password" className={fieldClass} onChange={(event) => setClaimPassword(event.target.value)} required type="password" value={claimPassword} /></label>
                    <button className="w-full rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60" disabled={signingIn} type="submit">
                      {signingIn ? copy.signingIn : copy.signInAndClaim}
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
