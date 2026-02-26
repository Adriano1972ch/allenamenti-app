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

const fullNameInput = document.getElementById("full_name"); // optional
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const form = document.getElementById("form");
const tipo = document.getElementById("tipo");
const dataInput = document.getElementById("data");
const ora_inizio = document.getElementById("ora_inizio");
const durata = document.getElementById("durata");
const numero_partecipanti = document.getElementById("numero_partecipanti");
const persone = document.getElementById("persone");
const note = document.getElementById("note");

const prevMonthBtn = document.getElementById("prevMonth");
const nextMonthBtn = document.getElementById("nextMonth");

const exportExcelBtn = document.getElementById("exportExcelBtn");
const exportPdfBtn = document.getElementById("exportPdfBtn");

// Export options (custom range)
const exportOptions = document.getElementById("exportOptions");
const customDatesWrap = document.getElementById("customDates");
const dateFromInput = document.getElementById("dateFrom");
const dateToInput = document.getElementById("dateTo");
const monthPickerWrap = document.getElementById("monthPicker");
const exportMonthInput = document.getElementById("exportMonth");
const applyExportBtn = document.getElementById("applyExport");
const exportRangeRadios = Array.from(document.querySelectorAll('input[name="exportRange"]'));

let lastExportIntent = null; // "excel" | "pdf"

// Views & nav
const viewIds = ["view-dashboard", "view-calendar", "view-list"];
const navButtons = Array.from(document.querySelectorAll(".nav-item"));
const dashGoCalendarBtn = document.getElementById("dashGoCalendarBtn");
const dashGoListBtn = document.getElementById("dashGoListBtn");

// Dashboard fields
const dashSessions = document.getElementById("dashSessions");
const dashHours = document.getElementById("dashHours");
const dashAvgParticipants = document.getElementById("dashAvgParticipants");
const dashPeriod = document.getElementById("dashPeriod");

// Admin filter
const userFilterSelect = document.getElementById("userFilter");
const userFilterWrap = document.getElementById("userFilterWrap");

// List
const listaDiv = document.getElementById("lista");
const listaTitle = document.getElementById("lista-title");

// ================= STATE =================
let currentMonth = new Date();
let allenamentiMese = [];
let giornoSelezionato = null;

let currentUser = null;
let isAdmin = false;

let selectedUserId = "__all__"; // "__all__" = no filter

// ================= UTILS =================
function isoDate(d) { return d.toISOString().split("T")[0]; }
function formatDate(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return `${d}.${m}.${y}`;
}
function monthLabel(dateObj) {
  return dateObj.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
}
function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function showView(id) {
  viewIds.forEach(v => {
    const el = document.getElementById(v);
    if (!el) return;
    el.style.display = (v === id) ? "block" : "none";
  });
  navButtons.forEach(btn => btn.classList.toggle("active", btn.dataset.target === id));
  if (id === "view-list" && giornoSelezionato) caricaAllenamenti(giornoSelezionato);
}

async function getIsAdmin() {
  if (!currentUser) return false;
  const { data, error } = await supabaseClient
    .from("user_roles")
    .select("role")
    .eq("user_id", currentUser.id)
    .maybeSingle();
  if (error) { console.error("Errore lettura ruolo:", error); return false; }
  return data?.role === "admin";
}

async function enrichWithProfiles(rows) {
  const ids = Array.from(new Set((rows || []).map(r => r.user_id).filter(Boolean)));
  if (ids.length === 0) return rows || [];
  const { data: profs, error } = await supabaseClient
    .from("profiles")
    .select("id, full_name")
    .in("id", ids);
  if (error) { console.error("Errore lettura profiles:", error); return rows || []; }
  const map = new Map((profs || []).map(p => [p.id, p.full_name]));
  return (rows || []).map(r => ({ ...r, _full_name: map.get(r.user_id) || null }));
}

// ================= AUTH UI =================
document.getElementById("loginBtn").onclick = async () => {
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: emailInput.value,
    password: passwordInput.value
  });
  if (error) alert(error.message);
  else await checkSession();
};

document.getElementById("registerBtn").onclick = async () => {
  const full_name = fullNameInput ? (fullNameInput.value || "").trim() : "";
  const { error } = await supabaseClient.auth.signUp({
    email: emailInput.value,
    password: passwordInput.value,
    options: { data: { full_name } }
  });
  if (error) alert(error.message);
  else alert("Registrazione completata!");
};

document.getElementById("logoutBtn").onclick = async () => {
  await supabaseClient.auth.signOut();
  currentUser = null; isAdmin = false; selectedUserId = "__all__";
  allenamentiMese = []; giornoSelezionato = null;
  listaDiv.innerHTML = ""; listaTitle.textContent = "Allenamenti";
  if (userFilterSelect) userFilterSelect.value = "__all__";
  if (userFilterWrap) userFilterWrap.style.display = "none";
  authDiv.style.display = "block";
  appDiv.style.display = "none";
};

// ================= NAV =================
navButtons.forEach(btn => btn.addEventListener("click", () => showView(btn.dataset.target)));
dashGoCalendarBtn?.addEventListener("click", () => showView("view-calendar"));
dashGoListBtn?.addEventListener("click", () => showView("view-list"));

// ================= DATA LOAD =================
async function populateUserFilter() {
  if (!userFilterSelect) return;
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("id, full_name")
    .order("full_name", { ascending: true });
  if (error) {
    console.error("Errore caricamento utenti:", error);
    userFilterSelect.innerHTML = `<option value="__all__">Tutti</option>`;
    userFilterSelect.value = "__all__";
    selectedUserId = "__all__";
    return;
  }
  const opts = [];
  opts.push(`<option value="__all__">Tutti</option>`);
  if (currentUser?.id) opts.push(`<option value="${currentUser.id}">Admin</option>`);
  (data || []).forEach(p => opts.push(`<option value="${p.id}">${p.full_name || "(senza nome)"}</option>`));
  userFilterSelect.innerHTML = opts.join("\n");
  userFilterSelect.value = "__all__";
  selectedUserId = "__all__";
  userFilterSelect.onchange = async () => {
    selectedUserId = userFilterSelect.value || "__all__";
    giornoSelezionato = null;
    listaDiv.innerHTML = "";
    listaTitle.textContent = "Allenamenti";
    await caricaAllenamentiMese();
  };
}

async function checkSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) { authDiv.style.display = "block"; appDiv.style.display = "none"; return; }

  currentUser = session.user;
  isAdmin = await getIsAdmin();

  authDiv.style.display = "none";
  appDiv.style.display = "block";

  const display = currentUser.user_metadata?.full_name || currentUser.email || "";
  whoami.textContent = isAdmin ? `👑 ${display} (admin)` : `👤 ${display}`;

  if (userFilterSelect && userFilterWrap) {
    if (isAdmin) { userFilterWrap.style.display = "flex"; await populateUserFilter(); }
    else { userFilterWrap.style.display = "none"; }
  }

  await caricaAllenamentiMese();
  showView("view-dashboard");
}
checkSession();

// ================= INSERT =================
form.onsubmit = async (e) => {
  e.preventDefault();
  const allenamento = {
    tipo: tipo.value,
    data: dataInput.value,
    ora_inizio: ora_inizio.value,
    durata: durata.value || null,
    numero_partecipanti: numero_partecipanti.value || null,
    persone: persone.value || null,
    note: note.value || null
  };
  const { error } = await supabaseClient.from("allenamenti").insert(allenamento);
  if (error) return alert(error.message);
  form.reset();
  await caricaAllenamentiMese();
  if (giornoSelezionato) await caricaAllenamenti(giornoSelezionato);
};

// ================= CALENDAR =================
async function caricaAllenamentiMese() {
  const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

  let query = supabaseClient
    .from("allenamenti")
    .select("*")
    .gte("data", isoDate(start))
    .lte("data", isoDate(end));

  if (isAdmin && selectedUserId !== "__all__") query = query.eq("user_id", selectedUserId);

  const { data, error } = await query;
  if (error) { console.error(error); allenamentiMese = []; renderCalendar(); updateDashboard(); return; }

  allenamentiMese = await enrichWithProfiles(data || []);
  renderCalendar();
  updateDashboard();
}

function renderCalendar() {
  const grid = document.getElementById("calendar-grid");
  const title = document.getElementById("calendarTitle");
  if (!grid || !title) return;

  grid.innerHTML = "";
  title.textContent = monthLabel(currentMonth);

  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay() || 7;
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();

  for (let i = 1; i < firstDay; i++) grid.innerHTML += "<div></div>";

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr =
      `${currentMonth.getFullYear()}-` +
      `${String(currentMonth.getMonth() + 1).padStart(2, "0")}-` +
      `${String(d).padStart(2, "0")}`;

    const dayRows = allenamentiMese.filter(a => a.data === dateStr);
    const hasWorkout = dayRows.length > 0;

    // Color coding by people (based on "persone" free-text)
    const namesText = dayRows.map(r => (r.persone || "")).join(" ").toLowerCase();
    const hasSophie = namesText.includes("sophie");
    const hasVivienne = namesText.includes("vivienne");

    let colorClass = "";
    if (hasSophie && hasVivienne) colorClass = "workout-both";
    else if (hasSophie) colorClass = "workout-sophie";
    else if (hasVivienne) colorClass = "workout-vivienne";

    grid.innerHTML += `
      <div class="calendar-day ${hasWorkout ? "has-workout" : ""} ${colorClass}"
           onclick="selezionaGiorno('${dateStr}')">
        ${d}
      </div>`;
  }
}

window.selezionaGiorno = function (data) {
  giornoSelezionato = data;
  listaTitle.textContent = `Allenamenti del ${formatDate(data)}`;
  showView("view-list");
  caricaAllenamenti(data);
};

prevMonthBtn.onclick = () => { currentMonth.setMonth(currentMonth.getMonth() - 1); caricaAllenamentiMese(); };
nextMonthBtn.onclick = () => { currentMonth.setMonth(currentMonth.getMonth() + 1); caricaAllenamentiMese(); };

// ================= LIST =================
async function caricaAllenamenti(data) {
  let query = supabaseClient
    .from("allenamenti")
    .select("*")
    .eq("data", data)
    .order("ora_inizio");

  if (isAdmin && selectedUserId !== "__all__") query = query.eq("user_id", selectedUserId);

  const { data: rows, error } = await query;
  if (error) { console.error(error); listaDiv.innerHTML = "<p>Errore caricamento</p>"; return; }

  const enriched = await enrichWithProfiles(rows || []);
  listaDiv.innerHTML = "";
  if (!enriched || enriched.length === 0) { listaDiv.innerHTML = "<p>Nessun allenamento</p>"; return; }

  enriched.forEach(a => {
    const who = (a._full_name || "-");
    listaDiv.innerHTML += `
      <div class="table-row">
        <div>📅 <strong>Data:</strong> ${formatDate(a.data)}</div>
        <div>⏰ <strong>Ora:</strong> ${a.ora_inizio}</div>
        <div>🏋️ <strong>Tipo:</strong> ${a.tipo}</div>
        <div>🤝 <strong>Trainer:</strong> ${a.persone || "-"}</div>
        <div>👥 <strong>Partecipanti:</strong> ${a.numero_partecipanti || "-"}</div>
        <div>⏱ <strong>Durata:</strong> ${a.durata ? a.durata + " min" : "-"}</div>
        ${isAdmin ? `<div>👤 <strong>Inserito da:</strong> ${who}</div>` : ""}
        <div>📝 <strong>Note:</strong> ${a.note || "-"}</div>
      </div>
    `;
  });
}

// ================= DASHBOARD =================
function updateDashboard() {
  const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  dashPeriod.textContent = `${formatDate(isoDate(start))} → ${formatDate(isoDate(end))} (${monthLabel(currentMonth)})`;

  const rows = allenamentiMese || [];
  const sessions = rows.length;
  const totalMinutes = rows.reduce((acc, r) => acc + safeNumber(r.durata), 0);
  const hours = totalMinutes / 60;

  const participantsSum = rows.reduce((acc, r) => acc + safeNumber(r.numero_partecipanti), 0);
  const avgParticipants = sessions > 0 ? (participantsSum / sessions) : 0;

  dashSessions.textContent = String(sessions);
  dashHours.textContent = sessions > 0 ? hours.toFixed(1) : "0.0";
  dashAvgParticipants.textContent = sessions > 0 ? avgParticipants.toFixed(1) : "0.0";
}

// ================= EXPORT HELPERS =================
function getSelectedExportMode() {
  const checked = exportRangeRadios.find(r => r.checked);
  return checked?.value || "month";
}

function syncCustomDatesVisibility() {
  const mode = getSelectedExportMode();
  if (customDatesWrap) customDatesWrap.style.display = (mode === "custom") ? "block" : "none";
  if (monthPickerWrap) monthPickerWrap.style.display = (mode === "month") ? "block" : "none";
}

function ensureDefaultCustomDates() {
  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

  if (exportMonthInput && !exportMonthInput.value) {
    exportMonthInput.value = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`;
  }

  if (dateFromInput && dateToInput) {
    if (!dateFromInput.value) dateFromInput.value = isoDate(monthStart);
    if (!dateToInput.value) dateToInput.value = isoDate(monthEnd);
  }
}

function openExportOptions(intent) {
  if (!exportOptions) return false;
  lastExportIntent = intent || null;
  ensureDefaultCustomDates();
  syncCustomDatesVisibility();
  exportOptions.style.display = "block";
  exportOptions.scrollIntoView?.({ behavior: "smooth", block: "start" });
  return true;
}

function closeExportOptions() {
  if (!exportOptions) return;
  exportOptions.style.display = "none";
}

function getExportRange() {
  // If a day is selected from calendar, export that day
  if (giornoSelezionato) return { fromDate: giornoSelezionato, toDate: giornoSelezionato };

  const mode = getSelectedExportMode();

  // Month mode: use the chosen month (fallback: currentMonth)
  if (mode === "month") {
    let y = currentMonth.getFullYear();
    let m = currentMonth.getMonth(); // 0-based

    if (exportMonthInput?.value) {
      const [yy, mm] = exportMonthInput.value.split("-").map(Number);
      if (yy && mm) { y = yy; m = mm - 1; }
    }

    const monthStart = new Date(y, m, 1);
    const monthEnd = new Date(y, m + 1, 0);
    return { fromDate: isoDate(monthStart), toDate: isoDate(monthEnd) };
  }

  // Custom range
  if (mode === "custom" && dateFromInput?.value && dateToInput?.value) {
    return { fromDate: dateFromInput.value, toDate: dateToInput.value };
  }

  // Fallback: current month
  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  return { fromDate: isoDate(monthStart), toDate: isoDate(monthEnd) };
}

async function fetchExportRows() {
  const { fromDate, toDate } = getExportRange();

  let query = supabaseClient
    .from("allenamenti")
    .select("*")
    .gte("data", fromDate)
    .lte("data", toDate)
    .order("data", { ascending: true })
    .order("ora_inizio", { ascending: true });

  if (isAdmin && selectedUserId !== "__all__") query = query.eq("user_id", selectedUserId);

  const { data, error } = await query;
  if (error) throw error;
  return { rows: await enrichWithProfiles(data || []), fromDate, toDate };
}

// Export options interactions
exportRangeRadios.forEach(r => r.addEventListener("change", () => {
  syncCustomDatesVisibility();
  ensureDefaultCustomDates();
}));

applyExportBtn?.addEventListener("click", async () => {
  try {
    if (!giornoSelezionato && getSelectedExportMode() === "custom") {
      const from = dateFromInput?.value;
      const to = dateToInput?.value;
      if (!from || !to) return alert("Seleziona 'Dal' e 'Al'.");
      if (from > to) return alert("La data 'Dal' non può essere dopo 'Al'.");
    }

    closeExportOptions();

    if (lastExportIntent === "excel") await doExportExcel();
    if (lastExportIntent === "pdf") await doExportPdf();
    lastExportIntent = null;
  } catch (e) {
    console.error(e);
    alert("Errore applicazione periodo export");
  }
});

// ================= EXPORT EXCEL =================
async function doExportExcel() {
  try {
    if (typeof XLSX === "undefined") return alert("Libreria XLSX non caricata.");
    const { rows, fromDate, toDate } = await fetchExportRows();
    if (!rows || rows.length === 0) return alert("Nessun dato da esportare");

    const formatted = rows.map((a) => ({
      Data: a.data ? formatDate(a.data) : "",
      Ora: a.ora_inizio || "",
      Tipo: a.tipo || "",
      Durata_min: a.durata ?? "",
      Partecipanti: a.numero_partecipanti ?? "",
      Trainer: a.persone ?? "",
      Inserito_da: isAdmin ? (a._full_name || "-") : "",
      Note: a.note ?? "",
      ID: a.id ?? ""
    }));

    const ws = XLSX.utils.json_to_sheet(formatted);

    const headers = Object.keys(formatted[0] || {});
    ws["!cols"] = headers.map((h) => {
      const maxLen = Math.max(h.length, ...formatted.map((r) => String(r[h] ?? "").length));
      return { wch: Math.min(Math.max(maxLen + 2, 10), 40) };
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, giornoSelezionato ? "Giorno" : "Periodo");

    const safeFrom = fromDate.replaceAll("-", "");
    const safeTo = toDate.replaceAll("-", "");
    const fileName = giornoSelezionato ? `allenamenti_${safeFrom}.xlsx` : `allenamenti_${safeFrom}_${safeTo}.xlsx`;
    XLSX.writeFile(wb, fileName);
  } catch (e) {
    console.error(e);
    alert("Errore export Excel");
  }
}

exportExcelBtn?.addEventListener("click", async () => {
  try {
    const isHidden = exportOptions ? (getComputedStyle(exportOptions).display === "none") : true;
    if (!giornoSelezionato && exportOptions && isHidden) {
      openExportOptions("excel");
      return;
    }
    await doExportExcel();
  } catch (e) {
    console.error(e);
    alert("Errore export Excel");
  }
});

// ================= EXPORT PDF =================
async function doExportPdf() {
  try {
    const { rows, fromDate, toDate } = await fetchExportRows();
    if (!rows || rows.length === 0) return alert("Nessun dato da esportare");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "a4" });

    const title = giornoSelezionato
      ? `Report Allenamenti (${fromDate})`
      : `Report Allenamenti (${monthLabel(currentMonth)})`;
    const subtitle = `Periodo: ${fromDate} → ${toDate}`;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(title, 40, 50);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(subtitle, 40, 70);

    const headers = ["Data", "Ora", "Tipo", "Durata", "Partecipanti", "Trainer", ...(isAdmin ? ["Inserito da"] : [])];
    const colWidths = isAdmin ? [70, 50, 140, 60, 80, 110, 90] : [70, 50, 160, 60, 80, 120];

    let y = 95;
    let x = 40;

    doc.setFont("helvetica", "bold");
    headers.forEach((h, i) => { doc.text(h, x, y); x += colWidths[i]; });
    doc.setDrawColor(200);
    doc.line(40, y + 6, 555, y + 6);

    y += 24;
    doc.setFont("helvetica", "normal");

    const pageBottom = 800;

    rows.forEach((a) => {
      const row = [
        a.data ? formatDate(a.data) : "",
        a.ora_inizio || "",
        a.tipo || "",
        a.durata ? `${a.durata}m` : "-",
        a.numero_partecipanti ?? "-",
        a.persone || "-",
        ...(isAdmin ? [a._full_name || "-"] : [])
      ];

      if (y > pageBottom) { doc.addPage(); y = 60; }

      let xx = 40;
      row.forEach((val, i) => {
        const text = String(val ?? "");
        const maxChars = Math.floor((colWidths[i] || 80) / 6);
        const clipped = text.length > maxChars ? text.slice(0, maxChars - 1) + "…" : text;
        doc.text(clipped, xx, y);
        xx += colWidths[i];
      });
      y += 18;
    });

    const safeFrom = fromDate.replaceAll("-", "");
    const safeTo = toDate.replaceAll("-", "");
    const filename = giornoSelezionato ? `allenamenti_${safeFrom}.pdf` : `allenamenti_${safeFrom}_${safeTo}.pdf`;
    doc.save(filename);
  } catch (e) {
    console.error(e);
    alert("Errore export PDF");
  }
}

exportPdfBtn?.addEventListener("click", async () => {
  try {
    const isHidden = exportOptions ? (getComputedStyle(exportOptions).display === "none") : true;
    if (!giornoSelezionato && exportOptions && isHidden) {
      openExportOptions("pdf");
      return;
    }
    await doExportPdf();
  } catch (e) {
    console.error(e);
    alert("Errore export PDF");
  }
});
