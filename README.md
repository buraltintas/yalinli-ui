# yalinli-ui

Next.js frontend + BFF layer for `yalinli.org`.

## Setup

1. Copy `.env.example` to `.env.local`
2. Install deps: `npm install`
3. Run: `npm run dev`

## Environment Variables

- `YALINLI_API_BASE_URL`
- `YALINLI_API_BFF_SECRET` (server-only, never expose)
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SITE_NAME`
- `NEXT_PUBLIC_DEFAULT_LANGUAGE` (`tr` default)

## BFF Architecture

Browser -> Next.js routes/actions -> `yalinli-api`

- Client components only call local `/api/*`.
- Server-side API client attaches `X-BFF-SECRET`.
- `YALINLI_API_BFF_SECRET` stays server-only.
- Auth tokens are stored in HttpOnly cookies.

## Auth Flow

- Request OTP code (`/api/auth/*/request-code`)
- Verify code (`/api/auth/verify-code`)
- Tokens stored in HttpOnly cookies
- Refresh handled on server side

## Media Upload Flow

- Client uploads to `/api/media/upload` (Next.js BFF)
- Next.js uploads to `/v1/media/upload`
- Returned media IDs used in `/api/entries`

## Petition Export Flow

- Creator-only access via `/api/petitions/[id]/export-data`
- Print-friendly export view at `/petitions/[id]/export`

## Route Convention

Public routes are English-only:
`/`, `/submit`, `/entries/[id]`, `/petitions`, `/petitions/new`, `/petitions/[id]`, `/login`, `/signup`, `/verify-code`, `/profile`, `/about`, `/terms`, `/privacy`, `/contact`

## Responsive / Mobile-first

- Mobile-first layout
- Large tap targets
- Readable text sizes
- Accessible labels and focus states
