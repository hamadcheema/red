(() => {
  const links = [...document.querySelectorAll("[data-view]")];
  const views = [...document.querySelectorAll(".view")];
  const title = document.getElementById("view-title");
  const description = document.getElementById("view-description");
  const breadcrumb = document.getElementById("breadcrumb-current");
  const descriptions = {
    overview: "A clear view of your website and its content.",
    pages: "Review the pages that make up your public website.",
    media: "Manage images and other website assets.",
    seo: "Review search and social-sharing metadata.",
    settings: "Manage the admin workspace and publishing connection."
  };

  function showView(name) {
    const selected = descriptions[name] ? name : "overview";
    views.forEach(view => view.classList.toggle("active", view.id === "view-" + selected));
    links.forEach(link => link.classList.toggle("active", link.dataset.view === selected));
    const label = links.find(link => link.dataset.view === selected)?.textContent.trim() || "Overview";
    title.textContent = label;
    breadcrumb.textContent = label;
    description.textContent = descriptions[selected];
    document.getElementById("sidebar").classList.remove("open");
  }

  const pageDefaults = {
    home: {title:"The Red Sparrow — Unity Game Development",description:"The Red Sparrow develops Unity gameplay systems, integrates supplied 3D assets and prepares mobile-focused game builds.",heading:"Ideas into interactive worlds.",intro:"We develop gameplay experiences with Unity, integrate supplied 3D assets and prepare builds for agreed platforms."},
    about: {title:"About — The Red Sparrow",description:"Learn about The Red Sparrow, an independent game-development brand focused on Unity and interactive experiences.",heading:"Built around the joy of play.",intro:"The Red Sparrow is an independent creative brand focused on developing games and interactive experiences with Unity."},
    services: {title:"Services — The Red Sparrow",description:"Explore The Red Sparrow's services: Unity gameplay development, 3D asset integration, game UI implementation and mobile build preparation.",heading:"Our services.",intro:"Practical creative and technical support for bringing interactive ideas to life."},
    contact: {title:"Contact — The Red Sparrow",description:"Contact The Red Sparrow about Unity game development, 3D asset integration, game UI implementation and mobile game projects.",heading:"Let’s start a conversation.",intro:"Have a project, a question or an idea you’d like to explore? Send us an email."}
  };
  const editor = document.getElementById("page-editor");
  if (editor) {
    const fields = {
      page: document.getElementById("edit-page"),
      title: document.getElementById("edit-title"),
      description: document.getElementById("edit-description"),
      heading: document.getElementById("edit-heading"),
      intro: document.getElementById("edit-intro")
    };
    const status = document.getElementById("editor-status");
    const storageKey = "trs-admin-local-page-drafts-v1";
    const preview = {
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
      preview.heading.textContent = fields.heading.value;
      preview.intro.textContent = fields.intro.value;
    };
    const loadPage = () => {
      const saved = readDrafts()[fields.page.value] || {};
      const data = {...pageDefaults[fields.page.value], ...saved};
      ["title","description","heading","intro"].forEach(key => fields[key].value = data[key]);
      status.textContent = saved.title ? "Saved local draft loaded." : "Showing original page copy. No draft saved.";
      updatePreview();
    };
    fields.page.addEventListener("change", loadPage);
    ["title","description","heading","intro"].forEach(key => fields[key].addEventListener("input", updatePreview));
    editor.addEventListener("submit", event => {
      event.preventDefault();
      const drafts = readDrafts();
      drafts[fields.page.value] = {
        title: fields.title.value.trim(),
        description: fields.description.value.trim(),
        heading: fields.heading.value.trim(),
        intro: fields.intro.value.trim()
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

  links.forEach(link => link.addEventListener("click", () => showView(link.dataset.view)));
  document.querySelectorAll("[data-go]").forEach(button => button.addEventListener("click", () => showView(button.dataset.go)));
  const sidebar = document.getElementById("sidebar");
  const menuToggle = document.getElementById("menu-toggle");

  menuToggle.addEventListener("click", () => {
    const isOpen = sidebar.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && sidebar.classList.contains("open")) {
      sidebar.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.focus();
    }
  });
})();