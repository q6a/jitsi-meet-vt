import { IReduxState } from "../../app/types";
import { toState } from "../../base/redux/functions";
import translateTextMicrosoft from "../services/textToTextTranslateMicrosoft";
import transcribeAudioOpenAi from "../services/transcribeAudioOpenAi";

import { createMessageStorageSendTranslationToDatabase } from "../services/messageService";

export const inPersonServiceOpenAi = async (
    dispatch: any,
    getState: any,
    recordedBlobParam: any,
    langFrom: any,
    langFromTranslation: any = "",
    participantName: any = ""
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

    const translateApiKey = process.env.REACT_APP_MICROSOFT_TRANSLATE_API_KEY;
    const transcriptionEndpoint = process.env.REACT_APP_OPENAI_TRANSCRIPTION_ENDPOINT;
    const translationEndpoint = process.env.REACT_APP_MICROSOFT_TRANSLATION_ENDPOINT;
    const apiEndpoint = process.env.REACT_APP_OPENAI_TRANSCRIBE_ENDPOINT_VIDEOTRANSLATORAI; // New API endpoint

    if (!translateApiKey || !transcriptionEndpoint || !translationEndpoint || !apiEndpoint) {
        throw new Error("One or more environment variables are not set.");
    }

    try {
        // langFrom = participant.transcriptionDialect.dialectCode;
        // langFromTranslation = participant.translationDialect.dialectCode;

        const transcriptionText = await transcribeAudioOpenAi(langFrom, recordedBlobParam.blob, apiEndpoint, tokenData);

        console.log("TRANSCRIPTION TEXT", transcriptionText);
        if (!transcriptionText) {
            throw new Error("Transcription failed: No text returned.");
        }

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
                            translateApiKey,
                            participant.translationDialect.dialectCode,
                            translationEndpoint
                        );

                        const translationSent = `${participantName}: ${translationText} (videotranslatoraiservice)`;

                        let participantId = "";

                        if (conference) {
                            participantId = conference.myUserId();
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
                    participant.transcriptionDialect.dialectCode !== langFrom
                ) {
                    try {
                        const translationSent = " (videotranslatoraiservice)";
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
