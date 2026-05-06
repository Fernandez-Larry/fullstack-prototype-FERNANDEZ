let currentUser = null;
const STORAGE_KEY = 'ipt_demo_v1';

window.db = { accounts: [], employees: [], departments: [], requests: [] };

function init() {
    loadFromStorage();
    checkAuth();
    window.onhashchange = handleRouting;
    handleRouting();
}

function loadFromStorage() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) { try { window.db = JSON.parse(saved); } catch (e) { localStorage.clear(); } } 
    
    // Seed Admin if missing
    if (!window.db.accounts.find(a => a.email === 'admin@example.com')) {
        window.db.accounts.push({ id: Date.now(), fname: 'Admin', lname: 'User', email: 'admin@example.com', password: 'Password123!', role: 'Admin', verified: true });
    }
    // Seed Departments if missing
    if (window.db.departments.length === 0) {
        window.db.departments = [{ id: 'DEPT-001', name: 'Engineering', desc: 'Software Dev' }, { id: 'DEPT-002', name: 'HR', desc: 'Human Resources' }];
    }
    saveToStorage();
}

function saveToStorage() { localStorage.setItem(STORAGE_KEY, JSON.stringify(window.db)); }

function handleRouting() {
    const hash = window.location.hash || '#/';
    
    // Auth Guards
    const protectedRoutes = ['#/profile', '#/employees', '#/accounts', '#/departments', '#/my-requests'];
    const adminRoutes = ['#/employees', '#/accounts', '#/departments'];
    
    if (protectedRoutes.includes(hash) && !currentUser) return navigateTo('#/login');
    if (adminRoutes.includes(hash) && currentUser?.role !== 'Admin') return navigateTo('#/profile');

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    
    const routes = { 
        '#/': 'home-page', 
        '#/login': 'login-page', 
        '#/register': 'register-page', 
        '#/verify-email': 'verify-email-page', 
        '#/employees': 'employees-page', 
        '#/accounts': 'accounts-page', 
        '#/departments': 'departments-page', 
        '#/my-requests': 'my-requests-page', 
        '#/profile': 'profile-page' 
    };

    const target = document.getElementById(routes[hash] || 'home-page');
    if (target) target.classList.add('active');

    // Render Logic
    if (hash === '#/verify-email') document.getElementById('display-unverified-email').innerText = localStorage.getItem('unverified_email');
    if (hash === '#/accounts') renderAccounts();
    if (hash === '#/departments') renderDepartments();
    if (hash === '#/employees') renderEmployees();
    if (hash === '#/my-requests') renderRequests();
    if (hash === '#/profile') renderProfile();
}

function navigateTo(hash) { window.location.hash = hash; }

function checkAuth() {
    const token = localStorage.getItem('auth_token');
    if (token) { 
        const user = window.db.accounts.find(u => u.email === token); 
        if (user) setAuthState(true, user); 
    }
}

function setAuthState(isAuth, user) {
    if(isAuth) {
        currentUser = user;
        document.body.classList.replace('not-authenticated', 'authenticated');
        if (user.role === 'Admin') document.body.classList.add('is-admin');
        document.getElementById('user-dropdown-label').innerText = user.fname;
    } else {
        currentUser = null;
        document.body.classList.replace('authenticated', 'not-authenticated');
        document.body.classList.remove('is-admin');
    }
}

// ACCOUNT MGMT
function openEditAccount(email) {
    const acc = window.db.accounts.find(a => a.email === email);
    if (!acc) return;
    document.getElementById('add-acc-fname').value = acc.fname;
    document.getElementById('add-acc-lname').value = acc.lname;
    document.getElementById('add-acc-email').value = acc.email;
    document.getElementById('add-acc-email').readOnly = true;
    document.getElementById('add-acc-pw').value = acc.password;
    document.getElementById('add-acc-role').value = acc.role;
    document.getElementById('add-acc-verify').checked = acc.verified;
    document.querySelector('#addAccountModal h5').innerText = "Edit Account";
    document.querySelector('#admin-add-acc-form button').innerText = "Update Account";
    new bootstrap.Modal(document.getElementById('addAccountModal')).show();
}

function openAddAccount() {
    document.getElementById('admin-add-acc-form').reset();
    document.getElementById('add-acc-email').readOnly = false;
    document.querySelector('#addAccountModal h5').innerText = "Add New Account";
    document.querySelector('#admin-add-acc-form button').innerText = "Create";
}

document.getElementById('admin-add-acc-form').onsubmit = (e) => {
    e.preventDefault();
    const email = document.getElementById('add-acc-email').value;
    const isEdit = document.getElementById('add-acc-email').readOnly;
    
    if (!isEdit && window.db.accounts.find(a => a.email === email)) {
        return showToast("Email already exists", "danger");
    }

    const accData = { 
        id: isEdit ? window.db.accounts.find(a => a.email === email).id : Date.now(), 
        fname: document.getElementById('add-acc-fname').value, 
        lname: document.getElementById('add-acc-lname').value, 
        email: email, 
        password: document.getElementById('add-acc-pw').value, 
        role: document.getElementById('add-acc-role').value, 
        verified: document.getElementById('add-acc-verify').checked 
    };

    if (isEdit) window.db.accounts[window.db.accounts.findIndex(a => a.email === email)] = accData;
    else window.db.accounts.push(accData);
    
    saveToStorage(); renderAccounts(); 
    bootstrap.Modal.getInstance(document.getElementById('addAccountModal')).hide();
};

function deleteAcc(email) {
    if (email === currentUser.email) return showToast("Cannot delete yourself", "danger");
    window.db.accounts = window.db.accounts.filter(a => a.email !== email); 
    saveToStorage(); renderAccounts();
}

function resetPw(email) {
    const newPw = prompt("Enter new password (min 6):");
    if (newPw && newPw.length >= 6) {
        window.db.accounts.find(a => a.email === email).password = newPw;
        saveToStorage(); showToast("Password updated", "success");
    }
}

// EMPLOYEE MGMT
document.getElementById('employee-form').onsubmit = (e) => {
    e.preventDefault();
    const email = document.getElementById('emp-email').value;
    const user = window.db.accounts.find(a => a.email === email);
    
    if (!user) return showToast("Account email not found", "danger");
    
    window.db.employees.push({ 
        id: document.getElementById('emp-id').value, 
        userId: user.id,
        email: email, 
        pos: document.getElementById('emp-pos').value, 
        deptId: document.getElementById('emp-dept').value,
        hireDate: document.getElementById('emp-date').value
    });
    
    saveToStorage(); renderEmployees(); toggleForm('employee-form-container');
    showToast("Employee Linked", "success");
};

function deleteEmployee(id) {
    window.db.employees = window.db.employees.filter(e => e.id !== id);
    saveToStorage(); renderEmployees();
}

// AUTH ACTIONS
document.getElementById('register-form').onsubmit = (e) => {
    e.preventDefault();
    const email = document.getElementById('reg-email').value;
    if (window.db.accounts.find(a => a.email === email)) return showToast("Email exists", "danger");

    window.db.accounts.push({ 
        id: Date.now(), 
        fname: document.getElementById('reg-fname').value, 
        lname: document.getElementById('reg-lname').value, 
        email: email, 
        password: document.getElementById('reg-pw').value, 
        role: 'User', 
        verified: false 
    });
    localStorage.setItem('unverified_email', email); saveToStorage(); navigateTo('#/verify-email');
};

function simulateVerification() {
    const acc = window.db.accounts.find(a => a.email === localStorage.getItem('unverified_email'));
    if(acc) { acc.verified = true; saveToStorage(); navigateTo('#/login'); }
}

document.getElementById('login-form').onsubmit = (e) => {
    e.preventDefault();
    const user = window.db.accounts.find(u => u.email === document.getElementById('login-email').value && u.password === document.getElementById('login-pw').value && u.verified);
    if (user) { 
        localStorage.setItem('auth_token', user.email); 
        setAuthState(true, user); 
        navigateTo('#/profile'); 
    } else showToast("Invalid login or unverified", "danger");
};

function logout() { localStorage.removeItem('auth_token'); setAuthState(false); navigateTo('#/'); }

// RENDERING
function renderAccounts() {
    document.getElementById('acc-list').innerHTML = window.db.accounts.map(a => `<tr><td>${a.fname} ${a.lname}</td><td>${a.email}</td><td>${a.role}</td><td>${a.verified ? '✅' : '—'}</td><td><button class="btn btn-sm btn-primary" onclick="openEditAccount('${a.email}')">Edit</button> <button class="btn btn-sm btn-outline-secondary" onclick="resetPw('${a.email}')">Reset</button> <button class="btn btn-sm btn-danger" onclick="deleteAcc('${a.email}')">Delete</button></td></tr>`).join('');
}

function renderDepartments() { 
    document.getElementById('dept-list').innerHTML = window.db.departments.map(d => `<tr><td>${d.name}</td><td>${d.desc}</td><td><button class="btn btn-sm btn-outline-info" onclick="showToast('Not Implemented', 'info')">Edit</button></td></tr>`).join(''); 
}

function renderEmployees() {
    document.getElementById('emp-list').innerHTML = window.db.employees.map(e => {
        const dept = window.db.departments.find(d => d.id === e.deptId);
        return `<tr><td>${e.id}</td><td>${e.email}</td><td>${e.pos}</td><td>${dept ? dept.name : 'N/A'}</td><td>${e.hireDate}</td><td><button class="btn btn-sm btn-danger" onclick="deleteEmployee('${e.id}')">Delete</button></td></tr>`;
    }).join('');
}

function renderRequests() {
    const list = window.db.requests.filter(r => r.employeeEmail === currentUser.email);
    document.getElementById('req-table').classList.toggle('d-none', list.length === 0);
    document.getElementById('req-empty').classList.toggle('d-none', list.length > 0);
    
    document.getElementById('req-list').innerHTML = list.map(r => {
        const badge = r.status === 'Approved' ? 'success' : (r.status === 'Rejected' ? 'danger' : 'warning');
        const items = r.items.map(i => `${i.name} (x${i.qty})`).join(', ');
        return `<tr><td>${r.type}</td><td>${items}</td><td><span class="badge bg-${badge}">${r.status}</span></td><td>${r.date}</td></tr>`;
    }).join('');
}

function renderProfile() { 
    document.getElementById('prof-name').innerText = `${currentUser.fname} ${currentUser.lname}`; 
    document.getElementById('prof-email').innerText = currentUser.email; 
    document.getElementById('prof-role').innerText = currentUser.role; 
}

// REQUEST MGMT
function addModalItemRow() {
    const div = document.createElement('div'); div.className = 'input-group mb-2'; div.innerHTML = `<input type="text" class="form-control item-name" placeholder="Item Name"><input type="number" class="form-control item-qty" value="1" style="max-width: 80px;"><button class="btn btn-outline-danger" onclick="this.parentElement.remove()">×</button>`;
    document.getElementById('modal-item-list').appendChild(div);
}

function submitRequest() {
    const items = []; 
    document.querySelectorAll('#modal-item-list .input-group').forEach(row => { 
        const n = row.querySelector('.item-name').value.trim(); 
        const q = row.querySelector('.item-qty').value;
        if (n) items.push({ name: n, qty: q }); 
    });
    
    if (items.length === 0) return showToast("Add at least one item", "warning");
    
    window.db.requests.push({ type: document.getElementById('new-req-type').value, items: items, status: 'Pending', date: new Date().toLocaleDateString(), employeeEmail: currentUser.email });
    saveToStorage(); renderRequests(); 
    bootstrap.Modal.getInstance(document.getElementById('reqModal')).hide();
}

// UTILS
function showToast(m, t) {
    document.getElementById('toast-body').innerText = m;
    const el = document.getElementById('liveToast'); el.className = `toast text-white bg-${t}`;
    new bootstrap.Toast(el).show();
}

function toggleForm(id) { 
    const el = document.getElementById(id);
    el.classList.toggle('d-none'); 
    if(id === 'employee-form-container' && !el.classList.contains('d-none')) {
        document.getElementById('emp-dept').innerHTML = window.db.departments.map(d => `<option value="${d.id}">${d.name}</option>`).join(''); 
    }
}

init();