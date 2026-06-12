## ස්කෝප් (අද දවසේ ඉවර කරන්න)

### 1. Netlify + GitHub host compat
- `netlify.toml` එක add කරනවා — TanStack Start Netlify preset (`nitro` netlify target) sets done via `vite.config.ts` server preset switch.
- `package.json` build script: `vite build` (already), publish dir = `dist`, functions auto-handled.
- `.env.example` එකට require වෙන env vars list කරනවා: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `TELEGRAM_BOT_TOKEN`, `LOVABLE_API_KEY` (optional).
- README එකේ Netlify deploy steps + GitHub sync steps.
- **සටහන:** Lovable preview එක තවදුරටත් වැඩ කරයි. Netlify production cron URL වෙනස් වෙන නිසා DB එකේ stored cron URLs admin Settings → "Site URL" එකෙන් override කරන්න පුළුවන් කරනවා.

### 2. Admin gate වෙනස් කිරීම
- `/admin` route එක delete කරනවා.
- Mini app එක ඇතුළත `tg_id === ADMIN_TG_ID` (app_settings key) user ට පමණක් වෙනම **Admin** tab එකක් render කරනවා (අනිත් අයට hidden).
- Admin tab එක තුළ දැනටමත් තියෙන full admin panel (Users, Ads, Withdrawals, Community, Settings, Profile) move කරනවා — re-use the existing components, no logic re-write.

### 3. Withdraw requirements සම්පූර්ණ කිරීම
- Server `requestWithdraw` එකේ check කරනවා: `min_ads`, `min_refers`, `min_level`, `min_referrer_verified` ඔක්කොම. Admin Settings UI එකේත් මේ සියල්ල edit කරන්න පුළුවන් කරනවා.
- UI එකේ requirement progress bars පෙන්වනවා (X / Y ads, X / Y refers, level X / Y).

### 4. TON live price fix
- CoinGecko + Binance + OKX (3-way) fallback. Cache TTL 60s. Server `refreshPrices` රාජකාරිය නැවත ලියනවා error logging එක්ක.
- Withdraw tab එකේ "Live price" badge + last-update time පෙන්වනවා.

### 5. Daily reminder messages ලස්සන කරන එක
- Banner photo එක Lovable assets වලට upload කරනවා (user upload එක).
- `daily-reminder` cron එක `sendPhoto` use කරනවා, emoji-rich caption + "🚀 Open AstroBlitz" inline button. 3 variants (morning/afternoon/evening) — random pick.

### 6. Color + card animations
- `styles.css` එකට cosmic gradient keyframes (`aurora`, `float`, `glow-pulse`) add කරනවා.
- Tab cards වලට animated gradient border + hover glow. Splash logo orbit ring animation. Coin counter count-up animation.

### 7. End-to-end bug sweep
- WatchTab: ad-completion gate verify (no premature reward).
- GameTab: claim popup → ad → server credit (1 coin/level).
- Withdraw: pending block + channel/admin Telegram posts (with emoji) verified.
- Welcome message: USDT_BEP20 wording check.
- Suspended user flow: full lock except support ticket — verify.

## Technical details

- **Netlify adapter:** TanStack Start uses Vite + Nitro under the hood. Switch via `vite.config.ts` adding `nitro: { preset: 'netlify' }` or rely on `@netlify/vite-plugin-tanstack-start` if available. Server functions and `/api/public/*` routes deploy as Netlify Functions automatically.
- **Files touched:** `netlify.toml` (new), `vite.config.ts`, `README.md`, `.env.example` (new), `src/routes/admin.tsx` (delete), `src/components/tabs/AdminTab.tsx` (new — wraps existing admin code), `src/components/MainApp.tsx` (conditional admin tab), `src/lib/withdraw.functions.ts`, `src/components/tabs/WithdrawTab.tsx`, `src/routes/api/public/cron/daily-reminder.ts`, `src/styles.css`, plus a migration for new settings keys (`min_level`, `min_referrer_verified`, `site_url`).
- **Migration:** 1 migration — settings keys + admin_tg_id seed (if missing).
- **Image asset:** upload user banner via lovable-assets CLI → `src/assets/promo-banner.asset.json`.

## ඉදිරියට

මේ plan එක approve කරන්න — එතකොට මම මෙය එක batch එකකින් implement කරනවා (parallel file writes + 1 migration), credits අඩුවෙන් යනවා.