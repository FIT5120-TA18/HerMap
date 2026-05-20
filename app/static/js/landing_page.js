/* --------------------------------------------------------------------------
   landing_page.js

   Page-specific JavaScript for landing_page.html only.
   This file replaces the old global script.js usage on the landing page.
   It currently handles:
   1. ABS data modal
   2. Terms of Service modal
-------------------------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", function () {
  initLandingModals();
});

function initLandingModals() {
  /*
    One reusable modal system is cleaner than writing separate functions for
    ABS Data Sources and Terms of Service.

    HTML requirements:
    - Open buttons use: data-modal-target="modalId"
    - Close buttons use: data-modal-close
    - Modal overlays use the class: landing-modal-overlay
  */
  const modalTriggers = document.querySelectorAll("[data-modal-target]");
  const modalOverlays = document.querySelectorAll(".landing-modal-overlay");

  if (!modalTriggers.length || !modalOverlays.length) return;

  function openModal(modal) {
    if (!modal) return;

    modal.classList.remove("hidden");

    // Prevent the page behind the modal from scrolling while the modal is open.
    document.body.style.overflow = "hidden";
  }

  function closeModal(modal) {
    if (!modal) return;

    modal.classList.add("hidden");

    // Restore normal page scrolling after the modal closes.
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

    // Close only when the user clicks the dark overlay, not the modal content.
    modal.addEventListener("click", function (event) {
      if (event.target === modal) {
        closeModal(modal);
      }
    });
  });

  // Escape key closes whichever modal is currently open.
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeAllModals();
    }
  });
}
