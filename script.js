const products = [
  { id: 1, name: 'Noise Cancelling Headphones', category: 'electronics', price: 8999, rating: 4.6, stock: 18, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80' },
  { id: 2, name: 'Smart LED TV 50"', category: 'electronics', price: 32999, rating: 4.3, stock: 5, image: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&w=600&q=80' },
  { id: 3, name: 'Gaming Keyboard', category: 'electronics', price: 2799, rating: 4.4, stock: 22, image: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?auto=format&fit=crop&w=600&q=80' },
  { id: 4, name: '5G Smartphone Pro', category: 'mobiles', price: 44999, rating: 4.7, stock: 9, image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80' },
  { id: 5, name: 'Budget Smartphone X', category: 'mobiles', price: 11999, rating: 4.1, stock: 31, image: 'https://images.unsplash.com/photo-1512499617640-c2f999098c01?auto=format&fit=crop&w=600&q=80' },
  { id: 6, name: 'Wireless Power Bank', category: 'mobiles', price: 1699, rating: 4.2, stock: 27, image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=600&q=80' },
  { id: 7, name: 'Atomic Habits', category: 'books', price: 499, rating: 4.8, stock: 44, image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80' },
  { id: 8, name: 'Clean Code', category: 'books', price: 699, rating: 4.7, stock: 17, image: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=600&q=80' },
  { id: 9, name: 'Kids Story Bundle', category: 'books', price: 899, rating: 4.5, stock: 13, image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600&q=80' },
  { id: 10, name: 'Basmati Rice 10kg', category: 'groceries', price: 1199, rating: 4.4, stock: 62, image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80' },
  { id: 11, name: 'Cold Pressed Oil', category: 'groceries', price: 349, rating: 4.3, stock: 48, image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80' },
  { id: 12, name: 'Organic Fruit Box', category: 'groceries', price: 799, rating: 4.2, stock: 19, image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=600&q=80' },
  { id: 13, name: 'Men Casual Shirt', category: 'fashion', price: 999, rating: 4.1, stock: 38, image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=600&q=80' },
  { id: 14, name: 'Women Sneakers', category: 'fashion', price: 2399, rating: 4.5, stock: 21, image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=600&q=80' },
  { id: 15, name: 'Smartwatch Fit+', category: 'electronics', price: 6999, rating: 4.6, stock: 14, image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80' },
  { id: 16, name: 'Bluetooth Speaker', category: 'electronics', price: 2499, rating: 4.3, stock: 35, image: 'https://images.unsplash.com/photo-1589003077984-894e133dabab?auto=format&fit=crop&w=600&q=80' },
  { id: 17, name: 'Study Lamp', category: 'electronics', price: 1299, rating: 4.0, stock: 29, image: 'https://images.unsplash.com/photo-1517999144091-3d9dca6d1e43?auto=format&fit=crop&w=600&q=80' },
  { id: 18, name: 'Instant Noodles Pack', category: 'groceries', price: 299, rating: 4.2, stock: 57, image: 'https://images.unsplash.com/photo-1617093727343-374698b1b08d?auto=format&fit=crop&w=600&q=80' }
];

const state = {
  user: JSON.parse(localStorage.getItem('afkartUser') || 'null'),
  cart: JSON.parse(localStorage.getItem('afkartCart') || '[]'),
  orders: JSON.parse(localStorage.getItem('afkartOrders') || '[]'),
  filterCategory: 'all',
  query: '',
  sortBy: 'featured'
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

const money = value => `₹${value.toLocaleString('en-IN')}`;
const stars = rating => `⭐ ${rating.toFixed(1)}`;

function persist() {
  localStorage.setItem('afkartUser', JSON.stringify(state.user));
  localStorage.setItem('afkartCart', JSON.stringify(state.cart));
  localStorage.setItem('afkartOrders', JSON.stringify(state.orders));
}

function renderChips() {
  chipsNode.innerHTML = '';
  ['all', 'electronics', 'mobiles', 'books', 'groceries', 'fashion'].forEach(category => {
    const chip = document.createElement('button');
    chip.className = `chip ${state.filterCategory === category ? 'active' : ''}`;
    chip.textContent = category === 'all' ? 'All' : category[0].toUpperCase() + category.slice(1);
    chip.addEventListener('click', () => {
      state.filterCategory = category;
      categoryFilter.value = category;
      renderChips();
      renderProducts();
    });
    chipsNode.append(chip);
  });
}

function renderProducts() {
  const template = document.getElementById('productCardTemplate');
  productGrid.innerHTML = '';

  let filtered = products.filter(item => {
    const categoryMatch = state.filterCategory === 'all' || item.category === state.filterCategory;
    const queryMatch = item.name.toLowerCase().includes(state.query.toLowerCase());
    return categoryMatch && queryMatch;
  });

  if (state.sortBy === 'priceLow') filtered.sort((a, b) => a.price - b.price);
  if (state.sortBy === 'priceHigh') filtered.sort((a, b) => b.price - a.price);
  if (state.sortBy === 'rating') filtered.sort((a, b) => b.rating - a.rating);

  filtered.forEach(item => {
    const clone = template.content.cloneNode(true);
    clone.querySelector('.product-image').src = item.image;
    clone.querySelector('.product-image').alt = item.name;
    clone.querySelector('.pill').textContent = item.category.toUpperCase();
    clone.querySelector('.product-name').textContent = item.name;
    clone.querySelector('.product-rating').textContent = stars(item.rating);
    clone.querySelector('.product-price').textContent = money(item.price);
    clone.querySelector('.stock').textContent = item.stock > 10 ? 'In Stock' : 'Only few left';
    clone.querySelector('.cart-action').addEventListener('click', () => addToCart(item.id));
    clone.querySelector('.buy-action').addEventListener('click', () => buyNow(item.id));
    productGrid.append(clone);
  });

  if (!filtered.length) productGrid.innerHTML = '<p>No results. Try another keyword.</p>';
}

function updateCartCount() {
  cartCount.textContent = state.cart.reduce((sum, item) => sum + item.qty, 0);
}

function addToCart(productId) {
  const line = state.cart.find(item => item.productId === productId);
  if (line) line.qty += 1;
  else state.cart.push({ productId, qty: 1 });
  persist();
  updateCartCount();
}

function setQty(productId, delta) {
  const line = state.cart.find(item => item.productId === productId);
  if (!line) return;
  line.qty += delta;
  if (line.qty <= 0) state.cart = state.cart.filter(i => i.productId !== productId);
  persist();
  updateCartCount();
  renderCartPanel();
}

function openPanel(title, html) {
  panelTitle.textContent = title;
  panelContent.innerHTML = html;
  sidePanel.classList.remove('hidden');
}

function renderCartPanel() {
  if (!state.cart.length) return openPanel('Your Cart', '<p>Your cart is empty.</p>');

  const list = state.cart.map(item => {
    const product = products.find(p => p.id === item.productId);
    return `<div class="panel-list-item"><div><strong>${product.name}</strong><br>Qty: ${item.qty}</div><span>${money(product.price * item.qty)}</span><div><button class="muted-btn" onclick="setQty(${item.productId},-1)">-</button><button class="muted-btn" onclick="setQty(${item.productId},1)">+</button></div></div>`;
  }).join('');

  const subtotal = state.cart.reduce((sum, item) => {
    const product = products.find(p => p.id === item.productId);
    return sum + product.price * item.qty;
  }, 0);

  openPanel('Your Cart', `${list}<h3>Subtotal: ${money(subtotal)}</h3><button class="primary-btn" onclick="renderCheckout(${subtotal})">Proceed to Checkout</button>`);
}

function renderCheckout(subtotal) {
  if (!state.user) {
    alert('Please login first.');
    return renderAuthPanel();
  }

  openPanel('Checkout & Payment', `<p>Logged in as <strong>${state.user.name}</strong></p><p>Total payable: <strong>${money(subtotal)}</strong></p><form id="payForm" class="form-grid"><select required><option value="">Payment Method</option><option>UPI</option><option>Credit/Debit Card</option><option>Net Banking</option><option>Cash on Delivery</option></select><input required placeholder="Shipping Address"/><input required placeholder="PIN Code"/><button class="primary-btn" type="submit">Place Order</button></form>`);

  document.getElementById('payForm').addEventListener('submit', e => {
    e.preventDefault();
    state.orders.unshift({
      id: `AFK-${Math.floor(Math.random() * 900000 + 100000)}`,
      total: subtotal,
      items: [...state.cart],
      date: new Date().toLocaleString()
    });
    state.cart = [];
    persist();
    updateCartCount();
    renderOrdersPanel();
  });
}

function buyNow(productId) {
  state.cart = [{ productId, qty: 1 }];
  persist();
  updateCartCount();
  const product = products.find(p => p.id === productId);
  renderCheckout(product.price);
}

function renderAuthPanel() {
  if (state.user) {
    return openPanel('Account', `<p><strong>${state.user.name}</strong></p><p>${state.user.email}</p><button class="primary-btn" onclick="renderOrdersPanel()">Your Orders</button><button class="muted-btn" onclick="logout()">Logout</button>`);
  }

  openPanel('Login / Signup', `<form id="loginForm" class="form-grid"><input id="nameField" required placeholder="Full Name"/><input id="mailField" required type="email" placeholder="Email"/><input required type="password" placeholder="Password"/><button class="primary-btn" type="submit">Continue</button></form>`);
  document.getElementById('loginForm').addEventListener('submit', e => {
    e.preventDefault();
    state.user = {
      name: document.getElementById('nameField').value,
      email: document.getElementById('mailField').value
    };
    authBtn.textContent = 'Logout';
    persist();
    renderAuthPanel();
  });
}

function logout() {
  state.user = null;
  authBtn.textContent = 'Login';
  persist();
  openPanel('Logged out', '<p>You have logged out of AFkart.</p>');
}

function renderOrdersPanel() {
  if (!state.orders.length) return openPanel('Your Orders', '<p>No orders yet.</p>');

  const html = state.orders.map(order => `<div class="panel-list-item"><div><strong>${order.id}</strong><br>${order.date}</div><span>${order.items.reduce((s, i) => s + i.qty, 0)} items</span><span>${money(order.total)}</span></div>`).join('');
  openPanel('Your Orders', html);
}

function renderMenuInfo(view) {
  const views = {
    home: '<p>Explore all categories and latest arrivals.</p>',
    deals: '<p>Flash deals and heavy discounts updated regularly.</p>',
    prime: '<p>Prime members get faster shipping and extra rewards.</p>',
    customer: '<p>24x7 customer support and easy return center.</p>',
    sell: '<p>Start selling on AFkart marketplace with low fees.</p>'
  };
  openPanel('AFkart Info', views[view]);
}

categoryFilter.addEventListener('change', e => { state.filterCategory = e.target.value; renderChips(); renderProducts(); });
searchInput.addEventListener('input', e => { state.query = e.target.value.trim(); renderProducts(); });
sortSelect.addEventListener('change', e => { state.sortBy = e.target.value; renderProducts(); });
document.getElementById('searchBtn').addEventListener('click', renderProducts);
document.getElementById('cartBtn').addEventListener('click', renderCartPanel);
document.getElementById('ordersBtn').addEventListener('click', renderOrdersPanel);
document.getElementById('accountBtn').addEventListener('click', renderAuthPanel);
authBtn.addEventListener('click', () => state.user ? logout() : renderAuthPanel());
document.getElementById('closePanel').addEventListener('click', () => sidePanel.classList.add('hidden'));

document.querySelectorAll('.menu-item').forEach(btn => btn.addEventListener('click', () => {
  document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
  btn.classList.add('active');
  renderMenuInfo(btn.dataset.view);
}));

if (state.user) authBtn.textContent = 'Logout';
renderChips();
renderProducts();
updateCartCount();

window.setQty = setQty;
window.renderCheckout = renderCheckout;
window.renderOrdersPanel = renderOrdersPanel;
window.logout = logout;
