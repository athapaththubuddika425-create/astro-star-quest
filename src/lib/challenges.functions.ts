import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

function periodKey(period: string): string {
  const now = new Date();
  if (period === "weekly") {
    const onejan = new Date(now.getFullYear(), 0, 1);
    const week = Math.ceil(((+now - +onejan) / 86400000 + onejan.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${week}`;
  }
  return now.toISOString().slice(0, 10);
}

export const listChallenges = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ initData: z.string().min(10) }).parse(d))
  .handler(async ({ data }) => {
    const { requireProfile } = await import("./tg-auth.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { profile } = await requireProfile(data.initData);
    const { data: chs } = await supabaseAdmin
      .from("challenges")
      .select("*")
      .eq("is_active", true);

    const results = [] as Array<{
      id: string; title: string; description: string | null; kind: string;
      goal: number; reward: number; period: string;
      progress: number; claimed: boolean;
    }>;
    for (const c of chs ?? []) {
      const pk = periodKey(c.period);
      const start = c.period === "weekly"
        ? new Date(Date.now() - 7 * 86400000).toISOString()
        : new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
      let progress = 0;
      if (c.kind === "ads") {
        const { count } = await supabaseAdmin
          .from("ad_views").select("id", { count: "exact", head: true })
          .eq("tg_id", profile.tg_id).gte("created_at", start);
        progress = count ?? 0;
      } else if (c.kind === "game_level") {
        const { data: m } = await supabaseAdmin
          .from("game_plays").select("level_reached")
          .eq("tg_id", profile.tg_id).gte("created_at", start)
          .order("level_reached", { ascending: false }).limit(1);
        progress = m?.[0]?.level_reached ?? 0;
      } else if (c.kind === "refers") {
        const { count } = await supabaseAdmin
          .from("profiles").select("tg_id", { count: "exact", head: true })
          .eq("referrer_tg_id", profile.tg_id).gte("created_at", start);
        progress = count ?? 0;
      }
      const { data: claim } = await supabaseAdmin
        .from("challenge_claims").select("id")
        .eq("tg_id", profile.tg_id).eq("challenge_id", c.id).eq("period_key", pk).maybeSingle();
      results.push({
        id: c.id, title: c.title, description: c.description, kind: c.kind,
        goal: c.goal, reward: Number(c.reward), period: c.period,
        progress, claimed: !!claim,
      });
    }
    return results;
  });

export const claimChallenge = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ initData: z.string().min(10), challenge_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { requireProfile, creditCoins } = await import("./tg-auth.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { profile } = await requireProfile(data.initData);
    const { data: c } = await supabaseAdmin
      .from("challenges").select("*").eq("id", data.challenge_id).maybeSingle();
    if (!c || !c.is_active) throw new Error("Challenge not available");
    const pk = periodKey(c.period);
    const { error } = await supabaseAdmin
      .from("challenge_claims").insert({ tg_id: profile.tg_id, challenge_id: c.id, period_key: pk });
    if (error) throw new Error("Already claimed for this period");
    const new_balance = await creditCoins(profile.tg_id, Number(c.reward), "challenge", { challenge_id: c.id });
    return { reward: Number(c.reward), new_balance };
  });
