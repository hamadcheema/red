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