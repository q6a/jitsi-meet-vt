import { getWaveBlob } from "webm-to-wav-converter";

import { IReduxState } from "../../app/types";
import { toState } from "../../base/redux/functions";
import fetchAzureToken from "../services/fetchAzureToken"; // Adjust the path as necessary
import { createMessageStorageSendTranslationToDatabase } from "../services/messageService";
import translateTextMicrosoft from "../services/textToTextTranslateMicrosoft";

export const inPersonServiceMicrosoftMan = async (
    dispatch: any,
    getState: any,
    recordedBlobParam: any,
    langFrom: any,
    langFromTranslation: any = "",
    participantName: any = "",
    dialectIdFrom: any = "",
    dialectIdTo: any = "",
    isMessageCompleted = false
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
        const audioBlobConvert = await getWaveBlob(recordedBlobParam, true);

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

        console.log("Transcription Text", data.DisplayText);

        const transcriptionText = data.DisplayText;

        await Promise.all(
            participantAndModeratorData.map(async (participant) => {
                if (
                    participant.translationDialect.dialectCode &&
                    participant.transcriptionDialect.dialectCode !== langFrom &&
                    conference
                ) {
                    try {
                        const translationText = await translateTextMicrosoft(
                            transcriptionText,
                            tokenData,
                            participant.translationDialect.dialectCode,
                            langFromTranslation,
                            "australiaeast"
                        );

                        let translationSent = "";

                        if (isMessageCompleted) {
                            translationSent = `${participantName}: ${translationText}(videotranslatoraiservice:::) (completed)`;
                        } else {
                            translationSent = `${participantName}: ${translationText} (videotranslatoraiservice)`;
                        }

                        let participantId = "";

                        if (conference) {
                            participantId = conference.myUserId();
                        }

                        // arrayPromises.push(await conference.sendPrivateTextMessage(participantId, translationSent));
                        await conference.sendPrivateTextMessage(participantId, translationSent);
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
                    participant.transcriptionDialect.dialectCode !== langFrom
                ) {
                    try {
                        const translationSent = "dummy_message_xxyy (videotranslatoraiservice)";
                        let participantId = "";

                        if (conference) {
                            participantId = conference.myUserId();
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

        // Await all translation promises
    } catch (err) {
        console.error("Error during transcription and translation:", err);
    }
};
