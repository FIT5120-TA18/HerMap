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

// const BASE_PATH = window.location.pathname.includes("/underdevelopment")
//   ? "/underdevelopment"
//   : "";

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

// Initialize all event listeners
function initializeEventListeners() {
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

      // Clear previous selected LGA whenever user types again
      if (selectedLgaInput) selectedLgaInput.value = "";
      selectedLGAName = null;

      // Do not search until at least 2 characters are typed
      if (query.length < 2) {
        lgaSuggestions.innerHTML = "";
        return;
      }

      try {
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
        // If API fails, clear dropdown and log error
        console.error("LGA fetch error:", error);
        lgaSuggestions.innerHTML = "";
      }
    });
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

    // Handle user clicking one of the LGA suggestions

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

  // Close button hides the suburb detail panel
  document
    .getElementById("closeDetailBtn")
    .addEventListener("click", closeDetailPanel);
}

async function loadUserData() {
  const budgetInput = document.getElementById("budgetInput");
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
    try {
      const response = await fetch(
        // `${BASE_PATH}/api/lga-from-location?locality=${encodeURIComponent(locality)}&postcode=${encodeURIComponent(postcode)}`
        `/api/lga-from-location?locality=${encodeURIComponent(locality)}&postcode=${encodeURIComponent(postcode)}`,
      );

      const data = await response.json();

      if (data.lga_name) {
        lgaInput.value = data.lga_name;

        if (selectedLgaInput) {
          selectedLgaInput.value = data.lga_name;
        }

        if (selectedLgacodeInput) {
          selectedLgacodeInput.value = data.lgacode;
        }

        selectedLGAName = data.lga_name;

        // Later this will load real suburb/map data
        console.log("Default user LGA:", data);

        // Automatically load map for user's default LGA
        if (data.lgacode) {
          handleLGASelect(data.lga_name, data.lgacode);
        }
      } else {
        lgaInput.placeholder = `Search LGA near ${locality || postcode}`;
      }
    } catch (error) {
      console.error("Error finding LGA from profile location:", error);
      lgaInput.placeholder = "Search an LGA";
    }
  }
  updateMapModeBox();
}

// Handle LGA selection
async function handleLGASelect(lgaName, lgacode) {
  selectedLGAName = lgaName;

  try {
    const [suburbResponse, lgaResponse] = await Promise.all([
      // fetch(`${BASE_PATH}/api/suburb-rent-map?lgacode=${encodeURIComponent(lgacode)}`),
      // fetch(`${BASE_PATH}/api/lga-boundary?lgacode=${encodeURIComponent(lgacode)}`)

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

  map = L.map(container);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
    maxZoom: 19,
  }).addTo(map);

  // 1. Draw all LGAs as background overview
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

  // 2. Draw selected LGA suburb polygons on top
  if (
    suburbGeojson &&
    suburbGeojson.features &&
    suburbGeojson.features.length
  ) {
    suburbRentLayer = L.geoJSON(suburbGeojson, {
      interactive: false,
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

  // 3. Draw selected LGA outline
  const selectedLgaBoundaryLayer = L.geoJSON(lgaGeojson, {
    interactive: false,
    style: {
      color: "#111",
      weight: 3,
      fillOpacity: 0,
    },
  }).addTo(map);

  // 4. Always zoom to selected LGA, not all suburbs
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
// Get color based on rent price
function getRentColor(rent) {
  if (!rent) return "#cccccc";

  // Only use budget colours after user clicks the budget button
  if (budgetFilterActive && currentBudget) {
    return rent <= currentBudget ? "#2e7d32" : "#c62828";
  }

  // Default rent tier colours
  if (rent >= 650) return "#7f0000";
  if (rent >= 550) return "#c62828";
  if (rent >= 450) return "#ef6c00";
  if (rent >= 350) return "#f9a825";
  return "#2e7d32";
}

// Show LGA detail panel
function showLgaDetail(lga) {
  document.getElementById("lgaDetailName").textContent = lga.name;

  const rent = Math.round(lga.rent || 0);
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

    document.getElementById("detailAffordabilityLabel").textContent =
      "of your weekly income";

    const badge = document.getElementById("affordabilityBadge");
    badge.textContent = affordabilityText;
    badge.className = `affordability-badge ${affordabilityClass}`;
  } else {
    document.getElementById("detailAffordability").textContent = "--";
    document.getElementById("detailAffordabilityLabel").textContent =
      "income not available";
  }

  renderLgaTrendChart(lga);
  generateLgaTrendInsight(lga);

  document.getElementById("lgaDetailPanel").classList.remove("hidden");
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

// Generate trend insight
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
// Close detail panel
function closeDetailPanel() {
  document.getElementById("lgaDetailPanel").classList.add("hidden");
  selectedLGA = null;
  if (trendChart) {
    trendChart.destroy();
  }
}

// Handle budget filter
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

  if (!selectedLGAName || !currentGeoJson) {
    alert("Please select an LGA first");
    return;
  }

  // Redraw map with budget-based colours
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

// Function to update user income
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
