// ... (same login/dashboard as before)

// processData function updated for sensitivity
function processData() {
    if (dataBuffer.length < 20) {
        document.getElementById('dreamState').textContent = 'State: Detecting...';
        document.getElementById('dreamState').style.color = '#333';
        return;
    }

    // Calm/active
    const accels = dataBuffer.map(d => Math.abs(d.accelX) + Math.abs(d.accelY) + Math.abs(d.accelZ - 9.8));
    const mean = accels.reduce((a, b) => a + b, 0) / accels.length;
    const variance = accels.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / accels.length;

    if (variance > 12) {
        document.getElementById('dreamState').textContent = 'State: Active (moving)';
        document.getElementById('dreamState').style.color = '#d9534f';
        inductionActive = false;
        return;
    }

    // REM in calm – more sensitive for bed vibrations
    const recent = dataBuffer.slice(-40);
    const accelSpikes = recent.filter(d => Math.abs(d.accelX) > 0.5 || Math.abs(d.accelY) > 0.5).length; // Lowered
    const gyroVar = recent.reduce((sum, d) => sum + Math.abs(d.gyroX) + Math.abs(d.gyroY) + Math.abs(d.gyroZ), 0) / recent.length;

    if (accelSpikes > 6 || gyroVar > 6) { // Lowered for subtle REM
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
}

// ... (rest same as last version)
