import axios from "axios";

import { IReduxState, IStore } from "../../app/types";
import { toState } from "../../base/redux/functions";
import { addMessageVideoTranslatorAI, setIsTranscribing } from "../action.web";
import { IEntityData, IMeetingData, IModerator, IParticipant } from "../types";

import { createMessageStorageSendTranslationToDatabase } from "./messageService";

const mockParticipantData: IParticipant[] = [
    {
        participant_id: 1,
        name: "John Doe",
        email: "john.doe@example.com",
        dialect_id: 101,
        dialectName: "English",
        dialectCode: "en",
        languageName: "English",
        type: "PARTICIPANT",
    },
];

// Mock data for moderator
const mockModeratorData: IModerator[] = [
    {
        moderator_id: 1,
        name: "Jane Smith",
        email: "jane.smith@example.com",
        dialect_id: 102,
        dialectName: "Spanish",
        dialectCode: "es",
        languageName: "Spanish",
        type: "MODERATOR",
    },
];

// Mock data for entity
const mockEntityData: IEntityData = {
    participant_id: 1,
    name: "John Doe",
    email: "john.doe@example.com",
    dialect_id: 101,
    dialectName: "English",
    dialectCode: "en",
    languageName: "English",
    type: "PARTICIPANT",
};

// Mock data for meeting
const mockMeetingData: IMeetingData = {
    name: "Test Meeting",
    client: {
        text_to_text: [],
        speech_to_text: [],
        text_to_speech: [],
        status: true,
        primary_language: "",
        client_name: "",
    },
    dictionaryName: "Test Dictionary",
    dictionaryLanguages: ["English", "Spanish"],
    dictionaryWordKeyPairs: {
        English: ["hello", "world"],
        Spanish: ["hola", "mundo"],
    },
};

export const transcribeAndTranslateServiceOpenAi = async (dispatch: any, getState: any, recordedBlob: any) => {
    const state: IReduxState = getState();

    // const state: IReduxState = store.getState();
    const tokenData = toState(state)["features/videotranslatorai"].jwtToken;
    const participantState = toState(state)["features/base/participants"];

    // const participantName = toState(state)['features/videotranslatorai'].participantName;
    // const participantName = toState(state)["features/base/participants"].local?.displayName;
    const participantName = "John Doe";

    // const participantData = toState(state)['features/videotranslatorai'].participantData;
    const participantData: any = mockParticipantData;

    // const meetingData: any = toState(state)['features/videotranslatorai'].meetingData;
    const meetingData: any = mockMeetingData;

    // const moderatorData = toState(state)['features/videotranslatorai'].moderatorData;
    const moderatorData: any = mockModeratorData;

    // const entityData: any = toState(state)['features/videotranslatorai'].thisEntityData;
    const entityData: any = mockEntityData;
    const conference = toState(state)["features/base/conference"].conference;

    // const audioBlob = toState(state)["features/videotranslatorai"].openAiRecordingBlob;
    const audioBlob = recordedBlob;

    const participantAndModeratorData = [...moderatorData, ...participantData];
    const openAiApiKey = process.env.REACT_APP_OPEN_AI_API_KEY;
    const translateApiKey = process.env.REACT_APP_MICROSOFT_TRANSLATE_API_KEY;
    const openAiTranscribeEndpoint = process.env.REACT_APP_OPENAI_TRANSCRIBE_ENDPOINT;
    const translationEndpoint = process.env.REACT_APP_MICROSOFT_TRANSLATION_ENDPOINT;

    if (!openAiApiKey || !translateApiKey || !openAiTranscribeEndpoint || !translationEndpoint) {
        throw new Error("One or more environment variables are not set.");
    }
    try {
        let langFrom = "en";

        // Find the local participant's language name
        for (const participant of participantAndModeratorData) {
            if (participant.name === participantName) {
                langFrom = participant.dialectCode;
                break;
            }
        }
        console.log("LANG FROM", langFrom);

        // Begin recording (trigger elsewhere in your app)
        const formData = new FormData();

        const correctedBlob = new Blob([audioBlob.blob], { type: "audio/wav" }); // Remove the codec from MIME type

        formData.append("file", correctedBlob);

        // Specify the model (this is required for OpenAI API)
        formData.append("model", "whisper-1");

        // Optionally, specify language (if you're sure about the language, otherwise it can autodetect)
        formData.append("language", "en"); // You can adjust this based on the language of your audio

        let transcriptionText = "";

        // Make the POST request to OpenAI
        try {
            const transcriptionResponse = await axios.post(openAiTranscribeEndpoint, formData, {
                headers: {
                    Authorization: `Bearer ${openAiApiKey}`, // Use Bearer token for authentication
                    "Content-Type": "multipart/form-data", // Make sure it's multipart/form-data
                },
            });

            // Extract the transcription text from the response
            transcriptionText = transcriptionResponse.data.text;
        } catch (error) {
            console.error("Error during OpenAI transcription request:", error.response?.data || error.message);
        }

        console.log("TRANSCRIPTION TEXT", transcriptionText);

        const translationPromises = participantAndModeratorData.map(async (participant) => {
            if (participant.dialectCode && participant.dialectCode !== langFrom) {
                const translationResponse = await axios.post(translationEndpoint, [{ Text: transcriptionText }], {
                    headers: {
                        "Ocp-Apim-Subscription-Key": translateApiKey, // Replace with translation API key
                        "Ocp-Apim-Subscription-Region": "australiaeast",
                        "Content-Type": "application/json",
                    },
                    params: {
                        from: langFrom,
                        to: participant.dialectCode,
                    },
                });
                const translationText = translationResponse.data[0].translations[0].text;
                const translationSent = `${participantName}: ${translationText} (videotranslatoraiservice)`;
                const participantId = getParticipantId(participantState.remote, participant.name);

                console.log("PARTICIPANT NAME", participant.name);
                console.log("TRANSLATION SENT", translationSent);
                console.log("LANG FROM", langFrom);
                console.log("LANG TO", participant.dialectCode);

                if (participantId && conference) {
                    console.log("PARTICIPANT NAME", participant.name);
                    console.log("TRANSLATION SENT", translationSent);
                    console.log("LANG FROM", langFrom);
                    console.log("LANG TO", participant.dialectCode);
                    await conference.sendPrivateTextMessage(participantId, translationSent);
                    const messageData: any = {
                        user_created_id: meetingData.user_created_id,
                        meeting_id: meetingData.meeting_id,
                        dialect_from: entityData.dialect_id,
                        dialect_to: participant.dialect_id,
                        original_text: transcriptionText,
                        translated_text: translationText,
                    };

                    if (entityData.type === "MODERATOR") {
                        messageData.moderator_id = entityData.moderator_id;
                    } else if (entityData.type === "PARTICIPANT") {
                        messageData.participant_id = entityData.participant_id;
                    }
                    createMessageStorageSendTranslationToDatabase(messageData, tokenData);
                    dispatch(
                        addMessageVideoTranslatorAI({
                            displayName: participantName,
                            hasRead: true,
                            participantId,
                            messageType: "local",
                            message: translationSent,
                            privateMessage: true,
                            timestamp: Date.now(),
                            isReaction: false,
                            recipient: participant.name,
                            error: null,
                            messageId: null,
                            lobbyChat: null,
                        })
                    );
                }
            }
        });

        await Promise.all(translationPromises);
    } catch (err) {
        console.error("Error during transcription and translation:", err);
    }
};

const getParticipantId = (participantMap: Map<string, any>, participantName: string): string | null => {
    for (const [key, value] of participantMap.entries()) {
        if (value.name === participantName) {
            return key;
        }
    }

    return null;
};

export const stopTranscriptionService = (store: IStore) =>
    new Promise<void>((resolve, reject) => {
        store.dispatch(setIsTranscribing(false));
        resolve();
    });
