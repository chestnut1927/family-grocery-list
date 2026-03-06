const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3456;
const DATA_FILE = path.join(__dirname, 'groceries.json');
const ALLOWED_USERS = ['xiangshi', 'alina'];

// Init data file
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ items: [] }, null, 2));
}

function loadData() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return { items: [] }; }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function serveStatic(res, filePath, contentType) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch { resolve({}); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost`);
  const pathname = url.pathname;

  // CORS for local dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // Serve index.html
  if (pathname === '/' || pathname === '/index.html') {
    return serveStatic(res, path.join(__dirname, 'index.html'), 'text/html');
  }

  // API: validate user
  if (pathname === '/api/validate' && req.method === 'POST') {
    const body = await parseBody(req);
    const name = (body.name || '').trim().toLowerCase();
    const valid = ALLOWED_USERS.includes(name);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ valid, displayName: valid ? body.name.trim() : null }));
    return;
  }

  // API: get items
  if (pathname === '/api/items' && req.method === 'GET') {
    const data = loadData();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data.items));
    return;
  }

  // API: add item
  if (pathname === '/api/items' && req.method === 'POST') {
    const body = await parseBody(req);
    if (!body.name || !body.name.trim()) {
      res.writeHead(400); res.end(JSON.stringify({ error: 'Name required' })); return;
    }
    const data = loadData();
    const item = {
      id: Date.now().toString(),
      name: body.name.trim(),
      checked: false,
      addedBy: body.addedBy || 'unknown',
      addedAt: new Date().toISOString()
    };
    data.items.push(item);
    saveData(data);
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(item));
    return;
  }

  // API: toggle item
  if (pathname.startsWith('/api/items/') && req.method === 'POST' && pathname.endsWith('/toggle')) {
    const id = pathname.split('/')[3];
    const data = loadData();
    const item = data.items.find(i => i.id === id);
    if (!item) { res.writeHead(404); res.end('{}'); return; }
    item.checked = !item.checked;
    saveData(data);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(item));
    return;
  }

  // API: clear checked items (must come BEFORE generic delete)
  if (pathname === '/api/items/checked' && req.method === 'DELETE') {
    const data = loadData();
    data.items = data.items.filter(i => !i.checked);
    saveData(data);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // API: delete item
  if (pathname.startsWith('/api/items/') && req.method === 'DELETE') {
    const id = pathname.split('/')[3];
    const data = loadData();
    data.items = data.items.filter(i => i.id !== id);
    saveData(data);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Grocery app running on http://0.0.0.0:${PORT}`);
});
