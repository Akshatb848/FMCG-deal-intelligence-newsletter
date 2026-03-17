/* ── State ──────────────────────────────────────────────────────────────────── */
const state = {
  currentStep: 1,
  fileId: null,
  columns: [],
  rows: [],
  jobId: null,
  results: null,
  charts: {},
  allArticles: [],
};

const STEP_COUNT = 5;

/* ── Presets ────────────────────────────────────────────────────────────────── */
const PRESETS = {
  fmcg: {
    domain: "FMCG Deal Intelligence",
    primary: ["unilever","nestle","nestlé","procter","gamble","p&g","coca-cola","pepsi","pepsico","ab inbev","diageo","kraft heinz","mondelez","mars","ferrero","reckitt","danone","tyson","l'oreal","loreal","colgate","henkel","haldirams","haldiram","minimalist","notco","bodyarmor","siete foods","clif bar","ghost energy"].join("\n"),
    secondary: ["fmcg","consumer goods","consumer staples","packaged goods","packaged food","food","beverage","beverages","snacks","skincare","beauty","personal care","household","dairy","confectionery","chocolate","beer","spirits","wine","nutrition","pet food","ice cream","coffee","energy drink","plant-based","grocery"].join("\n"),
    dealPrimary: ["acquires","acquisition","acquired","acquire","merger","merges","merged","takeover","buyout","invests","investment","invested","raises","funding round","series a","series b","series c","series d","divests","divestiture","divestment","sells","sold","joint venture","stake","majority stake","minority stake","private equity"].join("\n"),
    dealSecondary: ["deal","transaction","bid","offer","valuation","consolidate","consolidation","spin-off","carve-out","ipo"].join("\n"),
    dealLabels: "acquires = Acquisition\nacquisition = Acquisition\nacquired = Acquisition\nmerger = Merger\nmerges = Merger\nmakeover = Acquisition\nbuyout = Acquisition\ninvests = Investment\ninvestment = Investment\nfunding round = Investment\nseries a = Investment\nseries b = Investment\nseries c = Investment\nseries d = Investment\nraises = Investment\ndivests = Divestiture\ndivestiture = Divestiture\nsells = Divestiture\nsold = Divestiture\njoint venture = Joint Venture\nstake = Stake Acquisition\nmajority stake = Stake Acquisition\nminority stake = Stake Acquisition",
    tier1: "Reuters\nBloomberg\nFinancial Times\nWall Street Journal\nNikkei",
    tier2: "CNBC\nBBC\nForbes\nEconomic Times\nMint\nBusiness Standard\nGuardian",
    tier3: "TechCrunch\nMarketWatch\nPE Hub\nVCCircle\nDrinks Business\nCosmetics Design",
    blocklist: "dealrumors.net\nfakenews.com\nrumorsonly.com\nclickbait.io",
    minRelevance: 8,
    dedup: 0.20,
  },
  tech: {
    domain: "Tech M&A Intelligence",
    primary: ["apple","google","alphabet","microsoft","meta","amazon","nvidia","salesforce","oracle","sap","ibm","intel","qualcomm","broadcom","amd","openai","anthropic","databricks","snowflake","stripe","palantir","servicenow"].join("\n"),
    secondary: ["software","saas","cloud","ai","artificial intelligence","machine learning","platform","enterprise","fintech","cybersecurity","semiconductor","data","analytics","developer tools","api","startup","unicorn"].join("\n"),
    dealPrimary: ["acquires","acquisition","acquired","acquire","merger","takeover","buyout","invests","investment","raises","funding round","series a","series b","series c","series d","divests","sells","sold","joint venture","stake"].join("\n"),
    dealSecondary: ["deal","transaction","bid","offer","valuation","ipo","spac","listing","consolidation","spin-off","carve-out"].join("\n"),
    dealLabels: "acquires = Acquisition\nacquisition = Acquisition\nmerger = Merger\nbuyout = Acquisition\ntakeover = Acquisition\ninvests = Investment\ninvestment = Investment\nfunding round = Investment\nseries a = Investment\nseries b = Investment\nseries c = Investment\nseries d = Investment\nraises = Investment\ndivests = Divestiture\nsells = Divestiture\nsold = Divestiture\nstake = Stake Acquisition",
    tier1: "Reuters\nBloomberg\nFinancial Times\nWall Street Journal",
    tier2: "CNBC\nBBC\nForbes\nThe Verge\nWired\nArs Technica",
    tier3: "TechCrunch\nVentureBeat\nMarketWatch\nCrunchBase",
    blocklist: "rumorsonly.com\nfakeblog.net",
    minRelevance: 8,
    dedup: 0.20,
  },
};

/* ── Navigation ─────────────────────────────────────────────────────────────── */
function goToStep(n) {
  if (n < 1 || n > STEP_COUNT) return;

  // Validate before advancing
  if (n === 2 && !state.fileId) { alert("Please upload a file first."); return; }
  if (n === 3 && !state.fileId) { alert("Please upload a file first."); return; }

  document.querySelectorAll(".panel").forEach(p => p.classList.add("hidden"));
  document.getElementById(`panel-${n}`).classList.remove("hidden");

  document.querySelectorAll(".step").forEach(s => {
    const sn = parseInt(s.dataset.step);
    s.classList.remove("active", "done");
    if (sn === n) s.classList.add("active");
    else if (sn < n) s.classList.add("done");
  });

  state.currentStep = n;

  // Build column mapping UI when entering step 2
  if (n === 2) buildMappingUI();
}

/* ── Step 1: Upload ─────────────────────────────────────────────────────────── */
const uploadZone = document.getElementById("uploadZone");
const fileInput  = document.getElementById("fileInput");

uploadZone.addEventListener("dragover", e => { e.preventDefault(); uploadZone.classList.add("drag-over"); });
uploadZone.addEventListener("dragleave", () => uploadZone.classList.remove("drag-over"));
uploadZone.addEventListener("drop", e => {
  e.preventDefault();
  uploadZone.classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});
fileInput.addEventListener("change", () => {
  if (fileInput.files[0]) handleFile(fileInput.files[0]);
});

async function handleFile(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  if (!["csv", "json"].includes(ext)) {
    alert("Only CSV and JSON files are supported.");
    return;
  }

  showEl("uploadProgress");
  hideEl("previewWrap");

  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Upload failed");

    state.fileId  = data.file_id;
    state.columns = data.columns;
    state.rows    = data.preview;

    document.getElementById("previewMeta").innerHTML =
      `<strong>${escHtml(data.filename)}</strong> · ${data.columns.length} columns · ${data.row_count.toLocaleString()} rows`;

    buildPreviewTable(data.columns, data.preview);
    hideEl("uploadProgress");
    showEl("previewWrap");
  } catch (err) {
    hideEl("uploadProgress");
    alert("Upload error: " + err.message);
  }
}

function buildPreviewTable(columns, rows) {
  const table = document.getElementById("previewTable");
  table.innerHTML = "";
  const thead = table.createTHead();
  const tr = thead.insertRow();
  columns.forEach(col => {
    const th = document.createElement("th");
    th.textContent = col;
    tr.appendChild(th);
  });
  const tbody = table.createTBody();
  rows.forEach(row => {
    const tr = tbody.insertRow();
    columns.forEach(col => {
      const td = tr.insertCell();
      td.textContent = row[col] || "";
    });
  });
}

/* ── Step 2: Column Mapping ──────────────────────────────────────────────────── */
const STANDARD_FIELDS = [
  { id: "col_title",    label: "Title / Headline",     required: true,  hint: "Main headline of the record" },
  { id: "col_body",     label: "Body / Content",       required: true,  hint: "Full text or summary of the record" },
  { id: "col_source",   label: "Source / Publisher",   required: true,  hint: "Name of the source or outlet" },
  { id: "col_date",     label: "Publication Date",     required: false, hint: "Date when the record was published" },
  { id: "col_url",      label: "URL / Link",           required: false, hint: "Hyperlink to the original record" },
  { id: "col_category", label: "Category / Type",      required: false, hint: "Existing category label (optional)" },
];

const COMMON_NAMES = {
  col_title:    ["title","headline","head","subject","name","article_title","Title"],
  col_body:     ["summary","body","content","text","description","abstract","full_text","article"],
  col_source:   ["source","publisher","outlet","author","publication"],
  col_date:     ["published_date","date","pub_date","publish_date","created_at","timestamp","time"],
  col_url:      ["url","link","href","article_url","source_url"],
  col_category: ["category","type","label","tag","section","genre"],
};

function buildMappingUI() {
  const grid = document.getElementById("mappingGrid");
  grid.innerHTML = "";

  STANDARD_FIELDS.forEach(field => {
    const div = document.createElement("div");
    div.className = "mapping-field";

    const badge = field.required
      ? '<span class="required-badge">Required</span>'
      : '<span class="optional-badge">Optional</span>';

    const select = document.createElement("select");
    select.id = `map-${field.id}`;
    select.className = "mapping-select";

    if (!field.required) {
      const opt = document.createElement("option");
      opt.value = ""; opt.textContent = "— Not mapped —";
      select.appendChild(opt);
    }

    state.columns.forEach(col => {
      const opt = document.createElement("option");
      opt.value = col;
      opt.textContent = col;
      select.appendChild(opt);
    });

    // Auto-select best match
    const preferred = COMMON_NAMES[field.id] || [];
    let matched = false;
    for (const pref of preferred) {
      const found = state.columns.find(c => c.toLowerCase() === pref.toLowerCase());
      if (found) { select.value = found; matched = true; break; }
    }
    if (!matched && state.columns.length > 0 && field.required) {
      select.value = state.columns[0];
    }

    div.innerHTML = `<label for="map-${field.id}">${field.label}${badge}<span style="display:block;font-size:11px;color:var(--grey);font-weight:400;margin-top:2px">${field.hint}</span></label>`;
    div.appendChild(select);
    grid.appendChild(div);
  });
}

function getMappingValues() {
  const out = {};
  STANDARD_FIELDS.forEach(f => {
    const sel = document.getElementById(`map-${f.id}`);
    out[f.id] = sel ? sel.value : "";
  });
  return out;
}

/* ── Step 3: Config ──────────────────────────────────────────────────────────── */
function loadPreset(name) {
  const p = PRESETS[name];
  if (!p) return;
  document.getElementById("cfg-domain").value         = p.domain;
  document.getElementById("cfg-primary").value        = p.primary;
  document.getElementById("cfg-secondary").value      = p.secondary;
  document.getElementById("cfg-deal-primary").value   = p.dealPrimary;
  document.getElementById("cfg-deal-secondary").value = p.dealSecondary;
  document.getElementById("cfg-deal-labels").value    = p.dealLabels;
  document.getElementById("cfg-tier1").value          = p.tier1;
  document.getElementById("cfg-tier2").value          = p.tier2;
  document.getElementById("cfg-tier3").value          = p.tier3;
  document.getElementById("cfg-blocklist").value      = p.blocklist;

  const minRel = document.getElementById("cfg-min-relevance");
  minRel.value = p.minRelevance;
  document.getElementById("min-rel-val").textContent = p.minRelevance;

  const dedup = document.getElementById("cfg-dedup");
  dedup.value = Math.round(p.dedup * 100);
  document.getElementById("dedup-val").textContent = p.dedup.toFixed(2);
}

function clearConfig() {
  ["cfg-domain","cfg-primary","cfg-secondary","cfg-deal-primary",
   "cfg-deal-secondary","cfg-deal-labels","cfg-tier1","cfg-tier2",
   "cfg-tier3","cfg-blocklist"].forEach(id => {
    document.getElementById(id).value = "";
  });
}

function lines(id) {
  return document.getElementById(id).value
    .split("\n")
    .map(s => s.trim())
    .filter(Boolean);
}

function parseLabels(id) {
  const out = {};
  lines(id).forEach(line => {
    const eqIdx = line.indexOf("=");
    if (eqIdx > 0) {
      const k = line.slice(0, eqIdx).trim().toLowerCase();
      const v = line.slice(eqIdx + 1).trim();
      if (k && v) out[k] = v;
    }
  });
  return out;
}

function buildConfig() {
  const mapping = getMappingValues();
  return {
    domain_name:             document.getElementById("cfg-domain").value.trim() || "Deal Intelligence",
    col_title:               mapping.col_title    || "title",
    col_body:                mapping.col_body     || "summary",
    col_source:              mapping.col_source   || "source",
    col_date:                mapping.col_date     || "published_date",
    col_url:                 mapping.col_url      || "url",
    col_category:            mapping.col_category || "category",
    primary_keywords:        lines("cfg-primary"),
    secondary_keywords:      lines("cfg-secondary"),
    deal_primary_keywords:   lines("cfg-deal-primary"),
    deal_secondary_keywords: lines("cfg-deal-secondary"),
    deal_type_labels:        parseLabels("cfg-deal-labels"),
    source_tier1:            lines("cfg-tier1"),
    source_tier2:            lines("cfg-tier2"),
    source_tier3:            lines("cfg-tier3"),
    blocklist:               lines("cfg-blocklist"),
    min_relevance_score:     parseFloat(document.getElementById("cfg-min-relevance").value),
    dedup_threshold:         parseFloat(document.getElementById("cfg-dedup").value) / 100,
  };
}

/* ── Step 4: Run ─────────────────────────────────────────────────────────────── */
async function startPipeline() {
  if (!state.fileId) { alert("No file uploaded."); return; }

  const config = buildConfig();

  goToStep(4);
  resetStageCards();
  document.getElementById("runLog").innerHTML = "";

  try {
    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_id: state.fileId, config }),
    });
    const job = await res.json();
    if (!res.ok) throw new Error(job.detail || "Failed to start job");

    state.jobId = job.job_id;
    logLine(`Job started: ${job.job_id}`);
    listenForProgress(job.job_id);
  } catch (err) {
    alert("Error starting pipeline: " + err.message);
  }
}

function listenForProgress(jobId) {
  const es = new EventSource(`/api/jobs/${jobId}/stream`);

  es.addEventListener("progress", e => {
    const data = JSON.parse(e.data);
    updateStageCard(data.stage, data.output, data.message);
    logLine(`[${data.stage}] ${data.message}`);
  });

  es.addEventListener("complete", e => {
    const data = JSON.parse(e.data);
    es.close();
    logLine("✓ Pipeline complete. Loading results…");
    setTimeout(() => loadResults(jobId), 400);
  });

  es.addEventListener("error", e => {
    let msg = "Unknown error";
    try { msg = JSON.parse(e.data).message; } catch (_) {}
    es.close();
    logLine("✗ Error: " + msg);
    alert("Pipeline error: " + msg);
  });
}

const STAGE_MAP = {
  ingestion:   "stage-ingestion",
  dedup:       "stage-dedup",
  relevance:   "stage-relevance",
  credibility: "stage-credibility",
  newsletter:  "stage-newsletter",
};

function updateStageCard(stage, count, message) {
  const cardId = STAGE_MAP[stage];
  if (!cardId) return;
  const card = document.getElementById(cardId);
  if (!card) return;
  card.classList.remove("running");
  card.classList.add("done");
  card.querySelector(".stage-msg").textContent = message;
  const badge = card.querySelector(".stage-badge");
  badge.textContent = `${count} records`;
  badge.className = "stage-badge green";

  // Mark next as running
  const stageOrder = Object.values(STAGE_MAP);
  const idx = stageOrder.indexOf(cardId);
  if (idx >= 0 && idx < stageOrder.length - 1) {
    const nextCard = document.getElementById(stageOrder[idx + 1]);
    if (nextCard) {
      nextCard.classList.add("running");
      nextCard.querySelector(".stage-msg").textContent = "Processing…";
    }
  }
}

function resetStageCards() {
  Object.values(STAGE_MAP).forEach(id => {
    const card = document.getElementById(id);
    if (!card) return;
    card.classList.remove("running", "done", "error");
    card.querySelector(".stage-msg").textContent = "Waiting…";
    const badge = card.querySelector(".stage-badge");
    badge.textContent = "—";
    badge.className = "stage-badge";
  });
  document.getElementById("stage-ingestion").classList.add("running");
  document.getElementById("stage-ingestion").querySelector(".stage-msg").textContent = "Starting…";
}

function logLine(text) {
  const log = document.getElementById("runLog");
  log.innerHTML += `<div>> ${escHtml(text)}</div>`;
  log.scrollTop = log.scrollHeight;
}

/* ── Step 5: Results ─────────────────────────────────────────────────────────── */
async function loadResults(jobId) {
  try {
    const res = await fetch(`/api/results/${jobId}/summary`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to load results");

    state.results    = data.summary;
    state.allArticles = data.articles;
    goToStep(5);
    renderResults(data.summary, data.articles);
  } catch (err) {
    alert("Error loading results: " + err.message);
  }
}

function renderResults(summary, articles) {
  renderKPIs(summary);
  renderCharts(summary);
  renderArticlesTable(articles);
}

function renderKPIs(s) {
  const kpiRow = document.getElementById("kpiRow");
  const types  = s.type_breakdown || {};
  const acq    = (types["Acquisition"] || 0) + (types["M&A"] || 0) + (types["Merger"] || 0);
  const inv    = types["Investment"] || 0;
  const div    = types["Divestiture"] || 0;

  kpiRow.innerHTML = [
    { label: "Total Input",    value: s.total_input,    cls: "kpi-navy" },
    { label: "After Dedup",    value: s.after_dedup,    cls: "kpi-teal" },
    { label: "Final Records",  value: s.final_count,    cls: "kpi-green" },
    { label: "Filtered Out",   value: s.dropped,        cls: "kpi-gold" },
    { label: "Acquisitions",   value: acq,              cls: "kpi-navy" },
    { label: "Investments",    value: inv,              cls: "kpi-green" },
    { label: "Divestitures",   value: div,              cls: "kpi-purple" },
    { label: "Blocked",        value: s.blocked,        cls: "kpi-gold" },
  ].map(k => `
    <div class="kpi-card ${k.cls}">
      <div class="kpi-value">${k.value ?? 0}</div>
      <div class="kpi-label">${k.label}</div>
    </div>
  `).join("");
}

function renderCharts(summary) {
  // Destroy old charts
  Object.values(state.charts).forEach(c => c.destroy());
  state.charts = {};

  // Deal type doughnut
  const types = summary.type_breakdown || {};
  const labels = Object.keys(types);
  const values = Object.values(types);
  const COLORS = ["#1B3A5C","#0D7377","#1E8449","#7D3C98","#C9962B","#5A6375","#1A5276","#935116"];

  const ctx1 = document.getElementById("chartTypes").getContext("2d");
  state.charts.types = new Chart(ctx1, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: COLORS.slice(0, labels.length), borderWidth: 2 }],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "right", labels: { font: { size: 12 } } } },
    },
  });

  // Funnel bar
  const ctx2 = document.getElementById("chartFunnel").getContext("2d");
  state.charts.funnel = new Chart(ctx2, {
    type: "bar",
    data: {
      labels: ["Input", "After Dedup", "After Relevance", "Final"],
      datasets: [{
        label: "Records",
        data: [summary.total_input, summary.after_dedup, summary.after_relevance, summary.final_count],
        backgroundColor: ["#5A6375","#0D7377","#C9962B","#1E8449"],
        borderRadius: 4,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } },
    },
  });
}

const ARTICLE_COLUMNS = [
  { key: "title",              label: "Title" },
  { key: "source",             label: "Source" },
  { key: "published_date",     label: "Date" },
  { key: "deal_type_detected", label: "Category" },
  { key: "relevance_score",    label: "Score" },
  { key: "credibility_flag",   label: "Credibility" },
];

function renderArticlesTable(articles) {
  document.getElementById("articleCount").textContent = articles.length;
  buildArticleTable(articles);
}

function buildArticleTable(articles) {
  const table = document.getElementById("articlesTable");
  table.innerHTML = "";
  const thead = table.createTHead();
  const tr = thead.insertRow();
  ARTICLE_COLUMNS.forEach(col => {
    const th = document.createElement("th");
    th.textContent = col.label;
    tr.appendChild(th);
  });
  const tbody = table.createTBody();
  articles.forEach(article => {
    const tr = tbody.insertRow();
    ARTICLE_COLUMNS.forEach(col => {
      const td = tr.insertCell();
      let val = article[col.key] ?? "";
      if (col.key === "title" && article.url) {
        td.innerHTML = `<a href="${escHtml(article.url)}" target="_blank" style="color:var(--navy);text-decoration:none;">${escHtml(String(val))}</a>`;
      } else if (col.key === "relevance_score") {
        td.innerHTML = `<strong>${val}</strong>`;
      } else {
        td.textContent = String(val);
      }
    });
  });
}

function filterArticles(query) {
  const q = query.toLowerCase();
  const filtered = state.allArticles.filter(a =>
    Object.values(a).some(v => String(v).toLowerCase().includes(q))
  );
  document.getElementById("articleCount").textContent = filtered.length;
  buildArticleTable(filtered);
}

/* ── Downloads ───────────────────────────────────────────────────────────────── */
function download(fmt) {
  if (!state.jobId) return;
  window.location.href = `/api/results/${state.jobId}/download/${fmt}`;
}

/* ── Reset ───────────────────────────────────────────────────────────────────── */
function resetAll() {
  state.fileId = null;
  state.columns = [];
  state.rows = [];
  state.jobId = null;
  state.results = null;
  state.allArticles = [];

  document.getElementById("uploadProgress").classList.add("hidden");
  document.getElementById("previewWrap").classList.add("hidden");
  document.getElementById("uploadZone").classList.remove("hidden");
  fileInput.value = "";

  goToStep(1);
}

/* ── Docs popup ──────────────────────────────────────────────────────────────── */
function showDocs() {
  window.open("/docs", "_blank");
}

/* ── Helpers ─────────────────────────────────────────────────────────────────── */
function showEl(id) { document.getElementById(id).classList.remove("hidden"); }
function hideEl(id) { document.getElementById(id).classList.add("hidden"); }

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
