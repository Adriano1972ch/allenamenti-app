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
  authDiv.style.display = "block";
  appDiv.style.display = "none";
};

async function checkSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    authDiv.style.display = "none";
    appDiv.style.display = "block";
    caricaAllenamentiMese();
  } else {
    authDiv.style.display = "block";
    appDiv.style.display = "none";
  }
}
checkSession();

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

  const { data, error } = await supabaseClient
    .from("allenamenti")
    .select("*")
    .gte("data", start.toISOString().split("T")[0])
    .lte("data", end.toISOString().split("T")[0]);

  if (error) return console.error(error);

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
  const { data: rows, error } = await supabaseClient
    .from("allenamenti")
    .select("*")
    .eq("data", data)
    .order("ora_inizio");

  if (error) return console.error(error);

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
