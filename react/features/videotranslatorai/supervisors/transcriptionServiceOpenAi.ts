import { IReduxState } from "../../app/types";
import { toState } from "../../base/redux/functions";
import { createMessageStorageSendTranslationToDatabase } from "../services/messageService";
import translateTextMicrosoft from "../services/textToTextTranslateMicrosoft";
import transcribeAudioOpenAi from "../services/transcribeAudioOpenAi";

export const transcribeAndTranslateServiceOpenAi = async (
    dispatch: any,
    getState: any,
    recordedBlobParam: Blob,
    isMessageCompleted: boolean
) => {
    const state: IReduxState = getState();

    const tokenData = toState(state)["features/videotranslatorai"].jwtToken;
    const participantState = toState(state)["features/base/participants"];
    const participantName = toState(state)["features/videotranslatorai"].participantName;
    const participantData = toState(state)["features/videotranslatorai"].participantData;
    const meetingData: any = toState(state)["features/videotranslatorai"].meetingData;
    const moderatorData = toState(state)["features/videotranslatorai"].moderatorData;
    const entityData: any = toState(state)["features/videotranslatorai"].thisEntityData;
    const conference = toState(state)["features/base/conference"].conference;
    const clientId = toState(state)["features/videotranslatorai"].clientId;
    const meetingId = toState(state)["features/videotranslatorai"].meetingId;
    const participantAndModeratorData = [...moderatorData, ...participantData];

    const apiEndpoint = process.env.REACT_APP_OPENAI_TRANSCRIBE_ENDPOINT_VIDEOTRANSLATORAI; // New API endpoint

    if (!apiEndpoint) {
        throw new Error("One or more environment variables are not set.");
    }

    try {
        let langFrom = "en";
        let langFromTranslation = "en-AU";

        // Find the local participant's language name
        for (const participant of participantAndModeratorData) {
            if (participant.name === participantName) {
                langFrom = participant.transcriptionDialect?.dialectCode || langFrom;

                langFromTranslation = participant.translationDialect.dialectCode;
                break;
            }
        }

        const transcriptionText = await transcribeAudioOpenAi(langFrom, recordedBlobParam, apiEndpoint, tokenData, meetingId, clientId);

        if (!transcriptionText || transcriptionText.trim() === "") {
            return;
        }
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
