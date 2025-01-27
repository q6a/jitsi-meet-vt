import axios from "axios";

/**
 * Transcribes audio using the specified API endpoint.
 *
 * @param {string} langFrom - The language code for transcription.
 * @param {Blob} recordedBlob - The audio Blob to be transcribed.
 * @param {string} apiEndpoint - The API endpoint for transcription.
 * @param {string} tokenData - The authorization token for the API.
 * @param {string} meetingId - The meeting id.
 * @param {string} clientId - The client id.
 * @returns {Promise<string>} - A promise that resolves to the transcription text.
 */
async function transcribeAudioOpenAi(
    langFrom: any,
    recordedBlob: any,
    apiEndpoint: any,
    tokenData: any,
    meetingId: any,
    clientId: any,
    senderId: any
) {
    try {
        const lastModifiedDate = new Date();
        const lastModified = lastModifiedDate.getTime();

        // // Create a File object from the Blob with the appropriate properties
        // const audioFile = new File([recordedBlob], "audio.wav", {
        //     type: "audio/wav",
        //     lastModified,
        // });

        const audioFile = new File([recordedBlob], "audio.webm", {
            type: "audio/webm",
            lastModified,
        });

        const formData = new FormData();

        formData.append("file", audioFile);
        formData.append("langFrom", langFrom);
        formData.append("meeting_id", meetingId);
        formData.append("client_id", clientId);
        formData.append("sender_id", senderId)

        const response = await axios.post(apiEndpoint, formData, {
            headers: {
                Authorization: `Bearer ${tokenData}`,
                "Content-Type": "multipart/form-data",
            },
        });

        const transcriptionText = response.data.data.transcription;

        return transcriptionText;
    } catch (error) {
        console.error("Error transcribing audio:", error);
        throw new Error("Failed to transcribe audio");
    }
}

export default transcribeAudioOpenAi;
