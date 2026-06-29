const roles = ["RN", "LPN", "CNA", "MA", "PCT", "Phlebotomist", "RadTech", "EMT"];
const facilityTypes = ["hospital", "urgent_care", "long_term_care", "clinic", "surgery_center"];
const state = {
  user: JSON.parse(localStorage.getItem("ps_user") || "null"),
  screen: localStorage.getItem("ps_user") ? "home" : "onboarding",
  tab: "shifts",
  selectedShift: null,
  shifts: JSON.parse(localStorage.getItem("ps_shifts") || "null") || seedShifts()
};

function seedShifts() {
  const now = Date.now();
  return [
    makeShift("Northline Medical Center", "410 Cedar Ave", "RN", now + 4 * 3600000, 12, 68, 3.1, true),
    makeShift("Harbor Urgent Care", "220 Lake St", "CNA", now + 28 * 3600000, 8, 31, 7.8, false),
    makeShift("Westgate Long Term Care", "88 Westgate Dr", "LPN", now + 18 * 3600000, 10, 46, 11.2, false),
    makeShift("Pulse Clinic South", "14 Market Rd", "MA", now + 6.5 * 3600000, 8, 29, 5.4, false),
    makeShift("Riverbend Imaging", "900 River Pkwy", "RadTech", now + 3 * 3600000, 8, 55, 9.7, true)
  ];
}

function makeShift(facilityName, facilityAddress, role, start, hours, hourlyRate, distance, urgent) {
  return {
    shiftId: crypto.randomUUID(),
    facilityId: "demo-facility",
    facilityName,
    facilityAddress,
    role,
    startTime: start,
    endTime: start + hours * 3600000,
    hourlyRate,
    totalPayout: hourlyRate * hours,
    status: "open",
    isUrgent: urgent,
    claimedBy: null,
    distance,
    createdAt: Date.now(),
    notes: "Bring current credentials and arrive 15 minutes early for unit handoff."
  };
}

function save() {
  localStorage.setItem("ps_shifts", JSON.stringify(state.shifts));
  if (state.user) localStorage.setItem("ps_user", JSON.stringify(state.user));
  else localStorage.removeItem("ps_user");
}

function money(value) { return `$${Number(value || 0).toFixed(2)}`; }
function dt(value) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}
function hours(shift) { return Math.max((shift.endTime - shift.startTime) / 3600000, 0); }

function shell(content, tabs = "") {
  document.getElementById("app").innerHTML = `<main class="shell">${content}${tabs}</main>`;
}

function tabs() {
  const workerTabs = [["shifts", "Shifts"], ["my", "My Shifts"], ["profile", "Profile"]];
  const facilityTabs = [["post", "Post Shift"], ["facilityShifts", "My Shifts"], ["account", "Account"]];
  const items = state.user?.type === "facility" ? facilityTabs : workerTabs;
  return `<nav class="tabs">${items.map(([id, label]) => `<button class="tab ${state.tab === id ? "active" : ""}" data-tab="${id}">${label}</button>`).join("")}</nav>`;
}

function render() {
  if (state.screen === "onboarding") return renderOnboarding();
  if (state.screen === "role") return renderRole();
  if (state.screen === "workerRegister") return renderWorkerRegister();
  if (state.screen === "facilityRegister") return renderFacilityRegister();
  if (state.screen === "login") return renderLogin();
  if (state.screen === "detail") return renderDetail();
  if (!state.user) return renderOnboarding();
  if (state.user.type === "facility") return renderFacility();
  return renderWorker();
}

function renderOnboarding() {
  shell(`<section class="screen center">
    <div class="brand-mark">PS</div>
    <div class="stack" style="text-align:center">
      <p class="eyebrow">Healthcare shifts</p>
      <h1>PulseShift</h1>
      <p class="muted">A fast shift marketplace for healthcare professionals and facilities.</p>
    </div>
    <button class="btn full" data-screen="role">Get Started</button>
    <button class="btn ghost full" data-screen="login">I already have an account</button>
  </section>`);
}

function renderRole() {
  shell(`<section class="screen center">
    <div class="stack">
      <p class="eyebrow">Get started</p>
      <h2>Choose your lane</h2>
      <p class="muted">Create a demo worker or facility profile. Firebase can be connected after the UI is stable.</p>
    </div>
    <button class="btn full" data-screen="workerRegister">I am a Healthcare Pro</button>
    <button class="btn secondary full" data-screen="facilityRegister">I am a Facility</button>
    <button class="btn ghost full" data-screen="login">Sign in instead</button>
  </section>`);
}

function input(name, label, type = "text", value = "") {
  return `<label class="field"><span>${label}</span><input name="${name}" type="${type}" value="${value}" /></label>`;
}
function select(name, label, values) {
  return `<label class="field"><span>${label}</span><select name="${name}">${values.map(v => `<option value="${v}">${v.replaceAll("_", " ")}</option>`).join("")}</select></label>`;
}

function renderWorkerRegister() {
  shell(`<form class="screen stack" data-form="worker">
    <h2>Healthcare Pro</h2>
    <p class="eyebrow">Worker profile</p>
    <p class="muted">Set up your worker profile.</p>
    ${input("name", "Full name", "text", "Jordan Lee")}
    ${input("email", "Email", "email", "jordan@example.com")}
    ${input("password", "Password", "password", "password")}
    ${select("role", "Role", roles)}
    ${input("licenseNumber", "License number", "text", "RN-482910")}
    ${input("licenseState", "License state", "text", "IL")}
    <div class="grid-2">${input("hourlyRate", "Rate", "number", "62")}${input("yearsExperience", "Years", "number", "6")}</div>
    <button class="btn full">Create Worker Account</button>
  </form>`);
}

function renderFacilityRegister() {
  shell(`<form class="screen stack" data-form="facility">
    <h2>Facility</h2>
    <p class="eyebrow">Facility profile</p>
    <p class="muted">Set up your organization.</p>
    ${input("name", "Organization name", "text", "Northline Medical")}
    ${input("email", "Email", "email", "ops@example.com")}
    ${input("password", "Password", "password", "password")}
    ${input("phone", "Phone", "tel", "555-0100")}
    ${input("address", "Address", "text", "410 Cedar Ave")}
    ${select("facilityType", "Facility type", facilityTypes)}
    <button class="btn full">Create Facility Account</button>
  </form>`);
}

function renderLogin() {
  shell(`<form class="screen center" data-form="login">
    <div class="stack">
      <h2>Welcome back</h2>
      <p class="eyebrow">Sign in</p>
      <p class="muted">Demo login restores the last local profile or creates an RN profile.</p>
    </div>
    ${input("email", "Email", "email", "demo@example.com")}
    ${input("password", "Password", "password", "password")}
    <button class="btn full">Sign In</button>
    <button type="button" class="btn ghost full" data-screen="role">Create an account</button>
  </form>`);
}

function renderWorker() {
  if (state.tab === "my") return renderMyShifts();
  if (state.tab === "profile") return renderProfile();
  const shifts = state.shifts
    .filter(s => s.status === "open" && s.role === state.user.role)
    .sort((a, b) => a.distance - b.distance);
  shell(`<section class="screen stack">
    <div class="row"><div><p class="eyebrow">Shifts near you</p><h2>Open Shifts</h2><p class="muted">Filtered for ${state.user.role}, sorted by distance.</p></div><span class="chip">${state.user.role}</span></div>
    ${shifts.length ? shifts.map(shiftCard).join("") : `<div class="card"><h3>No matching shifts</h3><p class="muted">Try another demo role or post a matching facility shift.</p></div>`}
  </section>`, tabs());
}

function shiftCard(shift) {
  return `<article class="card" data-shift="${shift.shiftId}">
    <div class="row"><div><h3>${shift.facilityName}</h3><p class="muted">${dt(shift.startTime)} - ${dt(shift.endTime)}</p></div>${shift.isUrgent ? `<span class="chip danger">Urgent</span>` : ""}</div>
    <div class="row"><span class="chip">${shift.role}</span><strong class="rate">$${shift.hourlyRate}/hr</strong><span class="muted">${shift.distance?.toFixed?.(1) || "0.0"} mi</span></div>
  </article>`;
}

function renderDetail() {
  const shift = state.selectedShift;
  shell(`<section class="screen stack">
    <button class="btn secondary" data-back="home">Back</button>
    <div class="card">
      <div class="row"><div><h2>${shift.facilityName}</h2><p class="muted">${shift.facilityAddress}</p></div>${shift.isUrgent ? `<span class="chip danger">Urgent</span>` : ""}</div>
      <div class="summary">
        <div class="stat"><span class="muted">Role</span><strong>${shift.role}</strong></div>
        <div class="stat"><span class="muted">Pay</span><strong>$${shift.hourlyRate}/hr</strong></div>
        <div class="stat"><span class="muted">Duration</span><strong>${hours(shift).toFixed(1)} hrs</strong></div>
        <div class="stat"><span class="muted">Payout</span><strong>${money(shift.totalPayout)}</strong></div>
      </div>
      <p class="muted">${shift.notes}</p>
      <button class="btn full" data-claim="${shift.shiftId}">Claim Shift</button>
    </div>
  </section>`);
}

function renderMyShifts() {
  const mine = state.shifts.filter(s => s.claimedBy === state.user.uid);
  const completed = mine.filter(s => s.status === "completed");
  const total = completed.reduce((sum, s) => sum + s.totalPayout, 0);
  shell(`<section class="screen stack">
    <p class="eyebrow">Earnings</p><h2>My Shifts</h2>
    <div class="summary"><div class="stat"><span class="muted">This week</span><strong>${money(total)}</strong></div><div class="stat"><span class="muted">All time</span><strong>${money(total)}</strong></div></div>
    ${mine.length ? mine.map(shiftCard).join("") : `<div class="card"><h3>No claimed shifts</h3><p class="muted">Claim one from the shift feed.</p></div>`}
  </section>`, tabs());
}

function renderProfile() {
  shell(`<section class="screen stack">
    <p class="eyebrow">Credentials</p><h2>Profile</h2>
    <div class="notice">Demo mode is active. Add Firebase config later to persist real accounts.</div>
    <div class="card"><h3>${state.user.name}</h3><p class="muted">${state.user.role} - ${state.user.yearsExperience || 0} yrs experience</p><p class="muted">${state.user.email}</p></div>
    <div class="card"><h3>Credential status</h3><div class="row"><span class="muted">License</span><span class="chip warn">pending</span></div><div class="row"><span class="muted">Background</span><span class="chip">not started</span></div><div class="row"><span class="muted">Immunizations</span><span class="chip warn">pending</span></div></div>
    <button class="btn secondary full" data-logout="1">Sign Out</button>
  </section>`, tabs());
}

function renderFacility() {
  if (state.tab === "facilityShifts") return renderFacilityShifts();
  if (state.tab === "account") return renderAccount();
  shell(`<form class="screen stack" data-form="postShift">
    <p class="eyebrow">Facility tools</p><h2>Post Shift</h2>
    ${select("role", "Role needed", roles)}
    ${input("date", "Date", "date")}
    <div class="grid-2">${input("start", "Start", "time", "07:00")}${input("end", "End", "time", "19:00")}</div>
    ${input("hourlyRate", "Hourly rate", "number", "58")}
    <label class="field"><span>Notes</span><textarea name="notes">Unit coverage needed. Credentials required at check-in.</textarea></label>
    <button class="btn full">Post Shift</button>
  </form>`, tabs());
}

function renderFacilityShifts() {
  const posted = state.shifts.filter(s => s.facilityId === state.user.uid || s.facilityId === "demo-facility");
  shell(`<section class="screen stack"><p class="eyebrow">Schedule</p><h2>Posted Shifts</h2>${posted.map(s => `<article class="card"><div class="row"><h3>${s.role}</h3><span class="chip ${s.status === "claimed" ? "warn" : ""}">${s.status}</span></div><p class="muted">${dt(s.startTime)} - ${money(s.totalPayout)}</p><p class="muted">Claimed by: ${s.claimedBy || "Unclaimed"}</p></article>`).join("")}</section>`, tabs());
}

function renderAccount() {
  shell(`<section class="screen stack"><p class="eyebrow">Settings</p><h2>Account</h2><div class="card"><h3>${state.user.name}</h3><p class="muted">${state.user.facilityType?.replaceAll("_", " ")}</p><p class="muted">${state.user.address}</p></div><div class="card"><h3>Billing</h3><p class="muted">Stripe account: Not connected</p></div><button class="btn secondary full" data-logout="1">Sign Out</button></section>`, tabs());
}

document.addEventListener("click", (event) => {
  const screen = event.target.closest("[data-screen]")?.dataset.screen;
  if (screen) { state.screen = screen; render(); return; }
  const tab = event.target.closest("[data-tab]")?.dataset.tab;
  if (tab) { state.tab = tab; state.screen = "home"; render(); return; }
  const shiftId = event.target.closest("[data-shift]")?.dataset.shift;
  if (shiftId) { state.selectedShift = state.shifts.find(s => s.shiftId === shiftId); state.screen = "detail"; render(); return; }
  const claimId = event.target.closest("[data-claim]")?.dataset.claim;
  if (claimId) {
    state.shifts = state.shifts.map(s => s.shiftId === claimId ? { ...s, status: "claimed", claimedBy: state.user.uid } : s);
    save(); state.tab = "my"; state.screen = "home"; render(); return;
  }
  if (event.target.closest("[data-back]")) { state.screen = "home"; render(); return; }
  if (event.target.closest("[data-logout]")) { state.user = null; save(); state.screen = "onboarding"; render(); }
});

document.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.target;
  const data = Object.fromEntries(new FormData(form).entries());
  if (form.dataset.form === "worker") {
    state.user = { ...data, uid: crypto.randomUUID(), type: "worker" };
    state.screen = "home"; state.tab = "shifts"; save(); render();
  }
  if (form.dataset.form === "facility") {
    state.user = { ...data, uid: crypto.randomUUID(), type: "facility" };
    state.screen = "home"; state.tab = "post"; save(); render();
  }
  if (form.dataset.form === "login") {
    state.user = state.user || { uid: crypto.randomUUID(), type: "worker", name: "Demo Clinician", email: data.email, role: "RN", yearsExperience: 5 };
    state.screen = "home"; state.tab = "shifts"; save(); render();
  }
  if (form.dataset.form === "postShift") {
    const start = new Date(`${data.date}T${data.start || "07:00"}`).getTime();
    const end = new Date(`${data.date}T${data.end || "19:00"}`).getTime();
    const hourlyRate = Number(data.hourlyRate || 0);
    state.shifts.unshift({
      shiftId: crypto.randomUUID(),
      facilityId: state.user.uid,
      facilityName: state.user.name,
      facilityAddress: state.user.address,
      role: data.role,
      startTime: start,
      endTime: end,
      hourlyRate,
      totalPayout: hourlyRate * Math.max((end - start) / 3600000, 0),
      status: "open",
      isUrgent: start - Date.now() <= 6 * 3600000,
      claimedBy: null,
      distance: 0,
      notes: data.notes
    });
    state.tab = "facilityShifts"; save(); render();
  }
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

render();
