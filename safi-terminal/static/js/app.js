const state = {
    products: [
        { id: 1, name: 'Tindi Premium Coffee', price: 250, code: '001', category: 'Retail' },
        { id: 2, name: 'Safi House Blend', price: 1200, code: '002', category: 'Retail' },
        { id: 3, name: 'Artisan Pastry', price: 150, code: '003', category: 'Bakery' },
        { id: 4, name: 'Organic Honey', price: 850, code: '004', category: 'Retail' },
    ],
    cart: [],
    user: null,
    business: "SAFI MODERN RETAIL",
    filters: {
        search: '',
        category: 'All'
    }
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

    // Clear previous error
    error.classList.add('hidden');

    // Validation
    if (!user || !pass) {
        error.innerText = "Please enter username and password";
        error.classList.remove('hidden');
        return;
    }

    try {
        const response = await fetch('http://localhost:8080/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Extract user data from response
            const userData = data.user;
            state.user = {
                name: userData.fullName || userData.username,
                role: userData.roles && userData.roles.length > 0
                    ? userData.roles[0].name.replace('ROLE_', '')
                    : 'USER'
            };

            console.log("Login successful:", state.user);
            init();
            UI.loginOverlay.classList.add('hidden');
            return;
        } else {
            error.innerText = data.message || "Invalid username or password";
            error.classList.remove('hidden');
        }
    } catch (e) {
        console.warn("Backend not reachable, trying local fallback:", e);
        error.innerText = "Cannot connect to server. Please ensure backend is running on port 8080.";
        error.classList.remove('hidden');

        // Local fallback for demo
        const demoProfiles = {
            'admin': { name: 'Super Admin', role: 'ADMIN' },
            'manager': { name: 'Store Manager', role: 'MANAGER' },
            'cashier': { name: 'Main Cashier', role: 'CASHIER' }
        };

        if (demoProfiles[user] && pass === '1234') {
            state.user = demoProfiles[user];
            init();
            UI.loginOverlay.classList.add('hidden');
        }
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

    // Validation
    if (!username || !email || !password) {
        alert("Please fill in all fields");
        return;
    }

    if (username.length < 3) {
        alert("Username must be at least 3 characters");
        return;
    }

    if (password.length < 6) {
        alert("Password must be at least 6 characters");
        return;
    }

    try {
        const response = await fetch('http://localhost:8080/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username,
                email,
                password,
                fullName: username, // Use username as fullName for now
                role
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            alert("Registration successful! Please login with your credentials.");
            switchAuthState('login');
        } else {
            alert(data.message || "Registration failed. Please try again.");
        }
    } catch (e) {
        console.error("Registration error:", e);
        alert("Could not connect to backend. Please ensure the server is running on port 8080.");
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

    // Fast Billing: Barcode & Hotkeys
    let barcodeBuffer = "";
    let lastKeyTime = Date.now();

    document.addEventListener('keydown', (e) => {
        if (state.view !== 'checkout') return;

        // Hotkeys
        if (e.key === 'F9') { e.preventDefault(); openPaymentModal('M-PESA'); }
        if (e.key === 'F10') { e.preventDefault(); processCash(); }
        if (e.key === 'Escape') { closeModal(); closeReceipt(); }

        // Barcode Listener
        const now = Date.now();
        if (now - lastKeyTime > 100) barcodeBuffer = "";
        lastKeyTime = now;

        if (e.key === 'Enter') {
            if (barcodeBuffer.length >= 3) {
                const p = state.products.find(item => item.code === barcodeBuffer);
                if (p) addToCart(p.id);
            }
            barcodeBuffer = "";
        } else if (/^\d$/.test(e.key)) {
            barcodeBuffer += e.key;
        }
    });

    // Search & Category Filters
    const searchInput = document.getElementById('productSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            state.filters.search = e.target.value.toLowerCase();
            renderProducts();
        });
    }

    const categoryBtns = document.querySelectorAll('.category-btn');
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            categoryBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.filters.category = btn.getAttribute('data-category');
            renderProducts();
        });
    });

    // Cart scroll indicator listener
    const cartScrollContainer = document.getElementById('cart-scroll-container');
    const scrollIndicator = document.getElementById('scroll-indicator');

    if (cartScrollContainer && scrollIndicator) {
        cartScrollContainer.addEventListener('scroll', () => {
            const isAtBottom = cartScrollContainer.scrollHeight - cartScrollContainer.scrollTop <= cartScrollContainer.clientHeight + 50;

            if (isAtBottom) {
                scrollIndicator.classList.add('hidden');
            } else if (state.cart.length > 0) {
                const hasScroll = cartScrollContainer.scrollHeight > cartScrollContainer.clientHeight;
                if (hasScroll) {
                    scrollIndicator.classList.remove('hidden');
                }
            }
        });
    }
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
    const views = ['viewCheckout', 'viewInventory', 'viewAnalytics', 'viewSupport'];
    views.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    if (view === 'checkout') {
        document.getElementById('viewCheckout').classList.remove('hidden');
        renderProducts();
    } else if (view === 'inventory') {
        document.getElementById('viewInventory').classList.remove('hidden');
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
    list.innerHTML = state.products.map(p => {
        const stock = p.stockQuantity || p.stock || 0;
        const lowStock = stock <= 5;
        return `
            <tr class="border-b border-slate-800 hover:bg-white/5 transition ${lowStock ? 'bg-red-500/5' : ''}">
                <td class="py-4 px-2 font-mono text-xs text-amber-500">${p.code}</td>
                <td class="py-4 px-2 font-bold">${p.name}</td>
                <td class="py-4 px-2">KES ${p.price.toLocaleString()}</td>
                <td class="py-4 px-2">
                    <span class="${lowStock ? 'bg-red-500 text-white px-2 py-1 rounded-md font-black animate-pulse text-[10px]' : 'font-bold'}">
                        ${stock} ${lowStock ? 'LOW' : ''}
                    </span>
                </td>
                <td class="py-4 px-2">
                    ${state.user.role !== 'CASHIER' ? `<button onclick="openEditProductModal(${p.id})" class="text-blue-400 hover:text-blue-300 mr-3">Edit</button>` : '<span class="text-slate-500 italic text-xs">View Only</span>'}
                </td>
            </tr>
        `;
    }).join('');
}

async function loadIssues() {
    try {
        const response = await fetch(`http://localhost:8080/api/support?dept=${state.user.role}`);
        if (response.ok) {
            const issues = await response.json();
            const container = document.getElementById('support-messages');
            container.innerHTML = `
                <div class="flex justify-start">
                    <div class="bg-slate-800 p-4 rounded-2xl rounded-tl-none max-w-[80%]">
                        <p class="text-[10px] font-black text-amber-500 uppercase mb-1">System Assistant</p>
                        <p class="text-sm">Welcome to the Safi Support Hub. You are viewing messages for the ${state.user.role} department.</p>
                    </div>
                </div>
            ` + issues.map(issue => `
                <div class="flex ${issue.department === state.user.role ? 'justify-end' : 'justify-start'}">
                    <div class="${issue.department === state.user.role ? 'bg-amber-500 text-slate-900' : 'bg-slate-800 text-white'} p-4 rounded-2xl ${issue.department === state.user.role ? 'rounded-tr-none' : 'rounded-tl-none'} max-w-[80%]">
                        <div class="flex justify-between items-center gap-4 mb-1">
                            <p class="text-[10px] font-black ${issue.department === state.user.role ? 'text-slate-800/50' : 'text-amber-500'} uppercase">From: ${issue.department}</p>
                            <p class="text-[8px] font-bold ${issue.department === state.user.role ? 'text-slate-800/40' : 'text-slate-500'} uppercase">To: ${issue.targetDepartment}</p>
                        </div>
                        <p class="text-sm font-medium">${issue.message}</p>
                        <p class="text-[8px] mt-2 opacity-50">${new Date(issue.timestamp).toLocaleTimeString()}</p>
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
    const target = document.getElementById('supportTarget').value;
    const message = input.value.trim();
    if (!message) return;

    if (!state.user) {
        alert("You must be logged in to send messages.");
        return;
    }

    try {
        const response = await fetch('http://localhost:8080/api/support', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                department: state.user.role,
                targetDepartment: target,
                message: message
            })
        });
        if (response.ok) {
            input.value = '';
            loadIssues();
        } else {
            throw new Error("Server rejected the message. (Status: " + response.status + ")");
        }
    } catch (e) {
        console.error("Support Hub Fetch Error:", e);
        alert("Failed to send: " + e.message + "\n1. Ensure Spring Hub is running on Port 8080\n2. Check for CORS blocking in browser console.");
    }
}

async function loadAnalytics() {
    let data = null;

    // Try local Tauri analytics first (instant, always available)
    try {
        const localResp = await fetch('/api/local-analytics');
        if (localResp.ok) {
            data = await localResp.json();
            console.log('Analytics loaded from local terminal');
        }
    } catch (e) {
        console.warn('Local analytics not available, trying Spring Boot...');
    }

    // Fallback to Spring Boot central hub
    if (!data) {
        try {
            const hubResp = await fetch('http://localhost:8080/api/analytics/summary');
            if (hubResp.ok) {
                data = await hubResp.json();
                console.log('Analytics loaded from Spring Boot Hub');
            }
        } catch (e) {
            console.warn('Spring Boot analytics also unavailable.');
        }
    }

    if (!data) return;

    // Update stats display
    document.getElementById('statRevenue').innerText = `KES ${(data.totalRevenue || 0).toLocaleString()}`;
    document.getElementById('statOrders').innerText = data.totalOrders || 0;

    // Store analytics data globally for daily report
    state.lastAnalytics = data;

    // Render recent sales
    const recent = document.getElementById('analytics-recent-sales');
    if (recent) {
        const sales = data.recentSales || [];
        if (sales.length === 0) {
            recent.innerHTML = `
                <div class="text-center py-8 text-slate-500">
                    <p class="text-4xl mb-3">📊</p>
                    <p class="font-bold">No transactions today</p>
                    <p class="text-xs mt-1">Sales will appear here as you process them</p>
                </div>
            `;
        } else {
            recent.innerHTML = sales.map(s => `
                <div class="p-4 bg-slate-900/50 rounded-2xl border border-slate-700 space-y-3 animate-in fade-in duration-300">
                    <div class="flex justify-between items-center pb-2 border-b border-slate-800">
                        <div>
                            <p class="text-xs font-black text-amber-500">${(s.transactionId || '').substring(0, 8)}...</p>
                            <p class="text-[10px] text-slate-500">${new Date(s.timestamp).toLocaleString()}</p>
                        </div>
                        <div class="text-right">
                            <p class="font-black text-lg">KES ${(s.totalAmount || 0).toLocaleString()}</p>
                            <p class="text-[9px] text-slate-400 uppercase font-bold">Via ${s.paymentMethod || 'CASH'}</p>
                        </div>
                    </div>
                    <div class="space-y-1">
                        ${(s.items || []).map(item => `
                            <div class="flex justify-between text-[10px]">
                                <span class="text-slate-300">${item.productName || 'Item'} x ${item.quantity}</span>
                                <span class="text-slate-500">KES ${(item.subtotal || 0).toLocaleString()}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('');
        }
    }
}

function openModal(content) {
    const modalBox = document.getElementById('payment-content');
    if (modalBox) {
        modalBox.innerHTML = content;
        UI.mpesaModal.classList.remove('hidden');
    }
}

function closeModal() {
    UI.mpesaModal.classList.add('hidden');
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
            <select id="p-category" class="w-full bg-slate-900 p-4 rounded-xl border border-slate-700 text-slate-400">
                <option value="Retail">Retail</option>
                <option value="Bakery">Bakery</option>
                <option value="Electronics">Electronics</option>
                <option value="Groceries">Groceries</option>
            </select>
            <button onclick="saveProduct()" class="w-full py-4 gold-gradient rounded-xl font-bold text-lg">SAVE PRODUCT</button>
            <button onclick="closeModal()" class="w-full text-slate-500 text-sm mt-4">Cancel</button>
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
            <select id="p-category" class="w-full bg-slate-900 p-4 rounded-xl border border-slate-700 text-slate-400">
                <option value="Retail" ${p.category === 'Retail' ? 'selected' : ''}>Retail</option>
                <option value="Bakery" ${p.category === 'Bakery' ? 'selected' : ''}>Bakery</option>
                <option value="Electronics" ${p.category === 'Electronics' ? 'selected' : ''}>Electronics</option>
                <option value="Groceries" ${p.category === 'Groceries' ? 'selected' : ''}>Groceries</option>
            </select>
            <button onclick="saveProduct(${id})" class="w-full py-4 gold-gradient rounded-xl font-bold text-lg">UPDATE PRODUCT</button>
            <button onclick="closeModal()" class="w-full text-slate-500 text-sm mt-4">Cancel</button>
        </div>
    `;
    openModal(html);
}

async function saveProduct(id = null) {
    const product = {
        code: document.getElementById('p-code').value,
        name: document.getElementById('p-name').value,
        price: parseFloat(document.getElementById('p-price').value),
        stockQuantity: parseInt(document.getElementById('p-stock').value),
        category: document.getElementById('p-category').value
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
            closeModal();
            loadInventory();
        } else {
            const errorText = await response.text();
            alert(`Failed to save (Status: ${response.status}): ${errorText}`);
        }
    } catch (e) {
        console.error("Save Error:", e);
        alert("Network Error: Could not connect to Hub on port 8080. Ensure the Spring Boot backend is running.");
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

    ['menuInventory', 'menuReports', 'menuLogistics', 'menuAdmin'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    (permissions[role] || []).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('hidden');
    });
}

function renderProducts() {
    const filtered = state.products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(state.filters.search) || p.code.toLowerCase().includes(state.filters.search);
        const matchesCategory = state.filters.category === 'All' || p.category === state.filters.category;
        return matchesSearch && matchesCategory;
    });

    UI.grid.innerHTML = filtered.map((p, index) => `
        <div onclick="addToCart(${p.id})" 
             class="product-card p-5 rounded-[2rem] cursor-pointer relative overflow-hidden group ${p.stockQuantity <= 5 ? 'border-red-500/30 ring-1 ring-red-500/20' : ''}"
             style="animation-delay: ${index * 50}ms">
            <div class="rust-badge absolute top-4 right-4 ${p.stockQuantity <= 5 ? 'bg-red-500 text-white animate-pulse' : 'bg-amber-500 text-slate-900'}">
                ${p.stockQuantity <= 5 ? 'LOW STOCK: ' : 'STOCK: '}${p.stockQuantity || 0}
            </div>
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

function removeFromCart(pid) {
    state.cart = state.cart.filter(i => i.id !== pid);
    renderCart();
}

function renderCart() {
    const cartCount = document.getElementById('cart-count');
    const emptyMessage = document.getElementById('empty-cart-message');
    const scrollContainer = document.getElementById('cart-scroll-container');
    const scrollIndicator = document.getElementById('scroll-indicator');

    // Update cart count badge
    if (cartCount) {
        cartCount.innerText = state.cart.length;
    }

    // Show/hide empty cart message
    if (emptyMessage) {
        if (state.cart.length === 0) {
            emptyMessage.classList.remove('hidden');
        } else {
            emptyMessage.classList.add('hidden');
        }
    }

    // Render cart items
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

    // Update total
    const total = state.cart.reduce((s, i) => s + (i.price * i.quantity), 0);
    UI.total.innerText = total.toLocaleString();

    // Check if scroll indicator should be shown
    setTimeout(() => {
        if (scrollContainer && scrollIndicator) {
            const hasScroll = scrollContainer.scrollHeight > scrollContainer.clientHeight;
            const isAtBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop <= scrollContainer.clientHeight + 50;

            if (hasScroll && !isAtBottom && state.cart.length > 0) {
                scrollIndicator.classList.remove('hidden');
            } else {
                scrollIndicator.classList.add('hidden');
            }
        }
    }, 100);
}

function openPaymentModal(method) {
    if (state.cart.length === 0) return alert("Cart is empty");

    let content = "";
    if (method === 'M-PESA') {
        content = `
            <div class="w-20 h-20 bg-green-600 rounded-3xl mx-auto mb-6 flex items-center justify-center text-white text-4xl font-black shadow-lg shadow-green-900/40">M</div>
            <h3 class="text-3xl font-black mb-2 text-white">M-Pesa Payments</h3>
            <p class="text-slate-400 text-sm mb-8">Select your preferred M-Pesa module</p>
            
            <div class="grid grid-cols-2 gap-4 mb-6">
                <button onclick="setMpesaMode('STK')" class="p-4 glass rounded-2xl border-green-500/30 hover:bg-green-500/10 text-sm font-bold">STK PUSH</button>
                <button onclick="setMpesaMode('C2B')" class="p-4 glass rounded-2xl border-blue-500/30 hover:bg-blue-500/10 text-sm font-bold">PAYBILL/TILL</button>
                <button onclick="setMpesaMode('SEND')" class="p-4 glass rounded-2xl border-amber-500/30 hover:bg-amber-500/10 text-sm font-bold">SEND MONEY</button>
                <button onclick="setMpesaMode('QR')" class="p-4 glass rounded-2xl border-slate-500/30 hover:bg-slate-500/10 text-sm font-bold">MPESA QR</button>
            </div>

            <div id="mpesa-module-content" class="animate-in fade-in zoom-in duration-300">
                <!-- Initial view is STK -->
                <input id="pay-phone" type="text" placeholder="07XX XXX XXX" class="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl py-4 px-6 mb-4 text-center text-xl font-bold tracking-widest outline-none focus:border-green-500">
                <button onclick="triggerPayment('M-PESA STK')" class="w-full py-5 gold-gradient rounded-2xl font-black text-lg">SEND STK PROMPT</button>
            </div>
            
            <button onclick="closeModal()" class="mt-6 text-slate-500 text-sm hover:text-slate-300">Cancel Payment</button>
        `;
    } else {
        content = `
            <div class="w-20 h-20 bg-blue-500 rounded-2xl mx-auto mb-6 flex items-center justify-center text-white text-4xl font-black">B</div>
            <h3 class="text-2xl font-black mb-1">${method} BANK</h3>
            <p class="text-slate-400 text-sm mb-8">Process merchant bank payment</p>
            <button onclick="triggerPayment('${method}')" class="w-full py-5 gold-gradient rounded-2xl font-black text-lg">AUTHORIZE</button>
            <button onclick="closeModal()" class="mt-4 text-slate-500 text-sm">Cancel</button>
        `;
    }

    openModal(content);
}

function setMpesaMode(mode) {
    const container = document.getElementById('mpesa-module-content');
    if (mode === 'STK') {
        container.innerHTML = `
            <input id="pay-phone" type="text" placeholder="07XX XXX XXX" class="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl py-4 px-6 mb-4 text-center text-xl font-bold tracking-widest outline-none focus:border-green-500">
            <button onclick="triggerPayment('M-PESA STK')" class="w-full py-5 gold-gradient rounded-2xl font-black text-lg">SEND STK PROMPT</button>
        `;
    } else if (mode === 'C2B') {
        container.innerHTML = `
            <div class="bg-slate-900/50 p-6 rounded-3xl border border-slate-700 mb-6 text-left">
                <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Instructions</p>
                <p class="text-sm text-slate-300 leading-relaxed">1. Go to M-Pesa Menu<br>2. Lipa na M-Pesa<br>3. Enter <strong>Paybill: 174379</strong><br>4. Enter Amount & PIN</p>
            </div>
            <button onclick="triggerPayment('M-PESA C2B')" class="w-full py-5 glass border-blue-500/50 rounded-2xl font-black text-lg text-blue-400">FINALIZE AFTER PAYMENT</button>
        `;
    } else if (mode === 'SEND') {
        container.innerHTML = `
            <input id="pay-phone" type="text" placeholder="Recipient Number" class="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl py-4 px-6 mb-4 text-center text-xl font-bold tracking-widest outline-none focus:border-amber-500">
            <button onclick="triggerPayment('M-PESA SEND')" class="w-full py-5 glass border-amber-500/50 rounded-2xl font-black text-lg text-amber-500">SEND MONEY TO PHONE</button>
        `;
    }
}

async function triggerPayment(method) {
    if (state.cart.length === 0) return alert("Cart is empty");

    const phoneEl = document.getElementById('pay-phone');
    const sale = {
        items: state.cart.map(i => ({ product_id: i.id, quantity: i.quantity })),
        payment_method: method,
        customer_phone: phoneEl ? phoneEl.value.trim() : null,
        cashier_name: state.user ? state.user.name : "Anonymous"
    };

    try {
        const response = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sale)
        });

        if (!response.ok) throw new Error("Payment failed at terminal");

        const result = await response.json();
        showReceipt(result.qr_code);
        state.cart = [];
        renderCart();

        // Refresh products to show updated stock levels
        await syncProductsFromHub();

        // Refresh analytics immediately
        setTimeout(() => loadAnalytics(), 500);
    } catch (e) {
        alert("Transaction Failed: " + e.message);
    }
}

function processCash() {
    if (state.cart.length === 0) return alert("Cart is empty");

    const total = state.cart.reduce((s, i) => s + (i.price * i.quantity), 0);
    const content = `
        <div class="w-20 h-20 bg-amber-500 rounded-2xl mx-auto mb-6 flex items-center justify-center text-white text-4xl font-black">C</div>
        <h3 class="text-2xl font-black mb-1">Cash Payment</h3>
        <p class="text-slate-400 text-sm mb-4">Total Amount: <strong>KES ${total.toLocaleString()}</strong></p>
        <div class="space-y-4 mb-6">
            <input id="cash-received" type="number" placeholder="Amount Received" 
                class="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl py-4 px-6 text-2xl font-black text-center outline-none focus:border-amber-500"
                oninput="calculateChange(${total})">
            <div class="text-center">
                <p class="text-xs text-slate-500 uppercase font-bold">Change to Return</p>
                <p id="cash-change" class="text-2xl font-black text-green-500">KES 0.00</p>
            </div>
        </div>
        <button onclick="triggerPayment('CASH')" class="w-full py-5 gold-gradient rounded-2xl font-black text-lg shadow-xl shadow-amber-900/40">COMPLETE SALE</button>
        <button onclick="closeModal()" class="mt-4 text-slate-500 text-sm w-full">Cancel</button>
    `;

    openModal(content);
}

function calculateChange(total) {
    const received = parseFloat(document.getElementById('cash-received').value) || 0;
    const change = Math.max(0, received - total);
    document.getElementById('cash-change').innerText = `KES ${change.toLocaleString()}`;
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

async function generateSalesReport() {
    // Fetch real transaction data
    let reportData = null;
    try {
        const resp = await fetch('/api/local-analytics');
        if (resp.ok) reportData = await resp.json();
    } catch (e) {
        console.warn('Could not fetch local analytics for report');
    }

    // Fallback to cached analytics
    if (!reportData) reportData = state.lastAnalytics;
    if (!reportData) {
        alert('No analytics data available. Please ensure the system is running.');
        return;
    }

    const totalRevenue = (reportData.totalRevenue || 0).toLocaleString();
    const totalOrders = reportData.totalOrders || 0;
    const avgOrder = (reportData.averageOrder || 0).toFixed(2);
    const breakdown = reportData.paymentBreakdown || { cash: 0, mpesa: 0, bank: 0 };
    const sales = reportData.recentSales || [];

    // Build transaction rows
    const txRows = sales.map((s, i) => {
        const items = (s.items || []).map(it => `${it.productName} x${it.quantity}`).join(', ');
        const time = new Date(s.timestamp).toLocaleTimeString();
        return `
            <tr>
                <td>${i + 1}</td>
                <td style="font-family:monospace; font-size:11px;">${(s.transactionId || '').substring(0, 12)}...</td>
                <td>${time}</td>
                <td>${items || '-'}</td>
                <td style="text-transform:uppercase;">${s.paymentMethod || 'CASH'}</td>
                <td style="font-weight:bold; text-align:right;">KES ${(s.totalAmount || 0).toLocaleString()}</td>
            </tr>
        `;
    }).join('');

    let reportContent = `
        <html>
        <head>
            <title>Safi POS - Daily Sales Report</title>
            <style>
                body { font-family: 'Inter', 'Segoe UI', sans-serif; padding: 40px; color: #0f172a; line-height: 1.5; }
                .header { border-bottom: 4px solid #f59e0b; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
                .stats { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 30px; }
                .stat-card { background: #f8fafc; padding: 20px; border-radius: 16px; border: 1px solid #e2e8f0; }
                .stat-card h4 { margin: 0; color: #64748b; text-transform: uppercase; font-size: 10px; letter-spacing: 0.1em; }
                .stat-card p { margin: 8px 0 0 0; font-size: 24px; font-weight: 900; color: #0f172a; }
                .breakdown { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin: 20px 0; }
                .breakdown-card { background: #fefce8; padding: 16px; border-radius: 12px; border: 1px solid #fde68a; text-align: center; }
                .breakdown-card.mpesa { background: #ecfdf5; border-color: #a7f3d0; }
                .breakdown-card.bank { background: #eff6ff; border-color: #bfdbfe; }
                .breakdown-card h5 { margin: 0; font-size: 10px; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; }
                .breakdown-card p { margin: 6px 0 0 0; font-size: 18px; font-weight: 800; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th { text-align: left; background: #f1f5f9; padding: 12px; font-size: 11px; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; }
                td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
                tr:hover { background: #fefce8; }
                .footer { margin-top: 40px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px; }
                .section-title { font-size: 14px; font-weight: 800; color: #334155; margin: 30px 0 10px 0; text-transform: uppercase; letter-spacing: 0.05em; }
                @media print { .no-print { display: none; } body { padding: 20px; } }
            </style>
        </head>
        <body>
            <div class="header">
                <div>
                    <h1 style="margin:0; font-size:28px; font-weight:900;">DAILY SALES REPORT</h1>
                    <p style="margin:5px 0 0 0; color:#64748b; font-size:13px;">SAFI MODERN RETAIL &mdash; ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <p style="margin:2px 0 0 0; color:#94a3b8; font-size:11px;">Generated: ${new Date().toLocaleString()} | Cashier: ${state.user ? state.user.name : 'N/A'}</p>
                </div>
                <button onclick="window.print()" class="no-print" style="padding:10px 24px; background:#f59e0b; color:white; border:none; border-radius:10px; cursor:pointer; font-weight:bold; font-size:13px;">🖨️ PRINT</button>
            </div>
            
            <div class="stats">
                <div class="stat-card">
                    <h4>Total Revenue</h4>
                    <p>KES ${totalRevenue}</p>
                </div>
                <div class="stat-card">
                    <h4>Total Transactions</h4>
                    <p>${totalOrders}</p>
                </div>
                <div class="stat-card">
                    <h4>Average Order</h4>
                    <p>KES ${parseFloat(avgOrder).toLocaleString()}</p>
                </div>
            </div>

            <p class="section-title">Payment Breakdown</p>
            <div class="breakdown">
                <div class="breakdown-card">
                    <h5>💵 Cash</h5>
                    <p>KES ${(breakdown.cash || 0).toLocaleString()}</p>
                </div>
                <div class="breakdown-card mpesa">
                    <h5>📱 M-Pesa</h5>
                    <p>KES ${(breakdown.mpesa || 0).toLocaleString()}</p>
                </div>
                <div class="breakdown-card bank">
                    <h5>🏦 Bank</h5>
                    <p>KES ${(breakdown.bank || 0).toLocaleString()}</p>
                </div>
            </div>

            <p class="section-title">Transaction Details (${sales.length} transactions)</p>
            ${sales.length > 0 ? `
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Transaction ID</th>
                        <th>Time</th>
                        <th>Items</th>
                        <th>Payment</th>
                        <th style="text-align:right;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${txRows}
                    <tr style="background:#f1f5f9; font-weight:bold;">
                        <td colspan="5" style="text-align:right; font-size:13px;">GRAND TOTAL</td>
                        <td style="text-align:right; font-size:15px; color:#f59e0b;">KES ${totalRevenue}</td>
                    </tr>
                </tbody>
            </table>
            ` : '<p style="color:#94a3b8; text-align:center; padding:30px;">No transactions recorded today.</p>'}
            
            <div class="footer">
                Safi POS Enterprise Hub &mdash; Certified Financial Summary &mdash; ${new Date().toLocaleDateString()}
            </div>
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(reportContent);
    printWindow.document.close();
}

init();

// Start Analytics Polling — every 10 seconds for live updates
setInterval(() => {
    if (state.user) {
        loadAnalytics();
    }
}, 10000); // 10 seconds for responsive live updates
