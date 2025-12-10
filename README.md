# Next Meeting OAuth (Vercel)

Serverless callback for Google OAuth PKCE to feed the Stream Deck “Next Meeting” plugin.

## What this does
- Exposes `/api/google/callback` that exchanges `code` + `code_verifier` for tokens (access/refresh).
- Returns tokens to the opener window via `postMessage({ type: 'googleTokens', data })`.
- Never exposes `client_secret` to the client; it lives in Vercel env.

## Setup
1) In Google Cloud (OAuth client type “Web application”):
   - Add redirect URI: `https://<your-app>.vercel.app/api/google/callback`.
   - Note the `client_id` and `client_secret`.
2) On Vercel project env vars:
   - `GOOGLE_CLIENT_ID=<your client id>`
   - `GOOGLE_CLIENT_SECRET=<your client secret>`
   - (Optional) `GOOGLE_REDIRECT_URI=https://<your-app>.vercel.app/api/google/callback`
3) Deploy to Vercel (link this repo, push main).

## Property Inspector changes (Stream Deck)
- Set `VERCEL_OAUTH_BASE` in `src/property-inspector.js` of the plugin to `https://<your-app>.vercel.app`.
- Put your `GOOGLE_CLIENT_ID` in the Property Inspector field “Google Client ID”.
- On “Connect Google Calendar”, the PI will open the Google auth URL; the callback will `postMessage` tokens back.

## Notes
- Keep `.env` and secrets out of git. `.gitignore` already ignores `.env*`.
- If you want to add a `/start` endpoint (server-side PKCE generation), store verifier/state temporarily (KV/Redis). This repo assumes the client (PI) generates PKCE and encodes verifier in `state`.
