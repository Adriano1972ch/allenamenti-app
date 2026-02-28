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
const oraInput = document.getElementById("ora_inizio");
const durataInput = document.getElementById("durata");
const partecipantiInput = document.getElementById("numero_partecipanti");
const personeInput = document.getElementById("persone");
const noteInput = document.getElementById("note");

const listaDiv = document.getElementById("lista");
const listaTitle = document.getElementById("lista-title");

// Buttons
const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
const logoutBtn = document.getElementById("logoutBtn");

const exportExcelBtn = document.getElementById("exportExcelBtn");
const exportPdfBtn = document.getElementById("exportPdfBtn");

// Export options
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

// Calendar DOM
const calendarGrid = document.getElementById("calendar-grid");
const calendarTitle = document.getElementById("calendarTitle");
const prevMonthBtn = document.getElementById("prevMonth");
const nextMonthBtn = document.getElementById("nextMonth");

// Admin filter
const userFilterWrap = document.getElementById("userFilterWrap");
const userFilter = document.getElementById("userFilter");

// ================= STATE =================
let currentUser = null;
let isAdmin = false;

let allenamenti = [];
let currentMonth = new Date();
let giornoSelezionato = null; // YYYY-MM-DD
let selectedUserId = "__all__"; // for admin

// ================= HELPERS =================
function showAuth() {
  authDiv.style.display = "block";
  appDiv.style.display = "none";
}

function showApp() {
  authDiv.style.display = "none";
  appDiv.style.display = "block";
}

function formatDate(dateStr) {
  // dateStr in YYYY-MM-DD
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function isoDate(d) {
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${y}-${m}-${day}`;
}

function monthLabel(d) {
  // will be patched by i18n block below to use currentLang
  return d.toLocaleDateString(currentLang, { month: "long", year: "numeric" });
}

function setActiveView(viewId) {
  viewIds.forEach((id) => {
    const el = document.getElementById(id);
    el.style.display = id === viewId ? "block" : "none";
  });

  navButtons.forEach((btn) => {
    const target = btn.getAttribute("data-target");
    btn.classList.toggle("active", target === viewId);
  });
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// ================= I18N =================
const SUPPORTED_LANGS = ["it", "de", "en", "sk"];
const FALLBACK_LANG = "en";

const I18N = {
  it: {
    "app.title": "Allenamenti",
    "app.brand": "Allenamenti",
    "auth.title": "Login / Registrazione",
    "auth.fullNamePh": "Nome completo (solo registrazione)",
    "auth.emailPh": "Email",
    "auth.passwordPh": "Password",
    "auth.loginBtn": "Login",
    "auth.registerBtn": "Registrati",
    "auth.logoutBtn": "Logout",
    "admin.viewAs": "Visualizza:",
    "admin.all": "Tutti",
    "nav.dashboard": "Dashboard",
    "nav.calendar": "Calendario",
    "nav.list": "Lista",
    "dash.sessionsMonth": "Sessioni mese",
    "dash.totalHours": "Ore totali",
    "dash.avgParticipants": "Partecipanti medi",
    "dash.period": "Periodo",
    "dash.goCalendar": "Vai al calendario",
    "dash.goList": "Vai alla lista",
    "cal.hint": "Tocca un giorno per visualizzare gli allenamenti.",
    "people.sophie": "Sophie",
    "people.vivienne": "Vivienne",
    "people.both": "Entrambe",
    "list.newWorkout": "Nuovo allenamento",
    "list.workouts": "Allenamenti",
    "list.workoutsOf": "Allenamenti del {date}",
    "form.typePh": "Tipo allenamento",
    "form.date": "Data",
    "form.time": "Ora",
    "form.durationPh": "Durata (min)",
    "form.participantsPh": "Partecipanti",
    "form.withWhomPh": "Trainer / Con chi",
    "form.notesPh": "Note",
    "form.addBtn": "➕ Aggiungi",
    "export.excel": "📊 Esporta Excel",
    "export.pdf": "📄 Esporta PDF",
    "export.title": "Esporta:",
    "export.month": "Mese",
    "export.monthLabel": "Mese:",
    "export.custom": "Periodo personalizzato",
    "export.from": "Dal:",
    "export.to": "Al:",
    "export.apply": "Applica",
    "weekday.mon": "L",
    "weekday.tue": "M",
    "weekday.wed": "M",
    "weekday.thu": "G",
    "weekday.fri": "V",
    "weekday.sat": "S",
    "weekday.sun": "D",
    "alerts.workoutUpdated": "Allenamento aggiornato ✅"
  },
  en: {
    "app.title": "Workouts",
    "app.brand": "Workouts",
    "auth.title": "Login / Register",
    "auth.fullNamePh": "Full name (register only)",
    "auth.emailPh": "Email",
    "auth.passwordPh": "Password",
    "auth.loginBtn": "Login",
    "auth.registerBtn": "Register",
    "auth.logoutBtn": "Logout",
    "admin.viewAs": "View:",
    "admin.all": "All",
    "nav.dashboard": "Dashboard",
    "nav.calendar": "Calendar",
    "nav.list": "List",
    "dash.sessionsMonth": "Sessions this month",
    "dash.totalHours": "Total hours",
    "dash.avgParticipants": "Average participants",
    "dash.period": "Period",
    "dash.goCalendar": "Go to calendar",
    "dash.goList": "Go to list",
    "cal.hint": "Tap a day to view workouts.",
    "people.sophie": "Sophie",
    "people.vivienne": "Vivienne",
    "people.both": "Both",
    "list.newWorkout": "New workout",
    "list.workouts": "Workouts",
    "list.workoutsOf": "Workouts on {date}",
    "form.typePh": "Workout type",
    "form.date": "Date",
    "form.time": "Time",
    "form.durationPh": "Duration (min)",
    "form.participantsPh": "Participants",
    "form.withWhomPh": "Trainer / With whom",
    "form.notesPh": "Notes",
    "form.addBtn": "➕ Add",
    "export.excel": "📊 Export Excel",
    "export.pdf": "📄 Export PDF",
    "export.title": "Export:",
    "export.month": "Month",
    "export.monthLabel": "Month:",
    "export.custom": "Custom period",
    "export.from": "From:",
    "export.to": "To:",
    "export.apply": "Apply",
    "weekday.mon": "M",
    "weekday.tue": "T",
    "weekday.wed": "W",
    "weekday.thu": "T",
    "weekday.fri": "F",
    "weekday.sat": "S",
    "weekday.sun": "S",
    "alerts.workoutUpdated": "Workout updated ✅"
  },
  de: {
    "app.title": "Training",
    "app.brand": "Training",
    "auth.title": "Login / Registrierung",
    "auth.fullNamePh": "Vollständiger Name (nur Registrierung)",
    "auth.emailPh": "E-Mail",
    "auth.passwordPh": "Passwort",
    "auth.loginBtn": "Login",
    "auth.registerBtn": "Registrieren",
    "auth.logoutBtn": "Abmelden",
    "admin.viewAs": "Anzeigen:",
    "admin.all": "Alle",
    "nav.dashboard": "Dashboard",
    "nav.calendar": "Kalender",
    "nav.list": "Liste",
    "dash.sessionsMonth": "Sitzungen im Monat",
    "dash.totalHours": "Gesamtstunden",
    "dash.avgParticipants": "Ø Teilnehmer",
    "dash.period": "Zeitraum",
    "dash.goCalendar": "Zum Kalender",
    "dash.goList": "Zur Liste",
    "cal.hint": "Tippe auf einen Tag, um Trainings zu sehen.",
    "people.sophie": "Sophie",
    "people.vivienne": "Vivienne",
    "people.both": "Beide",
    "list.newWorkout": "Neues Training",
    "list.workouts": "Trainings",
    "list.workoutsOf": "Trainings am {date}",
    "form.typePh": "Trainingstyp",
    "form.date": "Datum",
    "form.time": "Uhrzeit",
    "form.durationPh": "Dauer (Min)",
    "form.participantsPh": "Teilnehmer",
    "form.withWhomPh": "Trainer / Mit wem",
    "form.notesPh": "Notizen",
    "form.addBtn": "➕ Hinzufügen",
    "export.excel": "📊 Excel exportieren",
    "export.pdf": "📄 PDF exportieren",
    "export.title": "Export:",
    "export.month": "Monat",
    "export.monthLabel": "Monat:",
    "export.custom": "Benutzerdefinierter Zeitraum",
    "export.from": "Von:",
    "export.to": "Bis:",
    "export.apply": "Anwenden",
    "weekday.mon": "M",
    "weekday.tue": "D",
    "weekday.wed": "M",
    "weekday.thu": "D",
    "weekday.fri": "F",
    "weekday.sat": "S",
    "weekday.sun": "S",
    "alerts.workoutUpdated": "Training aktualisiert ✅"
  },
  sk: {
    "app.title": "Tréningy",
    "app.brand": "Tréningy",
    "auth.title": "Prihlásenie / Registrácia",
    "auth.fullNamePh": "Celé meno (len registrácia)",
    "auth.emailPh": "Email",
    "auth.passwordPh": "Heslo",
    "auth.loginBtn": "Prihlásiť sa",
    "auth.registerBtn": "Registrovať sa",
    "auth.logoutBtn": "Odhlásiť sa",
    "admin.viewAs": "Zobraziť:",
    "admin.all": "Všetci",
    "nav.dashboard": "Prehľad",
    "nav.calendar": "Kalendár",
    "nav.list": "Zoznam",
    "dash.sessionsMonth": "Tréningy tento mesiac",
    "dash.totalHours": "Celkové hodiny",
    "dash.avgParticipants": "Priemer účastníkov",
    "dash.period": "Obdobie",
    "dash.goCalendar": "Do kalendára",
    "dash.goList": "Do zoznamu",
    "cal.hint": "Ťukni na deň pre zobrazenie tréningov.",
    "people.sophie": "Sophie",
    "people.vivienne": "Vivienne",
    "people.both": "Obe",
    "list.newWorkout": "Nový tréning",
    "list.workouts": "Tréningy",
    "list.workoutsOf": "Tréningy dňa {date}",
    "form.typePh": "Typ tréningu",
    "form.date": "Dátum",
    "form.time": "Čas",
    "form.durationPh": "Trvanie (min)",
    "form.participantsPh": "Účastníci",
    "form.withWhomPh": "Tréner / S kým",
    "form.notesPh": "Poznámky",
    "form.addBtn": "➕ Pridať",
    "export.excel": "📊 Exportovať Excel",
    "export.pdf": "📄 Exportovať PDF",
    "export.title": "Export:",
    "export.month": "Mesiac",
    "export.monthLabel": "Mesiac:",
    "export.custom": "Vlastné obdobie",
    "export.from": "Od:",
    "export.to": "Do:",
    "export.apply": "Použiť",
    "weekday.mon": "P",
    "weekday.tue": "U",
    "weekday.wed": "S",
    "weekday.thu": "Š",
    "weekday.fri": "P",
    "weekday.sat": "S",
    "weekday.sun": "N",
    "alerts.workoutUpdated": "Tréning aktualizovaný ✅"
  }
};

function detectLanguage() {
  const langs = navigator.languages || [navigator.language];
  for (let l of langs) {
    l = (l || "").toLowerCase();
    const base = l.split("-")[0];
    if (SUPPORTED_LANGS.includes(l)) return l;
    if (SUPPORTED_LANGS.includes(base)) return base;
  }
  return FALLBACK_LANG;
}

const currentLang = detectLanguage();
function tr(key, vars = {}) {
  const dict = I18N[currentLang] || I18N[FALLBACK_LANG];
  let s = dict[key] || (I18N[FALLBACK_LANG] && I18N[FALLBACK_LANG][key]) || key;
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

function applyTranslations() {
  document.documentElement.lang = currentLang;

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = tr(key);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (key) el.setAttribute("placeholder", tr(key));
  });

  const titleEl = document.querySelector("title[data-i18n]");
  if (titleEl) document.title = tr(titleEl.getAttribute("data-i18n"));
}

const __nativeAlert = window.alert.bind(window);
window.alert = (msg) => {
  if (msg === "Allenamento aggiornato ✅") return __nativeAlert(tr("alerts.workoutUpdated"));
  return __nativeAlert(msg);
};

document.addEventListener("DOMContentLoaded", applyTranslations);

// ================= AUTH =================
loginBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) return alert(error.message);
  currentUser = data.user;
  await bootstrap();
});

registerBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  const full_name = (fullNameInput.value || "").trim();

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: { full_name }
    }
  });

  if (error) return alert(error.message);
  currentUser = data.user;
  await bootstrap();
});

logoutBtn.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  currentUser = null;
  isAdmin = false;
  selectedUserId = "__all__";
  showAuth();
});

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

async function bootstrap() {
  showApp();

  whoami.textContent = currentUser?.email ? `👤 ${currentUser.email}` : "";

  // determine admin
  // (simple heuristic: admin role stored in profile / user metadata)
  isAdmin = Boolean(currentUser?.user_metadata?.is_admin);

  // admin filter
  if (isAdmin) {
    userFilterWrap.style.display = "flex";
    await loadUsersIntoFilter();
  } else {
    userFilterWrap.style.display = "none";
  }

  // load workouts
  await loadAllenamenti();
  renderCalendar();
  renderList();

  // dashboard
  renderDashboard();

  // view default
  setActiveView("view-dashboard");
}

// ================= USERS (ADMIN FILTER) =================
async function loadUsersIntoFilter() {
  // This assumes you have a "profiles" table.
  // If not, you can remove this block or adapt it.
  try {
    const { data, error } = await supabaseClient
      .from("profiles")
      .select("id, full_name, email")
      .order("full_name", { ascending: true });

    if (error) return;

    userFilter.innerHTML = `<option value="__all__" data-i18n="admin.all">${tr("admin.all")}</option>`;
    data.forEach((u) => {
      const label = u.full_name || u.email || u.id;
      const opt = document.createElement("option");
      opt.value = u.id;
      opt.textContent = label;
      userFilter.appendChild(opt);
    });

    userFilter.addEventListener("change", async () => {
      selectedUserId = userFilter.value;
      await loadAllenamenti();
      renderCalendar();
      renderList();
      renderDashboard();
    });
  } catch (e) {
    // ignore if profiles doesn't exist
  }
}

// ================= NAV =================
navButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.getAttribute("data-target");
    setActiveView(target);

    if (target === "view-calendar") renderCalendar();
    if (target === "view-list") renderList();
    if (target === "view-dashboard") renderDashboard();
  });
});

dashGoCalendarBtn.addEventListener("click", () => setActiveView("view-calendar"));
dashGoListBtn.addEventListener("click", () => setActiveView("view-list"));

// ================= LOAD DATA =================
async function loadAllenamenti() {
  let q = supabaseClient
    .from("allenamenti")
    .select("*")
    .order("data", { ascending: true })
    .order("ora_inizio", { ascending: true });

  if (!isAdmin) {
    q = q.eq("user_id", currentUser.id);
  } else if (selectedUserId !== "__all__") {
    q = q.eq("user_id", selectedUserId);
  }

  const { data, error } = await q;
  if (error) return alert(error.message);

  allenamenti = data || [];
}

// ================= DASHBOARD =================
function renderDashboard() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const fromIso = isoDate(monthStart);
  const toIso = isoDate(monthEnd);

  const rows = allenamenti.filter((a) => a.data >= fromIso && a.data <= toIso);

  const sessions = rows.length;
  const totalMin = rows.reduce((sum, a) => sum + (a.durata || 0), 0);
  const totalHours = totalMin / 60;
  const avgParticipants =
    rows.length > 0
      ? rows.reduce((sum, a) => sum + (a.numero_partecipanti || 0), 0) / rows.length
      : 0;

  dashSessions.textContent = sessions ? String(sessions) : "—";
  dashHours.textContent = sessions ? totalHours.toFixed(1) : "—";
  dashAvgParticipants.textContent = sessions ? avgParticipants.toFixed(1) : "—";
  dashPeriod.textContent = `${formatDate(fromIso)} → ${formatDate(toIso)}`;
}

// ================= CALENDAR =================
prevMonthBtn.addEventListener("click", () => {
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
  giornoSelezionato = null;
  renderCalendar();
});

nextMonthBtn.addEventListener("click", () => {
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
  giornoSelezionato = null;
  renderCalendar();
});

function workoutsByDate() {
  const map = new Map();
  allenamenti.forEach((a) => {
    if (!map.has(a.data)) map.set(a.data, []);
    map.get(a.data).push(a);
  });
  return map;
}

function determineDayClass(workouts) {
  // expects workouts array with maybe property 'persone' including names
  const hasSophie = workouts.some((w) => (w.persone || "").toLowerCase().includes("sophie"));
  const hasVivienne = workouts.some((w) => (w.persone || "").toLowerCase().includes("vivienne"));

  if (hasSophie && hasVivienne) return "workout-both";
  if (hasSophie) return "workout-sophie";
  if (hasVivienne) return "workout-vivienne";
  return "";
}

function renderCalendar() {
  calendarTitle.textContent = monthLabel(currentMonth);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Monday-first calendar
  const start = new Date(firstDay);
  const dow = (start.getDay() + 6) % 7; // 0 monday ... 6 sunday
  start.setDate(start.getDate() - dow);

  const end = new Date(lastDay);
  const dowEnd = (end.getDay() + 6) % 7;
  end.setDate(end.getDate() + (6 - dowEnd));

  const map = workoutsByDate();

  calendarGrid.innerHTML = "";
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayIso = isoDate(d);
    const cell = document.createElement("div");
    cell.className = "calendar-day";

    if (d.getMonth() !== month) {
      cell.style.opacity = "0.35";
    }

    const ws = map.get(dayIso) || [];
    if (ws.length > 0) {
      cell.classList.add("has-workout");
      const cls = determineDayClass(ws);
      if (cls) cell.classList.add(cls);
    }

    cell.textContent = String(d.getDate());

    cell.addEventListener("click", () => {
      giornoSelezionato = dayIso;
      setActiveView("view-list");
      renderList();
    });

    calendarGrid.appendChild(cell);
  }
}

// ================= LIST =================
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    user_id: currentUser.id,
    tipo: tipo.value.trim(),
    data: dataInput.value,
    ora_inizio: oraInput.value,
    durata: durataInput.value ? Number(durataInput.value) : null,
    numero_partecipanti: partecipantiInput.value ? Number(partecipantiInput.value) : null,
    persone: personeInput.value.trim() || null,
    note: noteInput.value.trim() || null
  };

  const { error } = await supabaseClient.from("allenamenti").insert(payload);
  if (error) return alert(error.message);

  form.reset();
  giornoSelezionato = null;
  await loadAllenamenti();
  renderCalendar();
  renderList();
  renderDashboard();
});

function renderList() {
  const filtered = giornoSelezionato
    ? allenamenti.filter((a) => a.data === giornoSelezionato)
    : allenamenti;

  if (giornoSelezionato) {
    listaTitle.textContent = tr("list.workoutsOf", { date: formatDate(giornoSelezionato) });
  } else {
    listaTitle.textContent = tr("list.workouts");
  }

  listaDiv.innerHTML = "";

  filtered.forEach((a) => {
    const row = document.createElement("div");
    row.className = "table-row";

    const meta = [];
    meta.push(`<div><strong>${escapeHtml(formatDate(a.data))}</strong> — ${escapeHtml(a.ora_inizio || "")}</div>`);
    meta.push(`<div><strong>${escapeHtml(a.tipo || "")}</strong></div>`);
    meta.push(`<div>Durata: ${a.durata ? escapeHtml(a.durata) + "m" : "-"}</div>`);
    meta.push(`<div>Partecipanti: ${a.numero_partecipanti ?? "-"}</div>`);
    meta.push(`<div>Trainer / Con chi: ${escapeHtml(a.persone || "-")}</div>`);
    if (a.note) meta.push(`<div>Note: ${escapeHtml(a.note)}</div>`);
    if (isAdmin && a.user_id) meta.push(`<div><em>Inserito da:</em> ${escapeHtml(a.user_id)}</div>`);

    row.innerHTML = meta.join("");

    const actions = document.createElement("div");
    actions.className = "actions";

    const delBtn = document.createElement("button");
    delBtn.className = "btn-secondary";
    delBtn.textContent = "Elimina";
    delBtn.addEventListener("click", async () => {
      const ok = confirm("Eliminare questo allenamento?");
      if (!ok) return;

      const { error } = await supabaseClient.from("allenamenti").delete().eq("id", a.id);
      if (error) return alert(error.message);

      await loadAllenamenti();
      renderCalendar();
      renderList();
      renderDashboard();
    });

    const editBtn = document.createElement("button");
    editBtn.textContent = "Modifica";
    editBtn.addEventListener("click", () => openEditPrompt(a));

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    row.appendChild(actions);
    listaDiv.appendChild(row);
  });
}

function openEditPrompt(a) {
  const newTipo = prompt("Tipo allenamento:", a.tipo || "");
  if (newTipo === null) return;

  const newDurata = prompt("Durata (min):", a.durata ?? "");
  if (newDurata === null) return;

  const newPartecipanti = prompt("Partecipanti:", a.numero_partecipanti ?? "");
  if (newPartecipanti === null) return;

  const newPersone = prompt("Trainer / Con chi:", a.persone ?? "");
  if (newPersone === null) return;

  const newNote = prompt("Note:", a.note ?? "");
  if (newNote === null) return;

  updateAllenamento(a.id, {
    tipo: newTipo.trim(),
    durata: newDurata ? Number(newDurata) : null,
    numero_partecipanti: newPartecipanti ? Number(newPartecipanti) : null,
    persone: newPersone.trim() || null,
    note: newNote.trim() || null
  });
}

async function updateAllenamento(id, fields) {
  const { error } = await supabaseClient.from("allenamenti").update(fields).eq("id", id);
  if (error) return alert(error.message);

  alert("Allenamento aggiornato ✅");
  await loadAllenamenti();
  renderCalendar();
  renderList();
  renderDashboard();
}

// ================= EXPORT UI =================
function openExportOptions(intent) {
  lastExportIntent = intent;
  exportOptions.style.display = "block";
}

exportExcelBtn.addEventListener("click", () => openExportOptions("excel"));
exportPdfBtn.addEventListener("click", () => openExportOptions("pdf"));

exportRangeRadios.forEach((r) => {
  r.addEventListener("change", () => {
    const v = exportRangeRadios.find(x => x.checked)?.value;
    if (v === "custom") {
      customDatesWrap.style.display = "block";
      monthPickerWrap.style.display = "none";
    } else {
      customDatesWrap.style.display = "none";
      monthPickerWrap.style.display = "block";
    }
  });
});

applyExportBtn.addEventListener("click", async () => {
  const v = exportRangeRadios.find(x => x.checked)?.value || "month";

  // Month range
  let fromDate = null;
  let toDate = null;

  if (v === "custom") {
    fromDate = dateFromInput.value;
    toDate = dateToInput.value;
    if (!fromDate || !toDate) return alert("Seleziona un periodo valido");
  } else {
    // month input value YYYY-MM
    const m = exportMonthInput.value;
    if (!m) return alert("Seleziona un mese");
    const [y, mm] = m.split("-");
    fromDate = `${y}-${mm}-01`;
    const last = new Date(Number(y), Number(mm), 0);
    toDate = isoDate(last);
  }

  exportOptions.style.display = "none";

  if (lastExportIntent === "excel") return doExportExcel(fromDate, toDate);
  if (lastExportIntent === "pdf") return doExportPdf(fromDate, toDate);
});

// ================= EXPORT DATA FETCH =================
async function fetchExportRows(fromDateOverride = null, toDateOverride = null) {
  // Determine date range
  let fromDate = fromDateOverride;
  let toDate = toDateOverride;

  if (!fromDate || !toDate) {
    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    const from = new Date(y, m, 1);
    const to = new Date(y, m + 1, 0);
    fromDate = isoDate(from);
    toDate = isoDate(to);
  }

  let rows = allenamenti.filter((a) => a.data >= fromDate && a.data <= toDate);

  // if day selected, narrow to that day
  if (giornoSelezionato) {
    rows = allenamenti.filter((a) => a.data === giornoSelezionato);
    fromDate = giornoSelezionato;
    toDate = giornoSelezionato;
  }

  return { rows, fromDate, toDate };
}

// ================= EXPORT EXCEL =================
async function doExportExcel(fromDateOverride = null, toDateOverride = null) {
  try {
    const { rows, fromDate, toDate } = await fetchExportRows(fromDateOverride, toDateOverride);
    if (!rows || rows.length === 0) return alert("Nessun dato da esportare");

    const headers = ["Data", "Ora", "Tipo", "Durata", "Partecipanti", "Trainer", ...(isAdmin ? ["Inserito da"] : [])];

    const data = rows.map((a) => [
      a.data ? formatDate(a.data) : "",
      a.ora_inizio || "",
      a.tipo || "",
      a.durata ? `${a.durata}m` : "-",
      a.numero_partecipanti ?? "-",
      a.persone || "",
      ...(isAdmin ? [a.user_id || ""] : [])
    ]);

    const sheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Allenamenti");

    const filename = `allenamenti_${fromDate}_${toDate}.xlsx`;
    XLSX.writeFile(book, filename);
  } catch (e) {
    alert(String(e));
  }
}

// ================= EXPORT PDF (LANDSCAPE) =================
async function doExportPdf(fromDateOverride = null, toDateOverride = null) {
  try {
    const { rows, fromDate, toDate } = await fetchExportRows(fromDateOverride, toDateOverride);
    if (!rows || rows.length === 0) return alert("Nessun dato da esportare");

    const { jsPDF } = window.jspdf;

    // ✅ ORIZZONTALE A4
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

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

    // In landscape hai più spazio: mantengo larghezze decenti
    const colWidths = isAdmin
      ? [80, 60, 220, 70, 90, 160, 110]
      : [80, 60, 250, 70, 90, 170];

    let y = 95;
    let x = 40;

    doc.setFont("helvetica", "bold");
    headers.forEach((h, i) => { doc.text(h, x, y); x += colWidths[i]; });

    doc.setDrawColor(200);
    doc.line(40, y + 6, pageWidth - 40, y + 6);

    y += 24;
    doc.setFont("helvetica", "normal");

    const pageBottom = pageHeight - 40;

    rows.forEach((a) => {
      const row = [
        a.data ? formatDate(a.data) : "",
        a.ora_inizio || "",
        a.tipo || "",
        a.durata ? `${a.durata}m` : "-",
        a.numero_partecipanti ?? "-",
        a.persone || "",
        ...(isAdmin ? [a.user_id || ""] : [])
      ];

      if (y > pageBottom) {
        doc.addPage();
        y = 60;

        // ripeti header
        let xx = 40;
        doc.setFont("helvetica", "bold");
        headers.forEach((h, i) => { doc.text(h, xx, y); xx += colWidths[i]; });
        doc.setFont("helvetica", "normal");
        doc.setDrawColor(200);
        doc.line(40, y + 6, pageWidth - 40, y + 6);
        y += 24;
      }

      let xx = 40;
      row.forEach((val, i) => {
        doc.text(String(val), xx, y);
        xx += colWidths[i];
      });

      y += 18;
    });

    const filename = `allenamenti_${fromDate}_${toDate}.pdf`;
    doc.save(filename);
  } catch (e) {
    alert(String(e));
  }
}
