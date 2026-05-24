/* --------------------------------------------------------------------------
   dashboard.js

   Page-specific JavaScript for dashboard.html.

   Responsibilities:
   1. Render the financial snapshot with a typewriter effect.
   2. Handle ABS Data Sources and Terms of Service modals.
   3. Handle the dashboard tutorial.
-------------------------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", function () {
  initDashboardTypewriter();
  initDashboardModals();
  initDashboardTutorial();
});

/* --------------------------------------------------------------------------
   Typewriter effect
-------------------------------------------------------------------------- */

function initDashboardTypewriter() {
  const textElement = document.getElementById("typewriterText");

  if (!textElement) return;

  const fullText = textElement.dataset.text || "";

  if (!fullText.trim()) {
    textElement.textContent =
      "Your dashboard is ready. Explore each module to understand your financial position, living options, spending, and future goals.";
    textElement.classList.add("typewriter-complete");
    return;
  }

  let index = 0;
  const typingSpeed = 22;

  function typeNextCharacter() {
    textElement.textContent = fullText.slice(0, index);

    if (index <= fullText.length) {
      index += 1;
      window.setTimeout(typeNextCharacter, typingSpeed);
      return;
    }

    textElement.classList.add("typewriter-complete");
  }

  typeNextCharacter();
}

/* --------------------------------------------------------------------------
   Footer modals
-------------------------------------------------------------------------- */

function initDashboardModals() {
  const modalTriggers = document.querySelectorAll("[data-modal-target]");
  const modalOverlays = document.querySelectorAll(".modal-overlay");

  if (!modalTriggers.length || !modalOverlays.length) return;

  function openModal(modal) {
    if (!modal) return;

    modal.classList.remove("hidden", "hidden");

    // Prevent the background page from scrolling while a modal is open.
    document.body.style.overflow = "hidden";
  }

  function closeModal(modal) {
    if (!modal) return;

    modal.classList.add("hidden", "hidden");

    // Restore page scrolling after the modal closes.
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

    // Close only when the user clicks the dark overlay, not the modal box.
    modal.addEventListener("click", function (event) {
      if (event.target === modal) {
        closeModal(modal);
      }
    });
  });

  // Escape key closes open modals.
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeAllModals();
    }
  });
}

/* --------------------------------------------------------------------------
   Dashboard tutorial
-------------------------------------------------------------------------- */

function initDashboardTutorial() {
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
      targetId: "typewriterText",
      title: "Your financial snapshot",
      description:
        "This is your personalised summary based on the details you entered. It updates every time you rebuild your profile.",
    },
    {
      targetId: "insightsGrid",
      title: "Your insight modules",
      description:
        "Each card takes you to a different part of Hermap. Select any tile to explore income, rent, spending, debt, careers, or financial literacy.",
    },
  ];

  let currentStepIndex = 0;
  let isTutorialActive = false;

  function startTutorial() {
    currentStepIndex = 0;
    isTutorialActive = true;

    overlay.classList.remove("hidden");
    highlight.classList.remove("hidden");
    popover.classList.remove("hidden");

    document.body.style.overflow = "hidden";

    renderTutorialStep();
  }

  function endTutorial() {
    isTutorialActive = false;

    overlay.classList.add("hidden");
    highlight.classList.add("hidden");
    popover.classList.add("hidden");

    document.body.style.overflow = "";
  }

  function goToNextStep() {
    if (currentStepIndex >= tutorialSteps.length - 1) {
      endTutorial();
      return;
    }

    currentStepIndex += 1;
    renderTutorialStep();
  }

  function renderTutorialStep() {
    const step = tutorialSteps[currentStepIndex];
    const target = document.getElementById(step.targetId);

    if (!target) {
      goToNextStep();
      return;
    }

    target.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    /*
      Wait briefly after scrolling so the target position is accurate before
      drawing the highlight box.
    */
    window.setTimeout(function () {
      positionHighlight(target);
      positionPopover(target);

      stepLabel.textContent = `Step ${currentStepIndex + 1} of ${tutorialSteps.length}`;
      title.textContent = step.title;
      description.textContent = step.description;

      nextButton.textContent =
        currentStepIndex === tutorialSteps.length - 1 ? "Finish" : "Next";
    }, 250);
  }

  function positionHighlight(target) {
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

  function positionPopover(target) {
    const rect = target.getBoundingClientRect();
    const popoverWidth = Math.min(360, window.innerWidth - 32);
    const gap = 18;

    let top = rect.bottom + gap;
    let left = rect.left;

    // If there is not enough space below, place the popover above the target.
    if (top + 260 > window.innerHeight) {
      top = rect.top - 260 - gap;
    }

    // Keep popover inside the viewport horizontally.
    if (left + popoverWidth > window.innerWidth - 16) {
      left = window.innerWidth - popoverWidth - 16;
    }

    if (left < 16) {
      left = 16;
    }

    // Keep popover inside the viewport vertically.
    if (top < 16) {
      top = 16;
    }

    popover.style.top = `${top}px`;
    popover.style.left = `${left}px`;
  }

  tutorialFab.addEventListener("click", startTutorial);
  skipButton.addEventListener("click", endTutorial);
  nextButton.addEventListener("click", goToNextStep);

  window.addEventListener("resize", function () {
    if (!isTutorialActive) return;

    renderTutorialStep();
  });

  document.addEventListener("keydown", function (event) {
    if (!isTutorialActive) return;

    if (event.key === "Escape") {
      endTutorial();
    }
  });
}
