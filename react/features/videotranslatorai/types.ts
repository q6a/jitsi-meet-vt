
import { string } from '@tensorflow/tfjs-core';
import * as speechsdk from 'microsoft-cognitiveservices-speech-sdk';

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
    transcription: string; // or another appropriate type
    translationMap: Record<string, string>; // Assuming translationMap is an object with key-value pairs
    participantId: number; // or string, depending on your actual data
}


// Define interface for Room Parameters
export interface IRoomParams {
    jwtToken: string;
    meetingId: string;
    meetingName: string;
    participantName: string;
}

// Define interface for Room Parameters
export interface IFetchMeetingData {
    meetingNameQuery: string;
    token: string,
    initialName: string,
    meetingId: string
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
    participant_id: number;
    name: string;
    email: string;
    dialect_id: number;
    dialectName: string;
    dialectCode: string;
    languageName: string;
    type: 'PARTICIPANT' | 'MODERATOR' | 'LINGUIST'; // Assuming 'type' could have other values as well
}


export interface IModerator {
    moderator_id: number;
    name: string;
    email: string;
    dialect_id: number;
    dialectName: string;
    dialectCode: string;
    languageName: string;
    type: 'PARTICIPANT' | 'MODERATOR' | 'LINGUIST'; // Assuming 'type' could have other values as well
}


export interface ILinguist {
    linguist_id: number;
    name: string;
    email: string;
    type: 'PARTICIPANT' | 'MODERATOR' | 'LINGUIST'; // Assuming 'type' could have other values as well
}


export interface IUserCreated {
    user_created_id: number;
    name: string;
    email: string;
}

export interface IClient {
    text_to_text: any[];
    speech_to_text: any[];
    text_to_speech: any[];
    status: Boolean;
    primary_language: string;
    client_name: string;
}

export interface IDictionaryWordKeyPairs {
    [language: string]: string[];
}

export interface IMeetingData {
    name: string;
    client: IClient;
    dictionaryName: string;
    dictionaryLanguages: string[];
    dictionaryWordKeyPairs: IDictionaryWordKeyPairs;
}

export interface IEntityData {
    participant_id: number;
    name: string;
    email: string;
    dialect_id: number;
    dialectName: string;
    dialectCode: string;
    languageName: string;
    type: 'PARTICIPANT' | 'MODERATOR' | 'LINGUIST'; // Assuming 'type' could be other values as well
}


export interface IVideoTranslatorAiState {
    toEmail: string;
    meetingName: string;
    participantName: string;
    jwtToken: string;
    meetingId: string;
    thisEntityData: IEntityData;
    participantData: Array<IParticipant>;
    moderatorData: Array<IModerator>;
    linguistData: Array<ILinguist>;
    isTranscribing: boolean;
    transcriptionResults: Array<IRecognitionResultPayload>;
    meetingData: IMessage;
    displayName: string;
    displayDialect: string;
    microsoftRecognizerSDK: speechsdk.TranslationRecognizer;
    latestPrivateMessage: string; 
    privateMessages: IMessage[];
    messageNotification: boolean;
    messages: Array<IMessage>;
    isRecording: boolean;
    openAiRecordingBlob: any;
}


export interface IDialect {
    dialect_id: number;
    name: string;
    dialect_code: string;
    // language: {
    //     name: string;
    // };
}

export interface IParticipantMeeting {
    participant: {
        participant_id: number;
        name: string;
        email: string;
        dialect: IDialect;
    };
}

export interface IModeratorMeeting {
    email: string;
    moderator: {
        name: string;
        user_id: number;
    };
    dialect: IDialect;
}

export interface ILinguistMeeting {
    linguist: {
        linguist_id: number;
        name: string;
        email: string;
    };
}

export interface PrivateMessageDisplayProps {
    message: string;
}