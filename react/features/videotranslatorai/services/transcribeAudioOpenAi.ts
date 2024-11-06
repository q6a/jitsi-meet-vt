import axios from "axios";

/**
 * Transcribes audio using the specified API endpoint.
 *
 * @param {string} langFrom - The language code for transcription.
 * @param {Blob} recordedBlob - The audio Blob to be transcribed.
 * @param {string} apiEndpoint - The API endpoint for transcription.
 * @param {string} tokenData - The authorization token for the API.
 * @returns {Promise<string>} - A promise that resolves to the transcription text.
 */
async function transcribeAudioOpenAi(langFrom: any, recordedBlob: any, apiEndpoint: any, tokenData: any) {
    try {
        // Get the current timestamp for lastModified
        const lastModifiedDate = new Date();
        const lastModified = lastModifiedDate.getTime();

        // // Create a File object from the Blob with the appropriate properties
        // const audioFile = new File([recordedBlob], "audio.wav", {
        //     type: "audio/wav",
        //     lastModified,
        // });

        // Create a File object from the Blob with the appropriate properties
        const audioFile = new File([recordedBlob], "audio.webm", {
            type: "audio/webm",
            lastModified,
        });

        // Create FormData and append the required fields
        const formData = new FormData();

        formData.append("file", audioFile);
        formData.append("langFrom", langFrom);

        // Make the API request to transcribe the audio
        const response = await axios.post(apiEndpoint, formData, {
            headers: {
                Authorization: `Bearer ${tokenData}`,
                "Content-Type": "multipart/form-data",
            },
        });

        // Extract and return the transcription text
        const transcriptionText = response.data.data.transcription;

        return transcriptionText;
    } catch (error) {
        console.error("Error transcribing audio:", error);
        throw new Error("Failed to transcribe audio");
    }
}

export default transcribeAudioOpenAi;
