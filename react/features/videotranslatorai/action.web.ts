import { toState } from '../base/redux/functions';
import { IReduxState, IStore } from '../app/types';
import { useSelector } from 'react-redux';
import * as speechsdk from 'microsoft-cognitiveservices-speech-sdk';

import {
    IMessage,
    IRoomParams,
    IFetchMeetingData,
    IParticipant,
    IModerator,
    ILinguist,
    IMeetingData,
    IEntityData,
    IRecognitionResultPayload
} from './types';


import { 
    SET_ROOM_PARAMS,
    START_TRANSCRIPTION, 
    STOP_TRANSCRIPTION,
    RECOGNITION_RESULT,
    SET_PARTICIPANT_DATA,
    SET_MODERATOR_DATA,
    SET_LINGUIST_DATA,
    SET_IS_TRANSCRIBING,
    SET_TRANSCRIPTION_RESULT,
    SET_MEETING_DATA,
    FETCH_MEETING_DATA,
    SET_ENTITY_DATA,
    DEBUGGING,
    SET_DISPLAY_DIALECT,
    SET_DISPLAY_NAME,
    SET_MICROSOFT_RECOGNIZERSDK,
    SET_LATEST_PRIVATE_MESSAGE,
    SET_PRIVATE_MESSAGES,
    SET_MESSAGES,
    MESSAGE_NOTIFICATION,
    ADD_MESSAGE_VIDEOTRANSLATORAI,
    START_RECORDING_OPENAI,
    STOP_RECORDING_OPENAI,
    TRANSLATE_OPENAI,
    SET_IS_RECORDING,
    SET_RECORDING_BLOB_OPENAI
} from './actionTypes';


export const setRecordingBlobOpenAi = (blob: any) => ({
    type: SET_RECORDING_BLOB_OPENAI,
    payload: blob
});


// Existing action creators
export const setRoomParams = (params: IRoomParams) => ({
    type: SET_ROOM_PARAMS,
    payload: params,
});


// Existing action creators
export const messageNotification = () => ({
    type: MESSAGE_NOTIFICATION,
});

export const fetchMeetingData = (params: IFetchMeetingData) => {
    return {
        type: FETCH_MEETING_DATA,
        payload: params,
    };
};

export const setMicrosoftRecognizerSDK = (params: speechsdk.TranslationRecognizer) => {
    return {
        type: SET_MICROSOFT_RECOGNIZERSDK,
        payload: params,
    };
};

export const setPrivateMessages = (params: IMessage[]) => {
    return {
        type: SET_PRIVATE_MESSAGES,
        payload: params,
    };
};

export const startTranscription = () => ({
    type: START_TRANSCRIPTION,
});

export const stopTranscription = () => ({
    type: STOP_TRANSCRIPTION,
});

export const startRecordingOpenAi = () => ({
    type: START_RECORDING_OPENAI,
});

export const stopRecordingOpenAi = () => ({
    type: STOP_RECORDING_OPENAI,
});

export const translateOpenAi = () => ({
    type: TRANSLATE_OPENAI,
});

export const debugging = () => ({
    type: DEBUGGING,
});

export const setParticipantData = (participants: IParticipant[]) => ({
    type: SET_PARTICIPANT_DATA,
    payload: participants,
});

export const setDisplayName = (displayName: string) => ({
    type: SET_DISPLAY_NAME,
    payload: displayName,
});

export const setDisplayDialect = (displayDialect: string) => ({
    type: SET_DISPLAY_DIALECT,
    payload: displayDialect,
});


export const setEntityData = (thisEntityData: IEntityData) => ({
    type: SET_ENTITY_DATA,
    payload: thisEntityData,
});


export const setModeratorData = (moderators: IModerator[]) => ({
    type: SET_MODERATOR_DATA,
    payload: moderators,
});

export const setLinguistData = (linguists: ILinguist) => ({
    type: SET_LINGUIST_DATA,
    payload: linguists,
});

export const setIsTranscribing = (isTranscribing: boolean) => ({
    type: SET_IS_TRANSCRIBING,
    payload: isTranscribing,
});

export const setIsRecording = (isRecording: boolean) => ({
    type: SET_IS_RECORDING,
    payload: isRecording,
});

export const setTranscriptionResult = (result: IRecognitionResultPayload) => ({
    type: SET_TRANSCRIPTION_RESULT,
    payload: result,
});

export const setMeetingData = (meetingData: IMeetingData) => ({
    type: SET_MEETING_DATA,
    payload: meetingData,
});


export const setLatestPrivateMessage = (latestPrivateMessage: string) => {

    return {
        type: SET_LATEST_PRIVATE_MESSAGE,
        payload: latestPrivateMessage
    };
};

export const setMessages = () => ({
    type: SET_MESSAGES,
});

export function addMessageVideoTranslatorAI(messageDetails: Object) {

    return {
        type: ADD_MESSAGE_VIDEOTRANSLATORAI,
        ...messageDetails
    };
}

