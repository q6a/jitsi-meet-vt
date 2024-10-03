import * as speechsdk from "microsoft-cognitiveservices-speech-sdk";

import ReducerRegistry from "../base/redux/ReducerRegistry";

import {
    ADD_MESSAGE_VIDEOTRANSLATORAI,
    DEBUGGING,
    FETCH_MEETING_DATA,
    MESSAGE_NOTIFICATION,
    RECOGNITION_RESULT,
    SET_DISPLAY_DIALECT,
    SET_DISPLAY_NAME,
    SET_ENTITY_DATA,
    SET_IS_PLAYING_TTS,
    SET_IS_RECORDING,
    SET_IS_TRANSCRIBING,
    SET_LATEST_PRIVATE_MESSAGE,
    SET_LINGUIST_DATA,
    SET_MEETING_DATA,
    SET_MICROSOFT_RECOGNIZERSDK,
    SET_MODERATOR_DATA,
    SET_PARTICIPANT_DATA,
    SET_PRIVATE_MESSAGES,
    SET_RECORDING_BLOB_OPENAI,
    SET_ROOM_PARAMS,
    SET_TRANSCRIPTION_RESULT,
    START_RECORDING_OPENAI,
    START_TEXT_TO_SPEECH,
    START_TRANSCRIPTION,
    STOP_RECORDING_OPENAI,
    STOP_TRANSCRIPTION,
    TRANSLATE_OPENAI,
} from "./actionTypes";
import { IVideoTranslatorAiState } from "./types";

const INITIAL_STATE: IVideoTranslatorAiState = {
    toEmail: "",
    meetingName: "",
    participantName: "",
    jwtToken: "",
    meetingId: "",
    clientId: "",
    textToSpeechCode: "",
    participantData: [],
    moderatorData: [],
    linguistData: [],
    isTranscribing: false,
    isRecording: false,
    isPlayingTTS: false,
    transcriptionResults: [],
    meetingData: {
        displayName: "",
        error: {},
        isReaction: false,
        lobbyChat: false,
        message: "",
        messageId: "",
        messageType: "",
        participantId: "",
        privateMessage: false,
        recipient: "",
        timestamp: 0,
    },
    thisEntityData: {
        participant_id: 0,
        name: "",
        email: "",
        transcriptionDialect: {
            dialectCode: "",
            dialectId: 0,
            name: "",
            language: {
                name: "",
                languageId: "",
            },
        },
        translationDialect: {
            dialectCode: "",
            dialectId: 0,
            name: "",
            language: {
                name: "",
                languageId: "",
            },
        },
        type: "PARTICIPANT",
    },
    displayName: "",
    displayDialect: "",
    microsoftRecognizerSDK: null as unknown as speechsdk.TranslationRecognizer,
    latestPrivateMessage: "",
    privateMessages: [],
    messageNotification: false,
    messages: [],
    openAiRecordingBlob: null,
};

ReducerRegistry.register<IVideoTranslatorAiState>(
    "features/videotranslatorai",
    (state = INITIAL_STATE, action): IVideoTranslatorAiState => {
        switch (action.type) {
            // Room slice reducers
            case SET_ROOM_PARAMS:
                return {
                    ...state,
                    meetingName: action.payload.meetingName || state.meetingName,
                    participantName: action.payload.participantName || state.participantName,
                    jwtToken: action.payload.jwtToken || state.jwtToken,
                    meetingId: action.payload.meetingId || state.meetingId,
                    clientId: action.payload.clientId || state.clientId,
                    textToSpeechCode: action.payload.textToSpeechCode || state.textToSpeechCode,
                };

            case SET_LATEST_PRIVATE_MESSAGE:
                return {
                    ...state,
                    latestPrivateMessage: action.payload,
                };

            case MESSAGE_NOTIFICATION:
                return {
                    ...state,
                };

            case SET_PRIVATE_MESSAGES:
                return {
                    ...state,
                    privateMessages: action.payload,
                };

            case SET_PARTICIPANT_DATA:
                return {
                    ...state,
                    participantData: action.payload,
                };

            case SET_MODERATOR_DATA:
                return {
                    ...state,
                    moderatorData: action.payload,
                };

            case SET_DISPLAY_NAME:
                return {
                    ...state,
                    displayName: action.payload,
                };

            case SET_DISPLAY_DIALECT:
                return {
                    ...state,
                    displayDialect: action.payload,
                };

            case SET_MEETING_DATA:
                return {
                    ...state,
                    meetingData: action.payload,
                };

            case SET_MICROSOFT_RECOGNIZERSDK:
                return {
                    ...state,
                    microsoftRecognizerSDK: action.payload,
                };

            case SET_ENTITY_DATA:
                return {
                    ...state,
                    thisEntityData: action.payload,
                };

            case SET_LINGUIST_DATA:
                return {
                    ...state,
                    linguistData: action.payload,
                };

            case SET_IS_TRANSCRIBING:
                return {
                    ...state,
                    isTranscribing: action.payload,
                };

            case SET_IS_PLAYING_TTS:
                return {
                    ...state,
                    isPlayingTTS: action.payload,
                };

            case SET_IS_RECORDING:
                return {
                    ...state,
                    isRecording: action.payload,
                };

            case START_RECORDING_OPENAI:
                return {
                    ...state,
                    isRecording: true,
                };

            case STOP_RECORDING_OPENAI:
                return {
                    ...state,
                    isRecording: false,
                };

            case SET_RECORDING_BLOB_OPENAI:
                return {
                    ...state,
                    openAiRecordingBlob: action.payload,
                };

            case TRANSLATE_OPENAI:
                return {
                    ...state,
                };

            case SET_TRANSCRIPTION_RESULT:
                return {
                    ...state,
                    transcriptionResults: [...state.transcriptionResults, action.payload],
                };

            case FETCH_MEETING_DATA:
                return {
                    ...state,
                };

            case START_TEXT_TO_SPEECH:
                return {
                    ...state,
                };

            case START_TRANSCRIPTION:
                return {
                    ...state,
                    isTranscribing: true,
                };

            case STOP_TRANSCRIPTION:
                return {
                    ...state,
                    isTranscribing: false,
                };

            case RECOGNITION_RESULT:
                return {
                    ...state,
                    transcriptionResults: [
                        ...state.transcriptionResults,
                        {
                            transcription: action.payload.transcription,
                            translationMap: action.payload.translationMap,
                            participantId: action.payload.participantId,
                        },
                    ],
                };

            case ADD_MESSAGE_VIDEOTRANSLATORAI: {
                const newMessage = {
                    displayName: action.displayName,
                    error: action.error,
                    participantId: action.participantId,
                    isReaction: action.isReaction,
                    messageId: action.messageId,
                    messageType: action.messageType,
                    message: action.message,
                    privateMessage: action.privateMessage,
                    lobbyChat: action.lobbyChat,
                    recipient: action.recipient,
                    timestamp: action.timestamp,
                };

                // React native, unlike web, needs a reverse sorted message list.
                const messages = [...state.messages, newMessage];

                return {
                    ...state,
                    messages,
                };
            }

            case DEBUGGING:
                return {
                    ...state,
                };
            default:
                return state;
        }
    }
);
