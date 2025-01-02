const EventEmitter = require('events');

class AISStreamSimulator extends EventEmitter {
    constructor(vesselData) {
        super();
        this.vesselData = vesselData;
        this.currentIndex = 0;
        this.isStreaming = false;
        this.streamInterval = null;
        this.replaySpeed = 1; // Default speed multiplier
    }

    // Start streaming data
    startStream(speedMultiplier = 1) {
        if (this.isStreaming) return;
        
        this.replaySpeed = speedMultiplier;
        this.isStreaming = true;
        
        const processNextRecord = () => {
            if (!this.isStreaming || this.currentIndex >= this.vesselData.length) {
                this.stopStream();
                return;
            }

            const currentRecord = this.vesselData[this.currentIndex];
            const nextRecord = this.vesselData[this.currentIndex + 1];
            
            // Emit the current record
            this.emit('data', currentRecord);
            
            // Calculate delay until next record
            if (nextRecord) {
                const currentTime = new Date(currentRecord.timestamp).getTime();
                const nextTime = new Date(nextRecord.timestamp).getTime();
                const delay = (nextTime - currentTime) / this.replaySpeed;
                
                this.streamInterval = setTimeout(processNextRecord, delay);
            }
            
            this.currentIndex++;
        };

        processNextRecord();
    }

    // Stop streaming
    stopStream() {
        this.isStreaming = false;
        if (this.streamInterval) {
            clearTimeout(this.streamInterval);
        }
        this.emit('end');
    }

    // Pause streaming
    pauseStream() {
        this.isStreaming = false;
        if (this.streamInterval) {
            clearTimeout(this.streamInterval);
        }
    }

    // Resume streaming
    resumeStream() {
        if (!this.isStreaming) {
            this.startStream(this.replaySpeed);
        }
    }

    // Reset to beginning
    reset() {
        this.stopStream();
        this.currentIndex = 0;
    }

    // Change replay speed
    setReplaySpeed(multiplier) {
        this.replaySpeed = multiplier;
        if (this.isStreaming) {
            this.stopStream();
            this.startStream(this.replaySpeed);
        }
    }
}

module.exports = AISStreamSimulator;