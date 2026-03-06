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
    },
    analytics: {
        period: 'daily',
        data: null
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

            // Extract role - handle multiple roles and pick the highest priority
            let userRole = 'USER';
            if (userData.roles && userData.roles.length > 0) {
                // Role priority: ADMIN > MANAGER > SALES > CASHIER > LOGISTICS > USER
                const rolePriority = {
                    'ADMIN': 1,
                    'MANAGER': 2,
                    'SALES': 3,
                    'CASHIER': 4,
                    'LOGISTICS': 5,
                    'USER': 6
                };

                let highestPriorityRole = null;
                let highestPriority = 999;

                userData.roles.forEach(roleObj => {
                    // Handle both "ROLE_NAME" and "NAME" formats
                    let roleName = roleObj.name.replace('ROLE_', '');
                    let priority = rolePriority[roleName] || 999;

                    if (priority < highestPriority) {
                        highestPriority = priority;
                        highestPriorityRole = roleName;
                    }
                });

                userRole = highestPriorityRole || 'USER';
            }

            state.user = {
                name: userData.fullName || userData.username,
                role: userRole,
                username: userData.username
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
    const fullName = document.getElementById('regFullName').value.trim();
    const username = document.getElementById('regUsername').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const role = document.getElementById('regRole').value;

    // Validation
    if (!fullName || !username || !email || !password) {
        showNotification('Please fill in all fields', '⚠️', 'Validation Error');
        return;
    }

    if (username.length < 3) {
        showNotification('Username must be at least 3 characters', '⚠️', 'Validation Error');
        return;
    }

    if (password.length < 6) {
        showNotification('Password must be at least 6 characters', '⚠️', 'Validation Error');
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
                fullName,
                role
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            const userRole = data.user && data.user.roles && data.user.roles.length > 0
                ? data.user.roles[0].name : role;
            showNotification(`Registration successful!\n\nUsername: ${username}\nRole: ${userRole}\n\nPlease login with your credentials.`, '✅', 'Success');
            switchAuthState('login');
        } else {
            showNotification(data.message || 'Registration failed. Please try again.', '❌', 'Registration Failed');
        }
    } catch (e) {
        console.error("Registration error:", e);
        showNotification('Could not connect to backend. Please ensure the server is running on port 8080.', '❌', 'Connection Error');
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

    // Update top-right role display
    const userRoleDisplay = document.getElementById('userRoleDisplay');
    if (userRoleDisplay) {
        userRoleDisplay.innerText = state.user.role;
    }

    // Update Support Hub welcome message
    const supportWelcomeMsg = document.getElementById('supportWelcomeMsg');
    if (supportWelcomeMsg) {
        supportWelcomeMsg.innerText = `Welcome to the Safi Support Hub. You are viewing messages for the ${state.user.role} department.`;
    }

    // Color code the role badge based on department
    const roleColors = {
        'ADMIN': 'bg-red-600',
        'MANAGER': 'bg-blue-600',
        'SALES': 'bg-green-600',
        'CASHIER': 'bg-amber-500',
        'LOGISTICS': 'bg-purple-600',
        'USER': 'bg-slate-600'
    };

    // Remove all possible color classes
    UI.roleBadge.className = 'inline-block px-2 py-0.5 rounded-md text-white text-[10px] font-black mb-1';
    // Add the role-specific color
    const colorClass = roleColors[state.user.role] || 'bg-slate-600';
    UI.roleBadge.classList.add(colorClass);

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
    const views = ['viewCheckout', 'viewInventory', 'viewAnalytics', 'viewSupport', 'viewLogistics', 'viewAdmin', 'viewBranches'];
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
    } else if (view === 'logistics') {
        const logView = document.getElementById('viewLogistics');
        if (logView) { logView.classList.remove('hidden'); loadLogistics(); }
    } else if (view === 'admin') {
        const adminView = document.getElementById('viewAdmin');
        if (adminView) { adminView.classList.remove('hidden'); loadAdminHub(); }
    } else if (view === 'branches') {
        const brView = document.getElementById('viewBranches');
        if (brView) { brView.classList.remove('hidden'); loadBranches(); }
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

/** Period selector: daily | weekly | monthly | yearly */
function setAnalyticsPeriod(period) {
    state.analytics.period = period;

    // Update UI active state
    ['Daily', 'Weekly', 'Monthly', 'Yearly'].forEach(p => {
        const btn = document.getElementById(`period${p}`);
        if (btn) {
            if (p.toLowerCase() === period) {
                btn.className = "px-4 py-2 rounded-lg text-xs font-black transition-all bg-amber-500 text-slate-900";
            } else {
                btn.className = "px-4 py-2 rounded-lg text-xs font-black transition-all text-slate-400 hover:text-white";
            }
        }
    });

    loadAnalytics();
}

/** Legacy alias for the polling interval */
async function loadAnalytics() {
    return loadAnalyticsReport();
}

/** Main data loader for the analytics dashboard */
async function loadAnalyticsReport() {
    const period = state.analytics.period || 'daily';
    const label = document.getElementById('analyticsPeriodLabel');
    if (label) label.innerText = `Loading ${period} data...`;

    let data = null;

    // Helper: fetch with manual timeout (AbortSignal.timeout not supported in all WebView2)
    async function fetchWithTimeout(url, ms) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), ms);
        try {
            const r = await fetch(url, { signal: controller.signal });
            clearTimeout(timer);
            return r;
        } catch (e) {
            clearTimeout(timer);
            throw e;
        }
    }

    // 1. Try Spring Boot (primary analytics source)
    try {
        const response = await fetchWithTimeout(
            `http://localhost:8080/api/analytics/report?period=${period}`, 6000
        );
        if (response.ok) {
            data = await response.json();
            console.log('Analytics loaded from Spring Boot');
        } else {
            console.warn('Analytics HTTP', response.status);
        }
    } catch (e) {
        console.warn('Spring Boot analytics unavailable:', e.message);
    }

    // 2. Fallback: Tauri local analytics
    if (!data) {
        try {
            const localResp = await fetchWithTimeout('/api/local-analytics', 3000);
            if (localResp.ok) {
                const localData = await localResp.json();
                data = {
                    revenue: localData.totalRevenue || 0,
                    cost: 0,
                    profit: localData.totalRevenue || 0,
                    orders: localData.totalOrders || 0,
                    avgOrder: localData.averageOrder || 0,
                    profitMargin: 0,
                    paymentBreakdown: {
                        cash: { total: localData.paymentBreakdown?.cash || 0, count: 0 },
                        mpesa: { total: localData.paymentBreakdown?.mpesa || 0, count: 0 },
                        bank: { total: localData.paymentBreakdown?.bank || 0, count: 0 }
                    },
                    chartRevenue: {},
                    chartProfit: {},
                    topProducts: [],
                    recentSales: (localData.recentSales || []).map(s => ({
                        transactionId: s.transactionId,
                        amount: s.totalAmount,
                        paymentMethod: s.paymentMethod,
                        timestamp: s.timestamp,
                        itemCount: (s.items || []).length
                    }))
                };
                console.log('Analytics: Tauri local fallback used');
            }
        } catch (e) {
            console.warn('Tauri local analytics unavailable:', e.message);
        }
    }

    // 3. Last resort: show stale cached data
    if (!data && state.analytics.data) {
        data = state.analytics.data;
        if (label) label.innerText = 'Showing cached data — backend offline';
    }

    if (!data) {
        if (label) label.innerText = '⚠ Start Spring Boot: cd pos-backend && ./gradlew bootRun';
        const errEl = document.getElementById('analyticsError');
        if (errEl) errEl.classList.remove('hidden');
        return;
    }

    const errEl = document.getElementById('analyticsError');
    if (errEl) errEl.classList.add('hidden');

    state.analytics.data = data;
    state.lastAnalytics = data;
    renderAnalyticsUI(data);

    const labels = { daily: 'Today', weekly: 'This Week', monthly: 'This Month', yearly: 'This Year' };
    if (label) label.innerText = data.periodLabel || labels[period] || `Data for ${period}`;
}

/** Updates all the cards, lists and charts on the analytics page */
function renderAnalyticsUI(data) {
    // 1. KPI Cards
    document.getElementById('kpiRevenue').innerText = `KES ${(data.revenue || 0).toLocaleString()}`;
    document.getElementById('kpiCost').innerText = `KES ${(data.cost || 0).toLocaleString()}`;
    document.getElementById('kpiProfit').innerText = `KES ${(data.profit || 0).toLocaleString()}`;

    document.getElementById('kpiAvgOrder').innerText = `Avg: KES ${(data.avgOrder || 0).toLocaleString()}`;
    document.getElementById('kpiOrders').innerText = `${data.orders || 0} transactions`;
    document.getElementById('kpiMargin').innerText = `Margin: ${data.profitMargin || 0}%`;

    // 2. Simple Chart Rendering (SVG-based bars)
    renderAnalyticsChart(data);

    // 3. Payment Method Breakdown
    const pmt = document.getElementById('paymentBreakdown');
    if (pmt) {
        const brk = data.paymentBreakdown || {};
        pmt.innerHTML = Object.entries(brk).map(([key, val]) => {
            const icons = { cash: '💵', mpesa: '📱', bank: '🏦' };
            const colors = { cash: 'text-green-500', mpesa: 'text-amber-500', bank: 'text-blue-500' };
            return `
                <div class="flex items-center justify-between p-3 bg-slate-900/40 rounded-xl border border-slate-700/50">
                    <div class="flex items-center gap-3">
                        <span class="text-xl">${icons[key.toLowerCase()] || '💰'}</span>
                        <div>
                            <p class="text-[10px] font-black uppercase text-slate-500">${key}</p>
                            <p class="text-xs font-bold text-slate-300">${val.count} orders</p>
                        </div>
                    </div>
                    <p class="font-black ${colors[key.toLowerCase()] || 'text-white'}">KES ${val.total.toLocaleString()}</p>
                </div>
            `;
        }).join('');
    }

    // 4. Top Products List
    const products = document.getElementById('topProductsList');
    if (products) {
        const list = data.topProducts || [];
        if (list.length === 0) {
            products.innerHTML = `<p class="text-slate-500 text-xs italic p-4 text-center">No product data for this period</p>`;
        } else {
            products.innerHTML = list.map((p, i) => `
                <div class="flex items-center justify-between p-3 bg-slate-900/40 rounded-xl">
                    <div class="flex items-center gap-3">
                        <span class="w-6 h-6 rounded bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-500">${i + 1}</span>
                        <div>
                            <p class="text-xs font-bold text-slate-200">${p.name}</p>
                            <p class="text-[10px] text-slate-500">${p.quantity} units sold</p>
                        </div>
                    </div>
                    <p class="text-xs font-black text-amber-500">KES ${p.revenue.toLocaleString()}</p>
                </div>
            `).join('');
        }
    }

    // 5. Recent Transactions
    const recent = document.getElementById('analytics-recent-sales');
    if (recent) {
        const sales = data.recentSales || [];
        if (sales.length === 0) {
            recent.innerHTML = `<p class="text-slate-500 text-xs italic p-4 text-center">No recent transactions</p>`;
        } else {
            recent.innerHTML = sales.map(s => `
                <div class="flex items-center justify-between p-3 border-b border-slate-700/30 hover:bg-white/5 transition-all">
                    <div class="flex flex-col">
                        <span class="text-[10px] font-black text-amber-500">${(s.transactionId || '').substring(0, 8)}</span>
                        <span class="text-[8px] uppercase text-slate-500">${s.paymentMethod} • ${s.itemCount} items</span>
                    </div>
                    <div class="text-right">
                        <p class="text-xs font-bold">KES ${s.amount.toLocaleString()}</p>
                        <p class="text-[8px] text-slate-600">${new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                </div>
            `).join('');
        }
    }
}

/** Draws custom SVG bars for revenue and profit */
function renderAnalyticsChart(data) {
    const chart = document.getElementById('analyticsChart');
    if (!chart) return;

    const revData = data.chartRevenue || {};
    const profData = data.chartProfit || {};
    const keys = Object.keys(revData);

    if (keys.length === 0) {
        chart.innerHTML = `<div class="w-full text-center text-slate-500 text-xs py-10 italic">No chart data for this period</div>`;
        return;
    }

    const maxVal = Math.max(...Object.values(revData), 100);

    chart.innerHTML = keys.map(key => {
        const rev = revData[key] || 0;
        const prof = profData[key] || 0;
        const revHeight = (rev / maxVal) * 100;
        const profHeight = (prof / maxVal) * 100;

        return `
            <div class="flex-grow flex flex-col items-center group relative h-full justify-end">
                <div class="flex items-end gap-[2px] h-full w-full justify-center">
                    <!-- Revenue Bar -->
                    <div class="w-3 rounded-t-sm bg-amber-500/80 group-hover:bg-amber-500 transition-all shadow-sm" 
                         style="height: ${revHeight}%" title="${key}: KES ${rev.toLocaleString()}"></div>
                    <!-- Profit Bar -->
                    <div class="w-3 rounded-t-sm bg-green-500/80 group-hover:bg-green-500 transition-all shadow-sm" 
                         style="height: ${profHeight}%" title="Profit: KES ${prof.toLocaleString()}"></div>
                </div>
                <span class="text-[8px] text-slate-500 mt-2 font-black uppercase">${key}</span>
            </div>
        `;
    }).join('');
}

function openModal(content) {
    const modalBox = document.getElementById('payment-content');
    if (modalBox) {
        modalBox.innerHTML = content;
        UI.mpesaModal.classList.remove('hidden'); // Show the modal!
    }
}

function closeModal() {
    UI.mpesaModal.classList.add('hidden'); // Close payment modal, not receipt
}

// Custom notification to replace alert() and remove "localhost:3000 says"
function showNotification(message, icon = '📊', title = 'Notification') {
    const modal = document.getElementById('custom-notify-modal');
    document.getElementById('notify-icon').innerText = icon;
    document.getElementById('notify-title').innerText = title;
    document.getElementById('notify-message').innerText = message;
    modal.classList.remove('hidden');
}

function closeNotification() {
    document.getElementById('custom-notify-modal').classList.add('hidden');
}

async function generateSalesReport() {
    // Use cached analytics data or fetch it
    let reportData = state.analytics.data || state.lastAnalytics;
    if (!reportData) {
        try {
            const resp = await fetch(`http://localhost:8080/api/analytics/report?period=daily`);
            if (resp.ok) reportData = await resp.json();
        } catch (e) { console.warn('Could not fetch analytics for report'); }
    }

    if (!reportData) {
        showNotification('No analytics data available.\n\nEnsure Spring Boot is running and make some sales first.', '❌', 'No Data');
        return;
    }

    const totalRevenue = (reportData.revenue || reportData.totalRevenue || 0);
    const totalOrders = reportData.orders || reportData.totalOrders || 0;
    const avgOrder = (reportData.avgOrder || reportData.averageOrder || 0);
    const brk = reportData.paymentBreakdown || { cash: { total: 0 }, mpesa: { total: 0 }, bank: { total: 0 } };
    const sales = reportData.recentSales || [];

    if (sales.length === 0 && totalOrders === 0) {
        showNotification('No transactions recorded yet.\n\nMake some sales first, then generate the report!', '📊', 'Empty Report');
    }

    const txRows = sales.map((s, i) => {
        const items = (s.items || []).map(it => `${it.productName || it.name} x${it.quantity}`).join(', ');
        const time = new Date(s.timestamp).toLocaleTimeString();
        const amt = s.totalAmount || s.amount || 0;
        const method = s.paymentMethod || 'CASH';
        return `
            <tr>
                <td>${i + 1}</td>
                <td style="font-family:monospace;font-size:11px;">${(s.transactionId || '').substring(0, 12)}...</td>
                <td>${time}</td>
                <td>${items || '-'}</td>
                <td style="text-transform:uppercase">${method}</td>
                <td style="font-weight:bold;text-align:right">KES ${amt.toLocaleString()}</td>
            </tr>`;
    }).join('');

    const report = `<html><head><title>Safi POS - Daily Sales Report</title>
    <style>
        body{font-family:'Segoe UI',sans-serif;padding:40px;color:#0f172a;line-height:1.5}
        .header{border-bottom:4px solid #f59e0b;padding-bottom:20px;margin-bottom:30px;display:flex;justify-content:space-between;align-items:center}
        .stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:30px}
        .stat-card{background:#f8fafc;padding:20px;border-radius:16px;border:1px solid #e2e8f0}
        .stat-card h4{margin:0;color:#64748b;text-transform:uppercase;font-size:10px;letter-spacing:.1em}
        .stat-card p{margin:8px 0 0;font-size:24px;font-weight:900;color:#0f172a}
        .breakdown{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin:20px 0}
        .bc{background:#fefce8;padding:16px;border-radius:12px;border:1px solid #fde68a;text-align:center}
        .bc.m{background:#ecfdf5;border-color:#a7f3d0}
        .bc.b{background:#eff6ff;border-color:#bfdbfe}
        .bc h5{margin:0;font-size:10px;text-transform:uppercase;color:#64748b}
        .bc p{margin:6px 0 0;font-size:18px;font-weight:800}
        table{width:100%;border-collapse:collapse;margin-top:20px}
        th{text-align:left;background:#f1f5f9;padding:12px;font-size:11px;color:#475569;text-transform:uppercase}
        td{padding:12px;border-bottom:1px solid #e2e8f0;font-size:12px}
        tr:hover{background:#fefce8}
        .footer{margin-top:40px;font-size:10px;color:#94a3b8;text-align:center;border-top:1px solid #e2e8f0;padding-top:16px}
        @media print{.no-print{display:none}}
    </style></head><body>
    <div class="header">
        <div>
            <h1 style="margin:0;font-size:28px;font-weight:900">DAILY SALES REPORT</h1>
            <p style="margin:5px 0 0;color:#64748b;font-size:13px">SAFI MODERN RETAIL — ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p style="margin:2px 0 0;color:#94a3b8;font-size:11px">Generated: ${new Date().toLocaleString()} | Cashier: ${state.user?.name || 'N/A'}</p>
        </div>
        <button onclick="window.print()" class="no-print" style="padding:10px 24px;background:#f59e0b;color:white;border:none;border-radius:10px;cursor:pointer;font-weight:bold">🖨️ PRINT</button>
    </div>
    <div class="stats">
        <div class="stat-card"><h4>Total Revenue</h4><p>KES ${totalRevenue.toLocaleString()}</p></div>
        <div class="stat-card"><h4>Total Orders</h4><p>${totalOrders}</p></div>
        <div class="stat-card"><h4>Avg Order Value</h4><p>KES ${Number(avgOrder).toLocaleString()}</p></div>
    </div>
    <p style="font-weight:900;font-size:14px;text-transform:uppercase;color:#334155">Payment Method Breakdown</p>
    <div class="breakdown">
        <div class="bc"><h5>💵 Cash</h5><p>KES ${(brk.cash?.total || brk.cash || 0).toLocaleString()}</p></div>
        <div class="bc m"><h5>📱 M-Pesa</h5><p>KES ${(brk.mpesa?.total || brk.mpesa || 0).toLocaleString()}</p></div>
        <div class="bc b"><h5>🏦 Bank</h5><p>KES ${(brk.bank?.total || brk.bank || 0).toLocaleString()}</p></div>
    </div>
    <p style="font-weight:900;font-size:14px;text-transform:uppercase;color:#334155;margin-top:20px">Transaction Log</p>
    <table><thead><tr><th>#</th><th>Txn ID</th><th>Time</th><th>Items</th><th>Method</th><th>Amount</th></tr></thead>
    <tbody>${txRows || '<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:24px">No transactions yet</td></tr>'}</tbody></table>
    <div class="footer">Safi POS · Generated ${new Date().toLocaleString()} · Confidential</div>
    </body></html>`;

    const win = window.open('', '_blank');
    if (win) { win.document.write(report); win.document.close(); }
    else showNotification('Pop-up blocked. Please allow pop-ups to print the report.', '⚠️', 'Pop-up Blocked');
}

function openAddProductModal() {
    const html = `
        <h2 class="text-2xl font-bold mb-6">➕ Add New Product</h2>
        <div class="space-y-4 text-left">
            <div>
                <label class="text-xs text-slate-400 font-bold uppercase mb-1 block">Barcode / Code</label>
                <input id="p-code" type="text" placeholder="e.g. SKU-001" class="w-full bg-slate-800 p-4 rounded-xl border border-slate-700 text-white outline-none focus:border-amber-500">
            </div>
            <div>
                <label class="text-xs text-slate-400 font-bold uppercase mb-1 block">Product Name</label>
                <input id="p-name" type="text" placeholder="e.g. Maize Flour 2kg" class="w-full bg-slate-800 p-4 rounded-xl border border-slate-700 text-white outline-none focus:border-amber-500">
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="text-xs text-slate-400 font-bold uppercase mb-1 block">Price (KES)</label>
                    <input id="p-price" type="number" placeholder="0" class="w-full bg-slate-800 p-4 rounded-xl border border-slate-700 text-white outline-none focus:border-amber-500">
                </div>
                <div>
                    <label class="text-xs text-slate-400 font-bold uppercase mb-1 block">Stock Qty</label>
                    <input id="p-stock" type="number" placeholder="0" class="w-full bg-slate-800 p-4 rounded-xl border border-slate-700 text-white outline-none focus:border-amber-500">
                </div>
            </div>
            <div>
                <label class="text-xs text-slate-400 font-bold uppercase mb-1 block">Category</label>
                <select id="p-category" class="w-full bg-slate-800 p-4 rounded-xl border border-slate-700 text-white outline-none focus:border-amber-500">
                    <option value="Retail">Retail</option>
                    <option value="Bakery">Bakery</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Groceries">Groceries</option>
                    <option value="Beverages">Beverages</option>
                </select>
            </div>
            <button onclick="saveProduct()" class="w-full py-4 gold-gradient rounded-xl font-bold text-lg mt-2">SAVE PRODUCT</button>
            <button onclick="closeEditModal()" class="w-full text-slate-500 text-sm">Cancel</button>
        </div>
    `;
    openEditModal(html);
}

function openEditProductModal(id) {
    const p = state.products.find(x => x.id === id);
    if (!p) return;
    const html = `
        <h2 class="text-2xl font-bold mb-6">✏️ Edit Product</h2>
        <div class="space-y-4 text-left">
            <div>
                <label class="text-xs text-slate-400 font-bold uppercase mb-1 block">Barcode / Code</label>
                <input id="p-code" type="text" value="${p.code}" class="w-full bg-slate-800 p-4 rounded-xl border border-slate-700 text-white outline-none focus:border-amber-500">
            </div>
            <div>
                <label class="text-xs text-slate-400 font-bold uppercase mb-1 block">Product Name</label>
                <input id="p-name" type="text" value="${p.name}" class="w-full bg-slate-800 p-4 rounded-xl border border-slate-700 text-white outline-none focus:border-amber-500">
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="text-xs text-slate-400 font-bold uppercase mb-1 block">Price (KES)</label>
                    <input id="p-price" type="number" value="${p.price}" class="w-full bg-slate-800 p-4 rounded-xl border border-slate-700 text-white outline-none focus:border-amber-500">
                </div>
                <div>
                    <label class="text-xs text-slate-400 font-bold uppercase mb-1 block">Stock Qty</label>
                    <input id="p-stock" type="number" value="${p.stockQuantity || p.stock || 0}" class="w-full bg-slate-800 p-4 rounded-xl border border-slate-700 text-white outline-none focus:border-amber-500">
                </div>
            </div>
            <div>
                <label class="text-xs text-slate-400 font-bold uppercase mb-1 block">Category</label>
                <select id="p-category" class="w-full bg-slate-800 p-4 rounded-xl border border-slate-700 text-white outline-none">
                    <option value="Retail" ${p.category === 'Retail' ? 'selected' : ''}>Retail</option>
                    <option value="Bakery" ${p.category === 'Bakery' ? 'selected' : ''}>Bakery</option>
                    <option value="Electronics" ${p.category === 'Electronics' ? 'selected' : ''}>Electronics</option>
                    <option value="Groceries" ${p.category === 'Groceries' ? 'selected' : ''}>Groceries</option>
                    <option value="Beverages" ${p.category === 'Beverages' ? 'selected' : ''}>Beverages</option>
                </select>
            </div>
            <button onclick="saveProduct(${id})" class="w-full py-4 gold-gradient rounded-xl font-bold text-lg mt-2">UPDATE PRODUCT</button>
            <button onclick="closeEditModal()" class="w-full text-slate-500 text-sm">Cancel</button>
        </div>
    `;
    openEditModal(html);
}

// Edit modal uses a separate modal from the payment modal
function openEditModal(content) {
    const modal = document.getElementById('edit-modal');
    const box = document.getElementById('edit-content');
    if (modal && box) {
        box.innerHTML = content;
        modal.classList.remove('hidden');
    }
}

function closeEditModal() {
    const modal = document.getElementById('edit-modal');
    if (modal) modal.classList.add('hidden');
}

async function saveProduct(id = null) {
    const codeEl = document.getElementById('p-code');
    const nameEl = document.getElementById('p-name');
    const priceEl = document.getElementById('p-price');
    const stockEl = document.getElementById('p-stock');
    const catEl = document.getElementById('p-category');

    if (!codeEl || !nameEl || !priceEl || !stockEl || !catEl) {
        showNotification('Form fields not found. Please reopen the edit window.', '❌', 'Error');
        return;
    }

    const product = {
        code: codeEl.value.trim(),
        name: nameEl.value.trim(),
        price: parseFloat(priceEl.value),
        stockQuantity: parseInt(stockEl.value),
        category: catEl.value
    };

    if (!product.code || !product.name || isNaN(product.price) || isNaN(product.stockQuantity)) {
        showNotification('Please fill in all fields correctly.', '⚠️', 'Validation Error');
        return;
    }

    const url = id ? `http://localhost:8080/api/products/${id}` : 'http://localhost:8080/api/products';
    const method = id ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(product)
        });
        if (response.ok) {
            closeEditModal();
            showNotification(`Product "${product.name}" ${id ? 'updated' : 'added'} successfully!`, '✅', 'Saved');
            await loadInventory();
            await syncProductsFromHub();
        } else {
            const errorText = await response.text();
            showNotification(`Failed to save (Status: ${response.status}): ${errorText}`, '❌', 'Save Error');
        }
    } catch (e) {
        console.error('Network error saving product:', e);
        showNotification('Network Error: Could not connect to Hub on port 8080.', '❌', 'Connection Error');
    }
}

async function loadLogistics() {
    const content = document.getElementById('logistics-content');
    if (!content) return;
    content.innerHTML = '<p class="text-slate-500 text-sm text-center py-8">Loading logistics data...</p>';
    try {
        const response = await fetch('http://localhost:8080/api/products');
        if (response.ok) {
            const products = await response.json();
            const lowStock = products.filter(p => (p.stockQuantity || 0) <= 5);
            content.innerHTML = `
                <div class="grid grid-cols-3 gap-4 mb-6">
                    <div class="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                        <p class="text-slate-400 text-xs font-bold uppercase mb-1">Total Products</p>
                        <p class="text-3xl font-black text-white">${products.length}</p>
                    </div>
                    <div class="bg-red-900/30 p-5 rounded-2xl border border-red-500/30">
                        <p class="text-red-400 text-xs font-bold uppercase mb-1">Low Stock Items</p>
                        <p class="text-3xl font-black text-red-400">${lowStock.length}</p>
                    </div>
                    <div class="bg-green-900/30 p-5 rounded-2xl border border-green-500/30">
                        <p class="text-green-400 text-xs font-bold uppercase mb-1">Well Stocked</p>
                        <p class="text-3xl font-black text-green-400">${products.length - lowStock.length}</p>
                    </div>
                </div>
                <h3 class="font-bold text-sm text-slate-400 uppercase tracking-wider mb-3">Stock Overview</h3>
                <div class="space-y-2">
                    ${products.map(p => {
                const stock = p.stockQuantity || 0;
                const pct = Math.min(100, (stock / 50) * 100);
                const color = stock <= 5 ? 'bg-red-500' : stock <= 15 ? 'bg-amber-500' : 'bg-green-500';
                return `
                        <div class="bg-slate-800 p-4 rounded-xl border border-slate-700">
                            <div class="flex justify-between items-center mb-2">
                                <span class="font-bold text-sm">${p.name}</span>
                                <span class="text-xs font-black ${stock <= 5 ? 'text-red-400 animate-pulse' : 'text-slate-400'}">QTY: ${stock}</span>
                            </div>
                            <div class="w-full bg-slate-700 rounded-full h-2">
                                <div class="${color} h-2 rounded-full transition-all" style="width:${pct}%"></div>
                            </div>
                            ${stock <= 5 ? '<p class="text-[10px] text-red-400 font-bold mt-1">⚠️ RESTOCK NEEDED</p>' : ''}
                        </div>`;
            }).join('')}
                </div>
            `;
        } else {
            content.innerHTML = '<p class="text-slate-500 text-center py-8">Could not load logistics data.</p>';
        }
    } catch (e) {
        content.innerHTML = '<div class="text-center py-12"><p class="text-4xl mb-3">📦</p><p class="text-slate-400 font-bold">Backend not reachable</p><p class="text-slate-500 text-sm mt-2">Ensure Spring Boot is running on port 8080</p></div>';
    }
}

async function loadAdminHub() {
    const content = document.getElementById('admin-content');
    if (!content) return;
    content.innerHTML = '<p class="text-slate-500 text-sm text-center py-8">Loading admin data...</p>';
    try {
        const [usersResp, logsResp] = await Promise.all([
            fetch('http://localhost:8080/api/auth/users'),
            fetch('http://localhost:8080/api/auth/logs/all')
        ]);
        const users = usersResp.ok ? await usersResp.json() : [];
        const logs = logsResp.ok ? await logsResp.json() : [];
        content.innerHTML = `
            <div class="grid grid-cols-2 gap-4 mb-6">
                <div class="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                    <p class="text-slate-400 text-xs font-bold uppercase mb-1">Registered Users</p>
                    <p class="text-3xl font-black text-white">${users.length}</p>
                </div>
                <div class="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                    <p class="text-slate-400 text-xs font-bold uppercase mb-1">Audit Log Entries</p>
                    <p class="text-3xl font-black text-amber-500">${logs.length}</p>
                </div>
            </div>
            <h3 class="font-bold text-sm text-slate-400 uppercase tracking-wider mb-3">Registered Users</h3>
            <div class="space-y-2 mb-6">
                ${users.map(u => {
            const role = u.roles && u.roles[0] ? u.roles[0].name : 'USER';
            return `<div class="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
                        <div><p class="font-bold">${u.fullName || u.username}</p><p class="text-xs text-slate-500">@${u.username}</p></div>
                        <span class="px-3 py-1 rounded-full text-[10px] font-black ${role === 'ADMIN' ? 'bg-red-600' : role === 'MANAGER' ? 'bg-blue-600' : 'bg-slate-700'} text-white">${role}</span>
                    </div>`;
        }).join('')}
            </div>
            <h3 class="font-bold text-sm text-slate-400 uppercase tracking-wider mb-3">Recent Audit Logs</h3>
            <div class="space-y-2">
                ${logs.slice(-20).reverse().map(l => `
                    <div class="bg-slate-800 p-3 rounded-xl border border-slate-700 flex justify-between items-center">
                        <div><span class="text-xs font-black text-amber-500">${l.action}</span> <span class="text-xs text-slate-300">by ${l.username}</span></div>
                        <span class="text-[10px] text-slate-500">${new Date(l.timestamp).toLocaleString()}</span>
                    </div>`).join('')}
            </div>
        `;
    } catch (e) {
        content.innerHTML = '<div class="text-center py-12"><p class="text-4xl mb-3">🔐</p><p class="text-slate-400 font-bold">Admin data unavailable</p></div>';
    }
}

function applyPermissions(role) {
    const permissions = {
        'ADMIN': ['menuInventory', 'menuReports', 'menuLogistics', 'menuAdmin', 'menuBranches', 'menuSupport'],
        'MANAGER': ['menuInventory', 'menuReports', 'menuBranches', 'menuSupport'],
        'LOGISTICS': ['menuLogistics', 'menuBranches', 'menuSupport'],
        'CASHIER': ['menuBranches', 'menuSupport'],
        'SALES': ['menuReports', 'menuBranches', 'menuSupport'],
        'USER': ['menuBranches', 'menuSupport']
    };

    // Hide ALL privileged menus first
    ['menuInventory', 'menuReports', 'menuLogistics', 'menuAdmin', 'menuBranches', 'menuSupport'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    // Show allowed menus for this role
    (permissions[role] || permissions['USER']).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('hidden');
    });

    // Always ensure Branches is visible — every staff member should see company locations
    const branchesBtn = document.getElementById('menuBranches');
    if (branchesBtn) {
        branchesBtn.classList.remove('hidden');
        branchesBtn.onclick = () => switchView('branches');
    }

    // Wire up other dynamic menus
    const logisticsBtn = document.getElementById('menuLogistics');
    if (logisticsBtn) logisticsBtn.onclick = () => switchView('logistics');

    const adminBtn = document.getElementById('menuAdmin');
    if (adminBtn) adminBtn.onclick = () => switchView('admin');
}

// ============================================================
// BRANCHES — Multi-Branch Management
// ============================================================

async function loadBranches() {
    const content = document.getElementById('branches-content');
    if (!content) return;
    content.innerHTML = '<p class="text-center text-slate-500 py-12">Loading branches...</p>';
    try {
        const [branchResp, summaryResp] = await Promise.all([
            fetch('http://localhost:8080/api/branches'),
            fetch('http://localhost:8080/api/branches/summary')
        ]);
        const branches = branchResp.ok ? await branchResp.json() : [];
        const summary = summaryResp.ok ? await summaryResp.json() : {};

        content.innerHTML = `
            <!-- Summary Stats -->
            <div class="grid grid-cols-4 gap-4 mb-7">
                <div class="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                    <p class="text-slate-400 text-xs font-bold uppercase mb-1">Total Branches</p>
                    <p class="text-3xl font-black text-white">${summary.total || branches.length}</p>
                </div>
                <div class="bg-green-900/30 p-5 rounded-2xl border border-green-500/30">
                    <p class="text-green-400 text-xs font-bold uppercase mb-1">Active</p>
                    <p class="text-3xl font-black text-green-400">${summary.active || 0}</p>
                </div>
                <div class="bg-red-900/30 p-5 rounded-2xl border border-red-500/30">
                    <p class="text-red-400 text-xs font-bold uppercase mb-1">Inactive</p>
                    <p class="text-3xl font-black text-red-400">${summary.inactive || 0}</p>
                </div>
                <div class="bg-blue-900/30 p-5 rounded-2xl border border-blue-500/30">
                    <p class="text-blue-400 text-xs font-bold uppercase mb-1">Total Staff</p>
                    <p class="text-3xl font-black text-blue-400">${summary.totalStaff || 0}</p>
                </div>
            </div>

            <!-- Branch Cards -->
            <div class="grid grid-cols-2 gap-4">
                ${branches.length === 0
                ? '<div class="col-span-2 text-center py-12 text-slate-500"><p class="text-4xl mb-3">🏪</p><p class="font-bold">No branches found</p><p class="text-sm mt-1">Add your first branch using the button above</p></div>'
                : branches.map(b => `
                    <div class="bg-slate-800 rounded-2xl border ${b.active ? 'border-slate-700' : 'border-red-900/50 opacity-70'
                    } p-5 flex flex-col gap-3 hover:border-amber-500/40 transition-all">
                        <!-- Branch Header -->
                        <div class="flex justify-between items-start">
                            <div>
                                <div class="flex items-center gap-2 mb-1">
                                    <span class="w-2 h-2 rounded-full ${b.active ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                    }"></span>
                                    <p class="text-[10px] font-black uppercase tracking-wider ${b.active ? 'text-green-500' : 'text-red-400'
                    }">${b.active ? 'ACTIVE' : 'INACTIVE'}</p>
                                </div>
                                <h3 class="font-black text-base text-white">${b.name}</h3>
                                <p class="text-[11px] text-amber-500 font-bold">${b.code || ''}</p>
                            </div>
                            <div class="flex gap-2">
                                <button onclick="openEditBranchModal(${b.id})" 
                                    class="p-2 glass rounded-lg text-slate-400 hover:text-amber-500 text-sm" title="Edit">✏️</button>
                                <button onclick="toggleBranch(${b.id})" 
                                    class="p-2 glass rounded-lg text-slate-400 hover:text-green-400 text-sm" title="Toggle Active">
                                    ${b.active ? '🔴' : '🟢'}
                                </button>
                            </div>
                        </div>

                        <!-- Branch Details -->
                        <div class="space-y-1.5 text-[12px] text-slate-400">
                            <div class="flex items-center gap-2">
                                <span class="text-base">📍</span>
                                <span>${b.location || 'No address set'}, ${b.city || ''}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="text-base">👤</span>
                                <span>${b.managerName || 'No manager assigned'}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="text-base">📞</span>
                                <span>${b.managerPhone || 'No phone'}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="text-base">✉️</span>
                                <span class="text-amber-500/80">${b.email || 'No email'}</span>
                            </div>
                        </div>

                        <!-- Staff Badge -->
                        <div class="flex justify-between items-center pt-2 border-t border-slate-700">
                            <span class="text-[11px] text-slate-500">Staff Count</span>
                            <span class="px-3 py-1 bg-amber-500/10 text-amber-500 rounded-full text-[11px] font-black">${b.staffCount || 0} staff</span>
                        </div>
                    </div>`).join('')
            }
            </div>
        `;
    } catch (e) {
        content.innerHTML = `
            <div class="text-center py-16">
                <p class="text-5xl mb-4">🏪</p>
                <p class="font-bold text-slate-400">Could not load branches</p>
                <p class="text-slate-500 text-sm mt-2">Ensure Spring Boot is running on port 8080</p>
                <button onclick="loadBranches()" class="mt-4 px-6 py-2 glass rounded-xl text-sm font-bold border border-slate-600">Retry</button>
            </div>`;
    }
}

function openAddBranchModal() {
    const html = `
        <h2 class="text-2xl font-bold mb-6">🏪 Add New Branch</h2>
        <div class="space-y-4 text-left">
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="text-xs text-slate-400 font-bold uppercase mb-1 block">Branch Name</label>
                    <input id="br-name" type="text" placeholder="e.g. Westlands Branch" class="w-full bg-slate-700 p-3 rounded-xl border border-slate-600 text-white outline-none focus:border-amber-500">
                </div>
                <div>
                    <label class="text-xs text-slate-400 font-bold uppercase mb-1 block">Branch Code</label>
                    <input id="br-code" type="text" placeholder="e.g. WL-001" class="w-full bg-slate-700 p-3 rounded-xl border border-slate-600 text-white outline-none focus:border-amber-500">
                </div>
            </div>
            <div>
                <label class="text-xs text-slate-400 font-bold uppercase mb-1 block">Location / Address</label>
                <input id="br-location" type="text" placeholder="Building, Street" class="w-full bg-slate-700 p-3 rounded-xl border border-slate-600 text-white outline-none focus:border-amber-500">
            </div>
            <div>
                <label class="text-xs text-slate-400 font-bold uppercase mb-1 block">City</label>
                <input id="br-city" type="text" placeholder="Nairobi" class="w-full bg-slate-700 p-3 rounded-xl border border-slate-600 text-white outline-none focus:border-amber-500">
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="text-xs text-slate-400 font-bold uppercase mb-1 block">Manager Name</label>
                    <input id="br-manager" type="text" placeholder="Full Name" class="w-full bg-slate-700 p-3 rounded-xl border border-slate-600 text-white outline-none focus:border-amber-500">
                </div>
                <div>
                    <label class="text-xs text-slate-400 font-bold uppercase mb-1 block">Manager Phone</label>
                    <input id="br-phone" type="tel" placeholder="07XXXXXXXX" class="w-full bg-slate-700 p-3 rounded-xl border border-slate-600 text-white outline-none focus:border-amber-500">
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="text-xs text-slate-400 font-bold uppercase mb-1 block">Email</label>
                    <input id="br-email" type="email" placeholder="branch@company.co.ke" class="w-full bg-slate-700 p-3 rounded-xl border border-slate-600 text-white outline-none focus:border-amber-500">
                </div>
                <div>
                    <label class="text-xs text-slate-400 font-bold uppercase mb-1 block">Staff Count</label>
                    <input id="br-staff" type="number" placeholder="0" class="w-full bg-slate-700 p-3 rounded-xl border border-slate-600 text-white outline-none focus:border-amber-500">
                </div>
            </div>
            <button onclick="saveBranch()" class="w-full py-4 gold-gradient rounded-xl font-bold text-lg mt-2">ADD BRANCH</button>
            <button onclick="closeEditModal()" class="w-full text-slate-500 text-sm">Cancel</button>
        </div>`;
    openEditModal(html);
}

function openEditBranchModal(id) {
    fetch(`http://localhost:8080/api/branches/${id}`)
        .then(r => r.json())
        .then(b => {
            const html = `
                <h2 class="text-2xl font-bold mb-6">✏️ Edit Branch</h2>
                <input type="hidden" id="br-edit-id" value="${b.id}">
                <div class="space-y-4 text-left">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="text-xs text-slate-400 font-bold uppercase mb-1 block">Branch Name</label>
                            <input id="br-name" type="text" value="${b.name || ''}" class="w-full bg-slate-700 p-3 rounded-xl border border-slate-600 text-white outline-none focus:border-amber-500">
                        </div>
                        <div>
                            <label class="text-xs text-slate-400 font-bold uppercase mb-1 block">Branch Code</label>
                            <input id="br-code" type="text" value="${b.code || ''}" class="w-full bg-slate-700 p-3 rounded-xl border border-slate-600 text-white outline-none focus:border-amber-500">
                        </div>
                    </div>
                    <div><label class="text-xs text-slate-400 font-bold uppercase mb-1 block">Location</label>
                        <input id="br-location" type="text" value="${b.location || ''}" class="w-full bg-slate-700 p-3 rounded-xl border border-slate-600 text-white outline-none focus:border-amber-500"></div>
                    <div><label class="text-xs text-slate-400 font-bold uppercase mb-1 block">City</label>
                        <input id="br-city" type="text" value="${b.city || ''}" class="w-full bg-slate-700 p-3 rounded-xl border border-slate-600 text-white outline-none focus:border-amber-500"></div>
                    <div class="grid grid-cols-2 gap-4">
                        <div><label class="text-xs text-slate-400 font-bold uppercase mb-1 block">Manager</label>
                            <input id="br-manager" type="text" value="${b.managerName || ''}" class="w-full bg-slate-700 p-3 rounded-xl border border-slate-600 text-white outline-none focus:border-amber-500"></div>
                        <div><label class="text-xs text-slate-400 font-bold uppercase mb-1 block">Phone</label>
                            <input id="br-phone" type="tel" value="${b.managerPhone || ''}" class="w-full bg-slate-700 p-3 rounded-xl border border-slate-600 text-white outline-none focus:border-amber-500"></div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div><label class="text-xs text-slate-400 font-bold uppercase mb-1 block">Email</label>
                            <input id="br-email" type="email" value="${b.email || ''}" class="w-full bg-slate-700 p-3 rounded-xl border border-slate-600 text-white outline-none focus:border-amber-500"></div>
                        <div><label class="text-xs text-slate-400 font-bold uppercase mb-1 block">Staff Count</label>
                            <input id="br-staff" type="number" value="${b.staffCount || 0}" class="w-full bg-slate-700 p-3 rounded-xl border border-slate-600 text-white outline-none focus:border-amber-500"></div>
                    </div>
                    <button onclick="saveBranch(${b.id})" class="w-full py-4 gold-gradient rounded-xl font-bold text-lg mt-2">UPDATE BRANCH</button>
                    <button onclick="closeEditModal()" class="w-full text-slate-500 text-sm">Cancel</button>
                </div>`;
            openEditModal(html);
        })
        .catch(() => showNotification('Could not load branch details', '❌', 'Error'));
}

async function saveBranch(id = null) {
    const branch = {
        name: (document.getElementById('br-name')?.value || '').trim(),
        code: (document.getElementById('br-code')?.value || '').trim(),
        location: (document.getElementById('br-location')?.value || '').trim(),
        city: (document.getElementById('br-city')?.value || '').trim(),
        managerName: (document.getElementById('br-manager')?.value || '').trim(),
        managerPhone: (document.getElementById('br-phone')?.value || '').trim(),
        email: (document.getElementById('br-email')?.value || '').trim(),
        staffCount: parseInt(document.getElementById('br-staff')?.value) || 0,
        active: true
    };

    if (!branch.name) return showNotification('Branch name is required', '⚠️', 'Validation');

    const url = id ? `http://localhost:8080/api/branches/${id}` : 'http://localhost:8080/api/branches';
    const method = id ? 'PUT' : 'POST';
    try {
        const resp = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(branch) });
        if (resp.ok) {
            closeEditModal();
            showNotification(`Branch "${branch.name}" ${id ? 'updated' : 'added'} successfully!`, '✅', 'Saved');
            loadBranches();
        } else {
            showNotification('Failed to save branch. Check the backend.', '❌', 'Error');
        }
    } catch (e) {
        showNotification('Cannot connect to Spring Boot on port 8080', '❌', 'Connection Error');
    }
}

async function toggleBranch(id) {
    try {
        const resp = await fetch(`http://localhost:8080/api/branches/${id}/toggle`, { method: 'PATCH' });
        if (resp.ok) { loadBranches(); }
        else showNotification('Could not toggle branch status', '❌', 'Error');
    } catch (e) {
        showNotification('Backend not reachable', '❌', 'Error');
    }
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
    if (!product) return;

    const stock = product.stockQuantity || product.stock || 0;
    const existing = state.cart.find(i => i.id === pid);
    const currentQtyInCart = existing ? existing.quantity : 0;

    // Stock check
    if (currentQtyInCart >= stock) {
        showNotification(
            `Only ${stock} unit(s) of "${product.name}" available in stock.\n\nYou cannot add more than the available quantity.`,
            '⚠️',
            'Stock Limit Reached'
        );
        return;
    }

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
    if (state.cart.length === 0) return showNotification('Please add items to cart first', '🛒', 'Cart Empty');

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
                <!-- Default: STK mode -->
                <p class="text-xs text-slate-400 text-left mb-1 font-bold uppercase tracking-wider">Customer Phone Number</p>
                <input id="pay-phone" type="tel" placeholder="e.g. 0712 345 678"
                    class="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl py-4 px-6 mb-1 text-center text-xl font-bold tracking-widest outline-none focus:border-green-500"
                    oninput="previewPhone(this.value)">
                <p id="phone-preview" class="text-[11px] text-green-400 text-center mb-4 h-4"></p>
                <button onclick="triggerMpesaStk()" class="w-full py-5 gold-gradient rounded-2xl font-black text-lg">📲 SEND STK PROMPT</button>
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
            <p class="text-xs text-slate-400 text-left mb-1 font-bold uppercase tracking-wider">Customer Phone Number</p>
            <input id="pay-phone" type="tel" placeholder="e.g. 0712 345 678"
                class="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl py-4 px-6 mb-1 text-center text-xl font-bold tracking-widest outline-none focus:border-green-500"
                oninput="previewPhone(this.value)">
            <p id="phone-preview" class="text-[11px] text-green-400 text-center mb-4 h-4"></p>
            <button onclick="triggerMpesaStk()" class="w-full py-5 gold-gradient rounded-2xl font-black text-lg">📲 SEND STK PROMPT</button>
        `;
    } else if (mode === 'C2B') {
        container.innerHTML = `
            <div class="bg-slate-900/50 p-6 rounded-3xl border border-slate-700 mb-6 text-left">
                <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Instructions</p>
                <p class="text-sm text-slate-300 leading-relaxed">1. Go to M-Pesa Menu<br>2. Lipa na M-Pesa<br>3. Enter <strong>Paybill: 600991</strong><br>4. Enter Amount &amp; PIN</p>
            </div>
            <button onclick="triggerPayment('M-PESA C2B')" class="w-full py-5 glass border-blue-500/50 rounded-2xl font-black text-lg text-blue-400">FINALIZE AFTER PAYMENT</button>
        `;
    } else if (mode === 'SEND') {
        container.innerHTML = `
            <p class="text-xs text-slate-400 text-left mb-1 font-bold uppercase tracking-wider">Recipient Number</p>
            <input id="pay-phone" type="tel" placeholder="e.g. 0712 345 678"
                class="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl py-4 px-6 mb-1 text-center text-xl font-bold tracking-widest outline-none focus:border-amber-500"
                oninput="previewPhone(this.value)">
            <p id="phone-preview" class="text-[11px] text-green-400 text-center mb-4 h-4"></p>
            <button onclick="triggerPayment('M-PESA SEND')" class="w-full py-5 glass border-amber-500/50 rounded-2xl font-black text-lg text-amber-500">SEND MONEY TO PHONE</button>
        `;
    }
}

/**
 * Normalize any Kenyan phone format to 254XXXXXXXXX (12 digits)
 * Accepts: 07XXXXXXXX, 7XXXXXXXX, +2547XXXXXXXX, 2547XXXXXXXX
 */
function normalizeSafaricomPhone(raw) {
    let phone = raw.replace(/\s+/g, '').replace(/-/g, '');
    if (phone.startsWith('+254')) phone = phone.slice(1);       // +254 → 254
    if (phone.startsWith('0')) phone = '254' + phone.slice(1); // 07.. → 2547..
    if (phone.startsWith('7') || phone.startsWith('1')) phone = '254' + phone; // 7..  → 2547..
    return phone;
}

/** Live preview under the phone input */
function previewPhone(value) {
    const preview = document.getElementById('phone-preview');
    if (!preview) return;
    if (!value.trim()) { preview.textContent = ''; return; }
    const normalized = normalizeSafaricomPhone(value);
    const valid = /^2547\d{8}$|^2541\d{8}$/.test(normalized);
    preview.textContent = valid ? `✓ Will send to: ${normalized}` : '⚠ Invalid number — use 07XX or 2547XX format';
    preview.className = `text-[11px] text-center mb-4 h-4 ${valid ? 'text-green-400' : 'text-red-400'}`;
}

/**
 * STK Push — calls Spring Boot directly (port 8080) then polls for result.
 * The Tauri /api/checkout DOES NOT trigger M-Pesa; Spring Boot does.
 */
async function triggerMpesaStk() {
    if (state.cart.length === 0) return showNotification('Please add items to cart first', '🛒', 'Cart Empty');

    const phoneEl = document.getElementById('pay-phone');
    const rawPhone = phoneEl ? phoneEl.value.trim() : '';

    if (!rawPhone) {
        return showNotification('Please enter the customer\'s M-Pesa phone number.', '📱', 'Phone Required');
    }

    const phone = normalizeSafaricomPhone(rawPhone);
    if (!/^254[71]\d{8}$/.test(phone)) {
        return showNotification(
            `Invalid phone number: "${rawPhone}"\n\nUse format: 07XXXXXXXX or 2547XXXXXXXX`,
            '❌', 'Invalid Phone'
        );
    }

    const total = state.cart.reduce((s, i) => s + (i.price * i.quantity), 0);

    // Show waiting UI
    const modalBox = document.getElementById('payment-content');
    if (modalBox) {
        modalBox.innerHTML = `
            <div class="text-center py-4">
                <div class="w-20 h-20 bg-green-600 rounded-3xl mx-auto mb-6 flex items-center justify-center text-white text-4xl animate-pulse">📲</div>
                <h3 class="text-2xl font-black text-white mb-2">STK Prompt Sent!</h3>
                <p class="text-slate-400 text-sm mb-2">Prompt sent to <strong class="text-green-400">${phone}</strong></p>
                <p class="text-slate-500 text-xs mb-6">Ask customer to check their phone and enter M-Pesa PIN</p>
                <div class="flex items-center justify-center gap-2 mb-6">
                    <span class="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style="animation-delay:0ms"></span>
                    <span class="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style="animation-delay:150ms"></span>
                    <span class="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style="animation-delay:300ms"></span>
                </div>
                <p class="text-[11px] text-slate-600">Waiting for payment confirmation... (90s timeout)</p>
                <button onclick="closeModal()" class="mt-6 text-slate-500 text-xs hover:text-red-400">Cancel</button>
            </div>
        `;
    }

    try {
        // Call Spring Boot M-Pesa checkout directly — Tauri does not handle STK
        const response = await fetch('http://localhost:8080/api/mpesa/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customerPhone: phone,
                items: state.cart.map(i => ({ productId: i.id, quantity: i.quantity, unitPrice: i.price }))
            })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(err.error || `Server error ${response.status}`);
        }

        const result = await response.json();
        const checkoutRequestId = result.checkoutRequestId;

        // Poll for confirmation (every 4s, up to 90s)
        let attempts = 0;
        const maxAttempts = 22;
        const poll = setInterval(async () => {
            attempts++;
            try {
                const statusResp = await fetch(`http://localhost:8080/api/mpesa/transaction/${checkoutRequestId}`);
                if (statusResp.ok) {
                    const tx = await statusResp.json();
                    if (tx.status === 'SUCCESS') {
                        clearInterval(poll);
                        // Record locally in Tauri for analytics
                        await fetch('/api/checkout', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                items: state.cart.map(i => ({ product_id: i.id, quantity: i.quantity })),
                                payment_method: 'M-PESA STK',
                                customer_phone: phone,
                                cashier_name: state.user ? state.user.name : 'Cashier'
                            })
                        }).catch(() => { });

                        closeModal();
                        showNotification(
                            `M-Pesa Payment Confirmed! ✓\n\nReceipt: ${tx.mpesaReceiptNumber || 'N/A'}\nAmount: KES ${total.toLocaleString()}\nPhone: ${phone}`,
                            '✅', 'Payment Successful'
                        );
                        state.cart = [];
                        renderCart();
                        setTimeout(() => loadAnalytics(), 500);
                        await syncProductsFromHub();

                    } else if (tx.status === 'FAILED' || tx.status === 'CANCELLED') {
                        clearInterval(poll);
                        closeModal();
                        showNotification(
                            `M-Pesa payment was ${tx.status.toLowerCase()}.\n\n${tx.resultDescription || 'Customer may have cancelled or entered wrong PIN.'}`,
                            '❌', 'Payment Failed'
                        );
                    }
                }
            } catch (e) { /* ignore poll errors */ }

            if (attempts >= maxAttempts) {
                clearInterval(poll);
                closeModal();
                showNotification(
                    'STK prompt timed out.\n\nThe customer did not respond within 90 seconds. Please try again.',
                    '⏱️', 'Payment Timeout'
                );
            }
        }, 4000);

    } catch (e) {
        closeModal();
        showNotification(
            `STK Push Failed: ${e.message}\n\nCheck that:\n• Spring Boot is running on port 8080\n• M-Pesa credentials are set in application.properties\n• ngrok is running and callback URL is set`,
            '❌', 'M-Pesa Error'
        );
    }
}

async function triggerPayment(method) {
    if (state.cart.length === 0) return showNotification('Please add items to cart first', '🛒', 'Cart Empty');

    const phoneEl = document.getElementById('pay-phone');
    const total = state.cart.reduce((s, i) => s + (i.price * i.quantity), 0);

    // ── 1. Save to Spring Boot (primary — analytics source) ──────────────────
    const springPayload = {
        items: state.cart.map(i => ({ product: { id: i.id }, quantity: i.quantity })),
        paymentMethod: method,
        customerPhone: phoneEl ? phoneEl.value.trim() : null,
        cashierName: state.user ? state.user.name : 'Cashier',
        status: 'SUCCESS'
    };

    let springOk = false;
    try {
        const springResp = await fetch('http://localhost:8080/api/sales/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(springPayload)
        });
        if (springResp.ok) {
            springOk = true;
            console.log('Sale saved to Spring Boot hub ✓');
        } else {
            const err = await springResp.text();
            console.warn('Spring Boot sale failed:', err);
        }
    } catch (e) {
        console.warn('Spring Boot not reachable, using local only:', e.message);
    }

    // ── 2. Save to Tauri local store (fallback analytics + receipt) ──────────
    const tauriPayload = {
        items: state.cart.map(i => ({ product_id: i.id, quantity: i.quantity })),
        payment_method: method,
        customer_phone: phoneEl ? phoneEl.value.trim() : null,
        cashier_name: state.user ? state.user.name : 'Cashier'
    };

    try {
        const tauriResp = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tauriPayload)
        });

        if (!tauriResp.ok && !springOk) throw new Error('Payment failed at terminal and hub');

        const result = tauriResp.ok ? await tauriResp.json() : {};

        const paymentName = method === 'CASH' ? '💵 Cash' : method.includes('MPESA') || method.includes('PESA') ? '📱 M-Pesa' : `🏦 ${method}`;
        showNotification(
            `Payment successful!\n\n${paymentName}\nAmount: KES ${total.toLocaleString()}\n\nAnalytics updated.`,
            '✅', 'Payment Complete'
        );

        if (result.qr_code) showReceipt(result.qr_code);
        state.cart = [];
        renderCart();
        closeModal();

        await syncProductsFromHub();
        setTimeout(() => loadAnalytics(), 500);

    } catch (e) {
        showNotification('Transaction Failed: ' + e.message, '❌', 'Payment Error');
    }
}

function processCash() {
    if (state.cart.length === 0) return showNotification('Please add items to cart first', '🛒', 'Cart Empty');

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

// Custom notification to replace alert() and remove "localhost:3000 says"
function showNotification(message, icon = '📊', title = 'Notification') {
    const modal = document.getElementById('custom-notify-modal');
    if (!modal) {
        console.error('Notification modal not found');
        return;
    }
    document.getElementById('notify-icon').innerText = icon;
    document.getElementById('notify-title').innerText = title;
    document.getElementById('notify-message').innerText = message;
    modal.classList.remove('hidden');
}

function closeNotification() {
    const modal = document.getElementById('custom-notify-modal');
    if (modal) modal.classList.add('hidden');
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
        showNotification('No analytics data available.\n\nPlease ensure the backend is running and try again after making some sales.', '❌', 'No Data');
        return;
    }

    const totalRevenue = (reportData.totalRevenue || 0).toLocaleString();
    const totalOrders = reportData.totalOrders || 0;
    const avgOrder = (reportData.averageOrder || 0).toFixed(2);
    const breakdown = reportData.paymentBreakdown || { cash: 0, mpesa: 0, bank: 0 };
    const sales = reportData.recentSales || [];

    // Notify user if no transactions
    if (sales.length === 0 && totalOrders === 0) {
        showNotification('No transactions recorded today.\n\nThe daily report will show zero sales. Make some transactions first!', '📊', 'Empty Report');
    }

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
            ` : `
            <div style="background:#fef3c7; border:2px dashed #fbbf24; border-radius:16px; padding:40px; text-align:center; margin:20px 0;">
                <p style="font-size:48px; margin:0;">📊</p>
                <p style="font-size:16px; font-weight:800; color:#92400e; margin:10px 0 0 0;">No transactions recorded today</p>
                <p style="color:#78350f; margin:8px 0 0 0; font-size:13px;">Start making sales to see transaction details here!</p>
            </div>
            `}
            
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
