# Next Meeting OAuth Template

Generic Vercel backend for Google and Outlook OAuth PKCE, intended to pair with the Stream Deck "Next Meeting" plugin.

## What this does
- Exposes `/api/google/callback` and `/api/google/refresh` for Google Calendar accounts.
- Exposes `/api/microsoft/callback` and `/api/microsoft/refresh` for Outlook/Microsoft Graph accounts.
- Returns tokens to the opener window via `postMessage({ type: 'calendarTokens', data })` and keeps backward-compatible Google messages.
- Preserves the previous `refresh_token` when Google does not send a new one during re-auth.
- Never exposes `client_secret` to the client; it lives in Vercel env.

## Setup
1. In Google Cloud (OAuth client type "Web application"):
   - Add redirect URI: `https://<your-app>.vercel.app/api/google/callback`.
   - Note the `client_id` and `client_secret`.
2. In Microsoft Entra ID:
   - Create an app registration.
   - Add redirect URI: `https://<your-app>.vercel.app/api/microsoft/callback`.
   - Grant delegated Microsoft Graph permission `Calendars.Read`.
   - Note the `client_id`, `client_secret`, and tenant choice (`common` or a specific tenant ID).
3. In Vercel project env vars:
   - `GOOGLE_CLIENT_ID=<your client id>`
   - `GOOGLE_CLIENT_SECRET=<your client secret>`
   - (Optional) `GOOGLE_REDIRECT_URI=https://<your-app>.vercel.app/api/google/callback`
   - `MICROSOFT_CLIENT_ID=<your client id>`
   - `MICROSOFT_CLIENT_SECRET=<your client secret>`
   - `MICROSOFT_TENANT_ID=common`
   - (Optional) `MICROSOFT_REDIRECT_URI=https://<your-app>.vercel.app/api/microsoft/callback`
4. Deploy to Vercel after linking this repo.

## Plugin integration
- Set the plugin's OAuth base to `https://<your-app>.vercel.app`.
- Set the plugin's Google and Microsoft client IDs to the same app registrations used by this backend.
- The plugin can now store multiple Google and Outlook accounts and pick the earliest upcoming meeting across all enabled accounts.

## Notes
- Keep `.env` and secrets out of git. `.gitignore` already ignores `.env*`.
- This repo is meant to stay backend-only. Keep Stream Deck plugin code in a separate repository.
- If you want to add a `/start` endpoint (server-side PKCE generation), store verifier/state temporarily (KV/Redis). This repo assumes the client generates PKCE and encodes verifier in `state`.
