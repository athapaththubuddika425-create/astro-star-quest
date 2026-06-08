import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const listTasks = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ initData: z.string().min(10) }).parse(d))
  .handler(async ({ data }) => {
    const { requireProfile } = await import("./tg-auth.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { profile } = await requireProfile(data.initData);

    const { data: tasks } = await supabaseAdmin
      .from("tasks")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    const { data: done } = await supabaseAdmin
      .from("task_completions")
      .select("task_id")
      .eq("tg_id", profile.tg_id);
    const doneSet = new Set((done ?? []).map((d) => d.task_id));
    return (tasks ?? []).map((t) => ({ ...t, completed: doneSet.has(t.id) }));
  });

export const completeTask = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ initData: z.string().min(10), task_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { requireProfile, creditCoins } = await import("./tg-auth.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { profile } = await requireProfile(data.initData);

    const { data: task, error: te } = await supabaseAdmin
      .from("tasks")
      .select("id,reward,is_active")
      .eq("id", data.task_id)
      .maybeSingle();
    if (te || !task || !task.is_active) throw new Error("Task not available");

    const { error: ce } = await supabaseAdmin
      .from("task_completions")
      .insert({ tg_id: profile.tg_id, task_id: task.id });
    if (ce) throw new Error("Already completed");

    const new_balance = await creditCoins(profile.tg_id, Number(task.reward), "task", {
      task_id: task.id,
    });
    return { reward: Number(task.reward), new_balance };
  });
