import { IReduxState } from "../../app/types";

// Import Azure Speech SDK
const sdk = require("microsoft-cognitiveservices-speech-sdk");

let isPlaying = false;

export async function playVoiceFromMessage(text: any, state: IReduxState, textToSpeechCode: string) {
    if (isPlaying) {
        console.log("Audio is already playing. Skipping...");

        return;
    }
    isPlaying = true;

    const subscriptionKey = process.env.REACT_APP_MICROSOFT_TTS_API_KEY_AUSTRALIAEAST; // Replace with your actual key
    const region = "australiaeast"; // Your Azure region

    // let textToSpeechCode = toState(state)["features/videotranslatorai"].textToSpeechCode;

    textToSpeechCode = textToSpeechCode.split(" ")[0];

    if (!subscriptionKey || !region) {
        throw new Error("One or more required variables are not set.");
    }

    const messageContent = text.includes(":") ? text.split(":")[1].trim() : text;

    try {
        // Step 1: Set up Speech SDK configuration for Azure
        const speechConfig = sdk.SpeechConfig.fromSubscription(subscriptionKey, region);

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
        isPlaying = false; // Reset isPlaying on error
    }
}
