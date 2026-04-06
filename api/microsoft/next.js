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
    : ['default'];

  if (!accessToken) {
    res.status(400).json({ error: 'missing_access_token' });
    return;
  }

  try {
    const startDateTime = new Date().toISOString();
    const endDateTime = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const meetings = [];

    for (const calendarId of calendars) {
      const params = new URLSearchParams({
        startDateTime,
        endDateTime,
        $top: '10',
        $orderby: 'start/dateTime',
        $select: 'subject,start,end,location,locations,bodyPreview,onlineMeeting,onlineMeetingUrl'
      });
      const url = calendarId === 'default'
        ? `https://graph.microsoft.com/v1.0/me/calendarView?${params.toString()}`
        : `https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(calendarId)}/calendarView?${params.toString()}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Prefer: 'outlook.timezone="UTC"'
        }
      });
      if (response.status === 401) {
        res.status(401).json({ error: 'unauthorized' });
        return;
      }
      if (!response.ok) continue;
      const data = await response.json();
      for (const event of data.value || []) {
        const start = toIsoDateTime(event.start);
        const end = toIsoDateTime(event.end) || start;
        if (!start) continue;
        meetings.push({
          title: event.subject || 'Meeting',
          start,
          end,
          joinUrl: event.onlineMeeting?.joinUrl || event.onlineMeetingUrl || extractJoinUrl([
            event.location?.displayName,
            ...(event.locations || []).map((location) => location?.displayName),
            event.bodyPreview
          ])
        });
      }
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
    res.status(502).json({ error: 'microsoft_next_failed', message: err.message });
  }
}

function applyCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function toIsoDateTime(value) {
  if (!value?.dateTime) return null;
  if (/[zZ]|[+-]\d\d:\d\d$/.test(value.dateTime)) return value.dateTime;
  if (value.timeZone === 'UTC') return `${value.dateTime}Z`;
  return value.dateTime;
}

function extractJoinUrl(fields) {
  const source = (fields || []).filter(Boolean).join(' ');
  const match = source.match(/https?:\/\/[^\s>"]+/);
  return match ? match[0] : null;
}
