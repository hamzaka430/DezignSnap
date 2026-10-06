/* ==========================================================================
   DezignSnap — Showcase & Interactive Simulator App Logic
   Ponytail Principle: Lean, zero external dependencies, robust native DOM
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initNavbar();
  initDemoSimulator();
});

// Dynamic navbar styling on scroll
function initNavbar() {
  const navbar = document.getElementById("navbar");
  if (!navbar) return;

  window.addEventListener("scroll", () => {
    if (window.scrollY > 30) {
      navbar.style.boxShadow = "0 4px 20px rgba(74, 21, 75, 0.08)";
    } else {
      navbar.style.boxShadow = "none";
    }
  }, { passive: true });
}

// Interactive Scenario Simulator
function initDemoSimulator() {
  const demoTabs = document.querySelectorAll(".demo-tab");
  const demoDisplay = document.getElementById("demoDisplay");
  if (!demoTabs.length || !demoDisplay) return;

  const SCENARIOS = {
    mcq: {
      label: "SCENARIO: Frontend Performance Question",
      question: "Which Web Vital metric measures visual stability during page load?",
      choices: [
        { key: "A", text: "A) LCP (Largest Contentful Paint)", isCorrect: false },
        { key: "B", text: "B) CLS (Cumulative Layout Shift)", isCorrect: true },
        { key: "C", text: "C) INP (Interaction to Next Paint)", isCorrect: false },
        { key: "D", text: "D) TTFB (Time to First Byte)", isCorrect: false }
      ],
      correctKey: "B",
      correctTitle: "Option B (CLS - Cumulative Layout Shift)",
      analysis: [
        { strong: "Why B is correct:", text: "CLS measures unexpected layout shifts occurring during rendering, quantifying visual stability." },
        { strong: "Why A is incorrect:", text: "LCP measures loading performance (when the main content block has finished painting)." },
        { strong: "Why C is incorrect:", text: "INP measures interactivity and latency after user inputs." },
        { strong: "Why D is incorrect:", text: "TTFB measures backend network response latency." }
      ]
    },
    code: {
      label: "SCENARIO: Async React Memory Leak Bug",
      question: "Why does calling setState inside this uncancelled setTimeout trigger a warning?",
      choices: [
        { key: "A", text: "A) React 18 forbids setTimeout entirely", isCorrect: false },
        { key: "B", text: "B) Updating unmounted component state causes leaks", isCorrect: true },
        { key: "C", text: "C) State must be passed via URL query params", isCorrect: false },
        { key: "D", text: "D) useState is strictly synchronous only", isCorrect: false }
      ],
      correctKey: "B",
      correctTitle: "Option B (Unmounted Component State Mutation)",
      analysis: [
        { strong: "Why B is correct:", text: "If the component unmounts before the timer fires, invoking the setState closure references unmounted fiber nodes." },
        { strong: "Why A is incorrect:", text: "setTimeout is fully standard in React effects when paired with a cleanup return function." },
        { strong: "Why C is incorrect:", text: "Component state does not require query param reflection." },
        { strong: "Why D is incorrect:", text: "State updaters are scheduled asynchronously via React dispatchers." }
      ]
    },
    ui: {
      label: "SCENARIO: Responsive Flexbox Alignment",
      question: "How do you vertically center flex children when flex-direction is column?",
      choices: [
        { key: "A", text: "A) align-items: center", isCorrect: false },
        { key: "B", text: "B) justify-content: center", isCorrect: true },
        { key: "C", text: "C) align-content: middle", isCorrect: false },
        { key: "D", text: "D) vertical-align: middle", isCorrect: false }
      ],
      correctKey: "B",
      correctTitle: "Option B (justify-content: center)",
      analysis: [
        { strong: "Why B is correct:", text: "When flex-direction is column, the main axis becomes vertical, so justify-content controls vertical alignment." },
        { strong: "Why A is incorrect:", text: "align-items controls the cross axis (horizontal when flex-direction is column)." },
        { strong: "Why C is incorrect:", text: "'middle' is not a valid CSS keyword for align-content." },
        { strong: "Why D is incorrect:", text: "vertical-align only applies to inline or table-cell display boxes." }
      ]
    }
  };

  let currentMode = "mcq";

  demoTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      demoTabs.forEach((t) => {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");

      currentMode = tab.dataset.mode;
      renderScenario(SCENARIOS[currentMode]);
    });
  });

  function renderScenario(data, selectedChoiceKey = null) {
    const isSycophancyCheck = selectedChoiceKey && selectedChoiceKey !== data.correctKey;

    let sychopancyAlert = "";
    if (isSycophancyCheck) {
      sychopancyAlert = `
        <div style="background: #fff4e5; border: 1.5px solid #ffa117; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; font-size: 12px; color: #8f4d00;">
          <strong>Zero-Sycophancy Check Triggered:</strong> You selected <strong>Option ${selectedChoiceKey}</strong>. Notice how DezignSnap does NOT agree with your selection just because it is highlighted. It independently verified the question and proves Option ${data.correctKey} is the true answer.
        </div>
      `;
    }

    demoDisplay.innerHTML = `
      <div class="demo-scenario">
        <span class="scenario-label">${data.label}</span>
        <p class="scenario-question"><strong>${data.question}</strong></p>
        <div class="scenario-choices">
          ${data.choices.map((c) => {
            const isSelected = selectedChoiceKey === c.key;
            const isTargetCorrect = c.key === data.correctKey;
            let extraClass = isSelected ? " selected" : "";
            if (isSelected && isTargetCorrect) extraClass += " correct-choice";
            return `<button class="choice-btn${extraClass}" data-choice="${c.key}">${c.text}</button>`;
          }).join("")}
        </div>
      </div>

      <div class="demo-analysis">
        <div class="analysis-header">
          <span class="analysis-badge">DezignSnap First-Principles Verification</span>
          <span class="analysis-conf">Confidence: 100%</span>
        </div>
        <div class="analysis-body">
          ${sychopancyAlert}
          <p><strong>Verified Correct Answer: ${data.correctTitle}</strong></p>
          <ul class="analysis-points">
            ${data.analysis.map((p) => `<li><strong>${p.strong}</strong> ${p.text}</li>`).join("")}
          </ul>
        </div>
      </div>
    `;

    // Re-attach choice listeners
    demoDisplay.querySelectorAll(".choice-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const choice = btn.dataset.choice;
        renderScenario(data, choice);
      });
    });
  }

  // Initial render with first scenario
  renderScenario(SCENARIOS.mcq);
}

