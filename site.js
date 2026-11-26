/** Shared shell for elkgrovetoydrive.com — scoped to avoid clashing with fund-the-fete/app.js globals */
(function () {
  const SITE_DATA_URL = "data/site.json";
  const THEME_STORAGE_KEY = "toydrive-theme";
  const VALID_THEMES = new Set(["auto", "light", "dark"]);
  const STORED_THEMES = new Set(["light", "dark"]);

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function loadThemeFromStorage() {
    try {
      const theme = sessionStorage.getItem(THEME_STORAGE_KEY);
      return STORED_THEMES.has(theme) ? theme : "auto";
    } catch {
      return "auto";
    }
  }

  function resolvedAppearance(preference = loadThemeFromStorage()) {
    if (preference === "light" || preference === "dark") return preference;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function themeIconMarkup(appearance) {
    const icons = {
      light: `<span class="ls-icon ls-icon--sun theme-icon" aria-hidden="true"></span>`,
      dark: `<span class="ls-icon ls-icon--moon theme-icon" aria-hidden="true"></span>`,
    };
    return icons[appearance] ?? icons.light;
  }

  function themeLabel(theme) {
    return { auto: "System", light: "Light", dark: "Dark" }[theme] ?? "System";
  }

  function renderThemeControl() {
    return `
      <button type="button" class="ls-icon-btn theme-toggle" id="theme-toggle" aria-label="Color theme">
        ${themeIconMarkup("light")}
      </button>`;
  }

  function applyTheme(theme) {
    const next = VALID_THEMES.has(theme) ? theme : "auto";
    document.documentElement.setAttribute("data-theme", next);
    document.documentElement.setAttribute("data-ls-scheme", next);

    const toggle = document.getElementById("theme-toggle");
    if (toggle) {
      const appearance = resolvedAppearance(next);
      toggle.innerHTML = `${themeIconMarkup(appearance)}<span class="ls-sr-only">Color theme: ${themeLabel(next)}</span>`;
      toggle.setAttribute("aria-label", `Color theme: ${themeLabel(next)}`);
    }
  }

  function setTheme(theme) {
    const next = STORED_THEMES.has(theme) ? theme : "auto";
    applyTheme(next);
    try {
      if (STORED_THEMES.has(next)) sessionStorage.setItem(THEME_STORAGE_KEY, next);
      else sessionStorage.removeItem(THEME_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  let closeNavMenu = () => {};

  function initThemeToggle() {
    const toggle = document.getElementById("theme-toggle");
    if (!toggle) return;

    toggle.addEventListener("click", () => {
      setTheme(resolvedAppearance() === "dark" ? "light" : "dark");
    });
  }

  function initTheme() {
    applyTheme(loadThemeFromStorage());
    initThemeToggle();
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      if (loadThemeFromStorage() === "auto") applyTheme("auto");
    });
  }

  function navPrefix() {
    const path = window.location.pathname.replace(/\/index\.html$/i, "").replace(/\/$/, "");
    const depth = path.split("/").filter(Boolean).length;
    return depth === 0 ? "" : "../".repeat(depth);
  }

  function toTitleCase(title) {
    const small = new Set(["a", "an", "the", "and", "or", "but", "for", "nor", "on", "at", "to", "by", "of", "in"]);
    return title
      .split(/(\s+|—|--)/)
      .map((part, index, parts) => {
        if (/^(\s+|—|--)$/.test(part)) return part;
        const lower = part.toLowerCase();
        const wordIndex = parts.slice(0, index).filter((p) => !/^(\s+|—|--)$/.test(p)).length;
        if (wordIndex > 0 && small.has(lower)) return lower;
        if (/^\d/.test(part)) {
          return part.replace(/[a-z]+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1));
        }
        return lower.replace(/(^|[\s-])([\p{L}])/gu, (match, prefix, letter) => prefix + letter.toUpperCase());
      })
      .join("");
  }

  function navLinkLabel(item) {
    return item.navLabel ?? toTitleCase(item.label);
  }

  let cachedSite = null;

  function ticketsUrl(site = cachedSite) {
    const href = site?.cta?.ticketsHref || site?.event?.eventbriteUrl || "";
    return String(href).trim();
  }

  function getNavPages() {
    return [
      {
        id: "about",
        label: "About",
        href: "/about/",
        children: [
          { id: "charities", label: "Charities", href: "/charities/" },
          { id: "media", label: "Media", href: "/resources/media/" },
        ],
      },
      {
        id: "production",
        label: "Production",
        href: "/production/",
        children: [
          { id: "team", label: "Team", href: "/team/" },
          { id: "volunteer", label: "Volunteering", navLabel: "Volunteering", href: "/volunteer/" },
          { id: "sponsorship", label: "Sponsorship", navLabel: "Sponsorship", href: "/sponsorship/" },
          { id: "build", label: "Fund the Fete", navLabel: "Fund the Fete", href: "/fund-the-fete/" },
        ],
      },
      {
        id: "resources",
        label: "Resources",
        href: "/resources/",
        children: [
          {
            id: "santaPhotos2025",
            label: "2025 Santa Photos",
            href: "https://knoxwood-productions.mypixhome.com/instant-gallery/santa-toy-drive-2025/",
            external: true,
          },
          { id: "archive2025", label: "2025 archive", href: "https://toydrive.cpalss.com/", external: true },
        ],
      },
    ];
  }

  function renderNavItem(page, activePage) {
    if (!page) return "";
    if (page.children?.length) {
      const parentCurrent = page.id === activePage ? ' aria-current="page"' : "";
      const childActive = page.children.some((child) => child.id === activePage);
      const sublinks = page.children
        .map((child) => {
          const childCurrent = child.id === activePage ? ' aria-current="page"' : "";
          const external = child.external ? ' target="_blank" rel="noopener"' : "";
          return `<div class="ls-nav-sublink-wrap"><a class="ls-nav-sublink" href="${child.href}"${childCurrent}${external}>${escapeHtml(navLinkLabel(child))}</a></div>`;
        })
        .join("");
      return `<div class="ls-nav-group${childActive ? " ls-is-active" : ""}" data-nav-section="${escapeHtml(page.id)}"><a class="ls-nav-parent" href="${page.href}"${parentCurrent}>${escapeHtml(navLinkLabel(page))}</a><div class="ls-nav-submenu">${sublinks}</div></div>`;
    }
    const current = page.id === activePage ? ' aria-current="page"' : "";
    const external = page.external ? ' target="_blank" rel="noopener"' : "";
    return `<a href="${page.href}" data-nav-id="${escapeHtml(page.id)}"${current}${external}>${escapeHtml(navLinkLabel(page))}</a>`;
  }

  function renderNavLinks(pages, activePage) {
    return pages.map((page) => renderNavItem(page, activePage)).join("");
  }

  function renderNavTicketsCta() {
    const href = ticketsUrl();
    const label = cachedSite?.cta?.ticketsNavLabel || "Free tickets";
    const external = href ? ' target="_blank" rel="noopener"' : "";
    const disabled = href ? "" : ' aria-disabled="true"';
    return `<a class="ls-btn ls-btn--primary ls-btn--pill site-nav-tickets-cta${href ? "" : " is-disabled"}" href="${href || "#"}" data-nav-id="tickets"${external}${disabled}>${escapeHtml(label)}</a>`;
  }

  function renderNav(activePage) {
    const pages = getNavPages();
    const byId = Object.fromEntries(pages.map((page) => [page.id, page]));

    // Mobile drawer: left = About + Resources; right = Production + Free tickets pill.
    // Desktop (≥880px): columns unwrap; tickets CTA stays mobile-only (hidden in CSS).
    const links = `
      <div class="site-nav-col site-nav-col-left">
        ${renderNavItem(byId.about, activePage)}
        ${renderNavItem(byId.resources, activePage)}
      </div>
      <div class="site-nav-col site-nav-col-right">
        ${renderNavItem(byId.production, activePage)}
        ${renderNavTicketsCta()}
      </div>
    `;

    return `
    <nav class="ls-nav site-nav" data-ls-nav aria-label="Main">
      <div class="ls-nav-bar">
        <a class="ls-nav-brand site-nav-brand" href="/">
          <span class="site-nav-symbol" aria-hidden="true">🎄</span>
          <span class="site-nav-brand-text">Elk Grove Toy Drive</span>
        </a>
        <div class="ls-nav-end">
          <button type="button" class="ls-nav-toggle" data-ls-nav-toggle aria-expanded="false" aria-controls="site-nav-drawer">
            <span class="ls-nav-toggle-bars" aria-hidden="true"><span></span><span></span><span></span></span>
            <span class="ls-sr-only">Open menu</span>
          </button>
        </div>
      </div>
      <div class="ls-nav-backdrop" data-ls-nav-backdrop hidden aria-hidden="true"></div>
      <div id="site-nav-drawer" class="ls-nav-drawer" data-ls-nav-drawer aria-hidden="true">
        <div class="ls-nav-drawer-tools">
          <div class="site-nav-social-slot"></div>
          ${renderThemeControl()}
        </div>
        <div class="ls-nav-links">${links}</div>
        <div class="ls-nav-drawer-footer">
          <a class="site-nav-drawer-footer-email" href="mailto:contact@elkgrovetoydrive.com">contact@elkgrovetoydrive.com</a>
        </div>
      </div>
    </nav>
  `;
  }

  function siteContactEmail(site) {
    return site?.footer?.contactEmail ?? site?.apply?.email ?? "contact@elkgrovetoydrive.com";
  }

  function injectNavContact(site) {
    const el = document.querySelector(".site-nav-drawer-footer-email");
    if (!el) return;
    const email = siteContactEmail(site);
    el.href = `mailto:${email}`;
    el.textContent = email;
  }

  function initNavMenu() {
    const slot = document.getElementById("site-nav");
    if (!slot) return;
    const controllers =
      window.LSDS && typeof window.LSDS.initNavShell === "function"
        ? window.LSDS.initNavShell(slot)
        : [];
    const ctrl = controllers[0];
    closeNavMenu = ctrl ? ctrl.close : () => {};

    const ticketsCta = slot.querySelector(".site-nav-tickets-cta");
    if (ticketsCta) {
      ticketsCta.addEventListener("click", (event) => {
        if (
          ticketsCta.classList.contains("is-disabled") ||
          ticketsCta.getAttribute("aria-disabled") === "true"
        ) {
          event.preventDefault();
        }
      });
    }
  }

  function mountNav(activePage) {
    const slot = document.getElementById("site-nav");
    if (slot) {
      slot.classList.add("ls-nav-wrap");
      slot.innerHTML = renderNav(activePage);
    }
  }

  function renderFooterNavLinks(pages) {
    const leafItems = [];
    const columns = [];

    for (const page of pages) {
      if (page.children?.length) {
        const items = [
          `<a class="site-footer-nav-parent" href="${page.href}">${escapeHtml(navLinkLabel(page))}</a>`,
        ];
        for (const child of page.children) {
          const external = child.external ? ' target="_blank" rel="noopener"' : "";
          items.push(`<a href="${child.href}"${external}>${escapeHtml(navLinkLabel(child))}</a>`);
        }
        columns.push(`<div class="site-footer-nav-col">${items.join("")}</div>`);
      } else {
        leafItems.push({ href: page.href, label: navLinkLabel(page), external: Boolean(page.external) });
      }
    }

    if (leafItems.length) {
      const links = leafItems.map((item, i) => {
        const cls = i === 0 ? ' class="site-footer-nav-parent"' : "";
        const external = item.external ? ' target="_blank" rel="noopener"' : "";
        return `<a${cls} href="${item.href}"${external}>${escapeHtml(item.label)}</a>`;
      });
      columns.unshift(`<div class="site-footer-nav-col">${links.join("")}</div>`);
    }
    return columns.join("");
  }

  function renderSocialIcon(label) {
    const icons = {
      Instagram: `<span class="ls-icon ls-icon--instagram social-icon" aria-hidden="true"></span>`,
      Facebook: `<span class="ls-icon ls-icon--facebook social-icon" aria-hidden="true"></span>`,
    };
    return icons[label] ?? "";
  }

  function renderSocialLinkItems(links) {
    return (links ?? [])
      .map((link) => {
        const icon = renderSocialIcon(link.label);
        return `<a href="${escapeHtml(link.href)}" target="_blank" rel="noopener" aria-label="${escapeHtml(link.label)}">${icon}</a>`;
      })
      .join("");
  }

  function renderNavSocialLinks(links) {
    if (!links?.length) return "";
    return `<nav class="site-nav-social" aria-label="Social media">${renderSocialLinkItems(links)}</nav>`;
  }

  function injectNavSocial(links) {
    const slot = document.querySelector(".site-nav-social-slot");
    if (!slot) return;
    slot.querySelector(".site-nav-social")?.remove();
    const html = renderNavSocialLinks(links);
    if (!html) return;
    slot.innerHTML = html;
  }

  function renderFooterSocialLinks(links) {
    if (!links?.length) return "";
    return `<nav class="site-footer-social" aria-label="Social media">${renderSocialLinkItems(links)}</nav>`;
  }

  function renderFooter(site) {
    const navLinks = renderFooterNavLinks(getNavPages());
    const footer = site?.footer ?? {};
    const social = renderFooterSocialLinks(footer.socialLinks);
    const contactEmail = footer.contactEmail ?? site.apply?.email ?? "contact@elkgrovetoydrive.com";
    const coalition = (footer.coalitionLinks ?? [])
      .filter((link) => link.href !== "https://www.elkgrovelunarnewyear.com/")
      .map((link) => `<a href="${escapeHtml(link.href)}" target="_blank" rel="noopener">${escapeHtml(link.label)}</a>`)
      .join("\u00a0+\u00a0");

    return `
    <footer class="site-footer">
      <nav class="site-footer-nav" aria-label="Footer">${navLinks}</nav>
      ${social}
      <p class="site-footer-meta"><a href="mailto:${escapeHtml(contactEmail)}">${escapeHtml(contactEmail)}</a>${coalition ? ` · (${coalition})` : ""}</p>
    </footer>
  `;
  }

  function mountFooter(site) {
    const slot = document.getElementById("site-footer");
    if (!slot) return;
    slot.innerHTML = renderFooter(site);
  }

  let siteDataCache = null;
  let siteDataPromise = null;

  async function loadSiteData() {
    if (siteDataCache) return siteDataCache;
    if (!siteDataPromise) {
      siteDataPromise = (async () => {
        const prefix = navPrefix();
        const res = await fetch(`${prefix}${SITE_DATA_URL}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`Could not load site data (${res.status})`);
        siteDataCache = await res.json();
        return siteDataCache;
      })();
    }
    return siteDataPromise;
  }

  function roleDirectorName(role) {
    if (role.director) return role.director;
    const note = role.note ?? "";
    const match = note.match(/^Director:\s*([^·]+)/);
    return match ? match[1].trim() : "";
  }

  function renderRoleCard(role) {
    const title = role.emoji ? `${role.emoji} ${role.title}` : role.title;
    const phase2 = role.phase2 ? " phase2" : "";

    const test = role.test ? `<p class="role-test">${escapeHtml(role.test)}</p>` : "";

    const directorName = roleDirectorName(role);
    const director = directorName
      ? `<p class="role-director">${escapeHtml(directorName)}, Director</p>`
      : "";
    const filled = directorName ? " role-card--filled" : "";

    const deliverable = role.ship ?? role.own;
    const shipBlock = deliverable
      ? `<div class="role-field">
        <p class="role-field-label">You'd ship</p>
        <p class="role-field-text">${escapeHtml(deliverable)}</p>
      </div>`
      : "";

    const fit = role.fit
      ? `<div class="role-field">
        <p class="role-field-label">Good fit if you</p>
        <p class="role-field-text">${escapeHtml(role.fit)}</p>
      </div>`
      : "";

    return `<article class="role-card${phase2}${filled}">
      <h3>${escapeHtml(title)}</h3>
      ${director}
      ${test}
      ${shipBlock}
      ${fit}
    </article>`;
  }

  function renderApplyBlock(site) {
    const apply = site.apply;
    const idealist = site.meta?.idealistUrl;
    const idealistBtn = idealist
      ? `<a class="ls-btn ls-btn--primary" href="${escapeHtml(idealist)}" target="_blank" rel="noopener">Apply on Idealist</a>`
      : `<span class="ls-btn ls-btn--primary" style="opacity:0.65;cursor:default" title="Idealist link coming soon">Apply on Idealist</span>`;

    const mailto = `mailto:${apply.email}?subject=${encodeURIComponent(apply.emailSubject)}`;

    return `
    <div class="cta-row">
      ${idealistBtn}
      <a class="ls-btn ls-btn--secondary" href="${mailto}">Email ${escapeHtml(apply.email)}</a>
    </div>
    <ol class="steps-list">
      ${apply.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}
    </ol>
    <p class="muted">${escapeHtml(apply.idealistFallback)}</p>
  `;
  }

  function renderCoChairs(site) {
    return site.coChairs
      .map(
        (c) => `
    <div class="co-chair">
      <p class="co-chair-name">${escapeHtml(c.name)}</p>
      <p class="co-chair-title">${escapeHtml(c.title)}</p>
    </div>`,
      )
      .join("");
  }

  function setPageTitle(site, pageTitle) {
    const suffix = site.meta?.titleSuffix ?? "Elk Grove Toy Drive";
    document.title = pageTitle
      ? `${toTitleCase(pageTitle)} — ${suffix}`
      : site.meta?.siteName ?? suffix;
  }

  function eventMetaLine1(event) {
    return [event.zodiacYear, event.dates].filter(Boolean).join(" · ");
  }

  function eventMetaLine2(event) {
    return event.venue || "";
  }

  function eventMetaLine3(event) {
    return event.tagline || "";
  }

  function preferredMapsUrl(address, fallbackUrl) {
    const q = String(address || "").trim();
    const googleUrl =
      fallbackUrl ||
      (q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : "");
    if (!q || typeof navigator === "undefined") return googleUrl;
    const ua = navigator.userAgent || "";
    const isAppleMobile =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (isAppleMobile) {
      return `https://maps.apple.com/?q=${encodeURIComponent(q)}`;
    }
    if (/Android/i.test(ua)) {
      return `geo:0,0?q=${encodeURIComponent(q)}`;
    }
    return googleUrl;
  }

  function renderEventSummary(site) {
    const e = site.event;
    const datesLine = eventMetaLine1(e);
    const venue = eventMetaLine2(e);
    const tagline = eventMetaLine3(e);
    const mapsUrl = preferredMapsUrl(venue, e.venueMapsUrl || "");
    const isGeo = mapsUrl.startsWith("geo:");
    const calendarIcs = e.calendarIcs || "";
    const eventName = e.name || "Elk Grove Toy Drive Celebration";
    const datesHtml = calendarIcs
      ? `<a class="event-summary-calendar-link" href="${escapeHtml(calendarIcs)}" download type="text/calendar" aria-label="Add ${escapeHtml(eventName)} to your calendar">${escapeHtml(datesLine)}</a>`
      : escapeHtml(datesLine);
    const venueHtml = venue
      ? mapsUrl
        ? `<p class="event-summary-meta"><a class="event-summary-venue-link" href="${escapeHtml(mapsUrl)}"${isGeo ? "" : ' target="_blank" rel="noopener noreferrer"'}>${escapeHtml(venue)}</a></p>`
        : `<p class="event-summary-meta">${escapeHtml(venue)}</p>`
      : "";
    return `<div class="event-summary">
      <p class="event-summary-dates">${datesHtml}</p>
      ${venueHtml}
      ${tagline ? `<p class="event-summary-tagline">${escapeHtml(tagline)}</p>` : ""}
    </div>`;
  }

  function renderHostedBy(site) {
    const hosts = site?.event?.hosts;
    if (!Array.isArray(hosts) || !hosts.length) return "";
    const hostsLabel = site?.hero?.hostedByLabel || "Hosted by";
    const items = hosts
      .map((host) => {
        const name = host?.name || host?.label || "";
        const label = host?.label || name;
        if (!name && !label) return "";
        const href = String(host?.href || "").trim() || "#";
        const logo =
          String(host?.logo || "").trim() ||
          (label ? `/assets/hosts/${String(label).toLowerCase()}.png` : "");
        return `<a class="festival-host" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">
          <span class="festival-host-mark">
            <img src="${escapeHtml(logo)}" alt="${escapeHtml(name || label)}" width="120" height="120" loading="lazy" decoding="async" />
          </span>
          <span class="festival-host-label">${escapeHtml(label)}</span>
        </a>`;
      })
      .filter(Boolean)
      .join("");
    if (!items) return "";
    return `
      <div class="festival-hosts" aria-label="${escapeHtml(hostsLabel)}">
        <p class="festival-hosts-label">${escapeHtml(hostsLabel)}</p>
        <div class="festival-hosts-row">${items}</div>
      </div>
    `;
  }

  function slugifyHeading(text) {
    return String(text)
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "");
  }

  function sectionId(section, fallbackTitle) {
    return section?.id ?? slugifyHeading(fallbackTitle ?? section?.title ?? "section");
  }

  function renderDocToc(tocItems) {
    const links = (tocItems ?? [])
      .map((item) => {
        if (item?.type === "divider" || item?.divider) {
          return `<p class="ls-doc-toc-label ls-doc-toc-label--section">${escapeHtml(
            item.label ?? "",
          )}</p>`;
        }
        return `<a class="ls-doc-toc-link" href="#${escapeHtml(item.id)}" data-toc-target="${escapeHtml(item.id)}">${escapeHtml(item.label)}</a>`;
      })
      .join("");
    return `<nav class="ls-doc-toc" aria-label="On this page"><p class="ls-doc-toc-label">On this page</p>${links}</nav>`;
  }

  function wrapDocLayout(tocHtml, mainHtml) {
    return `<div class="ls-doc-layout" data-ls-toc-drawer>${tocHtml}<div class="ls-doc-main">${mainHtml}</div></div>`;
  }

  function buildAboutToc(about) {
    const items = (about.sections ?? []).map((section) => ({
      id: sectionId(section),
      label: section.title,
    }));
    return items;
  }

  function findLaneById(site, laneId) {
    if (!laneId) return null;
    return (site.lanes ?? []).find((lane) => lane.id === laneId) ?? null;
  }

  function buildTeamToc(site) {
    const meetings = site.productionMeetings;
    const roster = site.teamPage?.roster;
    const groups = roster?.groups?.length
      ? roster.groups
      : roster?.members?.length
        ? [{ title: null, members: roster.members }]
        : [];
    const rosterToc = groups
      .map((group) => {
        const members = group.members ?? [];
        const lane = findLaneById(site, group.laneId);
        if (!members.length && !lane) return null;
        const id = group.title ? slugifyHeading(group.title) : "roster";
        return { id, label: group.title ?? roster?.title ?? "Team" };
      })
      .filter(Boolean);
    return [
      ...(meetings ? [{ id: "production-meetings", label: meetings.title ?? "Production meetings" }] : []),
      ...rosterToc,
      { id: "apply", label: site.teamPage?.join?.title ?? "Apply & get involved" },
      { id: "faq", label: "FAQ" },
    ];
  }

  function initDocToc() {
    return window.DocScroll.init();
  }

  function renderToyCountCards(toyCounts) {
    if (!(toyCounts ?? []).length) return "";
    const cards = toyCounts
      .map((row) => {
        const note = row.note ? `<span class="toy-count-note">${escapeHtml(row.note)}</span>` : "";
        return `<div class="toy-count-card">
          <span class="toy-count-year">${escapeHtml(String(row.year))}</span>
          <span class="toy-count-value">${escapeHtml(String(row.count))}</span>
          ${note}
        </div>`;
      })
      .join("");
    return `<div class="toy-count-grid">${cards}</div>`;
  }

  function renderHomeFlyer(flyer) {
    if (!flyer?.src) return "";
    const alt = flyer.alt ?? "Celebration flier";
    return `
      <figure class="home-flyer">
        <button type="button" class="home-flyer-open" data-ls-lightbox data-ls-lightbox-src="${escapeHtml(flyer.src)}" data-ls-lightbox-alt="${escapeHtml(alt)}" aria-label="View ${escapeHtml(alt)}">
          <img src="${escapeHtml(flyer.src)}" alt="${escapeHtml(alt)}" width="603" height="875" decoding="async" />
        </button>
      </figure>`;
  }

  function flierShareFileName(src) {
    try {
      const path = new URL(src, window.location.href).pathname;
      const base = path.split("/").pop();
      return base && /\.[a-z0-9]+$/i.test(base) ? base : "flier.jpg";
    } catch (_) {
      return "flier.jpg";
    }
  }

  function absoluteFlierUrl(src) {
    try {
      return new URL(src, window.location.href).href;
    } catch (_) {
      return src || window.location.href;
    }
  }

  async function copyText(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const input = document.createElement("textarea");
    input.value = text;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.left = "-9999px";
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    input.remove();
  }

  function setShareButtonFeedback(button, label, restoreMs = 1800) {
    if (!button) return;
    const previous = button.dataset.shareIdleLabel || button.textContent || "Share";
    button.dataset.shareIdleLabel = previous;
    button.textContent = label;
    window.clearTimeout(Number(button.dataset.shareFeedbackTimer || 0));
    button.dataset.shareFeedbackTimer = String(
      window.setTimeout(() => {
        button.textContent = button.dataset.shareIdleLabel || "Share";
        delete button.dataset.shareFeedbackTimer;
      }, restoreMs),
    );
  }

  async function shareLightboxFlier(item) {
    const src = item?.src || "";
    const title = item?.alt || "Elk Grove Toy Drive Celebration flier";
    const imageUrl = absoluteFlierUrl(src);
    const pageUrl = window.location.href;
    const text = `${title} — Elk Grove Toy Drive Celebration`;

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      if (src && typeof navigator.canShare === "function") {
        try {
          const response = await fetch(src);
          if (!response.ok) throw new Error(`Flier fetch failed (${response.status})`);
          const blob = await response.blob();
          const type = blob.type || "image/jpeg";
          const file = new File([blob], flierShareFileName(src), { type });
          const fileShare = { files: [file], title, text };
          if (navigator.canShare(fileShare)) {
            await navigator.share(fileShare);
            return { mode: "file" };
          }
        } catch (err) {
          if (err && err.name === "AbortError") throw err;
          /* fall through to URL share */
        }
      }

      try {
        // Match EGLNY programming-flier share: title/text + page URL (files when Level 2 works).
        await navigator.share({ title, text, url: pageUrl });
        return { mode: "url" };
      } catch (err) {
        if (err && err.name === "AbortError") throw err;
        /* fall through to clipboard */
      }
    }

    await copyText(imageUrl || pageUrl);
    return { mode: "copy" };
  }

  function renderFlierLightboxChrome(item, container) {
    if (!item?.src) return;
    const shareButton = document.createElement("button");
    shareButton.type = "button";
    shareButton.className = "ls-lightbox-action";
    shareButton.setAttribute("aria-label", "Share flier");
    shareButton.textContent = "Share";
    shareButton.addEventListener("click", async () => {
      if (shareButton.dataset.sharing === "1") return;
      shareButton.dataset.sharing = "1";
      try {
        const result = await shareLightboxFlier(item);
        if (result?.mode === "copy") {
          setShareButtonFeedback(shareButton, "Copied!");
        }
      } catch (err) {
        if (err && err.name === "AbortError") return;
        console.warn("Flier share failed", err);
        try {
          await copyText(absoluteFlierUrl(item.src) || window.location.href);
          setShareButtonFeedback(shareButton, "Copied!");
        } catch (copyErr) {
          console.warn("Flier link copy failed", copyErr);
          setShareButtonFeedback(shareButton, "Share failed");
        }
      } finally {
        delete shareButton.dataset.sharing;
      }
    });
    container.appendChild(shareButton);
  }

  function initFlierLightbox() {
    window.LSDS?.initLightbox?.(document, {
      renderChrome: renderFlierLightboxChrome,
    });
  }

  function renderPhotoStrip(photos, ariaLabel) {
    if (!(photos ?? []).length) return "";
    const prefix = navPrefix();
    const figures = photos
      .map((photo) => {
        const src = photo.src.startsWith("http")
          ? photo.src
          : prefix + photo.src.replace(/^\//, "");
        const cap = photo.caption
          ? `<figcaption>${escapeHtml(photo.caption)}</figcaption>`
          : "";
        return `
      <figure class="photo-strip-item">
        <img src="${escapeHtml(src)}" alt="${escapeHtml(photo.alt ?? "")}" loading="lazy" decoding="async" />
        ${cap}
      </figure>`;
      })
      .join("");
    return `
    <div class="photo-strip" role="group" aria-label="${escapeHtml(ariaLabel ?? "Photos")}">
      ${figures}
    </div>`;
  }

  function renderAboutSections(about) {
    const sections = about.sections ?? [];
    if (sections.length) {
      return sections
        .map(
          (section) => {
            const id = sectionId(section);
            const body = [
              renderToyCountCards(section.toyCounts),
              ...(section.paragraphs ?? []).map((p) => `<p>${escapeHtml(p)}</p>`),
            ]
              .filter(Boolean)
              .join("");
            return `
      <section class="about-section ls-doc-section" id="${escapeHtml(id)}" data-doc-section>
        <h2>${escapeHtml(section.title)}</h2>
        ${body}
      </section>`;
          },
        )
        .join("");
    }
    return (about.paragraphs ?? []).map((p) => `<p>${escapeHtml(p)}</p>`).join("");
  }

  function renderPosterWall(posterWall) {
    if (!posterWall?.title || !(posterWall.posters ?? []).length) return "";
    const prefix = navPrefix();
    const cards = (posterWall.posters ?? [])
      .map((poster) => {
        const alt = `Toy Drive ${poster.year} — ${poster.venue}`;
        const image = poster.image
          ? `<img class="poster-image" src="${escapeHtml(prefix + poster.image)}" alt="${escapeHtml(alt)}" loading="lazy" />`
          : "";
        return `
      <figure class="poster-card">
        ${image}
        <figcaption class="poster-caption">
          <span class="poster-year">${escapeHtml(String(poster.year))}</span>
          <span class="poster-venue">${escapeHtml(poster.venue)}</span>
        </figcaption>
      </figure>`;
      })
      .join("");

    return `
    <section class="poster-wall ls-doc-section" id="posters" data-doc-section>
      <h2>${escapeHtml(posterWall.title ?? "Festival posters over the years")}</h2>
      ${posterWall.intro ? `<p class="muted">${escapeHtml(posterWall.intro)}</p>` : ""}
      <div class="poster-grid">${cards}</div>
      ${posterWall.note ? `<p class="muted">${escapeHtml(posterWall.note)}</p>` : ""}
    </section>`;
  }

  function applyTicketsHref(el, href, label) {
    if (!el) return;
    el.textContent = label;
    if (href) {
      el.href = href;
      el.target = "_blank";
      el.rel = "noopener";
      el.removeAttribute("aria-disabled");
      el.classList.remove("is-disabled");
    } else {
      el.href = "#";
      el.removeAttribute("target");
      el.removeAttribute("rel");
      if (el.classList.contains("site-nav-tickets-cta")) {
        el.setAttribute("aria-disabled", "true");
        el.classList.add("is-disabled");
      }
    }
  }

  function syncNavTickets(site) {
    cachedSite = site;
    const href = ticketsUrl(site);
    const label = site?.cta?.ticketsNavLabel || "Free tickets";
    applyTicketsHref(document.querySelector(".site-nav-tickets-cta"), href, label);
  }

  function initPageShell(activePage) {
    mountNav(activePage);
    initTheme();
    initNavMenu();
    initFlierLightbox();
    loadSiteData()
      .then((site) => {
        syncNavTickets(site);
        injectNavSocial(site?.footer?.socialLinks);
        injectNavContact(site);
        mountFooter(site);
      })
      .catch(() => {});
  }

  async function loadSeasonEvents() {
    const prefix = navPrefix();
    const res = await fetch(`${prefix}data/season-events.json`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Could not load season events (${res.status})`);
    return res.json();
  }

  async function loadJsonData(relativePath) {
    const prefix = navPrefix();
    const res = await fetch(`${prefix}${relativePath}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Could not load ${relativePath} (${res.status})`);
    return res.json();
  }

  /** In-kind service attribution (formerly “Volunteers” display class). */
  const SERVICE_IN_KIND_TIER = "In-Kind Donation (Service)";
  const LEGACY_VOLUNTEERS_TIER = "Volunteers";

  function normalizeSponsorTierName(tier) {
    if (tier === LEGACY_VOLUNTEERS_TIER) return SERVICE_IN_KIND_TIER;
    return tier ?? "Sponsors & Donors";
  }

  /** Allow only #rgb / #rrggbb / #rrggbbaa for sponsor cardBg (inline CSS). */
  function sanitizeSponsorCardBg(value) {
    if (typeof value !== "string") return null;
    const v = value.trim();
    return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v) ? v : null;
  }

  /** Expand #rgb → #rrggbb for luminance checks. */
  function expandSponsorCardBgHex(hex) {
    if (!hex) return null;
    if (hex.length === 4) {
      return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
    }
    return hex.length >= 7 ? hex.slice(0, 7) : hex;
  }

  /** Relative luminance 0–1; null if unparseable. */
  function sponsorCardBgLuminance(hex) {
    const full = expandSponsorCardBgHex(hex);
    if (!full || full.length !== 7) return null;
    const r = parseInt(full.slice(1, 3), 16) / 255;
    const g = parseInt(full.slice(3, 5), 16) / 255;
    const b = parseInt(full.slice(5, 7), 16) / 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /**
   * Resolve plate color: explicit cardBg, else logoOnDark/darkBg → near-black.
   * EGLNY has no equivalent flag yet; Toy Drive uses these display keys.
   */
  function resolveSponsorCardBg(sponsor) {
    const fromCard = sanitizeSponsorCardBg(sponsor?.cardBg);
    if (fromCard) return fromCard;
    if (sponsor?.logoOnDark === true || sponsor?.darkBg === true) {
      return "#0a0a0a";
    }
    return null;
  }

  /**
   * Place Service after Food among in-kind; otherwise append after known tiers.
   * Drops legacy “Volunteers” label from order lists.
   */
  function withServiceInKindTierOrder(tierOrder, hasService) {
    const order = [...(tierOrder ?? [])]
      .map(normalizeSponsorTierName)
      .filter((t, i, arr) => arr.indexOf(t) === i);
    if (!hasService) return order.filter((t) => t !== SERVICE_IN_KIND_TIER);
    const withoutService = order.filter((t) => t !== SERVICE_IN_KIND_TIER);
    const foodIdx = withoutService.indexOf("In-Kind Donation (Food)");
    if (foodIdx >= 0) {
      withoutService.splice(foodIdx + 1, 0, SERVICE_IN_KIND_TIER);
      return withoutService;
    }
    withoutService.push(SERVICE_IN_KIND_TIER);
    return withoutService;
  }

  function serviceInKindEntries(serviceData) {
    if (!serviceData) return [];
    const list = serviceData.volunteers ?? serviceData.sponsors ?? [];
    return list.map((entry) => ({
      ...entry,
      tier: SERVICE_IN_KIND_TIER,
    }));
  }

  /**
   * Shared display model for homepage + /sponsorship/: cash/in-kind sponsors
   * plus optional service-in-kind JSON (toydrive-*-volunteers-display.json).
   */
  function mergeSponsorsDisplay(sponsorsData, serviceData) {
    const base = sponsorsData ?? {};
    const remapped = (base.sponsors ?? []).map((s) => ({
      ...s,
      tier: normalizeSponsorTierName(s.tier),
    }));
    const serviceEntries = serviceInKindEntries(serviceData);
    const sponsors = [...remapped, ...serviceEntries];
    const hasService = sponsors.some((s) => s.tier === SERVICE_IN_KIND_TIER);
    return {
      ...base,
      tierOrder: withServiceInKindTierOrder(base.tierOrder, hasService),
      sponsors,
    };
  }

  function sponsorTiersForData(sponsorsData) {
    const sponsors = sponsorsData?.sponsors ?? [];
    const tierOrder = sponsorsData?.tierOrder ?? [];
    const byTier = new Map();
    for (const s of sponsors) {
      const tier = normalizeSponsorTierName(s.tier);
      if (!byTier.has(tier)) byTier.set(tier, []);
      byTier.get(tier).push(s);
    }
    return [
      ...tierOrder.filter((t) => byTier.has(t)),
      ...[...byTier.keys()].filter((t) => !tierOrder.includes(t)),
    ];
  }

  /**
   * A→Z by business display `name` (not logo path / filename / id).
   * Logo paths like `2025/…` vs `2026/…` must not affect card order.
   */
  function compareSponsorDisplayName(a, b) {
    return String(a?.name ?? "")
      .trim()
      .localeCompare(String(b?.name ?? "").trim(), "en", {
        sensitivity: "base",
      });
  }

  function renderSponsorTierHtml(sponsorsData, options = {}) {
    const sponsors = sponsorsData?.sponsors ?? [];
    const byTier = new Map();
    for (const s of sponsors) {
      const tier = normalizeSponsorTierName(s.tier);
      if (!byTier.has(tier)) byTier.set(tier, []);
      byTier.get(tier).push(s);
    }
    const sortedTiers = sponsorTiersForData(sponsorsData);
    const logoPrefix = options.logoPrefix ?? "/sponsors/";
    const idPrefix = options.idPrefix ?? "";
    const docSections = options.docSections !== false;
    const sectionClass = docSections ? "ls-sponsor-tier ls-doc-section" : "ls-sponsor-tier";
    const dataAttr = docSections ? " data-doc-section" : "";
    const gridClass = options.centerGrid
      ? "ls-sponsor-grid ls-sponsor-grid--center"
      : "ls-sponsor-grid";
    return sortedTiers
      .map((tier) => {
        const tierId = `${idPrefix}${slugifyHeading(tier)}`;
        const cards = byTier
          .get(tier)
          .slice()
          .sort(compareSponsorDisplayName)
          .map((s) => {
            const caption = s.caption
              ? `<span class="sponsor-card-caption">${escapeHtml(s.caption)}</span>`
              : "";
            // Text-only name+caption must be one centered stack — sibling
            // grid children stretch apart under aspect-ratio + align-content.
            const textOnly =
              !s.logo &&
              `<span class="sponsor-card-label"><span class="sponsor-card-name">${escapeHtml(
                s.name,
              )}</span>${caption}</span>`;
            const inner = s.logo
              ? `<img src="${escapeHtml(logoPrefix)}${escapeHtml(s.logo)}" alt="${escapeHtml(s.name)}" />${caption}`
              : textOnly;
            const cardBg = resolveSponsorCardBg(s);
            const styleAttr = cardBg
              ? ` style="--ls-sponsor-card-bg:${cardBg};--ls-sponsor-opacity:1"`
              : "";
            const lum = cardBg ? sponsorCardBgLuminance(cardBg) : null;
            const onDark =
              s.logoOnDark === true ||
              s.darkBg === true ||
              (lum != null && lum < 0.25);
            const cardClass = onDark
              ? "ls-sponsor-card ls-sponsor-card--on-dark"
              : "ls-sponsor-card";
            if (s.url) {
              return `<a class="${cardClass}" href="${escapeHtml(s.url)}" target="_blank" rel="noopener"${styleAttr}>${inner}</a>`;
            }
            return `<div class="${cardClass}"${styleAttr}>${inner}</div>`;
          })
          .join("");
        return `<section class="${sectionClass}" id="${escapeHtml(tierId)}"${dataAttr}><h2 class="ls-sponsor-tier-heading">${escapeHtml(tier)}</h2><div class="${gridClass}">${cards}</div></section>`;
      })
      .join("");
  }

  /** Homepage thank-you strip — same 2026 tiers as /sponsorship/ (incl. Service). */
  function renderHomeSponsors2026(sponsorship, sponsors2026Data, service2026Data) {
    const display = mergeSponsorsDisplay(sponsors2026Data, service2026Data);
    const tiersHtml = renderSponsorTierHtml(display, {
      idPrefix: "home-2026-",
      docSections: false,
      centerGrid: true,
    });
    if (!tiersHtml) return "";
    const title = sponsorship?.thankYou2026Title ?? "2026 Sponsors";
    const lead =
      sponsorship?.thankYou2026Lead ??
      "Thank you to these partners and sponsors for standing with the 2026 Toy Drive.";
    return `
          <section class="content-section home-build-cta home-sponsors-2026">
            <h2>${escapeHtml(title)}</h2>
            <p>${escapeHtml(lead)}</p>
            ${tiersHtml}
          </section>`;
  }

  /** @deprecated Prefer mergeSponsorsDisplay + renderHomeSponsors2026. */
  function renderHomeVolunteers2026(volunteers2026Data) {
    const display = mergeSponsorsDisplay(null, volunteers2026Data);
    const tiersHtml = renderSponsorTierHtml(display, {
      idPrefix: "home-2026-service-",
      docSections: false,
      centerGrid: true,
    });
    if (!tiersHtml) return "";
    const title = volunteers2026Data?.title ?? SERVICE_IN_KIND_TIER;
    const lead =
      volunteers2026Data?.lead ??
      "Thank you to these teams for supporting the Toy Drive with volunteer service.";
    return `
          <section class="content-section home-build-cta home-volunteers-2026">
            <h2>${escapeHtml(title)}</h2>
            <p>${escapeHtml(lead)}</p>
            ${tiersHtml}
          </section>`;
  }

  function renderSponsorshipPage(
    sponsorship,
    sponsors2025Data,
    sponsors2026Data,
    service2026Data,
  ) {
    const links = sponsorship?.links ?? [];
    const partnerCards = links
      .map((link) => {
        const external = link.external ? ' target="_blank" rel="noopener"' : "";
        return `
      <a class="resource-card" href="${escapeHtml(link.href)}"${external}>
        <h3>${escapeHtml(link.title)}</h3>
        ${link.body ? `<p>${escapeHtml(link.body)}</p>` : ""}
      </a>`;
      })
      .join("");

    const display2026 = mergeSponsorsDisplay(sponsors2026Data, service2026Data);
    const display2025 = mergeSponsorsDisplay(sponsors2025Data, null);
    const year2025 = display2025?.eventYear ?? 2025;
    const year2026 = display2026?.eventYear ?? 2026;
    const thankYou2026Title = sponsorship?.thankYou2026Title ?? `${year2026} Sponsors`;
    const thankYou2026Lead =
      sponsorship?.thankYou2026Lead ??
      `Thank you to these partners and sponsors for standing with the ${year2026} Toy Drive.`;
    const thankYou2025Id = sponsorship?.thankYouId ?? `thank-you-${year2025}`;
    const thankYou2025Title =
      sponsorship?.thankYouTitle ?? `Thank You, ${year2025} Sponsors & Supporters`;
    const thankYou2025Lead =
      sponsorship?.thankYouLead ??
      `Our ${year2025} Toy Drive was made possible by sponsors, donors, in-kind partners, and volunteers.`;

    const tiers2026Html = renderSponsorTierHtml(display2026, {
      idPrefix: "2026-",
      centerGrid: false,
    });
    const tiers2025Html = renderSponsorTierHtml(display2025, {
      idPrefix: "2025-",
      centerGrid: false,
    });

    const tocItems = [
      { id: "partner", label: sponsorship?.partnerTitle ?? "Partner with us" },
      {
        id: "thank-you-2026",
        label: sponsorship?.sponsors2026TocLabel ?? `${year2026} Sponsors`,
      },
      {
        id: thankYou2025Id,
        label: sponsorship?.sponsorsTocLabel ?? `${year2025} Sponsors & Supporters`,
      },
    ];

    const partnerEmail = sponsorship?.partnerContactEmail ?? "contact@elkgrovetoydrive.com";
    const partnerSubject = sponsorship?.partnerContactSubject ?? "Toy Drive 2026 sponsorship";
    const partnerContactNote = sponsorship?.partnerContactNote
      ? `<p class="muted">${escapeHtml(sponsorship.partnerContactNote).replace(
          escapeHtml(partnerEmail),
          `<a href="mailto:${escapeHtml(partnerEmail)}?subject=${encodeURIComponent(partnerSubject)}">${escapeHtml(partnerEmail)}</a>`,
        )}</p>`
      : "";

    const mainHtml = `
      <section class="content-section ls-doc-section" id="partner" data-doc-section>
        <h2>${escapeHtml(sponsorship?.partnerTitle ?? "Partner with us")}</h2>
        ${sponsorship?.partnerIntro ? `<p>${escapeHtml(sponsorship.partnerIntro)}</p>` : ""}
        <div class="resource-card-grid">${partnerCards}</div>
        ${partnerContactNote}
      </section>
      <section class="sponsorship-thank-you ls-doc-section" id="thank-you-2026" data-doc-section>
        <h2 class="sponsorship-thank-you-title">${escapeHtml(thankYou2026Title)}</h2>
        <p>${escapeHtml(thankYou2026Lead)}</p>
      </section>
      ${tiers2026Html || ""}
      <section class="sponsorship-thank-you ls-doc-section" id="${escapeHtml(thankYou2025Id)}" data-doc-section>
        <h2 class="sponsorship-thank-you-title">${escapeHtml(thankYou2025Title)}</h2>
        <p>${escapeHtml(thankYou2025Lead)}</p>
      </section>
      ${tiers2025Html || "<p>No sponsors to display.</p>"}`;

    return `
      <section class="hero">
        <h1>${escapeHtml(sponsorship?.headline ?? "Sponsorship")}</h1>
        ${sponsorship?.lead ? `<p class="hero-lead">${escapeHtml(sponsorship.lead)}</p>` : ""}
      </section>
      ${wrapDocLayout(renderDocToc(tocItems), mainHtml)}`;
  }

  function externalLinkAttrs(href) {
    if (!href || href.startsWith("/")) return "";
    return ' target="_blank" rel="noopener"';
  }

  function renderSeasonEventItem(event) {
    const capstoneClass = event.capstone ? " season-event-capstone" : "";
    const nameHtml = event.href
      ? `<a href="${escapeHtml(event.href)}"${externalLinkAttrs(event.href)}>${escapeHtml(event.name)}</a>`
      : escapeHtml(event.name);
    const hostPart = event.host ? ` · ${escapeHtml(event.host)}` : "";
    return `<li class="season-event-item${capstoneClass}">
      <span class="season-event-dates">${escapeHtml(event.dates)}</span>
      <span class="season-event-title">${nameHtml}${hostPart}</span>
      <span class="season-event-location">${escapeHtml(event.location)}</span>
    </li>`;
  }

  function renderSeasonPage(season, seasonData) {
    const events = seasonData?.events ?? [];
    const seasonTitle = season?.title ?? "Lunar New Year Season";
    const listItems = events.map(renderSeasonEventItem).join("");
    const listNote = season?.listNote
      ? `<p class="muted season-list-note">${escapeHtml(season.listNote)}</p>`
      : "";
    const contactNote = season?.contactNote
      ? `<p class="muted season-contact-note">${escapeHtml(season.contactNote)}</p>`
      : "";
    const toc = [{ id: "season", label: seasonTitle }];
    const seasonSection = `
      <section class="about-section resources-season ls-doc-section" id="season" data-doc-section>
        <h2>${escapeHtml(seasonTitle)}</h2>
        ${season?.intro ? `<p>${escapeHtml(season.intro)}</p>` : ""}
        ${events.length ? `<ul class="season-event-list">${listItems}</ul>` : `<p class="muted">Season events coming soon.</p>`}
        ${listNote}
        ${contactNote}
      </section>`;

    return `
      <section class="hero">
        <h1>${escapeHtml(season?.headline ?? "Lunar New Year Season")}</h1>
        ${season?.lead ? `<p class="hero-lead">${escapeHtml(season.lead)}</p>` : ""}
      </section>
      ${wrapDocLayout(renderDocToc(toc), seasonSection)}`;
  }

  function renderResourcesPage(resources) {
    const links = resources?.links ?? [];
    const cards = links
      .map((link) => {
        const external =
          link.external === true || /^https?:\/\//i.test(link.href ?? "");
        const attrs = external
          ? ` target="_blank" rel="noopener noreferrer"`
          : "";
        return `
      <a class="resource-card" href="${escapeHtml(link.href)}"${attrs}>
        <h2>${escapeHtml(link.title)}</h2>
        ${link.body ? `<p>${escapeHtml(link.body)}</p>` : ""}
      </a>`;
      })
      .join("");

    return `
      <section class="hero">
        <h1>${escapeHtml(resources?.headline ?? "Resources")}</h1>
        ${resources?.lead ? `<p class="hero-lead">${escapeHtml(resources.lead)}</p>` : ""}
      </section>
      <div class="resource-card-grid">${cards}</div>`;
  }

  function renderProductionPage(production) {
    return renderResourcesPage({
      headline: production?.headline ?? "Production",
      lead: production?.lead,
      links: production?.links,
    });
  }

  function renderCharitiesPage(charities) {
    const partners = charities?.partners ?? [];
    const become = charities?.becomeRecipient ?? {};
    const mailto =
      become.email &&
      `mailto:${become.email}?subject=${encodeURIComponent(become.emailSubject ?? "Toy Drive recipient charity interest")}`;
    const tocItems = [
      { id: "partners", label: charities?.seasonLabel ?? "Partners" },
      ...(mailto ? [{ id: "become-a-recipient", label: "Become a recipient" }] : []),
    ];
    const partnerCards = partners
      .map((partner) => {
        const label = partner.displayUrl ?? partner.url ?? partner.name;
        const logo = partner.logo
          ? `<img class="charity-card-logo" src="${escapeHtml(partner.logo)}" alt="" width="72" height="72" loading="lazy" decoding="async" />`
          : "";
        const mission = partner.mission
          ? `<span class="charity-card-mission">${escapeHtml(partner.mission)}</span>`
          : "";
        const body = `<span class="charity-card-logo-slot">${logo}</span>
          <span class="charity-card-body">
            <span class="charity-card-name">${escapeHtml(partner.name)}</span>
            ${mission}
            ${partner.url ? `<span class="charity-card-url">${escapeHtml(label)}</span>` : ""}
          </span>`;
        if (partner.url) {
          return `<a class="charity-card" href="${escapeHtml(partner.url)}" target="_blank" rel="noopener">${body}</a>`;
        }
        return `<div class="charity-card">${body}</div>`;
      })
      .join("");

    const becomeHtml = mailto
      ? `<section class="content-section ls-doc-section" id="become-a-recipient" data-doc-section>
          <h2>Become a recipient</h2>
          <p>${escapeHtml(become.prompt ?? "Interested in becoming a recipient charity?")}</p>
          <p><a class="ls-btn ls-btn--primary" href="${escapeHtml(mailto)}">${escapeHtml(become.cta ?? "Email us")} →</a></p>
        </section>`
      : "";

    const mainHtml = `
      <section class="content-section ls-doc-section" id="partners" data-doc-section>
        <h2>${escapeHtml(charities?.seasonLabel ?? "Partners")}</h2>
        ${charities?.seasonNote ? `<p class="muted">${escapeHtml(charities.seasonNote)}</p>` : ""}
        <div class="charity-grid">${partnerCards || "<p>Partner charities will be listed here.</p>"}</div>
      </section>
      ${becomeHtml}`;

    return `
      <section class="hero">
        <h1>${escapeHtml(charities?.headline ?? "Local Charities")}</h1>
        ${charities?.lead ? `<p class="hero-lead">${escapeHtml(charities.lead)}</p>` : ""}
      </section>
      ${wrapDocLayout(renderDocToc(tocItems), mainHtml)}`;
  }

  function renderMediaVideoCard(video) {
    const id = String(video.youtubeId ?? "").trim();
    const title = video.title ?? "Festival video";
    const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
    const embedSrc = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`;
    const poster = `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`;
    return `
      <figure class="video-card">
        <div class="video-embed" data-youtube-id="${escapeHtml(id)}" data-embed-src="${escapeHtml(embedSrc)}">
          <button type="button" class="video-play" aria-label="Play ${escapeHtml(title)}">
            <img class="video-poster" src="${escapeHtml(poster)}" alt="" loading="lazy" width="480" height="360" />
            <span class="video-play-icon" aria-hidden="true"></span>
          </button>
          <a class="video-fallback-link" href="${escapeHtml(watchUrl)}" target="_blank" rel="noopener">Watch on YouTube</a>
        </div>
        <figcaption class="video-caption">${escapeHtml(title)}</figcaption>
      </figure>`;
  }

  function renderMediaPage(media) {
    const videos = media?.videos ?? [];
    const posterWall = media?.posterWall;
    const videosHeading = media?.videosHeading ?? "Videos";
    const hasPosters = (posterWall?.posters ?? []).length > 0;
    const tocItems = [];
    if (videos.length) tocItems.push({ id: "videos", label: videosHeading });
    if (hasPosters) {
      tocItems.push({
        id: "posters",
        label: posterWall.tocLabel ?? posterWall.title ?? "Past fliers",
      });
    }

    const byYear = new Map();
    for (const video of videos) {
      const year = String(video.year ?? "Videos");
      if (!byYear.has(year)) byYear.set(year, []);
      byYear.get(year).push(video);
    }
    const years = [...byYear.keys()].sort((a, b) => String(b).localeCompare(String(a)));
    const yearBlocks = years
      .map((year) => {
        const cards = byYear.get(year).map(renderMediaVideoCard).join("");
        return `
      <div class="media-year-section" aria-labelledby="media-year-${escapeHtml(year)}">
        <h3 class="media-year-heading" id="media-year-${escapeHtml(year)}">${escapeHtml(year)}</h3>
        <div class="video-grid">${cards}</div>
      </div>`;
      })
      .join("");

    const videosHtml = videos.length
      ? `
      <section class="content-section ls-doc-section" id="videos" data-doc-section>
        <h2>${escapeHtml(videosHeading)}</h2>
        ${yearBlocks}
      </section>`
      : "";

    const postersHtml = hasPosters ? renderPosterWall(posterWall) : "";
    const contact = media?.contactNote
      ? `<p class="muted media-contact-note">${escapeHtml(media.contactNote)}</p>`
      : "";
    const empty =
      !videos.length && !hasPosters
        ? `<p class="muted">Media coming soon.</p>`
        : "";
    const mainHtml = `${videosHtml}${postersHtml}${empty}${contact}`;

    return `
      <section class="hero">
        <h1>${escapeHtml(media?.headline ?? "Media")}</h1>
        ${media?.lead ? `<p class="hero-lead">${escapeHtml(media.lead)}</p>` : ""}
      </section>
      ${tocItems.length ? wrapDocLayout(renderDocToc(tocItems), mainHtml) : `<div class="media-page-body">${mainHtml}</div>`}`;
  }

  function initMediaPlayers(root = document) {
    root.querySelectorAll(".video-embed[data-embed-src]").forEach((embed) => {
      const button = embed.querySelector(".video-play");
      if (!button || button.dataset.bound === "1") return;
      button.dataset.bound = "1";
      button.addEventListener("click", () => {
        const src = embed.getAttribute("data-embed-src");
        const title = button.getAttribute("aria-label")?.replace(/^Play\s+/, "") || "Festival video";
        if (!src) return;
        embed.innerHTML = `<iframe
          src="${src}"
          title="${escapeHtml(title)}"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
          referrerpolicy="strict-origin-when-cross-origin"
        ></iframe>`;
      });
    });
  }

  function rosterInitials(name) {
    return String(name ?? "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
  }

  function renderRosterMemberCard(m) {
    const photo = m.photo;
    const img = photo
      ? `<img class="roster-photo" src="${escapeHtml(photo)}" alt="" width="88" height="88" loading="lazy" />`
      : `<span class="roster-photo roster-photo--placeholder" aria-hidden="true">${escapeHtml(
          rosterInitials(m.name),
        )}</span>`;
    const handle = String(m.instagram ?? "")
      .trim()
      .replace(/^@/, "");
    const ig = handle
      ? `<a
            class="roster-ig"
            href="https://www.instagram.com/${escapeHtml(handle)}/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="${escapeHtml(m.name)} on Instagram (@${escapeHtml(handle)})"
          >${renderSocialIcon("Instagram")}</a>`
      : "";
    const nameHtml = m.href
      ? `<a class="co-chair-name" href="${escapeHtml(m.href)}">${escapeHtml(m.name)}</a>`
      : `<p class="co-chair-name">${escapeHtml(m.name)}</p>`;
    const titleLines = String(m.title ?? "")
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
    const titleHtml = titleLines
      .map((line) => `<p class="co-chair-title">${escapeHtml(line)}</p>`)
      .join("");
    return `
    <div class="roster-card">
      ${img}
      <div class="roster-card-text">
        <div class="roster-name-row">
          ${nameHtml}
          ${ig}
        </div>
        ${titleHtml}
      </div>
    </div>`;
  }

  function renderLaneInterestCta(lane) {
    if (!lane) return "";
    const teamName = lane.joinTeamName ?? lane.title;
    const label = `Interested in joining the ${teamName} Team?`;
    return `<p class="roster-lane-interest-wrap"><button type="button" class="roster-lane-interest" data-roster-lane="${escapeHtml(
      lane.id,
    )}" data-roster-lane-title="${escapeHtml(teamName)}" aria-haspopup="dialog">${escapeHtml(label)}</button></p>`;
  }

  function renderLaneModalTemplate(site, lane) {
    if (!lane) return "";
    const intro = site.directorIntro;
    const introHtml = intro
      ? `<div class="roster-lane-modal-intro">
          <h3>${escapeHtml(intro.title ?? "What is a director?")}</h3>
          ${(intro.paragraphs ?? []).map((p) => `<p>${escapeHtml(p)}</p>`).join("")}
        </div>`
      : "";
    return `
      <template class="roster-lane-full" data-roster-lane="${escapeHtml(lane.id)}">
        <div class="lane-section roster-lane-modal-lane">
          <div class="lane-header">
            <p><strong>${escapeHtml(lane.subtitle)}</strong>${
              lane.intro ? ` — ${escapeHtml(lane.intro)}` : ""
            }</p>
          </div>
          ${(lane.roles ?? []).map(renderRoleCard).join("")}
        </div>
        <div class="roster-lane-modal-apply">
          ${introHtml}
          <h3>Apply &amp; get involved</h3>
          <p>${escapeHtml(
            site.teamPage?.join?.applyNote ??
              "Name the role you're interested in, then apply on Idealist.",
          )}</p>
          ${renderApplyBlock(site)}
        </div>
      </template>`;
  }

  function renderRosterSection(site) {
    const roster = site.teamPage?.roster;
    if (!roster) return "";

    const groups = roster.groups?.length
      ? roster.groups
      : roster.members?.length
        ? [{ title: null, members: roster.members }]
        : [];
    if (!groups.length) return "";

    const sections = groups
      .map((group) => {
        const members = group.members ?? [];
        const lane = findLaneById(site, group.laneId);
        if (!members.length && !lane) return "";
        const id = group.title ? slugifyHeading(group.title) : "roster";
        const heading = group.title
          ? `<h2>${escapeHtml(group.title)}</h2>`
          : `<h2>${escapeHtml(roster.title ?? "Team")}</h2>`;
        const blurb = lane?.teamBlurb
          ? `<p class="roster-lane-blurb">${escapeHtml(lane.teamBlurb)}</p>`
          : "";
        const cards = members.map(renderRosterMemberCard).join("");
        const grid = cards ? `<div class="co-chairs roster-grid">${cards}</div>` : "";
        return `
          <section class="content-section ls-doc-section" id="${escapeHtml(id)}" data-doc-section>
            ${heading}
            ${blurb}
            ${grid}
            ${renderLaneInterestCta(lane)}
          </section>`;
      })
      .filter(Boolean)
      .join("");

    const templates = (site.lanes ?? []).map((lane) => renderLaneModalTemplate(site, lane)).join("");
    return `${sections}${templates}`;
  }

  function ensureRosterLaneModal() {
    let dialog = document.getElementById("roster-lane-modal");
    if (dialog) return dialog;
    dialog = document.createElement("dialog");
    dialog.id = "roster-lane-modal";
    dialog.className = "roster-lane-modal";
    dialog.innerHTML = `
      <div class="roster-lane-modal-inner">
        <form method="dialog" class="roster-lane-modal-toolbar">
          <h2 class="roster-lane-modal-title"></h2>
          <button type="submit" class="roster-lane-modal-close" aria-label="Close">&times;</button>
        </form>
        <div class="roster-lane-modal-body"></div>
      </div>`;
    document.body.appendChild(dialog);
    return dialog;
  }

  function initRosterLaneModals(root = document) {
    const dialog = ensureRosterLaneModal();
    const laneTitle = dialog.querySelector(".roster-lane-modal-title");
    const laneBody = dialog.querySelector(".roster-lane-modal-body");

    root.querySelectorAll(".roster-lane-interest[data-roster-lane]").forEach((button) => {
      if (button.dataset.rosterLaneBound === "1") return;
      button.dataset.rosterLaneBound = "1";
      button.addEventListener("click", () => {
        const key = button.getAttribute("data-roster-lane");
        const template = Array.from(root.querySelectorAll("template.roster-lane-full")).find(
          (el) => el.getAttribute("data-roster-lane") === key,
        );
        if (!template || !laneTitle || !laneBody) return;
        laneTitle.textContent =
          button.getAttribute("data-roster-lane-title") || button.textContent || "Open roles";
        laneBody.replaceChildren(template.content.cloneNode(true));
        dialog.showModal();
      });
    });
  }

  function renderTeamApplySection(site) {
    const join = site.teamPage?.join ?? {};
    return `
          <section class="content-section ls-doc-section" id="apply" data-doc-section>
            <h2>${escapeHtml(join.title ?? "Apply & get involved")}</h2>
            <h3>Apply to an open role</h3>
            <p>${escapeHtml(
              join.applyNote ??
                "Apply on Idealist — name the lane or role you're interested in.",
            )}</p>
            ${renderApplyBlock(site)}
          </section>`;
  }

  function renderTeamPage(site) {
    const meetings = site.productionMeetings;
    const contactEmail = site.apply?.email ?? "contact@elkgrovetoydrive.com";

    const discordLi = meetings?.discordHref
      ? `<li><a href="${escapeHtml(meetings.discordHref)}"${externalLinkAttrs(meetings.discordHref)}>${escapeHtml(
          meetings.discordLabel ?? "Join the Discord",
        )}</a></li>`
      : "";
    const meetingsHtml = meetings
      ? `
          <section class="content-section ls-doc-section" id="production-meetings" data-doc-section>
            <h2>${escapeHtml(meetings.title ?? "Production meetings")}</h2>
            ${meetings.intro ? `<p>${escapeHtml(meetings.intro)}</p>` : ""}
            <ul>
              <li>${escapeHtml(meetings.zoom).replace(
                escapeHtml(contactEmail),
                `<a href="mailto:${escapeHtml(contactEmail)}">${escapeHtml(contactEmail)}</a>`,
              )}</li>
              ${discordLi}
            </ul>
          </section>`
      : "";

    const faqHtml = (site.faq ?? [])
      .map(
        (f) => `
          <div class="faq-item">
            <h3>${escapeHtml(f.q)}</h3>
            <p>${escapeHtml(f.a)}</p>
          </div>`,
      )
      .join("");

    const mainHtml = `
          ${meetingsHtml}
          ${renderRosterSection(site)}
          ${renderTeamApplySection(site)}
          <section class="content-section ls-doc-section" id="faq" data-doc-section>
            <h2>FAQ</h2>
            ${faqHtml}
          </section>`;

    return wrapDocLayout(renderDocToc(buildTeamToc(site)), mainHtml);
  }

  window.ToyDriveSite = {
    initPageShell,
    loadSiteData,
    loadJsonData,
    mountFooter,
    buildAboutToc,
    renderAboutSections,
    renderPhotoStrip,
    renderHomeFlyer,
    renderPosterWall,
    renderApplyBlock,
    renderCoChairs,
    renderDocToc,
    renderEventSummary,
    renderHostedBy,
    loadSeasonEvents,
    initMediaPlayers,
    renderMediaPage,
    renderResourcesPage,
    renderProductionPage,
    renderCharitiesPage,
    renderSeasonPage,
    renderRoleCard,
    SERVICE_IN_KIND_TIER,
    compareSponsorDisplayName,
    mergeSponsorsDisplay,
    renderSponsorTierHtml,
    renderHomeSponsors2026,
    renderHomeVolunteers2026,
    renderSponsorshipPage,
    renderTeamPage,
    initRosterLaneModals,
    setPageTitle,
    wrapDocLayout,
    initDocToc,
    slugifyHeading,
    escapeHtml,
    navPrefix,
  };
})();
