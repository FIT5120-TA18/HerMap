/**
 * forecast.js  —  Financial Resilience Forecast (Revised - honest, no predictions)
 * Income = hours × rate. Industry = aspirational panel only. No rent growth projection.
 *
 * Data sources:
 *  - Rent: /api/lga-rent-map (DFFH, CC BY 4.0)
 *  - ABS HES 2022 benchmarks (CC BY 2.5)
 *  - Bond: Planning and Environment Act 1987 (Vic)
 *  - Myki cap: PTV published fares
 *  - Award wage: Fair Work Australia 2024-25
 */

const ABS_HES = [
  { id:"utilities", label:"Electricity & gas",      weekly:28,  source:"ABS HES 2022" },
  { id:"internet",  label:"Internet (NBN 25)",       weekly:14,  source:"ABS HES 2022" },
  { id:"insurance", label:"Contents insurance",      weekly:14,  source:"ABS HES 2022" },
  { id:"groceries", label:"Groceries",               weekly:110, source:"ABS HES 2022" },
  { id:"transport", label:"Public transport (Myki)", weekly:53,  source:"PTV weekly cap" },
  { id:"medical",   label:"Medical & pharmacy",      weekly:12,  source:"ABS HES 2022" },
  { id:"goods",     label:"Household goods (yr 1)",  weekly:35,  source:"ABS HES 2022 (one-off spread)" },
];
const HES_TOTAL = ABS_HES.reduce((s,i) => s + i.weekly, 0);
const AWARD_WAGE = 27.50; // Fair Work Australia 2024-25 casual retail/hospitality

let allLGARentData = null;

document.addEventListener("DOMContentLoaded", () => {
  renderProfileStrip();
  loadLGAs();
  loadIndustries();
  prefillInputs();
  document.getElementById("hoursInput")?.addEventListener("input", updateIncomePreview);
  document.getElementById("rateInput")?.addEventListener("input",  updateIncomePreview);
  document.getElementById("runForecastBtn")?.addEventListener("click", runForecast);
});

function renderProfileStrip() {
  const p = window.userProfileData || {};
  const strip = document.getElementById("profileStrip");
  if (!strip) return;
  strip.innerHTML = [
    { label:"Location",   value: p.locality ? `${p.locality} (${p.postcode})` : "Not set" },
    { label:"Living now", value: p.living || "Not set" },
  ].map(pill => `<div class="profile-pill"><span>${pill.label}</span><strong>${pill.value}</strong></div>`).join("");
}

function prefillInputs() {
  const p = window.userProfileData || {};
  const hoursEl = document.getElementById("hoursInput");
  const rateEl  = document.getElementById("rateInput");
  if (!hoursEl || !rateEl) return;
  rateEl.value  = AWARD_WAGE;
  hoursEl.value = p.income > 0 ? Math.min(Math.round(p.income / AWARD_WAGE), 38) : 20;
  updateIncomePreview();
}

function getIncome() {
  const h = parseFloat(document.getElementById("hoursInput")?.value) || 0;
  const r = parseFloat(document.getElementById("rateInput")?.value)  || 0;
  return Math.round(h * r);
}

function updateIncomePreview() {
  const el = document.getElementById("incomePreview");
  const v  = getIncome();
  if (el) el.textContent = v > 0 ? `= $${v}/wk take-home` : "";
}

async function loadLGAs() {
  try {
    const lgas = await (await fetch("/api/all-lgas")).json();
    const sel  = document.getElementById("lgaSelect");
    if (!sel) return;
    sel.innerHTML = `<option value="">Select a suburb area…</option>` +
      lgas.map(l => `<option value="${l.lgacode}">${l.lga_name}</option>`).join("");
  } catch(e) { console.error(e); }
}

async function loadIndustries() {
  try {
    window._industryData = await (await fetch("/api/industry-chart")).json();
  } catch(e) { console.error(e); }
}

async function fetchLGARent(lgacode) {
  if (!allLGARentData) {
    allLGARentData = await (await fetch("/api/lga-rent-map")).json();
  }
  const f = allLGARentData.features.find(x => x.properties.lgacode === lgacode);
  if (!f) return null;
  return {
    lga_name: f.properties.lga_name,
    rent:     f.properties.rent,
    history:  f.properties.history  || [],
    labels:   f.properties.history_labels || [],
  };
}

function calc5yrGrowth(history) {
  if (!history || history.length < 20) return null;
  const recent   = history[history.length - 1];
  const fiveBack = history[history.length - 20] || history[0];
  if (!recent || !fiveBack || fiveBack === 0) return null;
  return (((recent - fiveBack) / fiveBack) * 100).toFixed(0);
}

async function runForecast() {
  const lgacode = document.getElementById("lgaSelect")?.value;
  const income  = getIncome();
  if (!lgacode) { alert("Please select a suburb area."); return; }
  if (income <= 0) { alert("Please enter your hours and hourly rate."); return; }

  const btn = document.getElementById("runForecastBtn");
  btn.textContent = "Calculating…"; btn.disabled = true;

  try {
    const lgaData = await fetchLGARent(lgacode);
    if (!lgaData) throw new Error("Rent data not available for this area.");

    const rent         = lgaData.rent;
    const bond         = rent * 4;        // Vic legislation
    const advance      = rent * 2;
    const moveInCost   = bond + advance;
    const totalCost    = rent + HES_TOTAL;
    const surplus      = income - totalCost;
    const rentRatio    = rent / income;
    const savingsRate  = Math.max(surplus * 0.5, 0);

    const weeksForMoveIn    = savingsRate > 0 ? Math.ceil(moveInCost / savingsRate) : null;
    const weeksForEmergency = savingsRate > 0 ? Math.ceil((totalCost * 13) / savingsRate) : null;
    const rentGrowth5yr     = calc5yrGrowth(lgaData.history);
    const hours             = parseFloat(document.getElementById("hoursInput").value) || 20;
    const rate              = parseFloat(document.getElementById("rateInput").value)  || AWARD_WAGE;

    renderVerdict(rentRatio, surplus, rent, income, lgaData.lga_name);
    renderKPIs(rent, income, surplus, bond, advance, moveInCost, weeksForMoveIn, weeksForEmergency);
    renderCostBreakdown(rent, income);
    renderScenarios(rent, income, surplus, moveInCost, lgaData.lga_name, rentGrowth5yr, hours, rate);
    renderAspirationalPanel(income, rent);

    document.getElementById("resultsArea").classList.add("visible");
    document.getElementById("resultsArea").scrollIntoView({ behavior:"smooth", block:"start" });

  } catch(err) {
    console.error(err);
    alert("Could not load forecast: " + err.message);
  } finally {
    btn.textContent = "✦ Run My Forecast";
    btn.disabled    = false;
  }
}

function renderVerdict(rentRatio, surplus, rent, income, lgaName) {
  const banner = document.getElementById("verdictBanner");
  const icon   = document.getElementById("verdictIcon");
  const title  = document.getElementById("verdictTitle");
  const body   = document.getElementById("verdictBody");
  if (!banner) return;
  const pct = Math.round(rentRatio * 100);
  banner.className = "verdict-banner";
  if (rentRatio <= 0.25 && surplus > 80) {
    banner.classList.add("viable");
    icon.textContent  = "✅";
    title.textContent = "Looking achievable at your current hours";
    body.textContent  = `Rent in ${lgaName} is ${pct}% of your income — under the 30% stress threshold (Planning and Environment Act 1987, Vic). After all estimated living costs you have $${Math.round(surplus)}/wk left over.`;
  } else if (rentRatio <= 0.30 && surplus >= 0) {
    banner.classList.add("stressed");
    icon.textContent  = "⚠️";
    title.textContent = "Manageable but close to the stress line";
    body.textContent  = `Rent is ${pct}% of your income — just under the 30% rental stress threshold. Surplus is $${Math.round(surplus)}/wk after all living costs. Little buffer for unexpected bills.`;
  } else if (surplus >= 0) {
    banner.classList.add("stressed");
    icon.textContent  = "⚠️";
    title.textContent = "Above the rental stress threshold";
    body.textContent  = `Rent is ${pct}% of your income — above the 30% threshold. Small surplus of $${Math.round(surplus)}/wk but this is financially fragile. See options below.`;
  } else {
    banner.classList.add("notviable");
    icon.textContent  = "🔴";
    title.textContent = "Not yet viable at your current hours";
    body.textContent  = `Rent is ${pct}% of income. Adding living costs puts you $${Math.round(Math.abs(surplus))}/wk in deficit. More hours, a higher rate, or a cheaper area will change this — see the options below.`;
  }
}

function renderKPIs(rent, income, surplus, bond, advance, moveInCost, weeksForMoveIn, weeksForEmergency) {
  const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  const setClass = (id, cls) => { const el = document.getElementById(id); if (el) el.className = cls; };

  set("kpiRent",    `$${Math.round(rent)}/wk`);
  set("kpiRentSub", `${Math.round((rent/income)*100)}% of your income`);

  const surplusTxt = surplus >= 0 ? `+$${Math.round(surplus)}/wk` : `-$${Math.round(Math.abs(surplus))}/wk`;
  set("kpiSurplus", surplusTxt);
  setClass("kpiSurplus", "kpi-value " + (surplus > 50 ? "positive" : surplus >= 0 ? "stressed" : "negative"));
  set("kpiSurplusSub", surplus >= 0 ? "after rent + all living costs" : "deficit — costs exceed income");

  set("kpiBond",    `$${Math.round(moveInCost)}`);
  set("kpiBondSub", `Bond $${Math.round(bond)} + 2wks advance $${Math.round(advance)}`);

  if (weeksForMoveIn && surplus > 0) {
    set("kpiWeeks",    `${weeksForMoveIn} wks`);
    setClass("kpiWeeks", "kpi-value " + (weeksForMoveIn <= 16 ? "positive" : weeksForMoveIn <= 30 ? "stressed" : "negative"));
    set("kpiWeeksSub", `~${(weeksForMoveIn/4.33).toFixed(1)} months saving 50% of surplus`);
  } else {
    set("kpiWeeks",    "—"); setClass("kpiWeeks","kpi-value negative");
    set("kpiWeeksSub", "increase income or reduce costs first");
  }

  if (weeksForEmergency && surplus > 0) {
    const months = Math.round(weeksForEmergency / 4.33);
    set("kpiEmergency", `${months} months`);
    setClass("kpiEmergency", "kpi-value " + (months <= 9 ? "positive" : "stressed"));
  } else {
    set("kpiEmergency","—"); setClass("kpiEmergency","kpi-value negative");
  }
}

function renderCostBreakdown(rent, income) {
  const tbody      = document.getElementById("costBreakdownBody");
  const totalEl    = document.getElementById("costBreakdownTotal");
  const tabsCont   = document.getElementById("bdTabsContainer");
  const subtitleEl = document.getElementById("bdSubtitle");
  if (!tbody || !totalEl) return;

  // Try loading spending tracker data saved by spending_tracker.js (< 24 h old)
  let trackerData = null;
  try {
    const raw = sessionStorage.getItem("hermapSpendingData");
    if (raw) {
      const p = JSON.parse(raw);
      if (Date.now() - p.savedAt < 86400000) trackerData = p;
    }
  } catch(e) {}

  const absRows = [
    { label:"Rent (1BR median)", value:rent, source:"DFFH Victorian Rental Report", type:"essential" },
    ...ABS_HES.map(r => ({ label:r.label, value:r.weekly, source:r.source, type:"essential" })),
  ];

  let trackerRows = null;
  if (trackerData && trackerData.items.length > 0) {
    trackerRows = [
      { label:"Rent (1BR area median)", value:rent, source:"DFFH Victorian Rental Report", type:"essential" },
      ...trackerData.items
          .filter(i => i.id !== "rent")
          .map(i => ({ label:i.name, value:i.value, source:"Your spending tracker", type:i.type })),
    ];
  }

  let activeMode = trackerRows ? "tracker" : "abs";

  function buildRows(rows) {
    const rowTotal   = rows.reduce((s, r) => s + r.value, 0);
    const rowSurplus = income - rowTotal;

    tbody.innerHTML = rows.map(r => {
      const pct = income > 0 ? Math.min((r.value / income) * 100, 100) : 0;
      let barColor;
      if (r.label.startsWith("Rent")) {
        barColor = pct > 30 ? "#c0392b" : pct > 25 ? "#e67e22" : "#2d8a4e";
      } else {
        barColor = r.type === "nonessential" ? "#9b72cf" : "#4aab6d";
      }
      return `<tr class="bd-row">
        <td class="bd-label-cell">
          <span class="bd-label">${r.label}</span>
          <span class="bd-source">${r.source}</span>
        </td>
        <td class="bd-bar-cell">
          <div class="bd-bar-track">
            <div class="bd-bar-fill" style="background:${barColor}" data-target="${pct.toFixed(2)}"></div>
          </div>
        </td>
        <td class="bd-amount-cell">$${Math.round(r.value)}/wk</td>
        <td class="bd-pct-cell">${Math.round(pct)}%</td>
      </tr>`;
    }).join("");

    const sc = rowSurplus >= 0 ? "#2d8a4e" : "#c0392b";
    totalEl.innerHTML = `
      <tr class="bd-total-row">
        <td>Total costs</td><td class="bd-bar-cell"></td>
        <td class="bd-amount-cell">$${Math.round(rowTotal)}/wk</td>
        <td class="bd-pct-cell">${income > 0 ? Math.round((rowTotal / income) * 100) : 0}%</td>
      </tr>
      <tr class="bd-income-row">
        <td>Your income</td><td class="bd-bar-cell"></td>
        <td class="bd-amount-cell">$${Math.round(income)}/wk</td><td></td>
      </tr>
      <tr class="bd-surplus-row">
        <td>${rowSurplus >= 0 ? "Weekly surplus" : "Weekly deficit"}</td><td class="bd-bar-cell"></td>
        <td class="bd-amount-cell" style="color:${sc}">${rowSurplus >= 0 ? "+" : ""}$${Math.round(rowSurplus)}/wk</td><td></td>
      </tr>`;

    requestAnimationFrame(() => setTimeout(() => {
      tbody.querySelectorAll(".bd-bar-fill").forEach(bar => { bar.style.width = bar.dataset.target + "%"; });
    }, 30));
  }

  // Render tabs / notice
  if (tabsCont) {
    if (trackerRows) {
      tabsCont.innerHTML = `
        <div class="bd-notice">✦ Spending tracker data found — toggle to compare your actual amounts with ABS benchmarks</div>
        <div class="bd-tabs">
          <button class="bd-tab ${activeMode === "tracker" ? "active" : ""}" data-mode="tracker">Your spending</button>
          <button class="bd-tab ${activeMode === "abs" ? "active" : ""}" data-mode="abs">ABS benchmarks</button>
        </div>`;
      tabsCont.querySelectorAll(".bd-tab").forEach(btn => {
        btn.addEventListener("click", () => {
          tabsCont.querySelectorAll(".bd-tab").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          activeMode = btn.dataset.mode;
          if (subtitleEl) subtitleEl.textContent = activeMode === "tracker"
            ? "Your actual spending from the tracker · rent based on selected area"
            : "Your rent + ABS Household Expenditure Survey 2022 benchmarks";
          buildRows(activeMode === "tracker" ? trackerRows : absRows);
        });
      });
    } else {
      tabsCont.innerHTML = "";
    }
  }

  if (subtitleEl) subtitleEl.textContent = trackerRows
    ? "Your actual spending from the tracker · rent based on selected area"
    : "Your rent + ABS Household Expenditure Survey 2022 benchmarks for a single-person Victorian household";

  buildRows(activeMode === "tracker" ? trackerRows : absRows);
}

function renderScenarios(rent, income, surplus, moveInCost, lgaName, rentGrowth, hours, rate) {
  const grid = document.getElementById("scenariosGrid");
  if (!grid) return;
  const cards = [];

  // Option A: More hours
  const targetIncome  = rent + HES_TOTAL + 100;
  const hoursRequired = Math.ceil(targetIncome / rate);
  const newIncome     = hoursRequired * rate;
  cards.push({
    cls:"option-a", badge:"Option A", title:"Work more hours",
    desc:`To have $100/wk surplus after all costs in ${lgaName}, you need ~$${Math.round(targetIncome)}/wk. At $${rate}/hr that is ${hoursRequired}hrs/wk (currently ${hours}hrs).`,
    metrics:[
      {label:"Hours needed",        val:`${hoursRequired} hrs/wk`},
      {label:"Income at that rate", val:`$${Math.round(newIncome)}/wk`},
      {label:"Weekly surplus",      val:`+$${Math.round(newIncome - rent - HES_TOTAL)}/wk`},
    ], cta:null, ctaLabel:null,
  });

  // Option B: Cheaper suburb
  const cheaperRent   = Math.round(rent * 0.78);
  const surplusB      = income - cheaperRent - HES_TOTAL;
  const moveInB       = cheaperRent * 6;
  const rateB         = Math.max(surplusB * 0.5, 0);
  const weeksB        = rateB > 0 ? Math.ceil(moveInB / rateB) : null;
  cards.push({
    cls:"option-b", badge:"Option B", title:"Start in a more affordable area",
    desc:`Areas with ~$${cheaperRent}/wk 1BR rent exist in Victoria. Starting there builds savings faster. ${weeksB ? `Move-in costs saved in ~${Math.round(weeksB/4.33)} months.` : ""}`,
    metrics:[
      {label:"Rent in cheaper area",    val:`~$${cheaperRent}/wk`},
      {label:"Weekly surplus there",    val: surplusB>=0 ? `+$${Math.round(surplusB)}/wk` : `-$${Math.round(Math.abs(surplusB))}/wk`},
      {label:"Move-in costs saved in",  val: weeksB ? `~${Math.round(weeksB/4.33)} months` : "—"},
    ], cta:"/rent_comparison", ctaLabel:"→ Explore cheaper areas",
  });

  // Option C: Cut costs (if deficit)
  if (surplus < 0) {
    const cutNeeded = Math.abs(surplus) + 80;
    const surplusC  = surplus + cutNeeded;
    const weeksC    = surplusC > 0 ? Math.ceil(moveInCost / (surplusC * 0.5)) : null;
    cards.push({
      cls:"option-c", badge:"Option C", title:"Reduce weekly spending first",
      desc:`Cutting $${Math.round(cutNeeded)}/wk from non-essentials — eating out, subscriptions, clothing — brings you to a $80/wk surplus without changing your hours.`,
      metrics:[
        {label:"Cut needed",       val:`$${Math.round(cutNeeded)}/wk`},
        {label:"New surplus",      val:`+$${Math.round(surplusC)}/wk`},
        {label:"Move-in saved in", val: weeksC ? `~${Math.round(weeksC/4.33)} months` : "—"},
      ], cta:"/spending_tracker", ctaLabel:"→ Track my spending",
    });
  }

  // Rent history context card (NOT a prediction)
  if (rentGrowth !== null) {
    cards.push({
      cls:"option-info", badge:"Historical context",
      title:`Rent here rose ${rentGrowth}% over the last 5 years`,
      desc:"This is past data only — we cannot predict future increases. It tells you this area has not been stable. Budget for a possible increase at lease renewal.",
      metrics:[
        {label:"5yr historical growth", val:`${rentGrowth}%`},
        {label:"Source", val:"DFFH Rental Report"},
      ], cta:null, ctaLabel:null,
    });
  }

  const styleMap = {
    "option-a":    "background:#dff0e8;color:#1a6640",
    "option-b":    "background:#ede8f7;color:#6b3fa0",
    "option-c":    "background:#fce8eb;color:#b32b2b",
    "option-info": "background:#fff3cd;color:#856404",
  };
  grid.innerHTML = cards.map(c => `
    <div class="scenario-card ${c.cls}">
      <span class="scenario-badge" style="${styleMap[c.cls]||""}">${c.badge}</span>
      <h4>${c.title}</h4>
      <p>${c.desc}</p>
      ${c.metrics.map(m=>`<div class="scenario-metric"><span>${m.label}</span><strong>${m.val}</strong></div>`).join("")}
      ${c.cta ? `<a class="scenario-cta" href="${c.cta}">${c.ctaLabel}</a>` : ""}
    </div>`).join("");
}

function renderAspirationalPanel(income, rent) {
  const panel = document.getElementById("aspirationalPanel");
  if (!panel) return;
  const data = window._industryData || [];
  if (!data.length) { panel.style.display = "none"; return; }
  const items = data.slice(0, 3).map(ind => {
    const wk  = Math.round((ind.year_2022_23 || ind.year_2021_22) / 52);
    const sur = wk - rent - HES_TOTAL;
    return `<div class="scenario-metric">
      <span>${ind.industry.split(" ").slice(0,4).join(" ")}</span>
      <strong>$${wk}/wk &nbsp;<span style="color:${sur>0?"#2d8a4e":"#c0392b"};font-size:12px">(${sur>0?"+":""}$${Math.round(sur)}/wk surplus)</span></strong>
    </div>`;
  }).join("");
  panel.innerHTML = `
    <div class="scenario-card option-b" style="margin-top:0">
      <span class="scenario-badge" style="background:#ede8f7;color:#6b3fa0">Looking further ahead</span>
      <h4>What full-time work opens up</h4>
      <p>You are earning part-time now. Full-time earnings in other industries look very different — this is aspirational context, not a current forecast.</p>
      ${items}
      <a class="scenario-cta" href="/income_comparison">→ Explore income by industry</a>
    </div>`;
}
