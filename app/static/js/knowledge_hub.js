document.addEventListener("DOMContentLoaded", function () {
  syncProfileToSession();
  injectPersonalisedContent();
  setupKnowledgeModal();
  setupHiddenConditionsToggle();
  setupHashAutoOpen();
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

/* Modal functionality */
function setupKnowledgeModal() {
  const modal = document.getElementById("knowledgeModal");
  const modalClose = document.getElementById("knowledgeModalClose");
  const modalTitle = document.getElementById("knowledgeModalTitle");
  const modalContent = document.getElementById("knowledgeModalContent");
  const modalIcon = document.getElementById("knowledgeModalIcon");
  const topicCards = document.querySelectorAll(".hub-topic-card");

  if (!modal || !modalClose || !modalTitle || !modalContent || !modalIcon) {
    return;
  }

  function openKnowledgeModal(card) {
    const title = card.dataset.topicTitle || "Financial Literacy Topic";
    const body = card.querySelector(".hub-tile-body");
    const icon = card.querySelector(
      ".hub-tile-icon .material-symbols-outlined",
    );

    if (!body) {
      return;
    }

    modalTitle.textContent = title;
    modalContent.innerHTML = body.innerHTML;

    if (icon) {
      modalIcon.textContent = icon.textContent.trim();
    }

    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";

    setupModalInternalButtons();
  }

  function closeKnowledgeModal() {
    modal.classList.add("hidden");
    modalContent.innerHTML = "";
    document.body.style.overflow = "";
  }

  topicCards.forEach(function (card) {
    card.addEventListener("click", function () {
      openKnowledgeModal(card);
    });
  });

  modalClose.addEventListener("click", closeKnowledgeModal);

  modal.addEventListener("click", function (event) {
    if (event.target === modal) {
      closeKnowledgeModal();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !modal.classList.contains("hidden")) {
      closeKnowledgeModal();
    }
  });
}

/* Setup buttons that are copied into modal via innerHTML */
function setupModalInternalButtons() {
  const modalContent = document.getElementById("knowledgeModalContent");

  if (!modalContent) {
    return;
  }

  const hiddenBtn = modalContent.querySelector("#hiddenConditionsBtn");
  const hiddenList = modalContent.querySelector("#hiddenConditionsList");

  if (!hiddenBtn || !hiddenList) {
    return;
  }

  hiddenBtn.addEventListener("click", function (event) {
    event.preventDefault();
    event.stopPropagation();

    const isHidden = hiddenList.classList.contains("hidden");

    if (isHidden) {
      hiddenList.classList.remove("hidden");
      hiddenBtn.textContent = "Hide conditions ↑";
    } else {
      hiddenList.classList.add("hidden");
      hiddenBtn.textContent = "See hidden conditions ↓";
    }
  });
}

/* Backup setup if button exists outside modal */
function setupHiddenConditionsToggle() {
  const hiddenBtn = document.getElementById("hiddenConditionsBtn");
  const hiddenList = document.getElementById("hiddenConditionsList");

  if (!hiddenBtn || !hiddenList) {
    return;
  }

  hiddenBtn.addEventListener("click", function (event) {
    event.stopPropagation();

    const isHidden = hiddenList.classList.contains("hidden");

    if (isHidden) {
      hiddenList.classList.remove("hidden");
      hiddenBtn.textContent = "Hide conditions ↑";
    } else {
      hiddenList.classList.add("hidden");
      hiddenBtn.textContent = "See hidden conditions ↓";
    }
  });
}

/* Personalised examples */
function injectPersonalisedContent() {
  const profile = JSON.parse(sessionStorage.getItem("profile") || "{}");
  const spending = JSON.parse(sessionStorage.getItem("spendingData") || "{}");

  const weeklyIncome = parseFloat(profile.income) || 0;
  const totalExpenses = parseFloat(spending.totalExpenses) || 0;
  const rentAmt = parseFloat(spending.rent) || 0;

  injectCreditNote(weeklyIncome);
  injectSuperExample(weeklyIncome);
  injectBudgetExample(weeklyIncome);
  injectScenarioNote(weeklyIncome, totalExpenses, rentAmt);
}

function injectCreditNote(weeklyIncome) {
  if (weeklyIncome <= 0) {
    return;
  }

  const monthlyIncome = weeklyIncome * 4;
  const minRepayExample = Math.max(monthlyIncome * 0.02, 25).toFixed(0);

  const el = document.getElementById("creditPersonalNote");

  if (el) {
    el.innerHTML = `
      Based on your income of <strong>$${weeklyIncome.toFixed(
        0,
      )}/week</strong>, a typical credit card minimum repayment example could be around
      <strong>$${minRepayExample}/month</strong>. Paying only the minimum can mean interest keeps growing.
    `;
  }
}

function injectSuperExample(weeklyIncome) {
  if (weeklyIncome <= 0) {
    return;
  }

  const annualIncome = weeklyIncome * 52;
  const annualSuper = annualIncome * 0.115;
  const tenYearBalance = annualSuper * ((Math.pow(1.07, 10) - 1) / 0.07);

  const el = document.getElementById("superGrowthExample");

  if (el) {
    el.innerHTML = `
      On your current income of <strong>$${annualIncome.toFixed(
        0,
      )}/year</strong>, employer super could be roughly
      <strong>$${annualSuper.toFixed(
        0,
      )}/year</strong>. Over 10 years, that could grow to about
      <strong>$${Math.round(tenYearBalance).toLocaleString()}</strong>, depending on returns and fees.
    `;
  }
}

function injectBudgetExample(weeklyIncome) {
  if (weeklyIncome <= 0) {
    return;
  }

  const needs = (weeklyIncome * 0.5).toFixed(0);
  const wants = (weeklyIncome * 0.3).toFixed(0);
  const savings = (weeklyIncome * 0.2).toFixed(0);

  const el = document.getElementById("budgetPersonalNote");

  if (el) {
    el.innerHTML = `
      Based on your <strong>$${weeklyIncome.toFixed(
        0,
      )}/week</strong> income, the 50/30/20 rule suggests:
      <strong>$${needs}</strong> on needs,
      <strong>$${wants}</strong> on wants, and
      <strong>$${savings}</strong> toward savings or debt repayment.
    `;
  }
}

function injectScenarioNote(weeklyIncome, totalExpenses, rentAmt) {
  const el = document.getElementById("personalScenarioNote");

  if (!el || weeklyIncome <= 0) {
    return;
  }

  const notes = [];
  const weeklyDeficit = Math.max(0, totalExpenses - weeklyIncome);

  if (rentAmt > 0) {
    const rentPct = (rentAmt / weeklyIncome) * 100;

    if (rentPct > 35) {
      notes.push(`
        <strong>Housing stress flag:</strong> Your rent is around
        ${rentPct.toFixed(0)}% of your weekly income. That may leave less room for savings, emergencies, and flexible spending.
      `);
    }
  }

  if (weeklyDeficit > 50) {
    notes.push(`
      <strong>Budget pressure:</strong> Your expenses appear to be higher than your income by about
      $${weeklyDeficit.toFixed(0)} per week. Reducing even small weekly costs can help prevent this gap from growing.
    `);
  }

  if (notes.length > 0) {
    el.innerHTML = notes.join("<br><br>");
    el.classList.remove("hidden");
  }
}

/* Open topic using URL hash, for example /knowledge-hub#credit */
function setupHashAutoOpen() {
  const hash = window.location.hash.replace("#", "");

  if (!hash) {
    return;
  }

  const target = document.getElementById("tile-" + hash);

  if (target) {
    setTimeout(function () {
      target.click();
    }, 200);
  }
}
