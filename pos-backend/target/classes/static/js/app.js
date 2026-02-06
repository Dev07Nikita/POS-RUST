const state = {
    products: [
        { id: 1, name: 'Tindi Coffee', price: 250, code: '001', category: 'Drinks' },
        { id: 2, name: 'Premium Tea', price: 150, code: '002', category: 'Drinks' },
        { id: 3, name: 'Glazed Donut', price: 100, code: '003', category: 'Snacks' },
        { id: 4, name: 'Beef Burger', price: 450, code: '004', category: 'Food' },
    ],
    cart: [],
};

function init() {
    renderProducts();
    updateCart();
}

function renderProducts() {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = state.products.map(p => `
        <div onclick="addToCart(${p.id})" class="glass p-4 rounded-2xl cursor-pointer hover:border-amber-500/50 transition-all group">
            <div class="w-full aspect-square bg-slate-800 rounded-xl mb-3 flex items-center justify-center text-slate-600 group-hover:scale-105 transition-transform font-bold text-4xl">
                ${p.name[0]}
            </div>
            <h3 class="font-bold text-sm truncate">${p.name}</h3>
            <p class="text-amber-500 font-bold">KES ${p.price}</p>
        </div>
    `).join('');
}

function addToCart(productId) {
    const product = state.products.find(p => p.id === productId);
    const existing = state.cart.find(item => item.id === productId);

    if (existing) {
        existing.quantity++;
    } else {
        state.cart.push({ ...product, quantity: 1 });
    }
    updateCart();
}

function updateCart() {
    const cartEl = document.getElementById('cart-items');
    cartEl.innerHTML = state.cart.map(item => `
        <div class="flex justify-between items-center glass p-3 rounded-xl border-l-4 border-amber-500">
            <div>
                <h4 class="font-bold text-sm text-white">${item.name}</h4>
                <p class="text-xs text-slate-400">KES ${item.price} x ${item.quantity}</p>
            </div>
            <button onclick="removeFromCart(${item.id})" class="text-slate-600 hover:text-red-500 p-2">✕</button>
        </div>
    `).join('');

    const subtotalValue = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const taxValue = subtotalValue * 0.16;
    const totalValue = subtotalValue + taxValue;

    document.getElementById('subtotal').innerText = \`KES \${subtotalValue.toLocaleString()}\`;
    document.getElementById('tax').innerText = \`KES \${taxValue.toLocaleString()}\`;
    document.getElementById('total').innerText = \`KES \${totalValue.toLocaleString()}\`;
}

function checkoutMpesa() {
    if (state.cart.length === 0) return alert('Cart is empty!');
    document.getElementById('mpesa-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('mpesa-modal').classList.add('hidden');
}

async function confirmPayment() {
    const phone = document.getElementById('customer-phone').value;
    if (!phone) return alert('Enter phone number');

    const btn = event.target;
    btn.innerText = 'PROCESSING...';
    btn.disabled = true;

    // Simulate API call to backend
    setTimeout(() => {
        alert('STK Push sent to ' + phone + '. Please complete payment on your phone.');
        closeModal();
        state.cart = [];
        updateCart();
        btn.innerText = 'PUSH TO PHONE';
        btn.disabled = false;
    }, 2000);
}

init();
