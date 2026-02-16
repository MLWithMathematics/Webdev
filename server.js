const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const PORT = process.env.PORT || 4173;
const STORE_PATH = path.join(__dirname, 'data', 'store.json');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

function readStore() {
  const store = JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'));
  if (!store.sessions) store.sessions = {};
  return store;
}

function writeStore(next) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(next, null, 2));
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': MIME['.json'] });
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
  });
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, original] = String(stored).split(':');
  if (!salt || !original) return false;
  const test = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(test, 'hex'), Buffer.from(original, 'hex'));
}

function createSession(store, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  store.sessions[token] = { userId, expiresAt: Date.now() + 7 * 24 * 3600 * 1000 };
  return token;
}

function getAuthUser(req, store) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;

  const session = store.sessions[token];
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    delete store.sessions[token];
    writeStore(store);
    return null;
  }

  return { token, userId: session.userId };
}

function buildCart(store, userId) {
  const cart = store.carts[userId] || [];
  const items = cart.map(line => {
    const product = store.products.find(p => p.id === line.productId);
    if (!product) return null;
    return { ...line, product, lineTotal: product.price * line.qty };
  }).filter(Boolean);

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  return { items, subtotal };
}

async function handleApi(req, res, url) {
  const store = readStore();
  const method = req.method;
  const pathname = url.pathname;

  if (method === 'POST' && pathname === '/api/auth/register') {
    let body;
    try { body = await parseBody(req); } catch { return sendJson(res, 400, { error: 'Invalid JSON body' }); }
    const { name, email, password } = body;
    if (!name || !email || !password) return sendJson(res, 400, { error: 'Missing fields' });

    const exists = store.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (exists) return sendJson(res, 409, { error: 'Email already registered' });

    const user = { id: crypto.randomUUID(), name, email, passwordHash: hashPassword(password) };
    store.users.push(user);
    store.carts[user.id] = [];
    store.orders[user.id] = [];
    const token = createSession(store, user.id);
    writeStore(store);

    return sendJson(res, 201, { token, user: { id: user.id, name: user.name, email: user.email } });
  }

  if (method === 'POST' && pathname === '/api/auth/login') {
    let body;
    try { body = await parseBody(req); } catch { return sendJson(res, 400, { error: 'Invalid JSON body' }); }
    const { email, password } = body;

    const user = store.users.find(u => u.email.toLowerCase() === String(email).toLowerCase());
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return sendJson(res, 401, { error: 'Invalid credentials' });
    }

    const token = createSession(store, user.id);
    writeStore(store);
    return sendJson(res, 200, { token, user: { id: user.id, name: user.name, email: user.email } });
  }

  if (method === 'GET' && pathname === '/api/products/categories') {
    const categories = [...new Set(store.products.map(p => p.category))];
    return sendJson(res, 200, { categories });
  }

  if (method === 'GET' && pathname === '/api/products') {
    const category = url.searchParams.get('category') || 'all';
    const q = (url.searchParams.get('q') || '').toLowerCase();
    const sort = url.searchParams.get('sort') || 'featured';

    const products = store.products.filter(item => {
      const categoryMatch = category === 'all' || item.category === category;
      const queryMatch = item.name.toLowerCase().includes(q);
      return categoryMatch && queryMatch;
    });

    if (sort === 'priceLow') products.sort((a, b) => a.price - b.price);
    if (sort === 'priceHigh') products.sort((a, b) => b.price - a.price);
    if (sort === 'rating') products.sort((a, b) => b.rating - a.rating);

    return sendJson(res, 200, { products });
  }

  const auth = getAuthUser(req, store);

  if (method === 'GET' && pathname === '/api/account') {
    if (!auth) return sendJson(res, 401, { error: 'Unauthorized' });
    const user = store.users.find(u => u.id === auth.userId);
    if (!user) return sendJson(res, 404, { error: 'User not found' });
    return sendJson(res, 200, { user: { id: user.id, name: user.name, email: user.email } });
  }

  if (method === 'GET' && pathname === '/api/cart') {
    if (!auth) return sendJson(res, 401, { error: 'Unauthorized' });
    return sendJson(res, 200, buildCart(store, auth.userId));
  }

  if (method === 'POST' && pathname === '/api/cart') {
    if (!auth) return sendJson(res, 401, { error: 'Unauthorized' });
    let body;
    try { body = await parseBody(req); } catch { return sendJson(res, 400, { error: 'Invalid JSON body' }); }
    const productId = Number(body.productId);
    const qty = Number(body.qty);
    if (!productId || Number.isNaN(qty)) return sendJson(res, 400, { error: 'Invalid payload' });

    const product = store.products.find(p => p.id === productId);
    if (!product) return sendJson(res, 404, { error: 'Product not found' });

    const cart = store.carts[auth.userId] || [];
    const existing = cart.find(i => i.productId === productId);
    if (existing) existing.qty = qty;
    else cart.push({ productId, qty: Math.max(1, qty) });

    store.carts[auth.userId] = cart.filter(i => i.qty > 0);
    writeStore(store);
    return sendJson(res, 200, { ok: true });
  }

  if (method === 'DELETE' && pathname.startsWith('/api/cart/')) {
    if (!auth) return sendJson(res, 401, { error: 'Unauthorized' });
    const productId = Number(pathname.split('/').pop());
    const cart = store.carts[auth.userId] || [];
    store.carts[auth.userId] = cart.filter(i => i.productId !== productId);
    writeStore(store);
    return sendJson(res, 200, { ok: true });
  }

  if (method === 'GET' && pathname === '/api/orders') {
    if (!auth) return sendJson(res, 401, { error: 'Unauthorized' });
    return sendJson(res, 200, { orders: store.orders[auth.userId] || [] });
  }

  if (method === 'POST' && pathname === '/api/orders/checkout') {
    if (!auth) return sendJson(res, 401, { error: 'Unauthorized' });
    let body;
    try { body = await parseBody(req); } catch { return sendJson(res, 400, { error: 'Invalid JSON body' }); }
    const { paymentMethod, address, pinCode } = body;
    if (!paymentMethod || !address || !pinCode) return sendJson(res, 400, { error: 'Missing checkout fields' });

    const cart = store.carts[auth.userId] || [];
    if (!cart.length) return sendJson(res, 400, { error: 'Cart is empty' });

    const items = cart.map(line => {
      const p = store.products.find(x => x.id === line.productId);
      return p ? { productId: p.id, name: p.name, price: p.price, qty: line.qty } : null;
    }).filter(Boolean);

    const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
    const order = {
      id: `AFK-${Math.floor(Math.random() * 900000 + 100000)}`,
      date: new Date().toISOString(),
      paymentMethod,
      address,
      pinCode,
      total,
      items
    };

    store.orders[auth.userId] = [order, ...(store.orders[auth.userId] || [])];
    store.carts[auth.userId] = [];
    writeStore(store);
    return sendJson(res, 201, { order });
  }

  return false;
}

function serveStatic(req, res, pathname) {
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.normalize(filePath).replace(/^\.+/, '');
  const abs = path.join(__dirname, filePath);

  if (!abs.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) {
    const fallback = path.join(__dirname, 'index.html');
    res.writeHead(200, { 'Content-Type': MIME['.html'] });
    res.end(fs.readFileSync(fallback));
    return;
  }

  const ext = path.extname(abs);
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  res.end(fs.readFileSync(abs));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname.startsWith('/api/')) {
    const handled = await handleApi(req, res, url);
    if (handled !== false) return;
    return sendJson(res, 404, { error: 'Not found' });
  }

  serveStatic(req, res, url.pathname);
});

server.listen(PORT, () => {
  console.log(`AFkart full-stack server running on http://localhost:${PORT}`);
});
