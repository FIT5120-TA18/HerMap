document.addEventListener("DOMContentLoaded", function () {
  syncProfileToSession();
  injectPersonalisedScenarioNote();
});

/* Sync Flask profile into sessionStorage */
function syncProfileToSession() {
  if (
    window.serverProfileData &&
    Object.keys(window.serverProfileData).length > 0
  ) {
    sessionStorage.setItem("profile", JSON.stringify(window.serverProfileData));
  }
}

/* =========================================================
   Deployment path helper
   Handles local and /underdevelopment server paths
   ========================================================= */

const BASE_PATH = window.location.pathname.startsWith("/underdevelopment")
  ? "/underdevelopment"
  : "";

function apiUrl(path) {
  return `${BASE_PATH}${path}`;
}

/* Optional personalised note on top of the Knowledge Hub page */
function injectPersonalisedScenarioNote() {
  const profile = JSON.parse(sessionStorage.getItem("profile") || "{}");
  const spending = JSON.parse(sessionStorage.getItem("spendingData") || "{}");

  const weeklyIncome = parseFloat(profile.income) || 0;
  const totalExpenses = parseFloat(spending.totalExpenses) || 0;
  const rentAmt = parseFloat(spending.rent) || 0;

  const noteBox = document.getElementById("personalScenarioNote");

  if (!noteBox || weeklyIncome <= 0) {
    return;
  }

  const notes = [];

  if (rentAmt > 0) {
    const rentPct = (rentAmt / weeklyIncome) * 100;

    if (rentPct > 35) {
      notes.push(`
        <strong>Housing stress flag:</strong>
        Your rent is around ${rentPct.toFixed(0)}% of your weekly income.
        You may find the Tenant Rights and Budgeting topics useful.
      `);
    }
  }

  if (totalExpenses > 0) {
    const weeklyDeficit = Math.max(0, totalExpenses - weeklyIncome);

    if (weeklyDeficit > 50) {
      notes.push(`
        <strong>Budget pressure:</strong>
        Your expenses appear to be higher than your income by about
        $${weeklyDeficit.toFixed(0)} per week. The Budgeting topic may help
        you find areas to adjust.
      `);
    }
  }

  if (notes.length > 0) {
    noteBox.innerHTML = notes.join("<br><br>");
    noteBox.classList.remove("hidden");
  }
}

/* =========================================================
   Knowledge Hub Detail Page JS
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {
  setupKnowledgeChecklist();
});

function setupKnowledgeChecklist() {
  const checklistItems = document.querySelectorAll(".knowledge-checklist li");

  if (!checklistItems.length) {
    return;
  }

  checklistItems.forEach(function (item) {
    item.addEventListener("click", function () {
      item.classList.toggle("is-checked");
    });
  });
}

/* =========================================================
   Payslip arrows
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {
  drawPayslipArrows();

  window.addEventListener("resize", function () {
    drawPayslipArrows();
  });

  const payslipImage = document.querySelector(".payslip-image");
  if (payslipImage) {
    payslipImage.addEventListener("load", drawPayslipArrows);
  }
});

function drawPayslipArrows() {
  const section = document.getElementById("payslipArrowSection");
  const svg = document.getElementById("payslipArrowSvg");

  if (!section || !svg) {
    return;
  }

  // Hide arrows on stacked mobile layout
  if (window.innerWidth <= 980) {
    svg.innerHTML = getArrowMarker();
    return;
  }

  const sectionRect = section.getBoundingClientRect();

  svg.innerHTML = getArrowMarker();

  const arrowKeys = ["gross", "tax", "super", "net"];

  arrowKeys.forEach(function (key) {
    const from = section.querySelector(`[data-arrow-from="${key}"]`);
    const to = section.querySelector(`[data-arrow-to="${key}"]`);

    if (!from || !to) {
      return;
    }

    const fromRect = from.getBoundingClientRect();
    const toRect = to.getBoundingClientRect();

    const startX = fromRect.left + fromRect.width / 2 - sectionRect.left;
    const startY = fromRect.top + fromRect.height / 2 - sectionRect.top;

    const endX = toRect.left - sectionRect.left + 6;
    const endY = toRect.top + toRect.height / 2 - sectionRect.top;

    const controlX1 = startX + 80;
    const controlY1 = startY;
    const controlX2 = endX - 80;
    const controlY2 = endY;

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

    path.setAttribute(
      "d",
      `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`,
    );

    path.setAttribute("class", "payslip-arrow-line");

    svg.appendChild(path);

    to.classList.add("is-arrow-target");
  });
}

function getArrowMarker() {
  return `
    <defs>
      <marker
        id="arrowHead"
        markerWidth="10"
        markerHeight="10"
        refX="8"
        refY="3"
        orient="auto"
        markerUnits="strokeWidth"
      >
        <path d="M0,0 L0,6 L9,3 z" fill="currentColor"></path>
      </marker>
    </defs>
  `;
}

document.addEventListener("DOMContentLoaded", function () {
  setupSuperCardReveal();
});

function setupSuperCardReveal() {
  const cards = document.querySelectorAll(".super-question-card");

  if (!cards.length) {
    return;
  }

  cards.forEach(function (card, index) {
    card.style.opacity = "0";
    card.style.transform = "translateY(18px)";

    setTimeout(function () {
      card.style.transition = "opacity 0.45s ease, transform 0.45s ease";
      card.style.opacity = "1";
      card.style.transform = "translateY(0)";
    }, 120 * index);
  });
}

/* =========================================================
   Smart Budgeting: ABS essential vs non-essential chart
   ========================================================= */

let essentialExpensesChartInstance = null;

document.addEventListener("DOMContentLoaded", function () {
  setupEssentialExpensesChart();
});

async function setupEssentialExpensesChart() {
  const chartCanvas = document.getElementById("essentialExpensesChart");

  if (!chartCanvas) {
    return;
  }

  try {
    const response = await fetch(apiUrl("/api/household-spending/latest"));

    if (!response.ok) {
      throw new Error("Failed to load household spending data");
    }

    const data = await response.json();

    renderEssentialExpensesChart(data);
    updateEssentialExpensesMeta(data);
  } catch (error) {
    console.error("ABS household spending chart error:", error);

    const chartWrap = chartCanvas.closest(".budgeting-chart-wrap");

    if (chartWrap) {
      chartWrap.innerHTML = `
        <div class="budgeting-chart-state">
          Household spending data could not be loaded right now.
        </div>
      `;
    }
  }
}

function renderEssentialExpensesChart(data) {
  const chartCanvas = document.getElementById("essentialExpensesChart");

  if (!chartCanvas || !window.Chart) {
    return;
  }

  const ctx = chartCanvas.getContext("2d");
  const items = data.items || [];

  const labels = items.map(function (item) {
    return item.label;
  });

  const values = items.map(function (item) {
    return Number(item.value || 0);
  });

  const backgroundColors = items.map(function (item, index) {
    if (item.type === "essential") {
      return getEssentialGradientLevel(index);
    }

    return getNonEssentialGradientLevel(index);
  });

  if (essentialExpensesChartInstance) {
    essentialExpensesChartInstance.destroy();
  }

  essentialExpensesChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "ABS household spending benchmark",
          data: values,
          backgroundColor: backgroundColors,
          borderRadius: 12,
          borderSkipped: false,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const item = items[context.dataIndex];
              const value = Number(context.raw || 0).toLocaleString();

              return `${item.type === "essential" ? "Essential" : "Non-essential"}: ${value}`;
            },
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: {
            color: "rgba(28, 23, 20, 0.08)",
          },
          ticks: {
            color: "#6b5e58",
            font: {
              family: "DM Sans",
              size: 11,
            },
          },
        },
        y: {
          grid: {
            display: false,
          },
          ticks: {
            color: "#1c1714",
            font: {
              family: "DM Sans",
              size: 12,
              weight: "700",
            },
          },
        },
      },
    },
  });
}

function updateEssentialExpensesMeta(data) {
  const monthEl = document.getElementById("budgetingAbsMonth");
  const sourceEl = document.getElementById("budgetingAbsSource");

  if (monthEl) {
    monthEl.textContent = data.month
      ? `Latest available month: ${data.month}`
      : "Latest available ABS benchmark";
  }

  if (sourceEl && data.source_url) {
    sourceEl.href = data.source_url;
  }
}

/*
  Essential categories use green/teal shades.
  Non-essential categories use pink/purple shades.
*/
function getEssentialGradientLevel(index) {
  const colors = [
    "rgba(38, 166, 154, 0.95)",
    "rgba(76, 175, 80, 0.86)",
    "rgba(102, 187, 106, 0.78)",
    "rgba(129, 199, 132, 0.70)",
  ];

  return colors[index % colors.length];
}

function getNonEssentialGradientLevel(index) {
  const colors = [
    "rgba(232, 84, 106, 0.95)",
    "rgba(213, 91, 151, 0.86)",
    "rgba(196, 95, 168, 0.78)",
    "rgba(155, 114, 207, 0.70)",
    "rgba(180, 140, 220, 0.62)",
  ];

  return colors[index % colors.length];
}

/* =========================================================
   Victorian Tenancy Guide Checklist
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {
  setupTenancyChecklist();
});

function setupTenancyChecklist() {
  const checklistItems = document.querySelectorAll(".tenancy-check-item");

  if (!checklistItems.length) {
    return;
  }

  checklistItems.forEach(function (item) {
    const checkbox = item.querySelector('input[type="checkbox"]');

    if (!checkbox) {
      return;
    }

    checkbox.addEventListener("change", function () {
      if (checkbox.checked) {
        item.classList.add("is-complete");
      } else {
        item.classList.remove("is-complete");
      }
    });
  });
}
