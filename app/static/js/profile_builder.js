/* --------------------------------------------------------------------------
   profile_builder.js

   Page-specific JavaScript for profile_build_1.html.

   Responsibilities:
   1. Move the user through the profile wizard step by step.
   2. Validate each step before allowing the user to continue.
   3. Store visible input values into hidden fields for Flask session storage.
   4. Load locations and industries from backend APIs.
   5. Support deployment under /underdevelopment as well as local root paths.
-------------------------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", function () {
  initProfileBuilder();
});

function initProfileBuilder() {
  const form = document.getElementById("profileForm");
  if (!form) return;

  /* ------------------------------------------------------------------------
     Main wizard elements
  ------------------------------------------------------------------------ */

  const steps = document.querySelectorAll(".question-step");
  const nextBtn = document.getElementById("nextBtn");
  const backBtn = document.getElementById("backBtn");
  const progressFill = document.getElementById("progressFill");
  const questionCounter = document.getElementById("questionCounter");
  const formErrorBox = document.getElementById("formErrorBox");
  const formErrorText = document.getElementById("formErrorText");

  /* ------------------------------------------------------------------------
     Hidden fields submitted to Flask
  ------------------------------------------------------------------------ */

  const ageHidden = document.getElementById("ageInput");
  const localityInput = document.getElementById("localityInput");
  const postcodeInput = document.getElementById("postcodeInput");
  const livingInput = document.getElementById("livingInput");
  const rentHidden = document.getElementById("rentHidden");
  const workInput = document.getElementById("workInput");
  const industryInput = document.getElementById("industryInput");
  const incomeHidden = document.getElementById("incomeHidden");
  const studyInput = document.getElementById("studyInput");
  const studyFieldInput = document.getElementById("studyFieldInput");

  /* ------------------------------------------------------------------------
     Visible fields and conditional sections
  ------------------------------------------------------------------------ */

  const ageInput = document.getElementById("age");
  const ageWarning = document.getElementById("ageWarning");

  const locationSearchBox = document.getElementById("locationSearchBox");
  const locationInput = document.getElementById("locationInput");
  const locationSuggestions = document.getElementById("locationSuggestions");

  const rentBox = document.getElementById("rentBox");
  const rentInput = document.getElementById("rentInput");
  const rentError = document.getElementById("rentError");

  const allowanceBox = document.getElementById("allowanceBox");
  const allowanceInput = document.getElementById("allowanceInput");
  const allowanceFrequency = document.getElementById("allowanceFrequency");
  const allowanceError = document.getElementById("allowanceError");
  const weeklyEstimate = document.getElementById("weeklyEstimate");
  const weeklyEstimateValue = document.getElementById("weeklyEstimateValue");

  const industryBox = document.getElementById("industryBox");
  const industrySelect = document.getElementById("industrySelect");

  const incomeInput = document.getElementById("income");
  const incomeWarning = document.getElementById("incomeWarning");
  const incomeError = document.getElementById("incomeError");

  const studyFieldBox = document.getElementById("studyFieldBox");
  const studyFieldList = document.getElementById("studyFieldList");
  const studyFieldLabel = document.getElementById("studyFieldLabel");

  let currentStep = getInitialStepFromHash();

  /* ------------------------------------------------------------------------
     Deployment helper

     When the app is deployed under /underdevelopment, root-level API calls like
     /api/locations may miss the prefixed Flask app. This helper keeps API calls
     working locally and on the underdevelopment deployment.
  ------------------------------------------------------------------------ */

  function getAppBasePath() {
    return window.location.pathname.startsWith("/underdevelopment")
      ? "/underdevelopment"
      : "";
  }

  function buildApiUrl(path) {
    return `${getAppBasePath()}${path}`;
  }

  /* ------------------------------------------------------------------------
     Wizard display helpers
  ------------------------------------------------------------------------ */

  function updateStep() {
    steps.forEach(function (step, index) {
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

    if (!hash || !hash.startsWith("#step-")) {
      return 0;
    }

    const stepNumber = parseInt(hash.replace("#step-", ""), 10);

    if (
      Number.isNaN(stepNumber) ||
      stepNumber < 1 ||
      stepNumber > steps.length
    ) {
      return 0;
    }

    return stepNumber - 1;
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
    if (!step) return;

    const errorText = step.querySelector(".field-error");
    const warning = step.querySelector(".field-warning");

    if (errorText) errorText.textContent = "";
    if (warning) warning.classList.add("hidden");

    step.querySelectorAll(".tile").forEach(function (tile) {
      tile.classList.remove("input-error");
    });

    [ageInput, locationInput, rentInput, allowanceInput, incomeInput].forEach(
      function (input) {
        if (input) input.classList.remove("input-error");
      },
    );

    if (rentError) rentError.textContent = "";
    if (allowanceError) allowanceError.textContent = "";
    if (incomeError) incomeError.textContent = "";
    if (incomeWarning) incomeWarning.classList.add("hidden");
    if (ageWarning) ageWarning.classList.add("hidden");
  }

  /* ------------------------------------------------------------------------
     Validation
  ------------------------------------------------------------------------ */

  function validateStep(stepIndex) {
    const step = steps[stepIndex];
    clearStepErrors(step);

    const tileGroup = step.querySelector(".tile-group");

    if (tileGroup && !validateTileGroup(tileGroup, step)) {
      return false;
    }

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
    const hiddenInput = document.getElementById(`${fieldName}Input`);
    const warning = step.querySelector(".field-warning");
    const errorText = step.querySelector(".field-error");

    if (!hiddenInput || !hiddenInput.value.trim()) {
      if (warning) warning.classList.remove("hidden");

      if (errorText) {
        errorText.textContent = "Please complete this field to continue.";
      }

      tileGroup.querySelectorAll(".tile").forEach(function (tile) {
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
      rentHidden.value = "";
      return true;
    }

    const rawRent = rentInput.value.trim();

    if (!rawRent) {
      rentInput.classList.add("input-error");

      if (rentError) {
        rentError.textContent = "Please enter your weekly rent.";
      }

      showGlobalError("Please enter your weekly rent.");
      return false;
    }

    if (!/^\d+$/.test(rawRent)) {
      rentInput.classList.add("input-error");

      if (rentError) {
        rentError.textContent = "Please enter a valid weekly rent amount.";
      }

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

      if (allowanceError) {
        allowanceError.textContent = "Please enter your allowance amount.";
      }

      showGlobalError("Please enter your allowance amount.");
      return false;
    }

    if (!/^\d+$/.test(rawAllowance)) {
      allowanceInput.classList.add("input-error");

      if (allowanceError) {
        allowanceError.textContent = "Please enter numbers only.";
      }

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

      if (incomeError) {
        incomeError.textContent = "Please enter your weekly income.";
      }

      incomeInput.classList.add("input-error");
      showGlobalError("Please complete this field to continue.");

      return false;
    }

    if (!/^\d+$/.test(rawIncome)) {
      if (incomeWarning) incomeWarning.classList.remove("hidden");

      if (incomeError) {
        incomeError.textContent =
          "Please enter a valid weekly income amount in dollars.";
      }

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

  /* ------------------------------------------------------------------------
     Conditional income logic
  ------------------------------------------------------------------------ */

  function updateAllowanceIncome() {
    if (!allowanceInput || !allowanceFrequency || !incomeHidden) return;

    allowanceInput.value = allowanceInput.value.replace(/[^\d]/g, "");

    const rawAmount = allowanceInput.value.trim();

    if (!rawAmount) {
      incomeHidden.value = "";

      if (weeklyEstimate) {
        weeklyEstimate.classList.add("hidden");
      }

      return;
    }

    const amount = parseFloat(rawAmount);

    if (allowanceFrequency.value === "weekly") {
      incomeHidden.value = Math.round(amount);

      if (weeklyEstimate) {
        weeklyEstimate.classList.add("hidden");
      }
    }

    if (allowanceFrequency.value === "monthly") {
      const weeklyAmount = Math.round((amount * 12) / 52);

      incomeHidden.value = weeklyAmount;

      if (weeklyEstimateValue) {
        weeklyEstimateValue.textContent = weeklyAmount;
      }

      if (weeklyEstimate) {
        weeklyEstimate.classList.remove("hidden");
      }
    }
  }

  /* ------------------------------------------------------------------------
     API loading
  ------------------------------------------------------------------------ */

  async function loadIndustries() {
    if (!industrySelect) return;

    try {
      const response = await fetch(buildApiUrl("/api/industries"));

      if (!response.ok) {
        throw new Error(`Industries API failed with status ${response.status}`);
      }

      const industries = await response.json();

      industrySelect.innerHTML = `<option value="">Select an industry</option>`;

      industries.forEach(function (industry) {
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
      const response = await fetch(buildApiUrl("/api/industries"));

      if (!response.ok) {
        throw new Error(
          `Study fields API failed with status ${response.status}`,
        );
      }

      const fields = await response.json();

      studyFieldList.innerHTML = "";

      fields.forEach(function (field) {
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
            .forEach(function (option) {
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

  /* ------------------------------------------------------------------------
     Restore existing session values when editing profile
  ------------------------------------------------------------------------ */

  function initialiseSavedValues() {
    if (locationSearchBox) {
      locationSearchBox.classList.remove("hidden");
    }

    if (localityInput.value && postcodeInput.value) {
      locationInput.value = `${localityInput.value} (${postcodeInput.value})`;
    }

    if (rentHidden.value && rentInput) {
      rentInput.value = rentHidden.value;
    }

    if (incomeHidden.value && incomeInput) {
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

    if (studyInput.value || studyFieldInput.value) {
      studyFieldBox.classList.remove("hidden");
      setStudyFieldLabel(studyInput.value);
      loadStudyFields();
    }
  }

  /* ------------------------------------------------------------------------
     Tile click handling
  ------------------------------------------------------------------------ */

  document.querySelectorAll(".tile-group").forEach(function (group) {
    const fieldName = group.dataset.name;
    const hiddenInput = document.getElementById(`${fieldName}Input`);
    const tiles = group.querySelectorAll(".tile");

    tiles.forEach(function (tile) {
      if (hiddenInput && tile.textContent.trim() === hiddenInput.value.trim()) {
        tile.classList.add("selected");
      }

      tile.addEventListener("click", function () {
        tiles.forEach(function (item) {
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
    if (fieldName === "living") {
      handleLivingSelection(selectedValue);
    }

    if (fieldName === "work") {
      handleWorkSelection(selectedValue);
    }

    if (fieldName === "study") {
      handleStudySelection(selectedValue);
    }
  }

  function handleLivingSelection(selectedValue) {
    if (selectedValue === "Shared rental" || selectedValue === "Living alone") {
      rentBox.classList.remove("hidden");
      return;
    }

    rentBox.classList.add("hidden");
    rentInput.value = "";
    rentHidden.value = "";

    if (rentError) {
      rentError.textContent = "";
    }
  }

  function handleWorkSelection(selectedValue) {
    if (selectedValue === "Not working") {
      allowanceBox.classList.remove("hidden");
      industryBox.classList.add("hidden");

      industryInput.value = "";
      incomeInput.value = "";
      incomeHidden.value = "";

      return;
    }

    allowanceBox.classList.add("hidden");
    industryBox.classList.remove("hidden");

    allowanceInput.value = "";
    incomeHidden.value = "";
    if (weeklyEstimate) weeklyEstimate.classList.add("hidden");

    loadIndustries();
  }

  function handleStudySelection(selectedValue) {
    studyFieldBox.classList.remove("hidden");

    setStudyFieldLabel(selectedValue);

    studyFieldInput.value = "";
    studyFieldList.innerHTML = "";

    loadStudyFields();
  }

  function setStudyFieldLabel(selectedValue) {
    if (!studyFieldLabel) return;

    studyFieldLabel.textContent =
      selectedValue === "No"
        ? "What field are you interested in pursuing a qualification in?"
        : "What field are you pursuing your studies in?";
  }

  /* ------------------------------------------------------------------------
     Field events
  ------------------------------------------------------------------------ */

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

      if (rentError) {
        rentError.textContent = "";
      }

      hideGlobalError();
    });
  }

  if (allowanceInput) {
    allowanceInput.addEventListener("input", function () {
      allowanceInput.classList.remove("input-error");

      if (allowanceError) {
        allowanceError.textContent = "";
      }

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

      if (incomeWarning) {
        incomeWarning.classList.add("hidden");
      }

      if (incomeError) {
        incomeError.textContent = "";
      }

      hideGlobalError();
    });
  }

  if (ageInput && ageHidden) {
    ageInput.addEventListener("input", function () {
      ageInput.value = ageInput.value.replace(/[^\d]/g, "");
      ageHidden.value = ageInput.value;

      ageInput.classList.remove("input-error");

      if (ageWarning) {
        ageWarning.classList.add("hidden");
      }

      hideGlobalError();
    });
  }

  if (locationInput && locationSuggestions) {
    locationInput.addEventListener("input", handleLocationSearch);
    locationSuggestions.addEventListener("click", handleLocationSelection);
  }

  async function handleLocationSearch() {
    const query = locationInput.value.trim();

    localityInput.value = "";
    postcodeInput.value = "";

    if (query.length < 2) {
      locationSuggestions.innerHTML = "";
      return;
    }

    try {
      const response = await fetch(
        buildApiUrl(`/api/locations?q=${encodeURIComponent(query)}`),
      );

      if (!response.ok) {
        throw new Error(`Locations API failed with status ${response.status}`);
      }

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
        .map(function (item) {
          return `
            <button
              type="button"
              class="location-suggestion-item"
              data-locality="${item.locality}"
              data-postcode="${item.postcode}"
            >
              ${item.locality} (${item.postcode})
            </button>
          `;
        })
        .join("");
    } catch (error) {
      locationSuggestions.innerHTML = "";
      console.error("Location fetch error:", error);
    }
  }

  function handleLocationSelection(event) {
    const item = event.target.closest(".location-suggestion-item");

    if (!item || item.classList.contains("no-result")) {
      return;
    }

    const locality = item.dataset.locality;
    const postcode = item.dataset.postcode;

    locationInput.value = `${locality} (${postcode})`;
    localityInput.value = locality;
    postcodeInput.value = postcode;
    locationSuggestions.innerHTML = "";

    locationInput.classList.remove("input-error");
    hideGlobalError();
  }

  /* ------------------------------------------------------------------------
     Navigation buttons
  ------------------------------------------------------------------------ */

  nextBtn.addEventListener("click", function () {
    if (!validateStep(currentStep)) return;

    if (currentStep < steps.length - 1) {
      const selectedWork = workInput.value.trim();

      /*
        If the user is not working, weekly income comes from allowance.
        Therefore, the separate income step is skipped.
      */
      if (currentStep === 3 && selectedWork === "Not working") {
        currentStep = 5;
      } else {
        currentStep++;
      }

      updateStep();
      return;
    }

    form.submit();
  });

  backBtn.addEventListener("click", function () {
    if (currentStep <= 0) return;

    const selectedWork = workInput.value.trim();

    /*
      If the user skipped the income step because they are not working,
      going back from study should return to work status.
    */
    if (currentStep === 5 && selectedWork === "Not working") {
      currentStep = 3;
    } else {
      currentStep--;
    }

    updateStep();
  });

  initialiseSavedValues();
  updateStep();
}
