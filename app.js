// =======================
// SUPABASE CONFIG
// =======================
const SUPABASE_URL = "https://sebcxlpyqehsbgyalzmz.supabase.co";
const SUPABASE_KEY = "sb_publishable_8BwK3_2OGff5uaDRrdCfHQ_rNhUWCzE";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ================= DOM =================
const authDiv = document.getElementById("auth");
const appDiv = document.getElementById("app");
const listaDiv = document.getElementById("lista");
const listaTitle = document.getElementById("lista-title");
const adminFiltersDiv = document.getElementById("adminFilters");
const userFilterSelect = document.getElementById("userFilter");

let isAdminUser = false;
let selectedUserId = null;

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

// ================= UTILS =================
function formatDate(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return `${d}.${m}.${y}`;
}

// ================= AUTH =================
document.getElementById("loginBtn").onclick = async () => {
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: emailInput.value,
    password: passwordInput.value
  });
  if (error) alert(error.message);
  else checkSession();
};

document.getElementById("registerBtn").onclick = async () => {
  const { error } = await supabaseClient.auth.signUp({
    email: emailInput.value,
    password: passwordInput.value
  });
  if (error) alert(error.message);
  else alert("Registrazione completata");
};

document.getElementById("logoutBtn").onclick = async () => {
  await supabaseClient.auth.signOut();

  // ✅ pulizia UI/dati
  allenamentiMese = [];
  giornoSelezionato = null;
  listaDiv.innerHTML = "";
  listaTitle.textContent = "Allenamenti";

  // ✅ reset filtri admin
  isAdminUser = false;
  selectedUserId = null;
  if (adminFiltersDiv) adminFiltersDiv.style.display = "none";
  if (userFilterSelect) userFilterSelect.innerHTML = "";

  authDiv.style.display = "block";
  appDiv.style.display = "none";
};

async function checkSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    authDiv.style.display = "none";
    appDiv.style.display = "block";
    await initAdminFilters();
    caricaAllenamentiMese();
  } else {
    authDiv.style.display = "block";
    appDiv.style.display = "none";
  }
}

checkSession();

async function initAdminFilters() {
  isAdminUser = false;
  selectedUserId = null;

  // Nascondi per default
  if (adminFiltersDiv) adminFiltersDiv.style.display = "none";
  if (userFilterSelect) userFilterSelect.innerHTML = "";

  // Capisci se l'utente è admin
  const { data: roleRow, error: roleErr } = await supabaseClient
    .from("user_roles")
    .select("role")
    .eq("user_id", (await supabaseClient.auth.getUser()).data.user?.id)
    .maybeSingle();

  if (roleErr) {
    console.warn("Impossibile leggere user_roles:", roleErr.message);
    return;
  }

  isAdminUser = roleRow?.role === "admin";
  if (!isAdminUser) return;

  // Carica elenco utenti (profili)
  const { data: profiles, error: profErr } = await supabaseClient
    .from("profiles")
    .select("id, full_name")
    .order("full_name", { ascending: true });

  if (profErr) {
    console.warn("Impossibile leggere profiles:", profErr.message);
    return;
  }

  if (!adminFiltersDiv || !userFilterSelect) return;

  adminFiltersDiv.style.display = "flex";

  // Opzione "Tutti"
  userFilterSelect.innerHTML = '<option value="">Tutti</option>' + (profiles || [])
    .map(p => {
      const label = (p.full_name && p.full_name.trim()) ? p.full_name.trim() : (p.id ? p.id.slice(0, 8) + "…" : "Senza nome");
      return `<option value="${p.id}">${label}</option>`;
    })
    .join("");

  userFilterSelect.onchange = () => {
    selectedUserId = userFilterSelect.value || null;
    caricaAllenamentiMese();
    if (giornoSelezionato) caricaAllenamenti(giornoSelezionato);
  };
}

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

  const { error } = await supabaseClient
    .from("allenamenti")
    .insert(allenamento);

  if (error) return alert(error.message);

  form.reset();
  caricaAllenamentiMese();
};

// ================= CALENDARIO =================
let currentMonth = new Date();
let allenamentiMese = [];
let giornoSelezionato = null;

async function caricaAllenamentiMese() {
  const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

  let q = supabaseClient
    .from("allenamenti")
    .select("*, profiles(full_name)")
    .gte("data", start.toISOString().split("T")[0])
    .lte("data", end.toISOString().split("T")[0]);

  if (isAdminUser && selectedUserId) {
    q = q.eq("user_id", selectedUserId);
  }

  const { data, error } = await q;

  if (error) {
    console.error(error);
    allenamentiMese = [];
    renderCalendar();
    return;
  }

  allenamentiMese = data || [];
  renderCalendar();
}

function renderCalendar() {
  const grid = document.getElementById("calendar-grid");
  const title = document.getElementById("calendarTitle");
  grid.innerHTML = "";

  title.textContent = currentMonth.toLocaleDateString("it-IT", {
    month: "long",
    year: "numeric"
  });

  const firstDay = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  ).getDay() || 7;

  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate();

  for (let i = 1; i < firstDay; i++) grid.innerHTML += "<div></div>";

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr =
      `${currentMonth.getFullYear()}-` +
      `${String(currentMonth.getMonth() + 1).padStart(2, "0")}-` +
      `${String(d).padStart(2, "0")}`;

    const hasWorkout = allenamentiMese.some(a => a.data === dateStr);

    grid.innerHTML += `
      <div class="calendar-day ${hasWorkout ? "has-workout" : ""}"
           onclick="selezionaGiorno('${dateStr}')">
        ${d}
      </div>`;
  }
}

window.selezionaGiorno = function (data) {
  giornoSelezionato = data;
  listaTitle.textContent = `Allenamenti del ${formatDate(data)}`;
  caricaAllenamenti(data);
};

prevMonthBtn.onclick = () => {
  currentMonth.setMonth(currentMonth.getMonth() - 1);
  caricaAllenamentiMese();
};

nextMonthBtn.onclick = () => {
  currentMonth.setMonth(currentMonth.getMonth() + 1);
  caricaAllenamentiMese();
};

// ================= LISTA (CARD MOBILE) =================
async function caricaAllenamenti(data) {
  let q = supabaseClient
    .from("allenamenti")
    .select("*, profiles(full_name)")
    .eq("data", data)
    .order("ora_inizio");

  if (isAdminUser && selectedUserId) {
    q = q.eq("user_id", selectedUserId);
  }

  const { data: rows, error } = await q;

  if (error) {
    console.error(error);
    listaDiv.innerHTML = "<p>Errore caricamento (permessi)</p>";
    return;
  }

  listaDiv.innerHTML = "";
  if (!rows || rows.length === 0) {
    listaDiv.innerHTML = "<p>Nessun allenamento</p>";
    return;
  }

  rows.forEach(a => {
    listaDiv.innerHTML += `
      <div class="table-row">

        <div>📅 <strong>Data:</strong> ${formatDate(a.data)}</div>
        <div>⏰ <strong>Ora:</strong> ${a.ora_inizio}</div>
        <div>🏋️ <strong>Tipo:</strong> ${a.tipo}</div>
        ${isAdminUser ? `<div>👤 <strong>Inserito da:</strong> ${a.profiles?.full_name || "-"}</div>` : ""}

        <div>🤝 <strong>Trainer:</strong> ${a.persone || "-"}</div>
        <div>👥 <strong>Partecipanti:</strong> ${a.numero_partecipanti || "-"}</div>
        <div>⏱ <strong>Durata:</strong> ${a.durata ? a.durata + " min" : "-"}</div>

        <div>📝 <strong>Note:</strong> ${a.note || "-"}</div>

        <div class="actions">
          <button onclick="modificaAllenamento('${a.id}')">✏️</button>
          <button onclick="eliminaAllenamento('${a.id}')">🗑️</button>
        </div>

      </div>
    `;
  });
}

// ================= MODIFICA =================
window.modificaAllenamento = async function (id) {
  const { data: a } = await supabaseClient
    .from("allenamenti")
    .select("*")
    .eq("id", id)
    .single();

  if (!a) return;

  const tipo = prompt("Tipo:", a.tipo);
  if (tipo === null) return;

  const data = prompt("Data (YYYY-MM-DD):", a.data);
  if (data === null) return;

  const ora = prompt("Ora:", a.ora_inizio);
  if (ora === null) return;

  const durata = prompt("Durata (min):", a.durata ?? "");
  if (durata === null) return;

  const partecipanti = prompt("Partecipanti:", a.numero_partecipanti ?? "");
  if (partecipanti === null) return;

  const trainer = prompt("Trainer:", a.persone ?? "");
  if (trainer === null) return;

  const note = prompt("Note:", a.note ?? "");
  if (note === null) return;

  await supabaseClient.from("allenamenti").update({
    tipo,
    data,
    ora_inizio: ora,
    durata: durata || null,
    numero_partecipanti: partecipanti || null,
    persone: trainer || null,
    note: note || null
  }).eq("id", id);

  caricaAllenamentiMese();
  if (giornoSelezionato) caricaAllenamenti(giornoSelezionato);
};

// ================= ELIMINA =================
window.eliminaAllenamento = async function (id) {
  if (!confirm("Eliminare allenamento?")) return;

  await supabaseClient
    .from("allenamenti")
    .delete()
    .eq("id", id);

  caricaAllenamentiMese();
  if (giornoSelezionato) caricaAllenamenti(giornoSelezionato);
};
// ===============================
// EXPORT EXCEL
// ===============================
//
// Comportamento:
// - Se hai selezionato un giorno nel calendario: esporta quel giorno.
// - Altrimenti: esporta tutto il mese attualmente visualizzato nel calendario.

const exportBtn = document.getElementById("exportExcelBtn");

exportBtn?.addEventListener("click", async () => {
  try {
    // Se non è selezionato un giorno, esportiamo il mese corrente
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];

    const fromDate = giornoSelezionato || start;
    const toDate = giornoSelezionato || end;

    // 🔒 RLS: utente normale vedrà solo i suoi; admin vedrà tutti
    const { data: rows, error } = await supabaseClient
      .from("allenamenti")
      .select("*, profiles(full_name)")
      .gte("data", fromDate)
      .lte("data", toDate)
      .order("data", { ascending: true })
      .order("ora_inizio", { ascending: true });

    if (error) {
      console.error(error);
      alert("Errore durante l'export");
      return;
    }

    if (!rows || rows.length === 0) {
      alert("Nessun dato da esportare");
      return;
    }

    exportAllenamentiToExcel(rows, { fromDate, toDate });
  } catch (err) {
    console.error(err);
    alert("Errore imprevisto durante l'export");
  }
});

function exportAllenamentiToExcel(rows, { fromDate, toDate }) {
  if (typeof XLSX === "undefined") {
    alert("Libreria XLSX non caricata. Controlla lo script in index.html.");
    return;
  }

  const formatted = rows.map((a) => ({
    Data: a.data ? formatDate(a.data) : "",
    Ora: a.ora_inizio || "",
    Tipo: a.tipo || "",
    Durata_min: a.durata ?? "",
    Partecipanti: a.numero_partecipanti ?? "",
    Trainer: a.persone ?? "",
    Note: a.note ?? "",
    Inserito_da: a.profiles?.full_name ?? "",
    ID: a.id ?? ""
  }));

  const ws = XLSX.utils.json_to_sheet(formatted);

  // Auto-width semplice
  const headers = Object.keys(formatted[0] || {});
  ws["!cols"] = headers.map((h) => {
    const maxLen = Math.max(h.length, ...formatted.map((r) => String(r[h] ?? "").length));
    return { wch: Math.min(Math.max(maxLen + 2, 10), 40) };
  });

  const wb = XLSX.utils.book_new();
  const sheetName = giornoSelezionato ? "Giorno" : "Mese";
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const safeFrom = fromDate.replaceAll("-", "");
  const safeTo = toDate.replaceAll("-", "");

  const fileName = giornoSelezionato
    ? `allenamenti_${safeFrom}.xlsx`
    : `allenamenti_${safeFrom}_${safeTo}.xlsx`;

  XLSX.writeFile(wb, fileName);
}
