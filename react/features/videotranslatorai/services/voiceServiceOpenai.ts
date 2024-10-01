import axios from "axios";

import { IReduxState } from "../../app/types";
import { toState } from "../../base/redux/functions";

// Voice Service to handle TTS and play the audio
export async function playVoiceFromMessage(message: any, state: IReduxState) {
    try {
        const moderatorData: any = toState(state)["features/videotranslatorai"].moderatorData;
        const participantData: any = toState(state)["features/videotranslatorai"].participantData;
        const participantAndModeratorData: any = [...moderatorData, ...participantData];
        const participantName: any = toState(state)["features/videotranslatorai"].participantName;
        let langFrom = "en";
        const apiKey = process.env.REACT_APP_OPEN_AI_API_KEY; // Replace with your OpenAI API key
        const openaiApiUrl = process.env.REACT_APP_OPENAI_SPEECH_ENDPOINT;

        if (
            !moderatorData ||
            !participantData ||
            !participantAndModeratorData ||
            !participantName ||
            !apiKey ||
            !openaiApiUrl
        ) {
            throw new Error("One or more environment variables are not set.");
        }

        // Find the local participant's language name
        for (const participant of participantAndModeratorData) {
            if (participant.name === participantName) {
                langFrom = participant.transcriptionDialect.dialectCode;
                break;
            }
        }

        const data = {
            model: "tts-1", // Replace with your model
            voice: "alloy", // Use the appropriate voice for the language
            input: message,
        };

        const headers = {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        };

        // Fetch the audio data from OpenAI
        const response = await axios.post(openaiApiUrl, data, {
            headers,
            responseType: "arraybuffer",
        });

        console.log("RESPONSE", response);

        // Create a Blob and play the audio
        const audioBlob = new Blob([response.data], { type: "audio/mpeg" });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        audio.play();
    } catch (error: any) {
        console.error("Error generating speech:", error.response?.data || error.message);
    }
}
