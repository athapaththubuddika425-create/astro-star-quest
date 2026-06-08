import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getAdSlots, claimAd } from "@/lib/ads.functions";

type Slot = { slot: string; timer_seconds: number; ready: boolean; unlocks_in_ms: number };

export default function WatchTab({ initData, onCoins }: { initData: string; onCoins: (c: number) => void }) {
  const load = useServerFn(getAdSlots);
  const claim = useServerFn(claimAd);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [reward, setReward] = useState(50);
  const [networks, setNetworks] = useState<Record<string, boolean>>({ placeholder: true });
  const [busy, setBusy] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  async function refresh() {
    const r = await load({ data: { initData } });
    setSlots(r.slots as Slot[]);
    setReward(r.reward);
    setNetworks(r.networks);
  }
  useEffect(() => { refresh().catch(console.error); }, []);
  useEffect(() => {
    const t = setInterval(() => {
      setSlots((s) => s.map((x) => ({ ...x, unlocks_in_ms: Math.max(0, x.unlocks_in_ms - 1000), ready: x.unlocks_in_ms <= 1000 })));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  async function startWatch(slot: Slot) {
    setBusy(slot.slot); setCountdown(slot.timer_seconds);
    // Placeholder ad: count down N seconds, then claim.
    const t = setInterval(() => {
      setCountdown((c) => {
        if (c === null) return null;
        if (c <= 1) { clearInterval(t); finish(slot); return 0; }
        return c - 1;
      });
    }, 1000);
  }
  async function finish(slot: Slot) {
    try {
      const net = Object.entries(networks).find(([, v]) => v)?.[0] ?? "placeholder";
      const r = await claim({ data: { initData, slot: slot.slot as "watch1", network: net } });
      onCoins(r.new_balance);
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred("success");
      await refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(null); setCountdown(null);
    }
  }

  return (
    <div>
      <h2 className="text-xl font-extrabold">📺 Watch & Earn</h2>
      <p className="text-xs text-muted-foreground">Reward: <b className="text-gold">{reward} coins</b> per ad • 12h cooldown each slot.</p>
      <div className="mt-4 space-y-3">
        {slots.map((s, idx) => (
          <div key={s.slot} className="rounded-2xl border border-border bg-card/70 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">Ad Slot {idx + 1}</p>
                <p className="text-xs text-muted-foreground">Watch for {s.timer_seconds}s</p>
              </div>
              {busy === s.slot ? (
                <div className="rounded-xl bg-primary/20 px-4 py-2 text-sm font-bold">
                  ⏳ {countdown}s
                </div>
              ) : s.ready ? (
                <button onClick={() => startWatch(s)} className="rounded-xl px-4 py-2 text-sm font-bold text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
                  Watch +{reward}
                </button>
              ) : (
                <div className="rounded-xl border border-border px-4 py-2 text-xs">
                  ⏰ {formatTime(s.unlocks_in_ms)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-2xl border border-dashed border-border bg-card/40 p-4 text-center text-xs text-muted-foreground">
        Ad networks: {Object.entries(networks).filter(([, v]) => v).map(([k]) => k).join(", ") || "placeholder"}
      </div>
    </div>
  );
}

function formatTime(ms: number) {
  const s = Math.ceil(ms / 1000);
  const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = s % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${sec}s`;
  return `${sec}s`;
}
