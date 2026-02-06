const state = {
    products: [
        { id: 1, name: 'Tindi Premium Coffee', price: 250, code: '001', category: 'Retail' },
        { id: 2, name: 'Safi House Blend', price: 1200, code: '002', category: 'Retail' },
        { id: 3, name: 'Artisan Pastry', price: 150, code: '003', category: 'Bakery' },
        { id: 4, name: 'Organic Honey', price: 850, code: '004', category: 'Retail' },
    ],
    cart: [],
    user: null,
    business: "SAFI MODERN RETAIL"
};

const UI = {
    grid: document.getElementById('product-grid'),
    cart: document.getElementById('cart-items'),
    total: document.getElementById('total-val'),
    userDisplay: document.getElementById('display-user'),
    roleBadge: document.getElementById('userRoleBadge'),
    cashierDisplay: document.getElementById('display-cashier'),
    mpesaModal: document.getElementById('payment-modal'),
    receiptModal: document.getElementById('receipt-modal'),
    loginOverlay: document.getElementById('loginOverlay')
};

async function handleLogin() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    const error = document.getElementById('loginError');

    // In a real scenario, we call the Spring Boot /api/auth/login
    // We can simulate the fetch to the backend if running
    try {
        const response = await fetch('http://localhost:8080/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass })
        });

        if (response.ok) {
            const data = await response.json();
            state.user = {
                name: data.fullName || data.username,
                role: data.roles[0].name.replace('ROLE_', '')
            };
            init();
            UI.loginOverlay.classList.add('hidden');
            return;
        }
    } catch (e) {
        console.warn("Backend not reached, using local fallback");
    }

    const demoProfiles = {
        'admin': { name: 'Super Admin', role: 'ADMIN' },
        'manager': { name: 'Store Manager', role: 'MANAGER' },
        'cashier': { name: 'Main Cashier', role: 'CASHIER' }
    };

    if (demoProfiles[user] && pass === '1234') {
        state.user = demoProfiles[user];
        init();
        UI.loginOverlay.classList.add('hidden');
    } else {
        error.classList.remove('hidden');
    }
}

function switchAuthState(state) {
    const boxes = ['signInBox', 'signUpBox', 'forgotBox'];
    boxes.forEach(id => document.getElementById(id).classList.add('hidden'));

    if (state === 'login') document.getElementById('signInBox').classList.remove('hidden');
    if (state === 'signup') document.getElementById('signUpBox').classList.remove('hidden');
    if (state === 'forgot') document.getElementById('forgotBox').classList.remove('hidden');
}

async function handleSignUp() {
    const username = document.getElementById('regUsername').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const role = document.getElementById('regRole').value;

    try {
        const response = await fetch('http://localhost:8080/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password, role })
        });
        if (response.ok) {
            alert("Registration successful! Please login.");
            switchAuthState('login');
        }
    } catch (e) {
        alert("Action failed. Ensure backend Hub is running on port 8080.");
    }
}

async function handleForgotRequest() {
    const email = document.getElementById('forgotEmail').value;
    try {
        const response = await fetch('http://localhost:8080/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        if (response.ok) {
            document.getElementById('forgotStep1').classList.add('hidden');
            document.getElementById('forgotStep2').classList.remove('hidden');
        }
    } catch (e) {
        alert("Check backend connectivity.");
    }
}
async function handleResetPassword() {
    const email = document.getElementById('forgotEmail').value;
    const code = document.getElementById('resetCode').value;
    const newPassword = document.getElementById('newPassword').value;

    try {
        const response = await fetch('http://localhost:8080/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code, newPassword })
        });
        if (response.ok) {
            alert("Password updated! Log in now.");
            switchAuthState('login');
        }
    } catch (e) {
        alert("Reset failed.");
    }
}

function init() {
    if (!state.user) return;
    UI.userDisplay.innerText = state.user.name;
    UI.cashierDisplay.innerText = state.user.name;
    UI.roleBadge.innerText = state.user.role;
    applyPermissions(state.user.role);
    switchView('checkout');
    syncProductsFromHub();
}

async function syncProductsFromHub() {
    try {
        const response = await fetch('http://localhost:8080/api/products');
        if (response.ok) {
            state.products = await response.json();
            renderProducts();
        }
    } catch (e) {
        console.warn("Could not sync with Hub, using local state");
        renderProducts();
    }
}

function switchView(view) {
    const views = ['viewCheckout', 'viewInventory', 'viewAnalytics'];
    views.forEach(id => document.getElementById(id).classList.add('hidden'));

    if (view === 'checkout') {
        document.getElementById('viewCheckout').classList.remove('hidden');
        renderProducts();
    } else if (view === 'inventory') {
        document.getElementById('viewInventory').classList.remove('hidden');
        // RBAC: Hide "Add Product" button for Cashiers
        const addBtn = document.querySelector('#viewInventory button');
        if (state.user.role === 'CASHIER') addBtn.classList.add('hidden');
        else addBtn.classList.remove('hidden');
        loadInventory();
    } else if (view === 'analytics') {
        document.getElementById('viewAnalytics').classList.remove('hidden');
        loadAnalytics();
    } else if (view === 'support') {
        document.getElementById('viewSupport').classList.remove('hidden');
        loadIssues();
    }
}

async function handleLogout() {
    if (confirm("Are you sure you want to sign out?")) {
        try {
            await fetch('http://localhost:8080/api/auth/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: state.user.name })
            });
        } catch (e) {
            console.warn("Logout not synced to Hub.");
        }
        state.user = null;
        state.cart = [];
        UI.loginOverlay.classList.remove('hidden');
        switchAuthState('login');
    }
}

async function loadInventory() {
    await syncProductsFromHub();
    const list = document.getElementById('inventory-list');
    list.innerHTML = state.products.map(p => `
        <tr class="border-b border-slate-800 hover:bg-white/5 transition">
            <td class="py-4 px-2 font-mono text-xs text-amber-500">${p.code}</td>
            <td class="py-4 px-2 font-bold">${p.name}</td>
            <td class="py-4 px-2">KES ${p.price.toLocaleString()}</td>
            <td class="py-4 px-2">${p.stockQuantity || p.stock || 0}</td>
            <td class="py-4 px-2">
                ${state.user.role !== 'CASHIER' ? `<button onclick="openEditProductModal(${p.id})" class="text-blue-400 hover:text-blue-300 mr-3">Edit</button>` : '<span class="text-slate-500 italic text-xs">View Only</span>'}
            </td>
        </tr>
    `).join('');
}

async function loadIssues() {
    try {
        const response = await fetch('http://localhost:8080/api/support');
        if (response.ok) {
            const issues = await response.json();
            const container = document.getElementById('support-messages');
            container.innerHTML = `
                <div class="flex justify-start">
                    <div class="bg-slate-800 p-4 rounded-2xl rounded-tl-none max-w-[80%]">
                        <p class="text-[10px] font-black text-amber-500 uppercase mb-1">System Assistant</p>
                        <p class="text-sm">Welcome to the Safi Support Hub. Please describe any issues or requests for your department below.</p>
                    </div>
                </div>
            ` + issues.map(issue => `
                <div class="flex ${issue.department === state.user.role ? 'justify-end' : 'justify-start'}">
                    <div class="${issue.department === state.user.role ? 'bg-amber-500 text-slate-900' : 'bg-slate-800 text-white'} p-4 rounded-2xl ${issue.department === state.user.role ? 'rounded-tr-none' : 'rounded-tl-none'} max-w-[80%]">
                        <p class="text-[10px] font-black ${issue.department === state.user.role ? 'text-slate-800/50' : 'text-amber-500'} uppercase mb-1">${issue.department}</p>
                        <p class="text-sm">${issue.message}</p>
                        <p class="text-[8px] mt-1 opacity-50">${new Date(issue.timestamp).toLocaleTimeString()}</p>
                    </div>
                </div>
            `).join('');
            container.scrollTop = container.scrollHeight;
        }
    } catch (e) {
        console.warn("Support API failed.");
    }
}

async function submitIssue() {
    const input = document.getElementById('supportInput');
    const message = input.value.trim();
    if (!message) return;

    try {
        const response = await fetch('http://localhost:8080/api/support', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                department: state.user.role,
                message: message
            })
        });
        if (response.ok) {
            input.value = '';
            loadIssues();
        }
    } catch (e) {
        alert("Failed to send issue. Check Hub connection.");
    }
}
try {
    const response = await fetch('http://localhost:8080/api/analytics/summary');
    if (response.ok) {
        const data = await response.json();
        document.getElementById('statRevenue').innerText = `KES ${data.totalRevenue.toLocaleString()}`;
        document.getElementById('statOrders').innerText = data.totalOrders;

        const recent = document.getElementById('analytics-recent-sales');
        recent.innerHTML = data.recentSales.map(s => `
                <div class="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl border border-slate-700">
                    <div>
                        <p class="text-xs font-bold">${s.transactionId.substring(0, 8)}...</p>
                        <p class="text-[10px] text-slate-500">${new Date(s.timestamp).toLocaleTimeString()}</p>
                    </div>
                    <p class="font-black text-amber-500">KES ${s.totalAmount.toLocaleString()}</p>
                </div>
            `).join('');
    }
} catch (e) {
    alert("Analytics requires Backend connection.");
}
}

function openModal(content) {
    document.getElementById('modal-box').innerHTML = content;
    document.getElementById('modal-container').classList.remove('hidden');
}

function closeDynamicModal() {
    document.getElementById('modal-container').classList.add('hidden');
}

function openAddProductModal() {
    const html = `
        <h2 class="text-2xl font-bold mb-6">Add New Product</h2>
        <div class="space-y-4">
            <input id="p-code" type="text" placeholder="Barcode/Code" class="w-full bg-slate-900 p-4 rounded-xl border border-slate-700">
            <input id="p-name" type="text" placeholder="Product Name" class="w-full bg-slate-900 p-4 rounded-xl border border-slate-700">
            <div class="grid grid-cols-2 gap-4">
                <input id="p-price" type="number" placeholder="Price" class="w-full bg-slate-900 p-4 rounded-xl border border-slate-700">
                <input id="p-stock" type="number" placeholder="Stock" class="w-full bg-slate-900 p-4 rounded-xl border border-slate-700">
            </div>
            <button onclick="saveProduct()" class="w-full py-4 gold-gradient rounded-xl font-bold text-lg">SAVE PRODUCT</button>
            <button onclick="closeDynamicModal()" class="w-full text-slate-500 text-sm">Cancel</button>
        </div>
    `;
    openModal(html);
}

function openEditProductModal(id) {
    const p = state.products.find(x => x.id === id);
    const html = `
        <h2 class="text-2xl font-bold mb-6">Edit Product</h2>
        <div class="space-y-4">
            <input id="p-code" type="text" value="${p.code}" class="w-full bg-slate-900 p-4 rounded-xl border border-slate-700">
            <input id="p-name" type="text" value="${p.name}" class="w-full bg-slate-900 p-4 rounded-xl border border-slate-700">
            <div class="grid grid-cols-2 gap-4">
                <input id="p-price" type="number" value="${p.price}" class="w-full bg-slate-900 p-4 rounded-xl border border-slate-700">
                <input id="p-stock" type="number" value="${p.stockQuantity || p.stock || 0}" class="w-full bg-slate-900 p-4 rounded-xl border border-slate-700">
            </div>
            <button onclick="saveProduct(${id})" class="w-full py-4 gold-gradient rounded-xl font-bold text-lg">UPDATE PRODUCT</button>
            <button onclick="closeDynamicModal()" class="w-full text-slate-500 text-sm">Cancel</button>
        </div>
    `;
    openModal(html);
}

async function saveProduct(id = null) {
    const product = {
        code: document.getElementById('p-code').value,
        name: document.getElementById('p-name').value,
        price: parseFloat(document.getElementById('p-price').value),
        stockQuantity: parseInt(document.getElementById('p-stock').value)
    };

    const url = id ? `http://localhost:8080/api/products/${id}` : 'http://localhost:8080/api/products';
    const method = id ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(product)
        });
        if (response.ok) {
            closeDynamicModal();
            loadInventory();
        }
    } catch (e) {
        alert("Failed to save product. Check Hub connection.");
    }
}

function applyPermissions(role) {
    const permissions = {
        'ADMIN': ['menuInventory', 'menuReports', 'menuLogistics', 'menuAdmin'],
        'MANAGER': ['menuInventory', 'menuReports'],
        'LOGISTICS': ['menuLogistics'],
        'CASHIER': [],
        'SALES': ['menuReports']
    };

    // Hide all
    ['menuInventory', 'menuReports', 'menuLogistics', 'menuAdmin'].forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });

    // Show allowed
    (permissions[role] || []).forEach(id => {
        document.getElementById(id).classList.remove('hidden');
    });
}

function renderProducts() {
    UI.grid.innerHTML = state.products.map(p => `
        <div onclick="addToCart(${p.id})" class="glass p-5 rounded-[2rem] cursor-pointer hover:border-amber-500/50 transition-all group relative overflow-hidden">
            <div class="rust-badge absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">STOCK: ${p.stockQuantity || p.stock || 0}</div>
            <div class="w-full aspect-square bg-slate-800 rounded-2xl mb-4 flex items-center justify-center text-slate-700 group-hover:scale-105 transition-transform font-bold text-6xl">
                ${p.name[0]}
            </div>
            <h3 class="font-bold text-sm mb-1">${p.name}</h3>
            <p class="text-amber-500 font-black">KES ${p.price.toLocaleString()}</p>
        </div>
    `).join('');
}

function addToCart(pid) {
    const product = state.products.find(p => p.id === pid);
    const existing = state.cart.find(i => i.id === pid);
    if (existing) existing.quantity++;
    else state.cart.push({ ...product, quantity: 1 });
    renderCart();
}

function renderCart() {
    UI.cart.innerHTML = state.cart.map(item => `
        <div class="flex justify-between items-center glass p-4 rounded-2xl animate-in slide-in-from-right-4 duration-300">
            <div>
                <h4 class="font-bold text-slate-200">${item.name}</h4>
                <p class="text-xs text-amber-500/80 font-bold">${item.quantity} x KES ${item.price}</p>
            </div>
            <div class="flex items-center gap-3">
                <span class="font-bold">KES ${(item.price * item.quantity).toLocaleString()}</span>
                <button onclick="removeFromCart(${item.id})" class="text-slate-600 hover:text-red-500">✕</button>
            </div>
        </div>
    `).join('');
    const total = state.cart.reduce((s, i) => s + (i.price * i.quantity), 0);
    UI.total.innerText = total.toLocaleString();
}

function openPaymentModal(method) {
    if (state.cart.length === 0) return alert("Cart is empty");

    let content = "";
    if (method === 'M-PESA') {
        content = `
            <div class="w-20 h-20 bg-green-500 rounded-2xl mx-auto mb-6 flex items-center justify-center text-white text-4xl font-black">M</div>
            <h3 class="text-2xl font-black mb-1">M-Pesa STK Push</h3>
            <p class="text-slate-400 text-sm mb-8">Ready to send prompt to customer phone</p>
            <input id="pay-phone" type="text" placeholder="07XX XXX XXX" class="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl py-5 px-6 mb-6 text-center text-2xl font-black tracking-widest outline-none focus:border-amber-500">
            <button onclick="triggerPayment('M-PESA')" class="w-full py-5 gold-gradient rounded-2xl font-black text-lg">SEND PUSH</button>
        `;
    } else {
        content = `
            <div class="w-20 h-20 bg-blue-500 rounded-2xl mx-auto mb-6 flex items-center justify-center text-white text-4xl font-black">B</div>
            <h3 class="text-2xl font-black mb-1">${method} BANK</h3>
            <p class="text-slate-400 text-sm mb-8">Process merchant bank payment</p>
            <button onclick="triggerPayment('${method}')" class="w-full py-5 gold-gradient rounded-2xl font-black text-lg">AUTHORIZE</button>
        `;
    }

    document.getElementById('payment-content').innerHTML = content + `<button onclick="closeModal()" class="mt-4 text-slate-500 text-sm">Cancel</button>`;
    UI.mpesaModal.classList.remove('hidden');
}

function closeModal() { UI.mpesaModal.classList.add('hidden'); }

async function triggerPayment(method) {
    const total = state.cart.reduce((s, i) => s + (i.price * i.quantity), 0);
    const sale = {
        items: state.cart.map(i => ({ product_id: i.id, quantity: i.quantity })),
        payment_method: method,
        cashier_name: state.cashier
    };

    // Call Rust Terminal API
    const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sale)
    });

    const result = await response.json();
    showReceipt(result.qr_code);
}

function showReceipt(qr) {
    const total = state.cart.reduce((s, i) => s + (i.price * i.quantity), 0);
    document.getElementById('receipt-biz').innerText = state.business;
    document.getElementById('receipt-date').innerText = new Date().toLocaleString();
    document.getElementById('receipt-total').innerText = "KES " + total.toLocaleString();
    document.getElementById('receipt-qr').src = qr;

    document.getElementById('receipt-items').innerHTML = state.cart.map(i => `
        <div class="flex justify-between text-xs font-bold uppercase">
            <span>${i.name} x ${i.quantity}</span>
            <span>${(i.price * i.quantity).toLocaleString()}</span>
        </div>
    `).join('');

    UI.receiptModal.classList.remove('hidden');
    closeModal();
}

function closeReceipt() {
    UI.receiptModal.classList.add('hidden');
    state.cart = [];
    renderCart();
}

init();
