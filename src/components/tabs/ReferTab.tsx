import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getReferStats } from "@/lib/refer.functions";

type Stats = Awaited<ReturnType<typeof getReferStats>>;

export default function ReferTab({ initData }: { initData: string }) {
  const get = useServerFn(getReferStats);
  const [s, setS] = useState<Stats | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => { get({ data: { initData } }).then(setS).catch(console.error); }, []);

  if (!s) return <p className="text-center text-sm text-muted-foreground">Loading…</p>;

  async function copy() {
    await navigator.clipboard.writeText(s!.share_url);
    setCopied(true);
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred("success");
    setTimeout(() => setCopied(false), 1500);
  }
  function share() {
    const url = `https://t.me/share/url?url=${encodeURIComponent(s!.share_url)}&text=${encodeURIComponent("🚀 Join me on AstroBlitz — play games and earn crypto!")}`;
    window.Telegram?.WebApp?.openTelegramLink?.(url) ?? window.open(url, "_blank");
  }

  return (
    <div>
      <h2 className="text-xl font-extrabold">👥 Invite & Earn</h2>
      <p className="text-xs text-muted-foreground">
        Get <b className="text-gold">{s.reward_per_verified} coins</b> per verified refer (friend must watch {s.ads_needed} ads) and <b className="text-gold">{s.commission_pct}%</b> lifetime commission on their earnings.
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Mini label="Total" value={s.total_refers} />
        <Mini label="Verified" value={s.verified_refers} />
        <Mini label="Commission" value={s.earned_commission.toFixed(0)} />
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-card/70 p-4">
        <p className="text-xs text-muted-foreground">Your refer link</p>
        <p className="mt-1 break-all text-xs font-mono">{s.share_url}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={copy} className="h-10 rounded-xl border border-border text-sm font-bold">
            {copied ? "✓ Copied" : "📋 Copy"}
          </button>
          <button onClick={share} className="h-10 rounded-xl text-sm font-bold text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
            📤 Share
          </button>
        </div>
      </div>

      <h3 className="mt-6 text-sm font-bold">Your invited friends</h3>
      <div className="mt-2 space-y-1">
        {s.list.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">No invites yet. Share your link!</p>
        )}
        {s.list.map((u) => (
          <div key={u.tg_id} className="flex items-center justify-between rounded-xl border border-border bg-card/40 px-3 py-2 text-xs">
            <span>{u.first_name ?? "Friend"} {u.username && <span className="text-muted-foreground">@{u.username}</span>}</span>
            <span className={u.ads_watched >= s.ads_needed ? "font-bold text-green-300" : "text-muted-foreground"}>
              {u.ads_watched}/{s.ads_needed} ads
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 px-2 py-2">
      <p className="text-base font-bold">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}
