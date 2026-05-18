// Rent Comparison Page - JavaScript
let lgaRentLayer = null;
let suburbRentLayer = null;
let currentLgaRentGeoJson = null;
let currentSuburbs = [];
let currentLgaGeoJson = null;
let map = null;
let suburbGeoJsonLayer = null;
let currentGeoJson = null;
let budgetFilterActive = false;
// let selectedState = null;
// let selectedLGA = null;
let selectedLGAName = null;
let selectedSuburb = null;
let currentBudget = null;
let userIncome = null;
let trendChart = null;
let userDefaultLGAName = null;
let userDefaultLGACode = null;

let suburbBubbleChart = null;
let suburbBubbleData = [];
let addedBubbleSuburbs = [];

const quadrantPlugin = {
  id: "quadrantPlugin",
  
  afterDraw(chart) {
    const { ctx, chartArea, scales } = chart;
    const xScale = scales.x;
    const yScale = scales.y;

    const xMidValue = (xScale.min + xScale.max) / 2;
    const yMidValue = (yScale.min + yScale.max) / 2;

    const xMid = xScale.getPixelForValue(xMidValue);
    const yMid = yScale.getPixelForValue(yMidValue);

    ctx.save();
    // Highlight sweet spot quadrant: top-right
ctx.fillStyle = "rgba(79, 111, 216, 0.08)";
ctx.fillRect(
  xMid,
  chartArea.top,
  chartArea.right - xMid,
  yMid - chartArea.top
);

ctx.strokeStyle = "rgba(47, 90, 168, 0.55)";
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

ctx.fillStyle = "rgba(28, 23, 20, 0.75)";
ctx.font = "12px Inter";

ctx.fillText(
  "Higher cost + Higher access",
  chartArea.left + 140,
  chartArea.top + 22
);

ctx.fillText(
  "Higher cost + Lower access",
  chartArea.left + 140,
  chartArea.bottom - 12
);

ctx.fillText(
  "Lower cost + Lower access",
  chartArea.right - 140,
  chartArea.bottom - 12
);

// Sweet spot label
ctx.fillStyle = "#2f4fb8";
ctx.font = "bold 13px Inter";

ctx.fillText(
  "★ Sweet spot: Lower cost + Higher access",
  chartArea.right - 170,
  chartArea.top + 24
);

    ctx.restore();
  }
};

// Initialize page
document.addEventListener("DOMContentLoaded", async function () {
  initializeEventListeners();
  await loadLgaRentLayer();
  loadUserData();
});

async function loadLgaRentLayer() {
  try {
    // const response = await fetch(`${BASE_PATH}/api/lga-rent-map`);
    const response = await fetch(`/api/lga-rent-map`);
    currentLgaRentGeoJson = await response.json();
    console.log("Loaded all LGA rent layer:", currentLgaRentGeoJson);
  } catch (error) {
    console.error("Error loading LGA rent layer:", error);
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
      const response = await fetch(`/api/locations?q=${encodeURIComponent(query)}`);
      const locations = await response.json();

      if (!locations.length) {
        suggestions.innerHTML = `
          <div class="location-suggestion-item no-result">No matching suburb found</div>`;
        return;
      }

      suggestions.innerHTML = locations.map(item => `
        <button type="button" class="location-suggestion-item"
          data-locality="${item.locality}" data-postcode="${item.postcode}">
          ${item.locality} (${item.postcode})
        </button>
      `).join("");

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

    input.value = `${locality} (${postcode})`;
    suggestions.innerHTML = "";

    if (onSelect) {
      onSelect({ locality, postcode });
    }
  });
}

function initializeEventListeners() {
  const locationSearchInput = document.getElementById("locationSearchInput");
  const locationSearchSuggestions = document.getElementById("locationSearchSuggestions");
  const selectedLgaInput = document.getElementById("selectedLgaInput");
  const selectedLgacodeInput = document.getElementById("selectedLgacodeInput");

  const resetMapBtn = document.getElementById("resetMapBtn");
  if (resetMapBtn) {
    resetMapBtn.addEventListener("click", resetMapToUserArea);
  }

  document.querySelectorAll(".bubble-choice-buttons").forEach(group => {
    group.addEventListener("click", function (event) {
      const button = event.target.closest(".bubble-choice-btn");
      if (!button) return;
  
      const targetInputId = group.dataset.target;
      const hiddenInput = document.getElementById(targetInputId);
  
      if (!hiddenInput) return;
  
      hiddenInput.value = button.dataset.value;
  
      group.querySelectorAll(".bubble-choice-btn").forEach(btn => {
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
    }
  });

  const clearAddedSuburbsBtn = document.getElementById("clearAddedSuburbsBtn");
  if (clearAddedSuburbsBtn) {
    clearAddedSuburbsBtn.addEventListener("click", function () {
      addedBubbleSuburbs = [];
      renderAddedSuburbTags();
      renderSuburbBubbleChart();
    });
  }

  if (locationSearchInput && locationSearchSuggestions) {
    locationSearchInput.addEventListener("input", async function () {
      const query = locationSearchInput.value.trim();
  // Get the LGA search input (visible text field)
  const lgaInput = document.getElementById("lgaInput");

  // Get the dropdown container where LGA suggestions will appear
  const lgaSuggestions = document.getElementById("lgaSuggestions");

  // Hidden input to store the selected LGA value
  const selectedLgaInput = document.getElementById("selectedLgaInput");

  // Only continue if both the input and suggestion box exist
  if (lgaInput && lgaSuggestions) {
    // Listen for user typing in the LGA search box
    lgaInput.addEventListener("input", async function () {
      const query = lgaInput.value.trim(); // Get what user typed

      if (selectedLgaInput) selectedLgaInput.value = "";
      if (selectedLgacodeInput) selectedLgacodeInput.value = "";
      selectedLGAName = null;

      if (query.length < 2) {
        locationSearchSuggestions.innerHTML = "";
        return;
      }

      try {
        const response = await fetch(`/api/locations?q=${encodeURIComponent(query)}`);
        const locations = await response.json();

        if (!locations.length) {
          locationSearchSuggestions.innerHTML = `
            <div class="location-suggestion-item no-result">No matching suburb found</div>`;
          return;
        }

        locationSearchSuggestions.innerHTML = locations.map(item => `
          <button type="button" class="location-suggestion-item"
            data-locality="${item.locality}" data-postcode="${item.postcode}">
            ${item.locality} (${item.postcode})
          </button>`).join("");
        // Call backend API to fetch matching LGA names
        // const response = await fetch(`${BASE_PATH}/api/lgas?q=${encodeURIComponent(query)}`)
        const response = await fetch(
          `/api/lgas?q=${encodeURIComponent(query)}`,
        );

        // Convert response into JSON
        const lgas = await response.json();

        // If no matching LGA found, show message in dropdown
        if (!lgas.length) {
          lgaSuggestions.innerHTML = `
            <div class="location-suggestion-item no-result">
              No matching LGA found
            </div>
          `;
          return;
        }

        // Render matching LGAs into clickable dropdown buttons
        lgaSuggestions.innerHTML = lgas
          .map(
            (item) => `
          <button
            type="button"
            class="location-suggestion-item"
            data-lga="${item.lga_name}"
            data-lgacode="${item.lgacode}"
          >
            ${item.lga_name}
          </button>
        `,
          )
          .join("");
      } catch (error) {
        console.error("Location fetch error:", error);
        locationSearchSuggestions.innerHTML = "";
      }
    });

    locationSearchSuggestions.addEventListener("click", async function (event) {
      const item = event.target.closest(".location-suggestion-item");
      if (!item || item.classList.contains("no-result")) return;

      const locality = item.dataset.locality;
      const postcode = item.dataset.postcode;
    const lgaDropdownBtn = document.getElementById("lgaDropdownBtn");

    if (lgaDropdownBtn) {
      lgaDropdownBtn.addEventListener("click", async function () {
        try {
          const response = await fetch(`/api/all-lgas`);
          // const response = await fetch(`${BASE_PATH}/api/all-lgas`);
          const lgas = await response.json();

          lgaSuggestions.innerHTML = lgas
            .map(
              (item) => `
        <button
          type="button"
          class="location-suggestion-item"
          data-lga="${item.lga_name}"
          data-lgacode="${item.lgacode}"
        >
          ${item.lga_name}
        </button>
      `,
            )
            .join("");
        } catch (error) {
          console.error("All LGA fetch error:", error);
        }
      });
    }

      locationSearchInput.value = `${locality} (${postcode})`;
      locationSearchSuggestions.innerHTML = "";

      try {
        const response = await fetch(
          `/api/lga-from-location?locality=${encodeURIComponent(locality)}&postcode=${encodeURIComponent(postcode)}`
        );

        const data = await response.json();

        if (data.lga_name && data.lgacode) {
          if (selectedLgaInput) selectedLgaInput.value = data.lga_name;
          if (selectedLgacodeInput) selectedLgacodeInput.value = data.lgacode;
          selectedLGAName = data.lga_name;

          const display = document.getElementById("resolvedLgaDisplay");
          if (display) {
            display.textContent = `Local Government Area: ${data.lga_name}`;
            display.style.display = "block";
          }

          handleLGASelect(data.lga_name, data.lgacode);
        } else {
          alert("Could not find an LGA for that location. Please try a different suburb or postcode.");
        }
      } catch (error) {
        console.error("LGA lookup error:", error);
      }
    });
  }

  const filterButton = document.getElementById("filterButton");
  if (filterButton) filterButton.addEventListener("click", handleBudgetFilter);

  const budgetInput = document.getElementById("budgetInput");
  if (budgetInput) {
    budgetInput.addEventListener("keypress", function (e) {
    lgaSuggestions.addEventListener("click", function (event) {
      const item = event.target.closest(".location-suggestion-item");

      if (!item || item.classList.contains("no-result")) return;

      const lgaName = item.dataset.lga;
      const lgacode = item.dataset.lgacode;

      // Fill visible input
      lgaInput.value = lgaName;

      // Save selected LGA name
      if (selectedLgaInput) {
        selectedLgaInput.value = lgaName;
      }

      // Save selected LGA code
      const selectedLgacodeInput = document.getElementById(
        "selectedLgacodeInput",
      );
      if (selectedLgacodeInput) {
        selectedLgacodeInput.value = lgacode;
      }

      // Save in JS state
      selectedLGAName = lgaName;

      console.log("Selected LGA:", {
        lga_name: lgaName,
        lgacode: lgacode,
      });

      // Later this will trigger real DB suburb map
      handleLGASelect(lgaName, lgacode);

      // Clear dropdown
      lgaSuggestions.innerHTML = "";
    });
  }

  // Budget filter button click → apply budget filter to map
  document
    .getElementById("filterButton")
    .addEventListener("click", handleBudgetFilter);

  // Pressing Enter in budget input also applies budget filter
  document
    .getElementById("budgetInput")
    .addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        handleBudgetFilter();
      }
    });
  }

  const closeDetailBtn = document.getElementById("closeDetailBtn");
  if (closeDetailBtn) closeDetailBtn.addEventListener("click", closeDetailPanel);

  // Close button hides the suburb detail panel
  document
    .getElementById("closeDetailBtn")
    .addEventListener("click", closeDetailPanel);
}

async function loadUserData() {
  const budgetInput = document.getElementById("budgetInput");
  const locationSearchInput = document.getElementById("locationSearchInput");
  const lgaInput = document.getElementById("lgaInput");
  const selectedLgaInput = document.getElementById("selectedLgaInput");
  const selectedLgacodeInput = document.getElementById("selectedLgacodeInput");

  if (!window.userProfileData) {
    userIncome = 500;
    return;
  }

  userIncome = window.userProfileData.income || 500;

  let defaultBudget = null;

  if (window.userProfileData.rent && Number(window.userProfileData.rent) > 0) {
    defaultBudget = Number(window.userProfileData.rent);
  } else if (window.userProfileData.income && Number(window.userProfileData.income) > 0) {
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
      locationSearchInput.value = locality ? `${locality} (${postcode})` : postcode;
    }

    try {
      const response = await fetch(
        `/api/lga-from-location?locality=${encodeURIComponent(locality)}&postcode=${encodeURIComponent(postcode)}`
        // `${BASE_PATH}/api/lga-from-location?locality=${encodeURIComponent(locality)}&postcode=${encodeURIComponent(postcode)}`
        `/api/lga-from-location?locality=${encodeURIComponent(locality)}&postcode=${encodeURIComponent(postcode)}`,
      );

      const data = await response.json();

      if (data.lga_name) {
        if (selectedLgaInput) selectedLgaInput.value = data.lga_name;
        if (selectedLgacodeInput) selectedLgacodeInput.value = data.lgacode;

        selectedLGAName = data.lga_name;
        userDefaultLGAName = data.lga_name;
        userDefaultLGACode = data.lgacode;

        const display = document.getElementById("resolvedLgaDisplay");
        if (display) {
          display.textContent = `Local Government Area: ${data.lga_name}`;
          display.style.display = "block";
        }

        if (data.lgacode) {
          handleLGASelect(data.lga_name, data.lgacode);
        }
      }
    } catch (error) {
      console.error("Error finding LGA from profile location:", error);
    }
  }

  updateMapModeBox();
}

// Handle LGA selection
async function handleLGASelect(lgaName, lgacode) {
  selectedLGAName = lgaName;
  addedBubbleSuburbs = [];
  showMapLoading(`Loading ${lgaName} map...`);

  const mapTitle = document.getElementById("mapTitle");
  if (mapTitle) mapTitle.textContent = `${lgaName} — Rental Prices by Suburb`;

  try {
    const [suburbResponse, lgaResponse] = await Promise.all([
      fetch(`/api/suburb-rent-map?lgacode=${encodeURIComponent(lgacode)}`),
      fetch(`/api/lga-boundary?lgacode=${encodeURIComponent(lgacode)}`),
    ]);

    const suburbGeojson = await suburbResponse.json();
    const lgaGeojson = await lgaResponse.json();

    currentGeoJson = suburbGeojson;
    currentLgaGeoJson = lgaGeojson;
    budgetFilterActive = false;
    updateMapModeBox();

    console.log("Loaded suburb GeoJSON:", suburbGeojson);
    console.log("Loaded LGA boundary:", lgaGeojson);

    initializeMap(suburbGeojson, lgaGeojson);
    loadSuburbBubbleData(lgacode);

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

// Initialize map for selected LGA
function initializeMap(suburbGeojson, lgaGeojson) {
  const container = document.getElementById("mapContainer");

  if (!lgaGeojson || !lgaGeojson.features || !lgaGeojson.features.length) {
    container.innerHTML = `
      <div style="padding: 20px;">
        No LGA boundary data found for ${selectedLGAName}.
      </div>
    `;
    return;
  }

  container.classList.remove("map-placeholder");
  container.innerHTML = "";

  if (map) {
    map.remove();
  }

  map = L.map(container, {
    maxBounds: [
      [-39.3, 140.7],
      [-33.8, 150.2]
    ],
    maxBoundsViscosity: 1.0,
    minZoom: 7
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
    maxZoom: 19,
  }).addTo(map);

  if (currentLgaRentGeoJson) {
    lgaRentLayer = L.geoJSON(currentLgaRentGeoJson, {
      style: function (feature) {
        const rent = feature.properties.rent;

        return {
          color: "#666",
          weight: 0.7,
          fillColor: getLgaRentColor(rent),
          fillOpacity: 0.8,
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
          <strong>${props.lga_name}</strong><br>
          LGA median/average rent: ${rentText}
        `);

        layer.bindTooltip(props.lga_name, {
          permanent: true,
          direction: "center",
          className: "lga-label",
        });
      },
    }).addTo(map);
  }

  if (suburbGeojson && suburbGeojson.features && suburbGeojson.features.length) {
  // 2. Draw selected LGA suburb polygons on top
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
          <strong>${props.suburb_name}</strong><br>
          ${props.postcode ? `Postcode: ${props.postcode}<br>` : ""}
          Median rent: ${rentText}
        `);

        layer.bindTooltip(props.suburb_name, {
          permanent: true,
          direction: "center",
          className: "suburb-label",
        });
      }

        // layer.on("click", function () {
        //   showSuburbDetail({
        //     name: props.suburb_name,
        //     postcode: props.postcode,
        //     rent: props.rent
        //   });
        // });
      },
    }).addTo(map);
  }

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

  if (rent >= 650) return "#4a148c";
  if (rent >= 550) return "#7b1fa2";
  if (rent >= 450) return "#ab47bc";
  if (rent >= 350) return "#ce93d8";
  return "#f3e5f5";
}

function getRentColor(rent) {
  if (!rent) return "#cccccc";

  if (budgetFilterActive && currentBudget) {
    return rent <= currentBudget ? "#2e7d32" : "#c62828";
  }

  if (rent >= 650) return "#7f0000";
  if (rent >= 550) return "#c62828";
  if (rent >= 450) return "#ef6c00";
  if (rent >= 350) return "#f9a825";
  return "#2e7d32";
}

function showLgaDetail(lga) {
  document.getElementById("lgaDetailName").textContent = lga.name;

  const rent = Math.round(lga.rent || 0);
  document.getElementById("detailRentPrice").textContent = rent ? `$${rent}` : "No data";

  if (userIncome && rent) {
    const affordabilityPercent = Math.round((rent / userIncome) * 100);
    document.getElementById("detailAffordability").textContent = `${affordabilityPercent}%`;
  document.getElementById("detailRentPrice").textContent = rent
    ? `$${rent}`
    : "No data";

  if (userIncome && rent) {
    const affordabilityPercent = Math.round((rent / userIncome) * 100);
    document.getElementById("detailAffordability").textContent =
      `${affordabilityPercent}%`;

    let affordabilityClass = "affordability-affordable";
    let affordabilityText = "Affordable";

    if (affordabilityPercent > 45) {
      affordabilityClass = "affordability-unaffordable";
      affordabilityText = "Not Recommended";
    } else if (affordabilityPercent >= 30) {
      affordabilityClass = "affordability-stretched";
      affordabilityText = "Stretched";
    }

    document.getElementById("detailAffordabilityLabel").textContent = "of your weekly income";
    document.getElementById("detailAffordabilityLabel").textContent =
      "of your weekly income";

    const badge = document.getElementById("affordabilityBadge");
    badge.textContent = affordabilityText;
    badge.className = `affordability-badge ${affordabilityClass}`;
  } else {
    document.getElementById("detailAffordability").textContent = "--";
    document.getElementById("detailAffordabilityLabel").textContent = "income not available";
    document.getElementById("detailAffordabilityLabel").textContent =
      "income not available";
  }

  renderLgaTrendChart(lga);
  generateLgaTrendInsight(lga);

  document.getElementById("lgaDetailPanel").classList.remove("hidden");
}

function resetMapToUserArea() {
  if (!userDefaultLGAName || !userDefaultLGACode) {
    alert("Your saved profile location is not available.");
    return;
  }

  selectedLGAName = userDefaultLGAName;

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

// Render trend chart
function renderLgaTrendChart(lga) {
  if (trendChart) {
    trendChart.destroy();
  }

  const ctx = document.getElementById("trendChart").getContext("2d");

  const labels = lga.historyLabels || [];
  const data = lga.history || [];

  trendChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
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
        pointRadius: 4
      }]
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
          position: "top"
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
  const history = (lga.history || []).filter(
    (value) => value !== null && value !== undefined,
  );

  if (history.length < 2) {
    document.getElementById("trendStatusBadge").textContent = "No data";
    document.getElementById("trendInsight").innerHTML =
      `Not enough rental history is available for ${lga.name}.`;
    return;
  }

  const firstRent = history[0];
  const lastRent = history[history.length - 1];

  const totalIncrease = lastRent - firstRent;
  const percentIncrease = Math.round((totalIncrease / firstRent) * 100);

  const recent = history.slice(-4);
  const recentIncrease = recent[recent.length - 1] - recent[0];

  let trendStatus = "Stable";
  let trendClass = "affordability-affordable";

  if (recentIncrease > 20) {
    trendStatus = "Rising";
    trendClass = "affordability-unaffordable";
  } else if (recentIncrease < -20) {
    trendStatus = "Declining";
    trendClass = "affordability-affordable";
  }

  const badge = document.getElementById("trendStatusBadge");
  badge.textContent = trendStatus;
  badge.className = `affordability-badge ${trendClass}`;

  const yearlyIncrease = totalIncrease / 4.5;

  document.getElementById("trendInsight").innerHTML = `
    <strong>${lga.name} rent trend:</strong>
    Average weekly rent changed from <strong>$${Math.round(firstRent)}</strong>
    to <strong>$${Math.round(lastRent)}</strong> between 03-21 and 09-25.
    This is a change of <strong>$${Math.round(totalIncrease)}</strong>
    (${percentIncrease}%), or about <strong>$${Math.round(yearlyIncrease)}</strong> per year.
  `;
}

function closeDetailPanel() {
  document.getElementById("lgaDetailPanel").classList.add("hidden");
  selectedLGA = null;
  if (trendChart) {
    trendChart.destroy();
  }
}

function handleBudgetFilter() {
  const budgetValue = document.getElementById("budgetInput").value;

  if (!budgetValue || isNaN(budgetValue) || budgetValue < 0) {
    alert("Please enter a valid budget amount");
    return;
  }

  currentBudget = parseInt(budgetValue);
  budgetFilterActive = true;
  updateMapModeBox();

  updateBudgetDisplay();
  renderSuburbBubbleChart();

  if (!selectedLGAName || !currentGeoJson) {
    alert("Please select an LGA first");
    return;
  }

  initializeMap(currentGeoJson, currentLgaGeoJson);
}

// Update budget display
function updateBudgetDisplay() {
  const display = document.getElementById("currentBudgetDisplay");
  const value = document.getElementById("budgetDisplayValue");

  if (!display || !value) {
    return;
  }

  if (currentBudget) {
    value.textContent = `$${currentBudget}`;
    display.classList.remove("hidden");
  } else {
    display.classList.add("hidden");
  }
}

function updateUserIncome(income) {
  userIncome = income;
  if (selectedLGA) {
    showLGADetail(selectedLGA);
  }
}

function updateMapModeBox() {
  const title = document.getElementById("mapModeTitle");
  const text = document.getElementById("mapModeText");
  const legend = document.getElementById("mapModeLegend");

  if (!title || !text || !legend) return;

  if (budgetFilterActive) {
    title.textContent = "Map mode: Budget View";
    text.textContent = "Suburbs are coloured by your budget.";
    legend.innerHTML = `
      <div class="map-mode-item"><span class="map-dot green"></span>Within budget</div>
      <div class="map-mode-item"><span class="map-dot red"></span>Above budget</div>
      <div class="map-mode-item"><span class="map-dot grey"></span>No rent data</div>
    `;
  } else {
    title.textContent = "Map mode: Rent View";
    text.textContent = "Suburbs are coloured by weekly rent.";
    legend.innerHTML = `
      <div class="map-mode-item"><span class="map-dot green"></span>Lower rent</div>
      <div class="map-mode-item"><span class="map-dot yellow"></span>Moderate rent</div>
      <div class="map-mode-item"><span class="map-dot red"></span>Higher rent</div>
      <div class="map-mode-item"><span class="map-dot grey"></span>No rent data</div>
    `;
  }
}

async function loadSuburbBubbleData(lgacode) {
  try {
    const response = await fetch(`/api/suburb-comparison-data?lgacode=${encodeURIComponent(lgacode)}`);
    suburbBubbleData = await response.json();

    renderSuburbBubbleChart();
  } catch (error) {
    console.error("Error loading suburb comparison data:", error);
  }
}

async function addSuburbToBubbleChart(locality, postcode) {
  try {
    const response = await fetch(
      `/api/suburb-comparison-one?locality=${encodeURIComponent(locality)}&postcode=${encodeURIComponent(postcode)}`
    );

    const suburb = await response.json();

    if (!suburb || !suburb.suburb_name) {
      alert("No comparison data found for this suburb.");
      return;
    }

    const alreadyInLga = suburbBubbleData.some(
      s => s.suburb_name.toLowerCase() === suburb.suburb_name.toLowerCase()
    );

    const alreadyAdded = addedBubbleSuburbs.some(
      s => s.suburb_name.toLowerCase() === suburb.suburb_name.toLowerCase()
    );

    if (alreadyInLga) {
      alert(`${suburb.suburb_name} is already shown in the selected LGA.`);
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
    cafes_count: "Cafes"
  };

  return labels[metric] || metric;
}

function getBubbleValue(row, metric) {
  if (metric === "rent_income_pct") {
    if (!userIncome || !row.rent) return null;
    return Math.round((row.rent / userIncome) * 100);
  }

  return row[metric];
}

function renderSuburbBubbleChart() {
  const canvas = document.getElementById("suburbBubbleChart");
  if (!canvas || !suburbBubbleData.length) return;

  const xMetric = document.getElementById("bubbleXAxis").value;
  const yMetric = document.getElementById("bubbleYAxis").value;
  const sizeMetric = document.getElementById("bubbleSizeMetric").value;

  const combinedData = [
    ...suburbBubbleData.map(row => ({ ...row, isAddedSuburb: false })),
    ...addedBubbleSuburbs.map(row => ({ ...row, isAddedSuburb: true }))
  ];
  console.log(
    combinedData.find(
      suburb => suburb.suburb_name === "Ferntree Gully"
    )
  );

  const points = combinedData
    .map(row => {
      const x = getBubbleValue(row, xMetric);
      const y = getBubbleValue(row, yMetric);
      const sizeValue = getBubbleValue(row, sizeMetric) || 0;

      if (x === null || x === undefined || y === null || y === undefined) {
        return null;
      }

      const isWithinBudget =
        currentBudget &&
        row.rent &&
        row.rent <= currentBudget;

      return {
        x,
        y,
        r: Math.max(10, Math.min(40, 10 + sizeValue * 2.2)),
        suburb: row.suburb_name,
        rent: row.rent,
        sizeValue,
        isWithinBudget,
        isAddedSuburb: row.isAddedSuburb
      };
    })
    .filter(Boolean);
    const xValues = points.map(p => p.x);
const yValues = points.map(p => p.y);

const xMin = Math.min(...xValues);
const xMax = Math.max(...xValues);
const yMin = Math.min(...yValues);
const yMax = Math.max(...yValues);

const xMidValue = (xMin + xMax) / 2;
const yMidValue = (yMin + yMax) / 2;

const tolerance = 0.0001;

points.forEach(point => {
  point.isSweetSpot =
    point.x <= xMidValue + tolerance &&
    point.y >= yMidValue - tolerance;
});
console.log("Sweet spot debug:", points.map(p => ({
  suburb: p.suburb,
  x: p.x,
  y: p.y,
  xMidValue,
  yMidValue,
  isSweetSpot: p.isSweetSpot
})));

console.log("Sweet spot suburbs:", points.filter(p => p.isSweetSpot));

  generateBubbleChartInsights(points, xMetric, yMetric, sizeMetric);

  if (suburbBubbleChart) {
    suburbBubbleChart.destroy();
  }

  const ctx = canvas.getContext("2d");

  suburbBubbleChart = new Chart(ctx, {
    type: "bubble",
    data: {
      datasets: [{
        label: "Suburbs",
        data: points,
        backgroundColor: points.map(point => {
          // if (point.isSweetSpot) return "rgba(47, 90, 168, 0.55)";
          if (point.isAddedSuburb) return "rgba(47, 90, 168, 0.45)";

          return point.isWithinBudget
            ? "rgba(232, 84, 106, 0.38)"
            : "rgba(120, 120, 120, 0.12)";
        }),
        borderColor: points.map(point => {

          if (point.isSweetSpot) {
            return "rgba(47, 90, 168, 1)";
          }
        
          if (point.isAddedSuburb) {
            return "rgba(47, 90, 168, 0.95)";
          }

          return point.isWithinBudget
            ? "rgba(232, 84, 106, 0.9)"
            : "rgba(140, 140, 140, 0.28)";
        }),
        borderWidth: points.map(point => {
          if (point.isSweetSpot) return 4;
          if (point.isAddedSuburb) return 3;
        
          return 1.5;
        })
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,

      plugins: {
        legend: {
          display: false
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
                point.isWithinBudget ? "Within budget" : "Above budget",
                point.isAddedSuburb ? "Added comparison suburb" : "Selected LGA suburb"
              ];
            }
          }
        }
      },

      scales: {
        x: {
          reverse: true,
          title: {
            display: true,
            text: getBubbleMetricLabel(xMetric)
          }
        },
        y: {
          title: {
            display: true,
            text: getBubbleMetricLabel(yMetric)
          }
        }
      }
    },
    plugins: [quadrantPlugin]
  });
}

// function generateBubbleChartInsights(points, xMetric, yMetric, sizeMetric) {
//   const insightsContainer = document.getElementById("bubbleChartInsights");

//   if (!insightsContainer || !points.length) {
//     return;
//   }

//   const xLabel = getBubbleMetricLabel(xMetric);
//   const yLabel = getBubbleMetricLabel(yMetric);
//   const sizeLabel = getBubbleMetricLabel(sizeMetric);

//   const xMid = (
//     Math.min(...points.map(p => p.x)) +
//     Math.max(...points.map(p => p.x))
//   ) / 2;

//   const yMid = (
//     Math.min(...points.map(p => p.y)) +
//     Math.max(...points.map(p => p.y))
//   ) / 2;

//   const topLeft = points.filter(p => p.x < xMid && p.y > yMid);
//   const largestBubble = [...points].sort((a, b) => b.r - a.r)[0];
//   const lowestX = [...points].sort((a, b) => a.x - b.x)[0];
//   const highestY = [...points].sort((a, b) => b.y - a.y)[0];
//   const withinBudget = points.filter(p => p.isWithinBudget);
//   const addedSuburbs = points.filter(p => p.isAddedSuburb);

//   const insights = [];

//   if (currentBudget) {
//     insights.push(`
//       ${withinBudget.length} of ${points.length} displayed suburbs are within your selected weekly rent budget of $${currentBudget}.
//     `);
//   }

//   if (addedSuburbs.length > 0) {
//     insights.push(`
//       ${addedSuburbs.length} added comparison suburb${addedSuburbs.length > 1 ? "s are" : " is"} shown in blue for comparison against your selected LGA.
//     `);
//   }

//   insights.push(`
//     Suburbs further right on the chart require a lower ${xLabel.toLowerCase()}.
//   `);

//   insights.push(`
//     Suburbs higher on the chart provide stronger ${yLabel.toLowerCase()}.
//   `);

//   if (topLeft.length > 0) {
//     const suburbNames = topLeft
//       .slice(0, 3)
//       .map(s => s.suburb)
//       .join(", ");

//     insights.push(`
//       ${suburbNames} appear in the lower-cost and higher-access quadrant, suggesting a stronger balance between affordability and essential access.
//     `);
//   }

//   if (largestBubble) {
//     insights.push(`
//       ${largestBubble.suburb} has the largest bubble size, indicating stronger ${sizeLabel.toLowerCase()} relative to nearby suburbs.
//     `);
//   }

//   if (lowestX) {
//     insights.push(`
//       ${lowestX.suburb} shows the lowest ${xLabel.toLowerCase()} among displayed suburbs.
//     `);
//   }

//   if (highestY) {
//     insights.push(`
//       ${highestY.suburb} provides the highest ${yLabel.toLowerCase()} in the current comparison.
//     `);
//   }

//   insightsContainer.innerHTML = insights
//     .map(insight => `<li>${insight}</li>`)
//     .join("");
// }

function renderAddedSuburbTags() {
  const container = document.getElementById("addedSuburbTags");
  if (!container) return;

  container.innerHTML = addedBubbleSuburbs.map(suburb => `
    <div class="added-suburb-tag">
      ${suburb.suburb_name}
    </div>
  `).join("");
}
function generateBubbleChartInsights(points, xMetric, yMetric, sizeMetric) {
  const insightsContainer = document.getElementById("bubbleChartInsights");

  if (!insightsContainer || !points.length) return;

  const sweetSpotSuburbs = points
    .filter(p => p.isSweetSpot)
    .map(p => p.suburb);

  if (sweetSpotSuburbs.length > 0) {
    insightsContainer.innerHTML = `
      <li>
        <strong>Sweet spot suburbs:</strong>
        <div class="sweet-spot-tags">
          ${sweetSpotSuburbs.map(name => `
            <span class="sweet-spot-tag">${name}</span>
          `).join("")}
        </div>
        <p class="sweet-spot-note">
          These suburbs combine lower cost with higher access based on your selected comparison.
        </p>
      </li>
    `;
  } else {
    insightsContainer.innerHTML = `
      <li>
        <strong>No suburb is currently in the sweet spot.</strong>
        <p class="sweet-spot-note">
          Try changing the comparison options or adding another suburb to compare.
        </p>
      </li>
    `;
  }
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
