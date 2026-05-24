/* --------------------------------------------------------------------------
   landing_page.js

   Page-specific JavaScript for landing_page.html only.
   Handles:
   1. ABS data modal
   2. Terms of Service modal
-------------------------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", function () {
  initLandingModals();
});

function initLandingModals() {
  const modalTriggers = document.querySelectorAll("[data-modal-target]");
  const modalOverlays = document.querySelectorAll(".modal-overlay");

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
