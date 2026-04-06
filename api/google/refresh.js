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

  const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  if (!CLIENT_ID || !CLIENT_SECRET) {
    res.status(500).json({ error: 'missing_google_env' });
    return;
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
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
      expires_at: now + (tokenData.expires_in || 0),
      expires_in: tokenData.expires_in,
      scope: tokenData.scope,
      token_type: tokenData.token_type,
      refresh_token: tokenData.refresh_token || refreshToken
    });
  } catch (err) {
    res.status(502).json({
      error: 'google_refresh_failed',
      message: err.message
    });
  }
}
