// income_comparison.js
// Purpose:
// 1. Show the user's profile
// 2. Load SA3 female annual income data
// 3. Colour SA3 areas based on comparison with user's estimated annual income
// 4. Show SA3 labels, hover tooltips, selected boundary, and trend line

// -----------------------------
// GLOBAL VARIABLES
// -----------------------------

let userProfile = {};
let incomeMap = null;
let sa3IncomeLayer = null;
let sa3LabelLayer = null;
let selectedSa3BoundaryLayer = null;
let sa3IncomeData = null;
let incomeTrendChart = null;

// -----------------------------
// PAGE LOAD
// -----------------------------

document.addEventListener("DOMContentLoaded", async function () {
  loadUserProfile();
  initialiseIncomeMap();
  initialiseEventListeners();

  await loadSa3IncomeMap();
  await prefillSa3FromUserLocation();
});

// -----------------------------
// 1. LOAD USER PROFILE
// -----------------------------

function loadUserProfile() {
  userProfile = window.userProfileData || {};

  const locationText =
    userProfile.locality && userProfile.postcode
      ? `${userProfile.locality} (${userProfile.postcode})`
      : userProfile.locality || "Not provided";

  setTextIfExists("profileAge", userProfile.age || "--");
  setTextIfExists("profileLocation", locationText);
  setTextIfExists("profileWorkStatus", userProfile.workStatus || "--");
  setTextIfExists("profileIndustry", userProfile.industry || "--");

  setTextIfExists(
    "profileIncome",
    userProfile.income
      ? `$${Number(userProfile.income).toLocaleString()}/week`
      : "--",
  );

  setTextIfExists("profileLiving", userProfile.living || "--");
}

function setTextIfExists(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value;
  }
}

// -----------------------------
// 2. INITIALISE MAP
// -----------------------------

// -----------------------------
// 2. INITIALISE MAP
// -----------------------------

function initialiseIncomeMap() {
  // Victoria's geographic bounding box
  const victoriaBounds = L.latLngBounds(
    L.latLng(-39.2, 140.95), // South-West corner
    L.latLng(-33.98, 150.1), // North-East corner
  );

  incomeMap = L.map("incomeMapContainer", {
    maxBounds: victoriaBounds, // Prevent panning outside Victoria
    maxBoundsViscosity: 1.0, // Hard lock — snaps back on drag
    minZoom: 6, // Prevent zooming out to see other states
    maxZoom: 18,
  }).setView([-37.4713, 144.7852], 7);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "© OpenStreetMap contributors",
  }).addTo(incomeMap);
}

// -----------------------------
// 3. LOAD SA3 GEOJSON
// -----------------------------

// -----------------------------
// 3. LOAD SA3 GEOJSON
// -----------------------------

async function loadSa3IncomeMap() {
  try {
    const response = await fetch("/api/sa3-income-map");

    if (!response.ok) {
      throw new Error("Failed to load SA3 income map data");
    }

    const rawData = await response.json();

    // Filter to Victoria-only SA3 areas (ABS SA3 codes 20000–29999)
    sa3IncomeData = {
      ...rawData,
      features: rawData.features.filter((feature) => {
        const code = String(feature.properties.sa3_code).trim();
        return code.startsWith("2") && code.length === 5;
      }),
    };

    if (!sa3IncomeData.features || sa3IncomeData.features.length === 0) {
      document.getElementById("incomeMapContainer").innerHTML =
        "No SA3 income map data found.";
      return;
    }

    // Draw SA3 polygons
    sa3IncomeLayer = L.geoJSON(sa3IncomeData, {
      style: styleSa3IncomeArea,
      onEachFeature: onEachSa3Feature,
    }).addTo(incomeMap);

    // Add permanent SA3 name labels
    addSa3Labels();

    // Add legend/text explanation under the map
    createIncomeLegend();

    // Only zoom to all Victoria SA3s if the user has no saved location.
    // If the user has postcode/locality, prefillSa3FromUserLocation()
    // will zoom to the user's SA3 instead.
    const hasUserLocation = userProfile.postcode || userProfile.locality;

    if (!hasUserLocation) {
      const bounds = sa3IncomeLayer.getBounds();
      if (bounds.isValid()) {
        incomeMap.fitBounds(bounds);
      }
    }
  } catch (error) {
    console.error("Error loading SA3 income map:", error);
    const mapContainer = document.getElementById("incomeMapContainer");
    if (mapContainer) {
      mapContainer.innerHTML = "Unable to load SA3 income map.";
    }
  }
}

// -----------------------------
// 4. PRE-FILL SA3 FROM USER POSTCODE/LOCALITY
// -----------------------------
async function prefillSa3FromUserLocation() {
  if (!userProfile.postcode && !userProfile.locality) return;
  if (!sa3IncomeData || !sa3IncomeData.features) return;

  try {
    const params = new URLSearchParams({
      postcode: userProfile.postcode || "",
      locality: userProfile.locality || "",
    });

    const response = await fetch(`/api/sa3-from-location?${params.toString()}`);

    if (!response.ok) {
      throw new Error("Failed to find SA3 from user location");
    }

    const sa3 = await response.json();

    console.log("SA3 from user location:", sa3);
    console.log(
      "Available SA3 sample:",
      sa3IncomeData.features.slice(0, 5).map((f) => f.properties),
    );

    if (!sa3.sa3_code || !sa3.sa3_name) {
      console.warn("No matching SA3 found for user location.");
      return;
    }

    const matchedFeature = sa3IncomeData.features.find(
      (feature) =>
        String(feature.properties.sa3_code).trim() ===
        String(sa3.sa3_code).trim(),
    );

    console.log("Matched SA3 feature:", matchedFeature);

    if (matchedFeature) {
      selectSa3Feature(matchedFeature);
    } else {
      console.warn(
        "SA3 code found from location but not found in map GeoJSON:",
        sa3.sa3_code,
      );
    }
  } catch (error) {
    console.error("Error pre-filling SA3:", error);
  }
}

// -----------------------------
// 5. MAP COLOURING
// -----------------------------

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
  // Grey if missing SA3 income or user income
  if (!sa3Income || !userAnnualIncome) return "#d9d9d9";

  const difference = sa3Income - userAnnualIncome;
  const percentDifference = Math.abs(difference) / userAnnualIncome;

  // Similar if within 10%
  if (percentDifference <= 0.1) return "#f9a825";

  // Green means SA3 average is below user income
  if (difference < 0) return "#2e7d32";

  // Red means SA3 average is above user income
  return "#c62828";
}

// -----------------------------
// 6. LEGEND / EXPLANATION BOX
// -----------------------------

function createIncomeLegend() {
  const mapCard = document.querySelector(".map-card");

  if (!mapCard || document.getElementById("incomeLegendBox")) return;

  const userAnnualIncome = getUserAnnualIncome();

  const legend = document.createElement("div");
  legend.id = "incomeLegendBox";
  legend.className = "map-mode-box";

  legend.innerHTML = `
    <strong>Map colouring: Income Comparison</strong>
    <p>
      SA3 areas are coloured by comparing young female annual income in each SA3
      with your estimated annual income.
      ${
        userAnnualIncome
          ? `Your estimated annual income is <strong>${formatAnnualMoney(userAnnualIncome)}</strong>.`
          : `Enter your income in your profile to enable comparison colouring.`
      }
    </p>

    <div class="map-mode-legend">
      <div class="map-mode-item"><span class="map-dot green"></span>SA3 average below your income</div>
      <div class="map-mode-item"><span class="map-dot yellow"></span>Similar to your income</div>
      <div class="map-mode-item"><span class="map-dot red"></span>SA3 average above your income</div>
      <div class="map-mode-item"><span class="map-dot grey"></span>No data / no user income</div>
    </div>
  `;

  mapCard.appendChild(legend);
}

// -----------------------------
// 7. SA3 LABELS
// -----------------------------

function addSa3Labels() {
  sa3LabelLayer = L.layerGroup().addTo(incomeMap);

  sa3IncomeData.features.forEach((feature) => {
    const props = feature.properties;

    // Use polygon bounds centre as label position
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

// -----------------------------
// 8. HOVER + CLICK EVENTS
// -----------------------------

function onEachSa3Feature(feature, layer) {
  layer.on({
    click: function () {
      // Guard: only allow interaction with Victorian SA3s (codes 20000–29999)
      const code = String(feature.properties.sa3_code).trim();
      if (!code.startsWith("2") || code.length !== 5) return;

      selectSa3Feature(feature);
    },
    mouseover: function (e) {
      const layer = e.target;
      layer.setStyle({
        weight: 2,
        color: "#333333",
        fillOpacity: 0.9,
      });
      layer.bringToFront();
    },
    mouseout: function (e) {
      sa3IncomeLayer.resetStyle(e.target);
      if (selectedSa3BoundaryLayer) {
        selectedSa3BoundaryLayer.bringToFront();
      }
    },
  });
}

// -----------------------------
// 9. SELECT SA3
// -----------------------------

function selectSa3Feature(feature) {
  const props = feature.properties;

  document.getElementById("sa3Input").value = props.sa3_name || "";
  document.getElementById("selectedSa3Input").value = props.sa3_name || "";
  document.getElementById("selectedSa3CodeInput").value = props.sa3_code || "";

  document.getElementById("sa3Suggestions").innerHTML = "";

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

// -----------------------------
// 10. DRAW SELECTED BOUNDARY
// -----------------------------

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

// -----------------------------
// 11. DETAIL PANEL
// -----------------------------

function showSa3DetailPanel(props) {
  const panel = document.getElementById("sa3DetailPanel");

  document.getElementById("sa3DetailName").textContent = props.sa3_name || "--";

  document.getElementById("detailAverageIncome").textContent =
    formatAnnualMoney(props.income_2022_23);

  const userAnnualIncome = getUserAnnualIncome();

  document.getElementById("detailUserIncome").textContent = userAnnualIncome
    ? formatAnnualMoney(userAnnualIncome)
    : "--";

  updateIncomeComparison(props.income_2022_23);
  renderIncomeTrendChart(props);
  generateIncomeTrendInsight(props);

  panel.classList.remove("hidden");
}

// -----------------------------
// 12. COMPARISON TEXT
// -----------------------------

function updateIncomeComparison(sa3AnnualIncome) {
  const badge = document.getElementById("incomeComparisonBadge");
  const insight = document.getElementById("incomeInsight");

  const userAnnualIncome = getUserAnnualIncome();

  if (!userAnnualIncome || !sa3AnnualIncome) {
    badge.textContent = "Not enough data";
    insight.textContent =
      "Enter your income in your profile to compare it with the SA3 annual average.";
    return;
  }

  const difference = userAnnualIncome - sa3AnnualIncome;
  const percentage = Math.round((Math.abs(difference) / sa3AnnualIncome) * 100);

  if (Math.abs(difference) < userAnnualIncome * 0.1) {
    badge.textContent = "Similar income level";
    insight.textContent =
      "Your estimated annual income is similar to the young female average income in this SA3 area.";
  } else if (difference > 0) {
    badge.textContent = `${percentage}% above SA3 average`;
    insight.textContent = `Your estimated annual income is ${percentage}% higher than the young female average income in this SA3 area.`;
  } else {
    badge.textContent = `${percentage}% below SA3 average`;
    insight.textContent = `Your estimated annual income is ${percentage}% lower than the young female average income in this SA3 area.`;
  }
}

// -----------------------------
// 13. TREND LINE
// -----------------------------

function renderIncomeTrendChart(props) {
  const chartCanvas = document.getElementById("incomeTrendChart");

  if (!chartCanvas) {
    console.warn("incomeTrendChart canvas not found in HTML.");
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

// -----------------------------
// 14. TREND INSIGHT
// -----------------------------

function generateIncomeTrendInsight(props) {
  const trendStatusBadge = document.getElementById("incomeTrendStatusBadge");
  const trendInsight = document.getElementById("incomeTrendInsight");

  if (!trendStatusBadge || !trendInsight) return;

  const history = (props.history || []).filter(
    (value) => value !== null && value !== undefined,
  );
  const labels = props.history_labels || [];

  if (history.length < 2) {
    trendStatusBadge.textContent = "No trend data";
    trendInsight.innerHTML = `Not enough income history is available for ${props.sa3_name}.`;
    return;
  }

  const firstIncome = history[0];
  const lastIncome = history[history.length - 1];

  const totalChange = lastIncome - firstIncome;
  const percentChange = Math.round((totalChange / firstIncome) * 100);

  let status = "Stable";
  let statusClass = "affordability-affordable";

  if (percentChange > 10) {
    status = "Rising";
    statusClass = "affordability-affordable";
  } else if (percentChange < -10) {
    status = "Declining";
    statusClass = "affordability-unaffordable";
  }

  trendStatusBadge.textContent = status;
  trendStatusBadge.className = `affordability-badge ${statusClass}`;

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

// -----------------------------
// 15. EVENT LISTENERS
// -----------------------------

function initialiseEventListeners() {
  const closeBtn = document.getElementById("closeSa3DetailBtn");
  const sa3Input = document.getElementById("sa3Input");
  const dropdownBtn = document.getElementById("sa3DropdownBtn");

  if (closeBtn) {
    closeBtn.addEventListener("click", function () {
      document.getElementById("sa3DetailPanel").classList.add("hidden");

      if (incomeTrendChart) {
        incomeTrendChart.destroy();
        incomeTrendChart = null;
      }

      if (selectedSa3BoundaryLayer) {
        incomeMap.removeLayer(selectedSa3BoundaryLayer);
        selectedSa3BoundaryLayer = null;
      }
    });
  }

  if (sa3Input) {
    sa3Input.addEventListener("input", function () {
      filterSa3Suggestions(this.value);
    });
  }

  if (dropdownBtn) {
    dropdownBtn.addEventListener("click", function () {
      if (!sa3IncomeData || !sa3IncomeData.features) return;
      filterSa3Suggestions(sa3Input.value || "");
    });
  }

  document.addEventListener("click", function (event) {
    const suggestionsBox = document.getElementById("sa3Suggestions");

    if (
      suggestionsBox &&
      !event.target.closest("#sa3Input") &&
      !event.target.closest("#sa3DropdownBtn") &&
      !event.target.closest("#sa3Suggestions")
    ) {
      suggestionsBox.innerHTML = "";
    }
  });
}

// -----------------------------
// 16. SA3 SEARCH DROPDOWN
// -----------------------------

function filterSa3Suggestions(searchText) {
  const suggestionsBox = document.getElementById("sa3Suggestions");

  if (!suggestionsBox) return;

  suggestionsBox.innerHTML = "";

  if (!sa3IncomeData || !sa3IncomeData.features) return;

  const cleanSearchText = searchText.trim().toLowerCase();

  const matches = sa3IncomeData.features
    .filter((feature) => {
      const sa3Name = feature.properties.sa3_name || "";
      return (
        !cleanSearchText || sa3Name.toLowerCase().includes(cleanSearchText)
      );
    })
    .slice(0, 12);

  if (matches.length === 0) {
    const emptyItem = document.createElement("div");
    emptyItem.className = "location-suggestion-item";
    emptyItem.textContent = "No SA3 found";
    suggestionsBox.appendChild(emptyItem);
    return;
  }

  matches.forEach((feature) => {
    const item = document.createElement("div");

    item.className = "location-suggestion-item";
    item.textContent = feature.properties.sa3_name;

    item.addEventListener("click", function () {
      selectSa3Feature(feature);
    });

    suggestionsBox.appendChild(item);
  });
}

// -----------------------------
// 17. FIND LAYER BY SA3 CODE
// -----------------------------
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

// -----------------------------
// 18. HELPER FUNCTIONS
// -----------------------------

function getUserAnnualIncome() {
  if (!userProfile.income) return null;

  // Current app profile income is weekly
  return Number(userProfile.income) * 52;
}

function formatAnnualMoney(value) {
  if (value === null || value === undefined || value === "") return "--";

  return `$${Number(value).toLocaleString()}/year`;
}

// Terms of Service modal
document.addEventListener("DOMContentLoaded", function () {
  const tosModalTrigger = document.getElementById("tosModalTrigger");
  const tosModal = document.getElementById("tosModal");
  const tosModalClose = document.getElementById("tosModalClose");

  if (!tosModalTrigger || !tosModal || !tosModalClose) {
    return;
  }

  tosModalTrigger.addEventListener("click", function () {
    tosModal.classList.remove("hidden");
  });

  tosModalClose.addEventListener("click", function () {
    tosModal.classList.add("hidden");
  });

  tosModal.addEventListener("click", function (event) {
    if (event.target === tosModal) {
      tosModal.classList.add("hidden");
    }
  });
});

// ABS Data Sources modal
document.addEventListener("DOMContentLoaded", function () {
  const absDataBtn = document.getElementById("absDataBtn");
  const absModal = document.getElementById("absModal");
  const absModalClose = document.getElementById("absModalClose");

  if (!absDataBtn || !absModal || !absModalClose) {
    return;
  }

  function openAbsModal() {
    absModal.classList.remove("hidden");
  }

  function closeAbsModal() {
    absModal.classList.add("hidden");
  }

  absDataBtn.addEventListener("click", openAbsModal);
  absModalClose.addEventListener("click", closeAbsModal);

  // Close when clicking outside the modal box
  absModal.addEventListener("click", function (event) {
    if (event.target === absModal) {
      closeAbsModal();
    }
  });

  // Close with Escape key
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !absModal.classList.contains("hidden")) {
      closeAbsModal();
    }
  });
});
