# Subscription Calendar

A visual calendar app to track and manage all your recurring subscriptions in one place.

> [!NOTE]
> **Inspiration/Acknowledgement**
>
> Inspired by a component created by [LN dev](https://github.com/ln-dev7): <https://ui.lndev.me/components/subscriptions-calendar>

## Features

- Monthly calendar view of all upcoming payments
- Add, edit and delete subscriptions in-app (no spreadsheet needed)
- Brand icons auto-resolved via [simple-icons](https://simpleicons.org/) with initials fallback
- Category grouping (Entertainment, Music, Productivity, …)
- Monthly spending summary & pie chart
- Dark/light mode, locale support
- Google OAuth login — access restricted to an invite-only email allowlist
- Demo mode for exploring without an account

## Tech stack

- [Next.js 16](https://nextjs.org/) / React / TypeScript
- [Tailwind CSS](https://tailwindcss.com/)
- [Supabase](https://supabase.com/) — Postgres database + Google OAuth
- [simple-icons](https://simpleicons.org/) — brand icon library
- [bun](https://bun.sh/) — package manager / runtime

---

## Local development

### Prerequisites

- [bun](https://bun.sh/) (Windows: `irm bun.sh/install.ps1 | iex`)
- A [Supabase](https://supabase.com/) project (free tier is fine)
- A Google Cloud project with OAuth credentials (see below)

### 1. Clone & install

```bash
git clone https://github.com/Barokai/subscription-calendar.git
cd subscription-calendar
bun install
```

### 2. Environment variables

Copy the example and fill in your values:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
ALLOWED_EMAILS=you@example.com,friend@example.com
```

### 3. Run

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

> The dev server tries HTTPS first (`--experimental-https`). If it fails, run `mkcert -install` in an admin PowerShell session and try again, or just use plain HTTP.

---

## Supabase setup

### Create the project

1. Go to [supabase.com](https://supabase.com/) → New project
2. Recommended security settings:
   - ✅ Enable Data API
   - ❌ Automatically expose new tables (disable — control access manually)
   - ✅ Enable automatic RLS

### Run the schema

Open **SQL Editor** in your Supabase dashboard and run the contents of [`supabase/schema.sql`](supabase/schema.sql).

This creates the `subscriptions` table, grants the `authenticated` role access, enables Row Level Security (each user sees only their own rows), and adds an `updated_at` trigger.

### Enable Google OAuth

Follow the [Supabase Google Auth guide](https://supabase.com/docs/guides/auth/social-login/auth-google), then:

1. In **Supabase → Authentication → Providers → Google**, enable Google and paste your Client ID and Client Secret.
2. In **Supabase → Authentication → URL Configuration**:
   - **Site URL**: `https://your-domain.com`
   - **Redirect URLs** (add both):
     ```
     https://your-domain.com/auth/callback
     https://deploy-preview-*--your-netlify-site.netlify.app/auth/callback
     ```
3. In **Google Cloud Console → OAuth Client → Authorized redirect URIs**, add:
   ```
   https://<your-supabase-project-ref>.supabase.co/auth/v1/callback
   ```

---

## Netlify deployment

Set these environment variables in **Netlify → Site configuration → Environment variables**:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `ALLOWED_EMAILS` | Comma-separated list of allowed Google account emails |

---

## Troubleshooting

**Redirected to `localhost` after Google login**
> Supabase's Site URL is still set to `localhost:3000`. Update it to your production URL in Supabase → Authentication → URL Configuration.

**`permission denied for table subscriptions`**
> The `authenticated` role is missing table grants. Re-run `supabase/schema.sql` (it includes `GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated`).

**Access denied page after login**
> Your Google account email is not in `ALLOWED_EMAILS`. Add it and redeploy.

---

## Disclaimer

Parts of this project were developed with the assistance of AI tools, including GitHub Copilot and Claude Sonnet.

## License

MIT — see [LICENSE](LICENSE).
