// AmplifyAudio.ts

export class AmplifyAudio {
    private audioContext: AudioContext;

    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    /**
     * Amplifies the volume of the audio Blob.
     *
     * @param audioBlob - The original audio Blob.
     * @param gainValue - The amplification multiplier (e.g., 1.5 for 150% volume).
     * @returns A promise that resolves to the amplified audio Blob.
     */
    async amplify(audioBlob: Blob, gainValue = 3): Promise<Blob> {
        // Convert the Blob to ArrayBuffer
        const arrayBuffer = await audioBlob.arrayBuffer();

        // Decode the ArrayBuffer into an AudioBuffer
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

        // Create an OfflineAudioContext to process the audio
        const offlineContext = new OfflineAudioContext(
            audioBuffer.numberOfChannels,
            audioBuffer.length,
            audioBuffer.sampleRate
        );

        // Create a GainNode to amplify the audio
        const gainNode = offlineContext.createGain();

        gainNode.gain.value = gainValue;

        // Create a BufferSource node to play the audio
        const source = offlineContext.createBufferSource();

        source.buffer = audioBuffer;

        // Connect the nodes
        source.connect(gainNode);
        gainNode.connect(offlineContext.destination);

        // Start the audio playback and process the audio
        source.start(0);
        const renderedBuffer = await offlineContext.startRendering();

        // Convert the processed AudioBuffer to a Blob
        return this.convertBufferToBlob(renderedBuffer);
    }

    /**
     * Converts an AudioBuffer into a Blob (WAV format).
     *
     * @param buffer - The processed AudioBuffer.
     * @returns A promise that resolves to a Blob.
     */
    private convertBufferToBlob(buffer: AudioBuffer): Blob {
        const numOfChannels = buffer.numberOfChannels;
        const length = buffer.length * numOfChannels * 2 + 44; // 44 bytes for WAV header
        const result = new DataView(new ArrayBuffer(length));

        this.writeWavHeader(result, buffer);

        // Write the PCM samples
        let offset = 44;

        for (let i = 0; i < buffer.length; i++) {
            for (let channel = 0; channel < numOfChannels; channel++) {
                const sample = buffer.getChannelData(channel)[i] * 32767;

                result.setInt16(offset, Math.max(-32768, Math.min(32767, sample)), true);
                offset += 2;
            }
        }

        return new Blob([result], { type: "audio/wav" });
    }

    /**
     * Writes a WAV file header.
     *
     * @param view - The DataView to write to.
     * @param buffer - The AudioBuffer to use for the header info.
     */
    private writeWavHeader(view: DataView, buffer: AudioBuffer) {
        const numOfChannels = buffer.numberOfChannels;
        const sampleRate = buffer.sampleRate;

        // RIFF identifier
        this.writeString(view, 0, "RIFF");

        // RIFF chunk length
        view.setUint32(4, 36 + buffer.length * numOfChannels * 2, true);

        // RIFF type
        this.writeString(view, 8, "WAVE");

        // Format chunk identifier
        this.writeString(view, 12, "fmt ");

        // Format chunk length
        view.setUint32(16, 16, true);

        // Sample format (PCM)
        view.setUint16(20, 1, true);

        // Channel count
        view.setUint16(22, numOfChannels, true);

        // Sample rate
        view.setUint32(24, sampleRate, true);

        // Byte rate (sample rate * block align)
        view.setUint32(28, sampleRate * numOfChannels * 2, true);

        // Block align (channel count * bytes per sample)
        view.setUint16(32, numOfChannels * 2, true);

        // Bits per sample
        view.setUint16(34, 16, true);

        // Data chunk identifier
        this.writeString(view, 36, "data");

        // Data chunk length
        view.setUint32(40, buffer.length * numOfChannels * 2, true);
    }

    /**
     * Writes a string into a DataView.
     *
     * @param view - The DataView to write to.
     * @param offset - The byte offset to start writing.
     * @param string - The string to write.
     */
    private writeString(view: DataView, offset: number, string: string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }
}
