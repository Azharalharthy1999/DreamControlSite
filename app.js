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
let dataBuffer = [];
const BUFFER_SIZE = 100;

let isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

// Start session
document.getElementById('startSessionBtn').addEventListener('click', async function() {
    document.getElementById('sensorData').style.display = 'block';
    document.getElementById('startSessionBtn').style.display = 'none';
    document.getElementById('stopSessionBtn').style.display = 'inline-block';
    document.getElementById('sensorStatus').textContent = 'Sensors: Preparing...';

    if (isIOS) {
        try {
            const responseMotion = await DeviceMotionEvent.requestPermission();
            const responseOrientation = await DeviceOrientationEvent.requestPermission();
            if (responseMotion === 'granted' && responseOrientation === 'granted') {
                startSensors();
            } else {
                document.getElementById('sensorStatus').textContent = 'Sensors: Permission denied';
            }
        } catch (error) {
            document.getElementById('sensorStatus').textContent = 'Sensors: iOS permission error';
        }
    } else {
        startSensors();
    }
});

function startSensors() {
    window.addEventListener('devicemotion', handleMotion);
    window.addEventListener('deviceorientation', handleOrientation);

    document.getElementById('sensorStatus').textContent = 'Sensors: Running – Hold still for calm test';
    document.getElementById('dreamState').textContent = 'State: Detecting...';

    sensorInterval = setInterval(() => {
        updateSensorDisplay();
        processData();
    }, 500);
}

function handleMotion(event) {
    let accelX = 0, accelY = 0, accelZ = 0;
    let gyroX = 0, gyroY = 0, gyroZ = 0;

    if (event.accelerationIncludingGravity) {
        accelX = event.accelerationIncludingGravity.x || 0;
        accelY = event.accelerationIncludingGravity.y || 0;
        accelZ = event.accelerationIncludingGravity.z || 0;
    }
    if (event.rotationRate) {
        gyroX = event.rotationRate.alpha || 0;
        gyroY = event.rotationRate.beta || 0;
        gyroZ = event.rotationRate.gamma || 0;
    }

    dataBuffer.push({accelX, accelY, accelZ, gyroX, gyroY, gyroZ});
    if (dataBuffer.length > BUFFER_SIZE) dataBuffer.shift();
}

function handleOrientation(event) {
    document.getElementById('magX').textContent = (event.alpha || 0).toFixed(2);
    document.getElementById('magY').textContent = (event.beta || 0).toFixed(2);
    document.getElementById('magZ').textContent = (event.gamma || 0).toFixed(2);
}

function updateSensorDisplay() {
    if (dataBuffer.length > 0) {
        const latest = dataBuffer[dataBuffer.length - 1];
        document.getElementById('accelX').textContent = latest.accelX.toFixed(2);
        document.getElementById('accelY').textContent = latest.accelY.toFixed(2);
        document.getElementById('accelZ').textContent = latest.accelZ.toFixed(2);
        document.getElementById('gyroX').textContent = latest.gyroX.toFixed(2);
        document.getElementById('gyroY').textContent = latest.gyroY.toFixed(2);
        document.getElementById('gyroZ').textContent = latest.gyroZ.toFixed(2);
    }
}

function processData() {
    if (dataBuffer.length < 20) {
        document.getElementById('dreamState').textContent = 'State: Detecting...';
        document.getElementById('dreamState').style.color = '#333';
        return;
    }

    // Base calm/active (higher threshold for calm)
    const accels = dataBuffer.map(d => Math.abs(d.accelX) + Math.abs(d.accelY) + Math.abs(d.accelZ - 9.8));
    const mean = accels.reduce((a, b) => a + b, 0) / accels.length;
    const variance = accels.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / accels.length;

    if (variance > 12) { // Raised for less false active from hand
        document.getElementById('dreamState').textContent = 'State: Active (moving)';
        document.getElementById('dreamState').style.color = '#d9534f';
        return;
    }

    // REM in calm: more spikes needed, ignore tiny noise
    const recent = dataBuffer.slice(-40);
    const accelSpikes = recent.filter(d => Math.abs(d.accelX) > 0.8 || Math.abs(d.accelY) > 0.8).length; // Raised threshold
    const gyroVar = recent.reduce((sum, d) => sum + Math.abs(d.gyroX) + Math.abs(d.gyroY) + Math.abs(d.gyroZ), 0) / recent.length;

    if (accelSpikes > 8 || gyroVar > 10) { // Need more evidence for REM
        document.getElementById('dreamState').textContent = 'REM Detected (dream likely)';
        document.getElementById('dreamState').style.color = '#4CAF50';
    } else {
        document.getElementById('dreamState').textContent = 'State: Calm (no REM yet)';
        document.getElementById('dreamState').style.color = '#006400';
    }
}

// Stop session same as before...
document.getElementById('stopSessionBtn').addEventListener('click', function() {
    window.removeEventListener('devicemotion', handleMotion);
    window.removeEventListener('deviceorientation', handleOrientation);
    clearInterval(sensorInterval);
    dataBuffer = [];

    document.getElementById('sensorData').style.display = 'none';
    document.getElementById('startSessionBtn').style.display = 'inline-block';
    document.getElementById('stopSessionBtn').style.display = 'none';
    document.getElementById('sensorStatus').textContent = 'Sensors: Stopped';
    document.getElementById('dreamState').textContent = 'State: Detecting...';
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

// Logout and Service Worker same as before...
document.getElementById('logoutBtn').addEventListener('click', function() {
    localStorage.removeItem('username');
    document.getElementById('dashboardSection').style.display = 'none';
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
});

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
        .then(() => console.log('Service Worker registered'))
        .catch(err => console.log('Service Worker error:', err));
}
