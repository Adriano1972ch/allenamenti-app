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

const adminFilterWrap = document.getElementById("adminUserFilter");
const userFilterSelect = document.getElementById("userFilter");

const exportBtn = document.getElementById("exportExcelBtn");

// ================= STATE =================
let currentMonth = new Date();
let allenamentiMese = [];
let giornoSelezionato = null;

let currentUser = null;
let isAdmin = false;

// admin: "all" or specific uuid
let selectedUserFilter = "all";

// map uuid -> full name
let profilesMap = {};

// ================= UTILS =================
function formatDate(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return `${d}.${m}.${y}`;
}

function isoDate(d) {
  return d.toISOString().split("T")[0];
}

function safeNameFromId(id) {
  if (!id) return "—";
  return id.slice(0, 8);
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

  // ✅ pulizia UI/dati (evita che restino dati vecchi)
  allenamentiMese = [];
  giornoSelezionato = null;
  listaDiv.innerHTML = "";
  listaTitle.textContent = "Allenamenti";
  profilesMap = {};
  currentUser = null;
  isAdmin = false;
  selectedUserFilter = "all";

  if (adminFilterWrap) adminFilterWrap.style.display = "none";
  if (userFilterSelect) userFilterSelect.value = "all";

  authDiv.style.display = "block";
  appDiv.style.display = "none";
};

async function checkSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    authDiv.style.display = "none";
    appDiv.style.display = "block";

    await initUserContext();
    await caricaAllenamentiMese();
  } else {
    authDiv.style.display = "block";
    appDiv.style.display = "none";
  }
}
checkSession();

// ================= USER CONTEXT (admin + profiles) =================
async function initUserContext() {
  const { data: ures, error: uerr } = await supabaseClient.auth.getUser();
  if (uerr) {
    console.error(uerr);
    currentUser = null;
    isAdmin = false;
    return;
  }
  currentUser = ures?.user || null;

  // ruolo: leggiamo solo il nostro (RLS)
  isAdmin = false;
  if (currentUser) {
    const { data: roleRow, error: roleErr } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", currentUser.id)
      .maybeSingle();

    if (roleErr) {
      // se non esiste tabella/permessi, rimane false
      console.warn("Impossibile leggere user_roles:", roleErr.message);
    } else {
      isAdmin = roleRow?.role === "admin";
    }
  }

  // carica lista utenti (profiles) per filtro admin
  profilesMap = {};
  if (isAdmin && adminFilterWrap && userFilterSelect) {
    adminFilterWrap.style.display = "flex";

    const { data: profs, error: profErr } = await supabaseClient
      .from("profiles")
      .select("id, full_name")
      .order("full_name", { ascending: true });

    if (profErr) {
      console.error("Errore lettura profiles:", profErr);
      // fallback: nascondi filtro se non possiamo leggere i profili
      adminFilterWrap.style.display = "none";
      isAdmin = false;
      return;
    }

    // mappa e riempi select
    profilesMap = {};
    userFilterSelect.innerHTML = `<option value="all">Tutti</option>`;

    (profs || []).forEach(p => {
      profilesMap[p.id] = p.full_name || safeNameFromId(p.id);
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = profilesMap[p.id];
      userFilterSelect.appendChild(opt);
    });

    userFilterSelect.onchange = async () => {
      selectedUserFilter = userFilterSelect.value || "all";
      // reset giorno selezionato e ricarica
      giornoSelezionato = null;
      listaDiv.innerHTML = "";
      listaTitle.textContent = "Allenamenti";
      await caricaAllenamentiMese();
    };
  } else {
    if (adminFilterWrap) adminFilterWrap.style.display = "none";
  }
}

// ================= INSERIMENTO =================
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
    // user_id: lo mette il DB con default auth.uid()
  };

  const { error } = await supabaseClient
    .from("allenamenti")
    .insert(allenamento);

  if (error) return alert(error.message);

  form.reset();
  await caricaAllenamentiMese();
  if (giornoSelezionato) await caricaAllenamenti(giornoSelezionato);
};

// ================= CALENDARIO =================
async function caricaAllenamentiMese() {
  const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

  let q = supabaseClient
    .from("allenamenti")
    .select("id,data,user_id") // sufficiente per il calendario
    .gte("data", isoDate(start))
    .lte("data", isoDate(end));

  // filtro admin
  if (isAdmin && selectedUserFilter !== "all") {
    q = q.eq("user_id", selectedUserFilter);
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

  if (isAdmin && selectedUserFilter !== "all") {
    const name = profilesMap[selectedUserFilter] || safeNameFromId(selectedUserFilter);
    listaTitle.textContent = `Allenamenti di ${name} — ${formatDate(data)}`;
  } else if (isAdmin && selectedUserFilter === "all") {
    listaTitle.textContent = `Allenamenti (Tutti) — ${formatDate(data)}`;
  } else {
    listaTitle.textContent = `Allenamenti del ${formatDate(data)}`;
  }

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
    .select("*")
    .eq("data", data)
    .order("ora_inizio");

  if (isAdmin && selectedUserFilter !== "all") {
    q = q.eq("user_id", selectedUserFilter);
  }

  const { data: rows, error } = await q;

  if (error) {
    console.error(error);
    listaDiv.innerHTML = "<p>Errore caricamento</p>";
    return;
  }

  listaDiv.innerHTML = "";
  if (!rows || rows.length === 0) {
    listaDiv.innerHTML = "<p>Nessun allenamento</p>";
    return;
  }

  rows.forEach(a => {
    const who = profilesMap[a.user_id] || (isAdmin ? safeNameFromId(a.user_id) : "");
    const whoLine = isAdmin
      ? `<div>👤 <strong>Utente:</strong> ${who}</div>`
      : "";

    listaDiv.innerHTML += `
      <div class="table-row">
        ${whoLine}
        <div>📅 <strong>Data:</strong> ${formatDate(a.data)}</div>
        <div>⏰ <strong>Ora:</strong> ${a.ora_inizio}</div>
        <div>🏋️ <strong>Tipo:</strong> ${a.tipo}</div>

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
  const { data: a, error } = await supabaseClient
    .from("allenamenti")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return alert(error.message);
  if (!a) return;

  const tipoVal = prompt("Tipo:", a.tipo);
  if (tipoVal === null) return;

  const dataVal = prompt("Data (YYYY-MM-DD):", a.data);
  if (dataVal === null) return;

  const oraVal = prompt("Ora:", a.ora_inizio);
  if (oraVal === null) return;

  const durataVal = prompt("Durata (min):", a.durata ?? "");
  if (durataVal === null) return;

  const partecipantiVal = prompt("Partecipanti:", a.numero_partecipanti ?? "");
  if (partecipantiVal === null) return;

  const trainerVal = prompt("Trainer:", a.persone ?? "");
  if (trainerVal === null) return;

  const noteVal = prompt("Note:", a.note ?? "");
  if (noteVal === null) return;

  const { error: upErr } = await supabaseClient.from("allenamenti").update({
    tipo: tipoVal,
    data: dataVal,
    ora_inizio: oraVal,
    durata: durataVal || null,
    numero_partecipanti: partecipantiVal || null,
    persone: trainerVal || null,
    note: noteVal || null
  }).eq("id", id);

  if (upErr) alert(upErr.message);

  await caricaAllenamentiMese();
  if (giornoSelezionato) await caricaAllenamenti(giornoSelezionato);
};

// ================= ELIMINA =================
window.eliminaAllenamento = async function (id) {
  if (!confirm("Eliminare allenamento?")) return;

  const { error } = await supabaseClient
    .from("allenamenti")
    .delete()
    .eq("id", id);

  if (error) alert(error.message);

  await caricaAllenamentiMese();
  if (giornoSelezionato) await caricaAllenamenti(giornoSelezionato);
};

// ===============================
// EXPORT EXCEL
// ===============================
exportBtn?.addEventListener("click", async () => {
  try {
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    const fromDate = giornoSelezionato || isoDate(start);
    const toDate = giornoSelezionato || isoDate(end);

    let q = supabaseClient
      .from("allenamenti")
      .select("*")
      .gte("data", fromDate)
      .lte("data", toDate)
      .order("data", { ascending: true })
      .order("ora_inizio", { ascending: true });

    if (isAdmin && selectedUserFilter !== "all") {
      q = q.eq("user_id", selectedUserFilter);
    }

    const { data: rows, error } = await q;

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
    Utente: isAdmin ? (profilesMap[a.user_id] || safeNameFromId(a.user_id)) : "",
    Data: a.data ? formatDate(a.data) : "",
    Ora: a.ora_inizio || "",
    Tipo: a.tipo || "",
    Durata_min: a.durata ?? "",
    Partecipanti: a.numero_partecipanti ?? "",
    Trainer: a.persone ?? "",
    Note: a.note ?? "",
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
  const sheetName = giornoSelezionato ? "Giorno" : "Periodo";
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const safeFrom = fromDate.replaceAll("-", "");
  const safeTo = toDate.replaceAll("-", "");

  const fileName = giornoSelezionato
    ? `allenamenti_${safeFrom}.xlsx`
    : `allenamenti_${safeFrom}_${safeTo}.xlsx`;

  XLSX.writeFile(wb, fileName);
}
