// Check if already logged in
if (localStorage.getItem('username')) {
    showDashboard(localStorage.getItem('username'));
} else {
    document.getElementById('loginSection').style.display = 'block';
}

// Login button
document.getElementById('loginBtn').addEventListener('click', function() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (username && password) {
        localStorage.setItem('username', username);
        showDashboard(username);
        document.getElementById('loginMessage').textContent = '';
    } else {
        document.getElementById('loginMessage').textContent = 'Please enter username and password.';
    }
});

// Show dashboard
function showDashboard(username) {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('dashboardSection').style.display = 'block';
    document.getElementById('welcomeName').textContent = username;
}

// Variables for sensors
let sensorInterval = null;
let isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

// Start session - now with iOS permission request
document.getElementById('startSessionBtn').addEventListener('click', async function() {
    document.getElementById('sensorData').style.display = 'block';
    document.getElementById('startSessionBtn').style.display = 'none';
    document.getElementById('stopSessionBtn').style.display = 'inline-block';
    document.getElementById('sensorStatus').textContent = 'Sensors: Preparing...';

    if (isIOS) {
        // Special iOS permission request
        try {
            const responseMotion = await DeviceMotionEvent.requestPermission();
            const responseOrientation = await DeviceOrientationEvent.requestPermission();
            if (responseMotion === 'granted' && responseOrientation === 'granted') {
                startSensors();
            } else {
                document.getElementById('sensorStatus').textContent = 'Sensors: Permission denied – Tap Start again and Allow';
            }
        } catch (error) {
            document.getElementById('sensorStatus').textContent = 'Sensors: iOS permission error – Try again';
            console.error(error);
        }
    } else {
        // Non-iOS (like laptop/Android) - start directly
        startSensors();
    }
});

function startSensors() {
    // Fallback listeners for all devices (works best on iOS)
    window.addEventListener('devicemotion', handleMotion);
    window.addEventListener('deviceorientation', handleOrientation);

    document.getElementById('sensorStatus').textContent = 'Sensors: Running – Move device to test';

    // Update display every second
    sensorInterval = setInterval(updateSensorDisplay, 500); // Faster update for phone
}

function handleMotion(event) {
    if (event.accelerationIncludingGravity) {
        document.getElementById('accelX').textContent = (event.accelerationIncludingGravity.x || 0).toFixed(2);
        document.getElementById('accelY').textContent = (event.accelerationIncludingGravity.y || 0).toFixed(2);
        document.getElementById('accelZ').textContent = (event.accelerationIncludingGravity.z || 0).toFixed(2);
    }
    if (event.rotationRate) {
        document.getElementById('gyroX').textContent = (event.rotationRate.alpha || 0).toFixed(2);
        document.getElementById('gyroY').textContent = (event.rotationRate.beta || 0).toFixed(2);
        document.getElementById('gyroZ').textContent = (event.rotationRate.gamma || 0).toFixed(2);
    }
}

function handleOrientation(event) {
    document.getElementById('magX').textContent = (event.alpha || 0).toFixed(2);
    document.getElementById('magY').textContent = (event.beta || 0).toFixed(2);
    document.getElementById('magZ').textContent = (event.gamma || 0).toFixed(2);
}

function updateSensorDisplay() {
    // Extra update in case
    document.getElementById('sensorStatus').textContent = 'Sensors: Running – Move device to test';
}

// Stop session
document.getElementById('stopSessionBtn').addEventListener('click', function() {
    window.removeEventListener('devicemotion', handleMotion);
    window.removeEventListener('deviceorientation', handleOrientation);
    clearInterval(sensorInterval);

    document.getElementById('sensorData').style.display = 'none';
    document.getElementById('startSessionBtn').style.display = 'inline-block';
    document.getElementById('stopSessionBtn').style.display = 'none';
    document.getElementById('sensorStatus').textContent = 'Sensors: Stopped';
    // Reset numbers
    document.getElementById('accelX').textContent = '0';
    document.getElementById('accelY').textContent = '0';
    document.getElementById('accelZ').textContent = '0';
    document.getElementById('gyroX').textContent = '0';
    document.getElementById('gyroY').textContent = '0';
    document.getElementById('gyroZ').textContent = '0';
    document.getElementById('magX').textContent = '0';
    document.getElementById('magY').textContent = '0';
    document.getElementById('magZ').textContent = '0';
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', function() {
    localStorage.removeItem('username');
    document.getElementById('dashboardSection').style.display = 'none';
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
});

// Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
        .then(() => console.log('Service Worker registered'))
        .catch(err => console.log('Service Worker error:', err));
}