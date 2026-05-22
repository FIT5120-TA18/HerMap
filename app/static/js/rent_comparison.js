// Rent Comparison Page - JavaScript

let lgaRentLayer = null;
let suburbRentLayer = null;
let currentLgaRentGeoJson = null;
let currentLgaGeoJson = null;
let currentGeoJson = null;
let map = null;

let budgetFilterActive = false;
let selectedLGA = null;
let selectedLGAName = null;
let currentBudget = null;
let userIncome = null;

let trendChart = null;
let userDefaultLGAName = null;
let userDefaultLGACode = null;

let suburbBubbleChart = null;
let suburbBubbleData = [];
let addedBubbleSuburbs = [];

/*
  Handles local and /underdevelopment deployment paths safely.
  If your Nginx already supports /api, this still works locally.
*/
const BASE_PATH = window.location.pathname.startsWith("/underdevelopment")
  ? "/underdevelopment"
  : "";

function apiUrl(path) {
  return `${BASE_PATH}${path}`;
}

/* =========================================================
   Bubble chart quadrant plugin
   ========================================================= */

const quadrantPlugin = {
  id: "quadrantPlugin",

  afterDraw(chart) {
    const { ctx, chartArea, scales } = chart;

    if (!chartArea || !scales.x || !scales.y) return;

    const xScale = scales.x;
    const yScale = scales.y;

    const xMidValue = (xScale.min + xScale.max) / 2;
    const yMidValue = (yScale.min + yScale.max) / 2;

    const xMid = xScale.getPixelForValue(xMidValue);
    const yMid = yScale.getPixelForValue(yMidValue);
    

    ctx.save();

    // Sweet spot quadrant: lower cost + higher access.
    ctx.fillStyle = "rgba(79, 111, 216, 0.08)";
    ctx.fillRect(
      chartArea.right,
      chartArea.top,
      xMid - chartArea.right,
      yMid - chartArea.top,
    );

    ctx.strokeStyle = "rgba(47, 90, 168, 0.45)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);

    ctx.beginPath();
    ctx.moveTo(xMid, chartArea.top);
    ctx.lineTo(xMid, chartArea.bottom);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(chartArea.left, yMid);
    ctx.lineTo(chartArea.right, yMid);
    ctx.stroke();

    ctx.setLineDash([]);

    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(28, 23, 20, 0.72)";
    ctx.font = "12px Inter, sans-serif";

    ctx.fillText(
      "Higher cost + Higher access",
      chartArea.left + 130,
      chartArea.top + 22,
    );

    ctx.fillText(
      "Lower cost + Higher access",
      chartArea.right - 145,
      chartArea.top + 22,
    );

    ctx.fillText(
      "Higher cost + Lower access",
      chartArea.left + 130,
      chartArea.bottom - 12,
    );

    ctx.fillText(
      "Lower cost + Lower access",
      chartArea.right - 145,
      chartArea.bottom - 12,
    );

    // Top left
ctx.fillStyle = "rgba(28, 23, 20, 0.72)";
ctx.fillText("Higher cost + Higher access", chartArea.left + 130, chartArea.top + 22);

// Bottom left
ctx.fillText("Higher cost + Lower access", chartArea.left + 130, chartArea.bottom - 12);

// Bottom right
ctx.fillText("Lower cost + Lower access", chartArea.right - 145, chartArea.bottom - 12);

// Top right — sweet spot label with blue background
const sweetLabel = "⭐ Sweet Spot";
ctx.font = "bold 12px Inter, sans-serif";
const sweetTextWidth = ctx.measureText(sweetLabel).width;
const sweetBoxW = sweetTextWidth + 14;
const sweetBoxH = 22;
const sweetBoxX = chartArea.right - sweetBoxW - 8;
const sweetBoxY = chartArea.top + 32;




ctx.fillStyle = "rgba(47, 90, 168, 1)";
ctx.beginPath();
ctx.roundRect(sweetBoxX, sweetBoxY, sweetBoxW, sweetBoxH, 4);
ctx.fill();

ctx.fillStyle = "#ffffff";
ctx.textAlign = "center";
ctx.fillText(sweetLabel, sweetBoxX + sweetBoxW / 2, sweetBoxY + 15);

// Reset font for other labels
ctx.font = "12px Inter, sans-serif";
ctx.fillStyle = "rgba(28, 23, 20, 0.72)";

ctx.save();
ctx.font = "11px Inter, sans-serif";
ctx.fillStyle = "rgba(47, 90, 168, 1)";
ctx.textAlign = "center";
const dataset = chart.data.datasets[0];
const meta = chart.getDatasetMeta(0);

dataset.data.forEach((point, index) => {
  if (!point.isSweetSpot) return;
  const element = meta.data[index];
  if (!element) return;

  const cx = element.x;
  const cy = element.y;
  const r = element.options.radius || 10;

  ctx.save();
  ctx.fillStyle = "#FFD700";
  ctx.beginPath();

  const spikes = 5;
  const outerR = r * 0.8;
  const innerR = r * 0.35;

  for (let i = 0; i < spikes * 2; i++) {
    const angle = (i * Math.PI) / spikes - Math.PI / 2;
    const radius = i % 2 === 0 ? outerR : innerR;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }

  ctx.closePath();
  ctx.fill();
  ctx.restore();
});








    ctx.restore();
  },
};

/* =========================================================
   Init
   ========================================================= */

document.addEventListener("DOMContentLoaded", async function () {
  // Page controls, footer modals, and the guided tutorial are initialised first.
  initializeEventListeners();
  initializeFooterModals();
  initializeRentComparisonTutorial();

  // Map and user-specific data are loaded after the static UI is ready.
  await loadLgaRentLayer();
  await loadUserData();
});

/* =========================================================
   API / loading helpers
   ========================================================= */

async function fetchJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${url}`);
  }

  return response.json();
}

async function loadLgaRentLayer() {
  try {
    showMapLoading("Loading rental map data...");

    currentLgaRentGeoJson = await fetchJson(apiUrl("/api/lga-rent-map"));

    console.log("Loaded all LGA rent layer:", currentLgaRentGeoJson);

    if (
      !currentLgaRentGeoJson ||
      !currentLgaRentGeoJson.features ||
      !currentLgaRentGeoJson.features.length
    ) {
      showMapError("No rental map data was returned from the database.");
    }
  } catch (error) {
    console.error("Error loading LGA rent layer:", error);
    showMapError(
      "Could not load rental map data. Please check the API route and database.",
    );
  }
}

function showMapLoading(message = "Loading map data...") {
  const container = document.getElementById("mapContainer");
  if (!container) return;

  container.classList.remove("map-placeholder");
  container.innerHTML = `
    <div class="map-loading">
      <div class="map-spinner"></div>
      <div>${message}</div>
    </div>
  `;
}

function showMapError(message) {
  const container = document.getElementById("mapContainer");
  if (!container) return;

  container.classList.remove("map-placeholder");
  container.innerHTML = `
    <div style="padding: 20px; color: var(--text-muted);">
      ${message}
    </div>
  `;
}

function showMapPlaceholder(
  message = "Select a LGA to view suburbs on the map",
) {
  const container = document.getElementById("mapContainer");
  if (!container) return;

  container.classList.add("map-placeholder");
  container.innerHTML = `
    <div class="map-loading">
      <div class="map-spinner"></div>
      <div>${message}</div>
    </div>
  `;
}

/* =========================================================
   Event listeners
   ========================================================= */

function initializeEventListeners() {
  const locationSearchInput = document.getElementById("locationSearchInput");
  const locationSearchSuggestions = document.getElementById(
    "locationSearchSuggestions",
  );

  const selectedLgaInput = document.getElementById("selectedLgaInput");
  const selectedLgacodeInput = document.getElementById("selectedLgacodeInput");

  const resetMapBtn = document.getElementById("resetMapBtn");
  if (resetMapBtn) {
    resetMapBtn.addEventListener("click", resetMapToUserArea);
  }

  const filterButton = document.getElementById("filterButton");
  if (filterButton) {
    filterButton.addEventListener("click", handleBudgetFilter);
  }

  const budgetInput = document.getElementById("budgetInput");
  if (budgetInput) {
    budgetInput.addEventListener("keypress", function (event) {
      if (event.key === "Enter") {
        handleBudgetFilter();
      }
    });
  }

  const closeDetailBtn = document.getElementById("closeDetailBtn");
  if (closeDetailBtn) {
    closeDetailBtn.addEventListener("click", closeDetailPanel);
  }

  // Search suburb/postcode and resolve to LGA.
  if (locationSearchInput && locationSearchSuggestions) {
    locationSearchInput.addEventListener("input", async function () {
      const query = locationSearchInput.value.trim();

      if (selectedLgaInput) selectedLgaInput.value = "";
      if (selectedLgacodeInput) selectedLgacodeInput.value = "";

      selectedLGAName = null;

      if (query.length < 2) {
        locationSearchSuggestions.innerHTML = "";
        return;
      }

      try {
        const locations = await fetchJson(
          apiUrl(`/api/locations?q=${encodeURIComponent(query)}`),
        );

        if (!locations.length) {
          locationSearchSuggestions.innerHTML = `
            <div class="location-suggestion-item no-result">
              No matching suburb found
            </div>
          `;
          return;
        }

        locationSearchSuggestions.innerHTML = locations
          .map(
            (item) => `
              <button
                type="button"
                class="location-suggestion-item"
                data-locality="${escapeHtml(item.locality)}"
                data-postcode="${escapeHtml(item.postcode)}"
              >
                ${escapeHtml(item.locality)} (${escapeHtml(item.postcode)})
              </button>
            `,
          )
          .join("");
      } catch (error) {
        console.error("Location fetch error:", error);
        locationSearchSuggestions.innerHTML = "";
      }
    });
    locationSearchInput.addEventListener("click", function() {
      locationSearchInput.value = "";
    });

    locationSearchSuggestions.addEventListener("click", async function (event) {
      const item = event.target.closest(".location-suggestion-item");

      if (!item || item.classList.contains("no-result")) return;

      const locality = item.dataset.locality;
      const postcode = item.dataset.postcode;

      locationSearchInput.value = `${locality} (${postcode})`;
      locationSearchSuggestions.innerHTML = "";
    

      await resolveLocationToLga(locality, postcode);
    }
  );
  }

  // Bubble chart option buttons.
  document.querySelectorAll(".bubble-choice-buttons").forEach((group) => {
    group.addEventListener("click", function (event) {
      const button = event.target.closest(".bubble-choice-btn");
      if (!button) return;

      const targetInputId = group.dataset.target;
      const hiddenInput = document.getElementById(targetInputId);

      if (!hiddenInput) return;

      hiddenInput.value = button.dataset.value;

      group.querySelectorAll(".bubble-choice-btn").forEach((btn) => {
        btn.classList.remove("active");
      });

      button.classList.add("active");

      renderSuburbBubbleChart();
    });
  });

  initializeLocationAutocomplete({
    inputId: "bubbleSuburbSearch",
    suggestionsId: "bubbleSuburbSuggestions",
    onSelect: ({ locality, postcode }) => {
      addSuburbToBubbleChart(locality, postcode);
    },
  });

  const clearAddedSuburbsBtn = document.getElementById("clearAddedSuburbsBtn");
  if (clearAddedSuburbsBtn) {
    clearAddedSuburbsBtn.addEventListener("click", function () {
      addedBubbleSuburbs = [];
      renderAddedSuburbTags();
      renderSuburbBubbleChart();
    });
  }
}

function initializeLocationAutocomplete({ inputId, suggestionsId, onSelect }) {
  const input = document.getElementById(inputId);
  const suggestions = document.getElementById(suggestionsId);

  if (!input || !suggestions) return;

  input.addEventListener("input", async function () {
    const query = input.value.trim();

    if (query.length < 2) {
      suggestions.innerHTML = "";
      return;
    }

    try {
      const locations = await fetchJson(
        apiUrl(`/api/locations?q=${encodeURIComponent(query)}`),
      );

      if (!locations.length) {
        suggestions.innerHTML = `
          <div class="location-suggestion-item no-result">
            No matching suburb found
          </div>
        `;
        return;
      }

      suggestions.innerHTML = locations
        .map(
          (item) => `
            <button
              type="button"
              class="location-suggestion-item"
              data-locality="${escapeHtml(item.locality)}"
              data-postcode="${escapeHtml(item.postcode)}"
            >
              ${escapeHtml(item.locality)} (${escapeHtml(item.postcode)})
            </button>
          `,
        )
        .join("");
    } catch (error) {
      console.error("Location autocomplete error:", error);
      suggestions.innerHTML = "";
    }
  });

  suggestions.addEventListener("click", function (event) {
    const item = event.target.closest(".location-suggestion-item");

    if (!item || item.classList.contains("no-result")) return;

    const locality = item.dataset.locality;
    const postcode = item.dataset.postcode;

    // input.value = `${locality} (${postcode})`;
    input.value = "";
    suggestions.innerHTML = "";

    if (onSelect) {
      onSelect({ locality, postcode });
    }
  });
}

/* =========================================================
   User profile / LGA selection
   ========================================================= */

async function loadUserData() {
  const budgetInput = document.getElementById("budgetInput");
  const locationSearchInput = document.getElementById("locationSearchInput");

  if (!window.userProfileData) {
    userIncome = 500;
    updateMapModeBox();
    showMapPlaceholder();
    return;
  }

  userIncome = Number(window.userProfileData.income) || 500;

  let defaultBudget = null;

  if (window.userProfileData.rent && Number(window.userProfileData.rent) > 0) {
    defaultBudget = Number(window.userProfileData.rent);
  } else if (
    window.userProfileData.income &&
    Number(window.userProfileData.income) > 0
  ) {
    defaultBudget = Number(window.userProfileData.income);
  }

  if (defaultBudget && budgetInput) {
    budgetInput.value = defaultBudget;
    currentBudget = defaultBudget;
    updateBudgetDisplay();
  }

  const locality = window.userProfileData.locality || "";
  const postcode = window.userProfileData.postcode || "";

  if (locality || postcode) {
    if (locationSearchInput) {
      locationSearchInput.value = locality
        ? `${locality} (${postcode})`
        : postcode;
    }

    await resolveLocationToLga(locality, postcode, true);
  } else {
    updateMapModeBox();
    showMapPlaceholder();
  }
}

async function resolveLocationToLga(locality, postcode, isDefault = false) {
  const selectedLgaInput = document.getElementById("selectedLgaInput");
  const selectedLgacodeInput = document.getElementById("selectedLgacodeInput");
  const display = document.getElementById("resolvedLgaDisplay");

  try {
    const data = await fetchJson(
      apiUrl(
        `/api/lga-from-location?locality=${encodeURIComponent(
          locality || "",
        )}&postcode=${encodeURIComponent(postcode || "")}`,
      ),
    );

    if (!data.lga_name || !data.lgacode) {
      alert(
        "Could not find an LGA for that location. Please try a different suburb or postcode.",
      );
      return;
    }

    if (selectedLgaInput) selectedLgaInput.value = data.lga_name;
    if (selectedLgacodeInput) selectedLgacodeInput.value = data.lgacode;

    selectedLGAName = data.lga_name;

    if (isDefault) {
      userDefaultLGAName = data.lga_name;
      userDefaultLGACode = data.lgacode;
    }

    if (display) {
      display.textContent = `Local Government Area: ${data.lga_name}`;
      display.style.display = "block";
    }

    await handleLGASelect(data.lga_name, data.lgacode);
  } catch (error) {
    console.error("LGA lookup error:", error);
    showMapError(
      "Could not find your Local Government Area from the selected location.",
    );
  }
}

async function handleLGASelect(lgaName, lgacode) {
  selectedLGAName = lgaName;
  addedBubbleSuburbs = [];

  showMapLoading(`Loading ${lgaName} map...`);

  const mapTitle = document.getElementById("mapTitle");
  if (mapTitle) {
    mapTitle.textContent = `${lgaName} — Rental Prices by Suburb`;
  }

  try {
    const [suburbGeojson, lgaGeojson] = await Promise.all([
      fetchJson(
        apiUrl(`/api/suburb-rent-map?lgacode=${encodeURIComponent(lgacode)}`),
      ),
      fetchJson(
        apiUrl(`/api/lga-boundary?lgacode=${encodeURIComponent(lgacode)}`),
      ),
    ]);

    currentGeoJson = suburbGeojson;
    currentLgaGeoJson = lgaGeojson;
    budgetFilterActive = false;

    updateMapModeBox();
    initializeMap(suburbGeojson, lgaGeojson);

    await loadSuburbBubbleData(lgacode);

    const selectedLgaFeature = currentLgaRentGeoJson?.features?.find(
      (feature) => String(feature.properties.lgacode) === String(lgacode),
    );

    if (selectedLgaFeature) {
      const props = selectedLgaFeature.properties;

      showLgaDetail({
        name: props.lga_name,
        lgacode: props.lgacode,
        rent: props.rent,
        history: props.history,
        historyLabels: props.history_labels,
      });
    }
  } catch (error) {
    console.error("Error loading LGA map:", error);
    showMapError(`Unable to load map for ${lgaName}. Please try another LGA.`);
  }
}

/* =========================================================
   Leaflet map
   ========================================================= */

function initializeMap(suburbGeojson, lgaGeojson) {
  const container = document.getElementById("mapContainer");

  if (!container) return;

  if (!lgaGeojson || !lgaGeojson.features || !lgaGeojson.features.length) {
    container.innerHTML = `
      <div style="padding: 20px;">
        No LGA boundary data found for ${escapeHtml(selectedLGAName || "this area")}.
      </div>
    `;
    return;
  }

  container.classList.remove("map-placeholder");
  container.innerHTML = "";

  if (map) {
    map.remove();
    map = null;
  }

  map = L.map(container, {
    maxBounds: [
      [-39.3, 140.7],
      [-33.8, 150.2],
    ],
    maxBoundsViscosity: 1.0,
    minZoom: 7,
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
    maxZoom: 19,
  }).addTo(map);

  // Full LGA rent background layer.
  if (
    currentLgaRentGeoJson &&
    currentLgaRentGeoJson.features &&
    currentLgaRentGeoJson.features.length
  ) {
    lgaRentLayer = L.geoJSON(currentLgaRentGeoJson, {
      style: function (feature) {
        const rent = feature.properties.rent;

        return {
          color: "#666",
          weight: 0.7,
          fillColor: getLgaRentColor(rent),
          fillOpacity: 0.45,
        };
      },

      onEachFeature: function (feature, layer) {
        const props = feature.properties;
        const rentText = props.rent
          ? `$${Math.round(props.rent)}/week`
          : "No rent data";

        layer.on("click", function () {
          showLgaDetail({
            name: props.lga_name,
            lgacode: props.lgacode,
            rent: props.rent,
            history: props.history,
            historyLabels: props.history_labels,
          });
        });

        layer.bindPopup(`
          <strong>${escapeHtml(props.lga_name)}</strong><br>
          LGA median/average rent: ${rentText}
        `);
      },
    }).addTo(map);
  }

  // Selected LGA suburbs layer.
  if (
    suburbGeojson &&
    suburbGeojson.features &&
    suburbGeojson.features.length
  ) {
    suburbRentLayer = L.geoJSON(suburbGeojson, {
      style: function (feature) {
        const rent = feature.properties.rent;

        return {
          color: "#ffffff",
          weight: 1.2,
          fillColor: getRentColor(rent),
          fillOpacity: rent ? 0.8 : 0.25,
        };
      },

      onEachFeature: function (feature, layer) {
        const props = feature.properties;
        const rentText = props.rent ? `$${props.rent}/week` : "No rent data";

        layer.bindPopup(`
          <strong>${escapeHtml(props.suburb_name)}</strong><br>
          ${props.postcode ? `Postcode: ${escapeHtml(props.postcode)}<br>` : ""}
          Median rent: ${rentText}
        `);

        layer.bindTooltip(props.suburb_name, {
          permanent: true,
          direction: "center",
          className: "suburb-label",
        });
      },
    }).addTo(map);
  }

  // Selected LGA outline.
  const selectedLgaBoundaryLayer = L.geoJSON(lgaGeojson, {
    interactive: false,
    style: {
      color: "#111",
      weight: 3,
      fillOpacity: 0,
    },
  }).addTo(map);

  map.fitBounds(selectedLgaBoundaryLayer.getBounds(), {
    padding: [20, 20],
  });
}

function getLgaRentColor(rent) {
  if (!rent) return "#eeeeee";

  const value = Number(rent);

  if (value >= 650) return "#4a148c";
  if (value >= 550) return "#7b1fa2";
  if (value >= 450) return "#ab47bc";
  if (value >= 350) return "#ce93d8";

  return "#f3e5f5";
}

function getRentColor(rent) {
  if (!rent) return "#cccccc";

  const value = Number(rent);

  if (budgetFilterActive && currentBudget) {
    return value <= currentBudget ? "#2e7d32" : "#c62828";
  }

  if (value >= 650) return "#7f0000";
  if (value >= 550) return "#c62828";
  if (value >= 450) return "#ef6c00";
  if (value >= 350) return "#f9a825";

  return "#2e7d32";
}

/* =========================================================
   Detail panel
   ========================================================= */

function showLgaDetail(lga) {
  selectedLGA = lga;

  const lgaDetailName = document.getElementById("lgaDetailName");
  const detailRentPrice = document.getElementById("detailRentPrice");
  const detailAffordability = document.getElementById("detailAffordability");
  const detailAffordabilityLabel = document.getElementById(
    "detailAffordabilityLabel",
  );
  const affordabilityBadge = document.getElementById("affordabilityBadge");
  const lgaDetailPanel = document.getElementById("lgaDetailPanel");

  if (lgaDetailName) {
    lgaDetailName.textContent = lga.name || "--";
  }

  const rent = Math.round(Number(lga.rent) || 0);

  if (detailRentPrice) {
    detailRentPrice.textContent = rent ? `$${rent}` : "No data";
  }

  if (userIncome && rent) {
    const affordabilityPercent = Math.round((rent / userIncome) * 100);

    if (detailAffordability) {
      detailAffordability.textContent = `${affordabilityPercent}%`;
    }

    if (detailAffordabilityLabel) {
      detailAffordabilityLabel.textContent = "of your weekly income";
    }

    let affordabilityClass = "affordability-affordable";
    let affordabilityText = "Affordable";

    if (affordabilityPercent > 45) {
      affordabilityClass = "affordability-unaffordable";
      affordabilityText = "Not Recommended";
    } else if (affordabilityPercent >= 30) {
      affordabilityClass = "affordability-stretched";
      affordabilityText = "Stretched";
    }

    if (affordabilityBadge) {
      affordabilityBadge.textContent = affordabilityText;
      affordabilityBadge.className = `affordability-badge ${affordabilityClass}`;
    }
  } else {
    if (detailAffordability) {
      detailAffordability.textContent = "--";
    }

    if (detailAffordabilityLabel) {
      detailAffordabilityLabel.textContent = "income not available";
    }

    if (affordabilityBadge) {
      affordabilityBadge.textContent = "No income data";
      affordabilityBadge.className = "affordability-badge";
    }
  }

  renderLgaTrendChart(lga);
  generateLgaTrendInsight(lga);

  if (lgaDetailPanel) {
    lgaDetailPanel.classList.remove("hidden");
  }
}

function closeDetailPanel() {
  const lgaDetailPanel = document.getElementById("lgaDetailPanel");
  if (lgaDetailPanel) {
    lgaDetailPanel.classList.add("hidden");
  }
}

function renderLgaTrendChart(lga) {
  if (trendChart) {
    trendChart.destroy();
    trendChart = null;
  }

  const canvas = document.getElementById("trendChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  const labels = lga.historyLabels || [];
  const data = (lga.history || []).map((value) =>
    value === null || value === undefined ? null : Number(value),
  );

  trendChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: `${lga.name} average weekly rent`,
          data: data,
          borderColor: "rgb(232, 84, 106)",
          backgroundColor: "rgba(232, 84, 106, 0.05)",
          borderWidth: 3,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: "rgb(232, 84, 106)",
          pointBorderColor: "#fff",
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
              return `$${Math.round(context.parsed.y)}/week`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: false,
          ticks: {
            callback: function (value) {
              return `$${value}`;
            },
          },
        },
      },
    },
  });
}

function generateLgaTrendInsight(lga) {
  const insight = document.getElementById("trendInsight");
  const badge = document.getElementById("trendStatusBadge");

  if (!insight || !badge) return;

  const history = (lga.history || [])
    .filter((value) => value !== null && value !== undefined)
    .map(Number);

  if (history.length < 2) {
    insight.textContent =
      "There is not enough trend data available for this area yet.";
    badge.textContent = "Limited data";
    badge.className = "affordability-badge";
    return;
  }

  const first = history[0];
  const latest = history[history.length - 1];

  if (!first || !latest) {
    insight.textContent =
      "There is not enough trend data available for this area yet.";
    badge.textContent = "Limited data";
    badge.className = "affordability-badge";
    return;
  }

  const change = latest - first;
  const percentChange = Math.round((change / first) * 100);

  if (percentChange >= 20) {
    badge.textContent = "Rising quickly";
    badge.className = "affordability-badge affordability-unaffordable";
    insight.textContent = `${lga.name} has become noticeably more expensive over time, with rents increasing by about ${percentChange}% across the available period.`;
  } else if (percentChange >= 8) {
    badge.textContent = "Rising";
    badge.className = "affordability-badge affordability-stretched";
    insight.textContent = `${lga.name} has seen rents rise by around ${percentChange}% across the available period. It may still be worth comparing nearby suburbs before deciding.`;
  } else if (percentChange > -5) {
    badge.textContent = "Relatively stable";
    badge.className = "affordability-badge affordability-affordable";
    insight.textContent = `${lga.name} has had relatively stable rent movement across the available period.`;
  } else {
    badge.textContent = "Falling";
    badge.className = "affordability-badge affordability-affordable";
    insight.textContent = `${lga.name} has become slightly cheaper across the available period, based on the rental trend shown.`;
  }
}

/* =========================================================
   Budget / map mode
   ========================================================= */

function handleBudgetFilter() {
  const budgetInput = document.getElementById("budgetInput");

  if (!budgetInput) return;

  const budget = Number(budgetInput.value);

  if (!budget || budget <= 0) {
    alert("Please enter a weekly rent budget.");
    return;
  }

  currentBudget = budget;
  budgetFilterActive = true;

  updateBudgetDisplay();
  updateMapModeBox();

  if (suburbRentLayer) {
    suburbRentLayer.setStyle(function (feature) {
      const rent = feature.properties.rent;

      return {
        color: "#ffffff",
        weight: 1.2,
        fillColor: getRentColor(rent),
        fillOpacity: rent ? 0.8 : 0.25,
      };
    });
  }

  renderSuburbBubbleChart();
}

function updateBudgetDisplay() {
  const budgetInput = document.getElementById("budgetInput");

  if (budgetInput && currentBudget) {
    budgetInput.value = currentBudget;
  }
}

function updateUserIncome(income) {
  userIncome = Number(income) || userIncome;
  updateMapModeBox();
  renderSuburbBubbleChart();
}

function updateMapModeBox() {
  const mapModeTitle = document.getElementById("mapModeTitle");
  const mapModeText = document.getElementById("mapModeText");
  const mapModeLegend = document.getElementById("mapModeLegend");

  if (!mapModeTitle || !mapModeText || !mapModeLegend) return;

  if (budgetFilterActive && currentBudget) {
    mapModeTitle.textContent = "Map mode: Budget View";
    mapModeText.textContent = `Suburbs are coloured by whether their weekly rent is within your $${currentBudget} budget.`;

    mapModeLegend.innerHTML = `
      <div class="budget-legend-item">
        <span class="budget-legend-dot affordable"></span>
        Within budget
      </div>
      <div class="budget-legend-item">
        <span class="budget-legend-dot unaffordable"></span>
        Above budget
      </div>
    `;
  } else {
    mapModeTitle.textContent = "Map mode: Rent View";
    mapModeText.textContent = "Suburbs are coloured by weekly rent.";

    mapModeLegend.innerHTML = `
      <div class="budget-legend-item">
        <span class="budget-legend-dot affordable"></span>
        Lower rent
      </div>
      <div class="budget-legend-item">
        <span class="budget-legend-dot unaffordable"></span>
        Higher rent
      </div>
    `;
  }
}

function resetMapToUserArea() {
  if (!userDefaultLGAName || !userDefaultLGACode) {
    alert("Your saved profile location is not available.");
    return;
  }

  const selectedLgaInput = document.getElementById("selectedLgaInput");
  const selectedLgacodeInput = document.getElementById("selectedLgacodeInput");
  const display = document.getElementById("resolvedLgaDisplay");

  if (selectedLgaInput) selectedLgaInput.value = userDefaultLGAName;
  if (selectedLgacodeInput) selectedLgacodeInput.value = userDefaultLGACode;

  if (display) {
    display.textContent = `Local Government Area: ${userDefaultLGAName}`;
    display.style.display = "block";
  }

  handleLGASelect(userDefaultLGAName, userDefaultLGACode);
}

/* =========================================================
   Bubble chart
   ========================================================= */

async function loadSuburbBubbleData(lgacode) {
  try {
    suburbBubbleData = await fetchJson(
      apiUrl(
        `/api/suburb-comparison-data?lgacode=${encodeURIComponent(lgacode)}`,
      ),
    );

    renderAddedSuburbTags();
    renderSuburbBubbleChart();
  } catch (error) {
    console.error("Error loading suburb bubble data:", error);
    suburbBubbleData = [];
    renderSuburbBubbleChart();
  }
}

async function addSuburbToBubbleChart(locality, postcode) {
  try {
    const suburb = await fetchJson(
      apiUrl(
        `/api/suburb-comparison-one?locality=${encodeURIComponent(
          locality,
        )}&postcode=${encodeURIComponent(postcode)}`,
      ),
    );

    if (!suburb || !suburb.suburb_name) {
      alert("Could not load comparison data for that suburb.");
      return;
    }

    const alreadyInLga = suburbBubbleData.some(
      (row) =>
        row.suburb_name === suburb.suburb_name &&
        String(row.postcode) === String(suburb.postcode),
    );

    const alreadyAdded = addedBubbleSuburbs.some(
      (row) =>
        row.suburb_name === suburb.suburb_name &&
        String(row.postcode) === String(suburb.postcode),
    );

    if (alreadyInLga) {
      alert("This suburb is already shown in the selected LGA.");
      return;
    }

    if (!alreadyAdded) {
      addedBubbleSuburbs.push(suburb);
      renderAddedSuburbTags();
    }

    renderSuburbBubbleChart();
  } catch (error) {
    console.error("Error adding suburb to bubble chart:", error);
  }
}

function getBubbleMetricLabel(metric) {
  const labels = {
    rent: "Weekly rent ($)",
    rent_income_pct: "% income spent on rent",
    rent_growth_pct: "Rent growth (%)",
    supermarket_count: "Supermarket count",
    train_station_count: "Train station count",
    hospital_count: "Hospital count",
    pharmacy_count: "Pharmacy count",
    parks_count: "Parks",
    gyms_count: "Gyms",
    libraries_count: "Libraries",
    cafes_count: "Cafes",
  };

  return labels[metric] || metric;
}

function getBubbleValue(row, metric) {
  if (metric === "rent_income_pct") {
    if (!userIncome || !row.rent) return null;
    return Math.round((Number(row.rent) / Number(userIncome)) * 100);
  }

  const value = row[metric];

  if (value === null || value === undefined || value === "") {
    return null;
  }

  return Number(value);
}

function renderSuburbBubbleChart() {
  const canvas = document.getElementById("suburbBubbleChart");
  const insightsContainer = document.getElementById("bubbleChartInsights");

  if (!canvas) return;

  const xMetric = document.getElementById("bubbleXAxis")?.value || "rent";
  const yMetric =
    document.getElementById("bubbleYAxis")?.value || "train_station_count";
  const sizeMetric =
    document.getElementById("bubbleSizeMetric")?.value || "parks_count";

  const combinedData = [
    ...suburbBubbleData.map((row) => ({ ...row, isAddedSuburb: false })),
    ...addedBubbleSuburbs.map((row) => ({ ...row, isAddedSuburb: true })),
  ];

  if (!combinedData.length) {
    if (suburbBubbleChart) {
      suburbBubbleChart.destroy();
      suburbBubbleChart = null;
    }

    if (insightsContainer) {
      insightsContainer.innerHTML = `
        <li>Select an area to compare suburbs by affordability and access.</li>
      `;
    }

    return;
  }

  const points = combinedData
    .map((row) => {
      const x = getBubbleValue(row, xMetric);
      const y = getBubbleValue(row, yMetric);
      const sizeValue = getBubbleValue(row, sizeMetric) || 0;

      if (x === null || y === null || Number.isNaN(x) || Number.isNaN(y)) {
        return null;
      }

      const isWithinBudget =
        currentBudget && row.rent && Number(row.rent) <= Number(currentBudget);

      return {
        x,
        y,
        r: Math.max(10, Math.min(40, 10 + sizeValue * 2.2)),
        suburb: row.suburb_name,
        postcode: row.postcode,
        rent: Number(row.rent) || null,
        sizeValue,
        isWithinBudget,
        isAddedSuburb: row.isAddedSuburb,
        raw: row,
      };
    })
    .filter(Boolean);

  if (!points.length) {
    if (suburbBubbleChart) {
      suburbBubbleChart.destroy();
      suburbBubbleChart = null;
    }

    if (insightsContainer) {
      insightsContainer.innerHTML = `
        <li>No suburbs have enough data for this comparison. Try another metric.</li>
      `;
    }

    return;
  }

  markSweetSpotPoints(points);

  generateBubbleChartInsights(points, xMetric, yMetric, sizeMetric);

  if (suburbBubbleChart) {
    suburbBubbleChart.destroy();
    suburbBubbleChart = null;
  }

  const ctx = canvas.getContext("2d");

  suburbBubbleChart = new Chart(ctx, {
    type: "bubble",
    data: {
      datasets: [
        {
          label: "Suburbs",
          data: points,
          backgroundColor: points.map((point) => {
            if (point.isSweetSpot) return "rgba(47, 90, 168, 0.35)";
            if (point.isAddedSuburb) return "rgba(47, 90, 168, 0.35)";

            return point.isWithinBudget
              ? "rgba(232, 84, 106, 0.38)"
              : "rgba(120, 120, 120, 0.12)";
          }),
          borderColor: points.map((point) => {
            if (point.isSweetSpot) return "rgba(47, 90, 168, 0.95)";
            if (point.isAddedSuburb) return "rgba(47, 90, 168, 0.95)";

            return point.isWithinBudget
              ? "rgba(232, 84, 106, 0.9)"
              : "rgba(140, 140, 140, 0.28)";
          }),
          borderWidth: points.map((point) => {
            if (point.isSweetSpot) return 4;
            if (point.isAddedSuburb) return 3;
            return 1.5;
          }),
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,

      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const point = context.raw;

              return [
                point.suburb,
                `${getBubbleMetricLabel(xMetric)}: ${point.x}`,
                `${getBubbleMetricLabel(yMetric)}: ${point.y}`,
                `${getBubbleMetricLabel(sizeMetric)}: ${point.sizeValue}`,
                point.rent ? `Weekly rent: $${point.rent}` : "Rent unavailable",
                point.isWithinBudget ? "Within budget" : "Above budget",
                point.isSweetSpot ? "Sweet spot suburb" : "",
                point.isAddedSuburb
                  ? "Added comparison suburb"
                  : "Selected LGA suburb",
              ].filter(Boolean);
            },
          },
        },
      },

      scales: {
        x: {
          reverse: xMetric === "rent" || xMetric === "rent_income_pct",
          title: {
            display: true,
            text: getBubbleMetricLabel(xMetric),
          },
        },
        y: {
          title: {
            display: true,
            text: getBubbleMetricLabel(yMetric),
          },
        },
      },
    },
    plugins: [quadrantPlugin],
  });
}

function markSweetSpotPoints(points) {
  const xValues = points.map((point) => point.x);
  const yValues = points.map((point) => point.y);

  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);

  const xMidValue = (xMin + xMax) / 2;
  const yMidValue = (yMin + yMax) / 2;

  points.forEach((point) => {
    // Lower x is better for rent/rent_income_pct. Higher y is better for access metrics.
    point.isSweetSpot = point.x <= xMidValue && point.y >= yMidValue;
  });
}

function renderAddedSuburbTags() {
  const container = document.getElementById("addedSuburbTags");
  if (!container) return;

  if (!addedBubbleSuburbs.length) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = addedBubbleSuburbs
    .map(
      (suburb) => `
        <div class="added-suburb-tag">
          ${escapeHtml(suburb.suburb_name)}
        </div>
      `,
    )
    .join("");
}

function generateBubbleChartInsights(points, xMetric, yMetric, sizeMetric) {
  const insightsContainer = document.getElementById("bubbleChartInsights");

  if (!insightsContainer || !points.length) return;

  const sweetSpotSuburbs = points
    .filter((point) => point.isSweetSpot)
    .map((point) => point.suburb);

  const withinBudgetCount = points.filter(
    (point) => point.isWithinBudget,
  ).length;

  const insights = [];

  if (currentBudget) {
    insights.push(
      `${withinBudgetCount} of ${points.length} displayed suburbs are within your selected weekly rent budget of $${currentBudget}.`,
    );
  }

  if (sweetSpotSuburbs.length > 0) {
    insights.push(`
      <strong>Sweet spot suburbs:</strong>
      <div class="sweet-spot-tags">
      ${points
        .filter((point) => point.isSweetSpot)
        .slice(0, 8)
        .map((point) => `
          <div class="sweet-spot-card">
            <strong>${escapeHtml(point.suburb)}</strong>
            <span>🏠 Rent: $${point.rent ?? "N/A"}/wk</span>
            <span>${getBubbleMetricLabel(yMetric)}: ${point.y}</span>
            <span>${getBubbleMetricLabel(sizeMetric)}: ${point.sizeValue}</span>
          </div>
        `).join("")}
      </div>
      <p class="sweet-spot-note">
        These suburbs combine lower cost with higher access based on your selected comparison.
      </p>
    `);
  } else {
    insights.push(`
      <strong>No suburb is currently in the sweet spot.</strong>
      <p class="sweet-spot-note">
        Try changing the comparison options or adding another suburb to compare.
      </p>
    `);
  }

  insightsContainer.innerHTML = insights
    .map((insight) => `<li>${insight}</li>`)
    .join("");
}

/* =========================================================
   Footer modals
   ========================================================= */

function initializeFooterModals() {
  setupModal("tosModalTrigger", "tosModal", "tosModalClose");
  setupModal("absDataBtn", "absModal", "absModalClose");
}

function setupModal(triggerId, modalId, closeId) {
  const trigger = document.getElementById(triggerId);
  const modal = document.getElementById(modalId);
  const close = document.getElementById(closeId);

  if (!trigger || !modal || !close) return;

  trigger.addEventListener("click", function (event) {
    event.preventDefault();
    modal.classList.remove("hidden");
  });

  close.addEventListener("click", function () {
    modal.classList.add("hidden");
  });

  modal.addEventListener("click", function (event) {
    if (event.target === modal) {
      modal.classList.add("hidden");
    }
  });
}

/* =========================================================
   Rent comparison tutorial
   ========================================================= */

function initializeRentComparisonTutorial() {
  const tutorialFab = document.getElementById("tutorialFab");
  const overlay = document.getElementById("tutorialOverlay");
  const highlight = document.getElementById("tutorialHighlight");
  const popover = document.getElementById("tutorialPopover");
  const stepLabel = document.getElementById("tutorialStepLabel");
  const title = document.getElementById("tutorialTitle");
  const description = document.getElementById("tutorialDesc");
  const skipButton = document.getElementById("tutorialSkipBtn");
  const nextButton = document.getElementById("tutorialNextBtn");

  if (
    !tutorialFab ||
    !overlay ||
    !highlight ||
    !popover ||
    !stepLabel ||
    !title ||
    !description ||
    !skipButton ||
    !nextButton
  ) {
    return;
  }

  const tutorialSteps = [
    {
      targetId: "locationSearchInput",
      title: "Search your area",
      desc: "Type a suburb or postcode to zoom the map to your area and see local rent prices.",
    },
    {
      targetId: "budgetInput",
      title: "Set your budget",
      desc: "Enter your weekly rent budget and tap the button to highlight only the suburbs you can afford.",
    },
    {
      targetId: "mapContainer",
      title: "Explore the map",
      desc: "Suburbs are coloured by weekly rent. Tap any suburb to see detailed rent data, affordability, and trend information.",
    },
    {
      targetId: "suburbBubbleChart",
      title: "Bubble chart view",
      desc: "Use the bubble chart to compare suburbs across rent, transport, and lifestyle access.",
    },
    {
      targetId: "lgaDetailPanel",
      title: "Suburb detail panel",
      desc: "When you tap a suburb on the map, the full breakdown appears here including rent, affordability rating, and trend information.",
    },
  ];

  let currentTutorialStep = 0;
  let tutorialActive = false;

  function startTutorial() {
    currentTutorialStep = 0;
    tutorialActive = true;

    overlay.classList.remove("hidden");
    highlight.classList.remove("hidden");
    popover.classList.remove("hidden");

    document.body.style.overflow = "hidden";

    renderTutorialStep();
  }

  function endTutorial() {
    tutorialActive = false;

    overlay.classList.add("hidden");
    highlight.classList.add("hidden");
    popover.classList.add("hidden");

    document.body.style.overflow = "";
  }

  function nextTutorialStep() {
    if (currentTutorialStep >= tutorialSteps.length - 1) {
      endTutorial();
      return;
    }

    currentTutorialStep += 1;
    renderTutorialStep();
  }

  function renderTutorialStep() {
    const step = tutorialSteps[currentTutorialStep];
    const target = document.getElementById(step.targetId);

    if (!target) {
      nextTutorialStep();
      return;
    }

    target.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    // Wait for scroll movement before measuring the target position.
    window.setTimeout(function () {
      positionTutorialHighlight(target);
      positionTutorialPopover(target);

      stepLabel.textContent = `Step ${currentTutorialStep + 1} of ${tutorialSteps.length}`;
      title.textContent = step.title;
      description.textContent = step.desc;
      nextButton.textContent =
        currentTutorialStep === tutorialSteps.length - 1 ? "Finish" : "Next";
    }, 250);
  }

  function positionTutorialHighlight(target) {
    const rect = target.getBoundingClientRect();
    const padding = 12;

    highlight.style.top = `${Math.max(rect.top - padding, 16)}px`;
    highlight.style.left = `${Math.max(rect.left - padding, 16)}px`;
    highlight.style.width = `${Math.min(
      rect.width + padding * 2,
      window.innerWidth - 32,
    )}px`;
    highlight.style.height = `${rect.height + padding * 2}px`;
  }

  function positionTutorialPopover(target) {
    const rect = target.getBoundingClientRect();
    const popoverWidth = Math.min(360, window.innerWidth - 32);
    const gap = 18;

    let top = rect.bottom + gap;
    let left = rect.left;

    if (top + 260 > window.innerHeight) {
      top = rect.top - 260 - gap;
    }

    if (left + popoverWidth > window.innerWidth - 16) {
      left = window.innerWidth - popoverWidth - 16;
    }

    if (left < 16) {
      left = 16;
    }

    if (top < 16) {
      top = 16;
    }

    popover.style.top = `${top}px`;
    popover.style.left = `${left}px`;
  }

  tutorialFab.addEventListener("click", startTutorial);
  skipButton.addEventListener("click", endTutorial);
  nextButton.addEventListener("click", nextTutorialStep);

  window.addEventListener("resize", function () {
    if (!tutorialActive) return;
    renderTutorialStep();
  });

  document.addEventListener("keydown", function (event) {
    if (tutorialActive && event.key === "Escape") {
      endTutorial();
    }
  });
}

/* =========================================================
   Utils
   ========================================================= */

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
