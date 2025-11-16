// ---------------- Firebase CONFIG ----------------
// Replace with your Firebase project values
export const firebaseConfig = {
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME",
  projectId: "REPLACE_ME",
  storageBucket: "REPLACE_ME",
  messagingSenderId: "REPLACE_ME",
  appId: "REPLACE_ME",
  databaseURL: "REPLACE_ME"
};

import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { getFirestore, collection, addDoc, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.warn('Firebase not initialized. Add your config.');
}

// ------------- Utility: Logs -----------------
async function logAction(user, action, meta="") {
  const entry = { ts: new Date().toISOString(), user, action, meta };
  console.log('[LOG]', entry);
  try { if (db) await addDoc(collection(db, 'logs'), entry); } catch (e) {}
}

// ------------- DOM References ----------------
const signupBtn = document.getElementById('signupBtn');
const loginBtn = document.getElementById('loginBtn');
const signoutBtn = document.getElementById('signoutBtn');

const signupEmail = document.getElementById('signupEmail');
const signupPass = document.getElementById('signupPass');
const loginEmail = document.getElementById('loginEmail');
const loginPass = document.getElementById('loginPass');

const uidBadge = document.getElementById('uidBadge');
const profile = document.getElementById('profile');
const profileEmail = document.getElementById('profileEmail');

const adminCard = document.getElementById('adminCard');
const uploadBtn = document.getElementById('uploadBtn');

const productsList = document.getElementById('productsList');
const cartList = document.getElementById('cartList');
const ordersList = document.getElementById('ordersList');
const placeOrderBtn = document.getElementById('placeOrderBtn');
const clearCartBtn = document.getElementById('clearCartBtn');

// ---------------- CART FUNCTIONS ----------------
function getCart() { return JSON.parse(localStorage.getItem('cart') || '[]'); }
function setCart(c) { localStorage.setItem('cart', JSON.stringify(c)); renderCart(); }

function renderCart() {
  const c = getCart();
  if (c.length === 0) {
    cartList.innerHTML = '<em>Cart is empty</em>';
    return;
  }

  cartList.innerHTML = c.map((it, idx) => `
    <div class="product">
      <img src="${it.image}" />
      <div>
        <strong>${it.title}</strong>
        <div class="small">₹${it.price}</div>
        <div class="actions">
          <button data-idx="${idx}" class="removeBtn">Remove</button>
        </div>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.removeBtn').forEach(btn => btn.onclick = e => {
    const arr = getCart();
    arr.splice(Number(e.target.dataset.idx), 1);
    setCart(arr);
  });
}

// ---------------- PRODUCTS ----------------
async function loadProducts() {
  productsList.innerHTML = '<em>Loading...</em>';

  try {
    if (!db) throw new Error('no db');

    const snap = await getDocs(collection(db, 'products'));
    const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (arr.length === 0) throw new Error('empty');

    renderProducts(arr);
  } catch (e) {
    const fallback = [
      { title: 'Vegetarian Thali', price: 350, image: 'https://via.placeholder.com/150' },
      { title: 'Sweets Box', price: 250, image: 'https://via.placeholder.com/150' }
    ];
    renderProducts(fallback);
  }
}

function renderProducts(arr) {
  productsList.innerHTML = arr.map((p, i) => `
    <div class="product card">
      <img src="${p.image}" />
      <div>
        <strong>${p.title}</strong>
        <div class="small">₹${p.price}</div>
        <button class="addBtn" data-i="${i}">Add to cart</button>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.addBtn').forEach(btn => btn.onclick = e => {
    const p = arr[Number(e.target.dataset.i)];
    const c = getCart();
    c.push(p);
    setCart(c);
  });
}

// ---------------- ORDERS ----------------
async function placeOrder() {
  const cart = getCart();
  if (cart.length === 0) return alert('Cart empty');

  const order = {
    items: cart,
    created: new Date().toISOString(),
    user: currentUserEmail()
  };

  try {
    if (!db) throw new Error('no db');
    await addDoc(collection(db, 'orders'), order);
    setCart([]);
    alert('Order placed');
  } catch (e) {
    alert('Unable to place order (No Firebase?)');
  }
}

async function loadMyOrders() {
  try {
    if (!db) throw new Error('no db');
    const q = query(collection(db, 'orders'), where('user', '==', currentUserEmail()));
    const snap = await getDocs(q);
    const arr = snap.docs.map(d => d.data());

    if (arr.length === 0) ordersList.innerHTML = '<em>No orders yet</em>';
    else ordersList.innerHTML = arr.map(o => `
      <div class="card">
        <strong>Order</strong>
        <div class="small">${o.created}</div>
        <div class="small">Items: ${o.items.map(i => i.title).join(', ')}</div>
      </div>
    `).join('');

  } catch (e) {
    ordersList.innerHTML = '<em>Unable to load (No Firebase)</em>';
  }
}

// ---------------- ADMIN UPLOAD ----------------
uploadBtn.onclick = async () => {
  const title = document.getElementById('pTitle').value;
  const price = Number(document.getElementById('pPrice').value);
  const image = document.getElementById('pImage').value;
  const description = document.getElementById('pDesc').value;

  try {
    await addDoc(collection(db, 'products'), { title, price, image, description });
    alert('Uploaded');
    loadProducts();
  } catch (e) {
    alert('Upload failed');
  }
};

// ---------------- AUTH ----------------
signupBtn.onclick = () => {
  createUserWithEmailAndPassword(auth, signupEmail.value, signupPass.value)
    .then(() => alert('Registered'))
    .catch(e => alert(e.message));
};

loginBtn.onclick = () => {
  signInWithEmailAndPassword(auth, loginEmail.value, loginPass.value)
    .catch(e => alert(e.message));
};

signoutBtn.onclick = () => signOut(auth);

function currentUserEmail() {
  return auth?.currentUser?.email || 'anonymous';
}

// ---------------- AUTH STATE ----------------
onAuthStateChanged(auth, user => {
  if (user) {
    uidBadge.textContent = user.email;
    profile.classList.remove('hidden');
    document.getElementById('authForms').classList.add('hidden');
    profileEmail.textContent = user.email;

    if (user.email.includes('admin')) adminCard.classList.remove('hidden');

    loadProducts();
    loadMyOrders();
  } else {
    uidBadge.textContent = 'Not signed in';
    profile.classList.add('hidden');
    document.getElementById('authForms').classList.remove('hidden');
    adminCard.classList.add('hidden');

    loadProducts();
  }
});

// ---------------- INITIAL LOAD ----------------
renderCart();
loadProducts();
placeOrderBtn.onclick = placeOrder;
clearCartBtn.onclick = () => setCart([]);
