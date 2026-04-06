# Next Meeting OAuth Template

Generic Vercel backend for Google OAuth PKCE, intended to pair with the Stream Deck "Next Meeting" plugin template.

## What this does
- Exposes `/api/google/callback` that exchanges `code` + `code_verifier` for tokens (access/refresh).
- Exposes `/api/google/refresh` that refreshes access tokens using `refresh_token`.
- Returns tokens to the opener window via `postMessage({ type: 'googleTokens', data })`.
- Preserves the previous `refresh_token` when Google does not send a new one during re-auth.
- Never exposes `client_secret` to the client; it lives in Vercel env.

## Setup
1. In Google Cloud (OAuth client type "Web application"):
   - Add redirect URI: `https://<your-app>.vercel.app/api/google/callback`.
   - Note the `client_id` and `client_secret`.
2. In Vercel project env vars:
   - `GOOGLE_CLIENT_ID=<your client id>`
   - `GOOGLE_CLIENT_SECRET=<your client secret>`
   - (Optional) `GOOGLE_REDIRECT_URI=https://<your-app>.vercel.app/api/google/callback`
3. Deploy to Vercel after linking this repo.

## Plugin integration
- Set the plugin's OAuth base to `https://<your-app>.vercel.app`.
- Set the plugin's Google client ID to the same OAuth client used by this backend.
- On "Connect Google Calendar", the property inspector will open the Google auth URL; the callback will `postMessage` tokens back.

## Notes
- Keep `.env` and secrets out of git. `.gitignore` already ignores `.env*`.
- This repo is meant to stay backend-only. Keep Stream Deck plugin code in a separate repository.
- If you want to add a `/start` endpoint (server-side PKCE generation), store verifier/state temporarily (KV/Redis). This repo assumes the client generates PKCE and encodes verifier in `state`.
