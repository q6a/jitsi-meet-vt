import { getWaveBlob } from "webm-to-wav-converter";

import { IReduxState } from "../../app/types";
import { toState } from "../../base/redux/functions";
import { createMessageStorageSendTranslationToDatabase } from "../services/messageService";
import translateTextMicrosoft from "../services/textToTextTranslateMicrosoft";
import transcribeAudioMicrosoft from "../services/transcribeAudioMicrosoft";

export const inPersonServiceMicrosoftMan = async (
    dispatch: any,
    getState: any,
    recordedBlobParam: any,
    langFrom: any,
    langFromTranslation: any = "",
    participantName: any = "",
    dialectIdFrom: any = "",
    dialectIdTo: any = "",
    langFromTranslationId: any = "",
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

    const baseEndpoint = process.env.REACT_APP_TRANSCRIBE_MICROSOFT_API_ENDPOINT;
    const speechRegion = process.env.REACT_APP_SPEECH_REGION_MICROSOFT_SDK;

    // Error checking for environment variables
    if (!speechRegion || !baseEndpoint) {
        throw new Error("Required environment variables are missing.");
    }

    try {
        const audioBlobConvert = await getWaveBlob(recordedBlobParam, true);

        const transcriptionText = await transcribeAudioMicrosoft(
            langFrom,
            audioBlobConvert,
            baseEndpoint,
            tokenData,
            meetingId,
            clientId
        );

        console.log("Transcription Text", transcriptionText);

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
                            participant.translationDialect.dialectId,
                            langFromTranslationId,
                            "australiaeast",
                            meetingId,
                            clientId
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
