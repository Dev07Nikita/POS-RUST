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
    syncCartToStock();
    renderProducts();
    updateCart();
}

function getStock(productId) {
    const p = state.products.find(x => x.id === productId);
    return p != null && p.stockQuantity != null ? p.stockQuantity : 999;
}

/** When products/stock change, cap cart quantities to available stock. Remove items with 0 stock. */
function syncCartToStock() {
    state.cart = state.cart.filter(item => {
        const stock = getStock(item.id);
        if (stock <= 0) return false;
        item.quantity = Math.min(item.quantity, stock);
        if (item.quantity <= 0) return false;
        return true;
    });
}

function addToCart(productId) {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;
    const stock = getStock(productId);
    if (stock <= 0) {
        alert('Out of stock: ' + product.name);
        return;
    }
    const existing = state.cart.find(item => item.id === productId);
    const newQty = existing ? existing.quantity + 1 : 1;
    const cappedQty = Math.min(newQty, stock);
    if (existing) {
        existing.quantity = cappedQty;
    } else {
        state.cart.push({ ...product, quantity: cappedQty });
    }
    if (cappedQty < newQty) {
        showToast('Limited to available stock: ' + cappedQty);
    }
    updateCart();
}

function removeFromCart(productId) {
    state.cart = state.cart.filter(item => item.id !== productId);
    updateCart();
}

function setCartItemToMax(productId) {
    const item = state.cart.find(i => i.id === productId);
    if (!item) return;
    const stock = getStock(productId);
    item.quantity = Math.min(item.quantity, stock);
    if (item.quantity <= 0) removeFromCart(productId);
    else updateCart();
    showToast('Quantity set to max available: ' + item.quantity);
}

function updateCartItemQty(productId, delta) {
    const item = state.cart.find(i => i.id === productId);
    if (!item) return;
    const stock = getStock(productId);
    let newQty = item.quantity + delta;
    if (newQty < 1) {
        removeFromCart(productId);
        return;
    }
    newQty = Math.min(newQty, stock);
    if (newQty < item.quantity + delta) showToast('Capped at available stock: ' + newQty);
    item.quantity = newQty;
    updateCart();
}

function showToast(msg) {
    const el = document.getElementById('toast');
    if (el) {
        el.textContent = msg;
        el.classList.remove('hidden');
        setTimeout(() => el.classList.add('hidden'), 3000);
    } else {
        alert(msg);
    }
}

function updateCart() {
    syncCartToStock();
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
                ${exceeds ? `<p class="text-xs text-red-400 mt-1">Exceeds stock (available: ${stock})</p>
                <button type="button" onclick="setCartItemToMax(${item.id})" class="text-xs text-amber-400 hover:text-amber-300 mt-1 underline">Set to max (${stock})</button>` : ''}
            </div>
            <div class="flex items-center gap-1">
                <button type="button" onclick="updateCartItemQty(${item.id}, -1)" class="text-slate-400 hover:text-white p-1 rounded">−</button>
                <span class="text-sm w-6 text-center">${item.quantity}</span>
                <button type="button" onclick="updateCartItemQty(${item.id}, 1)" class="text-slate-400 hover:text-white p-1 rounded">+</button>
                <button type="button" onclick="removeFromCart(${item.id})" class="text-slate-600 hover:text-red-500 p-2">✕</button>
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

function ensureCartWithinStock() {
    let changed = false;
    state.cart.forEach(item => {
        const stock = getStock(item.id);
        if (item.quantity > stock) {
            item.quantity = stock;
            changed = true;
        }
    });
    state.cart = state.cart.filter(item => item.quantity > 0);
    if (changed) updateCart();
    return changed;
}

function checkoutMpesa() {
    if (state.cart.length === 0) return alert('Cart is empty!');
    if (ensureCartWithinStock()) showToast('Quantities adjusted to available stock.');
    document.getElementById('mpesa-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('mpesa-modal').classList.add('hidden');
}

async function confirmPayment() {
    const phone = document.getElementById('customer-phone').value.trim();
    if (!phone) return alert('Enter phone number');

    ensureCartWithinStock();
    if (state.cart.length === 0) return alert('Cart is empty after adjusting stock.');

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
    if (ensureCartWithinStock()) showToast('Quantities adjusted to available stock.');
    if (state.cart.length === 0) return;

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
        showToast('Cash sale completed.');
        if (typeof loadAnalytics === 'function') loadAnalytics();
    } catch (e) {
        alert('Checkout failed: ' + e.message);
    }
}

function showAnalytics() {
    document.getElementById('pos-main').classList.add('hidden');
    document.getElementById('analytics-panel').classList.remove('hidden');
    document.getElementById('admin-hub-panel').classList.add('hidden');
    loadAnalytics();
}

function showAdminHub() {
    document.getElementById('pos-main').classList.add('hidden');
    document.getElementById('analytics-panel').classList.add('hidden');
    document.getElementById('admin-hub-panel').classList.remove('hidden');
    loadAdminHub();
}

function showPOS() {
    document.getElementById('analytics-panel').classList.add('hidden');
    document.getElementById('admin-hub-panel').classList.add('hidden');
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

async function loadAdminHub() {
    const panel = document.getElementById('admin-hub-panel');
    if (!panel || panel.classList.contains('hidden')) return;
    const container = document.getElementById('admin-hub-content');
    if (!container) return;
    container.innerHTML = '<p class="text-slate-400">Loading Admin Hub...</p>';
    try {
        const res = await fetch(API_BASE + '/admin/dashboard');
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        const users = data.users || [];
        const logs = (data.auditLogs || []).slice(0, 100);
        const sales = data.recentSales || [];
        const logistics = data.logisticsIssues || [];

        container.innerHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="glass p-6 rounded-2xl">
                    <h3 class="font-bold text-lg mb-3">Users (${users.length})</h3>
                    <div class="max-h-48 overflow-y-auto space-y-2">
                        ${users.length === 0 ? '<p class="text-slate-500">No users.</p>' : users.map(u => `
                            <div class="flex justify-between text-sm py-1 border-b border-slate-700">
                                <span class="font-medium">${u.username || '-'}</span>
                                <span class="text-slate-500">${(u.roles && u.roles.length) ? u.roles.map(r => r.name).join(', ') : '-'}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="glass p-6 rounded-2xl">
                    <h3 class="font-bold text-lg mb-3">Recent Sales (${sales.length})</h3>
                    <div class="max-h-48 overflow-y-auto space-y-2">
                        ${sales.length === 0 ? '<p class="text-slate-500">No sales yet.</p>' : sales.slice(0, 15).map(s => `
                            <div class="flex justify-between text-sm py-1 border-b border-slate-700">
                                <span>${(s.transactionId || s.id || '').toString().slice(0, 12)}...</span>
                                <span class="text-amber-500">KES ${(s.totalAmount || 0).toLocaleString()}</span>
                                <span class="text-slate-500">${s.paymentMethod || '-'}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            <div class="glass p-6 rounded-2xl">
                <h3 class="font-bold text-lg mb-3">Activity log (what everyone does)</h3>
                <div class="max-h-64 overflow-y-auto space-y-1 text-sm">
                    ${logs.length === 0 ? '<p class="text-slate-500">No activity yet.</p>' : logs.map(l => `
                        <div class="flex flex-wrap gap-2 py-2 border-b border-slate-700">
                            <span class="font-medium text-amber-400">${l.username || '-'}</span>
                            <span class="px-2 py-0.5 rounded bg-slate-700">${l.action || '-'}</span>
                            <span class="text-slate-400">${l.details || ''}</span>
                            <span class="text-slate-500 text-xs">${l.timestamp || ''}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="glass p-6 rounded-2xl">
                <h3 class="font-bold text-lg mb-3">Logistics & support</h3>
                <p class="text-slate-400 text-sm mb-4">Issues for Logistics. Create new or resolve.</p>
                <div class="mb-4 flex flex-wrap gap-2">
                    <select id="logistics-dept" class="bg-slate-800 rounded-lg px-3 py-2 text-sm">
                        <option value="LOGISTICS">From Logistics</option>
                        <option value="CASHIER">From Cashier</option>
                        <option value="MANAGER">From Manager</option>
                    </select>
                    <select id="logistics-target" class="bg-slate-800 rounded-lg px-3 py-2 text-sm">
                        <option value="LOGISTICS">To Logistics</option>
                        <option value="ALL">To All</option>
                        <option value="MANAGER">To Manager</option>
                    </select>
                    <input type="text" id="logistics-msg" placeholder="Message" class="bg-slate-800 rounded-lg px-3 py-2 text-sm flex-1 min-w-[120px]">
                    <button type="button" onclick="createSupportIssue()" class="px-4 py-2 gold-gradient rounded-lg font-bold text-sm">Create</button>
                </div>
                <div class="max-h-48 overflow-y-auto space-y-2">
                    ${logistics.length === 0 ? '<p class="text-slate-500">No logistics issues.</p>' : logistics.map(i => `
                        <div class="flex justify-between items-start gap-2 p-3 rounded-xl ${i.status === 'RESOLVED' ? 'bg-slate-800/50' : 'glass'}">
                            <div class="min-w-0 flex-1">
                                <p class="text-sm">${i.message || ''}</p>
                                <p class="text-xs text-slate-500">${i.department} → ${i.targetDepartment} · ${i.status} · ${i.timestamp || ''}</p>
                            </div>
                            ${i.status !== 'RESOLVED' ? `<button type="button" onclick="resolveIssue(${i.id})" class="shrink-0 px-3 py-1 rounded-lg bg-green-600 hover:bg-green-500 text-sm">Resolve</button>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } catch (e) {
        container.innerHTML = '<p class="text-red-400">Could not load Admin Hub. Is the backend running?</p>';
    }
}

async function createSupportIssue() {
    const dept = document.getElementById('logistics-dept')?.value || 'LOGISTICS';
    const target = document.getElementById('logistics-target')?.value || 'LOGISTICS';
    const msg = document.getElementById('logistics-msg')?.value?.trim();
    if (!msg) return alert('Enter a message');
    try {
        const res = await fetch(API_BASE + '/support', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ department: dept, targetDepartment: target, message: msg }),
        });
        if (!res.ok) throw new Error('Failed');
        document.getElementById('logistics-msg').value = '';
        loadAdminHub();
        showToast('Issue created.');
    } catch (e) {
        alert('Failed to create issue.');
    }
}

async function resolveIssue(id) {
    try {
        const res = await fetch(API_BASE + '/support/' + id + '/resolve', { method: 'PATCH' });
        if (!res.ok) throw new Error('Failed');
        loadAdminHub();
        showToast('Issue resolved.');
    } catch (e) {
        alert('Failed to resolve.');
    }
}

init();
