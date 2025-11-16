// app.js (use as module)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  orderBy
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

/* ========= 1) Put your firebase config here =========
   Get this from Firebase Console -> Project settings -> SDK config (Web)
====================================================== */
const firebaseConfig = {
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME",
  projectId: "REPLACE_ME",
  storageBucket: "REPLACE_ME",
  messagingSenderId: "REPLACE_ME",
  appId: "REPLACE_ME",
  // databaseURL optional
};

/* ========== 2) Init Firebase (wrap so app still works without config) ========== */
let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  console.log('Firebase initialized');
} catch (e) {
  console.warn('Firebase not initialized - using fallback only', e);
}

/* ========== 3) DOM refs ========== */
const menuGrid = document.getElementById('menuGrid');
const cartContainer = document.getElementById('cartContainer');
const ordersList = document.getElementById('ordersList');

const signupBtn = document.getElementById('signupBtn');
const loginBtn = document.getElementById('loginBtn');
const signoutBtn = document.getElementById('signoutBtn');
const signupEmail = document.getElementById('signupEmail');
const signupPass = document.getElementById('signupPass');
const loginEmail = document.getElementById('loginEmail');
const loginPass = document.getElementById('loginPass');
const profile = document.getElementById('profile');
const profileEmail = document.getElementById('profileEmail');

const adminCard = document.getElementById('adminCard');
const uploadBtn = document.getElementById('uploadBtn');

const checkoutBtn = document.getElementById('checkoutBtn');
const clearCartBtn = document.getElementById('clearCartBtn');

/* ========== 4) Fallback sample products (used when Firestore unavailable) ========== */
const fallbackProducts = [
  { title: 'Vegetarian Thali', price: 350, image: 'https://via.placeholder.com/400x300', description: 'Traditional thali' },
  { title: 'Sweets Box', price: 250, image: 'https://via.placeholder.com/400x300', description: 'Assorted sweets' },
  { title: 'Chicken Biryani', price: 450, image: 'https://via.placeholder.com/400x300', description: 'Fragrant biryani' },
  { title: 'Paneer Butter Masala', price: 300, image: 'https://via.placeholder.com/400x300', description: 'Creamy paneer gravy' },
  { title: 'Masala Dosa', price: 180, image: 'https://via.placeholder.com/400x300', description: 'Crispy dosa' },
  { title: 'Mini Pizza', price: 120, image: 'https://via.placeholder.com/400x300', description: 'Cheesy pizza' }
];

/* ========== 5) CART (localStorage) ========== */
function getCart() { return JSON.parse(localStorage.getItem('cart') || '[]'); }
function setCart(c) { localStorage.setItem('cart', JSON.stringify(c)); renderCart(); }

function renderCart() {
  const cart = getCart();
  cartContainer.innerHTML = '';
  if (cart.length === 0) {
    cartContainer.innerHTML = '<p>Your cart is empty.</p>';
    return;
  }
  cart.forEach((it, idx) => {
    const el = document.createElement('div');
    el.className = 'cart-item';
    el.innerHTML = `
      <div>
        <strong>${it.title}</strong><div class="small">₹${it.price}</div>
      </div>
      <div>
        <button class="remove-btn" data-idx="${idx}">Remove</button>
      </div>
    `;
    cartContainer.appendChild(el);
  });
  cartContainer.querySelectorAll('.remove-btn').forEach(b => {
    b.onclick = e => {
      const i = Number(e.target.dataset.idx);
      const c = getCart();
      c.splice(i, 1);
      setCart(c);
    };
  });
}

/* ========== 6) RENDER PRODUCTS ========== */
function renderProducts(arr) {
  menuGrid.innerHTML = '';
  arr.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'menu-item';
    card.innerHTML = `
      ${p.tag ? `<span class="tag">${p.tag}</span>` : ''}
      <img src="${p.image || 'https://via.placeholder.com/400x300'}" alt="">
      <h3>${p.title || p.name}</h3>
      <p class="small">${p.description || p.desc || ''}</p>
      <div class="price">₹${p.price}</div>
      <button class="add-btn">Add to Cart</button>
    `;
    menuGrid.appendChild(card);

    card.querySelector('.add-btn').onclick = () => {
      const cart = getCart();
      cart.push({ title: p.title || p.name, price: p.price, image: p.image });
      setCart(cart);
      alert(`${p.title || p.name} added to cart`);
    };
  });
}

/* ========== 7) LOAD PRODUCTS FROM FIRESTORE (real-time if available) ========== */
async function loadProductsFromFirestore() {
  if (!db) return renderProducts(fallbackProducts);

  try {
    const productsCol = collection(db, 'products');
    // realtime updates
    onSnapshot(productsCol, snap => {
      const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (arr.length === 0) renderProducts(fallbackProducts);
      else renderProducts(arr);
    }, err => {
      console.warn('products snapshot err', err);
      renderProducts(fallbackProducts);
    });
  } catch (e) {
    console.warn('loadProducts error', e);
    renderProducts(fallbackProducts);
  }
}

/* ========== 8) AUTH: signup / login / signout ========== */
if (signupBtn) signupBtn.onclick = () => {
  const e = signupEmail.value.trim(), pw = signupPass.value;
  if (!e || !pw) return alert('email & password required');
  createUserWithEmailAndPassword(auth, e, pw)
    .then(userCred => {
      alert('Registered and logged in');
    }).catch(err => alert('Register: ' + err.message));
};

if (loginBtn) loginBtn.onclick = () => {
  const e = loginEmail.value.trim(), pw = loginPass.value;
  if (!e || !pw) return alert('email & password required');
  signInWithEmailAndPassword(auth, e, pw)
    .catch(err => alert('Login: ' + err.message));
};

if (signoutBtn) signoutBtn.onclick = () => signOut(auth).catch(e => console.warn(e));

/* ========== 9) onAuthStateChanged: show/hide admin & load orders ========== */
onAuthStateChanged(auth, user => {
  if (user) {
    profile.classList.remove('hidden');
    document.getElementById('authForms').classList.add('hidden');
    profileEmail.textContent = user.email;
    // simple admin detection (improve by using custom claims)
    if (user.email && (user.email.includes('admin') || user.email === 'admin@example.com')) {
      adminCard.classList.remove('hidden');
    } else {
      adminCard.classList.add('hidden');
    }
    loadMyOrders(user.email);
  } else {
    profile.classList.add('hidden');
    document.getElementById('authForms').classList.remove('hidden');
    adminCard.classList.add('hidden');
    ordersList.innerHTML = '<p>Sign in to see orders</p>';
  }
});

/* ========== 10) UPLOAD PRODUCT (admin) ========== */
if (uploadBtn) uploadBtn.onclick = async () => {
  const title = document.getElementById('pTitle').value.trim();
  const price = Number(document.getElementById('pPrice').value);
  const image = document.getElementById('pImage').value.trim();
  const description = document.getElementById('pDesc').value.trim();

  if (!title || !price) return alert('Title & price required');

  if (!db) return alert('No Firebase configured');

  try {
    await addDoc(collection(db, 'products'), { title, price, image, description, created: new Date().toISOString() });
    alert('Product uploaded');
    // inputs cleared
    document.getElementById('pTitle').value = '';
    document.getElementById('pPrice').value = '';
    document.getElementById('pImage').value = '';
    document.getElementById('pDesc').value = '';
  } catch (e) {
    console.error(e);
    alert('Upload failed: ' + e.message);
  }
};

/* ========== 11) PLACE ORDER (write to Firestore orders) ========== */
if (checkoutBtn) checkoutBtn.onclick = async () => {
  const cart = getCart();
  if (cart.length === 0) return alert('Cart is empty');
  const order = { items: cart, created: new Date().toISOString(), user: auth?.currentUser?.email || 'guest' };

  try {
    if (!db) throw new Error('No Firebase configured');
    await addDoc(collection(db, 'orders'), order);
    alert('Order placed — saved to Firestore');
    setCart([]);
  } catch (e) {
    console.warn(e);
    // fallback: store locally
    const fallbackOrders = JSON.parse(localStorage.getItem('localOrders') || '[]');
    fallbackOrders.push(order);
    localStorage.setItem('localOrders', JSON.stringify(fallbackOrders));
    alert('Order stored locally (Firestore unavailable)');
    setCart([]);
  }
};

/* ========== 12) LOAD MY ORDERS ========== */
async function loadMyOrders(email) {
  ordersList.innerHTML = '';
  if (!db) {
    // fallback: show local orders (if any)
    const localOrders = JSON.parse(localStorage.getItem('localOrders') || '[]').filter(o => o.user === (email || 'guest'));
    if (localOrders.length === 0) { ordersList.innerHTML = '<p>No orders (no Firebase)</p>'; return; }
    localOrders.forEach(o => {
      const el = document.createElement('div');
      el.className = 'card';
      el.innerHTML = `<strong>Order</strong><div class="small">${o.created}</div><div class="small">Items: ${o.items.map(i => i.title).join(', ')}</div>`;
      ordersList.appendChild(el);
    });
    return;
  }

  try {
    const q = query(collection(db, 'orders'), where('user', '==', email || 'guest'), orderBy('created', 'desc'));
    const snap = await getDocs(q);
    if (snap.empty) { ordersList.innerHTML = '<p>No orders yet</p>'; return; }
    snap.forEach(docSnap => {
      const o = docSnap.data();
      const el = document.createElement('div');
      el.className = 'card';
      el.innerHTML = `<strong>Order</strong><div class="small">${o.created}</div><div class="small">Items: ${o.items.map(i => i.title).join(', ')}</div>`;
      ordersList.appendChild(el);
    });
  } catch (e) {
    console.warn('loadMyOrders err', e);
    ordersList.innerHTML = '<p>Could not load orders</p>';
  }
}

/* ========== 13) INIT ========== */
renderCart();
loadProductsFromFirestore();
