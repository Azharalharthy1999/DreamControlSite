// ... (same login/dashboard/sensors as last)

// New: Adaptation variables (saved per user)
let calmVarianceAvg = localStorage.getItem('calmVarianceAvg') ? parseFloat(localStorage.getItem('calmVarianceAvg')) : 5;
let remSpikeThreshold = localStorage.getItem('remSpikeThreshold') ? parseFloat(localStorage.getItem('remSpikeThreshold')) : 0.6;
let remGyroThreshold = localStorage.getItem('remGyroThreshold') ? parseFloat(localStorage.getItem('remGyroThreshold')) : 8;

// In processData, use adaptive thresholds
function processData() {
    if (dataBuffer.length < 20) return;

    const accels = dataBuffer.map(d => Math.abs(d.accelX) + Math.abs(d.accelY) + Math.abs(d.accelZ - 9.8));
    const mean = accels.reduce((a, b) => a + b, 0) / accels.length;
    const variance = accels.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / accels.length;

    if (variance > calmVarianceAvg + 10) { // Adaptive active
        // Active
        inductionActive = false;
        return;
    }

    // REM with adaptive
    const recent = dataBuffer.slice(-40);
    const accelSpikes = recent.filter(d => Math.abs(d.accelX) > remSpikeThreshold || Math.abs(d.accelY) > remSpikeThreshold).length;
    const gyroVar = recent.reduce((sum, d) => sum + Math.abs(d.gyroX) + Math.abs(d.gyroY) + Math.abs(d.gyroZ), 0) / recent.length;

    if (accelSpikes > 6 || gyroVar > remGyroThreshold) {
        inductionActive = true;
        // Induction messages
    } else {
        // Calm messages
    }

    // Learning: If long calm, update averages
    if (variance < calmVarianceAvg + 3 && !inductionActive) {
        calmVarianceAvg = (calmVarianceAvg * 0.9) + (variance * 0.1); // Slow learn
        localStorage.setItem('calmVarianceAvg', calmVarianceAvg);
    }

    // If REM triggered, lower thresholds slightly for next
    if (inductionActive) {
        remSpikeThreshold *= 0.95;
        remGyroThreshold *= 0.95;
        localStorage.setItem('remSpikeThreshold', remSpikeThreshold);
        localStorage.setItem('remGyroThreshold', remGyroThreshold);
    }
}

// ... (rest same, add saving on stop if needed)
