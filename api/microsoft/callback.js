const MICROSOFT_SCOPE = 'openid offline_access profile email https://graph.microsoft.com/Calendars.Read';

export default async function handler(req, res) {
  const { code, state, error, error_description: errorDescription } = req.query;

  if (error) {
    res.status(400).send(`Microsoft OAuth error: ${error}${errorDescription ? ` - ${errorDescription}` : ''}`);
    return;
  }

  if (!code || !state) {
    res.status(400).send('Missing code/state');
    return;
  }

  const CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
  const CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;
  const TENANT = process.env.MICROSOFT_TENANT_ID || 'common';
  const REDIRECT_URI =
    process.env.MICROSOFT_REDIRECT_URI ||
    `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}/api/microsoft/callback`;

  if (!CLIENT_ID || !CLIENT_SECRET) {
    res.status(500).send('Missing MICROSOFT_CLIENT_ID/MICROSOFT_CLIENT_SECRET env vars');
    return;
  }

  let verifier;
  let existingRefreshToken = null;
  let existingEmail = null;
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
    verifier = decoded.verifier;
    existingRefreshToken = decoded.refreshToken || null;
    existingEmail = decoded.email || null;
  } catch (err) {
    res.status(400).send('Invalid state');
    return;
  }

  try {
    const tokenRes = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(TENANT)}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
        code_verifier: verifier,
        scope: MICROSOFT_SCOPE
      }).toString()
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      throw new Error(`Token exchange failed ${tokenRes.status}: ${text}`);
    }

    const tokenData = await tokenRes.json();
    let email = existingEmail;
    let label = null;

    try {
      const profileRes = await fetch('https://graph.microsoft.com/v1.0/me?$select=displayName,mail,userPrincipalName', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      if (profileRes.ok) {
        const profile = await profileRes.json();
        email = profile.mail || profile.userPrincipalName || existingEmail || null;
        label = profile.displayName || email || 'Outlook';
      }
    } catch (_) {
      // ignore profile errors
    }

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      provider: 'Microsoft',
      label,
      email,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || existingRefreshToken,
      expires_at: now + (tokenData.expires_in || 0),
      scope: tokenData.scope,
      client_id: CLIENT_ID,
      tenant: TENANT
    };

    const html = `
<!doctype html>
<html><body>
<script>
(function() {
  const data = ${JSON.stringify(payload)};
  if (window.opener) {
    window.opener.postMessage({ type: 'calendarTokens', data }, '*');
    window.close();
  } else {
    document.body.innerText = 'Auth complete. You can close this window.';
  }
})();
</script>
</body></html>`;
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
  } catch (err) {
    res.status(500).send(`Error: ${err.message}`);
  }
}
