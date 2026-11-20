(() => {
  const links = () => [...document.querySelectorAll("[data-view]")];
  const views = () => [...document.querySelectorAll(".view")];
  const title = document.getElementById("view-title");
  const description = document.getElementById("view-description");
  const breadcrumb = document.getElementById("breadcrumb-current");
  const descriptions = {
    overview: "A clear view of your website and its content.",
    pages: "Review the pages that make up your public website.",
    media: "Manage images and other website assets.",
    "content-manager": "Browse, search, preview, edit and manage existing projects, social previews and company assets.",
    "add-content": "Create new game project showcases, social previews and company assets.",
    seo: "Review search and social-sharing metadata.",
    settings: "Manage the admin workspace and publishing connection.",
    audit: "Review recent changes made through the admin workspace.",
    analytics: "Traffic measurement and visitor trends.",
    calendar: "Schedule approved showcase collections for automatic publication.",
    inquiries: "Review messages submitted through the public contact form.",
    notifications: "Recent admin activity, new enquiries and scheduled publications.",
    health: "Live checks for the public website, repository and admin services.",
    preview: "Preview page edits without publishing them.",
    files: "Review uploaded assets and where each file is used.",
    security: "Review active admin sessions and revoke other sessions.",
    "site-settings": "Manage shared contact details, site tagline and announcement banner."
  };

  function showView(name) {
    const selected = descriptions[name] ? name : "overview";
    views().forEach(view => view.classList.toggle("active", view.id === "view-" + selected));
    links().forEach(link => link.classList.toggle("active", link.dataset.view === selected));
    const activeLink = links().find(link => link.dataset.view === selected);
    const label = activeLink?.dataset.label || activeLink?.textContent.replace(/^[^A-Za-z0-9]+/,"").trim() || "Overview";
    title.textContent = label;
    breadcrumb.textContent = label;
    description.textContent = descriptions[selected];
    window.closeAdminSidebar?.();
    if (["overview","analytics","calendar","inquiries","notifications","health","preview","files","security","site-settings"].includes(selected)) window.dispatchEvent(new CustomEvent("trs:control-view",{detail:selected}));
  }
  window.showAdminView = showView;

  const pageDefaults = {
    home: {image:"",imageAlt:"",title:"The Red Sparrow — Unity Game Development",description:"The Red Sparrow develops Unity gameplay systems, integrates supplied 3D assets and prepares mobile-focused game builds.",heading:"Ideas into\n*interactive worlds.*",intro:"We develop gameplay experiences with Unity, integrate supplied 3D assets and prepare builds for agreed platforms."},
    about: {image:"",imageAlt:"",title:"About — The Red Sparrow",description:"Learn about The Red Sparrow, an independent game-development brand focused on Unity and interactive experiences.",heading:"Built around\nthe joy of play.",intro:"The Red Sparrow is an independent creative brand focused on developing games and interactive experiences with Unity."},
    services: {image:"",imageAlt:"",title:"Services — The Red Sparrow",description:"Explore The Red Sparrow's services: Unity gameplay development, 3D asset integration, game UI implementation and mobile build preparation.",heading:"Our *services.*",intro:"Practical creative and technical support for bringing interactive ideas to life."},
    contact: {image:"",imageAlt:"",title:"Contact — The Red Sparrow",description:"Contact The Red Sparrow about Unity game development, 3D asset integration, game UI implementation and mobile game projects.",heading:"Let’s start\n*a conversation.*",intro:"Have a project, a question or an idea you’d like to explore? Send us an email."}
  };
  const editor = document.getElementById("page-editor");
  if (editor) {
    const fields = {
      page: document.getElementById("edit-page"),
      title: document.getElementById("edit-title"),
      description: document.getElementById("edit-description"),
      heading: document.getElementById("edit-heading"),
      intro: document.getElementById("edit-intro"),
      imageAlt: document.getElementById("edit-image-alt")
    };
    const status = document.getElementById("editor-status");
    const preview = {
      image: document.getElementById("preview-image"),
      title: document.getElementById("preview-title"),
      description: document.getElementById("preview-description"),
      heading: document.getElementById("preview-heading"),
      intro: document.getElementById("preview-intro")
    };
    const updatePreview = () => {
      preview.title.textContent = fields.title.value;
      preview.description.textContent = fields.description.value;
      preview.heading.innerHTML = fields.heading.value.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replace(/\*(.+?)\*/g,"<em>$1</em>").replace(/\r?\n/g,"<br>");
      preview.intro.textContent = fields.intro.value;
      const imagePicker = document.getElementById("edit-image");
      const imageUrl = imagePicker?.selectedOptions[0]?.dataset.previewUrl || imagePicker?.value || "";
      if (preview.image) { preview.image.src = imageUrl; preview.image.hidden = !imageUrl; preview.image.alt = fields.imageAlt?.value.trim() || ""; }
    };
    const loadPage = () => {
      const data = pageDefaults[fields.page.value];
      const formattedHeadings = {home:["Ideas into interactive worlds.","Ideas into\n*interactive worlds.*"],about:["Built around the joy of play.","Built around\nthe joy of play."],services:["Our services.","Our *services.*"],contact:["Let’s start a conversation.","Let’s start\n*a conversation.*"]};
      const legacyHeading = formattedHeadings[fields.page.value];
      const heading = data.heading;
      if (legacyHeading && heading === legacyHeading[0]) data.heading = legacyHeading[1];
      ["title","description","heading","intro","imageAlt"].forEach(key => { if (fields[key]) fields[key].value = data[key] || ""; });
      const imageField = document.getElementById("edit-image"); if (imageField) imageField.value = data.image || "";
      status.textContent = "Showing published page copy. Any saved remote draft will load after page selection.";
      updatePreview();
    };
    fields.page.addEventListener("change", loadPage);
    ["title","description","heading","intro","imageAlt"].forEach(key => fields[key]?.addEventListener("input", updatePreview));
    document.getElementById("edit-image")?.addEventListener("change", updatePreview);
    loadPage();
  }

  const seoDefaults = {
    home: {title:"The Red Sparrow — Unity Game Development",description:"The Red Sparrow develops Unity gameplay systems, integrates supplied 3D assets and prepares mobile-focused game builds.",canonical:"https://theredsparrow.online/",ogTitle:"The Red Sparrow — Unity Game Development",ogDescription:"Unity gameplay development, 3D asset integration, game UI implementation and mobile build preparation.",ogImage:"https://theredsparrow.online/og-image.png",ogImageAlt:"The Red Sparrow — independent Unity game development"},
    about: {title:"About — The Red Sparrow",description:"Learn about The Red Sparrow, an independent game-development brand focused on Unity and interactive experiences.",canonical:"https://theredsparrow.online/about.html",ogTitle:"About — The Red Sparrow",ogDescription:"An independent game-development brand focused on Unity.",ogImage:"https://theredsparrow.online/og-image.png",ogImageAlt:"The Red Sparrow — independent Unity game development"},
    services: {title:"Services — The Red Sparrow",description:"Explore The Red Sparrow's services: Unity gameplay development, 3D asset integration, game UI implementation and mobile build preparation.",canonical:"https://theredsparrow.online/services.html",ogTitle:"Services — The Red Sparrow",ogDescription:"Unity gameplay development, 3D asset integration, game UI implementation and mobile build preparation.",ogImage:"https://theredsparrow.online/og-image.png",ogImageAlt:"The Red Sparrow — independent Unity game development"},
    contact: {title:"Contact — The Red Sparrow",description:"Contact The Red Sparrow about Unity game development, 3D asset integration, game UI implementation and mobile game projects.",canonical:"https://theredsparrow.online/contact.html",ogTitle:"Contact — The Red Sparrow",ogDescription:"Tell us about the game or interactive experience you have in mind.",ogImage:"https://theredsparrow.online/og-image.png",ogImageAlt:"The Red Sparrow — independent Unity game development"},
    privacy: {title:"Privacy Policy — The Red Sparrow",description:"Privacy information for visitors to The Red Sparrow, including contact enquiries, website hosting and technical data.",canonical:"https://theredsparrow.online/privacy.html",ogTitle:"Privacy Policy — The Red Sparrow",ogDescription:"How The Red Sparrow handles information shared through its website.",ogImage:"https://theredsparrow.online/og-image.png",ogImageAlt:"The Red Sparrow — independent Unity game development"},
    terms: {title:"Terms of Use — The Red Sparrow",description:"Terms governing access to and use of The Red Sparrow website.",canonical:"https://theredsparrow.online/terms.html",ogTitle:"Terms of Use — The Red Sparrow",ogDescription:"Terms governing use of The Red Sparrow website.",ogImage:"https://theredsparrow.online/og-image.png",ogImageAlt:"The Red Sparrow — independent Unity game development"}
  };
  const seoForm = document.getElementById("seo-editor");
  if (seoForm) {
    const seoFields = {
      page: document.getElementById("seo-page"),
      title: document.getElementById("seo-title"),
      description: document.getElementById("seo-description"),
      canonical: document.getElementById("seo-canonical"),
      ogTitle: document.getElementById("seo-og-title"),
      ogDescription: document.getElementById("seo-og-description"),
      ogImage: document.getElementById("seo-og-image"),
      ogImageAlt: document.getElementById("seo-og-image-alt")
    };
    const seoStatus = document.getElementById("seo-status");
    const validation = document.getElementById("seo-validation");
    const counters = {
      title: document.getElementById("seo-title-count"),
      description: document.getElementById("seo-description-count"),
      ogTitle: document.getElementById("seo-og-title-count"),
      ogDescription: document.getElementById("seo-og-description-count")
    };
    const updateSeoPreview = () => {
      document.getElementById("snippet-url").textContent = seoFields.canonical.value;
      document.getElementById("snippet-title").textContent = seoFields.title.value;
      document.getElementById("snippet-description").textContent = seoFields.description.value;
      document.getElementById("social-title-preview").textContent = seoFields.ogTitle.value;
      document.getElementById("social-description-preview").textContent = seoFields.ogDescription.value;
      const image = document.getElementById("social-image-preview");
      try {
        const parsed = new URL(seoFields.ogImage.value);
        if (parsed.protocol === "https:" && parsed.hostname === "theredsparrow.online") image.src = parsed.href;
        image.alt = seoFields.ogImageAlt.value.trim();
      } catch {}
      counters.title.textContent = seoFields.title.value.length + " / 70";
      counters.description.textContent = seoFields.description.value.length + " / 180";
      counters.ogTitle.textContent = seoFields.ogTitle.value.length + " / 70";
      counters.ogDescription.textContent = seoFields.ogDescription.value.length + " / 200";
    };
    const loadSeoPage = () => {
      const data = seoDefaults[seoFields.page.value];
      ["title","description","canonical","ogTitle","ogDescription","ogImage","ogImageAlt"].forEach(key => { if(seoFields[key]) seoFields[key].value = data[key] || ""; });
      seoStatus.textContent = "Showing current website metadata. Any saved remote draft will load after page selection.";
      validation.textContent = "Canonical and image URLs must use HTTPS and the theredsparrow.online domain.";
      updateSeoPreview();
    };
    seoFields.page.addEventListener("change", loadSeoPage);
    ["title","description","canonical","ogTitle","ogDescription","ogImage","ogImageAlt"].forEach(key => seoFields[key]?.addEventListener("input", updateSeoPreview));
    loadSeoPage();
  }


  const sidebar = document.getElementById("sidebar");
  const menuToggle = document.getElementById("menu-toggle");
  const mobileNavigation = window.matchMedia("(max-width:650px)");
  const backdrop = document.createElement("button");
  backdrop.type = "button";
  backdrop.className = "sidebar-backdrop";
  backdrop.setAttribute("aria-label", "Close navigation");
  backdrop.hidden = true;
  sidebar.parentNode.insertBefore(backdrop, sidebar.nextSibling);
  const setSidebarOpen = open => {
    const visible = mobileNavigation.matches && open;
    sidebar.classList.toggle("open", visible);
    backdrop.hidden = !visible;
    menuToggle.setAttribute("aria-expanded", String(visible));
    menuToggle.setAttribute("aria-label", visible ? "Close navigation" : "Open navigation");
    if (mobileNavigation.matches && !visible) {
      sidebar.setAttribute("inert", "");
      sidebar.setAttribute("aria-hidden", "true");
    } else {
      sidebar.removeAttribute("inert");
      sidebar.removeAttribute("aria-hidden");
    }
  };
  setSidebarOpen(false);
  window.closeAdminSidebar = () => setSidebarOpen(false);
  backdrop.addEventListener("click", () => { setSidebarOpen(false); menuToggle.focus(); });
  links().forEach(link => link.addEventListener("click", () => {
    showView(link.dataset.view);
    setSidebarOpen(false);
  }));
  document.querySelectorAll("[data-go]").forEach(button => button.addEventListener("click", () => showView(button.dataset.go)));
  menuToggle.addEventListener("click", () => { const opening=!sidebar.classList.contains("open");setSidebarOpen(opening);if(opening)sidebar.querySelector("[data-view]")?.focus(); });
  mobileNavigation.addEventListener("change", () => setSidebarOpen(false));
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && sidebar.classList.contains("open")) {
      setSidebarOpen(false);
      menuToggle.focus();
    }
  });
  // Keyboard-accessible quick navigation across every registered admin module.
  const commandDialog = document.createElement("dialog");
  commandDialog.className = "command-palette";
  commandDialog.setAttribute("aria-labelledby", "command-palette-title");
  const commandTitle = document.createElement("h2");
  commandTitle.id = "command-palette-title";
  commandTitle.textContent = "Go to a workspace";
  const commandHint = document.createElement("p");
  commandHint.className = "command-palette-hint";
  commandHint.textContent = "Search admin sections · ↑ ↓ to move · Enter to open · Esc to close";
  const commandInput = document.createElement("input");
  commandInput.type = "search";
  commandInput.placeholder = "Search pages, content, SEO, inquiries…";
  commandInput.setAttribute("aria-label", "Search admin sections");
  commandInput.setAttribute("role", "combobox");
  commandInput.setAttribute("aria-autocomplete", "list");
  commandInput.setAttribute("aria-expanded", "true");
  const commandResults = document.createElement("div");
  commandResults.className = "command-palette-results";
  commandResults.id = "command-palette-results";
  commandResults.setAttribute("role", "listbox");
  commandInput.setAttribute("aria-controls", commandResults.id);
  commandDialog.append(commandTitle, commandHint, commandInput, commandResults);
  document.getElementById("admin-app")?.append(commandDialog);
  let commandItems = [];
  let commandIndex = 0;
  let commandReturnFocus = null;
  const commandAliases = {
    overview: ["home", "dashboard", "summary", "metrics"],
    pages: ["website", "web pages", "page editor"],
    media: ["images", "uploads", "assets", "files"],
    "content-manager": ["showcases", "projects", "social previews", "brand assets", "library", "manage content"],
    "add-content": ["new project", "new showcase", "upload content", "create content"],
    audit: ["activity", "history", "logs"],
    seo: ["search engine", "metadata", "open graph", "social sharing"],
    settings: ["preferences", "configuration"],
    analytics: ["traffic", "visitors", "web analytics"],
    calendar: ["schedule", "scheduled publishing", "publication"],
    inquiries: ["messages", "contact form", "customers", "leads", "inbox"],
    notifications: ["alerts", "updates"],
    health: ["status", "uptime", "diagnostics"],
    preview: ["website preview", "page preview"],
    files: ["file manager", "media usage"],
    security: ["sessions", "access", "login"],
    "site-settings": ["contact details", "announcement", "tagline", "website configuration"]
  };
  function renderCommandResults() {
    const query = commandInput.value.trim().toLowerCase();
    commandItems = links().map(link => ({
      view: link.dataset.view,
      label: (link.dataset.label || link.textContent || "").replace(/^[^A-Za-z0-9]+/, "").trim()
    })).filter(item => {
      if (!item.view || !item.label) return false;
      const searchable = [item.label, descriptions[item.view] || "", ...(commandAliases[item.view] || [])].join(" ").toLowerCase();
      return searchable.includes(query);
    });
    commandIndex = Math.min(commandIndex, Math.max(0, commandItems.length - 1));
    commandResults.replaceChildren();
    if (!commandItems.length) {
      const empty = document.createElement("p");
      empty.className = "command-palette-empty";
      empty.textContent = "No matching workspace sections.";
      commandResults.append(empty);
      commandInput.removeAttribute("aria-activedescendant");
      return;
    }
    commandItems.forEach((item, index) => {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "command-palette-option";
      option.id = "command-option-" + index;
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", String(index === commandIndex));
      const label = document.createElement("span");
      label.textContent = item.label;
      const hint = document.createElement("small");
      hint.textContent = "Open section";
      option.append(label, hint);
      option.addEventListener("mouseenter", () => {
        commandIndex = index;
        updateCommandSelection();
      });
      option.addEventListener("click", () => {
        commandDialog.close();
        showView(item.view);
      });
      commandResults.append(option);
    });
    commandInput.setAttribute("aria-activedescendant", "command-option-" + commandIndex);
  }
  function updateCommandSelection() {
    [...commandResults.querySelectorAll('[role="option"]')].forEach((option, index) => {
      option.setAttribute("aria-selected", String(index === commandIndex));
    });
    if (commandItems.length) commandInput.setAttribute("aria-activedescendant", "command-option-" + commandIndex);
  }
  function openCommandPalette() {
    if (!commandDialog.isConnected || document.getElementById("admin-app")?.hidden) return;
    commandReturnFocus = document.activeElement;
    commandInput.value = "";
    commandIndex = 0;
    renderCommandResults();
    if (!commandDialog.open) commandDialog.showModal();
    commandInput.focus();
  }
  commandDialog.addEventListener("close", () => {
    if (commandReturnFocus && typeof commandReturnFocus.focus === "function") commandReturnFocus.focus();
  });
  commandInput.addEventListener("input", () => {
    commandIndex = 0;
    renderCommandResults();
  });
  commandInput.addEventListener("keydown", event => {
    if (event.key === "ArrowDown" && commandItems.length) {
      event.preventDefault();
      commandIndex = (commandIndex + 1) % commandItems.length;
      updateCommandSelection();
    } else if (event.key === "ArrowUp" && commandItems.length) {
      event.preventDefault();
      commandIndex = (commandIndex - 1 + commandItems.length) % commandItems.length;
      updateCommandSelection();
    } else if (event.key === "Enter" && commandItems.length) {
      event.preventDefault();
      commandDialog.close();
      showView(commandItems[commandIndex].view);
    }
  });
  commandDialog.addEventListener("click", event => {
    if (event.target === commandDialog) commandDialog.close();
  });
  const commandTrigger = document.createElement("button");
  commandTrigger.type = "button";
  commandTrigger.className = "button button-quiet command-palette-trigger";
  commandTrigger.textContent = "Search workspace  Ctrl K";
  commandTrigger.addEventListener("click", openCommandPalette);
  document.querySelector(".topbar-right")?.prepend(commandTrigger);
  document.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      openCommandPalette();
    }
  });

})();