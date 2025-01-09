import axios from "axios";

import { IReduxState } from "../../app/types";
import { toState } from "../../base/redux/functions";
import { setIsPlayingTTS } from "../action.web";
import { getElapsedTime } from "../helpers";
export async function playVoiceFromMessage(text: any, state: IReduxState, textToSpeechCode: string, dispatch: any) {
    const region = "australiaeast"; // Your Azure region
    const authToken = toState(state)["features/videotranslatorai"].jwtToken;
    const meetingId = toState(state)["features/videotranslatorai"].meetingId;
    const clientId = toState(state)["features/videotranslatorai"].clientId;
    const conferenceStartTime = toState(state)["features/base/conference"].conferenceTimestamp;
    const apiEndpoint = process.env.REACT_APP_TTS_MICROSOFT_API_ENDPOINT;
    const entityData: any = toState(state)["features/videotranslatorai"].thisEntityData;

    const elapsedTime = getElapsedTime(conferenceStartTime, new Date().getTime(), true);

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
                sender_id: (entityData.type === "MODERATOR") ? entityData.moderatorId : entityData.participantId,
                elapsed_time: elapsedTime
            },
            {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                    "Content-Type": "application/json",
                },
                responseType: "arraybuffer",
            }
        );

        await playAudioFromArrayBuffer(response.data, dispatch);
    } catch (error: any) {
        if (error.response) {
            console.error("Error generating speech:", error.response.status, error.response.statusText);
            console.error("Response data:", error.response.data);
        } else {
            console.error("Error generating speech:", error.message);
        }
    }
}

function playAudioFromArrayBuffer(arrayBuffer: any, dispatch: any) {
    const blobOptions: BlobOptions = { type: "audio/mp3", lastModified: Date.now() };

    const audioBlob = new Blob([arrayBuffer], blobOptions);
    const audioUrl = URL.createObjectURL(audioBlob);

    const audio = new Audio(audioUrl);

    audio.play();
    dispatch(setIsPlayingTTS(true));

    audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        dispatch(setIsPlayingTTS(false));

        console.log("Audio playback finished.");
    };

    audio.onerror = (error: any) => {
        dispatch(setIsPlayingTTS(false));

        console.error("Error playing audio:", error);
    };
}
