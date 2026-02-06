const state = {
    products: [
        { id: 1, name: 'Tindi Premium Coffee', price: 250, code: '001', category: 'Retail' },
        { id: 2, name: 'Safi House Blend', price: 1200, code: '002', category: 'Retail' },
        { id: 3, name: 'Artisan Pastry', price: 150, code: '003', category: 'Bakery' },
        { id: 4, name: 'Organic Honey', price: 850, code: '004', category: 'Retail' },
    ],
    cart: [],
    cashier: "Antigravity Dev",
    business: "SAFI MODERN RETAIL"
};

const UI = {
    grid: document.getElementById('product-grid'),
    cart: document.getElementById('cart-items'),
    total: document.getElementById('total-val'),
    cashier: document.getElementById('display-cashier'),
    mpesaModal: document.getElementById('payment-modal'),
    receiptModal: document.getElementById('receipt-modal')
};

function init() {
    UI.cashier.innerText = state.cashier;
    renderProducts();
}

function renderProducts() {
    UI.grid.innerHTML = state.products.map(p => `
        <div onclick="addToCart(${p.id})" class="glass p-5 rounded-[2rem] cursor-pointer hover:border-amber-500/50 transition-all group relative overflow-hidden">
            <div class="rust-badge absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">STOCK: 12</div>
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
