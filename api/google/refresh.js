export default async function handler(req, res) {
  if (req.method && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
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
    res.status(400).json({ error: 'Missing refresh_token' });
    return;
  }

  const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  if (!CLIENT_ID || !CLIENT_SECRET) {
    res.status(500).json({ error: 'Missing GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET env vars' });
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

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      res.status(tokenRes.status).json({ error: text });
      return;
    }

    const tokenData = await tokenRes.json();
    const now = Math.floor(Date.now() / 1000);
    res.status(200).json({
      access_token: tokenData.access_token,
      expires_at: now + (tokenData.expires_in || 0),
      scope: tokenData.scope
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
