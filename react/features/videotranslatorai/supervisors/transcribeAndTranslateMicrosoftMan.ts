import * as speechsdk from "microsoft-cognitiveservices-speech-sdk";

import { IReduxState } from "../../app/types";
import { toState } from "../../base/redux/functions";
import { setIsTranscribing } from "../action.web";
import fetchAzureToken from "../services/fetchAzureToken"; // Adjust the path as necessary
import translateTextMicrosoft from "../services/textToTextTranslateMicrosoft";

export const transcribeAndTranslateServiceMicrosoftMan = async (dispatch: any, getState: any, audioBlob: any) => {
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

        // Error checking for environment variables
        if (!speechRegion) {
            throw new Error("Required environment variables are missing.");
        }
        let langFrom = "en-AU";

        // Find the local participant's language name
        for (const participant of participantAndModeratorData) {
            if (participant.name === participantName) {
                langFrom = participant.transcriptionDialect?.dialectCode || langFrom;

                break;
            }
        }

        authToken = await fetchAzureToken(speechRegion, tokenData);

        // authToken = await getAuthToken();
        const transcriptionConfig = speechsdk.SpeechTranslationConfig.fromAuthorizationToken(authToken, speechRegion);

        transcriptionConfig.speechRecognitionLanguage = langFrom || "en-US";

        // Convert Blob to ArrayBuffer
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = new Uint8Array(arrayBuffer);

        // Use the AudioConfig.fromWavFileInput if the audio is in WAV format
        const audioInputStream = speechsdk.AudioInputStream.createPushStream();

        audioInputStream.write(audioBuffer.buffer);
        audioInputStream.close();

        for (const participant of participantAndModeratorData) {
            if (participant.transcriptionDialect.dialectCode) {
                transcriptionConfig.addTargetLanguage(participant.transcriptionDialect.dialectCode);
            } else {
                console.error(`No dialect code found for participant: ${participant.name}`);
            }
        }
        if (transcriptionConfig.targetLanguages.length === 0) {
            throw new Error("No target languages were added.");
        }
        const audioConfig = speechsdk.AudioConfig.fromStreamInput(audioInputStream);
        const transcriberRecognizer = new speechsdk.SpeechRecognizer(transcriptionConfig, audioConfig);

        // dispatch(setMicrosoftRecognizerSDK(transcriberRecognizer));
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
        let transcriptionText = "";

        transcriberRecognizer.recognized = (s, e) => {
            if (e.result.reason === speechsdk.ResultReason.RecognizedSpeech) {
                transcriptionText = e.result.text;

                console.log(`Transcribed Text: ${transcriptionText}`);

                // Handle transcription result (e.g., dispatch to Redux or further processing)
            }
        };

        console.log("TRANSCRIPTION TEXT", transcriptionText);

        await Promise.all(
            participantAndModeratorData.map(async (participant) => {
                if (
                    participant.translationDialect.dialectCode &&
                    participant.transcriptionDialect?.dialectCode !== langFrom &&
                    conference
                ) {
                    try {
                        const translationText = await translateTextMicrosoft(
                            transcriptionText,
                            tokenData,
                            participant.translationDialect.dialectCode,
                            langFrom,
                            "australiaeast"
                        );

                        const translationSent = `${participantName}: ${translationText} (videotranslatoraiservice)`;

                        let participantId = "";

                        for (const [key, value] of participantState.remote.entries()) {
                            if (value.name === participant.name) {
                                participantId = key;
                            }
                        }

                        // arrayPromises.push(await conference.sendPrivateTextMessage(participantId, translationSent));
                        await conference.sendPrivateTextMessage(participantId, translationSent);
                        const messageData: any = {
                            meeting_project_id: meetingId,
                            client_id: clientId,
                            dialect_from: entityData.transcriptionDialect.dialectId,
                            dialect_to: participant.translationDialect.dialectId,
                            original_text: transcriptionText,
                            translated_text: translationText,
                        };

                        if (entityData.type === "MODERATOR") {
                            messageData.moderator_id = entityData.moderatorId;
                        } else if (entityData.type === "PARTICIPANT") {
                            messageData.participant_id = entityData.participantId;
                        }

                        await createMessageStorageSendTranslationToDatabase(messageData, tokenData);

                        // dispatch(
                        //     addMessageVideoTranslatorAI({
                        //         displayName: participantName,
                        //         hasRead: true,
                        //         participantId,
                        //         messageType: "local",
                        //         message: translationSent,
                        //         privateMessage: true,
                        //         timestamp: Date.now(),
                        //         isReaction: false,
                        //         recipient: participant.name,
                        //         error: null,
                        //         messageId: null,
                        //         lobbyChat: null,
                        //     })
                        // );
                    } catch (error) {
                        console.error(`Error during translation for participant ${participant.name}:`, error);
                    }
                }
            })
        );

        // TODO: this is not the viable solution to send two at the same time, it's a temporary fix
        // TODO: try to work out another way of solving this problem
        // TODO: the issue is that when a single message is being sent, it only sends on pressing the button a second time

        await Promise.all(
            participantAndModeratorData.map(async (participant) => {
                if (
                    participant.translationDialect.dialectCode &&
                    participant.transcriptionDialect?.dialectCode !== langFrom
                ) {
                    try {
                        const translationSent = " (videotranslatoraiservice)";
                        let participantId = "";

                        for (const [key, value] of participantState.remote.entries()) {
                            if (value.name === participant.name) {
                                participantId = key;
                            }
                        }

                        if (participantId && conference) {
                            await conference.sendPrivateTextMessage(participantId, translationSent);
                        }
                    } catch (error) {
                        console.error(`Error during translation for participant ${participant.name}:`, error);
                    }
                }
            })
        );

        transcriberRecognizer.canceled = (s, e) => {
            console.error(`CANCELED: ${e.reason}`);
            if (e.reason === speechsdk.CancellationReason.Error) {
                console.error(`ERROR: ${e.errorDetails}`);
            }
            transcriberRecognizer.stopContinuousRecognitionAsync();
            dispatch(setIsTranscribing(false));
        };

        transcriberRecognizer.sessionStopped = (s, e) => {
            transcriberRecognizer.stopContinuousRecognitionAsync();
            dispatch(setIsTranscribing(false));
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
