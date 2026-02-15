const API_BASE = '/api';
const state = {
    products: [],
    cart: [],
    analytics: null,
};

function init() {
    loadProducts();
    updateCart();
}

async function loadProducts() {
    try {
        const res = await fetch(API_BASE + '/products');
        if (res.ok) {
            const data = await res.json();
            state.products = Array.isArray(data) ? data : [];
        }
    } catch (e) {
        console.warn('API not available, using fallback products', e);
    }
    if (state.products.length === 0) {
        state.products = [
            { id: 1, name: 'Tindi Coffee', price: 250, code: '001', category: 'Drinks', stockQuantity: 50 },
            { id: 2, name: 'Premium Tea', price: 150, code: '002', category: 'Drinks', stockQuantity: 80 },
            { id: 3, name: 'Glazed Donut', price: 100, code: '003', category: 'Snacks', stockQuantity: 30 },
            { id: 4, name: 'Beef Burger', price: 450, code: '004', category: 'Food', stockQuantity: 20 },
        ];
    }
    renderProducts();
    updateCart();
}

function getStock(productId) {
    const p = state.products.find(x => x.id === productId);
    return p != null && p.stockQuantity != null ? p.stockQuantity : 999;
}

function addToCart(productId) {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;
    const stock = getStock(productId);
    const existing = state.cart.find(item => item.id === productId);
    const newQty = existing ? existing.quantity + 1 : 1;
    if (newQty > stock) {
        alert('Not enough stock for ' + product.name + '.\nAvailable: ' + stock);
        return;
    }
    if (existing) {
        existing.quantity = newQty;
    } else {
        state.cart.push({ ...product, quantity: 1 });
    }
    updateCart();
}

function removeFromCart(productId) {
    state.cart = state.cart.filter(item => item.id !== productId);
    updateCart();
}

function updateCartItemQty(productId, delta) {
    const item = state.cart.find(i => i.id === productId);
    if (!item) return;
    const stock = getStock(productId);
    const newQty = item.quantity + delta;
    if (newQty < 1) {
        removeFromCart(productId);
        return;
    }
    if (newQty > stock) {
        alert('Not enough stock for ' + item.name + '.\nAvailable: ' + stock);
        return;
    }
    item.quantity = newQty;
    updateCart();
}

function updateCart() {
    const cartEl = document.getElementById('cart-items');
    if (!cartEl) return;
    cartEl.innerHTML = state.cart.map(item => {
        const stock = getStock(item.id);
        const exceeds = item.quantity > stock;
        return `
        <div class="flex justify-between items-center glass p-3 rounded-xl border-l-4 ${exceeds ? 'border-red-500' : 'border-amber-500'}">
            <div class="flex-1 min-w-0">
                <h4 class="font-bold text-sm text-white">${item.name}</h4>
                <p class="text-xs text-slate-400">KES ${item.price} x ${item.quantity}</p>
                ${exceeds ? `<p class="text-xs text-red-400 mt-1">Exceeds stock (available: ${stock})</p>` : ''}
            </div>
            <div class="flex items-center gap-1">
                <button onclick="updateCartItemQty(${item.id}, -1)" class="text-slate-400 hover:text-white p-1 rounded">−</button>
                <span class="text-sm w-6 text-center">${item.quantity}</span>
                <button onclick="updateCartItemQty(${item.id}, 1)" class="text-slate-400 hover:text-white p-1 rounded">+</button>
                <button onclick="removeFromCart(${item.id})" class="text-slate-600 hover:text-red-500 p-2">✕</button>
            </div>
        </div>
    `}).join('');

    const subtotalValue = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const taxValue = subtotalValue * 0.16;
    const totalValue = subtotalValue + taxValue;

    const subtotalEl = document.getElementById('subtotal');
    const taxEl = document.getElementById('tax');
    const totalEl = document.getElementById('total');
    if (subtotalEl) subtotalEl.innerText = 'KES ' + subtotalValue.toLocaleString();
    if (taxEl) taxEl.innerText = 'KES ' + taxValue.toLocaleString();
    if (totalEl) totalEl.innerText = 'KES ' + totalValue.toLocaleString();
}

function renderProducts() {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    grid.innerHTML = state.products.map(p => {
        const stock = getStock(p.id);
        const outOfStock = stock <= 0;
        return `
        <div onclick="${outOfStock ? '' : 'addToCart(' + p.id + ')'}" class="glass p-4 rounded-2xl ${outOfStock ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-amber-500/50'} transition-all group">
            <div class="w-full aspect-square bg-slate-800 rounded-xl mb-3 flex items-center justify-center text-slate-600 group-hover:scale-105 transition-transform font-bold text-4xl">
                ${p.name[0]}
            </div>
            <h3 class="font-bold text-sm truncate">${p.name}</h3>
            <p class="text-amber-500 font-bold">KES ${p.price}</p>
            <p class="text-xs text-slate-500">Stock: ${stock}</p>
        </div>
    `}).join('');
}

function checkoutMpesa() {
    if (state.cart.length === 0) return alert('Cart is empty!');
    const exceeds = state.cart.some(item => item.quantity > getStock(item.id));
    if (exceeds) return alert('Some items exceed available stock. Adjust quantities or remove them.');
    document.getElementById('mpesa-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('mpesa-modal').classList.add('hidden');
}

async function confirmPayment() {
    const phone = document.getElementById('customer-phone').value.trim();
    if (!phone) return alert('Enter phone number');

    const btn = document.querySelector('#mpesa-modal button[onclick="confirmPayment()"]');
    if (btn) {
        btn.innerText = 'PROCESSING...';
        btn.disabled = true;
    }

    try {
        const payload = {
            customerPhone: phone,
            items: state.cart.map(i => ({ productId: i.id, quantity: i.quantity })),
        };
        const res = await fetch(API_BASE + '/mpesa/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            alert(data.error || 'M-Pesa checkout failed. Check backend and M-Pesa credentials.');
            return;
        }
        alert(data.customerMessage || 'STK Push sent. Please complete payment on your phone.');
        closeModal();
        state.cart = [];
        updateCart();
        if (typeof loadAnalytics === 'function') loadAnalytics();
    } catch (e) {
        alert('Network error: ' + e.message);
    } finally {
        if (btn) {
            btn.innerText = 'PUSH TO PHONE';
            btn.disabled = false;
        }
    }
}

async function checkoutCash() {
    if (state.cart.length === 0) return alert('Cart is empty!');
    const exceeds = state.cart.some(item => item.quantity > getStock(item.id));
    if (exceeds) return alert('Some items exceed available stock. Adjust quantities or remove them.');

    try {
        const payload = {
            paymentMethod: 'CASH',
            items: state.cart.map(i => ({ product: { id: i.id }, quantity: i.quantity })),
        };
        const res = await fetch(API_BASE + '/sales/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || err.error || 'Checkout failed');
        }
        state.cart = [];
        updateCart();
        alert('Cash sale completed.');
        if (typeof loadAnalytics === 'function') loadAnalytics();
    } catch (e) {
        alert('Checkout failed: ' + e.message);
    }
}

function showAnalytics() {
    document.getElementById('pos-main').classList.add('hidden');
    document.getElementById('analytics-panel').classList.remove('hidden');
    loadAnalytics();
}

function showPOS() {
    document.getElementById('analytics-panel').classList.add('hidden');
    document.getElementById('pos-main').classList.remove('hidden');
}

async function loadAnalytics() {
    const panel = document.getElementById('analytics-panel');
    if (!panel || panel.classList.contains('hidden')) return;
    const container = document.getElementById('analytics-content');
    if (!container) return;
    container.innerHTML = '<p class="text-slate-400">Loading analytics...</p>';
    try {
        const res = await fetch(API_BASE + '/analytics/summary');
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        state.analytics = data;
        const pb = data.paymentBreakdown || {};
        const recent = (data.recentSales || []).slice(0, 10);
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div class="glass p-6 rounded-2xl">
                    <p class="text-slate-400 text-sm">Today's Revenue</p>
                    <p class="text-2xl font-bold text-amber-500">KES ${(data.totalRevenue || 0).toLocaleString()}</p>
                </div>
                <div class="glass p-6 rounded-2xl">
                    <p class="text-slate-400 text-sm">Orders Today</p>
                    <p class="text-2xl font-bold text-white">${data.totalOrders || 0}</p>
                </div>
                <div class="glass p-6 rounded-2xl">
                    <p class="text-slate-400 text-sm">Avg Order</p>
                    <p class="text-2xl font-bold text-white">KES ${(data.averageOrder || 0).toLocaleString()}</p>
                </div>
            </div>
            <div class="glass p-6 rounded-2xl mb-6">
                <h3 class="font-bold mb-3">Payment breakdown</h3>
                <p class="text-slate-400">Cash: KES ${(pb.cash || 0).toLocaleString()} &nbsp;|&nbsp; M-Pesa: KES ${(pb.mpesa || 0).toLocaleString()} &nbsp;|&nbsp; Bank: KES ${(pb.bank || 0).toLocaleString()}</p>
            </div>
            <div class="glass p-6 rounded-2xl">
                <h3 class="font-bold mb-3">Recent transactions</h3>
                <div class="space-y-2 max-h-64 overflow-y-auto">
                    ${recent.length === 0 ? '<p class="text-slate-500">No transactions yet.</p>' : recent.map(s => `
                        <div class="flex justify-between text-sm py-2 border-b border-slate-700">
                            <span>${s.transactionId || s.id}</span>
                            <span class="text-amber-500">KES ${(s.totalAmount || 0).toLocaleString()}</span>
                            <span class="text-slate-500">${(s.paymentMethod || '-')} · ${s.status || '-'}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } catch (e) {
        container.innerHTML = '<p class="text-red-400">Could not load analytics. Is the backend running?</p>';
    }
}

init();
