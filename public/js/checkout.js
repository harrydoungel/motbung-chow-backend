// Constants for fees
const PLATFORM_FEE = 9;
const DELIVERY_CHARGE = 39;

// Load total and calculate final amount
document.addEventListener("DOMContentLoaded", () => {
  // Get subtotal from cart
  const subtotal = parseFloat(localStorage.getItem("cartTotal") || 0);
  
  // Display subtotal
  document.getElementById("subtotal").innerText = subtotal.toFixed(2);
  
  // Display fixed fees
  document.getElementById("platformFee").innerText = PLATFORM_FEE.toFixed(2);
  document.getElementById("deliveryCharge").innerText = DELIVERY_CHARGE.toFixed(2);
  
  // Calculate final total
  const finalTotal = subtotal + PLATFORM_FEE + DELIVERY_CHARGE;
  document.getElementById("finalTotal").innerText = finalTotal.toFixed(2);
  
  // Save the final total for order creation
  localStorage.setItem("finalTotal", finalTotal.toFixed(2));
  
  // Optional: auto-fill phone if available
  const phone = localStorage.getItem("userPhone");
  if (phone) {
    document.getElementById("custPhone").value = "+91 " + phone;
  }
});

// Get current location - FIXED VERSION
function getLocation() {
  console.log("📍 getLocation() called");
  
  if (!navigator.geolocation) {
    alert("Geolocation not supported by your browser");
    return;
  }

  const addressField = document.getElementById("custAddress");
  const locationBtn = document.querySelector(".location-btn");
  
  // Show loading
  locationBtn.disabled = true;
  locationBtn.innerHTML = "📍 Getting location...";
  addressField.value = "Getting your location...";

  // Get live coordinates
  navigator.geolocation.getCurrentPosition(
    // Success callback
    function(position) {
      console.log("✅ Location obtained successfully");
      
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      
      console.log("Coordinates:", latitude, longitude);
      
      // Show coordinates in field
      addressField.value = `Lat: ${latitude}, Lng: ${longitude}`;
      
      // Save for backend
      localStorage.setItem("orderLat", latitude);
      localStorage.setItem("orderLng", longitude);
      
      // Generate Google Maps link
      const mapLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
      localStorage.setItem("orderMapLink", mapLink);
      
      console.log("Google Maps link:", mapLink);
      
      locationBtn.innerHTML = "📍 Location Captured!";
      locationBtn.disabled = false;
      
      // Reset button text after 2 seconds
      setTimeout(() => {
        locationBtn.innerHTML = "📍 Use Current Location";
      }, 2000);
    },
    // Error callback
    function(error) {
      console.error("❌ Error getting location:", error);
      
      let errorMessage = "Unable to get location";
      switch(error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = "Location permission denied. Please enable location access in browser settings and refresh the page.";
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = "Location information unavailable.";
          break;
        case error.TIMEOUT:
          errorMessage = "Location request timed out.";
          break;
      }
      
      addressField.value = errorMessage;
      locationBtn.innerHTML = "📍 Try Again";
      locationBtn.disabled = false;
      
      alert(errorMessage);
    },
    // Options - enable high accuracy
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
}

// Select payment method
function selectPayment(method) {
  const onlineOption = document.querySelector('input[value="online"]').parentElement;
  const codOption = document.querySelector('input[value="cod"]').parentElement;
  
  if (method === 'online') {
    onlineOption.classList.add('selected');
    codOption.classList.remove('selected');
    document.querySelector('input[value="online"]').checked = true;
  } else {
    codOption.classList.add('selected');
    onlineOption.classList.remove('selected');
    document.querySelector('input[value="cod"]').checked = true;
  }
}

// Confirm order
function confirmOrder() {
  // 🔐 CHECK LOGIN TOKEN
  const token = localStorage.getItem("token");
  if (!token) {
    alert("Please login before placing an order");
    window.location.href = "index.html";
    return;
  }

  const name = document.getElementById('custName').value.trim();
  const phone = document.getElementById('custPhone').value.trim();
  const address = document.getElementById('custAddress').value.trim();
  
  // Get the final total including fees
  const amount = parseFloat(localStorage.getItem("finalTotal") || 0);
  const subtotal = parseFloat(localStorage.getItem("cartTotal") || 0);

  if (!name || !phone || !address) {
    alert("Please fill all fields");
    return;
  }

  if (amount <= 0) {
    alert("Invalid order amount");
    return;
  }

  // Get the map link if location was captured
  const mapLink = localStorage.getItem("orderMapLink") || "";

  const paymentMethod = document.querySelector(
    'input[name="paymentMethod"]:checked'
  ).value;

  console.log("📦 Order details:", { 
    subtotal, 
    platformFee: PLATFORM_FEE,
    deliveryCharge: DELIVERY_CHARGE,
    finalAmount: amount, 
    address, 
    paymentMethod, 
    mapLink 
  });

  // =====================
  // CREATE ORDER (BACKEND)
  // =====================
  fetch("http://localhost:5001/api/orders/create-order", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify({
      amount: amount, // ✅ Just send the rupees
      subtotal: subtotal, // ✅ Just send the rupees
      platformFee: PLATFORM_FEE, // ✅ Just send the rupees
      deliveryCharge: DELIVERY_CHARGE, // ✅ Just send the rupees
      location: address,
      mapLink: mapLink,
      paymentMethod,
    }),
  })
    .then(res => {
      console.log("Order creation response status:", res.status);
      return res.json();
    })
    .then(data => {
      console.log("Order creation response:", data);
      
      // Clear location data
      localStorage.removeItem("orderLat");
      localStorage.removeItem("orderLng");
      localStorage.removeItem("orderMapLink");
      
      // -------- COD FLOW --------
      if (paymentMethod === "cod") {
        alert("Order placed with Cash on Delivery ✅");
        localStorage.setItem("goToOrders", "true");
        window.location.href = "index.html";
        return;
      }

      // -------- ONLINE PAYMENT FLOW --------
      openRazorpay(data, token);
    })
    .catch((error) => {
      console.error("Order creation failed:", error);
      alert("Failed to create order. Please try again.");
    });
}

// Razorpay checkout
function openRazorpay(orderData, token) {
  const options = {
    key: "rzp_test_S4uNziOA4bf8nk",
    amount: orderData.amount,
    currency: orderData.currency,
    name: "Motbung Chow",
    description: "Food Order Payment",
    order_id: orderData.razorpayOrderId,
    theme: {
      color: "#d32f2f",
    },

    handler: function (response) {
      console.log("Payment successful:", response);
      
      // =====================
      // VERIFY PAYMENT (BACKEND)
      // =====================
      fetch("http://localhost:5001/api/orders/verify-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            alert("Order placed successfully ✅");
            localStorage.setItem("goToOrders", "true");
            window.location.href = "index.html";
          } else {
            alert("Payment verification failed ❌");
          }
        })
        .catch(() => {
          alert("Payment verification error ❌");
        });
    },
  };

  const rzp = new Razorpay(options);
  rzp.open();
}