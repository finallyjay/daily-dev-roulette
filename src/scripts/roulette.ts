// Client-side game logic for the Bookmarks Roulette (src/pages/roulette.astro).
// Extracted from an inline `<script define:vars>` so it is typed, bundled and
// testable. The page imports MOCK_BOOKMARKS directly (plain data, no server
// deps) and passes the run mode via the stage's `data-mode` attribute.
import type { Bookmark } from "../lib/daily";
import { MOCK_BOOKMARKS } from "../lib/mock";

type Mode = "demo" | "real";

type GameState = {
  mode: Mode;
  chamber: Bookmark[];
  killed: number;
  survived: number;
  total: number;
  current: Bookmark | null;
  firing: boolean;
};

type SavedState = Pick<GameState, "mode" | "chamber" | "current" | "killed" | "survived" | "total">;

const STORAGE_KEY = "ddr_progress";
const CHAMBERS = 6; // 1 live round in 6 — classic odds

const $ = (id: string): HTMLElement => document.getElementById(id)!;
const show = (el: HTMLElement) => el.classList.remove("hidden");
const hide = (el: HTMLElement) => el.classList.add("hidden");
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// Re-trigger an entrance animation each time an element (re)appears.
function slam(el: HTMLElement) {
  el.classList.remove("slam-in");
  void el.offsetWidth;
  el.classList.add("slam-in");
}

// a short mechanical tick
function tick(ctx: AudioContext, t: number, freq: number, gain: number) {
  const o = ctx.createOscillator(),
    g = ctx.createGain();
  o.type = "square";
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.001);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + 0.06);
}

async function fetchReal(): Promise<Bookmark[]> {
  const res = await fetch("/api/bookmarks");
  if (!res.ok) throw new Error("Could not load your bookmarks. Try signing in again.");
  return ((await res.json()).items ?? []) as Bookmark[];
}

export function initRoulette(): void {
  const stage = document.getElementById("stage");
  if (!stage) return;
  const mode: Mode = stage.dataset.mode === "real" ? "real" : "demo";

  const state: GameState = {
    mode,
    chamber: [],
    killed: 0,
    survived: 0,
    total: 0,
    current: null,
    firing: false,
  };
  let cylRotation = 0;

  // Real-mode chambers hold actual bookmark titles/URLs, and they can go
  // stale: daily.dev may delete or read them out from under a saved run, so a
  // resume can serve up a phantom bookmark whose DELETE 404s ("the gun
  // jammed") behind a stale-looking one. Demo mode plays with fixed mock data
  // that never goes stale, so only demo progress is ever persisted; real runs
  // always start fresh from a live /api/bookmarks fetch, and any leftover
  // real-mode chamber sitting in localStorage (e.g. from before this fix, or
  // another user's session on a shared machine) is wiped on load.
  function saveState() {
    if (state.mode !== "demo") return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          mode: state.mode,
          chamber: state.chamber,
          current: state.current,
          killed: state.killed,
          survived: state.survived,
          total: state.total,
        }),
      );
    } catch {}
  }
  function clearState() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }
  function loadState(): SavedState | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw) as SavedState | null;
      if (s && Array.isArray(s.chamber) && s.mode === "demo" && state.mode === "demo") {
        return s;
      }
      // Anything else found here (a real-mode chamber, a mismatched mode, or
      // junk) is stale or private — never resume from it, and clear it out.
      localStorage.removeItem(STORAGE_KEY);
      return null;
    } catch {
      return null;
    }
  }

  function renderStats() {
    $("stat-chamber").textContent = String(state.chamber.length);
    $("stat-killed").textContent = String(state.killed);
    $("stat-survived").textContent = String(state.survived);
  }

  function renderCard(b: Bookmark) {
    $("card-source").textContent = "alias: " + (b.source?.name || "unknown");
    $("card-title").textContent = b.title || b.url || "Untitled bookmark";
    $("card-summary").textContent = b.summary || "";
    const when = b.bookmarkedAt ? new Date(b.bookmarkedAt).toLocaleDateString() : "";
    $("card-meta").textContent = [
      b.readTime ? `${b.readTime} min read` : "",
      when ? `bookmarked ${when}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
  }

  // Friendly toast that pops above the gun. kind: "spare" | "miss" | "kill".
  let toastTimer: ReturnType<typeof setTimeout>;
  function showToast(msg: string, kind?: "spare" | "miss" | "kill") {
    const t = $("toast");
    t.className = "toast";
    t.textContent = msg;
    void t.offsetWidth;
    t.classList.add("show");
    if (kind) t.classList.add("toast--" + kind);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2900);
  }

  // --- synthesized sound (Web Audio, no asset files) ---
  let muted = false;
  try {
    muted = localStorage.getItem("ddr_muted") === "1";
  } catch {}
  let audioCtx: AudioContext | undefined;
  function ac(): AudioContext | undefined {
    if (!audioCtx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    audioCtx?.resume?.();
    return audioCtx;
  }
  function playSpin() {
    if (muted) return;
    const ctx = ac();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    let t = t0,
      gap = 0.028; // ratchet that decelerates with the cylinder
    while (t < t0 + 2.0) {
      tick(ctx, t, 1500, 0.16);
      t += gap;
      gap *= 1.13;
    }
  }
  function playClick() {
    if (muted) return;
    const ctx = ac();
    if (!ctx) return;
    const t = ctx.currentTime;
    tick(ctx, t, 900, 0.5);
    tick(ctx, t + 0.05, 600, 0.3);
  }
  function playBang() {
    if (muted) return;
    const ctx = ac();
    if (!ctx) return;
    const t = ctx.currentTime,
      dur = 0.4;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++)
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(2200, t);
    lp.frequency.exponentialRampToValueAtTime(200, t + 0.3);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(lp).connect(g).connect(ctx.destination);
    src.start(t);
    const o = ctx.createOscillator(),
      og = ctx.createGain(); // low thump
    o.type = "sine";
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.2);
    og.gain.setValueAtTime(0.7, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
    o.connect(og).connect(ctx.destination);
    o.start(t);
    o.stop(t + 0.3);
  }

  function startGame(bookmarks: Bookmark[]) {
    state.chamber = bookmarks.slice();
    state.killed = 0;
    state.survived = 0;
    state.total = bookmarks.length;
    state.current = null;
    hide($("over"));
    if (state.chamber.length === 0) return gameOver();
    hide($("verdict"));
    show($("spin"));
    renderStats();
    saveState();
  }

  function resumeGame(s: SavedState) {
    state.chamber = s.chamber;
    state.killed = s.killed;
    state.survived = s.survived;
    state.total = s.total;
    state.current = s.current || null;
    if (state.chamber.length === 0) return gameOver();
    renderStats();
    if (state.current) {
      renderCard(state.current);
      $("verdict-msg").textContent = "";
      ($("read") as HTMLButtonElement).disabled = false;
      ($("kill") as HTMLButtonElement).disabled = false;
      show($("verdict"));
      slam($("poster"));
      hide($("spin"));
    } else {
      hide($("verdict"));
      show($("spin"));
    }
  }

  function spin() {
    if (state.chamber.length === 0) return gameOver();
    hide($("spin"));
    hide($("verdict"));
    $("round").classList.remove("show");
    playSpin();
    const cyl = $("cylinder");
    cyl.classList.add("spinning");
    // Snap to a whole chamber so the hammer always lands ON a chamber, not between two.
    cylRotation += 1440 + Math.floor(Math.random() * CHAMBERS) * (360 / CHAMBERS);
    cyl.style.transform = `rotate(${cylRotation}deg)`;
    setTimeout(() => {
      cyl.classList.remove("spinning");
      const idx = Math.floor(Math.random() * state.chamber.length);
      state.current = state.chamber[idx];
      renderCard(state.current);
      $("verdict-msg").textContent = "";
      ($("read") as HTMLButtonElement).disabled = false;
      ($("kill") as HTMLButtonElement).disabled = false;
      show($("verdict"));
      slam($("poster"));
      saveState();
    }, 2200);
  }

  function removeCurrent() {
    state.chamber = state.chamber.filter((x) => x.id !== state.current!.id);
  }

  function read() {
    if (!state.current) return;
    window.open(state.current.url, "_blank", "noopener");
    removeCurrent();
    state.survived++;
    showToast("📖 Spared! Off you go to read it.", "spare");
    afterVerdict();
  }

  // Pull the trigger: gamble. Bullet under the hammer (1/CHAMBERS) = it dies.
  async function pullTrigger() {
    if (!state.current || state.firing) return;
    state.firing = true;
    const b = state.current;
    const hit = Math.floor(Math.random() * CHAMBERS) === 0;

    ($("read") as HTMLButtonElement).disabled = true;
    ($("kill") as HTMLButtonElement).disabled = true;
    $("verdict-msg").textContent = "";

    // hammer strike
    const hammer = $("hammer");
    hammer.classList.remove("fire");
    void hammer.offsetWidth;
    hammer.classList.add("fire");

    await wait(280); // wait for the hammer to fall (impact ~55% of the 0.5s anim)
    if (hit) playBang();
    else playClick();

    if (!hit) {
      // *click* — dodged. Advance the cylinder one notch.
      cylRotation += 60;
      $("cylinder").style.transform = `rotate(${cylRotation}deg)`;
      removeCurrent();
      state.survived++;
      showToast("😮‍💨 Click! Empty chamber — it dodged the bullet.", "miss");
      finishTrigger();
      return;
    }

    // BANG. In real mode, actually delete now.
    if (state.mode === "real") {
      try {
        const res = await fetch(`/api/bookmarks/${b.id}`, { method: "DELETE" });
        if (!res.ok && res.status !== 204) {
          const detail = await res.json().catch(() => ({}));
          throw new Error(detail.error || res.status);
        }
      } catch (e: any) {
        $("verdict-msg").textContent = "⚠️ The gun jammed: " + String(e.message || e);
        ($("read") as HTMLButtonElement).disabled = false;
        ($("kill") as HTMLButtonElement).disabled = false;
        state.firing = false;
        return;
      }
    }

    // reveal the live round in the firing chamber, then muzzle flash + recoil
    $("round").classList.add("show");
    const flash = $("flash");
    flash.classList.remove("bang");
    void flash.offsetWidth;
    flash.classList.add("bang");
    const stageEl = $("stage");
    stageEl.classList.remove("recoil");
    void stageEl.offsetWidth;
    stageEl.classList.add("recoil");

    removeCurrent();
    state.killed++;
    showToast(`💥 Bang! "${(b.title || "this one").slice(0, 32)}" didn't make it.`, "kill");
    finishTrigger();
  }

  function finishTrigger() {
    state.firing = false;
    afterVerdict();
  }

  function afterVerdict() {
    renderStats();
    state.current = null;
    saveState();
    setTimeout(() => {
      hide($("verdict"));
      if (state.chamber.length === 0) gameOver();
      else show($("spin"));
    }, 1300);
  }

  function gameOver() {
    clearState();
    hide($("verdict"));
    hide($("spin"));
    $("over-total").textContent = String(state.total);
    $("over-killed").textContent = String(state.killed);
    $("over-survived").textContent = String(state.survived);
    show($("over"));
  }

  function updateMute() {
    $("mute").textContent = muted ? "🔇" : "🔊";
  }
  $("mute").addEventListener("click", () => {
    muted = !muted;
    try {
      localStorage.setItem("ddr_muted", muted ? "1" : "0");
    } catch {}
    updateMute();
    if (!muted) ac(); // unlock the audio context on unmute
  });
  updateMute();

  $("spin").addEventListener("click", spin);
  $("read").addEventListener("click", read);
  $("kill").addEventListener("click", pullTrigger);
  $("restart").addEventListener("click", async () => {
    if (state.mode === "demo") return startGame(MOCK_BOOKMARKS);
    hide($("over"));
    show($("loading"));
    try {
      startGame(await fetchReal());
    } catch (e: any) {
      $("loading").textContent = "⚠️ " + String(e.message || e);
      return;
    }
    hide($("loading"));
  });

  (async () => {
    const saved = loadState();
    if (saved) {
      hide($("loading"));
      resumeGame(saved);
      return;
    }
    if (state.mode === "demo") {
      hide($("loading"));
      startGame(MOCK_BOOKMARKS);
    } else {
      try {
        startGame(await fetchReal());
      } catch (e: any) {
        $("loading").textContent = "⚠️ " + String(e.message || e);
        return;
      }
      hide($("loading"));
    }
  })();
}
