import * as speechsdk from "microsoft-cognitiveservices-speech-sdk";

export interface IMessage {
    displayName: string;
    error?: Object;
    isReaction: boolean;
    lobbyChat: boolean;
    message: string;
    messageId: string;
    messageType: string;
    participantId: string;
    privateMessage: boolean;
    recipient: string;
    timestamp: number;
}

export interface IRecognitionResultPayload {
    // Assuming translationMap is an object with key-value pairs
    participantId: string;
    transcription: string;

    // or another appropriate type
    translationMap: Record<string, string>; // or string, depending on your actual data
}

// Define interface for Room Parameters
export interface IRoomParams {
    clientId: string;
    jwtToken: string;
    meetingId: string;
    meetingName: string;
    meetingType: string;
    modeContOrMan: string;
    participantName: string;
    provider: string;
    textToSpeechCode: string;
}

// Define interface for Room Parameters
export interface IInPersonTTSCode {
    inPersontextToSpeechCodePersonOne: string;
    inPersontextToSpeechCodePersonTwo: string;
}

// Define interface for Room Parameters
export interface IFetchMeetingData {
    initialName: string;
    meetingId: string;
    meetingNameQuery: string;
    token: string;
}

// Define interface for Private Messages
export interface IMessage {
    displayName: string;
    error?: Object;
    isReaction: boolean;
    lobbyChat: boolean;
    message: string;
    messageId: string;
    messageType: string;
    participantId: string;
    privateMessage: boolean;
    recipient: string;
    timestamp: number;
}

export interface IParticipant {
    email: string;
    name: string;
    participant_id: string;
    transcriptionDialect: IDialect;
    translationDialect: IDialect;
    type: "PARTICIPANT" | "MODERATOR" | "LINGUIST"; // Assuming 'type' could have other values as well
}

export interface IModerator {
    email: string;
    moderator_id: string;
    name: string;
    transcriptionDialect: IDialect;
    translationDialect: IDialect;
    type: "PARTICIPANT" | "MODERATOR" | "LINGUIST"; // Assuming 'type' could have other values as well
}

export interface ILinguist {
    email: string;
    linguist_id: string;
    name: string;
    type: "PARTICIPANT" | "MODERATOR" | "LINGUIST"; // Assuming 'type' could have other values as well
}

export interface IUserCreated {
    email: string;
    name: string;
    user_created_id: string;
}

export interface IClient {
    client_name: string;
    primary_language: string;
    speech_to_text: any[];
    status: Boolean;
    text_to_speech: any[];
    text_to_text: any[];
}

export interface IDictionaryWordKeyPairs {
    [language: string]: string[];
}

export interface IMeetingData {
    client: IClient;
    dictionaryLanguages: string[];
    dictionaryName: string;
    dictionaryWordKeyPairs: IDictionaryWordKeyPairs;
    name: string;
}

export interface IEntityData {
    email: string;
    name: string;
    participant_id: string;
    transcriptionDialect: IDialect;
    translationDialect: IDialect;
    type: "PARTICIPANT" | "MODERATOR" | "LINGUIST"; // Assuming 'type' could be other values as well
}

export interface IVideoTranslatorAiState {
    clientId: string;
    completedMessages: string[];
    displayDialect: string;
    displayName: string;
    inPersonIsRecordingPersonOne: boolean;
    inPersonIsRecordingPersonTwo: boolean;
    inPersonStartTranscription: boolean;
    inPersonStopTranscription: boolean;
    inPersontextToSpeechCodePersonOne: string;
    inPersontextToSpeechCodePersonTwo: string;
    isPlayingTTS: boolean;
    isRecording: boolean;
    isRecordingMicrosoftMan: boolean;
    isTranscribing: boolean;
    jwtToken: string;
    linguistData: Array<ILinguist>;
    meetingData: IMessage;
    meetingId: string;
    meetingName: string;
    meetingType: string;
    messageNotification: boolean;
    messages: Array<IMessage>;
    microsoftRecognizerSDK: speechsdk.TranslationRecognizer;
    modeContOrMan: string;
    moderatorData: Array<IModerator>;
    openAiRecordingBlob: any;
    participantData: Array<IParticipant>;
    participantName: string;
    privateMessages: IMessage[];
    provider: string;
    textToSpeechCode: string;
    thisEntityData: IEntityData;
    toEmail: string;
    transcriptionResults: Array<IRecognitionResultPayload>;
}

export interface IDialect {
    dialectCode: string;
    dialectId: string;
    language: {
        languageId: string;
        name: string;
    };

    name: string;
}

export interface IDialectMeeting {
    dialect_code: string;
    dialect_id: string;
    language: {
        language_id: string;
        name: string;
    };

    name: string;
}

export interface IParticipantMeeting {
    participant: {
        email: string;
        name: string;
        participant_id: string;
        transcription_dialect: IDialectMeeting;
        translation_dialect: IDialectMeeting;
    };
}

export interface IModeratorMeeting {
    moderator: {
        dialects: IDialect[];
        email: string;
        name: string;
        user_id: string;
    };

    transcription_dialect: IDialectMeeting;
    translation_dialect: IDialectMeeting;
}

export interface ILinguistMeeting {
    linguist: {
        email: string;
        linguist_id: string;
        name: string;
    };
}

export interface PrivateMessageDisplayProps {
    message: string;
}
