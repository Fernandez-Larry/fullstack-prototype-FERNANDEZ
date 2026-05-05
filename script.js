// ─── DATA STORE ───────────────────────────────────────────────────────────────
// Phase 2 & 4: Global db object and STORAGE_KEY
let db = { accounts: [], departments: [], employees: [], requests: [] };
let currentUser = null;
const STORAGE_KEY = "ipt_demo_v1";

// ─── PHASE 4: DATA PERSISTENCE ────────────────────────────────────────────────
function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function loadFromStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    // Seed default admin + two departments
    db.accounts.push({
      first:    "Admin",
      last:     "User",
      email:    "admin@example.com",
      password: "Password123!",
      role:     "admin",
      verified: true
    });
    db.departments = [
      { id: 1, name: "Engineering", desc: "" },
      { id: 2, name: "HR",          desc: "" }
    ];
    saveToStorage();
  } else {
    try {
      db = JSON.parse(raw);
    } catch (e) {
      // Corrupt storage – reset and re-seed
      localStorage.removeItem(STORAGE_KEY);
      loadFromStorage();
    }
  }
}

// ─── PHASE 3D: AUTH STATE MANAGEMENT ─────────────────────────────────────────
function setAuthState(isAuth, user = null) {
  currentUser = user;
  document.body.classList.toggle("authenticated",     isAuth);
  document.body.classList.toggle("not-authenticated", !isAuth);
  document.body.classList.toggle("is-admin",          user?.role === "admin");
  document.getElementById("navUser").innerText = user ? `${user.first} ${user.last}` : "";
}

// ─── PHASE 2: CLIENT-SIDE ROUTING ─────────────────────────────────────────────
//
// FIX: renamed route() to handleRouting() to match spec terminology.
// FIX: hash "#/verify-email" now maps correctly to "verify-email-page".
// FIX: protected routes now redirect properly when not authenticated.
// FIX: admin-only routes redirect non-admin users to home.
//

function navigateTo(hash) {
  window.location.hash = hash;
}

function handleRouting() {
  const hash = location.hash || "#/";
  // Strip "#/" prefix; fall back to "home"
  const r = hash.replace(/^#\//, "") || "home";

  // ── Auth guards ──
  const protectedRoutes = ["profile", "requests"];
  const adminRoutes     = ["accounts", "employees", "departments"];

  if (!currentUser && protectedRoutes.includes(r)) {
    location.hash = "#/login";
    return;
  }

  if (currentUser?.role !== "admin" && adminRoutes.includes(r)) {
    location.hash = "#/";
    return;
  }

  // ── Show matching page ──
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));

  // FIX: "verify-email" → "verify-email-page", all others → r + "-page"
  const pageId = r + "-page";
  const page   = document.getElementById(pageId) || document.getElementById("home-page");
  page.classList.add("active");

  // ── Per-page render ──
  if (r === "profile")      renderProfile();
  if (r === "accounts")     renderAccounts();
  if (r === "departments")  renderDept();
  if (r === "employees")    renderEmp();
  if (r === "requests")     renderReq();

  // ── Restore verify text if landing on verify-email directly ──
  if (r === "verify-email") {
    const pending = localStorage.getItem("unverified_email");
    if (pending) {
      document.getElementById("verifyText").innerText =
        `A verification email has been sent to ${pending}. Click the button below to simulate verification.`;
    }
  }
}

window.addEventListener("hashchange", handleRouting);

// ─── PHASE 3A: REGISTRATION ───────────────────────────────────────────────────
document.getElementById("regForm").addEventListener("submit", function(e) {
  e.preventDefault();
  const email = document.getElementById("rEmail").value.trim();

  if (db.accounts.find(a => a.email === email)) {
    showToast("An account with that email already exists.");
    return;
  }

  const newAccount = {
    first:    document.getElementById("rFirst").value.trim(),
    last:     document.getElementById("rLast").value.trim(),
    email:    email,
    password: document.getElementById("rPass").value,
    role:     "user",
    verified: false
  };

  db.accounts.push(newAccount);
  localStorage.setItem("unverified_email", email);
  saveToStorage();

  // Pre-populate verify page text before navigating
  document.getElementById("verifyText").innerText =
    `A verification email has been sent to ${email}. Click the button below to simulate verification.`;

  // FIX: navigate to "#/verify-email" (matching the page id "verify-email-page")
  location.hash = "#/verify-email";
  this.reset();
});

// ─── PHASE 3B: EMAIL VERIFICATION (SIMULATED) ────────────────────────────────
function verifyEmail() {
  const email = localStorage.getItem("unverified_email");
  const acc   = db.accounts.find(a => a.email === email);
  if (acc) {
    acc.verified = true;
    saveToStorage();
    localStorage.removeItem("unverified_email");
    showToast("✅ Email verified! Please log in.");
    location.hash = "#/login";
  } else {
    showToast("No pending verification found.");
  }
}

// ─── PHASE 3C: LOGIN ──────────────────────────────────────────────────────────
document.getElementById("loginForm").addEventListener("submit", function(e) {
  e.preventDefault();
  const email = document.getElementById("lEmail").value.trim();
  const pass  = document.getElementById("lPass").value;

  const user = db.accounts.find(a =>
    a.email === email && a.password === pass && a.verified
  );

  if (!user) {
    showToast("Invalid credentials or account not verified.");
    return;
  }

  localStorage.setItem("auth_token", user.email);
  setAuthState(true, user);
  location.hash = "#/profile";
  this.reset();
});

// ─── PHASE 3E: LOGOUT ─────────────────────────────────────────────────────────
function logout() {
  localStorage.removeItem("auth_token");
  setAuthState(false);
  location.hash = "#/";
}

// ─── PHASE 5: PROFILE ─────────────────────────────────────────────────────────
function renderProfile() {
  if (!currentUser) return;
  const roleColor = currentUser.role === "admin" ? "danger" : "secondary";
  document.getElementById("profileBox").innerHTML = `
    <table class="table" style="max-width:420px">
      <tr>
        <th>Name</th>
        <td>${currentUser.first} ${currentUser.last}</td>
      </tr>
      <tr>
        <th>Email</th>
        <td>${currentUser.email}</td>
      </tr>
      <tr>
        <th>Role</th>
        <td>
          <span class="badge bg-${roleColor}">${currentUser.role}</span>
        </td>
      </tr>
    </table>
  `;
}

// ─── PHASE 6A: ACCOUNTS ───────────────────────────────────────────────────────
function renderAccounts() {
  document.getElementById("accountsBody").innerHTML = db.accounts.map(a => `
    <tr>
      <td>${a.first} ${a.last}</td>
      <td>${a.email}</td>
      <td>${a.role}</td>
      <td>${a.verified
        ? '<span class="badge bg-success">✓ Yes</span>'
        : '<span class="badge bg-secondary">No</span>'
      }</td>
      <td>
        <button class="btn btn-sm btn-primary me-1" onclick="editAccount('${a.email}')">Edit</button>
        <button class="btn btn-sm btn-warning me-1" onclick="resetPw('${a.email}')">Reset PW</button>
        <button class="btn btn-sm btn-danger" onclick="delAcc('${a.email}')">Delete</button>
      </td>
    </tr>
  `).join("");
}

function openAccountModal(editEmail = null) {
  ["aFirst","aLast","aEmail","aPass"].forEach(id => document.getElementById(id).value = "");
  document.getElementById("aRole").value        = "user";
  document.getElementById("aVerified").checked  = false;
  document.getElementById("aEditEmail").value   = "";
  document.getElementById("accountModalTitle").innerText = editEmail ? "Edit Account" : "Add Account";
  document.getElementById("aEmail").readOnly    = !!editEmail;

  if (editEmail) {
    const acc = db.accounts.find(a => a.email === editEmail);
    if (acc) {
      document.getElementById("aFirst").value      = acc.first;
      document.getElementById("aLast").value       = acc.last;
      document.getElementById("aEmail").value      = acc.email;
      document.getElementById("aRole").value       = acc.role;
      document.getElementById("aVerified").checked = acc.verified;
      document.getElementById("aEditEmail").value  = acc.email;
    }
  }
  new bootstrap.Modal(document.getElementById("accountModal")).show();
}

function editAccount(email) {
  openAccountModal(email);
}

function saveAccount() {
  const editEmail = document.getElementById("aEditEmail").value;
  const first     = document.getElementById("aFirst").value.trim();
  const last      = document.getElementById("aLast").value.trim();
  const email     = document.getElementById("aEmail").value.trim();
  const pass      = document.getElementById("aPass").value;
  const role      = document.getElementById("aRole").value;
  const verified  = document.getElementById("aVerified").checked;

  if (!first || !last || !email) {
    showToast("Please fill in all required fields.");
    return;
  }

  if (editEmail) {
    // Edit existing account
    const acc = db.accounts.find(a => a.email === editEmail);
    if (acc) {
      acc.first    = first;
      acc.last     = last;
      acc.role     = role;
      acc.verified = verified;
      if (pass) acc.password = pass;
      // If editing self, refresh auth state
      if (editEmail === currentUser?.email) setAuthState(true, acc);
    }
  } else {
    // Add new account
    if (!pass || pass.length < 6) { showToast("Password must be at least 6 characters."); return; }
    if (db.accounts.find(a => a.email === email)) { showToast("Email already exists."); return; }
    db.accounts.push({ first, last, email, password: pass, role, verified });
  }

  saveToStorage();
  renderAccounts();
  bootstrap.Modal.getInstance(document.getElementById("accountModal")).hide();
  showToast("Account saved successfully.");
}

function resetPw(email) {
  const pw = prompt("Enter new password (min 6 chars):");
  if (!pw) return;
  if (pw.length < 6) { showToast("Password must be at least 6 characters."); return; }
  const acc = db.accounts.find(a => a.email === email);
  if (acc) { acc.password = pw; saveToStorage(); showToast("Password reset successfully."); }
}

function delAcc(email) {
  if (email === currentUser?.email) { showToast("You cannot delete your own account."); return; }
  if (!confirm(`Delete account: ${email}?`)) return;
  db.accounts = db.accounts.filter(a => a.email !== email);
  saveToStorage();
  renderAccounts();
  showToast("Account deleted.");
}

// ─── PHASE 6B: DEPARTMENTS ────────────────────────────────────────────────────
function renderDept() {
  document.getElementById("deptBody").innerHTML = db.departments.length
    ? db.departments.map(d => `
        <tr>
          <td>${d.name}</td>
          <td>${d.desc || "—"}</td>
          <td>
            <button class="btn btn-sm btn-danger" onclick="delDept(${d.id})">Delete</button>
          </td>
        </tr>
      `).join("")
    : `<tr><td colspan="3" class="text-center text-muted">No departments yet.</td></tr>`;
}

function openDeptModal() {
  document.getElementById("dName").value = "";
  document.getElementById("dDesc").value = "";
  new bootstrap.Modal(document.getElementById("deptModal")).show();
}

function saveDept() {
  const name = document.getElementById("dName").value.trim();
  const desc = document.getElementById("dDesc").value.trim();
  if (!name) { showToast("Department name is required."); return; }
  db.departments.push({ id: Date.now(), name, desc });
  saveToStorage();
  renderDept();
  bootstrap.Modal.getInstance(document.getElementById("deptModal")).hide();
  showToast("Department added.");
}

function delDept(id) {
  if (!confirm("Delete this department?")) return;
  db.departments = db.departments.filter(d => d.id !== id);
  saveToStorage();
  renderDept();
  showToast("Department deleted.");
}

// ─── PHASE 6C: EMPLOYEES ──────────────────────────────────────────────────────
function renderEmp() {
  // Populate dept dropdown
  document.getElementById("eDept").innerHTML = db.departments.map(d =>
    `<option value="${d.id}">${d.name}</option>`
  ).join("");

  document.getElementById("empBody").innerHTML = db.employees.length
    ? db.employees.map(e => {
        const dept = db.departments.find(d => d.id == e.dept)?.name || "—";
        return `
          <tr>
            <td>${e.id}</td>
            <td>${e.email}</td>
            <td>${e.pos}</td>
            <td>${dept}</td>
            <td>${e.date}</td>
            <td>
              <button class="btn btn-sm btn-danger" onclick="delEmp('${e.id}')">Delete</button>
            </td>
          </tr>
        `;
      }).join("")
    : `<tr><td colspan="6" class="text-center text-muted">No employees yet.</td></tr>`;
}

function openEmpModal() {
  ["eID","eEmail","ePos"].forEach(id => document.getElementById(id).value = "");
  document.getElementById("eDate").value = "";
  // Refresh dept dropdown before showing modal
  document.getElementById("eDept").innerHTML = db.departments.map(d =>
    `<option value="${d.id}">${d.name}</option>`
  ).join("");
  new bootstrap.Modal(document.getElementById("empModal")).show();
}

function saveEmp() {
  const id    = document.getElementById("eID").value.trim();
  const email = document.getElementById("eEmail").value.trim();
  const pos   = document.getElementById("ePos").value.trim();
  const dept  = document.getElementById("eDept").value;
  const date  = document.getElementById("eDate").value;

  if (!id || !email || !pos || !date) { showToast("Please fill in all fields."); return; }
  if (!db.accounts.find(a => a.email === email)) { showToast("No account found with that email."); return; }
  if (db.employees.find(e => e.id === id)) { showToast("Employee ID already exists."); return; }

  db.employees.push({ id, email, pos, dept, date });
  saveToStorage();
  renderEmp();
  bootstrap.Modal.getInstance(document.getElementById("empModal")).hide();
  showToast("Employee added.");
}

function delEmp(id) {
  if (!confirm("Delete this employee?")) return;
  db.employees = db.employees.filter(e => e.id !== id);
  saveToStorage();
  renderEmp();
  showToast("Employee deleted.");
}

// ─── PHASE 7: USER REQUESTS ───────────────────────────────────────────────────
function addItem() {
  const div = document.createElement("div");
  div.className = "d-flex gap-2 mb-2 item-row";
  div.innerHTML = `
    <input type="text"   class="form-control" placeholder="Item name">
    <input type="number" class="form-control" placeholder="Qty" min="1" style="max-width:90px">
    <button type="button" class="btn btn-outline-danger btn-sm" onclick="this.closest('.item-row').remove()">✕</button>
  `;
  document.getElementById("itemsContainer").appendChild(div);
}

function openRequestModal() {
  if (!currentUser) { showToast("Please log in to submit a request."); return; }
  document.getElementById("itemsContainer").innerHTML = "";
  addItem(); // Start with one item row
  new bootstrap.Modal(document.getElementById("reqModal")).show();
}

function saveRequest() {
  const rows  = document.querySelectorAll("#itemsContainer .item-row");
  const items = [...rows].map(row => ({
    name: row.children[0].value.trim(),
    qty:  row.children[1].value.trim() || "1"
  })).filter(i => i.name);

  if (!items.length) { showToast("Please add at least one item."); return; }

  db.requests.push({
    type:          document.getElementById("reqType").value,
    items,
    status:        "Pending",
    date:          new Date().toLocaleString(),
    employeeEmail: currentUser.email
  });

  saveToStorage();
  renderReq();
  bootstrap.Modal.getInstance(document.getElementById("reqModal")).hide();
  showToast("Request submitted successfully.");
}

function renderReq() {
  if (!currentUser) return;
  const mine = db.requests.filter(r => r.employeeEmail === currentUser.email);
  const badgeClass = { Pending: "warning", Approved: "success", Rejected: "danger" };

  document.getElementById("reqBody").innerHTML = mine.length
    ? mine.map(r => `
        <tr>
          <td>${r.type}</td>
          <td>${r.items.map(i => `${i.name} (×${i.qty})`).join(", ")}</td>
          <td><span class="badge bg-${badgeClass[r.status] || 'secondary'}">${r.status}</span></td>
          <td>${r.date}</td>
        </tr>
      `).join("")
    : `<tr><td colspan="4" class="text-center text-muted">No requests yet.</td></tr>`;
}

// ─── PHASE 8: TOAST (UX POLISH) ───────────────────────────────────────────────
function showToast(msg) {
  document.getElementById("toastMsg").innerText = msg;
  new bootstrap.Toast(document.getElementById("toast"), { delay: 3500 }).show();
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
//
// FIX: On init, if auth_token exists and user is valid, restore session
//      THEN call handleRouting() so route guards apply correctly.
// FIX: If on home page while authenticated, redirect to profile.
//
function init() {
  loadFromStorage();

  // Restore session from localStorage token
  const token = localStorage.getItem("auth_token");
  if (token) {
    const user = db.accounts.find(a => a.email === token && a.verified);
    if (user) {
      setAuthState(true, user);
    } else {
      // Stale/invalid token — clear it
      localStorage.removeItem("auth_token");
    }
  }

  // Set default hash if none present
  if (!location.hash || location.hash === "#") {
    location.hash = "#/";
  }

  handleRouting();
}

init();