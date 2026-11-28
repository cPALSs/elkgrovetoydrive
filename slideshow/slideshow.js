(() => {
  "use strict";

  const SPONSORS_URL = "../data/toydrive-2026-sponsors-display.json";
  const VOLUNTEERS_URL = "../data/toydrive-2026-volunteers-display.json";
  const CONFIG_URL = "./slideshow-config.json";

  const params = new URLSearchParams(window.location.search);
  const speedMultiplier = Math.max(0.1, Number(params.get("speed")) || 1);
  const filterTier = params.get("tier") || "all";

  const layerA = document.getElementById("slide-layer-a");
  const layerB = document.getElementById("slide-layer-b");
  const loadingEl = document.getElementById("loading");
  const errorEl = document.getElementById("error-banner");
  const errorMsgEl = document.getElementById("error-message");
  const progressTrack = document.getElementById("progress-track");
  const progressBar = document.getElementById("progress-bar");
  const hud = document.getElementById("hud");
  const hudCounter = document.getElementById("hud-counter");
  const hudLabel = document.getElementById("hud-label");
  const btnPrev = document.getElementById("btn-prev");
  const btnPlay = document.getElementById("btn-play");
  const btnNext = document.getElementById("btn-next");
  const btnReload = document.getElementById("btn-reload");
  const btnFullscreen = document.getElementById("btn-fullscreen");
  const drawer = document.getElementById("slide-drawer");
  const drawerBackdrop = document.getElementById("drawer-backdrop");
  const drawerList = document.getElementById("drawer-list");
  const drawerSubtitle = document.getElementById("drawer-subtitle");
  const btnDrawerClose = document.getElementById("btn-drawer-close");

  let slides = [];
  let slideDurationMs = 6000;
  let currentIndex = 0;
  let activeLayer = layerA;
  let inactiveLayer = layerB;
  let isPaused = false;
  let isDrawerOpen = false;
  let slideTimer = null;
  let slideStartedAt = 0;
  let remainingMs = 0;
  let hudHideTimer = null;
  let wakeLock = null;

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function resolveLogoUrl(logoPath, bust = "") {
    if (!logoPath) return "";
    const base =
      /^https?:\/\//i.test(logoPath) || logoPath.startsWith("/")
        ? logoPath.startsWith("/")
          ? `..${logoPath}`
          : logoPath
        : `../sponsors/${logoPath}`;
    return bust ? `${base}${base.includes("?") ? "&" : "?"}v=${bust}` : base;
  }

  function initialsFor(name) {
    return String(name || "?")
      .split(/\s+/)
      .filter((w) => /[A-Za-z0-9]/.test(w))
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("");
  }

  const imageSizes = new Map();

  function preloadImages(urls) {
    const unique = [...new Set(urls.filter(Boolean))];
    return Promise.all(
      unique.map(
        (src) =>
          new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
              imageSizes.set(src, { w: img.naturalWidth, h: img.naturalHeight });
              resolve({ src, ok: true });
            };
            img.onerror = () => resolve({ src, ok: false });
            img.src = src;
          })
      )
    );
  }

  /**
   * Interleaves impression-weighted sponsors smoothly across one cycle so
   * higher-tier sponsors appear more often without back-to-back repeats.
   */
  function buildImpressionDeck(sponsorsData, config, bust) {
    const tierImpressions = config.tierImpressions || {};
    const tierLabels = config.tierLabels || {};
    const recognitions = config.recognitions || {};
    const defaultImpressions = Math.max(1, Number(config.defaultImpressions) || 1);

    const rawSponsors = (sponsorsData.sponsors || []).filter((sp) => {
      if (filterTier === "all") return true;
      return (sp.tier || "Sponsor").toLowerCase() === filterTier.toLowerCase();
    });

    const entries = rawSponsors.map((sp, idx) => {
      const tier = sp.tier || "Sponsor";
      const impressions = Math.max(1, Number(tierImpressions[tier]) || defaultImpressions);
      const tierLabel = tierLabels[tier] || tier;
      const recognition = sp.recognition || recognitions[sp.name] || "";
      return {
        id: `${idx}-${sp.name}`,
        name: sp.name,
        tier,
        tierLabel,
        recognition,
        cardBg: sp.cardBg || "",
        logoUrl: resolveLogoUrl(sp.logo, bust),
        weight: impressions,
        currentWeight: 0,
      };
    });

    if (!entries.length) return [];

    const totalSlots = entries.reduce((sum, e) => sum + e.weight, 0);
    const deck = [];

    // Smooth weighted round-robin (Nginx SWRR algorithm)
    for (let i = 0; i < totalSlots; i++) {
      let best = null;
      for (const e of entries) {
        e.currentWeight += e.weight;
        if (!best || e.currentWeight > best.currentWeight) {
          best = e;
        }
      }
      best.currentWeight -= totalSlots;
      deck.push({
        name: best.name,
        tierLabel: best.tierLabel,
        recognition: best.recognition,
        cardBg: best.cardBg,
        logoUrl: best.logoUrl,
        label: `${best.name} (${best.tierLabel})`,
      });
    }

    return deck;
  }

  function renderSlideHtml(slide) {
    let visualHtml;
    if (slide.logoUrl) {
      if (slide.cardBg) {
        const size = imageSizes.get(slide.logoUrl);
        const isSquare = size && size.w && size.h && Math.abs(size.w / size.h - 1) < 0.05;
        const plateClass = isSquare ? "sponsor-logo-plate is-square" : "sponsor-logo-plate";
        visualHtml = `<div class="${plateClass}" style="background:${escapeHtml(slide.cardBg)}"><img src="${escapeHtml(slide.logoUrl)}" alt="${escapeHtml(slide.name)}" /></div>`;
      } else {
        visualHtml = `<img src="${escapeHtml(slide.logoUrl)}" alt="${escapeHtml(slide.name)}" />`;
      }
    } else {
      visualHtml = `<div class="sponsor-wordmark">${escapeHtml(slide.name)}</div>`;
    }

    return `
      <div class="sponsor-logo-wrap">
        ${visualHtml}
      </div>
      <div class="sponsor-tier">${escapeHtml(slide.tierLabel)}</div>
      ${
        slide.recognition
          ? `<div class="sponsor-recognition">${escapeHtml(slide.recognition)}</div>`
          : ""
      }
    `;
  }

  function renderDrawer() {
    const uniqueCount = new Set(slides.map((s) => s.name)).size;
    drawerSubtitle.textContent = `${slides.length} slides · ${uniqueCount} sponsors in cycle`;

    drawerList.innerHTML = slides
      .map((s, idx) => {
        const thumb = s.logoUrl
          ? `<span class="drawer-thumb"><img src="${escapeHtml(s.logoUrl)}" alt="" /></span>`
          : `<span class="drawer-thumb drawer-thumb--text">${escapeHtml(initialsFor(s.name))}</span>`;
        const meta = s.recognition ? `${s.tierLabel} · ${s.recognition}` : s.tierLabel;
        return `
          <li>
            <button type="button" class="drawer-item${idx === currentIndex ? " is-current" : ""}" data-slide-index="${idx}">
              <span class="drawer-num">${idx + 1}</span>
              ${thumb}
              <span class="drawer-info">
                <div class="drawer-name">${escapeHtml(s.name)}</div>
                <div class="drawer-meta">${escapeHtml(meta)}</div>
              </span>
            </button>
          </li>
        `;
      })
      .join("");
  }

  function syncDrawerHighlight() {
    const items = drawerList.querySelectorAll(".drawer-item");
    items.forEach((btn, idx) => {
      btn.classList.toggle("is-current", idx === currentIndex);
    });
    if (isDrawerOpen && items[currentIndex]) {
      items[currentIndex].scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }

  function setDrawerOpen(open) {
    isDrawerOpen = open;
    drawer.classList.toggle("is-open", open);
    drawer.setAttribute("aria-hidden", open ? "false" : "true");
    drawerBackdrop.hidden = !open;
    hudCounter.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      syncDrawerHighlight();
      revealHud();
    } else {
      revealHud();
    }
  }

  function startProgressBar(durationMs) {
    progressBar.style.transition = "none";
    progressBar.style.width = "0%";
    void progressBar.offsetWidth;
    progressBar.style.transition = `width ${durationMs}ms linear`;
    progressBar.style.width = "100%";
  }

  function freezeProgressBar() {
    const computedWidth = window.getComputedStyle(progressBar).width;
    progressBar.style.transition = "none";
    progressBar.style.width = computedWidth;
  }

  function scheduleNext(delayMs) {
    clearTimeout(slideTimer);
    if (isPaused || slides.length <= 1) return;
    slideStartedAt = performance.now();
    remainingMs = delayMs;
    startProgressBar(delayMs);
    slideTimer = window.setTimeout(() => {
      showSlide((currentIndex + 1) % slides.length);
    }, delayMs);
  }

  function showSlide(index) {
    if (!slides.length) return;
    currentIndex = (index + slides.length) % slides.length;
    const slide = slides[currentIndex];
    const duration = Math.round(slideDurationMs * speedMultiplier);

    inactiveLayer.innerHTML = renderSlideHtml(slide);
    inactiveLayer.setAttribute("aria-hidden", "false");
    inactiveLayer.classList.add("is-active");

    activeLayer.classList.remove("is-active");
    activeLayer.setAttribute("aria-hidden", "true");

    const prev = activeLayer;
    activeLayer = inactiveLayer;
    inactiveLayer = prev;

    hudCounter.textContent = `${currentIndex + 1} / ${slides.length}`;
    hudLabel.textContent = slide.label;
    syncDrawerHighlight();

    if (!isPaused) {
      scheduleNext(duration);
    } else {
      remainingMs = duration;
      progressBar.style.transition = "none";
      progressBar.style.width = "0%";
    }
  }

  function togglePause() {
    isPaused = !isPaused;
    btnPlay.textContent = isPaused ? "Play" : "Pause";
    if (isPaused) {
      clearTimeout(slideTimer);
      const elapsed = performance.now() - slideStartedAt;
      remainingMs = Math.max(500, remainingMs - elapsed);
      freezeProgressBar();
    } else {
      scheduleNext(remainingMs);
    }
    revealHud();
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }

  function revealHud() {
    hud.classList.add("is-visible");
    document.body.classList.remove("cursor-hidden");
    clearTimeout(hudHideTimer);
    hudHideTimer = window.setTimeout(() => {
      if (!isPaused && !isDrawerOpen) {
        hud.classList.remove("is-visible");
        document.body.classList.add("cursor-hidden");
      }
    }, 2600);
  }

  async function requestWakeLock() {
    try {
      if ("wakeLock" in navigator) {
        wakeLock = await navigator.wakeLock.request("screen");
      }
    } catch {
      // Ignore if wake lock is unavailable or denied
    }
  }

  async function init() {
    clearTimeout(slideTimer);
    loadingEl.hidden = false;
    errorEl.hidden = true;

    try {
      const bustId = String(Date.now());
      const bust = `?t=${bustId}`;
      const [sponsorsRes, volunteersRes, configRes] = await Promise.all([
        fetch(SPONSORS_URL + bust),
        fetch(VOLUNTEERS_URL + bust),
        fetch(CONFIG_URL + bust),
      ]);

      if (!sponsorsRes.ok) throw new Error(`Sponsors JSON HTTP ${sponsorsRes.status}`);
      if (!configRes.ok) throw new Error(`Slideshow config HTTP ${configRes.status}`);

      const [sponsorsData, volunteersData, config] = await Promise.all([
        sponsorsRes.json(),
        volunteersRes.ok ? volunteersRes.json() : Promise.resolve({ volunteers: [] }),
        configRes.json(),
      ]);

      const combinedSponsors = [
        ...(sponsorsData.sponsors || []),
        ...(volunteersData.volunteers || []),
      ];

      slideDurationMs = Math.max(1000, Number(config.slideDurationMs) || 6000);
      if (config.fadeMs) {
        document.documentElement.style.setProperty("--ss-fade-ms", `${config.fadeMs}ms`);
      }
      progressTrack.hidden = config.showProgressBar === false;

      slides = buildImpressionDeck({ ...sponsorsData, sponsors: combinedSponsors }, config, bustId);
      if (!slides.length) {
        throw new Error("No sponsor slides generated from sponsor data.");
      }

      const imageUrls = [
        "sponsor-slide-template.png",
        "../assets/hosts/cpalss.png",
        "../assets/hosts/nvcc.png",
        ...slides.map((s) => s.logoUrl),
      ];
      await preloadImages(imageUrls);

      renderDrawer();
      loadingEl.hidden = true;
      showSlide(0);
      requestWakeLock();
    } catch (err) {
      loadingEl.hidden = true;
      errorEl.hidden = false;
      errorMsgEl.textContent = err instanceof Error ? err.message : String(err);
    }
  }

  btnPrev.addEventListener("click", () => {
    showSlide(currentIndex - 1);
    revealHud();
  });
  btnNext.addEventListener("click", () => {
    showSlide(currentIndex + 1);
    revealHud();
  });
  btnPlay.addEventListener("click", togglePause);
  btnReload.addEventListener("click", () => init());
  btnFullscreen.addEventListener("click", toggleFullscreen);

  hudCounter.addEventListener("click", () => setDrawerOpen(!isDrawerOpen));
  btnDrawerClose.addEventListener("click", () => setDrawerOpen(false));
  drawerBackdrop.addEventListener("click", () => setDrawerOpen(false));
  drawerList.addEventListener("click", (e) => {
    const btn = e.target.closest(".drawer-item");
    if (!btn) return;
    const idx = Number(btn.dataset.slideIndex);
    if (!Number.isNaN(idx)) {
      showSlide(idx);
    }
  });

  document.addEventListener("mousemove", revealHud);
  document.addEventListener("touchstart", revealHud, { passive: true });
  document.addEventListener("keydown", (e) => {
    if (e.code === "Escape" && isDrawerOpen) {
      e.preventDefault();
      setDrawerOpen(false);
    } else if (e.code === "Space") {
      e.preventDefault();
      togglePause();
    } else if (e.code === "ArrowRight") {
      e.preventDefault();
      showSlide(currentIndex + 1);
      revealHud();
    } else if (e.code === "ArrowLeft") {
      e.preventDefault();
      showSlide(currentIndex - 1);
      revealHud();
    } else if (e.key === "f" || e.key === "F") {
      e.preventDefault();
      toggleFullscreen();
    } else if (e.key === "r" || e.key === "R") {
      e.preventDefault();
      init();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && !wakeLock) {
      requestWakeLock();
    }
  });

  init();
})();
