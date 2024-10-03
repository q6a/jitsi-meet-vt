import * as speechsdk from "microsoft-cognitiveservices-speech-sdk";

import { IReduxState } from "../../app/types";
import { toState } from "../../base/redux/functions";
import { setIsTranscribing, setMicrosoftRecognizerSDK } from "../action.web";

import { getAuthToken } from "./authService";
import { createMessageStorageSendTranslationToDatabase } from "./messageService";

export const transcribeAndTranslateService = async (dispatch: any, getState: any) => {
    const state: IReduxState = getState();

    // const state: IReduxState = store.getState(); // Directly accessing the Redux state from the store
    const tokenData = toState(state)["features/videotranslatorai"].jwtToken;
    const participantState = toState(state)["features/base/participants"];
    const participantData = toState(state)["features/videotranslatorai"].participantData;
    const participantName = toState(state)["features/videotranslatorai"].participantName;
    const meetingData: any = toState(state)["features/videotranslatorai"].meetingData;
    const moderatorData = toState(state)["features/videotranslatorai"].moderatorData;
    const entityData: any = toState(state)["features/videotranslatorai"].thisEntityData;
    const conference = toState(state)["features/base/conference"].conference;
    let participantLanguageName = "";
    const clientId = toState(state)["features/videotranslatorai"].clientId;
    const meetingId = toState(state)["features/videotranslatorai"].meetingId;
    const participantAndModeratorData = [...moderatorData, ...participantData];

    try {
        let authToken = "";
        const speechRegion = process.env.REACT_APP_SPEECH_REGION_MICROSOFT_SDK;
        const subscriptionKey = process.env.REACT_APP_SUBSCRIPTION_KEY_MICROSOFT_SDK;

        // Error checking for environment variables
        if (!speechRegion || !subscriptionKey) {
            throw new Error("Required environment variables are missing.");
        }
        let langFrom = "en-AU";

        // Find the local participant's language name
        for (const participant of participantAndModeratorData) {
            if (participant.name === participantName) {
                langFrom = participant.transcriptionDialect.dialectCode;
                break;
            }
        }

        authToken = await getAuthToken();
        const translationConfig = speechsdk.SpeechTranslationConfig.fromAuthorizationToken(authToken, speechRegion);

        translationConfig.speechRecognitionLanguage = langFrom || "en-US";
        for (const participant of participantAndModeratorData) {
            if (participant.transcriptionDialect.dialectCode) {
                translationConfig.addTargetLanguage(participant.transcriptionDialect.dialectCode);
            } else {
                console.error(`No dialect code found for participant: ${participant.name}`);
            }
        }
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
        dispatch(setIsTranscribing(true));

        // Add recognizing, recognized, and canceled events as in your initial code...
        transcriberRecognizer.recognizing = async (s, e) => {
            if (e.result.reason === 7) {
                const transcription = e.result.text;
                const translationMap = e.result.translations;
                let languagesRecognizing: any[] = [];

                if (translationMap) {
                    languagesRecognizing = translationMap.languages;
                }

                // Create a Map of participant IDs to names
                let participantMapRecognizing = new Map();

                if (participantState && participantState.remote) {
                    participantMapRecognizing = participantState.remote;
                }
                for (const shortLangCode of languagesRecognizing) {
                    let translationRecognizing = "";

                    translationRecognizing = translationMap.get(shortLangCode);
                    const langPrefix = shortLangCode.includes("-") ? shortLangCode.split("-")[0] : shortLangCode;
                    const participants: any = participantAndModeratorData.filter((p) =>
                        p.translationDialect?.dialectCode?.startsWith(langPrefix)
                    );

                    for (const participant of participants) {
                        // Get participant ID from participantMap
                        let participantId = null;

                        for (const [key, value] of participantMapRecognizing.entries()) {
                            if (value.name === participant.name) {
                                participantId = key;
                                break;
                            }
                        }

                        if (participantId) {
                            const translationSentRecognizing = `${participantName}: ${translationRecognizing}(videotranslatoraiservice)`;

                            if (conference) {
                                await conference.sendPrivateTextMessage(participantId, translationSentRecognizing);
                            }
                            const messagesToDate = toState(state)["features/videotranslatorai"].messages;

                            // store.dispatch(addMessageVideoTranslatorAI({
                            //     displayName: participantName,
                            //     hasRead: true,
                            //     participantId: participantId,
                            //     messageType: 'local',
                            //     message: translationSentRecognizing,
                            //     privateMessage: true,
                            //     timestamp: Date.now(),
                            //     isReaction: false,
                            //     recipient: participant.name,
                            //     error: null,
                            //     messageId: null,
                            //     lobbyChat: null,
                            // }));
                            // store.dispatch(addMessage({
                            //     displayName: participantName,
                            //     hasRead: true,
                            //     id: participantId,
                            //     messageType: 'local',
                            //     message: translationSentRecognizing,
                            //     privateMessage: true,
                            //     timestamp: Date.now(),
                            //     isReaction: false,
                            //     recipient: participant.name,
                            // }));
                            // store.dispatch(addMessage({
                            //     displayName: participantName,
                            //     hasRead: true,
                            //     id: participantId,
                            //     messageType: 'local',
                            //     message: translationSentRecognizing,
                            //     privateMessage: true,
                            //     timestamp: Date.now(),
                            //     isReaction: false,
                            //     istranslationon: true
                            // }));
                        }
                    }
                }
            }
        };
        transcriberRecognizer.recognized = async (s, e) => {
            if (e.result.reason === speechsdk.ResultReason.TranslatedSpeech) {
                const transcription = e.result.text;
                const translationMap = e.result.translations;
                let languagesRecognized: any[] = [];

                if (translationMap) {
                    languagesRecognized = translationMap.languages;
                }

                // Create a Map of participant IDs to names
                let participantMapRecognized = new Map();

                if (participantState && participantState.remote) {
                    participantMapRecognized = participantState.remote;
                }
                for (let i = 0; i < languagesRecognized.length; i++) {
                    const shortLangCode = languagesRecognized[i];
                    let translationRecognized = "";

                    translationRecognized = translationMap.get(languagesRecognized[i]);
                    const langPrefix = shortLangCode.includes("-") ? shortLangCode.split("-")[0] : shortLangCode;
                    const participants: any = participantAndModeratorData.filter((p) =>
                        p.translationDialect?.dialectCode?.startsWith(langPrefix)
                    );

                    for (const participant of participants) {
                        // Get participant ID from participantMap
                        let participantId = null;

                        for (const [key, value] of participantMapRecognized.entries()) {
                            if (value.name === participant.name) {
                                participantId = key;
                                break;
                            }
                        }
                        if (participantId) {
                            const translationSentRecognized = `${participantName}: ${translationRecognized}(videotranslatoraiservice)`;

                            if (conference) {
                                await conference.sendPrivateTextMessage(participantId, translationSentRecognized);
                            }
                            const messageData: any = {
                                meeting_project_id: meetingId,
                                client_id: clientId,
                                dialect_from: entityData.transcriptionDialect.dialectId,
                                dialect_to: participant.translationDialect.dialectId,
                                original_text: transcription,
                                translated_text: translationRecognized,
                            };

                            if (entityData.type === "MODERATOR") {
                                messageData.moderator_id = entityData.moderatorId;
                            } else if (entityData.type === "PARTICIPANT") {
                                messageData.participant_id = entityData.participantId;
                            }
                            createMessageStorageSendTranslationToDatabase(messageData, tokenData);

                            // dispatch(addMessage({
                            //     displayName: participantName,
                            //     hasRead: true,
                            //     id: participantId,
                            //     messageType: 'local',
                            //     message: translation,
                            //     privateMessage: true,
                            //     timestamp: Date.now(),
                            //     isReaction: false,
                            //     istranslationon: true
                            // }));
                        }
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
            setIsTranscribing(false);
        };
        transcriberRecognizer.sessionStopped = (s, e) => {
            transcriberRecognizer.stopContinuousRecognitionAsync();
            setIsTranscribing(false);
        };
    } catch (err) {
        console.error("Error during transcription:", err);
    }
};

export const stopTranscriptionService = (dispatch: any, getState: any) =>
    new Promise<void>((resolve, reject) => {
        const state: IReduxState = getState();
        const recognizerSdk = state["features/videotranslatorai"].microsoftRecognizerSDK;

        if (!recognizerSdk) {
            console.error("SDK recognizer not set");
            reject(new Error("SDK recognizer not set"));

            return;
        }
        recognizerSdk.stopContinuousRecognitionAsync(
            () => {
                dispatch(setIsTranscribing(false));
                resolve();
            },
            (err: any) => {
                console.error("Error stopping transcription:", err);
                reject(err);
            }
        );
    });
