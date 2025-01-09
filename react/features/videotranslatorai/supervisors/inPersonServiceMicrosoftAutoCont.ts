import * as speechsdk from "microsoft-cognitiveservices-speech-sdk";

import { IReduxState } from "../../app/types";
import { toState } from "../../base/redux/functions";
import { setMicrosoftRecognizerSDK } from "../action.web";
import fetchAzureToken from "../services/fetchAzureToken"; // Adjust the path as necessary
import { createMessageStorageSendTranslationToDatabase } from "../services/messageService";
import translateTextMicrosoft from "../services/textToTextTranslateMicrosoft";
import { getElapsedTime } from "../helpers";
let recording = false;

export const inPersonServiceMicrosoftAutoCont = async (
    dispatch: any,
    getState: any,
    langPersonOneTranscription: any,
    langPersonOneTranslation: any,
    langPersonTwoTranscription: any,
    langPersonTwoTranslation: any,
    personOneName: any = "",
    personTwoName: any = "",
    langPersonOneTranscriptionId: any = "",
    langPersonOneTranslationId: any = "",
    langPersonTwoTranscriptionId: any = "",
    langPersonTwoTranslationId: any = "",
    whichPerson: React.MutableRefObject<number> // Add whichPerson as a parameter
) => {
    const state: IReduxState = getState();

    recording = true;
    const tokenData = toState(state)["features/videotranslatorai"].jwtToken;
    const participantState = toState(state)["features/base/participants"];
    const participantData = toState(state)["features/videotranslatorai"].participantData;
    const meetingData: any = toState(state)["features/videotranslatorai"].meetingData;
    const moderatorData = toState(state)["features/videotranslatorai"].moderatorData;
    const entityData: any = toState(state)["features/videotranslatorai"].thisEntityData;
    const conference = toState(state)["features/base/conference"].conference;
    const conferenceStartTime = toState(state)["features/base/conference"].conferenceTimestamp;
    const clientId = toState(state)["features/videotranslatorai"].clientId;
    const meetingId = toState(state)["features/videotranslatorai"].meetingId;
    const participantAndModeratorData = [...moderatorData, ...participantData];
    const participantLanguageName = "";

    const baseEndpoint = process.env.REACT_APP_MICROSOFT_SPEECH_TO_TEXT_ENDPOINT;
    const speechRegion = process.env.REACT_APP_SPEECH_REGION_MICROSOFT_SDK;

    // Error checking for environment variables
    if (!speechRegion || !baseEndpoint) {
        throw new Error("Required environment variables are missing.");
    }

    try {
        // langFrom = participant.transcriptionDialect.dialectCode;
        // langFromTranslation = participant.translationDialect.dialectCode;
        let authToken = "";

        authToken = await fetchAzureToken(speechRegion, tokenData);
        const speechConfig = speechsdk.SpeechConfig.fromAuthorizationToken(authToken, speechRegion);
        const audioConfig = speechsdk.AudioConfig.fromDefaultMicrophoneInput();

        // Step 2: Set up auto-detection for languages
        const autoDetectSourceLanguageConfig = speechsdk.AutoDetectSourceLanguageConfig.fromLanguages([
            langPersonOneTranscription,
            langPersonTwoTranscription,
        ]);

        let speechRecognizer: any = null;

        if (!state["features/videotranslatorai"].microsoftRecognizerSDK) {
            speechRecognizer = speechsdk.SpeechRecognizer.FromConfig(
                speechConfig,
                autoDetectSourceLanguageConfig,
                audioConfig
            );

            dispatch(setMicrosoftRecognizerSDK(speechRecognizer));
        } else {
            speechRecognizer = state["features/videotranslatorai"].microsoftRecognizerSDK;
        }

        if (!speechRecognizer) {
            throw new Error("No sdk present.");
        }

        speechRecognizer.recognizing = async (s: any, e: speechsdk.SpeechRecognitionEventArgs) => {
            if (!recording) {
                speechRecognizer.stopContinuousRecognitionAsync(
                    () => {
                        console.log("Recognizer stopped. Restarting...");
                    },
                    (err: any) => {
                        console.error("Error stopping recognizer:", err);
                    }
                );
            }

            const detectedLanguage = e.result.language;
            const transcriptionText = e.result.text;

            let translationText = "";
            let dialectIdTo = "";
            let dialectIdFrom = "";
            let participantName = "";

            const elapsedTime = getElapsedTime(conferenceStartTime, new Date().getTime(), true);

            if (detectedLanguage === langPersonOneTranscription) {
                translationText = await translateTextMicrosoft(
                    transcriptionText,
                    tokenData,
                    langPersonTwoTranslationId,
                    langPersonOneTranslationId,
                    "australiaeast",
                    meetingId,
                    clientId,
                    entityData.type === 'MODERATOR' ? entityData.moderatorId : entityData.participantId,
                    elapsedTime
                );

                participantName = personOneName;
                dialectIdTo = langPersonTwoTranslationId;
                dialectIdFrom = langPersonOneTranslationId;

                console.log(`Translation: ${translationText}`);
            }

            if (detectedLanguage === langPersonTwoTranscription) {
                translationText = await translateTextMicrosoft(
                    transcriptionText,
                    tokenData,
                    langPersonOneTranslationId,
                    langPersonTwoTranslationId,
                    "australiaeast",
                    meetingId,
                    clientId,
                    entityData.type === 'MODERATOR' ? entityData.moderatorId : entityData.participantId,
                    elapsedTime
                );

                participantName = personTwoName;
                dialectIdTo = langPersonOneTranslationId;
                dialectIdFrom = langPersonTwoTranslationId;

                console.log(`Translation: ${translationText}`);
            }

            let participantId = "";

            if (conference) {
                participantId = conference.myUserId();
            }

            const translationSent = `${participantName}: ${translationText}(videotranslatoraiservice)`;

            await conference?.sendPrivateTextMessage(participantId, translationSent);

            console.log(`Recognizing: ${e.result.text}`);
        };

        // Handle recognized event (final results)
        speechRecognizer.recognized = async (s: any, e: speechsdk.SpeechRecognitionEventArgs) => {
            if (e.result.reason === speechsdk.ResultReason.RecognizedSpeech) {
                const languageDetectionResult = speechsdk.AutoDetectSourceLanguageResult.fromResult(e.result);
                const detectedLanguage = languageDetectionResult.language;
                const transcriptionText = e.result.text;

                const recognizerElapsedTime = getElapsedTime(conferenceStartTime, new Date().getTime(), true);

                console.log(`Detected Language: ${detectedLanguage}`);
                console.log(`Transcription: ${transcriptionText}`);

                let translationText = "";
                let dialectIdTo = "";
                let dialectIdFrom = "";
                let participantName = "";

                if (detectedLanguage === langPersonOneTranscription) {
                    translationText = await translateTextMicrosoft(
                        transcriptionText,
                        tokenData,
                        langPersonTwoTranslationId,
                        langPersonOneTranslationId,
                        "australiaeast",
                        meetingId,
                        clientId,
                        entityData.type === 'MODERATOR' ? entityData.moderatorId : entityData.participantId,
                        recognizerElapsedTime
                    );

                    participantName = personOneName;
                    dialectIdTo = langPersonTwoTranslationId;
                    dialectIdFrom = langPersonOneTranslationId;
                    whichPerson.current = 1;
                    console.log(`Translation: ${translationText}`);
                }

                if (detectedLanguage === langPersonTwoTranscription) {
                    translationText = await translateTextMicrosoft(
                        transcriptionText,
                        tokenData,
                        langPersonOneTranslationId,
                        langPersonTwoTranslationId,
                        "australiaeast",
                        meetingId,
                        clientId,
                        entityData.type === 'MODERATOR' ? entityData.moderatorId : entityData.participantId,
                        recognizerElapsedTime
                    );

                    participantName = personTwoName;
                    dialectIdTo = langPersonOneTranslationId;
                    dialectIdFrom = langPersonTwoTranslationId;
                    whichPerson.current = 2;

                    console.log(`Translation: ${translationText}`);
                }

                let participantId = "";

                if (conference) {
                    participantId = conference.myUserId();
                }

                const translationSent = `${participantName}: ${translationText}(videotranslatoraiservice:::) (completed)`;

                await conference?.sendPrivateTextMessage(participantId, translationSent);
                const messageData: any = {
                    meeting_project_id: meetingId,
                    client_id: clientId,
                    dialect_from: dialectIdFrom,
                    dialect_to: dialectIdTo,
                    original_text: transcriptionText,
                    translated_text: translationText,
                };

                if (entityData.type === "MODERATOR") {
                    messageData.moderator_id = entityData.moderatorId;
                } else if (entityData.type === "PARTICIPANT") {
                    messageData.participant_id = entityData.participantId;
                }

                await createMessageStorageSendTranslationToDatabase(messageData, tokenData);

                speechRecognizer.stopContinuousRecognitionAsync(
                    () => {
                        console.log("Recognizer stopped. Restarting...");
                        if (recording) {
                            speechRecognizer.startContinuousRecognitionAsync(
                                () => {
                                    console.log("Recognizer restarted.");
                                },
                                (err: any) => {
                                    console.error("Error restarting recognizer:", err);
                                }
                            );
                        }
                    },
                    (err: any) => {
                        console.error("Error stopping recognizer:", err);
                    }
                );
            } else {
                console.error("Recognition failed:", e.result.reason);
            }
        };

        speechRecognizer.sessionStopped = (s: any, e: any) => {
            console.log("Session stopped. Continuous recognition terminated.");
            speechRecognizer.stopContinuousRecognitionAsync();
        };

        speechRecognizer.canceled = (s: any, e: any) => {
            console.error(`Canceled: ${e.reason}`);
            speechRecognizer.stopContinuousRecognitionAsync();
        };

        speechRecognizer.startContinuousRecognitionAsync(
            () => {
                console.log("Continuous recognition started.");
            },
            (err: any) => {
                console.error("Error starting continuous recognition:", err);
            }
        );
    } catch (err: any) {
        console.error("Error during transcription and translation:", err);
    }
};

export const stopTranscriptionAutoService = (dispatch: any, state: any) =>
    new Promise<void>((resolve, reject) => {
        const recognizerSdk = state["features/videotranslatorai"].microsoftRecognizerSDK;

        if (!recognizerSdk) {
            console.error("SDK recognizer not set");
            reject(new Error("SDK recognizer not set"));

            return;
        }

        try {
            recognizerSdk.stopContinuousRecognitionAsync(
                () => {
                    console.log("Continuous recognition stopped.");
                    recording = false;
                    resolve();
                },
                (err: any) => {
                    console.error("Error stopping continuous recognition:", err);
                    reject(err);
                }
            );
        } catch (err: any) {
            console.error("Error during stop process:", err);
            reject(err);
        }
    });
