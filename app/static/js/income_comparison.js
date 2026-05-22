/* --------------------------------------------------------------------------
   income_comparison.js

   Page-specific JavaScript for income_comparison.html.

   Responsibilities:
   1. Load the user's profile from Flask-rendered window.userProfileData.
   2. Load SA3 income GeoJSON data from the backend.
   3. Display a Leaflet map of Victorian SA3 areas.
   4. Compare selected SA3 income with the user's estimated annual income.
   5. Render the selected SA3 income trend using Chart.js.
   6. Handle footer modals and the page tutorial.
-------------------------------------------------------------------------- */

let userProfile = {};
let incomeMap = null;
let sa3IncomeLayer = null;
let sa3LabelLayer = null;
let selectedSa3BoundaryLayer = null;
let sa3IncomeData = null;
let incomeTrendChart = null;

document.addEventListener("DOMContentLoaded", async function () {
  loadUserProfile();
  initialiseIncomeMap();
  initialiseEventListeners();
  initialiseIncomeModals();

  await loadSa3IncomeMap();
  await prefillSa3FromUserLocation();
});

/* --------------------------------------------------------------------------
   Deployment helper

   This allows API calls to work both locally and when the site is deployed
   under /underdevelopment.
-------------------------------------------------------------------------- */

function getAppBasePath() {
  return window.location.pathname.startsWith("/underdevelopment")
    ? "/underdevelopment"
    : "";
}

function buildApiUrl(path) {
  return `${getAppBasePath()}${path}`;
}

/* --------------------------------------------------------------------------
   User profile
-------------------------------------------------------------------------- */

function loadUserProfile() {
  userProfile = window.userProfileData || {};

  const locationText =
    userProfile.locality && userProfile.postcode
      ? `${userProfile.locality} (${userProfile.postcode})`
      : userProfile.locality || "Not provided";

  setTextIfExists("profileLocation", locationText);
}

function setTextIfExists(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value;
  }
}

/* --------------------------------------------------------------------------
   Leaflet map setup
-------------------------------------------------------------------------- */

function initialiseIncomeMap() {
  const mapContainer = document.getElementById("incomeMapContainer");

  if (!mapContainer || typeof L === "undefined") {
    console.error("Leaflet map container or Leaflet library is missing.");
    return;
  }

  // Victoria's approximate bounding box.
  const victoriaBounds = L.latLngBounds(
    L.latLng(-39.2, 140.95),
    L.latLng(-33.98, 150.1),
  );

  incomeMap = L.map("incomeMapContainer", {
    maxBounds: victoriaBounds,
    maxBoundsViscosity: 1.0,
    minZoom: 6,
    maxZoom: 18,
  }).setView([-37.4713, 144.7852], 7);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "© OpenStreetMap contributors",
  }).addTo(incomeMap);
}

/* --------------------------------------------------------------------------
   Load SA3 income map data
-------------------------------------------------------------------------- */

async function loadSa3IncomeMap() {
  if (!incomeMap) return;

  try {
    const response = await fetch(buildApiUrl("/api/sa3-income-map"));

    if (!response.ok) {
      throw new Error(
        `Failed to load SA3 income map. Status: ${response.status}`,
      );
    }

    const rawData = await response.json();

    // Keep Victorian SA3 areas only. Victorian SA3 codes are in the 20000 range.
    sa3IncomeData = {
      ...rawData,
      features: (rawData.features || []).filter(function (feature) {
        const code = String(feature.properties.sa3_code).trim();
        return code.startsWith("2") && code.length === 5;
      }),
    };

    if (!sa3IncomeData.features.length) {
      showMapMessage("No suburb income map data found.");
      return;
    }

    sa3IncomeLayer = L.geoJSON(sa3IncomeData, {
      style: styleSa3IncomeArea,
      onEachFeature: onEachSa3Feature,
    }).addTo(incomeMap);

    addSa3Labels();
    createIncomeLegend();

    const hasUserLocation = userProfile.postcode || userProfile.locality;

    if (!hasUserLocation) {
      const bounds = sa3IncomeLayer.getBounds();

      if (bounds.isValid()) {
        incomeMap.fitBounds(bounds);
      }
    }
  } catch (error) {
    console.error("Error loading suburb income map:", error);
    showMapMessage("Unable to load suburb income map.");
  }
}

function showMapMessage(message) {
  const mapContainer = document.getElementById("incomeMapContainer");

  if (mapContainer) {
    mapContainer.innerHTML = message;
  }
}

/* --------------------------------------------------------------------------
   Pre-fill selected SA3 from user's saved location
-------------------------------------------------------------------------- */

async function prefillSa3FromUserLocation() {
  if (!userProfile.postcode && !userProfile.locality) return;
  if (!sa3IncomeData || !sa3IncomeData.features) return;

  try {
    const params = new URLSearchParams({
      postcode: userProfile.postcode || "",
      locality: userProfile.locality || "",
    });

    const response = await fetch(
      buildApiUrl(`/api/sa3-from-location?${params.toString()}`),
    );

    if (!response.ok) {
      throw new Error(
        `Failed to find SA3 from user location. Status: ${response.status}`,
      );
    }

    const sa3 = await response.json();

    if (!sa3.sa3_code || !sa3.sa3_name) {
      console.warn("No matching SA3 found for the saved user location.");
      return;
    }

    const matchedFeature = sa3IncomeData.features.find(function (feature) {
      return (
        String(feature.properties.sa3_code).trim() ===
        String(sa3.sa3_code).trim()
      );
    });

    if (matchedFeature) {
      selectSa3Feature(matchedFeature);
    }
  } catch (error) {
    console.error("Error pre-filling SA3:", error);
  }
}

/* --------------------------------------------------------------------------
   Map styling
-------------------------------------------------------------------------- */

function styleSa3IncomeArea(feature) {
  const sa3Income = Number(feature.properties.income_2022_23);
  const userAnnualIncome = getUserAnnualIncome();

  return {
    fillColor: getComparisonColour(sa3Income, userAnnualIncome),
    weight: 1,
    opacity: 1,
    color: "#ffffff",
    fillOpacity: 0.75,
  };
}

function getComparisonColour(sa3Income, userAnnualIncome) {
  if (!sa3Income || !userAnnualIncome) return "#d9d9d9";

  const difference = sa3Income - userAnnualIncome;
  const percentDifference = Math.abs(difference) / userAnnualIncome;

  if (percentDifference <= 0.1) return "#f9a825";
  if (difference < 0) return "#2e7d32";

  return "#c62828";
}

/* --------------------------------------------------------------------------
   Legend
-------------------------------------------------------------------------- */

function createIncomeLegend() {
  const filterCard = document.querySelector(".filter-card");

  if (!filterCard || document.getElementById("incomeLegendBox")) return;

  const userAnnualIncome = getUserAnnualIncome();

  const legend = document.createElement("div");
  legend.id = "incomeLegendBox";
  legend.className = "income-map-legend";

  legend.innerHTML = `
    <strong>Map colouring: Income Comparison</strong>

    <p>
      Suburb areas are coloured by comparing young female annual income in each suburb
      with your estimated annual income.
      ${
        userAnnualIncome
          ? `Your estimated annual income is <strong>${formatAnnualMoney(userAnnualIncome)}</strong>.`
          : "Enter your income in your profile to enable comparison colouring."
      }
    </p>

    <div class="income-map-legend-list">
      <div class="income-map-legend-item">
        <span class="income-map-dot green"></span>
        Suburb average below your income
      </div>

      <div class="income-map-legend-item">
        <span class="income-map-dot yellow"></span>
        Similar to your income
      </div>

      <div class="income-map-legend-item">
        <span class="income-map-dot red"></span>
        Suburb average above your income
      </div>

      <div class="income-map-legend-item">
        <span class="income-map-dot grey"></span>
        No data or no user income
      </div>
    </div>
  `;

  filterCard.appendChild(legend);
}

/* --------------------------------------------------------------------------
   SA3 map labels
-------------------------------------------------------------------------- */

function addSa3Labels() {
  if (!incomeMap || !sa3IncomeData) return;

  sa3LabelLayer = L.layerGroup().addTo(incomeMap);

  sa3IncomeData.features.forEach(function (feature) {
    const props = feature.properties;
    const polygonLayer = L.geoJSON(feature);
    const center = polygonLayer.getBounds().getCenter();

    const label = L.marker(center, {
      interactive: false,
      icon: L.divIcon({
        className: "sa3-map-label",
        html: `<span>${props.sa3_name}</span>`,
        iconSize: [120, 24],
        iconAnchor: [60, 12],
      }),
    });

    sa3LabelLayer.addLayer(label);
  });
}

/* --------------------------------------------------------------------------
   SA3 hover and click events
-------------------------------------------------------------------------- */

function onEachSa3Feature(feature, layer) {
  layer.on({
    click: function () {
      const code = String(feature.properties.sa3_code).trim();

      if (!code.startsWith("2") || code.length !== 5) return;

      selectSa3Feature(feature);
    },

    mouseover: function (event) {
      const hoveredLayer = event.target;

      hoveredLayer.setStyle({
        weight: 2,
        color: "#333333",
        fillOpacity: 0.9,
      });

      hoveredLayer.bringToFront();
    },

    mouseout: function (event) {
      if (sa3IncomeLayer) {
        sa3IncomeLayer.resetStyle(event.target);
      }

      if (selectedSa3BoundaryLayer) {
        selectedSa3BoundaryLayer.bringToFront();
      }
    },
  });
}

/* --------------------------------------------------------------------------
   Selecting an SA3
-------------------------------------------------------------------------- */

function selectSa3Feature(feature) {
  const props = feature.properties;

  setValueIfExists("sa3Input", props.sa3_name || "");
  setValueIfExists("selectedSa3Input", props.sa3_name || "");
  setValueIfExists("selectedSa3CodeInput", props.sa3_code || "");

  const suggestionsBox = document.getElementById("sa3Suggestions");

  if (suggestionsBox) {
    suggestionsBox.innerHTML = "";
  }

  const selectedLayer = findLayerBySa3Code(props.sa3_code);

  if (selectedLayer) {
    const bounds = selectedLayer.getBounds();

    if (bounds.isValid()) {
      incomeMap.fitBounds(bounds, {
        padding: [30, 30],
        maxZoom: 11,
      });
    }
  }

  drawSelectedSa3Boundary(feature);
  showSa3DetailPanel(props);
}

function setValueIfExists(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.value = value;
  }
}

function drawSelectedSa3Boundary(feature) {
  if (selectedSa3BoundaryLayer) {
    incomeMap.removeLayer(selectedSa3BoundaryLayer);
  }

  selectedSa3BoundaryLayer = L.geoJSON(feature, {
    interactive: false,
    style: {
      color: "#111111",
      weight: 4,
      fillOpacity: 0,
    },
  }).addTo(incomeMap);
}

/* --------------------------------------------------------------------------
   Detail panel
-------------------------------------------------------------------------- */

function showSa3DetailPanel(props) {
  const panel = document.getElementById("sa3DetailPanel");

  if (!panel) return;

  setTextIfExists("sa3DetailName", props.sa3_name || "--");
  setTextIfExists(
    "detailAverageIncome",
    formatAnnualMoney(props.income_2022_23),
  );

  const userAnnualIncome = getUserAnnualIncome();

  setTextIfExists(
    "detailUserIncome",
    userAnnualIncome ? formatAnnualMoney(userAnnualIncome) : "--",
  );

  updateIncomeComparison(props.income_2022_23);
  renderIncomeTrendChart(props);
  generateIncomeTrendInsight(props);

  panel.classList.remove("hidden");
}

function updateIncomeComparison(sa3AnnualIncome) {
  const badge = document.getElementById("incomeComparisonBadge");
  const insight = document.getElementById("incomeInsight");
  const userAnnualIncome = getUserAnnualIncome();

  if (!badge) return;

  badge.className = "income-badge";

  if (!userAnnualIncome || !sa3AnnualIncome) {
    badge.textContent = "Not enough data";
    badge.classList.add("is-neutral");

    if (insight) {
      insight.textContent =
        "Enter your income in your profile to compare it with the suburb annual average.";
    }

    return;
  }

  const difference = userAnnualIncome - sa3AnnualIncome;
  const percentage = Math.round((Math.abs(difference) / sa3AnnualIncome) * 100);
  const dollarDifference = formatAnnualMoney(Math.abs(difference));

  if (Math.abs(difference) < userAnnualIncome * 0.1) {
    badge.textContent = `Similar, within ${percentage}%`;

    badge.classList.add("is-neutral");

    if (insight) {
      insight.textContent =
        "Your estimated annual income is similar to the young female average income in this suburb area.";
    }

    return;
  }

  if (difference > 0) {
    badge.textContent = `${percentage}% above average`;

    badge.classList.add("is-positive");

    if (insight) {
      insight.textContent = `Your estimated annual income is ${percentage}% higher than the young female average income in this suburb area. That is around ${dollarDifference} more per year.`;
    }

    return;
  }

  badge.textContent = `${percentage}% below average`;

  badge.classList.add("is-negative");

  if (insight) {
    insight.textContent = `Your estimated annual income is ${percentage}% lower than the young female average income in this suburb area. That is around ${dollarDifference} less per year.`;
  }
}

/* --------------------------------------------------------------------------
   Trend chart
-------------------------------------------------------------------------- */

function renderIncomeTrendChart(props) {
  const chartCanvas = document.getElementById("incomeTrendChart");

  if (!chartCanvas || typeof Chart === "undefined") {
    console.warn("Chart.js or incomeTrendChart canvas is missing.");
    return;
  }

  if (incomeTrendChart) {
    incomeTrendChart.destroy();
  }

  incomeTrendChart = new Chart(chartCanvas.getContext("2d"), {
    type: "line",
    data: {
      labels: props.history_labels || [],
      datasets: [
        {
          label: `${props.sa3_name} annual income`,
          data: props.history || [],
          borderColor: "rgb(232, 84, 106)",
          backgroundColor: "rgba(232, 84, 106, 0.05)",
          borderWidth: 3,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: "rgb(232, 84, 106)",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          pointRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "top",
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return formatAnnualMoney(context.parsed.y);
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: false,
          ticks: {
            callback: function (value) {
              return `$${Number(value).toLocaleString()}`;
            },
          },
        },
      },
    },
  });
}

function generateIncomeTrendInsight(props) {
  const trendStatusBadge = document.getElementById("incomeTrendStatusBadge");
  const trendInsight = document.getElementById("incomeTrendInsight");

  if (!trendStatusBadge || !trendInsight) return;

  const history = (props.history || []).filter(function (value) {
    return value !== null && value !== undefined;
  });

  const labels = props.history_labels || [];

  trendStatusBadge.className = "income-badge";

  if (history.length < 2) {
    trendStatusBadge.textContent = "No trend data";
    trendStatusBadge.classList.add("is-neutral");

    trendInsight.innerHTML = `Not enough income history is available for ${props.sa3_name}.`;

    return;
  }

  const firstIncome = history[0];
  const lastIncome = history[history.length - 1];
  const totalChange = lastIncome - firstIncome;
  const percentChange = Math.round((totalChange / firstIncome) * 100);

  let status = "Stable";
  let statusClass = "is-neutral";

  if (percentChange > 10) {
    status = "Rising";
    statusClass = "is-positive";
  }

  if (percentChange < -10) {
    status = "Declining";
    statusClass = "is-negative";
  }

  trendStatusBadge.textContent = status;
  trendStatusBadge.classList.add(statusClass);

  trendInsight.innerHTML = `
    <strong>${props.sa3_name} income trend:</strong>
    Young female annual income changed from
    <strong>${formatAnnualMoney(firstIncome)}</strong>
    in <strong>${labels[0] || "the first year"}</strong>
    to <strong>${formatAnnualMoney(lastIncome)}</strong>
    in <strong>${labels[labels.length - 1] || "the latest year"}</strong>.
    This is a change of <strong>${formatAnnualMoney(totalChange)}</strong>
    (${percentChange}%).
  `;
}

/* --------------------------------------------------------------------------
   Events and search
-------------------------------------------------------------------------- */

function initialiseEventListeners() {
  const closeBtn = document.getElementById("closeSa3DetailBtn");
  const sa3Input = document.getElementById("sa3Input");

  if (closeBtn) {
    closeBtn.addEventListener("click", closeSa3DetailPanel);
  }

  if (sa3Input) {
    sa3Input.addEventListener("input", function () {
      filterSa3Suggestions(sa3Input.value);
    });
  }

  document.addEventListener("click", function (event) {
    const suggestionsBox = document.getElementById("sa3Suggestions");

    if (
      suggestionsBox &&
      !event.target.closest("#sa3Input") &&
      !event.target.closest("#sa3Suggestions")
    ) {
      suggestionsBox.innerHTML = "";
    }
  });
}

function closeSa3DetailPanel() {
  const panel = document.getElementById("sa3DetailPanel");

  if (panel) {
    panel.classList.add("hidden");
  }

  if (incomeTrendChart) {
    incomeTrendChart.destroy();
    incomeTrendChart = null;
  }

  if (selectedSa3BoundaryLayer) {
    incomeMap.removeLayer(selectedSa3BoundaryLayer);
    selectedSa3BoundaryLayer = null;
  }
}

function filterSa3Suggestions(searchText) {
  const suggestionsBox = document.getElementById("sa3Suggestions");

  if (!suggestionsBox) return;

  suggestionsBox.innerHTML = "";

  if (!sa3IncomeData || !sa3IncomeData.features) return;

  const cleanSearchText = searchText.trim().toLowerCase();

  const matches = sa3IncomeData.features
    .filter(function (feature) {
      const sa3Name = feature.properties.sa3_name || "";
      return (
        !cleanSearchText || sa3Name.toLowerCase().includes(cleanSearchText)
      );
    })
    .slice(0, 12);

  if (!matches.length) {
    const emptyItem = document.createElement("div");
    emptyItem.className = "income-suggestion-item is-empty";
    emptyItem.textContent = "No suburb area found";
    suggestionsBox.appendChild(emptyItem);
    return;
  }

  matches.forEach(function (feature) {
    const item = document.createElement("button");

    item.type = "button";
    item.className = "income-suggestion-item";
    item.textContent = feature.properties.sa3_name;

    item.addEventListener("click", function () {
      selectSa3Feature(feature);
    });

    suggestionsBox.appendChild(item);
  });
}

function findLayerBySa3Code(sa3Code) {
  let foundLayer = null;

  if (!sa3IncomeLayer) return null;

  sa3IncomeLayer.eachLayer(function (layer) {
    const layerCode = String(layer.feature.properties.sa3_code).trim();
    const targetCode = String(sa3Code).trim();

    if (layerCode === targetCode) {
      foundLayer = layer;
    }
  });

  return foundLayer;
}

/* --------------------------------------------------------------------------
   Helpers
-------------------------------------------------------------------------- */

function getUserAnnualIncome() {
  if (!userProfile.income) return null;

  // The profile stores weekly income, so annual income is weekly income x 52.
  return Number(userProfile.income) * 52;
}

function formatAnnualMoney(value) {
  if (value === null || value === undefined || value === "") return "--";

  return `$${Number(value).toLocaleString()}/year`;
}

/* --------------------------------------------------------------------------
   Footer modals
-------------------------------------------------------------------------- */

function initialiseIncomeModals() {
  const modalTriggers = document.querySelectorAll("[data-modal-target]");
  const modalOverlays = document.querySelectorAll(".income-modal-overlay");

  if (!modalTriggers.length || !modalOverlays.length) return;

  function openModal(modal) {
    if (!modal) return;

    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  function closeModal(modal) {
    if (!modal) return;

    modal.classList.add("hidden");
    document.body.style.overflow = "";
  }

  function closeAllModals() {
    modalOverlays.forEach(function (modal) {
      closeModal(modal);
    });
  }

  modalTriggers.forEach(function (trigger) {
    trigger.addEventListener("click", function () {
      const modalId = trigger.dataset.modalTarget;
      const modal = document.getElementById(modalId);

      openModal(modal);
    });
  });

  modalOverlays.forEach(function (modal) {
    const closeButtons = modal.querySelectorAll("[data-modal-close]");

    closeButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        closeModal(modal);
      });
    });

    modal.addEventListener("click", function (event) {
      if (event.target === modal) {
        closeModal(modal);
      }
    });
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeAllModals();
    }
  });
}
