// =======================
// SUPABASE CONFIG
// =======================
const SUPABASE_URL = "https://sebcxlpyqehsbgyalzmz.supabase.co";
const SUPABASE_KEY = "sb_publishable_8BwK3_2OGff5uaDRrdCfHQ_rNhUWCzE";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ================= DOM =================
const authDiv = document.getElementById("auth");
const appDiv = document.getElementById("app");
const whoami = document.getElementById("whoami");

const fullNameInput = document.getElementById("full_name");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const form = document.getElementById("form");
const tipo = document.getElementById("tipo");
const dataInput = document.getElementById("data");
const oraInput = document.getElementById("ora_inizio");
const durataInput = document.getElementById("durata");
const partecipantiInput = document.getElementById("numero_partecipanti");
const personeInput = document.getElementById("persone");
const noteInput = document.getElementById("note");

const listaDiv = document.getElementById("lista");
const listaTitle = document.getElementById("lista-title");

const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
const logoutBtn = document.getElementById("logoutBtn");

const exportExcelBtn = document.getElementById("exportExcelBtn");
const exportPdfBtn = document.getElementById("exportPdfBtn");

const userFilterWrap = document.getElementById("userFilterWrap");
const userFilter = document.getElementById("userFilter");

const calendarGrid = document.getElementById("calendar-grid");
const calendarTitle = document.getElementById("calendarTitle");
const prevMonthBtn = document.getElementById("prevMonth");
const nextMonthBtn = document.getElementById("nextMonth");

let currentUser = null;
let allenamenti = [];
let currentMonth = new Date();
let selectedUserId = "__all__";

// 🔥 METTI QUI LA TUA EMAIL ADMIN
const ADMIN_EMAILS = ["tua_email_admin@email.com"];
let isAdmin = false;

// ================= INIT =================
(async function init() {
  const { data } = await supabaseClient.auth.getUser();
  currentUser = data.user || null;

  if (currentUser) {
    await bootstrap();
  } else {
    showAuth();
  }
})();

function showAuth() {
  authDiv.style.display = "block";
  appDiv.style.display = "none";
}

function showApp() {
  authDiv.style.display = "none";
  appDiv.style.display = "block";
}

async function bootstrap() {
  showApp();

  whoami.textContent = currentUser.email;
  isAdmin = ADMIN_EMAILS.includes(currentUser.email);

  if (isAdmin) {
    userFilterWrap.style.display = "flex";
    await loadUsersIntoFilter();
  } else {
    userFilterWrap.style.display = "none";
  }

  await loadAllenamenti();
  renderCalendar();
  renderList();
}

// ================= LOAD USERS (ADMIN) =================
async function loadUsersIntoFilter() {
  const { data } = await supabaseClient
    .from("profiles")
    .select("id, full_name, email");

  userFilter.innerHTML = `<option value="__all__">Tutti</option>`;

  data.forEach(u => {
    const opt = document.createElement("option");
    opt.value = u.id;
    opt.textContent = u.full_name || u.email;
    userFilter.appendChild(opt);
  });

  userFilter.addEventListener("change", async () => {
    selectedUserId = userFilter.value;
    await loadAllenamenti();
    renderCalendar();
    renderList();
  });
}

// ================= LOAD ALLENAMENTI =================
async function loadAllenamenti() {

  let query = supabaseClient
    .from("allenamenti")
    .select("*")
    .order("data", { ascending: true })
    .order("ora_inizio", { ascending: true });

  // 👤 Utente normale
  if (!isAdmin) {
    query = query.eq("user_id", currentUser.id);
  }

  // 👑 Admin filtro singolo
  if (isAdmin && selectedUserId !== "__all__") {
    query = query.eq("user_id", selectedUserId);
  }

  const { data, error } = await query;

  if (error) {
    alert(error.message);
    return;
  }

  allenamenti = data || [];
}

// ================= CALENDAR =================
prevMonthBtn.onclick = () => {
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
  renderCalendar();
};

nextMonthBtn.onclick = () => {
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
  renderCalendar();
};

function renderCalendar() {
  calendarTitle.textContent = currentMonth.toLocaleDateString("it-IT", {
    month: "long",
    year: "numeric"
  });

  calendarGrid.innerHTML = "";

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const start = new Date(firstDay);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));

  const end = new Date(lastDay);
  end.setDate(end.getDate() + (6 - ((end.getDay() + 6) % 7)));

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const iso = d.toISOString().split("T")[0];
    const cell = document.createElement("div");
    cell.className = "calendar-day";
    cell.textContent = d.getDate();

    const workouts = allenamenti.filter(a => a.data === iso);

    if (workouts.length > 0) {
      cell.classList.add("has-workout");

      const hasSophie = workouts.some(w => (w.persone || "").toLowerCase().includes("sophie"));
      const hasVivienne = workouts.some(w => (w.persone || "").toLowerCase().includes("vivienne"));

      if (hasSophie && hasVivienne) cell.classList.add("workout-both");
      else if (hasSophie) cell.classList.add("workout-sophie");
      else if (hasVivienne) cell.classList.add("workout-vivienne");
    }

    calendarGrid.appendChild(cell);
  }
}

// ================= LIST =================
function renderList() {
  listaDiv.innerHTML = "";

  allenamenti.forEach(a => {
    const row = document.createElement("div");
    row.className = "table-row";
    row.innerHTML = `
      <div><strong>${a.data}</strong> - ${a.ora_inizio}</div>
      <div>${a.tipo}</div>
      <div>Durata: ${a.durata || "-"}</div>
      <div>Partecipanti: ${a.numero_partecipanti || "-"}</div>
      <div>${a.persone || ""}</div>
      <div>${a.note || ""}</div>
    `;
    listaDiv.appendChild(row);
  });
}

// ================= PDF LANDSCAPE =================
exportPdfBtn.addEventListener("click", async () => {

  if (!allenamenti.length) return alert("Nessun dato");

  const { jsPDF } = window.jspdf;

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4"
  });

  let y = 20;
  doc.setFontSize(16);
  doc.text("Report Allenamenti", 140, 15, { align: "center" });

  doc.setFontSize(10);

  allenamenti.forEach(a => {
    doc.text(
      `${a.data}  ${a.ora_inizio}  ${a.tipo}  ${a.durata || "-"}  ${a.numero_partecipanti || "-"}`,
      10,
      y
    );
    y += 8;
  });

  doc.save("allenamenti.pdf");
});
// ================= AUTH =================
loginBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) return alert(error.message);

  currentUser = data.user;
  await bootstrap();
});

registerBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password
  });

  if (error) return alert(error.message);

  alert("Registrazione completata. Controlla email se richiesta.");
});

logoutBtn.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  currentUser = null;
  showAuth();
});
