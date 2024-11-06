import { getWaveBlob } from "webm-to-wav-converter";

import { IReduxState } from "../../app/types";
import { toState } from "../../base/redux/functions";
import fetchAzureToken from "../services/fetchAzureToken"; // Adjust the path as necessary
import { createMessageStorageSendTranslationToDatabase } from "../services/messageService";
import translateTextMicrosoft from "../services/textToTextTranslateMicrosoft";

export const transcribeAndTranslateServiceMicrosoftMan = async (dispatch: any, getState: any, audioBlob: Blob) => {
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
    const participantLanguageName = "";
    const clientId = toState(state)["features/videotranslatorai"].clientId;
    const meetingId = toState(state)["features/videotranslatorai"].meetingId;
    const participantAndModeratorData = [...moderatorData, ...participantData];
    const baseEndpoint = process.env.REACT_APP_MICROSOFT_SPEECH_TO_TEXT_ENDPOINT;

    try {
        let authToken = "";
        const speechRegion = process.env.REACT_APP_SPEECH_REGION_MICROSOFT_SDK;

        // Error checking for environment variables
        if (!speechRegion || !baseEndpoint) {
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

        const audioBlobConvert = await getWaveBlob(audioBlob, true);

        // Step 3: Set up the API endpoint and headers
        const endpoint = `${baseEndpoint}?language=${langFrom}`;

        const headers = {
            "Content-Type": "audio/wav",
            Authorization: `Bearer ${authToken}`,
        };

        // Step 4: Make the API request
        const response = await fetch(endpoint, {
            method: "POST",
            headers,
            body: audioBlobConvert,
        });

        // Step 5: Parse the response
        if (!response.ok) {
            const errorDetails = await response.json();

            throw new Error(`Transcription error: ${errorDetails.error.message}`);
        }

        const data = await response.json();

        const transcriptionText = data.DisplayText;

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
    } catch (err) {
        console.error("Error during transcription:", err);
    }
};
