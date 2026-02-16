const products = [
  { id: 1, name: 'Noise Cancelling Headphones', category: 'electronics', price: 8999, rating: 4.6, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80' },
  { id: 2, name: 'Smart LED TV 50"', category: 'electronics', price: 32999, rating: 4.3, image: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&w=600&q=80' },
  { id: 3, name: 'Gaming Keyboard', category: 'electronics', price: 2799, rating: 4.4, image: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?auto=format&fit=crop&w=600&q=80' },
  { id: 4, name: '5G Smartphone Pro', category: 'mobiles', price: 44999, rating: 4.7, image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80' },
  { id: 5, name: 'Budget Smartphone X', category: 'mobiles', price: 11999, rating: 4.1, image: 'https://images.unsplash.com/photo-1512499617640-c2f999098c01?auto=format&fit=crop&w=600&q=80' },
  { id: 6, name: 'Wireless Power Bank', category: 'mobiles', price: 1699, rating: 4.2, image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=600&q=80' },
  { id: 7, name: 'Atomic Habits', category: 'books', price: 499, rating: 4.8, image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80' },
  { id: 8, name: 'Clean Code', category: 'books', price: 699, rating: 4.7, image: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=600&q=80' },
  { id: 9, name: 'Kids Story Bundle', category: 'books', price: 899, rating: 4.5, image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600&q=80' },
  { id: 10, name: 'Basmati Rice 10kg', category: 'groceries', price: 1199, rating: 4.4, image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80' },
  { id: 11, name: 'Cold Pressed Oil', category: 'groceries', price: 349, rating: 4.3, image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80' },
  { id: 12, name: 'Organic Fruit Box', category: 'groceries', price: 799, rating: 4.2, image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=600&q=80' },
  { id: 13, name: 'Men Casual Shirt', category: 'fashion', price: 999, rating: 4.1, image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=600&q=80' },
  { id: 14, name: 'Women Sneakers', category: 'fashion', price: 2399, rating: 4.5, image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=600&q=80' },
  { id: 15, name: 'Smartwatch Fit+', category: 'electronics', price: 6999, rating: 4.6, image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80' },
  { id: 16, name: 'Bluetooth Speaker', category: 'electronics', price: 2499, rating: 4.3, image: 'https://images.unsplash.com/photo-1589003077984-894e133dabab?auto=format&fit=crop&w=600&q=80' },
  { id: 17, name: 'Study Lamp', category: 'electronics', price: 1299, rating: 4.0, image: 'https://images.unsplash.com/photo-1517999144091-3d9dca6d1e43?auto=format&fit=crop&w=600&q=80' },
  { id: 18, name: 'Instant Noodles Pack', category: 'groceries', price: 299, rating: 4.2, image: 'https://images.unsplash.com/photo-1617093727343-374698b1b08d?auto=format&fit=crop&w=600&q=80' }
];

const state = {
  user: null,
  cart: [],
  orders: [],
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

const money = value => `₹${value.toLocaleString('en-IN')}`;

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
    clone.querySelector('.product-name').textContent = item.name;
    clone.querySelector('.product-category').textContent = item.category;
    clone.querySelector('.product-price').textContent = money(item.price);
    clone.querySelector('.product-rating').textContent = `⭐ ${item.rating}`;
    clone.querySelector('.add-cart-btn').addEventListener('click', () => addToCart(item.id));
    clone.querySelector('.buy-now-btn').addEventListener('click', () => buyNow(item.id));
    productGrid.appendChild(clone);
  });

  if (!filtered.length) {
    productGrid.innerHTML = '<p>No products found. Try another search.</p>';
  }
}

function addToCart(productId) {
  const existing = state.cart.find(item => item.productId === productId);
  if (existing) {
    existing.qty += 1;
  } else {
    state.cart.push({ productId, qty: 1 });
  }
  updateCartCount();
}

function removeFromCart(productId) {
  state.cart = state.cart.filter(item => item.productId !== productId);
  updateCartCount();
  renderCartPanel();
}

function updateCartCount() {
  const count = state.cart.reduce((total, item) => total + item.qty, 0);
  cartCount.textContent = count;
}

function openPanel(title, html) {
  panelTitle.textContent = title;
  panelContent.innerHTML = html;
  sidePanel.classList.remove('hidden');
}

function renderCartPanel() {
  if (!state.cart.length) {
    openPanel('Cart', '<p>Your cart is empty.</p>');
    return;
  }

  const lines = state.cart.map(item => {
    const product = products.find(p => p.id === item.productId);
    const amount = product.price * item.qty;
    return `
      <div class="cart-item">
        <div>
          <strong>${product.name}</strong><br>
          Qty: ${item.qty}
        </div>
        <span>${money(amount)}</span>
        <button class="secondary-btn" onclick="removeFromCart(${product.id})">Remove</button>
      </div>
    `;
  }).join('');

  const subtotal = state.cart.reduce((sum, item) => {
    const product = products.find(p => p.id === item.productId);
    return sum + product.price * item.qty;
  }, 0);

  openPanel(
    'Cart',
    `${lines}
    <h3>Subtotal: ${money(subtotal)}</h3>
    <button class="checkout-btn" onclick="renderCheckout(${subtotal})">Proceed to Checkout</button>`
  );
}

function renderCheckout(subtotal) {
  if (!state.user) {
    alert('Please login before checkout.');
    renderAuthPanel();
    return;
  }

  openPanel(
    'Secure Payment',
    `
      <p><span class="badge">Logged in as ${state.user.name}</span></p>
      <p>Total Amount: <strong>${money(subtotal)}</strong></p>
      <form class="auth-form" id="paymentForm">
        <select required>
          <option value="">Select Payment Method</option>
          <option>UPI</option>
          <option>Credit / Debit Card</option>
          <option>Net Banking</option>
          <option>Cash on Delivery</option>
        </select>
        <input required type="text" placeholder="Shipping Address" />
        <input required type="text" placeholder="PIN Code" />
        <button type="submit">Pay & Place Order</button>
      </form>
    `
  );

  document.getElementById('paymentForm').addEventListener('submit', event => {
    event.preventDefault();
    state.orders.unshift({
      id: `ORD-${Math.floor(Math.random() * 900000 + 100000)}`,
      items: [...state.cart],
      total: subtotal,
      date: new Date().toLocaleString()
    });
    state.cart = [];
    updateCartCount();
    alert('Order placed successfully!');
    renderOrdersPanel();
  });
}

function buyNow(productId) {
  const product = products.find(item => item.id === productId);
  state.cart = [{ productId: product.id, qty: 1 }];
  updateCartCount();
  renderCheckout(product.price);
}

function renderAuthPanel() {
  if (state.user) {
    openPanel(
      'Account',
      `
      <p><strong>Hello, ${state.user.name}</strong></p>
      <p>Email: ${state.user.email}</p>
      <p><span class="badge">Prime Member</span></p>
      <button class="secondary-btn" onclick="logout()">Logout</button>
    `
    );
    return;
  }

  openPanel(
    'Login / Register',
    `
      <form id="loginForm" class="auth-form">
        <input id="nameInput" required placeholder="Full Name" />
        <input id="emailInput" required type="email" placeholder="Email" />
        <input id="passInput" required type="password" placeholder="Password" />
        <button type="submit">Continue</button>
      </form>
    `
  );

  document.getElementById('loginForm').addEventListener('submit', event => {
    event.preventDefault();
    state.user = {
      name: document.getElementById('nameInput').value,
      email: document.getElementById('emailInput').value
    };
    authBtn.textContent = 'Logout';
    renderAuthPanel();
  });
}

function logout() {
  state.user = null;
  authBtn.textContent = 'Login';
  openPanel('Logged Out', '<p>You have successfully logged out.</p>');
}

function renderAccountPanel() {
  if (!state.user) {
    renderAuthPanel();
    return;
  }

  openPanel(
    'Your Account',
    `
      <p><strong>${state.user.name}</strong></p>
      <p>${state.user.email}</p>
      <p>Manage your profile, addresses and saved payments.</p>
      <button class="order-btn" onclick="renderOrdersPanel()">View Orders</button>
      <button class="secondary-btn" onclick="renderAuthPanel()">Account Security</button>
    `
  );
}

function renderOrdersPanel() {
  if (!state.orders.length) {
    openPanel('Orders', '<p>No orders yet. Start shopping and place an order.</p>');
    return;
  }

  const html = state.orders.map(order => {
    const count = order.items.reduce((sum, item) => sum + item.qty, 0);
    return `
      <div class="order-item">
        <div>
          <strong>${order.id}</strong><br>
          ${order.date}
        </div>
        <span>${count} items</span>
        <span>${money(order.total)}</span>
      </div>
    `;
  }).join('');

  openPanel('Orders', html);
}

function renderServicePanel(name) {
  const views = {
    home: '<p>Browse all categories and discover new deals.</p>',
    prime: '<p>Prime exclusive delivery, cashback and early access offers.</p>',
    today: '<p>Lightning deals refreshed every few hours. Grab them quickly.</p>',
    customer: '<p>24x7 support: chat, returns, refund tracking and help center.</p>'
  };
  openPanel('Info', views[name]);
}

categoryFilter.addEventListener('change', e => {
  state.filterCategory = e.target.value;
  renderProducts();
});

searchInput.addEventListener('input', e => {
  state.query = e.target.value.trim();
  renderProducts();
});

document.getElementById('searchBtn').addEventListener('click', renderProducts);
sortSelect.addEventListener('change', e => {
  state.sortBy = e.target.value;
  renderProducts();
});

document.getElementById('cartBtn').addEventListener('click', renderCartPanel);
document.getElementById('ordersBtn').addEventListener('click', renderOrdersPanel);
document.getElementById('accountBtn').addEventListener('click', renderAccountPanel);

authBtn.addEventListener('click', () => {
  if (state.user) {
    logout();
  } else {
    renderAuthPanel();
  }
});

document.getElementById('closePanel').addEventListener('click', () => sidePanel.classList.add('hidden'));

document.querySelectorAll('.nav-link').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.nav-link').forEach(item => item.classList.remove('active'));
    button.classList.add('active');
    renderServicePanel(button.dataset.view);
  });
});

renderProducts();
updateCartCount();

window.removeFromCart = removeFromCart;
window.renderCheckout = renderCheckout;
window.renderOrdersPanel = renderOrdersPanel;
window.renderAuthPanel = renderAuthPanel;
window.logout = logout;
