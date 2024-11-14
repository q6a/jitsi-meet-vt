import axios from "axios";

import { IReduxState } from "../../app/types";
import { toState } from "../../base/redux/functions";


export async function playVoiceFromMessage(text: any, state: IReduxState, textToSpeechCode: string) {
    const region = "australiaeast"; // Your Azure region
    const authToken = toState(state)["features/videotranslatorai"].jwtToken;
    const meetingId = toState(state)["features/videotranslatorai"].meetingId;
    const clientId = toState(state)["features/videotranslatorai"].clientId;
    const apiEndpoint = process.env.REACT_APP_TTS_MICROSOFT_API_ENDPOINT;

    textToSpeechCode = textToSpeechCode.split(" ")[0];

    if (!region || !authToken || !meetingId || !clientId || !apiEndpoint) {
        throw new Error("One or more required variables are not set.");
    }

    const messageContent = text.includes(":") ? text.split(":")[1].trim() : text;

    try {
        const response = await axios.post(
            apiEndpoint,
            {
                text: messageContent,
                textToSpeechCode,
                meeting_id: meetingId,
                client_id: clientId,
            },
            {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                    "Content-Type": "application/json",
                },
                responseType: "arraybuffer",
            }
        );

        await playAudioFromArrayBuffer(response.data);
    } catch (error: any) {
        if (error.response) {
            console.error("Error generating speech:", error.response.status, error.response.statusText);
            console.error("Response data:", error.response.data);
        } else {
            console.error("Error generating speech:", error.message);
        }
    }
}

function playAudioFromArrayBuffer(arrayBuffer: any) {
    const audioBlob = new Blob([arrayBuffer], { type: "audio/mp3" });
    const audioUrl = URL.createObjectURL(audioBlob);

    const audio = new Audio(audioUrl);

    audio.play();

    audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        console.log("Audio playback finished.");
    };

    audio.onerror = (error: any) => {
        console.error("Error playing audio:", error);
    };
}
