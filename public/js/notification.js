// notification.js - Shared notification system for admin and delivery pages

let lastOrderId = null;
let notificationSound = null;
let notificationCheckInterval = null;
let audioEnabled = false;

// ================= AUDIO UNLOCK SYSTEM =================

// Function to unlock audio with user interaction
function unlockAudio() {
    if (audioEnabled) return true;
    
    // Create and play a silent audio to unlock audio context
    const silentAudio = new Audio();
    silentAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
    
    return silentAudio.play().then(() => {
        audioEnabled = true;
        console.log('🔊 Audio unlocked successfully');
        return true;
    }).catch(error => {
        console.log('Audio unlock failed:', error);
        return false;
    });
}

// ================= SOUND FUNCTIONS =================

// Load the sound file
function loadNotificationSound() {
    try {
        notificationSound = new Audio('sounds/notification.mp3');
        notificationSound.preload = 'auto';
        notificationSound.volume = 0.8;
        notificationSound.load().then(() => {
            console.log('🔔 Notification sound loaded successfully');
        }).catch(e => {
            console.warn('Sound load error:', e);
        });
    } catch (error) {
        console.error('Failed to create audio:', error);
    }
}

// Play the sound (with audio check)
function playNotificationSound() {
    // First try to unlock audio if not enabled
    if (!audioEnabled) {
        unlockAudio().then(unlocked => {
            if (unlocked) {
                // Wait a bit then play
                setTimeout(() => {
                    playSound();
                }, 100);
            } else {
                console.log('🔇 Audio not enabled - sound blocked');
                // Show visual indicator that audio is blocked
                showAudioBlockedWarning();
            }
        });
        return;
    }
    
    // If audio is already enabled, play directly
    playSound();
}

// Internal function to actually play the sound
function playSound() {
    if (!notificationSound) {
        loadNotificationSound();
        setTimeout(() => playSound(), 500);
        return;
    }
    
    try {
        // Reset to start
        notificationSound.currentTime = 0;
        notificationSound.volume = 0.8;
        
        // Play the sound
        notificationSound.play().catch(e => {
            console.warn('Sound play failed:', e.message);
            // Try to unlock again
            audioEnabled = false;
            showAudioBlockedWarning();
        });
    } catch (error) {
        console.warn('Error playing sound:', error);
    }
}

// Show warning when audio is blocked
function showAudioBlockedWarning() {
    // Remove existing warning
    const existing = document.querySelector('.audio-warning');
    if (existing) existing.remove();
    
    const warning = document.createElement('div');
    warning.className = 'audio-warning';
    warning.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #ff9800;
        color: white;
        padding: 10px 20px;
        border-radius: 8px;
        z-index: 10001;
        font-family: Arial, sans-serif;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(255, 152, 0, 0.4);
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideUp 0.3s ease;
    `;
    
    warning.innerHTML = `
        <span style="font-size: 18px;">🔕</span>
        <div>
            <strong>Sound notifications blocked</strong><br>
            <small>Click anywhere to enable sounds</small>
        </div>
    `;
    
    // Click to unlock audio
    warning.onclick = function() {
        unlockAudio();
        this.remove();
    };
    
    document.body.appendChild(warning);
    
    // Auto remove after 10 seconds
    setTimeout(() => {
        if (warning.parentNode) {
            warning.remove();
        }
    }, 10000);
}

// Fallback beep sound
function playBeepFallback() {
    try {
        // Try to play a simple beep sound
        const beep = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=');
        beep.volume = 0.5;
        beep.play();
    } catch (e) {
        // Final fallback - console beep
        console.log('\x07');
    }
}

// ================= VISUAL NOTIFICATION =================

// Show visual notification
function showNotification(orderId, pageType = 'admin') {
    // Colors based on page type
    const colors = {
        admin: { 
            bg: 'linear-gradient(135deg, #2196F3, #0D47A1)', 
            border: '#FF9800',
            icon: '📊',
            title: 'ADMIN ALERT'
        },
        delivery: { 
            bg: 'linear-gradient(135deg, #4CAF50, #2E7D32)', 
            border: '#FFD700',
            icon: '🚚',
            title: 'DELIVERY ORDER'
        }
    };
    
    const color = colors[pageType] || colors.admin;
    
    // Remove existing notification
    const existing = document.querySelector('.order-notification');
    if (existing) existing.remove();
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'order-notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${color.bg};
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
        border-left: 5px solid ${color.border};
        z-index: 10000;
        font-weight: bold;
        font-family: Arial, sans-serif;
        animation: slideIn 0.3s ease;
        min-width: 280px;
        max-width: 350px;
        cursor: pointer;
        transition: transform 0.2s;
    `;
    
    notification.onmouseover = function() {
        this.style.transform = 'translateY(-2px)';
    };
    
    notification.onmouseout = function() {
        this.style.transform = 'translateY(0)';
    };
    
    const timestamp = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
            <div style="
                background: white;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 22px;
                color: ${color.border};
                animation: bounce 0.5s ease 2;
            ">${color.icon}</div>
            <div>
                <div style="font-size: 16px;">NEW ${color.title}!</div>
                <div style="font-size: 12px; opacity: 0.9; margin-top: 2px;">
                    ${timestamp}
                </div>
            </div>
        </div>
        <div style="font-size: 13px; background: rgba(255,255,255,0.2); padding: 6px 10px; border-radius: 6px; margin-top: 5px;">
            <strong>Order ID:</strong> ${orderId.substring(0, 14)}...
        </div>
        <div style="font-size: 11px; margin-top: 8px; display: flex; align-items: center; gap: 5px; opacity: 0.8;">
            <span style="width: 6px; height: 6px; background: ${color.border}; border-radius: 50%; animation: pulse 1s infinite;"></span>
            Click to refresh orders
        </div>
    `;
    
    // Add click handler
    notification.onclick = function() {
        if (pageType === 'admin' && typeof loadAdminOrders === 'function') {
            loadAdminOrders();
        } else if (pageType === 'delivery' && typeof loadDeliveryOrders === 'function') {
            loadDeliveryOrders();
        } else {
            location.reload();
        }
        this.remove();
    };
    
    // Add CSS animations if not already present
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
            @keyframes bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-5px); }
            }
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
            @keyframes slideUp {
                from { transform: translate(-50%, 100%); opacity: 0; }
                to { transform: translate(-50%, 0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) notification.parentNode.removeChild(notification);
            }, 300);
        }
    }, 5000);
}

// ================= ORDER CHECKING =================

// Check for new orders
async function checkForNewOrders(pageType = 'admin') {
    try {
        const response = await fetch('http://localhost:5001/api/orders?_=' + Date.now(), {
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        
        if (!response.ok) {
            console.log('API request failed');
            return;
        }
        
        const data = await response.json();
        const orders = data.orders || [];
        
        if (orders.length > 0) {
            const latestOrder = orders[0];
            
            if (latestOrder.orderId !== lastOrderId) {
                lastOrderId = latestOrder.orderId;
                
                // Check if order is recent (last 60 seconds)
                const orderTime = new Date(latestOrder.createdAt);
                const now = new Date();
                const secondsAgo = (now - orderTime) / 1000;
                
                if (secondsAgo < 60) {
                    console.log(`🎯 New order detected (${secondsAgo.toFixed(1)}s ago) on ${pageType} page`);
                    
                    // Show visual notification first
                    showNotification(latestOrder.orderId, pageType);
                    
                    // Try to play sound (may be blocked by browser)
                    playNotificationSound();
                    
                    // Refresh page data if functions exist
                    if (pageType === 'admin' && typeof loadAdminOrders === 'function') {
                        loadAdminOrders();
                    } else if (pageType === 'delivery' && typeof loadDeliveryOrders === 'function') {
                        loadDeliveryOrders();
                    }
                }
            }
        }
    } catch (error) {
        // Silent fail for network errors
        console.log('Network error checking orders:', error.message);
    }
}

// ================= START/STOP MONITORING =================

// Start monitoring
function startOrderMonitoring(pageType = 'admin', interval = 3000) {
    console.log(`📡 Starting order monitoring for ${pageType} page (checking every ${interval/1000}s)`);
    
    // Load sound first
    loadNotificationSound();
    
    // Try to unlock audio on page load
    setTimeout(() => {
        unlockAudio();
    }, 1000);
    
    // First check immediately after a short delay
    setTimeout(() => checkForNewOrders(pageType), 1500);
    
    // Clear any existing interval
    if (notificationCheckInterval) {
        clearInterval(notificationCheckInterval);
    }
    
    // Set up periodic checking
    notificationCheckInterval = setInterval(() => checkForNewOrders(pageType), interval);
    
    // Also check when page becomes visible
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            checkForNewOrders(pageType);
        }
    });
    
    // Add browser tab title notification
    let originalTitle = document.title;
    let isFlashing = false;
    
    function flashTitle(newOrder = false) {
        if (newOrder && !isFlashing) {
            isFlashing = true;
            let flashCount = 0;
            const flashInterval = setInterval(() => {
                document.title = flashCount % 2 === 0 ? '🚨 NEW ORDER!' : originalTitle;
                flashCount++;
                if (flashCount >= 6) { // Flash 3 times
                    clearInterval(flashInterval);
                    document.title = originalTitle;
                    isFlashing = false;
                }
            }, 500);
        }
    }
}

// Stop monitoring
function stopOrderMonitoring() {
    if (notificationCheckInterval) {
        clearInterval(notificationCheckInterval);
        notificationCheckInterval = null;
        console.log('📡 Order monitoring stopped');
    }
}

// ================= EXPORT FUNCTIONS =================

// Export functions for use in HTML
window.NotificationSystem = {
    start: startOrderMonitoring,
    stop: stopOrderMonitoring,
    check: checkForNewOrders,
    playSound: playNotificationSound,
    show: showNotification,
    unlockAudio: unlockAudio
};

// Auto-start if loaded in a page (optional)
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔔 Notification system loaded');
    
    // Add click listener to entire document to unlock audio
    document.addEventListener('click', function unlockOnClick() {
        unlockAudio();
        // Remove after first successful click
        document.removeEventListener('click', unlockOnClick);
    }, { once: true });
    
    // Check which page we're on and auto-start
    const path = window.location.pathname;
    if (path.includes('admin.html') || path.includes('admin')) {
        // Admin page - start with admin settings
        setTimeout(() => {
            startOrderMonitoring('admin', 3000);
        }, 1500);
    } else if (path.includes('delivery.html') || path.includes('delivery')) {
        // Delivery page - start with delivery settings
        setTimeout(() => {
            startOrderMonitoring('delivery', 3000);
        }, 1500);
    }
});