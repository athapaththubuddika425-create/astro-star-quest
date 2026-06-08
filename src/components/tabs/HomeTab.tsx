import { ASTROBLITZ_LOGO_URL } from "@/lib/assets";
import type { Profile, TabId } from "../MainApp";

export default function HomeTab({ profile, go }: { profile: Profile; go: (t: TabId) => void }) {
  return (
    <div>
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-2xl border border-border bg-card">
            <img src={ASTROBLITZ_LOGO_URL} alt="" className="h-9 w-9 object-contain" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Pilot</p>
            <p className="max-w-[180px] truncate text-sm font-bold">
              {profile.first_name ?? "Astronaut"}
              {profile.username && <span className="text-muted-foreground"> @{profile.username}</span>}
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card/60 px-3 py-1.5 text-xs font-bold" style={{ boxShadow: "var(--shadow-glow-cyan)" }}>
          🆔 <span className="text-cyan-accent">{profile.tg_id}</span>
        </div>
      </header>

      <section className="mt-5 rounded-3xl border border-border p-5" style={{ background: "linear-gradient(160deg, color-mix(in oklab, var(--primary) 22%, var(--card)) 0%, var(--card) 100%)", boxShadow: "var(--shadow-glow-purple)" }}>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Balance</p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="ab-shimmer-text text-4xl font-black">
            {Number(profile.coins).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
          <span className="text-sm font-bold text-gold">coins</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          ≈ ${(Number(profile.coins) * 0.0001).toFixed(4)} USD
        </p>
        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
          <Stat label="Level" value={profile.game_level} />
          <Stat label="Ads" value={profile.ads_watched} />
          <Stat label="Refers" value={profile.verified_refer_count} />
          <Stat label="$Out" value={Number(profile.total_withdraw).toFixed(2)} />
        </div>
      </section>

      <button onClick={() => go("game")} className="mt-5 w-full rounded-3xl border border-border p-5 text-left transition active:scale-[0.98]" style={{ background: "linear-gradient(135deg, color-mix(in oklab, var(--gold) 28%, var(--card)), var(--card))", boxShadow: "var(--shadow-glow-gold)" }}>
        <div className="flex items-center gap-4">
          <div className="text-5xl ab-float">🚀</div>
          <div className="flex-1">
            <p className="text-base font-extrabold">Tap-to-fly Rocket</p>
            <p className="text-xs text-muted-foreground">Earn 5–20 coins per level cleared</p>
          </div>
          <span className="text-xl">▶️</span>
        </div>
      </button>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <QuickCard icon="📺" label="Watch ads" sub="Up to 3 ads / 12h" onClick={() => go("watch")} />
        <QuickCard icon="✅" label="Tasks" sub="Daily missions" onClick={() => go("task")} />
        <QuickCard icon="👥" label="Invite friends" sub="10% lifetime commission" onClick={() => go("refer")} />
        <QuickCard icon="💸" label="Withdraw" sub="TON • USDT" onClick={() => go("withdraw")} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-background/40 px-2 py-2">
      <p className="text-base font-bold">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function QuickCard({ icon, label, sub, onClick }: { icon: string; label: string; sub: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-2xl border border-border bg-card/70 p-4 text-left transition active:scale-[0.97]">
      <div className="text-2xl">{icon}</div>
      <p className="mt-2 text-sm font-bold">{label}</p>
      <p className="text-[11px] text-muted-foreground">{sub}</p>
    </button>
  );
}
