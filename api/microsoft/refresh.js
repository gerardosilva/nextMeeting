const MICROSOFT_SCOPE = 'openid offline_access profile email https://graph.microsoft.com/Calendars.Read';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  let body = req.body || {};
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (_) {
      body = {};
    }
  }

  const refreshToken = body.refresh_token;
  if (!refreshToken) {
    res.status(400).json({ error: 'missing_refresh_token' });
    return;
  }

  const CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
  const CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;
  const TENANT = process.env.MICROSOFT_TENANT_ID || 'common';
  if (!CLIENT_ID || !CLIENT_SECRET) {
    res.status(500).json({ error: 'missing_microsoft_env' });
    return;
  }

  try {
    const tokenRes = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(TENANT)}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        scope: MICROSOFT_SCOPE
      }).toString()
    });

    const raw = await tokenRes.text();
    let tokenData = null;
    try {
      tokenData = JSON.parse(raw);
    } catch (_) {
      tokenData = null;
    }

    if (!tokenRes.ok) {
      res.status(tokenRes.status).send(raw);
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    res.status(200).json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || refreshToken,
      expires_at: now + (tokenData.expires_in || 0),
      expires_in: tokenData.expires_in,
      scope: tokenData.scope,
      token_type: tokenData.token_type
    });
  } catch (err) {
    res.status(502).json({
      error: 'microsoft_refresh_failed',
      message: err.message
    });
  }
}
