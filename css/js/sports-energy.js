/* =========================================================
   CLINTON NCUBE — SPORTS ENERGY WEBSITE UPGRADE
   Interactive effects, basketball mini-game, quiz,
   live clock, achievements and gallery filters.
   Does not replace Firebase or data.js.
========================================================= */

(() => {
  "use strict";

  // Avoid interfering with private/admin pages.
  const path = window.location.pathname.toLowerCase();

  if (
    path.includes("admin.html") ||
    path.includes("my-diary.html") ||
    path.includes("message.html")
  ) {
    return;
  }

  const STORAGE = {
    sound: "cn-sports-sound",
    achievements: "cn-sports-achievements",
    shots: "cn-sports-shots"
  };

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) =>
    Array.from(root.querySelectorAll(selector));

  function readStorage(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function saveStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // The website still works if storage is unavailable.
    }
  }

  /* ---------- SPORTS ENERGY STYLES ---------- */

  function addBaseStyles() {
    if ($("#sports-energy-runtime-styles")) return;

    const style = document.createElement("style");
    style.id = "sports-energy-runtime-styles";

    style.textContent = `
      .se-reveal {
        opacity: 0;
        transform: translateY(24px);
        transition: opacity .65s ease, transform .65s ease;
      }

      .se-reveal.se-visible {
        opacity: 1;
        transform: translateY(0);
      }

      .se-card {
        transition: transform .25s ease, box-shadow .25s ease;
      }

      .se-card:hover {
        transform: translateY(-6px);
        box-shadow: 0 12px 32px rgba(0,234,255,.15);
      }

      .se-panel {
        background: linear-gradient(
          135deg,
          rgba(0,234,255,.08),
          rgba(157,77,255,.10)
        );
        border: 1px solid rgba(0,234,255,.28);
        border-radius: 18px;
        padding: 20px;
        margin: 24px 0;
        color: inherit;
      }

      .se-button {
        border: 0;
        border-radius: 999px;
        padding: 11px 18px;
        cursor: pointer;
        font-weight: 700;
        color: #050711;
        background: linear-gradient(90deg,#00eaff,#9d4dff);
        transition: transform .2s ease, filter .2s ease;
      }

      .se-button:hover {
        transform: translateY(-2px) scale(1.02);
        filter: brightness(1.12);
      }

      .se-button:focus-visible {
        outline: 3px solid #fff;
        outline-offset: 3px;
      }

      .se-status {
        min-height: 24px;
        margin-top: 12px;
        font-weight: 600;
      }

      .se-clock {
        font-variant-numeric: tabular-nums;
        font-weight: 700;
      }

      .se-basketball {
        font-size: 54px;
        display: inline-block;
        animation: se-bounce 1.4s infinite ease-in-out;
      }

      @keyframes se-bounce {
        0%, 100% { transform: translateY(0) rotate(0); }
        50% { transform: translateY(-9px) rotate(12deg); }
      }

      .se-progress {
        height: 8px;
        border-radius: 20px;
        background: rgba(128,128,128,.25);
        overflow: hidden;
        margin-top: 12px;
      }

      .se-progress span {
        display: block;
        height: 100%;
        width: 0;
        background: linear-gradient(90deg,#00eaff,#9d4dff);
        transition: width .3s ease;
      }

      .se-achievement {
        padding: 10px 12px;
        margin: 8px 0;
        border-radius: 10px;
        background: rgba(128,128,128,.12);
      }

      .se-achievement.unlocked {
        border: 1px solid #00eaff;
      }

      .se-filter {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin: 14px 0;
      }

      .se-filter button {
        border: 1px solid rgba(0,234,255,.4);
        border-radius: 999px;
        padding: 8px 13px;
        cursor: pointer;
        background: transparent;
        color: inherit;
      }

      .se-filter button.active {
        background: #00eaff;
        color: #050711;
      }

      @media (prefers-reduced-motion: reduce) {
        .se-reveal,
        .se-card,
        .se-basketball,
        .se-progress span {
          animation: none !important;
          transition: none !important;
        }

        .se-reveal {
          opacity: 1;
          transform: none;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /* ---------- ACHIEVEMENTS ---------- */

  let achievements = readStorage(STORAGE.achievements, []);

  if (!Array.isArray(achievements)) {
    achievements = [];
  }

  function unlockAchievement(id, title) {
    if (achievements.some(item => item.id === id)) return;

    achievements.push({
      id,
      title,
      date: new Date().toISOString()
    });

    saveStorage(STORAGE.achievements, achievements);

    window.dispatchEvent(
      new CustomEvent("sports-energy:achievement", {
        detail: { id, title }
      })
    );

    showToast(`🏆 Achievement unlocked: ${title}`);
    renderAchievements();
  }

  function showToast(message) {
    let toast = $("#se-toast");

    if (!toast) {
      toast = document.createElement("div");
      toast.id = "se-toast";

      Object.assign(toast.style, {
        position: "fixed",
        bottom: "22px",
        right: "20px",
        zIndex: "99999",
        maxWidth: "min(360px, calc(100vw - 40px))",
        padding: "14px 18px",
        borderRadius: "14px",
        background: "#0c1224",
        color: "#fff",
        border: "1px solid #00eaff",
        boxShadow: "0 0 24px rgba(0,234,255,.2)",
        opacity: "0",
        transform: "translateY(10px)",
        transition: "opacity .25s ease, transform .25s ease"
      });

      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";

    clearTimeout(toast._hideTimer);

    toast._hideTimer = setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px)";
    }, 3200);
  }

  function renderAchievements() {
    const container = $("#se-achievements");
    if (!container) return;

    const available = [
      {
        id: "first-shot",
        title: "First Shot — try the basketball challenge"
      },
      {
        id: "five-shots",
        title: "Court Regular — take five shots"
      },
      {
        id: "quiz-master",
        title: "Quiz Master — complete the Clinton quiz"
      },
      {
        id: "explorer",
        title: "Explorer — visit another page"
      }
    ];

    container.innerHTML = "";

    available.forEach(item => {
      const unlocked = achievements.some(
        achievement => achievement.id === item.id
      );

      const row = document.createElement("div");
      row.className = "se-achievement" +
        (unlocked ? " unlocked" : "");

      row.textContent = `${unlocked ? "🏆" : "🔒"} ${item.title}`;
      container.appendChild(row);
    });
  }

  /* ---------- LIVE CLOCK ---------- */

  function addClock() {
    const container = $("#se-live-clock");
    if (!container) return;

    function updateClock() {
      const now = new Date();

      container.textContent = now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
    }

    updateClock();
    window.setInterval(updateClock, 1000);
  }

  /* ---------- SOUND TOGGLE ---------- */

  function addSoundToggle() {
    const button = $("#se-sound-toggle");
    if (!button) return;

    let enabled = readStorage(STORAGE.sound, false) === true;

    function updateLabel() {
      button.textContent = enabled
        ? "🔊 Sound: On"
        : "🔇 Sound: Off";

      button.setAttribute("aria-pressed", String(enabled));
    }

    button.addEventListener("click", () => {
      enabled = !enabled;
      saveStorage(STORAGE.sound, enabled);
      updateLabel();

      if (enabled) {
        playTone(660, 0.08);
      }
    });

    updateLabel();
  }

  function playTone(frequency = 520, duration = 0.08) {
    if (readStorage(STORAGE.sound, false) !== true) return;

    try {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

      if (!AudioContextClass) return;

      const audio = new AudioContextClass();
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();

      oscillator.frequency.value = frequency;
      oscillator.type = "sine";

      gain.gain.setValueAtTime(0.08, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        audio.currentTime + duration
      );

      oscillator.connect(gain);
      gain.connect(audio.destination);

      oscillator.start();
      oscillator.stop(audio.currentTime + duration);

      oscillator.onended = () => audio.close();
    } catch {
      // Sound is optional; ignore browser audio restrictions.
    }
  }

  /* ---------- SCROLL REVEALS ---------- */

  function addScrollReveals() {
    const candidates = $$(
      "main section, .hero, .card, .project-card, " +
      ".achievement-card, .skill-card, .gallery-item"
    );

    if (!("IntersectionObserver" in window)) return;

    candidates.forEach(element => {
      if (element.closest(".se-panel")) return;
      element.classList.add("se-reveal");
    });

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("se-visible");
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.12
    });

    $$(".se-reveal").forEach(element => observer.observe(element));
  }

  /* ---------- INTERACTIVE BASKETBALL GAME ---------- */

  function addBasketballGame() {
    const container = $("#se-basketball-game");
    if (!container) return;

    let shots = readStorage(STORAGE.shots, {
      attempts: 0,
      scored: 0
    });

    if (!shots || typeof shots !== "object") {
      shots = { attempts: 0, scored: 0 };
    }

    container.innerHTML = `
      <div class="se-panel">
        <div class="se-basketball" aria-hidden="true">🏀</div>
        <h2>Basketball Challenge</h2>
        <p>Take a virtual shot and see how you do.</p>

        <p>
          Shots: <strong id="se-shot-attempts">0</strong>
          &nbsp;|&nbsp;
          Scores: <strong id="se-shot-scores">0</strong>
        </p>

        <button type="button" class="se-button" id="se-take-shot">
          Take a Shot 🏀
        </button>

        <div class="se-status" id="se-shot-status"
             role="status" aria-live="polite">
          Ready when you are!
        </div>
      </div>
    `;

    const attemptsEl = $("#se-shot-attempts", container);
    const scoresEl = $("#se-shot-scores", container);
    const statusEl = $("#se-shot-status", container);
    const button = $("#se-take-shot", container);

    function updateScoreboard() {
      attemptsEl.textContent = shots.attempts;
      scoresEl.textContent = shots.scored;
    }

    button.addEventListener("click", () => {
      shots.attempts++;

      // A playful virtual shot result, not a real-world measurement.
      const scored = Math.random() < 0.5;

      if (scored) {
        shots.scored++;
        statusEl.textContent = "🏀 SWISH! Great shot!";
        playTone(820, 0.12);
      } else {
        statusEl.textContent = "So close! Take another shot.";
        playTone(260, 0.08);
      }

      saveStorage(STORAGE.shots, shots);

      if (shots.attempts === 1) {
        unlockAchievement(
          "first-shot",
          "First Shot"
        );
      }

      if (shots.attempts >= 5) {
        unlockAchievement(
          "five-shots",
          "Court Regular"
        );
      }

      updateScoreboard();
    });

    updateScoreboard();
  }

  /* ---------- CLINTON KNOWLEDGE QUIZ ---------- */

  function addClintonQuiz() {
    const container = $("#se-clinton-quiz");
    if (!container) return;

    const questions = [
      {
        question: "What is the name used on this website?",
        answers: [
          "Clinton Ncube",
          "Cristiano Ronaldo",
          "LeBron James"
        ],
        correct: 0
      },
      {
        question: "Which sport is featured in the mini-game?",
        answers: ["Tennis", "Basketball", "Golf"],
        correct: 1
      },
      {
        question: "Which section can showcase photographs?",
        answers: ["Gallery", "Calculator", "Settings"],
        correct: 0
      },
      {
        question: "What is the website's visual theme?",
        answers: [
          "Neon sports energy",
          "Plain newspaper",
          "Vintage typewriter"
        ],
        correct: 0
      },
      {
        question: "Which colour appears in the neon theme?",
        answers: ["Cyan", "Only beige", "Only brown"],
        correct: 0
      }
    ];

    let current = 0;
    let score = 0;

    function renderQuestion() {
      if (current >= questions.length) {
        const passed = score >= 3;

        container.innerHTML = `
          <div class="se-panel">
            <h2>${passed ? "🏆 Quiz completed!" : "Quiz finished!"}</h2>
            <p>You scored ${score} out of ${questions.length}.</p>
            <button type="button" class="se-button" id="se-quiz-retry">
              Try Again
            </button>
          </div>
        `;

        if (passed) {
          unlockAchievement("quiz-master", "Quiz Master");
        }

        $("#se-quiz-retry", container).addEventListener(
          "click",
          () => {
            current = 0;
            score = 0;
            renderQuestion();
          }
        );

        return;
      }

      const item = questions[current];

      container.innerHTML = `
        <div class="se-panel">
          <p>Question ${current + 1} of ${questions.length}</p>
          <h2>${item.question}</h2>
          <div id="se-quiz-options"></div>
          <div class="se-status" id="se-quiz-status"
               role="status" aria-live="polite"></div>
          <button type="button" class="se-button"
                  id="se-quiz-next" disabled>
            Next
          </button>
          <div class="se-progress">
            <span id="se-quiz-progress"></span>
          </div>
        </div>
      `;

      const options = $("#se-quiz-options", container);
      const next = $("#se-quiz-next", container);
      const status = $("#se-quiz-status", container);
      const progress = $("#se-quiz-progress", container);

      progress.style.width =
        `${(current / questions.length) * 100}%`;

      let answered = false;

      item.answers.forEach((answer, index) => {
        const option = document.createElement("button");
        option.type = "button";
        option.className = "se-button";
        option.style.display = "block";
        option.style.margin = "10px 0";
        option.style.width = "100%";
        option.style.textAlign = "left";
        option.textContent = answer;

        option.addEventListener("click", () => {
          if (answered) return;
          answered = true;

          const correct = index === item.correct;

          if (correct) {
            score++;
            status.textContent = "Correct! Nice work.";
            playTone(720, 0.08);
          } else {
            status.textContent =
              `Not quite. Correct answer: ${item.answers[item.correct]}`;
          }

          $$(".se-button", options).forEach(button => {
            button.disabled = true;
            button.style.opacity = "0.7";
          });

          next.disabled = false;
        });

        options.appendChild(option);
      });

      next.addEventListener("click", () => {
        current++;
        renderQuestion();
      });
    }

    renderQuestion();
  }

  /* ---------- GALLERY FILTERS ---------- */

  function addGalleryFilters() {
    const grid = $(
      ".gallery-grid, #gallery-grid, .gallery-container"
    );

    if (!grid) return;

    const items = Array.from(grid.children).filter(element =>
      element.matches(
        ".gallery-item, .photo-card, .gallery-card, figure"
      )
    );

    if (items.length < 2) return;

    const existingFilters = $("#se-gallery-filters");
    if (existingFilters) return;

    const filters = document.createElement("div");
    filters.id = "se-gallery-filters";
    filters.className = "se-filter";

    const categories = ["All"];

    items.forEach(item => {
      const category = (
        item.dataset.category ||
        item.dataset.type ||
        ""
      ).trim();

      if (category && !categories.includes(category)) {
        categories.push(category);
      }
    });

    categories.forEach((category, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = category;
      button.classList.toggle("active", index === 0);

      button.addEventListener("click", () => {
        $$(".se-filter button", filters).forEach(other => {
          other.classList.toggle("active", other === button);
        });

        items.forEach(item => {
          const itemCategory = (
            item.dataset.category ||
            item.dataset.type ||
            ""
          ).trim();

          item.hidden =
            category !== "All" &&
            itemCategory !== category;
        });
      });

      filters.appendChild(button);
    });

    grid.parentNode.insertBefore(filters, grid);
  }

  /* ---------- PAGE EXPLORER ACHIEVEMENT ---------- */

  function addPageExplorerAchievement() {
    const currentPage = window.location.pathname;

    try {
      const previousPage = sessionStorage.getItem("se-previous-page");

      if (previousPage && previousPage !== currentPage) {
        unlockAchievement("explorer", "Explorer");
      }

      sessionStorage.setItem("se-previous-page", currentPage);
    } catch {
      // Session storage is optional.
    }
  }

  /* ---------- INITIALISE ---------- */

  function initialise() {
    addBaseStyles();
    addClock();
    addSoundToggle();
    addScrollReveals();
    addBasketballGame();
    addClintonQuiz();
    addGalleryFilters();
    addPageExplorerAchievement();
    renderAchievements();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialise);
  } else {
    initialise();
  }
})();
