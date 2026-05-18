// Sync Flask profile → sessionStorage
(function syncProfile() {
  const serverProfile = window.profileData || {};

  if (serverProfile && Object.keys(serverProfile).length > 0) {
    sessionStorage.setItem("profile", JSON.stringify(serverProfile));
  }
})();

const profile = JSON.parse(sessionStorage.getItem("profile") || "{}");
const userIndustry = profile.industry || "";

let chartInstance = null;
let industryData = [];

// Show user's industry badge if available
if (userIndustry) {
  const badge = document.getElementById("yourIndustryBadge");
  const name = document.getElementById("yourIndustryName");

  if (badge && name) {
    badge.style.display = "inline-flex";
    name.textContent = userIndustry;
  }
}

// Fetch gender pay gap industry data from Flask API
const BASE_PATH = window.location.pathname.startsWith("/underdevelopment")
  ? "/underdevelopment"
  : "";

const API_BASE = `${BASE_PATH}/api`;

// fetch("/api/gender-pay-gap-industries");
fetch(`${API_BASE}/gender-pay-gap-industries`)
  .then((response) => response.json())
  .then((data) => {
    industryData = data;
    renderChart(data);
  })
  .catch((error) => {
    console.error("Error loading gender pay gap data:", error);

    const loadingState = document.getElementById("loadingState");
    if (loadingState) {
      loadingState.innerHTML = `
        <p style="color:var(--text-muted);font-size:14px;">
          Could not load industry data. Please try again later.
        </p>
      `;
    }
  });

function renderChart(data) {
  document.getElementById("loadingState").style.display = "none";
  document.getElementById("chartWrap").style.display = "block";

  const labels = data.map((item) => item.industry);

  // Graph shows average weekly earnings for women
  const values = data.map((item) => Number(item.estimated_women_weekly_income));

  const colors = labels.map((industry) =>
    industry === userIndustry
      ? "rgba(232,84,106,0.9)"
      : "rgba(155,114,207,0.55)",
  );

  const borderColors = labels.map((industry) =>
    industry === userIndustry ? "#e8546a" : "#9b72cf",
  );

  const ctx = document.getElementById("industryChart").getContext("2d");

  chartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Estimated women average weekly income",
          data: values,
          backgroundColor: colors,
          borderColor: borderColors,
          borderWidth: 2,
          borderRadius: 6,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,

      onClick: (event, elements) => {
        if (elements.length > 0) {
          const index = elements[0].index;
          showDetail(data[index]);
        }
      },

      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              return ` $${Number(context.parsed.x).toLocaleString()}/week`;
            },
          },
        },
      },

      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            callback: (value) => "$" + Number(value).toLocaleString(),
          },
        },
        y: {
          ticks: {
            font: {
              size: 11,
            },
            callback: function (value) {
              const label = this.getLabelForValue(value);
              return label.length > 30 ? label.slice(0, 28) + "…" : label;
            },
          },
        },
      },
    },
  });

  // Auto-show user's industry if it exists in the data
  if (userIndustry) {
    const matchedIndustry = data.find((item) => item.industry === userIndustry);

    if (matchedIndustry) {
      showDetail(matchedIndustry);
    }
  }
}

function showDetail(item) {
  document.getElementById("defaultHint").style.display = "none";

  const detail = document.getElementById("industryDetail");
  detail.style.display = "block";

  const weeklyIncome = Number(item.estimated_women_weekly_income);
  const annualIncome = Number(item.estimated_women_annual_income);
  const centsPerDollar = Number(item.female_cents_per_male_dollar);
  const menAnnualIncome = Number(item.estimated_men_annual_income);

  document.getElementById("detailName").textContent = item.industry;

  document.getElementById("detailWeekly").textContent =
    `$${weeklyIncome.toLocaleString()}/week`;

  document.getElementById("detailAnnual").textContent =
    `$${annualIncome.toLocaleString()}/year`;

  const gapWrap = document.getElementById("gapBadgeWrap");

  if (!Number.isNaN(centsPerDollar)) {
    gapWrap.innerHTML = `
      <span class="gap-badge">
        💼 For every $1 earned by a man, women earn approximately ${centsPerDollar.toFixed(1)}¢ in this industry
      </span>
    `;
  } else {
    gapWrap.innerHTML = "";
  }

  highlightSelectedBar(item.industry);
}

function highlightSelectedBar(selectedIndustry) {
  if (!chartInstance) return;

  const selectedIndex = industryData.findIndex(
    (item) => item.industry === selectedIndustry,
  );

  const colors = industryData.map((item, index) => {
    if (index === selectedIndex) return "rgba(232,84,106,0.9)";
    if (item.industry === userIndustry) return "rgba(232,84,106,0.45)";
    return "rgba(155,114,207,0.35)";
  });

  chartInstance.data.datasets[0].backgroundColor = colors;
  chartInstance.update("none");
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
