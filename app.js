// Auto "login" for Azhar – no login needed
showDashboard('Azhar');

// Show dashboard (always on)
function showDashboard(username) {
    document.getElementById('dashboardSection').style.display = 'block';
    document.getElementById('welcomeName').textContent = username;
}

// Variables for sensors
let sensorInterval = null;
let dataBuffer = [];
const BUFFER_SIZE = 200; // Longer for boostful bed sensitivity
let inductionActive = false;
let calmVarianceAvg = localStorage.getItem('calmVarianceAvg') ? parseFloat(localStorage.getItem('calmVarianceAvg')) : 4;
let remSpikeThreshold = localStorage.getItem('remSpikeThreshold') ? parseFloat(localStorage.getItem('remSpikeThreshold')) : 0.4;
let remGyroThreshold = localStorage.getItem('remGyroThreshold') ? parseFloat(localStorage.getItem('remGyroThreshold')) : 6;
let baroBuffer = []; // For breathing

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
    startBarometer(); // New breathing boost

    document.getElementById('sensorStatus').textContent = 'Sensors: Running – Hold still for calm test';
    document.getElementById('dreamState').textContent = 'State: Detecting...';
    inductionActive = false;

    sensorInterval = setInterval(() => {
        updateSensorDisplay();
        processData();
    }, 300); // Faster loop for boost
}

// New: Barometer for breathing boost
function startBarometer() {
    if ('Barometer' in window) {
        const baro = new Barometer({ frequency: 60 });
        baro.addEventListener('reading', () => {
            baroBuffer.push(baro.pressure || 0);
            if (baroBuffer.length > BUFFER_SIZE) baroBuffer.shift();
            document.getElementById('baroPressure').textContent = (baro.pressure || 0).toFixed(2);
        });
        baro.start();
    } else {
        document.getElementById('baroPressure').textContent = 'N/A';
    }
}

// handleMotion/handleOrientation same as before

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

    const accels = dataBuffer.map(d => Math.abs(d.accelX) + Math.abs(d.accelY) + Math.abs(d.accelZ - 9.8));
    const mean = accels.reduce((a, b) => a + b, 0) / accels.length;
    const variance = accels.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / accels.length;

    if (variance > calmVarianceAvg + 8) {
        document.getElementById('dreamState').textContent = 'State: Active (moving)';
        document.getElementById('dreamState').style.color = '#d9534f';
        inductionActive = false;
        return;
    }

    // REM with breathing boost (barometer variance for irregularity)
    const recent = dataBuffer.slice(-40);
    const accelSpikes = recent.filter(d => Math.abs(d.accelX) > remSpikeThreshold || Math.abs(d.accelY) > remSpikeThreshold).length;
    const gyroVar = recent.reduce((sum, d) => sum + Math.abs(d.gyroX) + Math.abs(d.gyroY) + Math.abs(d.gyroZ), 0) / recent.length;
    let breathingVar = 0;
    if (baroBuffer.length > 20) {
        const baroMean = baroBuffer.reduce((a, b) => a + b, 0) / baroBuffer.length;
        breathingVar = baroBuffer.reduce((a, b) => a + Math.pow(b - baroMean, 2), 0) / baroBuffer.length * 100; // Scaled for sensitivity
    }

    if (accelSpikes > 4 || gyroVar > remGyroThreshold || breathingVar > 0.5) { // Boost with breathing
        inductionActive = true;
        document.getElementById('dreamState').textContent = 'Lucidity induction active – dream control starting';
        document.getElementById('dreamState').style.color = '#2196F3';
    } else {
        if (inductionActive) {
            document.getElementById('dreamState').textContent = 'Control sustained (closed-loop active)';
            document.getElementById('dreamState').style.color = '#2196F3';
        } else {
            document.getElementById('dreamState').textContent = 'State: Calm (no REM yet)';
            document.getElementById('dreamState').style.color = '#006400';
        }
    }

    // Learning
    if (variance < calmVarianceAvg + 3 && !inductionActive) {
        calmVarianceAvg = (calmVarianceAvg * 0.9) + (variance * 0.1);
        localStorage.setItem('calmVarianceAvg', calmVarianceAvg);
    }
    if (inductionActive) {
        remSpikeThreshold *= 0.95;
        remGyroThreshold *= 0.95;
        localStorage.setItem('remSpikeThreshold', remSpikeThreshold);
        localStorage.setItem('remGyroThreshold', remGyroThreshold);
    }
}

// Stop session
document.getElementById('stopSessionBtn').addEventListener('click', function() {
    window.removeEventListener('devicemotion', handleMotion);
    window.removeEventListener('deviceorientation', handleOrientation);
    clearInterval(sensorInterval);
    dataBuffer = [];
    baroBuffer = [];
    inductionActive = false;

    document.getElementById('sensorData').style.display = 'none';
    document.getElementById('startSessionBtn').style.display = 'inline-block';
    document.getElementById('stopSessionBtn').style.display = 'none';
    document.getElementById('sensorStatus').textContent = 'Sensors: Stopped';
    document.getElementById('dreamState').textContent = 'State: Detecting...';
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
    document.getElementById('baroPressure').textContent = '0';
});

// Logout removed

// Service Worker same
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
        .then(() => console.log('Service Worker registered'))
        .catch(err => console.log('Service Worker error:', err));
}
