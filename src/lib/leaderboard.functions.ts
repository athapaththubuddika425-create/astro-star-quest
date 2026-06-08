import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getLeaderboard = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ initData: z.string().min(10) }).parse(d))
  .handler(async ({ data }) => {
    const { requireProfile } = await import("./tg-auth.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { profile } = await requireProfile(data.initData);
    const { data: top } = await supabaseAdmin
      .from("profiles")
      .select("tg_id, first_name, username, coins, verified_refer_count")
      .eq("is_suspended", false)
      .order("coins", { ascending: false })
      .limit(100);
    const me_rank =
      (top ?? []).findIndex((r) => r.tg_id === profile.tg_id) + 1 || null;
    return { top: top ?? [], me_rank, me_coins: profile.coins };
  });
