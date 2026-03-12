
// ============================================================
// EXPENSES — Business Cost Tracking (like Square / Lightspeed)
// ============================================================

const EXPENSE_ICONS = { STOCK:'inventory_2', RENT:'home_work', UTILITIES:'bolt', SALARIES:'badge', MARKETING:'campaign', TRANSPORT:'local_shipping', OTHER:'receipt' };
const EXPENSE_COLORS = { STOCK:'text-blue-400', RENT:'text-purple-400', UTILITIES:'text-yellow-400', SALARIES:'text-green-400', MARKETING:'text-pink-400', TRANSPORT:'text-orange-400', OTHER:'text-slate-400' };

async function loadExpenses() {
    const content = document.getElementById('expenses-content');
    const statsEl = document.getElementById('expense-stats');
    if (!content) return;
    content.innerHTML = '<p class="text-center text-slate-500 py-8">Loading...</p>';
    const cat = document.getElementById('expense-cat-filter')?.value || '';
    try {
        const [expResp, sumResp] = await Promise.all([
            fetch(`http://localhost:8080/api/expenses${cat ? '?category=' + cat : ''}`),
            fetch('http://localhost:8080/api/expenses/summary')
        ]);
        const expenses = expResp.ok ? await expResp.json() : [];
        const sum = sumResp.ok ? await sumResp.json() : {};
        if (statsEl) {
            statsEl.innerHTML = `
                <div class="bg-slate-800 p-4 rounded-2xl border border-slate-700 text-center">
                    <p class="text-xs text-slate-400 uppercase font-bold mb-1">Today</p>
                    <p class="text-2xl font-black text-white">KES ${(sum.todayTotal ?? 0).toLocaleString()}</p>
                </div>
                <div class="bg-amber-900/20 p-4 rounded-2xl border border-amber-500/20 text-center">
                    <p class="text-xs text-amber-400 uppercase font-bold mb-1">This Week</p>
                    <p class="text-2xl font-black text-amber-400">KES ${(sum.weekTotal ?? 0).toLocaleString()}</p>
                </div>
                <div class="bg-blue-900/20 p-4 rounded-2xl border border-blue-500/20 text-center">
                    <p class="text-xs text-blue-400 uppercase font-bold mb-1">This Month</p>
                    <p class="text-2xl font-black text-blue-400">KES ${(sum.monthTotal ?? 0).toLocaleString()}</p>
                </div>
                <div class="bg-red-900/20 p-4 rounded-2xl border border-red-500/20 text-center">
                    <p class="text-xs text-red-400 uppercase font-bold mb-1">All Time</p>
                    <p class="text-2xl font-black text-red-400">KES ${(sum.allTimeTotal ?? 0).toLocaleString()}</p>
                </div>`;
        }
        if (expenses.length === 0) {
            content.innerHTML = `<div class="text-center py-16"><p class="text-5xl mb-3">💸</p><p class="font-black text-lg text-slate-300">No expenses recorded yet</p></div>`;
            return;
        }
        content.innerHTML = `<table class="w-full text-sm">
            <thead><tr class="text-xs font-black uppercase text-slate-500 border-b border-slate-700">
                <th class="text-left py-2 pl-2">Date</th><th class="text-left py-2">Category</th>
                <th class="text-left py-2">Description</th><th class="text-left py-2">Paid To</th>
                <th class="text-right py-2">Amount</th><th class="text-right py-2 pr-2">Actions</th>
            </tr></thead>
            <tbody>${expenses.map(e => `
                <tr class="border-b border-slate-800 hover:bg-white/5 transition">
                    <td class="py-3 pl-2 text-slate-400 text-xs">${e.date ? new Date(e.date).toLocaleDateString() : ''}</td>
                    <td class="py-3"><span class="flex items-center gap-1 ${EXPENSE_COLORS[e.category] || 'text-slate-400'}">
                        <span class="material-icons text-sm">${EXPENSE_ICONS[e.category] || 'receipt'}</span>${e.category}</span></td>
                    <td class="py-3 font-bold text-white">${e.description}</td>
                    <td class="py-3 text-slate-400">${e.paidTo || '—'}</td>
                    <td class="py-3 text-right font-black text-red-400">KES ${(e.amount || 0).toLocaleString()}</td>
                    <td class="py-3 pr-2 text-right">
                        <button onclick="openEditExpenseModal(${e.id})" class="text-amber-400 hover:text-amber-300 mr-2 text-xs font-bold">✏️</button>
                        <button onclick="deleteExpense(${e.id})" class="text-red-400 hover:text-red-300 text-xs font-bold">🗑️</button>
                    </td>
                </tr>`).join('')}</tbody></table>`;
    } catch (e) {
        content.innerHTML = `<div class="text-center py-12"><p class="text-5xl mb-3">🔌</p><p class="font-black text-slate-300">Backend Not Reachable</p><button onclick="loadExpenses()" class="mt-4 px-6 py-2 gold-gradient rounded-xl text-sm font-black text-slate-900">🔄 Retry</button></div>`;
    }
}

function expenseFormHTML(e = {}) {
    const v = (k, d = '') => e[k] != null ? String(e[k]).replace(/"/g, '&quot;') : d;
    return `<div class="text-left">
        <h2 class="text-2xl font-black mb-4">${e.id ? '✏️ Edit Expense' : '💸 Log Expense'}</h2>
        ${e.id ? `<input type="hidden" id="exp-id" value="${e.id}">` : ''}
        <div class="space-y-3">
            <div><label class="text-xs text-amber-400 font-black uppercase mb-1 block">Amount (KES) *</label>
                <input id="exp-amount" type="number" value="${v('amount')}" placeholder="0.00" class="w-full bg-slate-700 p-3 rounded-xl border border-slate-600 text-white outline-none focus:border-amber-500"></div>
            <div><label class="text-xs text-slate-400 font-black uppercase mb-1 block">Category</label>
                <select id="exp-category" class="w-full bg-slate-700 p-3 rounded-xl border border-slate-600 text-white outline-none focus:border-amber-500">
                    ${['STOCK','RENT','UTILITIES','SALARIES','MARKETING','TRANSPORT','OTHER'].map(c => `<option ${c===v('category','OTHER')?'selected':''}>${c}</option>`).join('')}
                </select></div>
            <div><label class="text-xs text-slate-400 font-black uppercase mb-1 block">Description *</label>
                <input id="exp-desc" type="text" value="${v('description')}" placeholder="What was this for?" class="w-full bg-slate-700 p-3 rounded-xl border border-slate-600 text-white outline-none focus:border-amber-500"></div>
            <div><label class="text-xs text-slate-400 font-black uppercase mb-1 block">Paid To</label>
                <input id="exp-paidto" type="text" value="${v('paidTo')}" placeholder="Vendor / payee name" class="w-full bg-slate-700 p-3 rounded-xl border border-slate-600 text-white outline-none focus:border-amber-500"></div>
            <div><label class="text-xs text-slate-400 font-black uppercase mb-1 block">Reference No.</label>
                <input id="exp-ref" type="text" value="${v('reference')}" placeholder="Receipt or invoice number" class="w-full bg-slate-700 p-3 rounded-xl border border-slate-600 text-white outline-none focus:border-amber-500"></div>
            <div class="flex gap-3 pt-2">
                <button onclick="saveExpense(${e.id || 'null'})" class="flex-grow py-4 gold-gradient rounded-xl font-black text-slate-900">${e.id ? '💾 UPDATE' : '➕ LOG EXPENSE'}</button>
                <button onclick="closeEditModal()" class="px-6 glass rounded-xl font-bold border border-slate-600 text-slate-300">Cancel</button>
            </div>
        </div></div>`;
}

function openAddExpenseModal() { openEditModal(expenseFormHTML()); setTimeout(() => document.getElementById('exp-amount')?.focus(), 100); }

function openEditExpenseModal(id) {
    openEditModal('<div class="text-center py-10"><div class="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div></div>');
    fetch(`http://localhost:8080/api/expenses/${id}`)
        .then(r => r.json()).then(e => { document.getElementById('edit-content').innerHTML = expenseFormHTML(e); })
        .catch(() => showNotification('Could not load expense', '❌', 'Error'));
}

async function saveExpense(id = null) {
    const amount = parseFloat(document.getElementById('exp-amount')?.value);
    if (!amount || amount <= 0) return showNotification('Please enter a valid amount', '⚠️', 'Validation');
    const desc = document.getElementById('exp-desc')?.value?.trim();
    if (!desc) return showNotification('Description is required', '⚠️', 'Validation');
    const body = {
        amount, description: desc,
        category: document.getElementById('exp-category')?.value || 'OTHER',
        paidTo: document.getElementById('exp-paidto')?.value?.trim() || null,
        reference: document.getElementById('exp-ref')?.value?.trim() || null,
        recordedBy: state.user?.name || null
    };
    const url = id && id !== 'null' ? `http://localhost:8080/api/expenses/${id}` : 'http://localhost:8080/api/expenses';
    const method = id && id !== 'null' ? 'PUT' : 'POST';
    try {
        const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (r.ok) { closeEditModal(); showNotification('Expense logged!', '✅', 'Saved'); loadExpenses(); }
        else showNotification('Save failed', '❌', 'Error');
    } catch (e) { showNotification('Backend not reachable', '❌', 'Error'); }
}

async function deleteExpense(id) {
    if (!confirm('Delete this expense record?')) return;
    try {
        const r = await fetch(`http://localhost:8080/api/expenses/${id}`, { method: 'DELETE' });
        if (r.ok) { showNotification('Expense deleted', '🗑️', 'Deleted'); loadExpenses(); }
    } catch (e) { showNotification('Backend not reachable', '❌', 'Error'); }
}

// ============================================================
// SUPPLIERS — Vendor & Purchase Order Management
// ============================================================

let allSuppliers = [];

async function loadSuppliers() {
    const grid = document.getElementById('suppliers-content');
    const statsEl = document.getElementById('supplier-stats');
    if (!grid) return;
    grid.innerHTML = '<p class="col-span-2 text-center text-slate-500 py-8">Loading...</p>';
    try {
        const [supResp, sumResp] = await Promise.all([
            fetch('http://localhost:8080/api/suppliers'),
            fetch('http://localhost:8080/api/suppliers/summary')
        ]);
        allSuppliers = supResp.ok ? await supResp.json() : [];
        const sum = sumResp.ok ? await sumResp.json() : {};
        if (statsEl) {
            statsEl.innerHTML = `
                <div class="bg-slate-800 p-4 rounded-2xl border border-slate-700 text-center"><p class="text-xs text-slate-400 uppercase font-bold mb-1">Total Suppliers</p><p class="text-2xl font-black text-white">${sum.total ?? 0}</p></div>
                <div class="bg-green-900/20 p-4 rounded-2xl border border-green-500/20 text-center"><p class="text-xs text-green-400 uppercase font-bold mb-1">Active</p><p class="text-2xl font-black text-green-400">${sum.active ?? 0}</p></div>
                <div class="bg-amber-900/20 p-4 rounded-2xl border border-amber-500/20 text-center"><p class="text-xs text-amber-400 uppercase font-bold mb-1">Total Orders</p><p class="text-2xl font-black text-amber-400">${sum.totalOrders ?? 0}</p></div>
                <div class="bg-blue-900/20 p-4 rounded-2xl border border-blue-500/20 text-center"><p class="text-xs text-blue-400 uppercase font-bold mb-1">Total Spend</p><p class="text-2xl font-black text-blue-400">KES ${(sum.totalSpend ?? 0).toLocaleString()}</p></div>`;
        }
        renderSupplierCards(allSuppliers);
    } catch (e) {
        grid.innerHTML = `<div class="col-span-2 text-center py-12"><p class="text-5xl mb-3">🔌</p><p class="font-black text-slate-300">Backend Not Reachable</p><button onclick="loadSuppliers()" class="mt-4 px-6 py-2 gold-gradient rounded-xl text-sm font-black text-slate-900">🔄 Retry</button></div>`;
    }
}

function renderSupplierCards(suppliers) {
    const grid = document.getElementById('suppliers-content');
    if (!grid) return;
    if (suppliers.length === 0) { grid.innerHTML = `<div class="col-span-2 text-center py-16"><p class="text-5xl mb-3">🚚</p><p class="font-black text-lg text-slate-300">No Suppliers Yet</p></div>`; return; }
    grid.innerHTML = suppliers.map(s => `
        <div class="bg-slate-800/80 rounded-2xl border ${s.active ? 'border-slate-700 hover:border-amber-500/40' : 'border-slate-700/40 opacity-60'} p-5 flex flex-col gap-3 transition-all">
            <div class="flex justify-between items-start">
                <div>
                    <div class="flex items-center gap-2 mb-1">
                        <span class="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400"><span class="material-icons text-base">local_shipping</span></span>
                        <h3 class="font-black text-white">${s.name}</h3>
                    </div>
                    <p class="text-xs text-slate-400">${s.contactPerson || ''} ${s.phone ? '· ' + s.phone : ''}</p>
                    ${s.email ? `<p class="text-xs text-slate-500">${s.email}</p>` : ''}
                </div>
                <div class="flex flex-col gap-1.5">
                    <button onclick="openEditSupplierModal(${s.id})" class="px-3 py-1.5 bg-amber-500/10 text-amber-400 rounded-lg text-xs font-black border border-amber-500/20">✏️ Edit</button>
                    <button onclick="openOrderModal(${s.id}, '${s.name.replace(/'/g,"\\'")}') " class="px-3 py-1.5 bg-green-500/10 text-green-400 rounded-lg text-xs font-black border border-green-500/20">📦 Order</button>
                    <button onclick="toggleSupplier(${s.id})" class="px-3 py-1.5 bg-slate-700 text-slate-400 rounded-lg text-xs font-black border border-slate-600">${s.active ? '⏸ Deactivate' : '▶️ Activate'}</button>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700/60 text-center">
                <div><p class="text-[10px] text-slate-500 uppercase font-bold">Orders</p><p class="font-black text-white">${s.totalOrders ?? 0}</p></div>
                <div><p class="text-[10px] text-blue-400 uppercase font-bold">Total Spend</p><p class="font-black text-blue-400 text-xs">KES ${(s.totalOrderValue ?? 0).toLocaleString()}</p></div>
            </div>
        </div>`).join('');
}

function searchSuppliers(q) {
    if (!q) return renderSupplierCards(allSuppliers);
    const lq = q.toLowerCase();
    renderSupplierCards(allSuppliers.filter(s => (s.name||'').toLowerCase().includes(lq) || (s.phone||'').includes(lq)));
}

function supplierFormHTML(s = {}) {
    const v = (k, d = '') => s[k] != null ? String(s[k]).replace(/"/g, '&quot;') : d;
    return `<div class="text-left">
        <h2 class="text-2xl font-black mb-4">${s.id ? '✏️ Edit Supplier' : '🚚 New Supplier'}</h2>
        ${s.id ? `<input type="hidden" id="sup-id" value="${s.id}">` : ''}
        <div class="space-y-3">
            <div><label class="text-xs text-amber-400 font-black uppercase mb-1 block">Company Name *</label>
                <input id="sup-name" value="${v('name')}" placeholder="ABC Distributors Ltd" class="w-full bg-slate-700 p-3 rounded-xl border border-slate-600 text-white outline-none focus:border-amber-500"></div>
            <div class="grid grid-cols-2 gap-3">
                <div><label class="text-xs text-slate-400 font-black uppercase mb-1 block">Contact Person</label>
                    <input id="sup-contact" value="${v('contactPerson')}" placeholder="John Doe" class="w-full bg-slate-700 p-3 rounded-xl border border-slate-600 text-white outline-none focus:border-amber-500"></div>
                <div><label class="text-xs text-slate-400 font-black uppercase mb-1 block">Phone</label>
                    <input id="sup-phone" value="${v('phone')}" placeholder="0712345678" class="w-full bg-slate-700 p-3 rounded-xl border border-slate-600 text-white outline-none focus:border-amber-500"></div>
            </div>
            <div><label class="text-xs text-slate-400 font-black uppercase mb-1 block">Email</label>
                <input id="sup-email" type="email" value="${v('email')}" placeholder="supplier@example.com" class="w-full bg-slate-700 p-3 rounded-xl border border-slate-600 text-white outline-none focus:border-amber-500"></div>
            <div><label class="text-xs text-slate-400 font-black uppercase mb-1 block">KRA PIN / Tax</label>
                <input id="sup-pin" value="${v('taxPin')}" placeholder="A001234567T" class="w-full bg-slate-700 p-3 rounded-xl border border-slate-600 text-white outline-none focus:border-amber-500"></div>
            <div><label class="text-xs text-slate-400 font-black uppercase mb-1 block">Notes</label>
                <textarea id="sup-notes" rows="2" class="w-full bg-slate-700 p-3 rounded-xl border border-slate-600 text-white outline-none focus:border-amber-500 resize-none">${v('notes')}</textarea></div>
            <div class="flex gap-3 pt-2">
                <button onclick="saveSupplier(${s.id || 'null'})" class="flex-grow py-4 gold-gradient rounded-xl font-black text-slate-900">${s.id ? '💾 UPDATE' : '➕ ADD SUPPLIER'}</button>
                <button onclick="closeEditModal()" class="px-6 glass rounded-xl font-bold border border-slate-600 text-slate-300">Cancel</button>
            </div>
        </div></div>`;
}

function openAddSupplierModal() { openEditModal(supplierFormHTML()); setTimeout(() => document.getElementById('sup-name')?.focus(), 100); }
function openEditSupplierModal(id) {
    openEditModal('<div class="text-center py-10"><div class="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div></div>');
    fetch(`http://localhost:8080/api/suppliers/${id}`).then(r => r.json()).then(s => { document.getElementById('edit-content').innerHTML = supplierFormHTML(s); });
}

async function saveSupplier(id = null) {
    const name = document.getElementById('sup-name')?.value?.trim();
    if (!name) return showNotification('Company name is required', '⚠️', 'Validation');
    const body = { name, contactPerson: document.getElementById('sup-contact')?.value?.trim() || null, phone: document.getElementById('sup-phone')?.value?.trim() || null, email: document.getElementById('sup-email')?.value?.trim() || null, taxPin: document.getElementById('sup-pin')?.value?.trim() || null, notes: document.getElementById('sup-notes')?.value?.trim() || null };
    const url = id && id !== 'null' ? `http://localhost:8080/api/suppliers/${id}` : 'http://localhost:8080/api/suppliers';
    const method = id && id !== 'null' ? 'PUT' : 'POST';
    try {
        const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (r.ok) { closeEditModal(); showNotification(`Supplier "${name}" saved!`, '✅', 'Saved'); loadSuppliers(); }
        else showNotification('Save failed', '❌', 'Error');
    } catch (e) { showNotification('Backend not reachable', '❌', 'Error'); }
}

async function toggleSupplier(id) {
    try { await fetch(`http://localhost:8080/api/suppliers/${id}/toggle`, { method: 'PATCH' }); loadSuppliers(); } catch (e) { /* silent */ }
}

function openOrderModal(id, name) {
    openEditModal(`<div class="text-left">
        <h2 class="text-xl font-black mb-4">📦 Record Purchase from ${name}</h2>
        <div class="space-y-3">
            <div><label class="text-xs text-amber-400 font-black uppercase mb-1 block">Order Amount (KES) *</label>
                <input id="order-amount" type="number" placeholder="0.00" class="w-full bg-slate-700 p-3 rounded-xl border border-slate-600 text-white outline-none focus:border-amber-500"></div>
            <div class="flex gap-3 pt-2">
                <button onclick="recordSupplierOrder(${id})" class="flex-grow py-4 gold-gradient rounded-xl font-black text-slate-900">✅ RECORD ORDER</button>
                <button onclick="closeEditModal()" class="px-6 glass rounded-xl font-bold border border-slate-600 text-slate-300">Cancel</button>
            </div>
        </div></div>`);
    setTimeout(() => document.getElementById('order-amount')?.focus(), 100);
}

async function recordSupplierOrder(id) {
    const amount = parseFloat(document.getElementById('order-amount')?.value);
    if (!amount || amount <= 0) return showNotification('Enter valid amount', '⚠️', 'Validation');
    try {
        const r = await fetch(`http://localhost:8080/api/suppliers/${id}/order?amount=${amount}`, { method: 'POST' });
        if (r.ok) { closeEditModal(); showNotification('Order recorded!', '✅', 'Saved'); loadSuppliers(); }
    } catch (e) { showNotification('Backend not reachable', '❌', 'Error'); }
}

// ============================================================
// SHIFT MANAGER — Cash Float & Reconciliation (like Toast / Clover / Square)
// ============================================================

async function loadShifts() {
    const panel = document.getElementById('shift-current-panel');
    const history = document.getElementById('shift-history');
    if (!panel) return;
    try {
        const [openResp, allResp] = await Promise.all([
            fetch(`http://localhost:8080/api/shifts/open?cashier=${encodeURIComponent(state.user?.name || 'cashier')}`),
            fetch('http://localhost:8080/api/shifts')
        ]);
        const openShift = openResp.ok ? await openResp.json() : null;
        const allShifts = allResp.ok ? await allResp.json() : [];
        renderShiftPanel(panel, openShift);
        renderShiftHistory(history, allShifts);
        updateShiftDot();
    } catch (e) {
        panel.innerHTML = `<div class="text-center py-8"><p class="text-5xl mb-3">🔌</p><p class="font-black text-slate-300">Backend Not Reachable</p><button onclick="loadShifts()" class="mt-4 px-6 py-2 gold-gradient rounded-xl text-sm font-black text-slate-900">🔄 Retry</button></div>`;
    }
}

function renderShiftPanel(el, shift) {
    if (!shift) {
        el.innerHTML = `<div class="bg-slate-800 rounded-2xl border border-slate-700 p-6 flex items-center gap-4">
            <div class="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center"><span class="material-icons text-slate-400 text-2xl">schedule</span></div>
            <div class="flex-grow"><p class="font-black text-lg text-white">No Open Shift</p><p class="text-xs text-slate-400">Open a shift to start accepting payments</p></div>
            <button onclick="openShiftModal()" class="px-6 py-3 gold-gradient rounded-xl font-black text-slate-900 flex items-center gap-2"><span class="material-icons">play_circle</span>OPEN SHIFT</button>
        </div>`;
    } else {
        const duration = formatDuration(new Date(shift.openedAt), new Date());
        el.innerHTML = `<div class="bg-green-900/20 rounded-2xl border border-green-500/30 p-6">
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-3">
                    <div class="w-3 h-3 rounded-full bg-green-400 animate-pulse"></div>
                    <div><p class="font-black text-green-400">Shift Active — ${shift.cashierUsername}</p>
                    <p class="text-xs text-slate-400">Opened ${new Date(shift.openedAt).toLocaleTimeString()} · ${duration}</p></div>
                </div>
                <button onclick="closeShiftModal(${shift.id})" class="px-6 py-3 bg-red-600 hover:bg-red-500 rounded-xl font-black text-white flex items-center gap-2 transition-all">
                    <span class="material-icons">stop_circle</span>CLOSE SHIFT</button>
            </div>
            <div class="grid grid-cols-3 gap-4 text-center">
                <div class="bg-slate-800/50 p-3 rounded-xl"><p class="text-xs text-slate-400 uppercase font-bold mb-1">Opening Float</p><p class="font-black text-xl text-white">KES ${(shift.openingFloat || 0).toLocaleString()}</p></div>
                <div class="bg-slate-800/50 p-3 rounded-xl"><p class="text-xs text-slate-400 uppercase font-bold mb-1">Shift ID</p><p class="font-black text-xl text-white">#${shift.id}</p></div>
                <div class="bg-slate-800/50 p-3 rounded-xl"><p class="text-xs text-slate-400 uppercase font-bold mb-1">Duration</p><p class="font-black text-xl text-white">${duration}</p></div>
            </div></div>`;
    }
}

function renderShiftHistory(el, shifts) {
    if (!el) return;
    if (shifts.length === 0) { el.innerHTML = '<p class="text-slate-500 text-sm text-center py-6">No shift history yet.</p>'; return; }
    el.innerHTML = shifts.map(s => {
        const variance = s.variance ?? 0;
        const varColor = variance === 0 ? 'text-green-400' : variance > 0 ? 'text-blue-400' : 'text-red-400';
        const varLabel = variance > 0 ? `+KES ${variance}` : variance < 0 ? `-KES ${Math.abs(variance)}` : 'Balanced ✓';
        return `<div class="bg-slate-800/60 rounded-xl border border-slate-700 p-4 flex items-center justify-between">
            <div>
                <p class="font-black text-sm text-white">${s.cashierUsername} · Shift #${s.id}</p>
                <p class="text-xs text-slate-400">${new Date(s.openedAt).toLocaleString()} ${s.closedAt ? '→ ' + new Date(s.closedAt).toLocaleString() : ''}</p>
                ${s.notes ? `<p class="text-xs text-slate-500 italic mt-1">"${s.notes}"</p>` : ''}
            </div>
            <div class="text-right">
                <p class="font-black text-amber-400">KES ${(s.totalSales || 0).toLocaleString()}</p>
                <p class="text-xs ${varColor} font-bold">${s.status === 'OPEN' ? '● OPEN' : varLabel}</p>
                <p class="text-[10px] text-slate-500">${s.transactionCount ?? 0} txns</p>
            </div>
        </div>`;
    }).join('');
}

function formatDuration(from, to) {
    const ms = to - from;
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function openShiftModal() {
    openEditModal(`<div class="text-left">
        <h2 class="text-2xl font-black mb-1">▶️ Open New Shift</h2>
        <p class="text-slate-400 text-sm mb-4">Count the cash in the drawer before starting.</p>
        <div class="space-y-3">
            <div><label class="text-xs text-amber-400 font-black uppercase mb-1 block">Opening Float — Cash in Drawer (KES)</label>
                <input id="shift-float" type="number" min="0" placeholder="e.g. 5000" class="w-full bg-slate-700 p-3 rounded-xl border border-slate-600 text-white outline-none focus:border-amber-500 text-xl font-black"></div>
            <div class="flex gap-3 pt-2">
                <button onclick="startShift()" class="flex-grow py-4 gold-gradient rounded-xl font-black text-slate-900 text-lg">▶️ START SHIFT</button>
                <button onclick="closeEditModal()" class="px-6 glass rounded-xl font-bold border border-slate-600 text-slate-300">Cancel</button>
            </div>
        </div></div>`);
    setTimeout(() => document.getElementById('shift-float')?.focus(), 100);
}

async function startShift() {
    const float = parseFloat(document.getElementById('shift-float')?.value) || 0;
    try {
        const r = await fetch('http://localhost:8080/api/shifts/open', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cashierUsername: state.user?.name || 'cashier', openingFloat: float })
        });
        if (r.ok) { closeEditModal(); showNotification(`Shift started with KES ${float.toLocaleString()} float`, '▶️', 'Shift Open'); loadShifts(); }
        else { const err = await r.json().catch(() => ({})); showNotification(err.error || 'Could not open shift', '❌', 'Error'); }
    } catch (e) { showNotification('Backend not reachable', '❌', 'Error'); }
}

function closeShiftModal(shiftId) {
    openEditModal(`<div class="text-left">
        <h2 class="text-2xl font-black mb-1">⏹️ Close Shift</h2>
        <p class="text-slate-400 text-sm mb-4">Count all the cash in your drawer and enter the total.</p>
        <div class="space-y-3">
            <div><label class="text-xs text-amber-400 font-black uppercase mb-1 block">Closing Cash Count (KES) *</label>
                <input id="shift-closing" type="number" min="0" placeholder="Count and enter total" class="w-full bg-slate-700 p-3 rounded-xl border border-slate-600 text-white outline-none focus:border-amber-500 text-xl font-black"></div>
            <div><label class="text-xs text-slate-400 font-black uppercase mb-1 block">Notes (optional)</label>
                <input id="shift-notes" type="text" placeholder="Any discrepancy explanation..." class="w-full bg-slate-700 p-3 rounded-xl border border-slate-600 text-white outline-none focus:border-amber-500"></div>
            <div class="flex gap-3 pt-2">
                <button onclick="endShift(${shiftId})" class="flex-grow py-4 bg-red-600 hover:bg-red-500 rounded-xl font-black text-white text-lg transition-all">⏹️ CLOSE SHIFT</button>
                <button onclick="closeEditModal()" class="px-6 glass rounded-xl font-bold border border-slate-600 text-slate-300">Cancel</button>
            </div>
        </div></div>`);
    setTimeout(() => document.getElementById('shift-closing')?.focus(), 100);
}

async function endShift(shiftId) {
    const closingCash = parseFloat(document.getElementById('shift-closing')?.value);
    if (isNaN(closingCash)) return showNotification('Enter the closing cash count', '⚠️', 'Validation');
    const notes = document.getElementById('shift-notes')?.value?.trim() || null;
    try {
        const r = await fetch(`http://localhost:8080/api/shifts/${shiftId}/close`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ closingCash, notes })
        });
        if (r.ok) {
            const shift = await r.json();
            closeEditModal();
            const v = shift.variance ?? 0;
            const msg = v === 0 ? '✅ Balanced!' : v > 0 ? `💰 Over by KES ${Math.abs(v)}` : `⚠️ Short by KES ${Math.abs(v)}`;
            showNotification(`Shift closed. ${msg}`, '⏹️', 'Shift Closed');
            loadShifts();
        } else showNotification('Could not close shift', '❌', 'Error');
    } catch (e) { showNotification('Backend not reachable', '❌', 'Error'); }
}

function updateShiftDot() {
    const dot = document.getElementById('shift-status-dot');
    if (!dot || !state.user?.name) return;
    fetch(`http://localhost:8080/api/shifts/open?cashier=${encodeURIComponent(state.user.name)}`)
        .then(r => { dot.className = r.ok ? 'ml-auto w-2 h-2 rounded-full bg-green-400 animate-pulse' : 'ml-auto w-2 h-2 rounded-full bg-slate-600'; })
        .catch(() => { dot.className = 'ml-auto w-2 h-2 rounded-full bg-slate-600'; });
}

// ============================================================
// BARCODE QUICK-ADD — '/' shortcut focuses search (like Square / Clover / GitHub)
// ============================================================
document.addEventListener('keydown', (evt) => {
    if (evt.key === '/' && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) {
        evt.preventDefault();
        const s = document.getElementById('product-search') || document.querySelector('input[placeholder*="earch"]');
        if (s) { s.focus(); s.select(); }
    }
    if (evt.key === 'Escape') {
        const m = document.getElementById('edit-modal');
        if (m && !m.classList.contains('hidden')) closeEditModal();
    }
});

// ============================================================
// SPLIT PAYMENT — Pay part Cash, part M-Pesa (like Square / Toast)
// ============================================================
function openSplitPaymentModal() {
    const total = getCartFinalAmount();
    if (total <= 0) return showNotification('Cart is empty', '⚠️', 'Error');
    openEditModal(`<div class="text-left">
        <div class="flex items-center gap-3 mb-5"><span class="text-3xl">💳</span>
            <div><h2 class="text-2xl font-black">Split Payment</h2>
            <p class="text-xs text-slate-400">Total due: <strong class="text-amber-400">KES ${total.toFixed(2)}</strong></p></div>
        </div>
        <div class="space-y-4">
            <div><label class="text-xs text-green-400 font-black uppercase mb-1 block">📱 M-Pesa Amount (KES)</label>
                <input id="split-mpesa" type="number" min="0" max="${total}" value="0" oninput="updateSplitBalance(${total})"
                    class="w-full bg-slate-700 p-3 rounded-xl border border-slate-600 text-white outline-none focus:border-amber-500 text-xl font-black"></div>
            <div><label class="text-xs text-amber-400 font-black uppercase mb-1 block">💵 Cash Amount (KES — auto)</label>
                <input id="split-cash" type="number" value="${total.toFixed(2)}" readonly
                    class="w-full bg-slate-800 p-3 rounded-xl border border-slate-600 text-amber-400 text-xl font-black cursor-not-allowed"></div>
            <div id="split-warning" class="hidden text-xs text-red-400 font-bold">⚠️ M-Pesa amount cannot exceed total</div>
            <div class="flex gap-3 pt-2">
                <button onclick="processSplitPayment(${total})" class="flex-grow py-4 gold-gradient rounded-xl font-black text-slate-900">✅ PROCESS SPLIT</button>
                <button onclick="closeEditModal()" class="px-6 glass rounded-xl font-bold border border-slate-600 text-slate-300">Cancel</button>
            </div>
        </div></div>`);
    setTimeout(() => document.getElementById('split-mpesa')?.focus(), 100);
}

function updateSplitBalance(total) {
    const mpesa = parseFloat(document.getElementById('split-mpesa')?.value) || 0;
    const cashEl = document.getElementById('split-cash');
    if (cashEl) cashEl.value = Math.max(0, total - mpesa).toFixed(2);
    document.getElementById('split-warning')?.classList.toggle('hidden', mpesa <= total);
}

async function processSplitPayment(total) {
    const mpesa = parseFloat(document.getElementById('split-mpesa')?.value) || 0;
    const cash  = parseFloat(document.getElementById('split-cash')?.value) || 0;
    if (mpesa > total) return showNotification('M-Pesa amount exceeds total', '⚠️', 'Error');
    closeEditModal();
    const sale = {
        transactionId: 'SPLIT-' + Date.now(),
        totalAmount: total, finalAmount: total,
        paymentMethod: 'SPLIT', status: 'SUCCESS',
        notes: `Split: M-Pesa KES ${mpesa} + Cash KES ${cash}`,
        customerId: selectedCustomer?.id ?? null,
        customerName: selectedCustomer?.name ?? null,
        cashierUsername: state.user?.name ?? null,
        discountAmount: getDiscountAmount(), discountType: cartDiscount.type,
        items: state.cart.map(i => ({ productName: i.name, productId: i.id, quantity: i.quantity, unitPrice: i.price, subtotal: i.price * i.quantity }))
    };
    try {
        const r = await fetch('http://localhost:8080/api/sales/checkout', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(sale) });
        if (r.ok) { clearCartFull(); showNotification(`Split payment done! M-Pesa KES ${mpesa} + Cash KES ${cash}`, '✅', 'Sale Complete'); }
        else showNotification('Payment failed', '❌', 'Error');
    } catch (e) { showNotification('Backend not reachable', '❌', 'Error'); }
}
