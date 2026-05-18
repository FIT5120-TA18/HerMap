/**
 * spending_tracker.js — Epic 5: Understand and Improve My Spending Habits
 *
 * Purpose:
 * - Let Sarah enter weekly expenses
 * - Split spending into essentials / non-essentials
 * - Show surplus or deficit
 * - Show rent stress
 * - Compare Sarah's spending pattern with broader Victorian ABS household spending proportions
 *
 * Note:
 * ABS benchmark comparison uses proportions, not direct dollar comparison.
 * This avoids pretending broad Victorian household totals are a perfect young-women-only benchmark.
 */

// ─────────────────────────────────────────────
// ABS benchmark proportions
// TEMPORARY FRONTEND CONSTANTS
// Later, we can replace this with an API call from MySQL.
// Values here should be replaced with percentages calculated from your spending_categories_ABS table.
// ─────────────────────────────────────────────
const ESSENTIAL_CATEGORIES = [
  {
    id: "groceries",
    icon: "🛒",
    name: "Groceries",
    hint: "Food and household basics",
    default: 0,
    absGroup: "Food",
  },
  {
    id: "utilities",
    icon: "⚡",
    name: "Utilities & bills",
    hint: "Electricity, gas, internet and phone",
    default: 0,
    absGroup: "Services",
  },
  {
    id: "transport",
    icon: "🚌",
    name: "Transport",
    hint: "Public transport, petrol, rideshare or parking",
    default: 0,
    absGroup: "Transport",
  },
  {
    id: "medical",
    icon: "💊",
    name: "Medical & pharmacy",
    hint: "Medicine, pharmacy items and health costs",
    default: 0,
    absGroup: "Health",
  },
];

const NONESSENTIAL_CATEGORIES = [
  {
    id: "eating_out",
    icon: "🍜",
    name: "Eating out & takeaway",
    hint: "Restaurants, cafés, delivery and takeaway",
    default: 0,
    absGroup: "Hotels, cafes and restaurants",
  },
  {
    id: "entertainment_subscriptions",
    icon: "🎬",
    name: "Entertainment & subscriptions",
    hint: "Streaming, events, apps, games and activities",
    default: 0,
    absGroup: "Recreation and culture",
  },
  {
    id: "clothing_personal",
    icon: "👗",
    name: "Clothing & personal care",
    hint: "Clothes, beauty, haircuts and personal items",
    default: 0,
    absGroup: "Clothing and footwear",
  },
  {
    id: "bnpl",
    icon: "💳",
    name: "BNPL repayments",
    hint: "Afterpay, Zip, Klarna or similar repayments",
    default: 0,
    absGroup: "Miscellaneous goods and services",
  },
  {
    id: "social_hobbies",
    icon: "🎁",
    name: "Social & hobbies",
    hint: "Going out, gifts, hobbies and leisure spending",
    default: 0,
    absGroup: "Recreation and culture",
  },
];

let activeEssentials = [];
let activeNonessentials = [];

document.addEventListener("DOMContentLoaded", () => {
  const profile = window.userProfileData || {};

  const incomeEl = document.getElementById("incomeInput");
  const rentEl = document.getElementById("rentBannerInput");

  const savedData = loadSavedSpendingData();

  if (savedData) {
    if (incomeEl) {
      incomeEl.value = savedData.income || 0;
    }

    if (rentEl) {
      rentEl.value = savedData.rent || 0;
    }

    savedData.items.forEach((item) => {
      if (item.id === "rent") return;

      addExpenseCard(item.type, item.id, item.value);
    });
  } else {
    if (incomeEl && profile.income) {
      incomeEl.value = profile.income;
    }

    if (rentEl && profile.rent) {
      rentEl.value = profile.rent;
    }

    addExpenseCard("essential", "groceries", 0);
  }

  updateIncomeBanner();
  updateRentBanner();
  rebuildDropdowns();
  updateTotals();

  incomeEl?.addEventListener("input", () => {
    updateIncomeBanner();
    updateTotals();
  });

  rentEl?.addEventListener("input", () => {
    updateRentBanner();
    updateTotals();
  });

  document.getElementById("addEssentialBtn")?.addEventListener("click", () => {
    addFromDropdown("essential");
  });

  document
    .getElementById("addNonEssentialBtn")
    ?.addEventListener("click", () => {
      addFromDropdown("nonessential");
    });
  //add by cicking dropdown list
  document
    .getElementById("essentialDropdown")
    ?.addEventListener("change", () => {
      addFromDropdown("essential");
    });

  document
    .getElementById("nonessentialDropdown")
    ?.addEventListener("change", () => {
      addFromDropdown("nonessential");
    });

  document
    .getElementById("checkPositionBtn")
    ?.addEventListener("click", handleCheckPosition);
});

function getIncome() {
  return parseFloat(document.getElementById("incomeInput")?.value) || 0;
}

function getRent() {
  return parseFloat(document.getElementById("rentBannerInput")?.value) || 0;
}

function updateIncomeBanner() {
  const income = getIncome();
  const el = document.getElementById("incomeBannerValue");

  if (!el) return;

  el.textContent = income > 0 ? `$${Math.round(income)}/wk` : "$--";
}

function updateRentBanner() {
  const rent = getRent();
  const el = document.getElementById("rentBannerValue");

  if (!el) return;

  el.textContent = rent > 0 ? `$${Math.round(rent)}/wk` : "$--";
}

function addExpenseCard(type, id, prefillValue) {
  const catalogue =
    type === "essential" ? ESSENTIAL_CATEGORIES : NONESSENTIAL_CATEGORIES;
  const category = catalogue.find((c) => c.id === id);

  if (!category) return;

  const activeArray =
    type === "essential" ? activeEssentials : activeNonessentials;

  if (activeArray.includes(id)) return;

  activeArray.push(id);

  const container = document.getElementById(
    type === "essential" ? "essentialCards" : "nonessentialCards",
  );

  if (!container) return;

  const value = prefillValue !== undefined ? prefillValue : category.default;

  const card = document.createElement("div");

  card.className = `expense-card ${type === "essential" ? "essential-card" : "nonessential-card"}`;
  card.dataset.id = id;
  card.dataset.type = type;
  card.dataset.absGroup = category.absGroup;

  card.innerHTML = `
      <div class="expense-icon">${category.icon}</div>
  
      <div class="expense-info">
        <p class="expense-name">${category.name}</p>
        <p class="expense-hint">${category.hint}</p>
      </div>
  
      <div class="expense-input-wrap">
        <span class="expense-prefix">$</span>
        <input
          class="expense-input"
          type="number"
          min="0"
          step="1"
          value="${value || ""}"
          placeholder="0"
          aria-label="${category.name} weekly amount"
          data-id="${id}"
          data-type="${type}"
        />
        <span class="expense-suffix">/wk</span>
      </div>
  
      <button class="remove-btn" type="button" aria-label="Remove ${category.name}">✕</button>
    `;

  card.querySelector(".expense-input")?.addEventListener("input", updateTotals);

  card.querySelector(".remove-btn")?.addEventListener("click", () => {
    removeCard(card, id, type);
  });

  container.appendChild(card);

  rebuildDropdowns();
  updateTotals();
}

function removeCard(card, id, type) {
  const activeArray =
    type === "essential" ? activeEssentials : activeNonessentials;
  const index = activeArray.indexOf(id);

  if (index > -1) {
    activeArray.splice(index, 1);
  }

  card.remove();
  rebuildDropdowns();
  updateTotals();
}

function rebuildDropdowns() {
  const essentialDropdown = document.getElementById("essentialDropdown");
  const nonessentialDropdown = document.getElementById("nonessentialDropdown");

  if (!essentialDropdown || !nonessentialDropdown) return;

  const availableEssentials = ESSENTIAL_CATEGORIES.filter(
    (category) => !activeEssentials.includes(category.id),
  );

  const availableNonessentials = NONESSENTIAL_CATEGORIES.filter(
    (category) => !activeNonessentials.includes(category.id),
  );

  essentialDropdown.innerHTML =
    `<option value="">+ Add an essential expense…</option>` +
    availableEssentials
      .map(
        (category) =>
          `<option value="${category.id}">${category.icon} ${category.name}</option>`,
      )
      .join("");

  nonessentialDropdown.innerHTML =
    `<option value="">+ Add a non-essential expense…</option>` +
    availableNonessentials
      .map(
        (category) =>
          `<option value="${category.id}">${category.icon} ${category.name}</option>`,
      )
      .join("");

  const essentialRow = document.getElementById("addEssentialRow");
  const nonessentialRow = document.getElementById("addNonEssentialRow");

  if (essentialRow) {
    essentialRow.style.display = availableEssentials.length ? "flex" : "none";
  }

  if (nonessentialRow) {
    nonessentialRow.style.display = availableNonessentials.length
      ? "flex"
      : "none";
  }
}

function addFromDropdown(type) {
  const dropdown = document.getElementById(
    type === "essential" ? "essentialDropdown" : "nonessentialDropdown",
  );

  if (!dropdown || !dropdown.value) return;

  addExpenseCard(type, dropdown.value);
  dropdown.value = "";
}

function getTotals() {
  let essential = getRent();
  let nonessential = 0;

  document.querySelectorAll(".expense-input").forEach((input) => {
    const value = parseFloat(input.value) || 0;

    if (input.dataset.type === "essential") {
      essential += value;
    } else {
      nonessential += value;
    }
  });

  const income = getIncome();
  const total = essential + nonessential;
  const surplus = income - total;

  return {
    income,
    rent: getRent(),
    essential,
    nonessential,
    total,
    surplus,
  };
}

function updateTotals() {
  const { essential, nonessential, total, surplus } = getTotals();

  document.getElementById("totalEssential").textContent =
    `$${Math.round(essential)}`;
  document.getElementById("totalNonessential").textContent =
    `$${Math.round(nonessential)}`;
  document.getElementById("totalAll").textContent = `$${Math.round(total)}`;

  const surplusEl = document.getElementById("totalSurplus");

  if (!surplusEl) return;

  surplusEl.textContent =
    surplus >= 0
      ? `+$${Math.round(surplus)}`
      : `-$${Math.round(Math.abs(surplus))}`;

  surplusEl.className =
    "total-value " + (surplus >= 0 ? "surplus-color" : "deficit-color");
}

function getEnteredExpenseItems() {
  const items = [];
  const rent = getRent();

  if (rent > 0) {
    items.push({
      id: "rent",
      name: "Rent",
      value: rent,
      type: "essential",
      absGroup: null,
    });
  }

  document.querySelectorAll(".expense-card").forEach((card) => {
    const input = card.querySelector(".expense-input");
    const value = parseFloat(input?.value) || 0;

    if (value <= 0) return;

    const type = card.dataset.type;
    const id = card.dataset.id;
    const catalogue =
      type === "essential" ? ESSENTIAL_CATEGORIES : NONESSENTIAL_CATEGORIES;
    const category = catalogue.find((c) => c.id === id);

    if (!category) return;

    items.push({
      id,
      name: category.name,
      value,
      type,
      absGroup: category.absGroup,
    });
  });

  return items;
}

async function handleCheckPosition() {
  const totals = getTotals();
  const items = getEnteredExpenseItems();

  if (totals.income <= 0) {
    alert("Please enter your weekly income first.");
    return;
  }

  if (items.length === 0) {
    alert("Please enter at least one weekly expense.");
    return;
  }

  const payload = {
    income: totals.income,
    rent: totals.rent,
    essential: totals.essential,
    nonessential: totals.nonessential,
    total: totals.total,
    surplus: totals.surplus,
    living: window.userProfileData?.living || "",
    locality: window.userProfileData?.locality || "",
    items,
    savedAt: Date.now(),
  };

  // Keep browser-side storage for the current results page
  sessionStorage.setItem("hermapSpendingData", JSON.stringify(payload));

  try {
    const apiBase = window.location.pathname.startsWith("/underdevelopment")
      ? "/underdevelopment/api"
      : "/api";

    const response = await fetch(`${apiBase}/save-spending-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("Failed to save spending data to Flask session");
    }

    window.location.href = window.location.pathname.startsWith(
      "/underdevelopment",
    )
      ? "/underdevelopment/spending_results"
      : "/spending_results";
  } catch (error) {
    console.error("Could not save spending data to Flask:", error);

    alert(
      "Your spending data was saved in this browser, but could not be saved to the server.",
    );

    // Optional fallback: still allow user to see the current browser-based result page
    window.location.href = window.location.pathname.startsWith(
      "/underdevelopment",
    )
      ? "/underdevelopment/spending_results"
      : "/spending_results";
  }
}

function loadSavedSpendingData() {
  try {
    const raw = sessionStorage.getItem("hermapSpendingData");

    if (!raw) return null;

    const data = JSON.parse(raw);

    if (!data || !Array.isArray(data.items)) return null;

    return data;
  } catch (error) {
    console.warn("Could not load saved spending data:", error);
    return null;
  }
}
