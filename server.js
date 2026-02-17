const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const { URL } = require('url');

const PORT = process.env.PORT || 4173;
const STORE_PATH = path.join(__dirname, 'data', 'store.json');
const MIN_PRODUCTS_PER_CATEGORY = 1000;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

const CATALOG_TEMPLATES = {
  electronics: [
    'Wireless Earbuds', 'Bluetooth Speaker', 'Smart TV', 'Gaming Monitor', 'Air Fryer',
    'Robot Vacuum', 'Action Camera', 'Smart Watch', 'Laptop Backpack', 'Power Bank'
  ],
  mobiles: [
    '5G Smartphone', 'Budget Android Phone', 'Flagship Phone', 'Camera Phone', 'Battery Phone',
    'Foldable Phone', 'Gaming Phone', 'Business Phone', 'Selfie Phone', 'Mini Smartphone'
  ],
  books: [
    'Fiction Bestseller', 'Productivity Guide', 'UPSC Prep Book', 'Kids Story Book', 'Science Encyclopedia',
    'Cookbook', 'Personal Finance Book', 'Biographical Memoir', 'Programming Handbook', 'Exam Practice Set'
  ],
  groceries: [
    'Basmati Rice', 'Whole Wheat Flour', 'Cooking Oil', 'Green Tea', 'Mixed Dry Fruits',
    'Organic Honey', 'Protein Muesli', 'Instant Oats', 'Toor Dal', 'Ground Coffee'
  ],
  fashion: [
    'Running Shoes', 'Casual Shirt', 'Denim Jeans', 'Winter Hoodie', 'Sports Jacket',
    'Ethnic Kurta', 'Formal Trousers', 'Sneakers', 'Sunglasses', 'Handbag'
  ]
};

const CATEGORY_IMAGES = {
  electronics: 'https://images.unsplash.com/photo-1518773553398-650c184e0bb3?auto=format&fit=crop&w=600&q=80',
  mobiles: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80',
  books: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80',
  groceries: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
  fashion: 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=600&q=80'
};

function readStore() {
  const store = JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'));
  if (!store.sessions) store.sessions = {};
  return store;
}

function writeStore(next) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(next, null, 2));
}

function ensureLargeCatalog() {
  const store = readStore();
  const counts = store.products.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {});

  const maxId = store.products.reduce((m, p) => Math.max(m, p.id), 0);
  let nextId = maxId + 1;
  let changed = false;

  Object.keys(CATALOG_TEMPLATES).forEach(category => {
    const current = counts[category] || 0;
    const needed = Math.max(0, MIN_PRODUCTS_PER_CATEGORY - current);
    for (let i = 0; i < needed; i += 1) {
      const baseName = CATALOG_TEMPLATES[category][i % CATALOG_TEMPLATES[category].length];
      store.products.push({
        id: nextId++,
        name: `${baseName} ${current + i + 1}`,
        category,
        price: 199 + ((i * 37) % 25000),
        rating: Number((3.6 + ((i % 14) * 0.1)).toFixed(1)),
        stock: 10 + (i % 90),
        image: CATEGORY_IMAGES[category]
      });
      changed = true;
    }
  });

  if (changed) writeStore(store);
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

function createRazorpayOrder(amount, receipt) {
  return new Promise((resolve, reject) => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      return reject(new Error('Razorpay keys are not configured on server'));
    }

    const payload = JSON.stringify({
      amount: Math.round(Number(amount) * 100),
      currency: 'INR',
      receipt,
      payment_capture: 1
    });

    const req = https.request({
      hostname: 'api.razorpay.com',
      path: '/v1/orders',
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, rsp => {
      let raw = '';
      rsp.on('data', chunk => { raw += chunk; });
      rsp.on('end', () => {
        try {
          const body = JSON.parse(raw || '{}');
          if (rsp.statusCode >= 400) return reject(new Error(body.error?.description || 'Razorpay API failed'));
          resolve(body);
        } catch {
          reject(new Error('Invalid Razorpay response'));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function handleApi(req, res, url) {
  const store = readStore();
  const method = req.method;
  const pathname = url.pathname;

  if (method === 'GET' && pathname === '/api/config') {
    return sendJson(res, 200, {
      payment: {
        razorpayKeyId: process.env.RAZORPAY_KEY_ID || null
      }
    });
  }

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
    const page = Math.max(1, Number(url.searchParams.get('page') || 1));
    const limit = Math.min(60, Math.max(1, Number(url.searchParams.get('limit') || 40)));

    const filtered = store.products.filter(item => {
      const categoryMatch = category === 'all' || item.category === category;
      const queryMatch = item.name.toLowerCase().includes(q);
      return categoryMatch && queryMatch;
    });

    if (sort === 'priceLow') filtered.sort((a, b) => a.price - b.price);
    if (sort === 'priceHigh') filtered.sort((a, b) => b.price - a.price);
    if (sort === 'rating') filtered.sort((a, b) => b.rating - a.rating);

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const products = filtered.slice(start, start + limit);

    return sendJson(res, 200, { products, total, totalPages, page, limit });
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

  if (method === 'POST' && pathname === '/api/payments/razorpay/order') {
    if (!auth) return sendJson(res, 401, { error: 'Unauthorized' });
    let body;
    try { body = await parseBody(req); } catch { return sendJson(res, 400, { error: 'Invalid JSON body' }); }
    const amount = Number(body.amount || 0);
    if (amount <= 0) return sendJson(res, 400, { error: 'Amount must be greater than zero' });

    try {
      const order = await createRazorpayOrder(amount, `afkart_${Date.now()}`);
      return sendJson(res, 201, { keyId: process.env.RAZORPAY_KEY_ID, order });
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
  }

  if (method === 'GET' && pathname === '/api/orders') {
    if (!auth) return sendJson(res, 401, { error: 'Unauthorized' });
    return sendJson(res, 200, { orders: store.orders[auth.userId] || [] });
  }

  if (method === 'POST' && pathname === '/api/orders/checkout') {
    if (!auth) return sendJson(res, 401, { error: 'Unauthorized' });
    let body;
    try { body = await parseBody(req); } catch { return sendJson(res, 400, { error: 'Invalid JSON body' }); }
    const {
      paymentMethod, address, pinCode, paymentId = null, gatewayOrderId = null
    } = body;
    if (!paymentMethod || !address || !pinCode) return sendJson(res, 400, { error: 'Missing checkout fields' });

    const cart = store.carts[auth.userId] || [];
    if (!cart.length) return sendJson(res, 400, { error: 'Cart is empty' });

    if (paymentMethod === 'Razorpay' && !paymentId) {
      return sendJson(res, 400, { error: 'Razorpay payment id missing. Complete payment first.' });
    }

    const items = cart.map(line => {
      const p = store.products.find(x => x.id === line.productId);
      return p ? { productId: p.id, name: p.name, price: p.price, qty: line.qty } : null;
    }).filter(Boolean);

    const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
    const order = {
      id: `AFK-${Math.floor(Math.random() * 900000 + 100000)}`,
      date: new Date().toISOString(),
      paymentMethod,
      paymentId,
      gatewayOrderId,
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

ensureLargeCatalog();

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
