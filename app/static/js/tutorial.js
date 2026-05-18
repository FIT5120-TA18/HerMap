/* ============================================================
   tutorial.js — Shared spotlight tutorial engine
   Used by: dashboard, forecast, rent_comparison,
            spending_tracker, income_comparison, debt_projection

   USAGE
   -----
   1. Add the HTML snippet below to your page (before </body>):

      <button class="tutorial-fab" id="tutorialFab"
              onclick="startTutorial()" aria-label="Start tutorial">
        <span class="material-symbols-outlined">help</span>
      </button>

      <div class="tutorial-spotlight-overlay" id="tutorialOverlay"
           style="display:none;"></div>
      <div class="tutorial-highlight-box" id="tutorialHighlight"></div>
      <div class="tutorial-popover" id="tutorialPopover">
        <div class="tutorial-step-indicator">
          <span id="tutorialStepLabel">Step 1 of 5</span>
        </div>
        <h2 id="tutorialTitle"></h2>
        <p  id="tutorialDesc"></p>
        <div class="tutorial-actions">
          <button class="tutorial-skip-btn" onclick="endTutorial()">
            Skip tutorial
          </button>
          <button class="tutorial-next-btn" id="tutorialNextBtn"
                  onclick="tutorialNext()">Next</button>
        </div>
      </div>

   2. In your page-specific JS file, define TUTORIAL_STEPS before this
      script loads, OR define it in a <script> block on the page:

      const TUTORIAL_STEPS = [
        {
          targetId: 'someElementId',
          title:    'Step heading',
          desc:     'Step description.'
        },
        // …more steps
      ];

   3. Load this file AFTER style.css / tutorial.css and AFTER your
      page-specific JS that defines TUTORIAL_STEPS:

      <link  rel="stylesheet" href="tutorial.css" />
      <script src="your-page.js"></script>
      <script src="tutorial.js"></script>

   4. Auto-launch is keyed per page using a sessionStorage key derived
      from the current path (e.g. "tutorialSeen:/debt_projection").
      That means dismissing on one page never silences another.
   ============================================================ */

(function () {
  /* ── Scroll lock ─────────────────────────────────────────── */
  function lockScroll()   { document.body.style.overflow = 'hidden'; }
  function unlockScroll() { document.body.style.overflow = ''; }

  /* ── Session key (unique per page path) ──────────────────── */
  function seenKey() {
    return 'tutorialSeen:' + window.location.pathname;
  }

  /* ── State ───────────────────────────────────────────────── */
  let tutorialStep = 0;

  /* ── Public API ──────────────────────────────────────────── */
  window.startTutorial = function () {
    if (typeof TUTORIAL_STEPS === 'undefined' || !TUTORIAL_STEPS.length) {
      console.warn('tutorial.js: TUTORIAL_STEPS is not defined on this page.');
      return;
    }
    tutorialStep = 0;
    lockScroll();
    document.getElementById('tutorialOverlay').style.display = 'block';
    document.getElementById('tutorialFab').style.display = 'none';
    renderTutorialStep();
  };

  window.tutorialNext = function () {
    if (tutorialStep < TUTORIAL_STEPS.length - 1) {
      tutorialStep++;
      document.getElementById('tutorialHighlight').classList.remove('is-ready');
      document.getElementById('tutorialPopover').classList.remove('is-ready');
      setTimeout(renderTutorialStep, 200);
    } else {
      endTutorial();
    }
  };

  window.endTutorial = function () {
    document.querySelectorAll('.tutorial-active-target').forEach(el => {
      el.classList.remove('tutorial-active-target');
    });
    unlockScroll();
    document.getElementById('tutorialOverlay').style.display = 'none';
    document.getElementById('tutorialHighlight').classList.remove('is-ready');
    document.getElementById('tutorialPopover').classList.remove('is-ready');
    document.getElementById('tutorialFab').style.display = 'flex';
    sessionStorage.setItem(seenKey(), 'true');
  };

  /* ── Rendering ───────────────────────────────────────────── */
  function renderTutorialStep() {
    const step  = TUTORIAL_STEPS[tutorialStep];
    const total = TUTORIAL_STEPS.length;

    document.getElementById('tutorialStepLabel').textContent =
      `Step ${tutorialStep + 1} of ${total}`;
    document.getElementById('tutorialTitle').textContent = step.title;
    document.getElementById('tutorialDesc').textContent  = step.desc;
    document.getElementById('tutorialNextBtn').textContent =
      tutorialStep === total - 1 ? 'Done' : 'Next';

    // Clear previous highlight
    document.querySelectorAll('.tutorial-active-target').forEach(el => {
      el.classList.remove('tutorial-active-target');
    });

    const target = document.getElementById(step.targetId);
    if (!target) return;
    target.classList.add('tutorial-active-target');

    target.scrollIntoView({ behavior: 'smooth', block: 'center' });

    setTimeout(() => {
      const rect = target.getBoundingClientRect();
      const PAD  = 10;

      const highlight = document.getElementById('tutorialHighlight');
      highlight.style.top    = `${rect.top  - PAD}px`;
      highlight.style.left   = `${rect.left - PAD}px`;
      highlight.style.width  = `${rect.width  + PAD * 2}px`;
      highlight.style.height = `${rect.height + PAD * 2}px`;
      highlight.style.boxShadow   = '0 0 0 9999px rgba(28,23,20,0.55)';
      highlight.style.borderRadius = '18px';

      positionPopover(rect, PAD);

      setTimeout(() => {
        highlight.classList.add('is-ready');
        document.getElementById('tutorialPopover').classList.add('is-ready');
      }, 50);
    }, 400);
  }

  function positionPopover(rect, pad) {
    const popover = document.getElementById('tutorialPopover');
    popover.classList.remove('is-ready');

    const POPOVER_HEIGHT = 220;
    const POPOVER_WIDTH  = 360;
    const MARGIN         = 16;

    const spaceRight = window.innerWidth  - rect.right;
    const spaceLeft  = rect.left;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    let top, left;

    if (spaceRight >= POPOVER_WIDTH + MARGIN) {
      left = rect.right + pad + MARGIN;
      top  = rect.top + (rect.height / 2) - (POPOVER_HEIGHT / 2);
    } else if (spaceLeft >= POPOVER_WIDTH + MARGIN) {
      left = rect.left - POPOVER_WIDTH - pad - MARGIN;
      top  = rect.top + (rect.height / 2) - (POPOVER_HEIGHT / 2);
    } else if (spaceBelow >= POPOVER_HEIGHT + MARGIN) {
      top  = rect.bottom + pad + MARGIN;
      left = rect.left;
    } else if (spaceAbove >= POPOVER_HEIGHT + MARGIN) {
      top  = rect.top - POPOVER_HEIGHT - pad - MARGIN;
      left = rect.left;
    } else {
      top  = window.innerHeight / 2 - POPOVER_HEIGHT / 2;
      left = window.innerWidth  / 2 - POPOVER_WIDTH  / 2;
    }

    top  = Math.min(Math.max(top,  MARGIN), window.innerHeight - POPOVER_HEIGHT - MARGIN);
    left = Math.min(Math.max(left, MARGIN), window.innerWidth  - POPOVER_WIDTH  - MARGIN);

    popover.style.top   = `${top}px`;
    popover.style.left  = `${left}px`;
    popover.style.width = `${POPOVER_WIDTH}px`;
  }

  /* ── Auto-launch on first visit (per page) ───────────────── */
  window.addEventListener('DOMContentLoaded', () => {
    if (!sessionStorage.getItem(seenKey())) {
      setTimeout(startTutorial, 800);
    }
  });
})();
