import axios from "axios";

import { IReduxState } from "../../app/types";
import { toState } from "../../base/redux/functions";

import { createMessageStorageSendTranslationToDatabase } from "./messageService";

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

    const translateApiKey = process.env.REACT_APP_MICROSOFT_TRANSLATE_API_KEY;
    const transcriptionEndpoint = process.env.REACT_APP_OPENAI_TRANSCRIPTION_ENDPOINT;
    const translationEndpoint = process.env.REACT_APP_MICROSOFT_TRANSLATION_ENDPOINT;
    const apiEndpoint = process.env.REACT_APP_OPENAI_TRANSCRIBE_ENDPOINT_VIDEOTRANSLATORAI; // New API endpoint

    if (!translateApiKey || !transcriptionEndpoint || !translationEndpoint || !apiEndpoint) {
        throw new Error("One or more environment variables are not set.");
    }

    try {
        let langFrom = "en";
        let langFromTranslation = "en-AU";

        // Find the local participant's language name
        for (const participant of participantAndModeratorData) {
            if (participant.name === participantName) {
                langFrom = participant.transcriptionDialect.dialectCode;
                langFromTranslation = participant.translationDialect.dialectCode;
                break;
            }
        }

        const formData = new FormData();

        // You can get the current timestamp or provide a custom lastModified date
        const lastModifiedDate = new Date(); // Set it to the current date and time, or any desired date
        const lastModified = lastModifiedDate.getTime(); // Get the timestamp in milliseconds

        // Create a complete File object with custom lastModified date and type
        const correctedBlob = new File([recordedBlobParam.blob], "audio.wav", {
            type: "audio/wav",
            lastModified, // Assign the custom lastModified timestamp
        });

        formData.append("file", correctedBlob); // Append the corrected Blob object, ensure filename
        // formData.append("file", correctedBlob); // Append the corrected Blob object
        formData.append("langFrom", langFrom); // Specify the language (optional)

        // Set the new API endpoint for transcription

        // Make the request to the new API
        const transcriptionResponse = await axios.post(apiEndpoint, formData, {
            headers: {
                Authorization: `Bearer ${tokenData}`, // Bearer token for authentication
                "Content-Type": "multipart/form-data", // Ensure the correct content type for form data
            },
        });

        // Extract the transcription text from the response
        const transcriptionText = transcriptionResponse.data.data.transcription;

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
                                    // from: langFromTranslation,
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

        // Await all translation promises
    } catch (err) {
        console.error("Error during transcription and translation:", err);
    }
};
