export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Auth check
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token || token !== process.env.ADMIN_PIN) {
    return res.status(401).json({ error: 'Non autorizzato' });
  }

  const data = req.body;
  if (!data || !data.players || !data.matches) {
    return res.status(400).json({ error: 'Dati non validi' });
  }

  const ghToken = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  try {
    // Get current file SHA (needed for update)
    const fileRes = await fetch(
      `https://api.github.com/repos/${repo}/contents/calcetto_data.json`,
      { headers: { Authorization: `token ${ghToken}`, 'User-Agent': 'calcetto-app' } }
    );

    if (!fileRes.ok) {
      const err = await fileRes.text();
      return res.status(500).json({ error: 'Errore GitHub GET: ' + err });
    }

    const fileData = await fileRes.json();
    const content = Buffer.from(JSON.stringify(data, null, 2), 'utf-8').toString('base64');

    // Commit updated file
    const putRes = await fetch(
      `https://api.github.com/repos/${repo}/contents/calcetto_data.json`,
      {
        method: 'PUT',
        headers: {
          Authorization: `token ${ghToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'calcetto-app',
        },
        body: JSON.stringify({
          message: `Aggiorna dati calcetto — ${new Date().toISOString().split('T')[0]}`,
          content,
          sha: fileData.sha,
        }),
      }
    );

    if (!putRes.ok) {
      const err = await putRes.text();
      return res.status(500).json({ error: 'Errore GitHub PUT: ' + err });
    }

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Errore server: ' + e.message });
  }
}
