let spendingChart = null;
let benchmarkChart = null;

const FALLBACK_BENCHMARK = {
  Food: 18,
  Services: 22,
  Transport: 12,
  Health: 7,
  "Recreation and culture": 13,
  "Hotels, cafes and restaurants": 8,
  "Clothing and footwear": 5,
  "Miscellaneous goods and services": 15,
};

document.addEventListener("DOMContentLoaded", async () => {
  const data = loadSpendingData();

  if (!data) {
    showEmptyState();
    return;
  }

  showResultsState();

  const benchmark = await fetchBenchmarkData();

  renderSummaryCards(data);
  renderVerdict(data);
  renderPressureMeter(data);
  renderTopDrivers(data);
  renderScenarioCards(data);
  renderSavingsPathway(data);
  renderActionInsights(data);
  renderSpendingDonut(data);
  //   renderPositionDetails(data);
  renderBenchmarkComparison(data, benchmark);
  renderNextSteps(data);
});

function loadSpendingData() {
  try {
    const raw = sessionStorage.getItem("hermapSpendingData");
    if (!raw) return null;

    const data = JSON.parse(raw);

    if (!data || !Array.isArray(data.items)) return null;

    return data;
  } catch (error) {
    console.error("Could not load spending data:", error);
    return null;
  }
}

function showEmptyState() {
  document.getElementById("emptyState").style.display = "block";
  document.getElementById("resultsContent").style.display = "none";
}

function showResultsState() {
  document.getElementById("emptyState").style.display = "none";
  document.getElementById("resultsContent").style.display = "block";
}

async function fetchBenchmarkData() {
  try {
    const response = await fetch("/api/abs-spending-benchmark");

    if (!response.ok) {
      throw new Error("Benchmark API failed");
    }

    const json = await response.json();

    if (!json.benchmark || Object.keys(json.benchmark).length === 0) {
      return FALLBACK_BENCHMARK;
    }

    return json.benchmark;
  } catch (error) {
    console.warn("Using fallback benchmark:", error);
    return FALLBACK_BENCHMARK;
  }
}

function money(value) {
  return `$${Math.round(Number(value) || 0)}`;
}

function signedMoney(value) {
  const amount = Math.round(Number(value) || 0);
  return amount >= 0 ? `+${money(amount)}` : `-${money(Math.abs(amount))}`;
}

function setScenarioClass(element, value) {
  if (!element) return;

  element.classList.remove(
    "scenario-positive",
    "scenario-warning",
    "scenario-negative",
  );

  if (value >= 50) {
    element.classList.add("scenario-positive");
  } else if (value >= 0) {
    element.classList.add("scenario-warning");
  } else {
    element.classList.add("scenario-negative");
  }
}

function renderSummaryCards(data) {
  const rentPct = data.income > 0 ? (data.rent / data.income) * 100 : 0;

  document.getElementById("summaryIncome").textContent =
    `${money(data.income)}/wk`;
  document.getElementById("summaryTotal").textContent =
    `${money(data.total)}/wk`;

  const surplusEl = document.getElementById("summarySurplus");
  surplusEl.textContent = `${signedMoney(data.surplus)}/wk`;
  surplusEl.className =
    "summary-value " + (data.surplus >= 0 ? "surplus-color" : "deficit-color");

  const rentPressureEl = document.getElementById("summaryRentPressure");

  if (data.rent > 0) {
    let status = "Stable";
    let statusClass = "gauge-status-stable";

    if (rentPct > 45) {
      status = "At Risk";
      statusClass = "gauge-status-risk";
    } else if (rentPct >= 30) {
      status = "Vulnerable";
      statusClass = "gauge-status-vulnerable";
    }

    rentPressureEl.innerHTML = `

    <div class="summary-pressure-label ${statusClass}">
      ${status}
    </div>
  `;
  } else {
    rentPressureEl.textContent = "No rent";
  }
}

function renderVerdict(data) {
  const card = document.getElementById("verdictCard");
  const icon = document.getElementById("verdictIcon");
  const title = document.getElementById("verdictTitle");
  const body = document.getElementById("verdictBody");

  card.className = "verdict-card";

  if (data.surplus < 0) {
    const weeklyDeficit = Math.abs(data.surplus);
    const shortfall = weeklyDeficit * 13;

    card.classList.add("deficit");
    icon.textContent = "🔴";
    title.textContent = `You are ${money(weeklyDeficit)}/wk over your income`;
    body.textContent = `At your current deficit of ${money(weeklyDeficit)}/wk, you face a projected shortfall of approximately ${money(shortfall)} over the next 3 months.`;
  } else if (data.surplus <= 50) {
    card.classList.add("tight");
    icon.textContent = "⚠️";
    title.textContent = "You are close to breaking even";
    body.textContent = `You have ${money(data.surplus)}/wk left over. One unexpected cost could push you into deficit.`;
  } else {
    card.classList.add("surplus");
    icon.textContent = "✅";
    title.textContent = `You have ${money(data.surplus)}/wk left over`;
    body.textContent = `Your spending is currently within your income. This gives you some room to save, plan, or absorb small unexpected costs.`;
  }
}

// function renderPressureMeter(data) {
//   const marker = document.getElementById("pressureMarker");
//   const value = document.getElementById("pressureValue");

//   if (!marker || !value) return;

//   if (!data.rent || data.rent <= 0 || data.income <= 0) {
//     marker.style.left = "0%";
//     value.textContent = "No rent entered";
//     return;
//   }

//   const rentPct = (data.rent / data.income) * 100;
//   const markerLeft = Math.min(rentPct, 80);

//   marker.style.left = `${markerLeft}%`;

//   let status = "Stable";
//   if (rentPct >= 45) {
//     status = "At Risk";
//   } else if (rentPct >= 30) {
//     status = "Vulnerable";
//   }

//   value.textContent = `${rentPct.toFixed(1)}% of income on rent · ${status}`;
// }

function renderPressureMeter(data) {
  const needle = document.getElementById("pressureMarker");
  const value = document.getElementById("pressureValue");

  if (!needle || !value) return;

  if (!data.rent || data.rent <= 0 || data.income <= 0) {
    needle.style.transform = "translateX(-50%) rotate(-90deg)";
    value.textContent = "No rent entered";
    return;
  }

  const rentPct = (data.rent / data.income) * 100;

  let status = "Stable";

  if (rentPct > 45) {
    status = "At Risk";
  } else if (rentPct >= 30) {
    status = "Vulnerable";
  }

  const cappedPct = Math.min(rentPct, 75);
  const angle = -90 + (cappedPct / 75) * 180;

  needle.style.transform = `translateX(-50%) rotate(${angle}deg)`;

  let statusClass = "gauge-status-stable";

  if (rentPct > 45) {
    statusClass = "gauge-status-risk";
  } else if (rentPct >= 30) {
    statusClass = "gauge-status-vulnerable";
  }

  value.innerHTML = `
  <span class="${statusClass}">
    ${rentPct.toFixed(1)}%
  </span>
  of income on rent ·
  <span class="${statusClass}">
    ${status}
  </span>
`;
}

function renderTopDrivers(data) {
  const container = document.getElementById("topDrivers");
  if (!container) return;

  const topItems = [...data.items]
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);

  if (!topItems.length) {
    container.innerHTML = `
      <div class="driver-item">
        <div class="driver-left">
          <span class="driver-icon">ℹ️</span>
          <span class="driver-name">No spending entered</span>
        </div>
      </div>
    `;
    return;
  }

  const icons = ["🔴", "🟠", "🟡"];

  container.innerHTML = topItems
    .map(
      (item, index) => `
    <div class="driver-item ${item.type === "essential" ? "driver-essential" : "driver-nonessential"}">
      <div class="driver-left">
        <span class="driver-icon">${icons[index]}</span>
        <span class="driver-name">${item.name}</span>
      </div>
      <span class="driver-amount">${money(item.value)}/wk</span>
    </div>
  `,
    )
    .join("");
}

function renderScenarioCards(data) {
  const currentEl = document.getElementById("scenarioCurrent");
  const sharedEl = document.getElementById("scenarioShared");
  const aloneEl = document.getElementById("scenarioAlone");

  if (!currentEl || !sharedEl || !aloneEl) return;

  const currentPosition = data.surplus;

  const estimatedSharedRent = data.rent > 0 ? data.rent : 280;
  const estimatedSharedUtilities = 45;

  const estimatedRentAlone = data.rent > 0 ? data.rent * 1.45 : 420;
  const estimatedAloneUtilities = 65;

  let sharedPosition;
  let alonePosition;

  const living = String(data.living || "").toLowerCase();

  if (living.includes("home")) {
    sharedPosition =
      data.income -
      (data.total + estimatedSharedRent + estimatedSharedUtilities);
    alonePosition =
      data.income - (data.total + estimatedRentAlone + estimatedAloneUtilities);
  } else {
    sharedPosition = data.income - data.total;
    alonePosition =
      data.income -
      (data.total - data.rent + estimatedRentAlone + estimatedAloneUtilities);
  }

  currentEl.textContent = `${signedMoney(currentPosition)}/wk`;
  sharedEl.textContent = `${signedMoney(sharedPosition)}/wk`;
  aloneEl.textContent = `${signedMoney(alonePosition)}/wk`;

  setScenarioClass(currentEl.closest(".scenario-item"), currentPosition);
  setScenarioClass(sharedEl.closest(".scenario-item"), sharedPosition);
  setScenarioClass(aloneEl.closest(".scenario-item"), alonePosition);
}

function renderSavingsPathway(data) {
  const emergencyWeeks = document.getElementById("emergencyWeeks");
  const bondWeeks = document.getElementById("bondWeeks");
  const emergencyProgress = document.getElementById("emergencyProgress");
  const bondProgress = document.getElementById("bondProgress");
  const emergencyNote = document.getElementById("emergencyNote");
  const bondNote = document.getElementById("bondNote");

  if (!emergencyWeeks || !bondWeeks || !emergencyProgress || !bondProgress)
    return;

  const surplus = Math.max(Number(data.surplus) || 0, 0);
  const emergencyTarget = 2000;
  const bondTarget = 1600;

  if (surplus <= 0) {
    emergencyWeeks.textContent = "Not yet";
    bondWeeks.textContent = "Not yet";
    emergencyProgress.style.width = "0%";
    bondProgress.style.width = "0%";

    if (emergencyNote)
      emergencyNote.textContent =
        "Build a weekly surplus first before estimating this goal.";
    if (bondNote)
      bondNote.textContent =
        "A bond buffer becomes realistic once spending is below income.";
    return;
  }

  const emergencyNeededWeeks = Math.ceil(emergencyTarget / surplus);
  const bondNeededWeeks = Math.ceil(bondTarget / surplus);

  emergencyWeeks.textContent = `≈ ${emergencyNeededWeeks} weeks`;
  bondWeeks.textContent = `≈ ${bondNeededWeeks} weeks`;

  emergencyProgress.style.width = `${Math.min(((surplus * 13) / emergencyTarget) * 100, 100)}%`;
  bondProgress.style.width = `${Math.min(((surplus * 13) / bondTarget) * 100, 100)}%`;

  if (emergencyNote) {
    emergencyNote.textContent = `At ${money(surplus)}/wk, you could save about ${money(surplus * 13)} in 3 months.`;
  }

  if (bondNote) {
    bondNote.textContent = `This estimates how long it may take to build a basic rental bond buffer.`;
  }
}

function renderActionInsights(data) {
  const positionInsight = document.getElementById("positionInsight");

  if (positionInsight) {
    const aiInsightFromPython = positionInsight.textContent.trim();

    let finalInsight = aiInsightFromPython;

    if (!finalInsight) {
      if (data.surplus < 0) {
        finalInsight =
          "Your spending is currently higher than your income. The main risk is that small weekly gaps can quickly become a larger shortfall.";
      } else {
        finalInsight =
          "Your spending is currently within your income. The next question is whether this surplus is enough to support moving out, saving, or unexpected costs.";
      }
    }

    typeWriterText(positionInsight, finalInsight, 22);
  }
  const fastestImprovement = document.getElementById("fastestImprovement");
  const moveOutReadiness = document.getElementById("moveOutReadiness");

  const rentPct = data.income > 0 ? (data.rent / data.income) * 100 : 0;
  const largestFlexible = getLargestNonEssential(data.items);

  const existingInsight = positionInsight.textContent.trim();

  if (!existingInsight) {
    if (data.surplus < 0) {
      positionInsight.textContent =
        "Your spending is currently higher than your income. The main risk is that small weekly gaps can quickly become a larger shortfall.";
    } else {
      positionInsight.textContent =
        "Your spending is currently within your income. The next question is whether this surplus is enough to support moving out, saving, or unexpected costs.";
    }
  }

  //   if (largestFlexible) {
  //     const reduction = Math.min(30, Math.round(largestFlexible.value * 0.25));
  //     const yearlySaving = reduction * 52;

  //     fastestImprovement.textContent =
  //       `Your largest flexible category is ${largestFlexible.name} at ${money(largestFlexible.value)}/wk. Reducing it by about ${money(reduction)}/wk could free up around ${money(yearlySaving)} over one year.`;
  //   } else {
  //     fastestImprovement.textContent =
  //       "Most of your entered spending is essential. Your biggest improvement may come from comparing lower-rent suburbs or reviewing fixed bills.";
  //   }

  //   const living = String(data.living || "").toLowerCase();

  //   if (living.includes("home")) {
  //     const estimatedSharedRent = data.rent > 0 ? data.rent : 280;
  //     const estimatedUtilities = 45;
  //     const projectedTotal = data.total + estimatedSharedRent + estimatedUtilities;
  //     const projectedSurplus = data.income - projectedTotal;

  //     moveOutReadiness.textContent =
  //       `Because you currently live at home, your current surplus may not reflect independent living costs. If shared rent and utilities added about ${money(estimatedSharedRent + estimatedUtilities)}/wk, your projected position would be ${signedMoney(projectedSurplus)}/wk.`;
  //   } else if (rentPct >= 30) {
  //     moveOutReadiness.textContent =
  //       `Rent takes up ${rentPct.toFixed(1)}% of your income, which may make independence harder to sustain unless other costs stay controlled.`;
  //   } else {
  //     moveOutReadiness.textContent =
  //       "Your rent is below the 30% housing stress threshold, which gives you a stronger base for sustaining independence.";
  //   }
}

function getLargestNonEssential(items) {
  return (
    items
      .filter((item) => item.type === "nonessential" && item.value > 0)
      .sort((a, b) => b.value - a.value)[0] || null
  );
}

function renderSpendingDonut(data) {
  const labels = [];
  const values = [];
  const colors = [];

  let essentialIndex = 0;
  let nonessentialIndex = 0;

  const essentialPalette = [
    "#2f5aa8",
    "#4a73bb",
    "#6a8ccd",
    "#8ba6de",
    "#b0c3ec",
  ];

  const nonessentialPalette = [
    "#9b72cf",
    "#b08ad8",
    "#c4a3e0",
    "#d7bde8",
    "#e8d5f2",
  ];

  data.items.forEach((item) => {
    labels.push(item.name);
    values.push(item.value);

    if (item.type === "essential") {
      colors.push(essentialPalette[essentialIndex % essentialPalette.length]);
      essentialIndex++;
    } else {
      colors.push(
        nonessentialPalette[nonessentialIndex % nonessentialPalette.length],
      );
      nonessentialIndex++;
    }
  });

  const canvas = document.getElementById("spendingDonut");

  if (!canvas) return;

  if (spendingChart) {
    spendingChart.destroy();
  }

  spendingChart = new Chart(canvas.getContext("2d"), {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: "#ffffff",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "65%",
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const total = values.reduce((sum, value) => sum + value, 0);
              const pct =
                total > 0 ? ((context.raw / total) * 100).toFixed(1) : 0;
              return `${context.label}: ${money(context.raw)}/wk (${pct}%)`;
            },
          },
        },
      },
    },
  });

  const legend = document.getElementById("spendingLegend");

  if (!legend) return;

  legend.innerHTML = labels
    .map(
      (label, index) => `
    <div class="chart-legend-item">
      <span class="chart-legend-dot" style="background:${colors[index % colors.length]}"></span>
      <span>${label}</span>
    </div>
  `,
    )
    .join("");
}

// function renderPositionDetails(data) {
//   const rentPct = data.income > 0 ? (data.rent / data.income) * 100 : 0;

//   document.getElementById("essentialAmount").textContent = `${money(data.essential)}/wk`;
//   document.getElementById("nonessentialAmount").textContent = `${money(data.nonessential)}/wk`;
//   document.getElementById("rentPct").textContent = data.rent > 0 ? `${rentPct.toFixed(1)}%` : "No rent entered";

//   const status = document.getElementById("stressStatus");

//   if (data.rent <= 0) {
//     status.textContent = "—";
//     return;
//   }

//   if (rentPct < 30) {
//     status.textContent = "✅ Stable";
//     status.className = "surplus-color";
//   } else if (rentPct <= 45) {
//     status.textContent = "⚠️ Vulnerable";
//     status.className = "warning-color";
//   } else {
//     status.textContent = "🔴 At Risk";
//     status.className = "deficit-color";
//   }
// }

function renderBenchmarkComparison(data, benchmark) {
  const enteredBenchmarkItems = data.items.filter(
    (item) => item.absGroup && item.value > 0,
  );

  const warning = document.getElementById("benchmarkWarning");

  const userGroups = {};

  enteredBenchmarkItems.forEach((item) => {
    if (!userGroups[item.absGroup]) {
      userGroups[item.absGroup] = 0;
    }

    userGroups[item.absGroup] += item.value;
  });

  const selectedGroups = Object.keys(userGroups).filter(
    (group) => benchmark[group] !== undefined,
  );

  if (selectedGroups.length < 2) {
    if (warning) {
      warning.textContent =
        "Add at least 2 spending categories to compare your spending pattern. With only one category, the share will always be 100%.";
    }

    renderBenchmarkChart([], {}, {});
    renderBenchmarkTable([], {}, {});
    renderBenchmarkInsights([], {}, {});
    return;
  }

  if (warning) {
    warning.textContent =
      "This comparison only uses the categories you entered. Add more categories for a fuller picture of your spending pattern.";
  }

  const userTotal = selectedGroups.reduce(
    (sum, group) => sum + userGroups[group],
    0,
  );

  const selectedBenchmarkTotal = selectedGroups.reduce(
    (sum, group) => sum + benchmark[group],
    0,
  );

  const userPercentages = {};
  const recalculatedBenchmarkPercentages = {};

  selectedGroups.forEach((group) => {
    userPercentages[group] =
      userTotal > 0 ? (userGroups[group] / userTotal) * 100 : 0;

    recalculatedBenchmarkPercentages[group] =
      selectedBenchmarkTotal > 0
        ? (benchmark[group] / selectedBenchmarkTotal) * 100
        : 0;
  });

  renderBenchmarkChart(
    selectedGroups,
    userPercentages,
    recalculatedBenchmarkPercentages,
  );
  renderBenchmarkTable(
    selectedGroups,
    userPercentages,
    recalculatedBenchmarkPercentages,
  );
  renderBenchmarkInsights(
    selectedGroups,
    userPercentages,
    recalculatedBenchmarkPercentages,
  );
}

function renderBenchmarkChart(groups, userPercentages, benchmark) {
  const canvas = document.getElementById("benchmarkChart");

  if (!canvas) return;

  if (benchmarkChart) {
    benchmarkChart.destroy();
  }

  benchmarkChart = new Chart(canvas.getContext("2d"), {
    type: "bar",
    data: {
      labels: groups,
      datasets: [
        {
          label: "Your spending share",
          data: groups.map((group) =>
            Number((userPercentages[group] || 0).toFixed(1)),
          ),
          backgroundColor: "#9b72cf",
        },
        {
          label: "Victorian benchmark",
          data: groups.map((group) =>
            Number((benchmark[group] || 0).toFixed(1)),
          ),
          backgroundColor: "#b8c2d8",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "y",
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            callback: (value) => `${value}%`,
          },
        },
      },
    },
  });
}

function renderBenchmarkTable(groups, userPercentages, benchmarkPercentages) {
  const body = document.getElementById("benchmarkTableBody");

  if (!body) return;

  if (!groups.length) {
    body.innerHTML = `
      <tr>
        <td colspan="4" style="text-align:center;color:var(--text-muted);">
          Add at least 2 spending categories to see a meaningful comparison.
        </td>
      </tr>
    `;
    return;
  }

  body.innerHTML = groups
    .map((group) => {
      const userPct = userPercentages[group] || 0;
      const benchPct = benchmarkPercentages[group] || 0;
      const diff = userPct - benchPct;

      return `
      <tr>
        <td>${group}</td>
        <td><strong>${userPct.toFixed(1)}%</strong></td>
        <td><strong>${benchPct.toFixed(1)}%</strong></td>
        <td>
          <span class="difference-pill ${diff >= 0 ? "higher" : "lower"}">
            You spend ${Math.abs(diff).toFixed(1)}% ${diff >= 0 ? "more" : "less"}
          </span>
        </td>
      </tr>
    `;
    })
    .join("");
}

function renderBenchmarkInsights(
  groups,
  userPercentages,
  benchmarkPercentages,
) {
  const container = document.getElementById("benchmarkInsights");

  if (!container) return;

  if (!groups.length) {
    container.innerHTML = `
      <div class="benchmark-insight">
        <h4>No comparison yet</h4>
        <p>Add at least 2 spending categories so the app can compare how your spending is split.</p>
      </div>
    `;
    return;
  }

  const differences = groups
    .map((group) => ({
      group,
      userPct: userPercentages[group] || 0,
      benchPct: benchmarkPercentages[group] || 0,
      diff: (userPercentages[group] || 0) - (benchmarkPercentages[group] || 0),
    }))
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
    .slice(0, 3);

  container.innerHTML = differences
    .map((item) => {
      const direction = item.diff >= 0 ? "larger" : "smaller";

      return `
      <div class="benchmark-insight">
        <h4>${item.group}</h4>
        <p>
          Among the categories you entered, this takes up a ${Math.abs(item.diff).toFixed(1)}%
          ${direction} share compared with the Victorian benchmark pattern.
        </p>
      </div>
    `;
    })
    .join("");
}

function renderNextSteps(data) {
  const text = document.getElementById("nextStepText");
  const links = document.getElementById("actionLinks");
  const chips = document.getElementById("actionChips");

  const rentPct = data.income > 0 ? (data.rent / data.income) * 100 : 0;

  if (data.surplus < 0) {
    text.textContent =
      "Your first step is to reduce the weekly gap before it becomes a larger shortfall. Start with flexible spending, then review rent pressure if rent is the main driver.";
  } else if (rentPct >= 30) {
    text.textContent =
      "You are not in deficit, but rent takes a large share of income. Your next step is to compare suburbs or rental options that reduce housing pressure.";
  } else {
    text.textContent =
      "Your position looks more manageable. Your next step is to turn your weekly surplus into a savings pathway for bond, emergency savings, or moving costs.";
  }

  const chipItems = [];

  if (data.surplus < 0) {
    chipItems.push("Reduce flexible spending");
    chipItems.push("Review BNPL repayments");
  }

  if (rentPct >= 30 || data.rent === 0) {
    chipItems.push("Compare cheaper suburbs");
  }

  if (data.surplus > 0) {
    chipItems.push("Build emergency savings");
    chipItems.push("Plan rental bond buffer");
  }

  if (chips) {
    chips.innerHTML = chipItems
      .map(
        (label) => `
      <span class="action-chip">${label}</span>
    `,
      )
      .join("");
  }

  const items = [];

  if (data.surplus < 0) {
    items.push({
      href: "/dashboard",
      title: "Learn tips to help you save more",
      desc: "Go to education tiles for practical budgeting strategies.",
      icon: "💡",
    });
  }

  if (rentPct >= 30 || data.rent === 0) {
    items.push({
      href: "/rent_comparison",
      title: "Compare suburb affordability",
      desc: "Find suburbs where rent may fit your income better.",
      icon: "🗺️",
    });
  }

  items.push({
    href: "/income_comparison",
    title: "Compare income pathways",
    desc: "Explore income patterns across industries and areas.",
    icon: "📊",
  });

  if (links) {
    links.innerHTML = items
      .map(
        (item) => `
      <a href="${item.href}" class="action-link-card">
        <div class="action-link-icon">${item.icon}</div>
        <div>
          <h4>${item.title}</h4>
          <p>${item.desc}</p>
        </div>
      </a>
    `,
      )
      .join("");
  }
}

function typeWriterText(element, text, speed = 22) {
  if (!element || !text) return;

  element.textContent = "";
  element.classList.add("typewriter-active");

  let index = 0;

  const typeInterval = setInterval(function () {
    element.textContent += text.charAt(index);
    index += 1;

    if (index >= text.length) {
      clearInterval(typeInterval);
      element.classList.remove("typewriter-active");
    }
  }, speed);
}
