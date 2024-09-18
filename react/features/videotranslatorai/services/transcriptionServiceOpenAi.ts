import axios from "axios";
import { getAuthToken } from "./authService";
import { createMessageStorageSendTranslationToDatabase } from "./messageService";
import { toState } from "../../base/redux/functions";
import { IReduxState, IStore } from "../../app/types";
import { setIsTranscribing, setMicrosoftRecognizerSDK } from "../action.web";
import { addMessageVideoTranslatorAI } from "../action.web";

import {
    IMessage,
    IRoomParams,
    IFetchMeetingData,
    IParticipant,
    IModerator,
    ILinguist,
    IMeetingData,
    IEntityData,
    IRecognitionResultPayload,
} from "../types";

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
    user_created_id: 1,
    meeting_id: 123,
    name: "Test Meeting",
    userCreated: {
        user_created_id: 1,
        name: "John Doe",
        email: "john.doe@example.com",
    },
    client: {
        client_id: 1,
        client_name: "Test Client",
        location: "USA",
        currency: "USD",
        products: "Translation Service",
        language_ids: ["en", "es"],
        billing_id: "BILL123",
        created_at: "2024-01-01",
        updated_at: "2024-01-02",
    },
    dictionaryName: "Test Dictionary",
    dictionaryLanguages: ["English", "Spanish"],
    dictionaryWordKeyPairs: {
        English: ["hello", "world"],
        Spanish: ["hola", "mundo"],
    },
};

export const transcribeAndTranslateServiceOpenAi = async (store: IStore, audioBlob: any) => {
    const state: IReduxState = store.getState();
    const tokenData = toState(state)["features/videotranslatorai"].jwtToken;
    const participantState = toState(state)["features/base/participants"];

    //const participantName = toState(state)['features/videotranslatorai'].participantName;
    const participantName = toState(state)["features/base/participants"].local?.displayName;

    //const participantData = toState(state)['features/videotranslatorai'].participantData;
    const participantData: any = mockParticipantData;

    //const meetingData: any = toState(state)['features/videotranslatorai'].meetingData;
    const meetingData: any = mockMeetingData;

    //const moderatorData = toState(state)['features/videotranslatorai'].moderatorData;
    const moderatorData: any = mockModeratorData;

    //const entityData: any = toState(state)['features/videotranslatorai'].thisEnityData;
    const entityData: any = mockEntityData;

    const conference = toState(state)["features/base/conference"].conference;
    //const audioBlob = toState(state)['features/videotranslatorai'].openAiRecordingBlob;
    const participantAndModeratorData = [...moderatorData, ...participantData];

    const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
    const translateApiKey = process.env.REACT_APP_MICROSOFT_TRANSLATE_API_KEY;
    const transcriptionEndpoint = process.env.REACT_APP_OPENAI_TRANSCRIPTION_ENDPOINT;
    const translationEndpoint = process.env.REACT_APP_MICROSOFT_TRANSLATION_ENDPOINT;

    if (!apiKey || !translateApiKey || !transcriptionEndpoint || !translationEndpoint) {
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

        // Begin recording (this would be triggered elsewhere in your app)

        const formData = new FormData();
        console.log("audoBlob", audioBlob);
        formData.append("file", audioBlob.blob);
        formData.append("language", langFrom); // Specify Hindi language for transcription

        const transcriptionResponse = await axios.post(transcriptionEndpoint, formData, {
            headers: {
                "api-key": apiKey, // Using authToken from getAuthToken or similar
                "Content-Type": "multipart/form-data",
            },
        });

        const transcriptionText = transcriptionResponse.data.text;
        if (!transcriptionText) {
            throw new Error("Transcription failed: No text returned.");
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

                    store.dispatch(
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

export const stopTranscriptionService = (store: IStore) => {
    return new Promise<void>((resolve, reject) => {
        store.dispatch(setIsTranscribing(false));
        resolve();
    });
};
