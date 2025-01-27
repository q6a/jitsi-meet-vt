import { IReduxState } from "../../app/types";
import { toState } from "../../base/redux/functions";
import { getElapsedTime } from "../helpers";
import { createMessageStorageSendTranslationToDatabase } from "../services/messageService";
import translateTextMicrosoft from "../services/textToTextTranslateMicrosoft";
import transcribeAudioOpenAi from "../services/transcribeAudioOpenAi";
let previousTranscription = " ";
let countTheAmountSameString = 0;

export const inPersonServiceOpenAi = async (
    dispatch: any,
    getState: any,
    recordedBlobParam: any,
    langFrom: any,
    langFromTranslation: any = "",
    participantName: any = "",
    dialectIdFrom: any = "",
    dialectIdTo: any = "",
    langFromTranslationId: any = "",
    isMessageCompleted = false,
    isContMode = false
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
    const conferenceStartTime = toState(state)["features/base/conference"].conferenceTimestamp;
    const participantAndModeratorData = [...moderatorData, ...participantData];

    const translateApiKey = process.env.REACT_APP_MICROSOFT_TRANSLATE_API_KEY;
    const translationEndpoint = process.env.REACT_APP_MICROSOFT_TRANSLATION_ENDPOINT;
    const apiEndpoint = process.env.REACT_APP_OPENAI_TRANSCRIBE_ENDPOINT_VIDEOTRANSLATORAI; // New API endpoint

    if (!translateApiKey || !translationEndpoint || !apiEndpoint) {
        throw new Error("One or more environment variables are not set.");
    }

    const elapsedTime = getElapsedTime(conferenceStartTime, new Date().getTime(), true);

    try {
        const transcriptionText = await transcribeAudioOpenAi(
            langFrom,
            recordedBlobParam,
            apiEndpoint,
            tokenData,
            meetingId,
            clientId,
            entityData.type === 'MODERATOR' ? entityData.moderatorId : entityData.participantId,
        );

        if (transcriptionText === previousTranscription && countTheAmountSameString < 2 && isContMode) {
            countTheAmountSameString++;

            return;
        }

        countTheAmountSameString = 0;

        previousTranscription = transcriptionText;

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
                            tokenData,
                            participant.translationDialect.dialectId,
                            langFromTranslationId,
                            "australiaeast",
                            meetingId,
                            clientId,
                            entityData.type === 'MODERATOR' ? entityData.moderatorId : entityData.participantId,
                            elapsedTime
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

        // Await all translation promises
    } catch (err) {
        console.error("Error during transcription and translation:", err);
    }
};
