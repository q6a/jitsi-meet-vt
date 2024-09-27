import axios from "axios";

import { IReduxState } from "../../app/types";
import { toState } from "../../base/redux/functions";

const getParticipantId = (participantMap: Map<string, any>, participantName: string): string | null => {
    for (const [key, value] of participantMap.entries()) {
        if (value.name === participantName) {
            return key;
        }
    }

    return null;
};

export const transcribeAndTranslateServiceOpenAi = async (dispatch: any, getState: any, recordedBlobParam: any) => {
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

    const openAiApiKey = process.env.REACT_APP_OPEN_AI_API_KEY;
    const translateApiKey = process.env.REACT_APP_MICROSOFT_TRANSLATE_API_KEY;
    const transcriptionEndpoint = process.env.REACT_APP_OPENAI_TRANSCRIPTION_ENDPOINT;
    const translationEndpoint = process.env.REACT_APP_MICROSOFT_TRANSLATION_ENDPOINT;
    const openAiEndpoint = process.env.REACT_APP_OPENAI_TRANSCRIBE_ENDPOINT;

    if (!openAiApiKey || !translateApiKey || !transcriptionEndpoint || !translationEndpoint || !openAiEndpoint) {
        throw new Error("One or more environment variables are not set.");
    }

    try {
        let langFrom = "en";

        // Find the local participant's language name
        for (const participant of participantAndModeratorData) {
            if (participant.name === participantName) {
                langFrom = participant.transcriptionDialect.dialectCode;
                break;
            }
        }

        // Begin recording (this would be triggered elsewhere in your app)

        const formData = new FormData();

        // Use the actual Blob data and ensure it's in the correct format
        const correctedBlob = new Blob([recordedBlobParam.blob], { type: "audio/wav", lastModified: Date.now() });

        formData.append("file", correctedBlob); // Append the corrected Blob object
        formData.append("model", "whisper-1"); // Use the Whisper model for transcription
        formData.append("language", langFrom); // Specify the language (optional)

        // Set the OpenAI API key and endpoint

        // Make the request to OpenAI
        const transcriptionResponse = await axios.post(openAiEndpoint, formData, {
            headers: {
                Authorization: `Bearer ${openAiApiKey}`, // Use OpenAI's Bearer token for authentication
                "Content-Type": "multipart/form-data",
            },
        });

        const transcriptionText = transcriptionResponse.data.text;

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
                        // Translate the transcribed text
                        const translationResponse = await axios.post(
                            translationEndpoint,
                            [{ Text: transcriptionText }],
                            {
                                headers: {
                                    "Ocp-Apim-Subscription-Key": translateApiKey,
                                    "Ocp-Apim-Subscription-Region": "australiaeast",
                                    "Content-Type": "application/json",
                                },
                                params: {
                                    from: langFrom,
                                    to: participant.translationDialect.dialectCode,
                                },
                            }
                        );

                        const translationText = translationResponse.data[0].translations[0].text;
                        const translationSent = `${participantName}: ${translationText} (videotranslatoraiservice)`;

                        let participantId = "";

                        for (const [key, value] of participantState.remote.entries()) {
                            if (value.name === participant.name) {
                                participantId = key;
                            }
                        }

                        console.log("PARTICIPANT NAME", participant.name);
                        console.log("TRANSLATION SENT", translationSent);
                        console.log("LANG FROM", langFrom);
                        console.log("LANG TO", participant.translationDialect.dialectCode);
                        console.log("LANG TO ID", participant.translationDialect.dialectId);
                        console.log("PARTICIPANT ID", participantId);

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

                        // await createMessageStorageSendTranslationToDatabase(messageData, tokenData);

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

                        for (const [key, value] of participantState.remote.entries()) {
                            if (value.name === participant.name) {
                                participantId = key;
                            }
                        }

                        if (participantId && conference) {
                            console.log("PARTICIPANT NAME", participant.name);
                            console.log("TRANSLATION SENT", translationSent);
                            console.log("LANG FROM", langFrom);
                            console.log("LANG TO", participant.translationDialect.dialectCode);
                            console.log("LANG TO ID", participant.translationDialect.dialectId);
                            console.log("PARTICIPANT ID", participantId);
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
