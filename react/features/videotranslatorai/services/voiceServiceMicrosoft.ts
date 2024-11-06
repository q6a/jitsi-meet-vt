import { IReduxState } from "../../app/types";
import { toState } from "../../base/redux/functions";

import fetchAzureToken from "./fetchAzureToken"; // Adjust the path as necessary

// Import Azure Speech SDK
const sdk = require("microsoft-cognitiveservices-speech-sdk");

let isPlaying = false;

export async function playVoiceFromMessage(text: any, state: IReduxState, textToSpeechCode: string) {
    const region = "australiaeast"; // Your Azure region
    const authToken = toState(state)["features/videotranslatorai"].jwtToken;

    textToSpeechCode = textToSpeechCode.split(" ")[0];

    if (!region || !authToken) {
        throw new Error("One or more required variables are not set.");
    }

    const messageContent = text.includes(":") ? text.split(":")[1].trim() : text;

    try {
        const azureToken = await fetchAzureToken(region, authToken);

        if (!azureToken) {
            throw new Error("Failed to retrieve Azure token.");
        }

        // Step 1: Set up Speech SDK configuration for Azure
        const speechConfig = sdk.SpeechConfig.fromAuthorizationToken(azureToken, region);

        // Set the voice and language you want to use (e.g., Indonesian male voice)
        speechConfig.speechSynthesisVoiceName = textToSpeechCode;

        // Step 2: Configure Audio Output
        const audioConfig = sdk.AudioConfig.fromDefaultSpeakerOutput();

        // Step 3: Create the speech synthesizer
        const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

        // Step 4: Synthesize the speech
        synthesizer.speakTextAsync(
            messageContent,
            (result: any) => {
                if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
                    console.log("Synthesis completed successfully.");
                } else {
                    console.error(`Speech synthesis failed: ${result.errorDetails}`);
                }
                synthesizer.close();
                isPlaying = false; // Reset after synthesis completes
            },
            (error: any) => {
                console.error("Error during speech synthesis:", error);
                synthesizer.close();
                isPlaying = false; // Reset in case of an error
            }
        );
    } catch (error: any) {
        console.error("Error generating speech:", error.message);
    }
}
