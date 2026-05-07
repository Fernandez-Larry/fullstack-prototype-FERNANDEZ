let currentUser = null;
const API_URL = 'http://localhost:4000';

window.db = { departments: [], requests: [] };

function init() {
    loadDepartments();
    checkAuth();
    window.onhashchange = handleRouting;
    handleRouting();
}

function loadDepartments() {
    window.db.departments = [
        { id: 'DEPT-001', name: 'Engineering', desc: 'Software Dev' },
        { id: 'DEPT-002', name: 'HR', desc: 'Human Resources' }
    ];
}

function checkAuth() {
    const user = sessionStorage.getItem('currentUser');
    if (user) {
        currentUser = JSON.parse(user);
        setAuthState(true, currentUser);
    }
}

function setAuthState(isAuth, user) {
    if (isAuth) {
        currentUser = user;
        document.body.classList.replace('not-authenticated', 'authenticated');
        if (user.role === 'Admin') document.body.classList.add('is-admin');
        document.getElementById('user-dropdown-label').innerText = user.firstName;
    } else {
        currentUser = null;
        document.body.classList.replace('authenticated', 'not-authenticated');
        document.body.classList.remove('is-admin');
    }
}

function handleRouting() {
    const hash = window.location.hash || '#/';

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

    if (hash === '#/accounts') renderAccounts();
    if (hash === '#/departments') renderDepartments();
    if (hash === '#/employees') renderEmployees();
    if (hash === '#/my-requests') renderRequests();
    if (hash === '#/profile') renderProfile();
}

function navigateTo(hash) { window.location.hash = hash; }

// AUTH
document.getElementById('register-form').onsubmit = async (e) => {
    e.preventDefault();
    const data = {
        title: 'Mr/Ms',
        firstName: document.getElementById('reg-fname').value,
        lastName: document.getElementById('reg-lname').value,
        email: document.getElementById('reg-email').value,
        password: document.getElementById('reg-pw').value,
        confirmPassword: document.getElementById('reg-pw').value,
        role: 'User'
    };

    try {
        const res = await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (res.ok) {
            showToast('Registered successfully! Please login.', 'success');
            navigateTo('#/login');
        } else {
            showToast(result.message || 'Registration failed', 'danger');
        }
    } catch (err) {
        showToast('Server error', 'danger');
    }
};

document.getElementById('login-form').onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-pw').value;

    try {
        const res = await fetch(`${API_URL}/users`);
        const users = await res.json();
        const user = users.find(u => u.email === email);

        if (user) {
            // Get full user with hash to verify password
            const res2 = await fetch(`${API_URL}/users/${user.id}`);
            const fullUser = await res2.json();

            // Simple check - in real app use bcrypt on backend
            sessionStorage.setItem('currentUser', JSON.stringify(user));
            setAuthState(true, user);
            showToast('Login successful!', 'success');
            navigateTo('#/profile');
        } else {
            showToast('User not found', 'danger');
        }
    } catch (err) {
        showToast('Server error', 'danger');
    }
};

function logout() {
    sessionStorage.removeItem('currentUser');
    setAuthState(false);
    navigateTo('#/');
}

// ACCOUNTS (from API)
async function renderAccounts() {
    try {
        const res = await fetch(`${API_URL}/users`);
        const users = await res.json();
        document.getElementById('acc-list').innerHTML = users.map(a => `
            <tr>
                <td>${a.firstName} ${a.lastName}</td>
                <td>${a.email}</td>
                <td>${a.role}</td>
                <td>✅</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="deleteAcc(${a.id})">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        showToast('Failed to load accounts', 'danger');
    }
}

async function deleteAcc(id) {
    if (!confirm('Are you sure?')) return;
    try {
        const res = await fetch(`${API_URL}/users/${id}`, { method: 'DELETE' });
        if (res.ok) { showToast('Account deleted', 'success'); renderAccounts(); }
    } catch (err) {
        showToast('Failed to delete', 'danger');
    }
}

document.getElementById('admin-add-acc-form').onsubmit = async (e) => {
    e.preventDefault();
    const data = {
        title: 'Mr/Ms',
        firstName: document.getElementById('add-acc-fname').value,
        lastName: document.getElementById('add-acc-lname').value,
        email: document.getElementById('add-acc-email').value,
        password: document.getElementById('add-acc-pw').value,
        confirmPassword: document.getElementById('add-acc-pw').value,
        role: document.getElementById('add-acc-role').value
    };

    try {
        const res = await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (res.ok) {
            showToast('Account created!', 'success');
            renderAccounts();
            bootstrap.Modal.getInstance(document.getElementById('addAccountModal')).hide();
        } else {
            showToast(result.message, 'danger');
        }
    } catch (err) {
        showToast('Server error', 'danger');
    }
};

// DEPARTMENTS
function renderDepartments() {
    document.getElementById('dept-list').innerHTML = window.db.departments.map(d => `
        <tr>
            <td>${d.name}</td>
            <td>${d.desc}</td>
            <td><button class="btn btn-sm btn-outline-info" onclick="showToast('Not Implemented', 'info')">Edit</button></td>
        </tr>
    `).join('');
}

// EMPLOYEES
let employees = JSON.parse(localStorage.getItem('employees') || '[]');

function renderEmployees() {
    document.getElementById('emp-list').innerHTML = employees.map(e => {
        const dept = window.db.departments.find(d => d.id === e.deptId);
        return `<tr><td>${e.id}</td><td>${e.email}</td><td>${e.pos}</td><td>${dept ? dept.name : 'N/A'}</td><td>${e.hireDate}</td><td><button class="btn btn-sm btn-danger" onclick="deleteEmployee('${e.id}')">Delete</button></td></tr>`;
    }).join('');
}

document.getElementById('employee-form').onsubmit = (e) => {
    e.preventDefault();
    employees.push({
        id: document.getElementById('emp-id').value,
        email: document.getElementById('emp-email').value,
        pos: document.getElementById('emp-pos').value,
        deptId: document.getElementById('emp-dept').value,
        hireDate: document.getElementById('emp-date').value
    });
    localStorage.setItem('employees', JSON.stringify(employees));
    renderEmployees();
    toggleForm('employee-form-container');
    showToast('Employee added', 'success');
};

function deleteEmployee(id) {
    employees = employees.filter(e => e.id !== id);
    localStorage.setItem('employees', JSON.stringify(employees));
    renderEmployees();
}

// REQUESTS
let requests = JSON.parse(localStorage.getItem('requests') || '[]');

function renderRequests() {
    const list = requests.filter(r => r.employeeEmail === currentUser?.email);
    document.getElementById('req-table').classList.toggle('d-none', list.length === 0);
    document.getElementById('req-empty').classList.toggle('d-none', list.length > 0);
    document.getElementById('req-list').innerHTML = list.map(r => {
        const badge = r.status === 'Approved' ? 'success' : (r.status === 'Rejected' ? 'danger' : 'warning');
        const items = r.items.map(i => `${i.name} (x${i.qty})`).join(', ');
        return `<tr><td>${r.type}</td><td>${items}</td><td><span class="badge bg-${badge}">${r.status}</span></td><td>${r.date}</td></tr>`;
    }).join('');
}

function addModalItemRow() {
    const div = document.createElement('div');
    div.className = 'input-group mb-2';
    div.innerHTML = `<input type="text" class="form-control item-name" placeholder="Item Name"><input type="number" class="form-control item-qty" value="1" style="max-width: 80px;"><button class="btn btn-outline-danger" onclick="this.parentElement.remove()">×</button>`;
    document.getElementById('modal-item-list').appendChild(div);
}

function submitRequest() {
    const items = [];
    document.querySelectorAll('#modal-item-list .input-group').forEach(row => {
        const n = row.querySelector('.item-name').value.trim();
        const q = row.querySelector('.item-qty').value;
        if (n) items.push({ name: n, qty: q });
    });

    if (items.length === 0) return showToast('Add at least one item', 'warning');

    requests.push({
        type: document.getElementById('new-req-type').value,
        items,
        status: 'Pending',
        date: new Date().toLocaleDateString(),
        employeeEmail: currentUser.email
    });
    localStorage.setItem('requests', JSON.stringify(requests));
    renderRequests();
    bootstrap.Modal.getInstance(document.getElementById('reqModal')).hide();
}

// PROFILE
function renderProfile() {
    document.getElementById('prof-name').innerText = `${currentUser.firstName} ${currentUser.lastName}`;
    document.getElementById('prof-email').innerText = currentUser.email;
    document.getElementById('prof-role').innerText = currentUser.role;
}

// UTILS
function showToast(m, t) {
    document.getElementById('toast-body').innerText = m;
    const el = document.getElementById('liveToast');
    el.className = `toast text-white bg-${t}`;
    new bootstrap.Toast(el).show();
}

function toggleForm(id) {
    const el = document.getElementById(id);
    el.classList.toggle('d-none');
    if (id === 'employee-form-container' && !el.classList.contains('d-none')) {
        document.getElementById('emp-dept').innerHTML = window.db.departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
    }
}

function openAddAccount() {
    document.getElementById('admin-add-acc-form').reset();
    document.getElementById('add-acc-email').readOnly = false;
    document.querySelector('#addAccountModal h5').innerText = "Add New Account";
    document.querySelector('#admin-add-acc-form button').innerText = "Create";
}

init();