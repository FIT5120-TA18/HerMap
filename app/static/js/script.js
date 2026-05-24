document.addEventListener("DOMContentLoaded", function () {
  initProfileBuilder();
  initTypewriter();
  initIndustryInsightChart();
  initAbsDataModal();
  initTosModal();
});

/* Profile Builder */
function initProfileBuilder() {
  const form = document.getElementById("profileForm");
  if (!form) return;

  const steps = document.querySelectorAll(".question-step");
  const nextBtn = document.getElementById("nextBtn");
  const backBtn = document.getElementById("backBtn");
  const progressFill = document.getElementById("progressFill");
  const questionCounter = document.getElementById("questionCounter");
  const formErrorBox = document.getElementById("formErrorBox");
  const formErrorText = document.getElementById("formErrorText");

  const ageInput = document.getElementById("age");
  const ageHidden = document.getElementById("ageInput");
  const ageWarning = document.getElementById("ageWarning");

  // const stateInput = document.getElementById("stateInput");
  const locationSearchBox = document.getElementById("locationSearchBox");
  const locationInput = document.getElementById("locationInput");
  const localityInput = document.getElementById("localityInput");
  const postcodeInput = document.getElementById("postcodeInput");
  const locationSuggestions = document.getElementById("locationSuggestions");

  const livingInput = document.getElementById("livingInput");
  const rentBox = document.getElementById("rentBox");
  const rentInput = document.getElementById("rentInput");
  const rentHidden = document.getElementById("rentHidden");
  const rentError = document.getElementById("rentError");

  const workInput = document.getElementById("workInput");
  const allowanceBox = document.getElementById("allowanceBox");
  const allowanceInput = document.getElementById("allowanceInput");
  const allowanceFrequency = document.getElementById("allowanceFrequency");
  const allowanceError = document.getElementById("allowanceError");
  const weeklyEstimate = document.getElementById("weeklyEstimate");
  const weeklyEstimateValue = document.getElementById("weeklyEstimateValue");

  const industryBox = document.getElementById("industryBox");
  const industrySelect = document.getElementById("industrySelect");
  const industryInput = document.getElementById("industryInput");

  const incomeInput = document.getElementById("income");
  const incomeHidden = document.getElementById("incomeHidden");
  const incomeWarning = document.getElementById("incomeWarning");
  const incomeError = document.getElementById("incomeError");

  const studyFieldBox = document.getElementById("studyFieldBox");
  const studyFieldList = document.getElementById("studyFieldList");
  const studyFieldInput = document.getElementById("studyFieldInput");
  const studyFieldLabel = document.getElementById("studyFieldLabel");

  let currentStep = getInitialStepFromHash();

  function updateStep() {
    steps.forEach((step, index) => {
      step.classList.toggle("active", index === currentStep);
    });

    questionCounter.textContent = `Question ${currentStep + 1} of ${steps.length}`;
    progressFill.style.width = `${((currentStep + 1) / steps.length) * 100}%`;
    backBtn.style.visibility = currentStep === 0 ? "hidden" : "visible";
    nextBtn.textContent = currentStep === steps.length - 1 ? "Finish" : "Next";

    hideGlobalError();
  }

  function getInitialStepFromHash() {
    const hash = window.location.hash;

    if (hash && hash.startsWith("#step-")) {
      const stepNumber = parseInt(hash.replace("#step-", ""), 10);

      if (
        !Number.isNaN(stepNumber) &&
        stepNumber >= 1 &&
        stepNumber <= steps.length
      ) {
        return stepNumber - 1;
      }
    }

    return 0;
  }

  function hideGlobalError() {
    if (!formErrorBox || !formErrorText) return;

    formErrorBox.classList.add("hidden");
    formErrorText.textContent = "Please complete all fields to continue.";
  }

  function showGlobalError(message) {
    if (!formErrorBox || !formErrorText) return;

    formErrorBox.classList.remove("hidden");
    formErrorText.textContent = message;
  }

  function clearStepErrors(step) {
    const errorText = step.querySelector(".field-error");
    const warning = step.querySelector(".field-warning");

    if (errorText) errorText.textContent = "";
    if (warning) warning.classList.add("hidden");

    step.querySelectorAll(".tile").forEach((tile) => {
      tile.classList.remove("input-error");
    });

    [ageInput, locationInput, rentInput, allowanceInput, incomeInput].forEach(
      (input) => {
        if (input) input.classList.remove("input-error");
      },
    );

    if (rentError) rentError.textContent = "";
    if (allowanceError) allowanceError.textContent = "";
    if (incomeError) incomeError.textContent = "";
    if (incomeWarning) incomeWarning.classList.add("hidden");
  }

  function validateStep(stepIndex) {
    const step = steps[stepIndex];
    clearStepErrors(step);

    const tileGroup = step.querySelector(".tile-group");

    if (tileGroup && !validateTileGroup(tileGroup, step)) return false;

    if (stepIndex === 0) return validateAge();
    if (stepIndex === 1) return validateLocation();
    if (stepIndex === 2) return validateRentIfNeeded();
    if (stepIndex === 3) return validateWorkDetails();
    if (stepIndex === 4) return validateIncome();
    if (stepIndex === 5) return validateStudyField();

    return true;
  }

  function validateTileGroup(tileGroup, step) {
    const fieldName = tileGroup.dataset.name;
    const hiddenInput = document.getElementById(fieldName + "Input");
    const warning = step.querySelector(".field-warning");
    const errorText = step.querySelector(".field-error");

    if (!hiddenInput || !hiddenInput.value.trim()) {
      if (warning) warning.classList.remove("hidden");
      if (errorText)
        errorText.textContent = "Please complete this field to continue.";

      tileGroup.querySelectorAll(".tile").forEach((tile) => {
        tile.classList.add("input-error");
      });

      showGlobalError("Please complete the field to continue.");
      return false;
    }

    return true;
  }

  function validateAge() {
    const rawAge = ageInput.value.trim();

    if (!rawAge) {
      ageInput.classList.add("input-error");
      showGlobalError("Please enter your age.");
      return false;
    }

    if (!/^\d+$/.test(rawAge)) {
      ageInput.classList.add("input-error");
      showGlobalError("Please enter numbers only.");
      return false;
    }

    const ageNumber = parseInt(rawAge, 10);

    if (ageNumber < 18 || ageNumber > 22) {
      if (ageWarning) ageWarning.classList.remove("hidden");
      ageInput.classList.add("input-error");
      showGlobalError(
        "Sorry! Currently, we only cater to audience from the age 18-22.",
      );
      return false;
    }

    ageHidden.value = ageNumber;
    return true;
  }

  function validateLocation() {
    if (!localityInput.value.trim() || !postcodeInput.value.trim()) {
      locationInput.classList.add("input-error");
      showGlobalError(
        "Please select a locality or postcode from the suggestions.",
      );
      return false;
    }

    return true;
  }

  function validateRentIfNeeded() {
    const livingValue = livingInput.value.trim();

    if (livingValue !== "Shared rental" && livingValue !== "Living alone") {
      return true;
    }

    const rawRent = rentInput.value.trim();

    if (!rawRent) {
      rentInput.classList.add("input-error");
      if (rentError) rentError.textContent = "Please enter your weekly rent.";
      showGlobalError("Please enter your weekly rent.");
      return false;
    }

    if (!/^\d+$/.test(rawRent)) {
      rentInput.classList.add("input-error");
      if (rentError)
        rentError.textContent = "Please enter a valid weekly rent amount.";
      showGlobalError("Please enter a valid weekly rent amount.");
      return false;
    }

    rentHidden.value = rawRent;
    return true;
  }

  function validateWorkDetails() {
    const selectedWork = workInput.value.trim();

    if (selectedWork === "Not working") {
      return validateAllowance();
    }

    if (!industryInput.value.trim()) {
      showGlobalError("Please select your industry.");
      return false;
    }

    return true;
  }

  function validateAllowance() {
    const rawAllowance = allowanceInput.value.trim();

    if (!rawAllowance) {
      allowanceInput.classList.add("input-error");
      if (allowanceError)
        allowanceError.textContent = "Please enter your allowance amount.";
      showGlobalError("Please enter your allowance amount.");
      return false;
    }

    if (!/^\d+$/.test(rawAllowance)) {
      allowanceInput.classList.add("input-error");
      if (allowanceError)
        allowanceError.textContent = "Please enter numbers only.";
      showGlobalError("Please enter a valid allowance amount.");
      return false;
    }

    updateAllowanceIncome();
    return true;
  }

  function validateIncome() {
    const rawIncome = incomeInput.value.trim();

    if (!rawIncome) {
      if (incomeWarning) incomeWarning.classList.remove("hidden");
      if (incomeError)
        incomeError.textContent = "Please enter your weekly income.";

      incomeInput.classList.add("input-error");
      showGlobalError("Please complete this field to continue.");
      return false;
    }

    if (!/^\d+$/.test(rawIncome)) {
      if (incomeWarning) incomeWarning.classList.remove("hidden");
      if (incomeError)
        incomeError.textContent =
          "Please enter a valid weekly income amount in dollars.";

      incomeInput.classList.add("input-error");
      showGlobalError("Please enter a valid weekly income amount in dollars.");
      return false;
    }

    incomeHidden.value = rawIncome;
    return true;
  }

  function validateStudyField() {
    if (studyFieldBox && !studyFieldBox.classList.contains("hidden")) {
      if (!studyFieldInput.value.trim()) {
        showGlobalError("Please select your field of study or interest.");
        return false;
      }
    }

    return true;
  }

  function updateAllowanceIncome() {
    if (!allowanceInput || !allowanceFrequency || !incomeHidden) return;

    allowanceInput.value = allowanceInput.value.replace(/[^\d]/g, "");

    const rawAmount = allowanceInput.value.trim();

    if (!rawAmount) {
      incomeHidden.value = "";
      if (weeklyEstimate) weeklyEstimate.classList.add("hidden");
      return;
    }

    const amount = parseFloat(rawAmount);

    if (allowanceFrequency.value === "weekly") {
      incomeHidden.value = Math.round(amount);
      if (weeklyEstimate) weeklyEstimate.classList.add("hidden");
    }

    if (allowanceFrequency.value === "monthly") {
      const weeklyAmount = Math.round((amount * 12) / 52);

      incomeHidden.value = weeklyAmount;

      if (weeklyEstimateValue) weeklyEstimateValue.textContent = weeklyAmount;
      if (weeklyEstimate) weeklyEstimate.classList.remove("hidden");
    }
  }

  async function loadIndustries() {
    if (!industrySelect) return;

    try {
      // const basePath = window.location.pathname.startsWith("/underdevelopment")
      //   ? "/underdevelopment"
      //   : "";

      // const response = await fetch(`${basePath}/api/industries`);
      const response = await fetch(`/api/industries`);
      const industries = await response.json();

      industrySelect.innerHTML = `<option value="">Select an industry</option>`;

      industries.forEach((industry) => {
        const option = document.createElement("option");

        option.value = industry;
        option.textContent = industry;

        if (industryInput && industryInput.value === industry) {
          option.selected = true;
        }

        industrySelect.appendChild(option);
      });
    } catch (error) {
      console.error("Error loading industries:", error);
    }
  }

  async function loadStudyFields() {
    if (!studyFieldList) return;

    try {
      //   const basePath = window.location.pathname.startsWith("/underdevelopment")
      //     ? "/underdevelopment"
      //     : "";

      const response = await fetch(`/api/industries`);
      const fields = await response.json();

      studyFieldList.innerHTML = "";

      fields.forEach((field) => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "industry-option";
        button.textContent = field;

        if (studyFieldInput && studyFieldInput.value === field) {
          button.classList.add("selected");
        }

        button.addEventListener("click", function () {
          studyFieldList
            .querySelectorAll(".industry-option")
            .forEach((option) => {
              option.classList.remove("selected");
            });

          button.classList.add("selected");
          studyFieldInput.value = field;
          hideGlobalError();
        });

        studyFieldList.appendChild(button);
      });
    } catch (error) {
      console.error("Error loading study fields:", error);
    }
  }

  function initialiseSavedValues() {
    // if (stateInput.value.trim()) {
    //   locationSearchBox.classList.remove("hidden");
    // }
    locationSearchBox.classList.remove("hidden");

    if (localityInput.value && postcodeInput.value) {
      locationInput.value = `${localityInput.value} (${postcodeInput.value})`;
    }

    if (rentHidden.value) {
      rentInput.value = rentHidden.value;
    }

    if (incomeHidden.value) {
      incomeInput.value = incomeHidden.value;
    }

    if (
      livingInput.value === "Shared rental" ||
      livingInput.value === "Living alone"
    ) {
      rentBox.classList.remove("hidden");
    }

    if (workInput.value === "Not working") {
      allowanceBox.classList.remove("hidden");
      industryBox.classList.add("hidden");
    }

    if (
      workInput.value === "Casual or part-time" ||
      workInput.value === "Full-time"
    ) {
      allowanceBox.classList.add("hidden");
      industryBox.classList.remove("hidden");
      loadIndustries();
    }

    if (studyFieldInput.value) {
      studyFieldBox.classList.remove("hidden");
      loadStudyFields();
    }
  }

  document.querySelectorAll(".tile-group").forEach((group) => {
    const fieldName = group.dataset.name;
    const hiddenInput = document.getElementById(fieldName + "Input");
    const tiles = group.querySelectorAll(".tile");

    tiles.forEach((tile) => {
      if (hiddenInput && tile.textContent.trim() === hiddenInput.value.trim()) {
        tile.classList.add("selected");
      }

      tile.addEventListener("click", function () {
        tiles.forEach((item) => {
          item.classList.remove("selected", "input-error");
        });

        tile.classList.add("selected");

        if (hiddenInput) {
          hiddenInput.value = tile.textContent.trim();
        }

        handleTileSideEffects(fieldName, tile.textContent.trim());
        clearStepErrors(tile.closest(".question-step"));
        hideGlobalError();
      });
    });
  });

  function handleTileSideEffects(fieldName, selectedValue) {
    // if (fieldName === "state") {
    //   locationSearchBox.classList.remove("hidden");
    //   locationInput.value = "";
    //   locationInput.focus();
    //   localityInput.value = "";
    //   postcodeInput.value = "";
    //   locationSuggestions.innerHTML = "";
    // }

    if (fieldName === "living") {
      if (
        selectedValue === "Shared rental" ||
        selectedValue === "Living alone"
      ) {
        rentBox.classList.remove("hidden");
      } else {
        rentBox.classList.add("hidden");
        rentInput.value = "";
        rentHidden.value = "";
        rentError.textContent = "";
      }
    }

    if (fieldName === "work") {
      if (selectedValue === "Not working") {
        allowanceBox.classList.remove("hidden");
        industryBox.classList.add("hidden");
        industryInput.value = "";
      } else {
        allowanceBox.classList.add("hidden");
        industryBox.classList.remove("hidden");
        loadIndustries();
      }
    }

    if (fieldName === "study") {
      studyFieldBox.classList.remove("hidden");

      studyFieldLabel.textContent =
        selectedValue === "No"
          ? "What field are you interested in pursuing a qualification in?"
          : "What field are you pursuing your studies in?";

      studyFieldInput.value = "";
      studyFieldList.innerHTML = "";

      loadStudyFields();
    }
  }

  if (industrySelect && industryInput) {
    industrySelect.addEventListener("change", function () {
      industryInput.value = industrySelect.value;
      hideGlobalError();
    });
  }

  if (rentInput && rentHidden) {
    rentInput.addEventListener("input", function () {
      rentInput.value = rentInput.value.replace(/[^\d]/g, "");
      rentHidden.value = rentInput.value;

      rentInput.classList.remove("input-error");
      rentError.textContent = "";
      hideGlobalError();
    });
  }

  if (allowanceInput) {
    allowanceInput.addEventListener("input", function () {
      allowanceInput.classList.remove("input-error");
      allowanceError.textContent = "";

      updateAllowanceIncome();
      hideGlobalError();
    });
  }

  if (allowanceFrequency) {
    allowanceFrequency.addEventListener("change", updateAllowanceIncome);
  }

  if (incomeInput && incomeHidden) {
    incomeInput.addEventListener("input", function () {
      incomeInput.value = incomeInput.value.replace(/[^\d]/g, "");
      incomeHidden.value = incomeInput.value;

      incomeInput.classList.remove("input-error");
      if (incomeWarning) incomeWarning.classList.add("hidden");
      if (incomeError) incomeError.textContent = "";

      hideGlobalError();
    });
  }

  if (locationInput && locationSuggestions) {
    locationInput.addEventListener("input", async function () {
      const query = locationInput.value.trim();
      // const selectedState = stateInput.value.trim();

      localityInput.value = "";
      postcodeInput.value = "";

      if (query.length < 2) {
        locationSuggestions.innerHTML = "";
        return;
      }

      try {
        const response = await fetch(
          // `/api/locations?state=${encodeURIComponent(selectedState)}&q=${encodeURIComponent(query)}`
          `/api/locations?q=${encodeURIComponent(query)}`,
          // `${window.location.pathname.startsWith("/underdevelopment") ? "/underdevelopment" : ""}/api/locations?q=${encodeURIComponent(query)}`
        );

        const locations = await response.json();

        if (!locations.length) {
          locationSuggestions.innerHTML = `
            <div class="location-suggestion-item no-result">
              No matching locality found
            </div>
          `;
          return;
        }

        locationSuggestions.innerHTML = locations
          .map(
            (item) => `
          <button
            type="button"
            class="location-suggestion-item"
            data-locality="${item.locality}"
            data-postcode="${item.postcode}"
          >
            ${item.locality} (${item.postcode})
          </button>
        `,
          )
          .join("");
      } catch (error) {
        locationSuggestions.innerHTML = "";
        console.error("Location fetch error:", error);
      }
    });

    locationSuggestions.addEventListener("click", function (event) {
      const item = event.target.closest(".location-suggestion-item");
      if (!item || item.classList.contains("no-result")) return;

      const locality = item.dataset.locality;
      const postcode = item.dataset.postcode;

      locationInput.value = `${locality} (${postcode})`;
      localityInput.value = locality;
      postcodeInput.value = postcode;
      locationSuggestions.innerHTML = "";

      locationInput.classList.remove("input-error");
      hideGlobalError();
    });
  }

  nextBtn.addEventListener("click", function () {
    if (!validateStep(currentStep)) return;

    if (currentStep < steps.length - 1) {
      const selectedWork = workInput.value.trim();

      if (currentStep === 3 && selectedWork === "Not working") {
        currentStep = 5;
      } else {
        currentStep++;
      }

      updateStep();
    } else {
      form.submit();
    }
  });

  backBtn.addEventListener("click", function () {
    if (currentStep > 0) {
      const selectedWork = workInput.value.trim();

      if (currentStep === 5 && selectedWork === "Not working") {
        currentStep = 3;
      } else {
        currentStep--;
      }

      updateStep();
    }
  });

  initialiseSavedValues();
  updateStep();
}

/* Typing effect */
function initTypewriter() {
  const textElement = document.getElementById("typewriter-text");
  if (!textElement) return;

  const fullText = textElement.dataset.text || "";
  let index = 0;

  textElement.textContent = "";

  function typeNextCharacter() {
    if (index < fullText.length) {
      textElement.textContent += fullText.charAt(index);
      index++;
      setTimeout(typeNextCharacter, 25);
    }
  }

  typeNextCharacter();
}

/* Dashboard.html - chart */
function initIndustryInsightChart() {
  const canvas = document.getElementById("industryInsightChart");

  if (!canvas || typeof Chart === "undefined") return;

  // const BASE_PATH = window.location.pathname.startsWith("/underdevelopment")
  //   ? "/underdevelopment"
  //   : "";

  // fetch(`${BASE_PATH}/api/industry-chart`) for dev only
  fetch(`/api/industry-chart`)
    .then((response) => response.json())
    .then((response) => response.json())
    .then((data) => {
      const labels = data.map((item) => item.industry);
      const data2021 = data.map((item) => item.year_2021_22);
      const data2022 = data.map((item) => item.year_2022_23);

      new Chart(canvas.getContext("2d"), {
        type: "bar",
        data: {
          labels: labels,
          datasets: [
            {
              data: data2021,
              backgroundColor: "rgba(232, 84, 106, 0.7)",
              borderRadius: 10,
              barThickness: 18,
            },
            {
              data: data2022,
              backgroundColor: "rgba(155, 114, 207, 0.7)",
              borderRadius: 10,
              barThickness: 18,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,

          animation: {
            duration: 2000,
            easing: "easeOutQuart",
          },

          animations: {
            y: {
              from: 0,
              duration: 2000,
              easing: "easeOutQuart",
            },
          },

          plugins: {
            legend: {
              display: false,
            },
            tooltip: {
              enabled: false,
            },
          },

          scales: {
            x: {
              ticks: {
                display: false,
              },
              grid: {
                display: false,
              },
            },
            y: {
              ticks: {
                display: false,
              },
              grid: {
                display: false,
              },
              beginAtZero: true,
            },
          },
        },
      });
    })
    .catch((error) => {
      console.error("Chart fetch error:", error);
    });
}

/* ABS Data Sources Popup */
function initAbsDataModal() {
  const absDataBtn = document.getElementById("absDataBtn");
  const absModal = document.getElementById("absModal");
  const absModalClose = document.getElementById("absModalClose");

  if (!absDataBtn || !absModal || !absModalClose) return;

  function openModal() {
    absModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    absModal.classList.add("hidden");
    document.body.style.overflow = "";
  }

  absDataBtn.addEventListener("click", openModal);

  absModalClose.addEventListener("click", closeModal);

  absModal.addEventListener("click", function (event) {
    if (event.target === absModal) {
      closeModal();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !absModal.classList.contains("hidden")) {
      closeModal();
    }
  });
}

function initTosModal() {
  const trigger = document.getElementById("tosModalTrigger");
  const modal = document.getElementById("tosModal");
  const close = document.getElementById("tosModalClose");

  if (!trigger || !modal || !close) return;

  trigger.addEventListener("click", function () {
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  });

  close.addEventListener("click", function () {
    modal.classList.add("hidden");
    document.body.style.overflow = "";
  });

  modal.addEventListener("click", function (e) {
    if (e.target === modal) {
      modal.classList.add("hidden");
      document.body.style.overflow = "";
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) {
      modal.classList.add("hidden");
      document.body.style.overflow = "";
    }
  });
}
