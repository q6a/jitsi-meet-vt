/**
 * Transcribes audio using the specified API endpoint.
 *
 * @param {string} langFrom - The language code for transcription.
 * @param {Blob} recordedBlob - The audio Blob to be transcribed.
 * @param {string} apiEndpoint - The API endpoint for transcription.
 * @param {string} tokenData - The authorization token for the API.
 * @param {string} meetingId - The meeting ID for tracking.
 * @param {string} senderId - The sender ID for tracking.
 * @param {string} clientId - The client ID for authorization.
 * @returns {Promise<string>} - A promise that resolves to the transcription text.
 */
async function transcribeAudioMicrosoft(langFrom: any, recordedBlob: any, apiEndpoint:any, tokenData: any, meetingId:any, clientId: any, senderId: string, elapsedTime: number | undefined) {
    try {
        const elapsedTimeValue = elapsedTime?.toString() || "0"; // Default to "0" if undefined


        const headers = {
            Authorization: `Bearer ${tokenData}`,
            "Content-Type": "audio/wav",
            "x-lang-from": langFrom,
            "x-meeting-id": meetingId,
            "x-client-id": clientId,
            "x-sender-id": senderId,
            "x-elapsed-time": elapsedTimeValue
        };

        const response = await fetch(apiEndpoint, {
            method: "POST",
            headers,
            body: recordedBlob,
        });

        if (!response.ok) {
            const errorDetails = await response.json();

            console.error("Transcription API Error:", errorDetails);
            throw new Error(`Transcription error: ${errorDetails.error.message}`);
        }

        const data = await response.json();

        return data.data.transcription;
    } catch (error: any) {
        console.error("Error transcribing audio:", error);
        throw new Error("Failed to transcribe audio");
    }
}

export default transcribeAudioMicrosoft;
