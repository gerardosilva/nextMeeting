export default async function handler(req, res) {
  applyCors(res);
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, OPTIONS');
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const accessToken = req.body?.access_token;
  const calendars = Array.isArray(req.body?.calendars) && req.body.calendars.length
    ? req.body.calendars
    : ['primary'];

  if (!accessToken) {
    res.status(400).json({ error: 'missing_access_token' });
    return;
  }

  try {
    const meetings = [];
    for (const calendarId of calendars) {
      const params = new URLSearchParams({
        orderBy: 'startTime',
        singleEvents: 'true',
        timeMin: new Date().toISOString(),
        maxResults: '1'
      });
      const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (response.status === 401) {
        res.status(401).json({ error: 'unauthorized' });
        return;
      }
      if (!response.ok) continue;
      const data = await response.json();
      const event = data.items?.[0];
      if (!event) continue;
      meetings.push({
        title: event.summary || 'Meeting',
        start: event.start?.dateTime || event.start?.date || null,
        end: event.end?.dateTime || event.end?.date || event.start?.dateTime || event.start?.date || null,
        joinUrl: event.hangoutLink || extractJoinUrl([event.location, event.description])
      });
    }

    if (!meetings.length) {
      res.status(200).json({ meeting: null });
      return;
    }

    meetings.sort((a, b) => new Date(a.start) - new Date(b.start));
    const now = Date.now();
    const next = meetings.find((meeting) => new Date(meeting.end || meeting.start).getTime() >= now) || meetings[0];
    res.status(200).json({ meeting: next });
  } catch (err) {
    res.status(502).json({ error: 'google_next_failed', message: err.message });
  }
}

function applyCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function extractJoinUrl(fields) {
  const source = (fields || []).filter(Boolean).join(' ');
  const match = source.match(/https?:\/\/[^\s>"]+/);
  return match ? match[0] : null;
}
