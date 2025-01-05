import * as speechsdk from "microsoft-cognitiveservices-speech-sdk";

import { IReduxState } from "../../app/types";
import { toState } from "../../base/redux/functions";
import { setMicrosoftRecognizerSDK } from "../action.web";
import fetchAzureToken from "../services/fetchAzureToken"; // Adjust the path as necessary
import { createMessageStorageSendTranslationToDatabase } from "../services/messageService";
import genericUsageIntake from "../services/usageService";

export const inPersonServiceMicrosoftCont = async (
    dispatch: any,
    getState: any,
    langFrom: any,
    langTo: any,
    participantName: any = "",
    dialectIdFrom: any = "",
    dialectIdTo: any = ""
) => {
    const state: IReduxState = getState();

    const tokenData = toState(state)["features/videotranslatorai"].jwtToken;
    const participantState = toState(state)["features/base/participants"];
    const participantData = toState(state)["features/videotranslatorai"].participantData;
    const meetingData: any = toState(state)["features/videotranslatorai"].meetingData;
    const moderatorData = toState(state)["features/videotranslatorai"].moderatorData;
    const entityData: any = toState(state)["features/videotranslatorai"].thisEntityData;
    const conference = toState(state)["features/base/conference"].conference;
    const clientId = toState(state)["features/videotranslatorai"].clientId;
    const meetingId = toState(state)["features/videotranslatorai"].meetingId;
    const participantAndModeratorData = [...moderatorData, ...participantData];
    let participantLanguageName = "";

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
        const translationConfig = speechsdk.SpeechTranslationConfig.fromAuthorizationToken(authToken, speechRegion);

        translationConfig.speechRecognitionLanguage = langFrom || "en-US";

        translationConfig.addTargetLanguage(langTo);

        if (translationConfig.targetLanguages.length === 0) {
            throw new Error("No target languages were added.");
        }

        const audioConfig = speechsdk.AudioConfig.fromDefaultMicrophoneInput();
        const transcriberRecognizer = new speechsdk.TranslationRecognizer(translationConfig, audioConfig);

        dispatch(setMicrosoftRecognizerSDK(transcriberRecognizer));

        const phraseList = speechsdk.PhraseListGrammar.fromRecognizer(transcriberRecognizer);

        for (const participant of participantAndModeratorData) {
            if (participant.name === participantName) {
                participantLanguageName = participant.transcriptionDialect.language.name;
                break;
            }
        }

        if (meetingData.dictionaryWordKeyPairs && meetingData.dictionaryWordKeyPairs[participantLanguageName]) {
            const phraselistitems = meetingData.dictionaryWordKeyPairs[participantLanguageName];

            for (const item of phraselistitems) {
                phraseList.addPhrase(item);
            }
        } else {
            console.warn(`No dictionary entries found for language: ${participantLanguageName}`);
        }

        transcriberRecognizer.startContinuousRecognitionAsync();

        // Add recognizing, recognized, and canceled events as in your initial code...
        transcriberRecognizer.recognizing = async (s, e) => {
            if (e.result.reason === 7) {
                const transcription = e.result.text;
                const translationMap = e.result.translations;
                let languagesRecognizing: any[] = [];

                await genericUsageIntake(
                    transcription,
                    "speech-to-text-microsoft",
                    "microsoft",
                    meetingId,
                    clientId,
                    tokenData,
                    ((e.result.duration / 10_000_000) / 2).toString()
                );

                if (translationMap) {
                    languagesRecognizing = translationMap.languages;
                }
                console.log("Transcription", transcription);

                for (const shortLangCode of languagesRecognizing) {
                    let translationRecognizing = "";

                    translationRecognizing = translationMap.get(shortLangCode);

                    let participantId = null;

                    if (conference) {
                        participantId = conference.myUserId();
                    }

                    await genericUsageIntake(
                        translationRecognizing,
                        "text-to-text-microsoft",
                        "microsoft",
                        meetingId,
                        clientId,
                        tokenData,
                        translationRecognizing.length
                    );

                    if (participantId) {
                        const translationSentRecognizing = `${participantName}: ${translationRecognizing}(videotranslatoraiservice)`;

                        if (conference) {
                            await conference.sendPrivateTextMessage(participantId, translationSentRecognizing);
                        }
                        const messagesToDate = toState(state)["features/videotranslatorai"].messages;
                    }
                }
            }
        };
        transcriberRecognizer.recognized = async (s, e) => {
            if (e.result.reason === speechsdk.ResultReason.TranslatedSpeech) {
                const transcription = e.result.text;
                const translationMap = e.result.translations;
                let languagesRecognized: any[] = [];

                await genericUsageIntake(
                    transcription,
                    "speech-to-text-microsoft",
                    "microsoft",
                    meetingId,
                    clientId,
                    tokenData,
                    ((e.result.duration / 10_000_000) / 2).toString()
                );

                if (translationMap) {
                    languagesRecognized = translationMap.languages;
                }

                for (let i = 0; i < languagesRecognized.length; i++) {
                    let translationRecognized = "";

                    translationRecognized = translationMap.get(languagesRecognized[i]);

                    let participantId = null;

                    if (conference) {
                        participantId = conference.myUserId();
                    }

                    await genericUsageIntake(
                        translationRecognized,
                        "text-to-text-microsoft",
                        "microsoft",
                        meetingId,
                        clientId,
                        tokenData,
                        translationRecognized.length
                    );

                    if (participantId) {
                        const translationSentRecognized = `${participantName}: ${translationRecognized}(videotranslatoraiservice:::) (completed)`;

                        if (conference) {
                            await conference.sendPrivateTextMessage(participantId, translationSentRecognized);
                        }
                        const messageData: any = {
                            meeting_project_id: meetingId,
                            client_id: clientId,
                            dialect_from: dialectIdFrom,
                            dialect_to: dialectIdTo,
                            original_text: transcription,
                            translated_text: translationRecognized,
                        };

                        if (entityData.type === "MODERATOR") {
                            messageData.moderator_id = entityData.moderatorId;
                        } else if (entityData.type === "PARTICIPANT") {
                            messageData.participant_id = entityData.participantId;
                        }
                        createMessageStorageSendTranslationToDatabase(messageData, tokenData);
                    }
                }
            }
        };
        transcriberRecognizer.canceled = (s, e) => {
            console.error(`CANCELED: ${e.reason}`);
            if (e.reason === speechsdk.CancellationReason.Error) {
                console.error(`ERROR: ${e.errorDetails}`);
            }
            transcriberRecognizer.stopContinuousRecognitionAsync();
        };
        transcriberRecognizer.sessionStopped = (s, e) => {
            transcriberRecognizer.stopContinuousRecognitionAsync();
        };

        // Await all translation promises
    } catch (err) {
        console.error("Error during transcription and translation:", err);
    }
};

export const stopTranscriptionService = (dispatch: any, state: any) =>
    new Promise<void>((resolve, reject) => {
        const recognizerSdk = state["features/videotranslatorai"].microsoftRecognizerSDK;

        if (!recognizerSdk) {
            console.error("SDK recognizer not set");
            reject(new Error("SDK recognizer not set"));

            return;
        }
        recognizerSdk.stopContinuousRecognitionAsync(
            () => {
                resolve();
                state["features/videotranslatorai"].microsoftRecognizerSDK = null;
            },
            (err: any) => {
                console.error("Error stopping transcription:", err);
                reject(err);
                state["features/videotranslatorai"].microsoftRecognizerSDK = null;
            }
        );
    });
