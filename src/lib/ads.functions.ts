import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const COOLDOWN_FALLBACK = 12 * 60 * 60; // 12h

export const getAdSlots = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ initData: z.string().min(10) }).parse(d))
  .handler(async ({ data }) => {
    const { requireProfile, getSetting } = await import("./tg-auth.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { profile } = await requireProfile(data.initData);
    const cd = Number(await getSetting("ad_cooldown_seconds", COOLDOWN_FALLBACK));
    const timers = (await getSetting("ad_timer_seconds", [17, 33, 25])) as number[];
    const reward = Number(await getSetting("ad_reward_coins", 50));
    const nets = (await getSetting("ad_networks", { placeholder: true })) as Record<string, boolean>;

    const slots = ["watch1", "watch2", "watch3"];
    const since = new Date(Date.now() - cd * 1000).toISOString();
    const { data: rows } = await supabaseAdmin
      .from("ad_views")
      .select("slot, created_at")
      .eq("tg_id", profile.tg_id)
      .gte("created_at", since);
    const lastBySlot = new Map<string, string>();
    for (const r of rows ?? []) {
      const prev = lastBySlot.get(r.slot);
      if (!prev || new Date(r.created_at) > new Date(prev)) lastBySlot.set(r.slot, r.created_at);
    }

    const now = Date.now();
    return {
      cooldown_seconds: cd,
      reward,
      networks: nets,
      slots: slots.map((slot, i) => {
        const last = lastBySlot.get(slot);
        const unlocks_at = last ? new Date(last).getTime() + cd * 1000 : 0;
        return {
          slot,
          timer_seconds: timers[i] ?? 20,
          ready: unlocks_at <= now,
          unlocks_in_ms: Math.max(0, unlocks_at - now),
        };
      }),
    };
  });

const ClaimSchema = z.object({
  initData: z.string().min(10),
  slot: z.enum(["watch1", "watch2", "watch3", "revive", "task", "daily"]),
  network: z.string().max(64).optional(),
});

export const claimAd = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ClaimSchema.parse(d))
  .handler(async ({ data }) => {
    const { requireProfile, getSetting, creditCoins } = await import("./tg-auth.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { profile } = await requireProfile(data.initData);
    const cd = Number(await getSetting("ad_cooldown_seconds", COOLDOWN_FALLBACK));
    const reward = Number(await getSetting("ad_reward_coins", 50));

    if (data.slot.startsWith("watch")) {
      const since = new Date(Date.now() - cd * 1000).toISOString();
      const { data: recent } = await supabaseAdmin
        .from("ad_views")
        .select("id")
        .eq("tg_id", profile.tg_id)
        .eq("slot", data.slot)
        .gte("created_at", since)
        .limit(1);
      if (recent && recent.length) throw new Error("Slot is still on cooldown");
    }

    await supabaseAdmin.from("ad_views").insert({
      tg_id: profile.tg_id,
      slot: data.slot,
      network: data.network ?? null,
      reward,
    });
    await supabaseAdmin
      .from("profiles")
      .update({ ads_watched: (profile.ads_watched ?? 0) + 1 })
      .eq("tg_id", profile.tg_id);

    const new_balance = await creditCoins(profile.tg_id, reward, "ad_watch", { slot: data.slot });
    // Try to verify referral
    await supabaseAdmin.rpc("maybe_verify_referral", { p_referee_tg_id: profile.tg_id });

    return { reward, new_balance };
  });
