document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("menuContainer");
  if (!container) return;

  fetch("menu.html")
    .then((res) => {
      if (!res.ok) throw new Error("Failed to load menu.html");
      return res.text();
    })
    .then((html) => {
      // ✅ Insert menu into page
      container.innerHTML = html;

      // ✅ Initialize search AFTER menu is injected
      if (typeof initSearch === "function") {
        initSearch();
      }
    })
    .catch((err) => {
      console.error("❌ Menu load failed:", err);
      container.innerHTML = "<p>Menu failed to load.</p>";
    });
});
