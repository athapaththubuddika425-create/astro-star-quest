import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const FinishSchema = z.object({
  initData: z.string().min(10).max(8192),
  level_reached: z.number().int().min(0).max(10000),
  revived: z.boolean().optional(),
  ad_verified: z.boolean(), // server requires confirmed ad-completion to credit coins
});

export const finishGame = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => FinishSchema.parse(d))
  .handler(async ({ data }) => {
    const { requireProfile, creditCoins } = await import("./tg-auth.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { profile } = await requireProfile(data.initData);

    if (!data.ad_verified) throw new Error("Ad must be watched before claiming coins");

    // 1 coin per level passed.
    const reward = Math.max(0, data.level_reached);

    await supabaseAdmin.from("game_plays").insert({
      tg_id: profile.tg_id,
      level_reached: data.level_reached,
      coins_earned: reward,
      revived: !!data.revived,
    });

    const nextLevel = Math.max(profile.game_level ?? 1, data.level_reached + 1);
    if (nextLevel !== profile.game_level) {
      await supabaseAdmin.from("profiles").update({ game_level: nextLevel }).eq("tg_id", profile.tg_id);
    }

    let new_balance = Number(profile.coins);
    if (reward > 0) {
      new_balance = await creditCoins(profile.tg_id, reward, "game_level", {
        level: data.level_reached,
        revived: !!data.revived,
      });
    }

    return { reward, new_balance, next_level: nextLevel };
  });

