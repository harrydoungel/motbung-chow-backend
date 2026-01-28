/* =========================
   LOGIN FORM FUNCTION
========================= */
function showLoginForm() {
  const form = document.getElementById("phoneForm");
  if (form) form.style.display = "block";
}

const API_BASE_URL = "http://localhost:5001/api";

/* =========================
   AUTH STATE
========================= */
let authStep = "phone";
let storedPhone = "";
let confirmationResult = null;

let auth;
let recaptchaVerifier;

/* =========================
   INITIALIZE FIREBASE AUTH + RECAPTCHA
========================= */
document.addEventListener("DOMContentLoaded", () => {
  auth = firebase.auth();

  recaptchaVerifier = new firebase.auth.RecaptchaVerifier(
    "recaptcha-container",
    {
      size: "invisible",
      callback: () => console.log("✅ reCAPTCHA solved"),
    }
  );

  recaptchaVerifier.render();

  // ✅ Show correct screen on reload
  if (localStorage.getItem("token")) {
    showMainApp();
  } else {
    showLoginScreen();
  }
});

/* =========================
   LOGIN FLOW (OTP)
========================= */
async function handleAuth() {
  const phoneInput = document.getElementById("phoneInput");
  const otpInput = document.getElementById("otpInput");
  const otpSection = document.getElementById("otpSection");
  const button = document.getElementById("authBtn");
  const countryCode = document.querySelector(".country-code");

  try {
    /* ===== SEND OTP ===== */
    if (authStep === "phone") {
      const phone = phoneInput.value.trim();

      if (!/^\d{10}$/.test(phone)) {
        alert("Enter valid 10-digit phone number");
        return;
      }

      const fullPhone = "+91" + phone;

      button.disabled = true;
      button.innerText = "Sending OTP...";

      confirmationResult = await auth.signInWithPhoneNumber(
        fullPhone,
        recaptchaVerifier
      );

      storedPhone = phone;
      authStep = "otp";

      // ✅ Update UI
      phoneInput.style.display = "none";
      if (countryCode) countryCode.style.display = "none";
      otpSection.style.display = "block";

      button.innerText = "Verify OTP";
      button.disabled = false;
    }

    /* ===== VERIFY OTP ===== */
    else {
      const otp = otpInput.value.trim();

      if (!/^\d{6}$/.test(otp)) {
        alert("Enter valid 6-digit OTP");
        return;
      }

      button.disabled = true;
      button.innerText = "Verifying...";

      // ✅ Confirm OTP
      const result = await confirmationResult.confirm(otp);
      const idToken = await result.user.getIdToken();

      // ✅ Backend login
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      // ✅ Save session
      localStorage.setItem("token", data.token);
      localStorage.setItem("userPhone", storedPhone);

      alert("✅ Login Successful!");

      showMainApp();
    }
  } catch (err) {
    console.error("Auth Error:", err);

    alert(err.message || "Authentication failed");

    button.disabled = false;
    button.innerText = authStep === "phone" ? "Send OTP" : "Verify OTP";
  }
}

/* =========================
   SCREEN MANAGEMENT ✅ FINAL FIX
========================= */
function showLoginScreen() {
  const loginPage = document.getElementById("loginPage");
  const mainApp = document.getElementById("mainApp");

  // ✅ Show login, hide app
  if (loginPage) loginPage.classList.remove("hidden");
  if (mainApp) mainApp.classList.remove("active");

  // ✅ Hide bottom nav
  const nav = document.querySelector(".bottom-nav");
  if (nav) nav.style.display = "none";
}

function showMainApp() {
  const loginPage = document.getElementById("loginPage");
  const mainApp = document.getElementById("mainApp");

  // ✅ Hide login, show app
  if (loginPage) loginPage.classList.add("hidden");
  if (mainApp) mainApp.classList.add("active");

  // ✅ Show bottom nav
  const nav = document.querySelector(".bottom-nav");
  if (nav) nav.style.display = "flex";

  // ✅ Load home page by default
  showPage("home");
}

/* =========================
   PAGE NAVIGATION
========================= */
function showPage(page) {
  // ✅ Hide all pages
  document.querySelectorAll(".page").forEach((p) =>
    p.classList.remove("active")
  );

  // ✅ Reset nav buttons
  document.querySelectorAll(".bottom-nav button").forEach((b) =>
    b.classList.remove("active")
  );

  // ✅ Header + Checkout control
  const homeHeader = document.getElementById("homeHeader");
  const floatingBtn = document.getElementById("floatingCheckout");

  if (page === "home") {
    if (homeHeader) homeHeader.style.display = "block"; 
  } else {
    if (homeHeader) homeHeader.style.display = "none";    
  }

  // ✅ HOME PAGE
  if (page === "home") {
    document.getElementById("homePage")?.classList.add("active");
    document.getElementById("homeBtn")?.classList.add("active");
  }

  // ✅ ORDERS PAGE
  if (page === "orders") {
    document.getElementById("ordersPage")?.classList.add("active");
    document.getElementById("ordersBtn")?.classList.add("active");

    populateAccountDetails();
    loadMyOrders();
  }

  // ✅ HELP PAGE
  if (page === "help") {
    document.getElementById("helpPage")?.classList.add("active");
    document.getElementById("helpBtn")?.classList.add("active");
  }
}

/* =========================
   CATEGORY FILTER
========================= */
function filterCategory(cat, btn) {
  document
    .querySelectorAll(".menu-categories button")
    .forEach((b) => b.classList.remove("active"));

  btn.classList.add("active");

  document.querySelectorAll(".item").forEach((item) => {
    item.style.display =
      cat === "all" || item.dataset.category === cat ? "flex" : "none";
  });
}

/* =========================
   CART + CHECKOUT
========================= */
function updateFloatingCheckout(total) {
  const btn = document.getElementById("floatingCheckout");
  const floatingTotal = document.getElementById("floating-total");

  if (!btn || !floatingTotal) return;

  floatingTotal.innerText = total;
  btn.style.display = total > 0 ? "block" : "none";
}

function updateTotal() {
  let total = 0;

  document.querySelectorAll("[id^='qty-']").forEach((el) => {
    const priceText =
      el.closest(".item")?.querySelector(".price")?.innerText || "₹0";

    const price = Number(priceText.replace("₹", ""));
    total += (Number(el.innerText) || 0) * price;
  });

  updateFloatingCheckout(total);
}

function checkout() {
  const totalElement = document.getElementById("floating-total");
  if (!totalElement) return alert("Cart error");

  const total = Number(totalElement.innerText);
  if (!total || total <= 0) return alert("Cart empty");

  localStorage.setItem("cartTotal", total);
  window.location.href = "checkout.html";
}

function changeQty(name, price, change) {
  const el = document.getElementById(`qty-${name}`);
  if (!el) return;

  let qty = Number(el.innerText) || 0;
  qty = Math.max(0, qty + change);
  el.innerText = qty;

  updateTotal();
}

/* =========================
   ACCOUNT DETAILS
========================= */
function populateAccountDetails() {
  const phone = localStorage.getItem("userPhone");
  const accPhone = document.getElementById("accPhone");

  if (phone && accPhone) {
    accPhone.value = "+91 " + phone;
  }
}

/* =========================
   LOAD MY ORDERS
========================= */
async function loadMyOrders() {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const res = await fetch(`${API_BASE_URL}/orders/my-orders`, {
      headers: { Authorization: "Bearer " + token },
    });

    const data = await res.json();

    const ordersList = document.getElementById("ordersList");
    if (!ordersList) return;

    ordersList.innerHTML = "";

    if (!data.orders?.length) {
      ordersList.innerHTML = "<p>No orders yet.</p>";
      return;
    }

    data.orders.forEach((o) => {
      const div = document.createElement("div");
      div.className = "order";
      div.innerHTML = `
        <strong>Order ID:</strong> ${o.orderId}<br>
        ₹${o.amount} • ${o.status}<br>
        <small>${new Date(o.createdAt).toLocaleString()}</small>
      `;
      ordersList.appendChild(div);
    });
  } catch (err) {
    console.error("Orders load failed:", err);
  }
}