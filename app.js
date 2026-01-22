// Direct to dashboard – no login
document.getElementById('dashboardSection').style.display = 'block';

// Variables
let sensorInterval = null;
let dataBuffer = [];
const BUFFER_SIZE = 200;
let inductionActive = false;
let remCounter = 0;
const REM_REQUIRED = 8; // Higher for harder REM trigger
let calmCounter = 0;
const CALM_RESET = 10; // Lower for faster reset to calm
let calmVarianceAvg = localStorage.getItem('calmVarianceAvg') ? parseFloat(localStorage.getItem('calmVarianceAvg')) : 6;
let remSpikeThreshold = localStorage.getItem('remSpikeThreshold') ? parseFloat(localStorage.getItem('remSpikeThreshold')) : 0.8;
let remGyroThreshold = localStorage.getItem('remGyroThreshold') ? parseFloat(localStorage.getItem('remGyroThreshold')) : 10;
let baroBuffer = [];

let isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

// Start session
document.getElementById('startSessionBtn').addEventListener('click', async function() {
    document.getElementById('sensorData').style.display = 'block';
    document.getElementById('startSessionBtn').style.display = 'none';
    document.getElementById('stopSessionBtn').style.display = 'inline-block';
    document.getElementById('sensorStatus').textContent = 'Sensors: Preparing...';
    document.getElementById('dreamState').textContent = 'State: Detecting...';

    if (isIOS) {
        try {
            const responseMotion = await DeviceMotionEvent.requestPermission();
            const responseOrientation = await DeviceOrientationEvent.requestPermission();
            if (responseMotion === 'granted' && responseOrientation === 'granted') {
                startSensors();
            } else {
                document.getElementById('sensorStatus').textContent = 'Sensors: Permission denied – Allow in popup';
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
    startBarometer();

    document.getElementById('sensorStatus').textContent = 'Sensors: Running – Place beside bed for sleep';
    document.getElementById('dreamState').textContent = 'State: Detecting...';
    inductionActive = false;
    remCounter = 0;
    calmCounter = 0;

    sensorInterval = setInterval(() => {
        updateSensorDisplay();
        processData();
    }, 300);
}

function startBarometer() {
    if ('Barometer' in window) {
        const baro = new Barometer({ frequency: 60 });
        baro.addEventListener('reading', () => {
            const pressure = baro.pressure || 0;
            baroBuffer.push(pressure);
            if (baroBuffer.length > BUFFER_SIZE) baroBuffer.shift();
            document.getElementById('baroPressure').textContent = pressure.toFixed(2);
        });
        baro.start();
    } else {
        document.getElementById('baroPressure').textContent = 'N/A (not supported on iPhone)';
    }
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

    const accels = dataBuffer.map(d => Math.abs(d.accelX) + Math.abs(d.accelY) + Math.abs(d.accelZ - 9.8));
    const mean = accels.reduce((a, b) => a + b, 0) / accels.length;
    const variance = accels.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / accels.length;

    if (variance > calmVarianceAvg + 15) {
        document.getElementById('dreamState').textContent = 'State: Active (moving)';
        document.getElementById('dreamState').style.color = '#d9534f';
        inductionActive = false;
        remCounter = 0;
        calmCounter = 0;
        return;
    }

    const recent = dataBuffer.slice(-40);
    const accelSpikes = recent.filter(d => Math.abs(d.accelX) > remSpikeThreshold || Math.abs(d.accelY) > remSpikeThreshold).length;
    const gyroVar = recent.reduce((sum, d) => sum + Math.abs(d.gyroX) + Math.abs(d.gyroY) + Math.abs(d.gyroZ), 0) / recent.length;

    let breathingVar = 0;
    if (baroBuffer.length > 20) {
        const baroMean = baroBuffer.reduce((a, b) => a + b, 0) / baroBuffer.length;
        breathingVar = baroBuffer.reduce((a, b) => a + Math.pow(b - baroMean, 2), 0) / baroBuffer.length * 100;
    }

    if (accelSpikes > 10 || gyroVar > remGyroThreshold || breathingVar > 1.0) {
        remCounter++;
        calmCounter = 0;
        if (remCounter > REM_REQUIRED) {
            inductionActive = true;
            document.getElementById('dreamState').textContent = 'Lucidity induction active – dream control starting';
            document.getElementById('dreamState').style.color = '#2196F3';
        }
    } else {
        remCounter = 0;
        calmCounter++;
        if (inductionActive && calmCounter > CALM_RESET) {
            inductionActive = false;
            document.getElementById('dreamState').textContent = 'State: Calm (no REM yet)';
            document.getElementById('dreamState').style.color = '#006400';
        } else if (inductionActive) {
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
    remCounter = 0;
    calmCounter = 0;

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
    document.getElementById('baroPressure').textContent = 'Detecting...';
});

// Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
        .then(() => console.log('Service Worker registered'))
        .catch(err => console.log('Service Worker error:', err));
}
