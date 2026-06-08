import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getWithdrawData, saveWallet, requestWithdraw } from "@/lib/withdraw.functions";
import { createTicket, listTickets } from "@/lib/support.functions";
import type { Profile } from "../MainApp";

type Data = Awaited<ReturnType<typeof getWithdrawData>>;

export default function WithdrawTab({ initData, profile, onCoins }: { initData: string; profile: Profile; onCoins: (c: number) => void }) {
  const get = useServerFn(getWithdrawData);
  const save = useServerFn(saveWallet);
  const submit = useServerFn(requestWithdraw);
  const ticket = useServerFn(createTicket);
  const mineTickets = useServerFn(listTickets);
  const [d, setD] = useState<Data | null>(null);
  const [currency, setCurrency] = useState<"TON" | "USDT_APTOS">("TON");
  const [amount, setAmount] = useState("");
  const [walletTon, setWalletTon] = useState("");
  const [walletUsdt, setWalletUsdt] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<"withdraw" | "history" | "support">("withdraw");
  const [supportSubject, setSupportSubject] = useState("");
  const [supportBody, setSupportBody] = useState("");
  const [supportSent, setSupportSent] = useState(false);

  async function refresh() {
    const r = await get({ data: { initData } });
    setD(r); setWalletTon(r.wallet_ton); setWalletUsdt(r.wallet_usdt_aptos);
  }
  useEffect(() => { refresh().catch((e) => setErr(String(e))); }, []);

  async function onSaveWallet() {
    setMsg(null); setErr(null);
    try {
      await save({ data: { initData, wallet_ton: walletTon, wallet_usdt_aptos: walletUsdt } });
      setMsg("Wallets saved");
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
  }

  async function onWithdraw() {
    setMsg(null); setErr(null);
    const coins = Math.floor(Number(amount));
    if (!coins) { setErr("Enter amount in coins"); return; }
    try {
      const w = await submit({ data: { initData, currency, coins } });
      setMsg(`Request submitted — ${Number(w.net_amount).toFixed(6)} ${currency}`);
      setAmount("");
      onCoins(Number(profile.coins) - coins);
      await refresh();
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
  }

  async function sendSupport() {
    if (!supportSubject || !supportBody) return;
    try {
      await ticket({ data: { initData, subject: supportSubject, body: supportBody } });
      setSupportSent(true); setSupportSubject(""); setSupportBody("");
      await mineTickets({ data: { initData } });
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
  }

  if (!d) return <p className="text-center text-sm text-muted-foreground">Loading…</p>;

  const previewUsd = (Number(amount) || 0) * d.coin_to_usd_rate;
  const previewPrice = currency === "TON" ? d.prices.TON : d.prices.USDT;
  const previewNative = previewPrice > 0 ? previewUsd / previewPrice : 0;
  const previewNet = previewNative * (1 - d.fee_pct / 100);
  const overLimit = Number(amount) > d.coins;
  const underMin = previewUsd < d.min_withdraw_usd;

  return (
    <div>
      <h2 className="text-xl font-extrabold">💸 Withdraw</h2>
      <div className="mt-2 rounded-2xl border border-border bg-card/70 p-3 text-xs">
        Balance: <b className="text-gold">{Number(d.coins).toLocaleString()}</b> coins ≈ ${d.usd_balance.toFixed(4)}<br />
        1 TON = ${d.prices.TON.toFixed(3)} • 1 USDT = ${d.prices.USDT.toFixed(3)} • Fee {d.fee_pct}% • Min ${d.min_withdraw_usd}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1 rounded-2xl border border-border bg-card/50 p-1">
        {(["withdraw", "history", "support"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-xl py-2 text-xs font-bold capitalize ${tab === t ? "text-primary-foreground" : "text-muted-foreground"}`} style={tab === t ? { background: "var(--gradient-primary)" } : undefined}>{t}</button>
        ))}
      </div>

      {tab === "withdraw" && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setCurrency("TON")} className={`rounded-xl border border-border py-3 text-sm font-bold ${currency === "TON" ? "text-primary-foreground" : "text-muted-foreground"}`} style={currency === "TON" ? { background: "var(--gradient-primary)" } : undefined}>💎 TON</button>
            <button onClick={() => setCurrency("USDT_APTOS")} className={`rounded-xl border border-border py-3 text-sm font-bold ${currency === "USDT_APTOS" ? "text-primary-foreground" : "text-muted-foreground"}`} style={currency === "USDT_APTOS" ? { background: "var(--gradient-primary)" } : undefined}>💵 USDT (Aptos)</button>
          </div>

          <div className="rounded-2xl border border-border bg-card/70 p-3">
            <label className="text-xs text-muted-foreground">{currency === "TON" ? "TON wallet address" : "USDT Aptos wallet address"}</label>
            <input
              value={currency === "TON" ? walletTon : walletUsdt}
              onChange={(e) => (currency === "TON" ? setWalletTon(e.target.value) : setWalletUsdt(e.target.value))}
              className="mt-1 w-full rounded-xl bg-background px-3 py-2 text-sm outline-none"
              placeholder="UQ… or 0x…"
            />
            <button onClick={onSaveWallet} className="mt-2 text-xs underline text-cyan-accent">Save wallets</button>
          </div>

          <div className="rounded-2xl border border-border bg-card/70 p-3">
            <label className="text-xs text-muted-foreground">Amount (coins)</label>
            <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" className="mt-1 w-full rounded-xl bg-background px-3 py-2 text-lg font-bold outline-none" placeholder="0" />
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>≈ ${previewUsd.toFixed(4)}</div>
              <div className="text-right">Net: <b className="text-foreground">{previewNet.toFixed(6)} {currency === "TON" ? "TON" : "USDT"}</b></div>
            </div>
            {overLimit && <p className="mt-1 text-xs text-destructive">Exceeds balance</p>}
            {underMin && Number(amount) > 0 && <p className="mt-1 text-xs text-destructive">Below ${d.min_withdraw_usd} minimum</p>}
            <button onClick={onWithdraw} disabled={!amount || overLimit || underMin} className="mt-3 h-11 w-full rounded-xl text-sm font-bold text-primary-foreground disabled:opacity-50" style={{ background: "var(--gradient-blitz)" }}>
              Request withdraw
            </button>
          </div>

          {msg && <p className="rounded-xl bg-green-500/15 px-3 py-2 text-xs text-green-300">{msg}</p>}
          {err && <p className="rounded-xl bg-destructive/15 px-3 py-2 text-xs text-destructive">{err}</p>}
        </div>
      )}

      {tab === "history" && (
        <div className="mt-4 space-y-2">
          {d.history.length === 0 && <p className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">No withdrawals yet.</p>}
          {d.history.map((w) => (
            <div key={w.id} className="rounded-xl border border-border bg-card/60 p-3 text-xs">
              <div className="flex justify-between">
                <span><b>{Number(w.net_amount).toFixed(6)}</b> {w.currency}</span>
                <Status status={w.status} />
              </div>
              <p className="text-muted-foreground">{Number(w.coins).toLocaleString()} coins • ${Number(w.amount_usd).toFixed(4)}</p>
              <p className="text-muted-foreground">{new Date(w.created_at).toLocaleString()}</p>
              {w.tx_id && <p className="font-mono text-cyan-accent break-all">TX: {w.tx_id}</p>}
              {w.admin_note && <p className="text-muted-foreground">Note: {w.admin_note}</p>}
            </div>
          ))}
        </div>
      )}

      {tab === "support" && (
        <div className="mt-4 space-y-3">
          <p className="text-xs text-muted-foreground">Open a support ticket. We reply through the bot.</p>
          <input value={supportSubject} onChange={(e) => setSupportSubject(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none" placeholder="Subject" />
          <textarea value={supportBody} onChange={(e) => setSupportBody(e.target.value)} rows={4} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none" placeholder="Describe your issue…" />
          <button onClick={sendSupport} className="h-11 w-full rounded-xl text-sm font-bold text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>Send ticket</button>
          {supportSent && <p className="rounded-xl bg-green-500/15 px-3 py-2 text-xs text-green-300">Ticket sent — we'll reply through the bot.</p>}
        </div>
      )}
    </div>
  );
}

function Status({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-300",
    approved: "bg-green-500/20 text-green-300",
    rejected: "bg-destructive/20 text-destructive",
    failed: "bg-destructive/20 text-destructive",
  };
  return <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold capitalize ${map[status] ?? "bg-muted"}`}>{status}</span>;
}
