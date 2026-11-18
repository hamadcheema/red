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
    showcase: "Manage game projects, social previews and brand assets shown on the homepage.",
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
    security: "Review active admin sessions and revoke other sessions."
  };

  function showView(name) {
    const selected = descriptions[name] ? name : "overview";
    views().forEach(view => view.classList.toggle("active", view.id === "view-" + selected));
    links().forEach(link => link.classList.toggle("active", link.dataset.view === selected));
    const label = links().find(link => link.dataset.view === selected)?.textContent.trim() || "Overview";
    title.textContent = label;
    breadcrumb.textContent = label;
    description.textContent = descriptions[selected];
    document.getElementById("sidebar").classList.remove("open");
    if (["analytics","calendar","inquiries","notifications","health","preview","files","security"].includes(selected)) window.dispatchEvent(new CustomEvent("trs:control-view",{detail:selected}));
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
    const storageKey = "trs-admin-local-page-drafts-v1";
    const preview = {
      image: document.getElementById("preview-image"),
      title: document.getElementById("preview-title"),
      description: document.getElementById("preview-description"),
      heading: document.getElementById("preview-heading"),
      intro: document.getElementById("preview-intro")
    };
    const readDrafts = () => {
      try { return JSON.parse(localStorage.getItem(storageKey) || "{}"); }
      catch { return {}; }
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
      const saved = readDrafts()[fields.page.value] || {};
      const data = {...pageDefaults[fields.page.value], ...saved};
      const formattedHeadings = {home:["Ideas into interactive worlds.","Ideas into\n*interactive worlds.*"],about:["Built around the joy of play.","Built around\nthe joy of play."],services:["Our services.","Our *services.*"],contact:["Let’s start a conversation.","Let’s start\n*a conversation.*"]};
      const legacyHeading = formattedHeadings[fields.page.value];
      if (legacyHeading && data.heading === legacyHeading[0]) data.heading = legacyHeading[1];
      ["title","description","heading","intro","imageAlt"].forEach(key => { if (fields[key]) fields[key].value = data[key] || ""; });
      const imageField = document.getElementById("edit-image"); if (imageField) imageField.value = data.image || "";
      status.textContent = saved.title ? "Saved local draft loaded." : "Showing original page copy. No draft saved.";
      updatePreview();
    };
    fields.page.addEventListener("change", loadPage);
    ["title","description","heading","intro","imageAlt"].forEach(key => fields[key]?.addEventListener("input", updatePreview));
    document.getElementById("edit-image")?.addEventListener("change", updatePreview);
    editor.addEventListener("submit", event => {
      event.preventDefault();
      const drafts = readDrafts();
      drafts[fields.page.value] = {
        title: fields.title.value.trim(),
        description: fields.description.value.trim(),
        heading: fields.heading.value.trim(),
        intro: fields.intro.value.trim(),
        image: document.getElementById("edit-image")?.value || "",
        imageAlt: fields.imageAlt?.value.trim() || ""
      };
      try {
        localStorage.setItem(storageKey, JSON.stringify(drafts));
        status.textContent = "Local draft saved in this browser. Nothing was published.";
      } catch {
        status.textContent = "This browser could not save the draft. Check local storage settings.";
      }
    });
    document.getElementById("reset-draft").addEventListener("click", () => {
      const drafts = readDrafts();
      delete drafts[fields.page.value];
      try { localStorage.setItem(storageKey, JSON.stringify(drafts)); }
      catch {}
      loadPage();
      status.textContent = "Draft cleared. Original page copy restored.";
    });
    loadPage();
  }

  const seoDefaults = {
    home: {title:"The Red Sparrow — Unity Game Development",description:"The Red Sparrow develops Unity gameplay systems, integrates supplied 3D assets and prepares mobile-focused game builds.",canonical:"https://theredsparrow.online/",ogTitle:"The Red Sparrow — Unity Game Development",ogDescription:"Unity gameplay development, 3D asset integration, game UI implementation and mobile build preparation.",ogImage:"https://theredsparrow.online/og-image.png",ogImageAlt:"The Red Sparrow — independent Unity game development"},
    about: {title:"About — The Red Sparrow",description:"Learn about The Red Sparrow, an independent game-development brand focused on Unity and interactive experiences.",canonical:"https://theredsparrow.online/about.html",ogTitle:"About — The Red Sparrow",ogDescription:"An independent game-development brand focused on Unity.",ogImage:"https://theredsparrow.online/og-image.png",ogImageAlt:"The Red Sparrow — independent Unity game development"},
    services: {title:"Services — The Red Sparrow",description:"Explore The Red Sparrow's services: Unity gameplay development, 3D asset integration, game UI implementation and mobile build preparation.",canonical:"https://theredsparrow.online/services.html",ogTitle:"Services — The Red Sparrow",ogDescription:"Unity gameplay development, 3D asset integration, game UI implementation and mobile build preparation.",ogImage:"https://theredsparrow.online/og-image.png",ogImageAlt:"The Red Sparrow — independent Unity game development"},
    contact: {title:"Contact — The Red Sparrow",description:"Contact The Red Sparrow about Unity game development, 3D asset integration, game UI implementation and mobile game projects.",canonical:"https://theredsparrow.online/contact.html",ogTitle:"Contact — The Red Sparrow",ogDescription:"Tell us about the game or interactive experience you have in mind.",ogImage:"https://theredsparrow.online/og-image.png",ogImageAlt:"The Red Sparrow — independent Unity game development"},
    privacy: {title:"Privacy Policy — The Red Sparrow",description:"Privacy information for visitors to The Red Sparrow, including contact enquiries, website hosting and advertising technologies.",canonical:"https://theredsparrow.online/privacy.html",ogTitle:"Privacy Policy — The Red Sparrow",ogDescription:"How The Red Sparrow handles information shared through its website and advertising services.",ogImage:"https://theredsparrow.online/og-image.png",ogImageAlt:"The Red Sparrow — independent Unity game development"},
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
    const seoKey = "trs-admin-local-seo-drafts-v1";
    const seoStatus = document.getElementById("seo-status");
    const validation = document.getElementById("seo-validation");
    const readSeoDrafts = () => {
      try { return JSON.parse(localStorage.getItem(seoKey) || "{}"); }
      catch { return {}; }
    };
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
      const saved = readSeoDrafts()[seoFields.page.value] || {};
      const data = {...seoDefaults[seoFields.page.value], ...saved};
      ["title","description","canonical","ogTitle","ogDescription","ogImage","ogImageAlt"].forEach(key => { if(seoFields[key]) seoFields[key].value = data[key] || ""; });
      seoStatus.textContent = saved.title ? "Saved local SEO draft loaded." : "Showing current website metadata.";
      validation.textContent = "Canonical and image URLs must use HTTPS and the theredsparrow.online domain.";
      updateSeoPreview();
    };
    const validSiteUrl = value => {
      try {
        const parsed = new URL(value);
        return parsed.protocol === "https:" && parsed.hostname === "theredsparrow.online" && !parsed.username && !parsed.password;
      } catch { return false; }
    };
    seoFields.page.addEventListener("change", loadSeoPage);
    ["title","description","canonical","ogTitle","ogDescription","ogImage","ogImageAlt"].forEach(key => seoFields[key]?.addEventListener("input", updateSeoPreview));
    seoForm.addEventListener("submit", event => {
      event.preventDefault();
      if (!validSiteUrl(seoFields.canonical.value) || !validSiteUrl(seoFields.ogImage.value)) {
        validation.textContent = "Please use valid HTTPS URLs on theredsparrow.online for both fields.";
        return;
      }
      const drafts = readSeoDrafts();
      drafts[seoFields.page.value] = {};
      ["title","description","canonical","ogTitle","ogDescription","ogImage","ogImageAlt"].forEach(key => drafts[seoFields.page.value][key] = seoFields[key].value.trim());
      try {
        localStorage.setItem(seoKey, JSON.stringify(drafts));
        seoStatus.textContent = "SEO draft saved in this browser. Nothing was published.";
        validation.textContent = "URL checks passed. These metadata changes are still local only.";
      } catch {
        seoStatus.textContent = "This browser could not save the draft. Check local storage settings.";
      }
    });
    document.getElementById("seo-reset").addEventListener("click", () => {
      const drafts = readSeoDrafts();
      delete drafts[seoFields.page.value];
      try { localStorage.setItem(seoKey, JSON.stringify(drafts)); } catch {}
      loadSeoPage();
      seoStatus.textContent = "SEO draft cleared. Current website metadata restored.";
    });
    loadSeoPage();
  }


  const sidebar = document.getElementById("sidebar");
  const menuToggle = document.getElementById("menu-toggle");
  const mobileNavigation = window.matchMedia("(max-width:650px)");
  const setSidebarOpen = open => {
    const visible = mobileNavigation.matches && open;
    sidebar.classList.toggle("open", visible);
    menuToggle.setAttribute("aria-expanded", String(visible));
    if (mobileNavigation.matches && !visible) {
      sidebar.setAttribute("inert", "");
      sidebar.setAttribute("aria-hidden", "true");
    } else {
      sidebar.removeAttribute("inert");
      sidebar.removeAttribute("aria-hidden");
    }
  };
  setSidebarOpen(false);
  links().forEach(link => link.addEventListener("click", () => {
    showView(link.dataset.view);
    setSidebarOpen(false);
  }));
  document.querySelectorAll("[data-go]").forEach(button => button.addEventListener("click", () => showView(button.dataset.go)));
  menuToggle.addEventListener("click", () => setSidebarOpen(!sidebar.classList.contains("open")));
  mobileNavigation.addEventListener("change", () => setSidebarOpen(false));
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && sidebar.classList.contains("open")) {
      setSidebarOpen(false);
      menuToggle.focus();
    }
  });
})();