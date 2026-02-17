const state = {
  token: localStorage.getItem('afkartToken') || null,
  user: JSON.parse(localStorage.getItem('afkartUser') || 'null'),
  filterCategory: 'all',
  query: '',
  sortBy: 'featured',
  page: 1,
  limit: 40,
  totalPages: 1,
  products: [],
  cart: { items: [], subtotal: 0 },
  orders: [],
  paymentConfig: { razorpayKeyId: null }
};

const productGrid = document.getElementById('productGrid');
const categoryFilter = document.getElementById('categoryFilter');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const cartCount = document.getElementById('cartCount');
const sidePanel = document.getElementById('sidePanel');
const panelTitle = document.getElementById('panelTitle');
const panelContent = document.getElementById('panelContent');
const authBtn = document.getElementById('authBtn');
const chipsNode = document.getElementById('quickCategoryChips');
const paginationControls = document.getElementById('paginationControls');

const money = value => `₹${value.toLocaleString('en-IN')}`;
const stars = rating => `⭐ ${rating.toFixed(1)}`;

function persistAuth() {
  if (state.token) localStorage.setItem('afkartToken', state.token);
  else localStorage.removeItem('afkartToken');

  if (state.user) localStorage.setItem('afkartUser', JSON.stringify(state.user));
  else localStorage.removeItem('afkartUser');
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      ...(options.headers || {})
    }
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Request failed');
  return body;
}

function renderChips() {
  chipsNode.innerHTML = '';
  ['all', 'electronics', 'mobiles', 'books', 'groceries', 'fashion'].forEach(category => {
    const chip = document.createElement('button');
    chip.className = `chip ${state.filterCategory === category ? 'active' : ''}`;
    chip.textContent = category === 'all' ? 'All' : category[0].toUpperCase() + category.slice(1);
    chip.addEventListener('click', () => {
      state.filterCategory = category;
      state.page = 1;
      categoryFilter.value = category;
      renderChips();
      loadProducts();
    });
    chipsNode.append(chip);
  });
}

async function loadProducts() {
  const params = new URLSearchParams({
    category: state.filterCategory,
    q: state.query,
    sort: state.sortBy,
    page: String(state.page),
    limit: String(state.limit)
  });
  const data = await api(`/api/products?${params.toString()}`);
  state.products = data.products;
  state.totalPages = data.totalPages || 1;
  renderProducts();
  renderPagination();
}

function renderProducts() {
  const template = document.getElementById('productCardTemplate');
  productGrid.innerHTML = '';

  state.products.forEach(item => {
    const clone = template.content.cloneNode(true);
    const imageNode = clone.querySelector('.product-image');
    const nameNode = clone.querySelector('.product-name');
    imageNode.src = item.image;
    imageNode.alt = item.name;
    clone.querySelector('.pill').textContent = item.category.toUpperCase();
    nameNode.textContent = item.name;
    clone.querySelector('.product-description').textContent = item.description || 'No description available.';
    clone.querySelector('.product-rating').textContent = stars(item.rating);
    clone.querySelector('.product-price').textContent = money(item.price);
    clone.querySelector('.stock').textContent = item.stock > 10 ? 'In Stock' : 'Only few left';

    const showDetails = () => renderProductDetail(item.id);
    imageNode.addEventListener('click', showDetails);
    nameNode.addEventListener('click', showDetails);
    clone.querySelector('.detail-action').addEventListener('click', showDetails);
    clone.querySelector('.cart-action').addEventListener('click', () => addToCart(item.id));
    clone.querySelector('.buy-action').addEventListener('click', () => buyNow(item.id));
    productGrid.append(clone);
  });

  if (!state.products.length) productGrid.innerHTML = '<p>No results. Try another keyword.</p>';
}

function renderPagination() {
  paginationControls.innerHTML = '';
  if (state.totalPages <= 1) return;
  const prev = document.createElement('button');
  prev.textContent = 'Previous';
  prev.disabled = state.page <= 1;
  prev.addEventListener('click', () => {
    state.page -= 1;
    loadProducts();
  });

  const next = document.createElement('button');
  next.textContent = 'Next';
  next.disabled = state.page >= state.totalPages;
  next.addEventListener('click', () => {
    state.page += 1;
    loadProducts();
  });

  const status = document.createElement('span');
  status.textContent = `Page ${state.page} of ${state.totalPages}`;
  paginationControls.append(prev, status, next);
}

function updateCartCount() {
  cartCount.textContent = state.cart.items.reduce((sum, item) => sum + item.qty, 0);
}

async function loadCart() {
  if (!state.token) {
    state.cart = { items: [], subtotal: 0 };
    updateCartCount();
    return;
  }
  state.cart = await api('/api/cart');
  updateCartCount();
}

async function addToCart(productId) {
  if (!state.token) return renderAuthPanel();

  const existing = state.cart.items.find(item => item.productId === productId);
  const qty = (existing?.qty || 0) + 1;
  await api('/api/cart', { method: 'POST', body: JSON.stringify({ productId, qty }) });
  await loadCart();
}

async function setQty(productId, qty) {
  if (qty <= 0) {
    await api(`/api/cart/${productId}`, { method: 'DELETE' });
  } else {
    await api('/api/cart', { method: 'POST', body: JSON.stringify({ productId, qty }) });
  }
  await loadCart();
  renderCartPanel();
}

function openPanel(title, html) {
  panelTitle.textContent = title;
  panelContent.innerHTML = html;
  sidePanel.classList.remove('hidden');
}

async function renderProductDetail(productId) {
  try {
    const { product } = await api(`/api/products/${productId}`);
    openPanel(product.name, `
      <img src="${product.image}" alt="${product.name}" class="panel-image" />
      <p><strong>Category:</strong> ${product.category}</p>
      <p><strong>Rating:</strong> ${stars(product.rating)}</p>
      <p><strong>Price:</strong> ${money(product.price)}</p>
      <p><strong>Stock:</strong> ${product.stock}</p>
      <p>${product.description}</p>
      <button class="primary-btn" onclick="addToCart(${product.id})">Add to Cart</button>
    `);
  } catch (error) {
    alert(error.message);
  }
}

function renderCartPanel() {
  if (!state.cart.items.length) return openPanel('Your Cart', '<p>Your cart is empty.</p>');

  const list = state.cart.items.map(item => `
    <div class="panel-list-item">
      <div>
        <strong>${item.product.name}</strong><br>Qty: ${item.qty}
      </div>
      <span>${money(item.lineTotal)}</span>
      <div>
        <button class="muted-btn" onclick="setQty(${item.productId}, ${item.qty - 1})">-</button>
        <button class="muted-btn" onclick="setQty(${item.productId}, ${item.qty + 1})">+</button>
      </div>
    </div>
  `).join('');

  openPanel(
    'Your Cart',
    `${list}
     <h3>Subtotal: ${money(state.cart.subtotal)}</h3>
     <button class="primary-btn" onclick="renderCheckout()">Proceed to Checkout</button>`
  );
}

async function startRazorpayPayment(checkout) {
  if (!window.Razorpay) throw new Error('Razorpay script failed to load.');
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: checkout.keyId,
      amount: checkout.order.amount,
      currency: checkout.order.currency,
      order_id: checkout.order.id,
      name: 'AFkart',
      description: 'Order Payment',
      prefill: {
        name: state.user?.name,
        email: state.user?.email
      },
      notes: checkout.order.notes,
      theme: { color: '#0071ce' },
      handler(response) {
        resolve(response.razorpay_payment_id);
      },
      modal: {
        ondismiss() {
          reject(new Error('Payment popup closed before completion'));
        }
      }
    });
    rzp.open();
  });
}

function renderCheckout() {
  if (!state.token) return renderAuthPanel();
  if (!state.cart.items.length) return openPanel('Checkout', '<p>Your cart is empty.</p>');

  const razorpayEnabled = Boolean(state.paymentConfig.razorpayKeyId);
  const razorpayOption = razorpayEnabled ? '<option>Razorpay</option>' : '';

  openPanel('Checkout & Payment', `
    <p>Logged in as <strong>${state.user.name}</strong></p>
    <p>Total payable: <strong>${money(state.cart.subtotal)}</strong></p>
    <form id="payForm" class="form-grid">
      <select required>
        <option value="">Payment Method</option>
        ${razorpayOption}
        <option>UPI</option>
        <option>Credit/Debit Card</option>
        <option>Net Banking</option>
        <option>Cash on Delivery</option>
      </select>
      <input id="addressField" required placeholder="Shipping Address"/>
      <input id="pinField" required placeholder="PIN Code"/>
      <button class="primary-btn" type="submit">Place Order</button>
    </form>
    ${razorpayEnabled ? '<small>Razorpay enabled.</small>' : '<small>Set Razorpay env keys to enable real gateway popup.</small>'}
  `);

  document.getElementById('payForm').addEventListener('submit', async e => {
    e.preventDefault();
    const paymentMethod = e.target.querySelector('select').value;
    const address = document.getElementById('addressField').value;
    const pinCode = document.getElementById('pinField').value;

    try {
      const payload = { paymentMethod, address, pinCode };
      if (paymentMethod === 'Razorpay') {
        const checkout = await api('/api/payments/razorpay/order', {
          method: 'POST',
          body: JSON.stringify({ amount: state.cart.subtotal })
        });
        payload.gatewayOrderId = checkout.order.id;
        payload.paymentId = await startRazorpayPayment(checkout);
      }

      await api('/api/orders/checkout', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      await Promise.all([loadCart(), loadOrders()]);
      renderOrdersPanel();
    } catch (error) {
      alert(error.message);
    }
  });
}

function buyNow(productId) {
  if (!state.token) return renderAuthPanel();
  setQty(productId, 1).then(() => renderCheckout());
}

function renderAuthPanel() {
  if (state.user) {
    return openPanel('Account', `
      <p><strong>${state.user.name}</strong></p>
      <p>${state.user.email}</p>
      <button class="primary-btn" onclick="renderOrdersPanel()">Your Orders</button>
      <button class="muted-btn" onclick="logout()">Logout</button>
    `);
  }

  openPanel('Login / Signup', `
    <div class="toolbar">
      <button id="loginTab" class="chip active">Login</button>
      <button id="registerTab" class="chip">Register</button>
    </div>
    <form id="authForm" class="form-grid">
      <input id="nameField" placeholder="Full Name (Register only)"/>
      <input id="mailField" required type="email" placeholder="Email"/>
      <input id="passField" required type="password" placeholder="Password"/>
      <button class="primary-btn" type="submit">Continue</button>
    </form>
  `);

  let mode = 'login';
  const nameField = document.getElementById('nameField');
  const loginTab = document.getElementById('loginTab');
  const registerTab = document.getElementById('registerTab');

  const setMode = next => {
    mode = next;
    nameField.style.display = mode === 'register' ? 'block' : 'none';
    loginTab.classList.toggle('active', mode === 'login');
    registerTab.classList.toggle('active', mode === 'register');
  };

  loginTab.addEventListener('click', () => setMode('login'));
  registerTab.addEventListener('click', () => setMode('register'));
  setMode('login');

  document.getElementById('authForm').addEventListener('submit', async e => {
    e.preventDefault();
    const payload = {
      email: document.getElementById('mailField').value,
      password: document.getElementById('passField').value
    };
    if (mode === 'register') payload.name = nameField.value;

    try {
      const path = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const data = await api(path, { method: 'POST', body: JSON.stringify(payload) });
      state.token = data.token;
      state.user = data.user;
      authBtn.textContent = 'Logout';
      persistAuth();
      await loadCart();
      await loadOrders();
      renderAuthPanel();
    } catch (error) {
      alert(error.message);
    }
  });
}

function logout() {
  state.token = null;
  state.user = null;
  state.orders = [];
  state.cart = { items: [], subtotal: 0 };
  authBtn.textContent = 'Login';
  persistAuth();
  updateCartCount();
  openPanel('Logged out', '<p>You have logged out of AFkart.</p>');
}

async function loadOrders() {
  if (!state.token) {
    state.orders = [];
    return;
  }
  const data = await api('/api/orders');
  state.orders = data.orders;
}

async function loadConfig() {
  const data = await api('/api/config');
  state.paymentConfig = data.payment || { razorpayKeyId: null };
}

function renderOrdersPanel() {
  if (!state.orders.length) return openPanel('Your Orders', '<p>No orders yet.</p>');

  const html = state.orders.map(order => `
    <div class="panel-list-item">
      <div><strong>${order.id}</strong><br>${new Date(order.date).toLocaleString()}<br>${order.paymentMethod}${order.paymentId ? ` • ${order.paymentId}` : ''}</div>
      <span>${order.items.reduce((s, i) => s + i.qty, 0)} items</span>
      <span>${money(order.total)}</span>
    </div>
  `).join('');

  openPanel('Your Orders', html);
}

function renderMenuInfo(view) {
  const views = {
    home: `
      <p><strong>Home</strong>: Browse all departments, trend picks, and daily value products.</p>
      <ul>
        <li>Top categories with quick filters</li>
        <li>Product descriptions, ratings, and detailed view</li>
        <li>Secure account/cart/order experience</li>
      </ul>
    `,
    deals: `
      <p><strong>Deals</strong>: Promo-first experience inspired by major retail homepages.</p>
      <ul>
        <li>Sort by rating and price for best-value picks</li>
        <li>Use search + category chips for faster discovery</li>
        <li>Use pagination to explore a large catalog</li>
      </ul>
    `,
    services: `
      <p><strong>Services</strong>: Checkout, payment options, account session handling.</p>
      <ul>
        <li>Razorpay integrated checkout flow (when keys configured)</li>
        <li>UPI / Card / Net Banking / COD demo methods</li>
        <li>Order tracking history in account section</li>
      </ul>
    `,
    support: `
      <p><strong>Help Center</strong>: Support-oriented overview for shopper confidence.</p>
      <ul>
        <li>Easy returns messaging</li>
        <li>Order and account quick access from top navigation</li>
        <li>Social links for external brand channels</li>
      </ul>
    `,
    sell: `
      <p><strong>Become a Seller</strong>: Marketplace growth section.</p>
      <ul>
        <li>Large product catalog architecture ready</li>
        <li>Search/sort/pagination for buyer discovery</li>
        <li>Scalable backend JSON data model (can migrate to SQL/NoSQL DB)</li>
      </ul>
    `
  };
  openPanel('AFkart Section Details', views[view]);
}

function renderFeatureComparison() {
  openPanel('AFkart Platform Details', `
    <p>This demo now includes complete metadata coverage for products.</p>
    <h3>Implemented</h3>
    <ul>
      <li>All products have images and descriptions</li>
      <li>Product detail panel for every card</li>
      <li>Detailed info on each nav section</li>
      <li>Full account, cart, order, and gateway-ready checkout flow</li>
    </ul>
    <h3>Database Option</h3>
    <p>Current data store uses JSON file persistence. You can migrate this to MongoDB/PostgreSQL without changing the UI structure.</p>
  `);
}

categoryFilter.addEventListener('change', e => {
  state.filterCategory = e.target.value;
  state.page = 1;
  renderChips();
  loadProducts();
});
searchInput.addEventListener('input', e => {
  state.query = e.target.value.trim();
  state.page = 1;
  loadProducts();
});
sortSelect.addEventListener('change', e => {
  state.sortBy = e.target.value;
  state.page = 1;
  loadProducts();
});
document.getElementById('searchBtn').addEventListener('click', () => {
  state.page = 1;
  loadProducts();
});
document.getElementById('featureBtn').addEventListener('click', renderFeatureComparison);
document.getElementById('cartBtn').addEventListener('click', renderCartPanel);
document.getElementById('ordersBtn').addEventListener('click', renderOrdersPanel);
document.getElementById('accountBtn').addEventListener('click', renderAuthPanel);
authBtn.addEventListener('click', () => (state.user ? logout() : renderAuthPanel()));
document.getElementById('closePanel').addEventListener('click', () => sidePanel.classList.add('hidden'));

document.querySelectorAll('.menu-item').forEach(btn => btn.addEventListener('click', () => {
  document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
  btn.classList.add('active');
  renderMenuInfo(btn.dataset.view);
}));

async function bootstrap() {
  if (state.user) authBtn.textContent = 'Logout';
  renderChips();
  await loadConfig();
  await loadProducts();
  await loadCart();
  await loadOrders();
}

bootstrap();

window.setQty = setQty;
window.renderCheckout = renderCheckout;
window.renderOrdersPanel = renderOrdersPanel;
window.logout = logout;
window.addToCart = addToCart;
