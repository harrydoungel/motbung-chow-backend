/* ==============================
   SEARCH FUNCTION
============================== */

function initSearch() {
  console.log("✅ Search initialized");

  const searchInput = document.getElementById("searchInput");
  if (!searchInput) {
    console.error("❌ Search input not found!");
    return;
  }

  // Search typing listener
  searchInput.addEventListener("input", function () {
    const searchTerm = this.value.toLowerCase().trim();

    const foodItems = document.querySelectorAll(".item");
    let foundCount = 0;

    foodItems.forEach((item) => {
      const nameEl = item.querySelector("strong");
      const itemName = nameEl ? nameEl.innerText.toLowerCase() : "";

      if (searchTerm === "" || itemName.includes(searchTerm)) {
        item.style.display = "flex";
        foundCount++;
      } else {
        item.style.display = "none";
      }
    });

    // No results message
    const existingMsg = document.getElementById("noResultsMessage");

    if (foundCount === 0 && searchTerm !== "") {
      if (!existingMsg) {
        const msg = document.createElement("div");
        msg.id = "noResultsMessage";
        msg.innerHTML = `
          <p style="text-align:center;padding:20px;color:#666;">
            No food items found for "<strong>${searchTerm}</strong>"
          </p>
        `;
        document.querySelector(".menu-items")?.appendChild(msg);
      }
    } else if (existingMsg) {
      existingMsg.remove();
    }
  });

  // Reset search when clicking categories
  document.querySelectorAll(".menu-categories button").forEach((btn) => {
    btn.addEventListener("click", () => {
      searchInput.value = "";

      document.querySelectorAll(".item").forEach((item) => {
        item.style.display = "flex";
      });

      const msg = document.getElementById("noResultsMessage");
      if (msg) msg.remove();
    });
  });
}

/* ✅ Run Search on Page Load */
document.addEventListener("DOMContentLoaded", () => {
  initSearch();
});
