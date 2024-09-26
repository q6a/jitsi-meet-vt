import * as speechsdk from "microsoft-cognitiveservices-speech-sdk";

import {
    ADD_MESSAGE_VIDEOTRANSLATORAI,
    DEBUGGING,
    MESSAGE_NOTIFICATION,
    SET_DISPLAY_DIALECT,
    SET_DISPLAY_NAME,
    SET_ENTITY_DATA,
    SET_IS_RECORDING,
    SET_IS_TRANSCRIBING,
    SET_LATEST_PRIVATE_MESSAGE,
    SET_LINGUIST_DATA,
    SET_MEETING_DATA,
    SET_MESSAGES,
    SET_MICROSOFT_RECOGNIZERSDK,
    SET_MODERATOR_DATA,
    SET_PARTICIPANT_DATA,
    SET_PRIVATE_MESSAGES,
    SET_RECORDING_BLOB_OPENAI,
    SET_ROOM_PARAMS,
    SET_TRANSCRIPTION_RESULT,
    START_RECORDING_OPENAI,
    START_TRANSCRIPTION,
    STOP_RECORDING_OPENAI,
    STOP_TRANSCRIPTION,
} from "./actionTypes";
import { createDisplayNameAndDialect } from "./services/displayNameAndDialectService";
import { getMeetingInformation } from "./services/meetingService";
import { stopTranscriptionService, transcribeAndTranslateService } from "./services/transcriptionService";
import { transcribeAndTranslateServiceOpenAi } from "./services/transcriptionServiceOpenAi";
import {
    IEntityData,
    IFetchMeetingData,
    ILinguist,
    IMeetingData,
    IMessage,
    IModerator,
    IParticipant,
    IRecognitionResultPayload,
    IRoomParams,
} from "./types";

export const setRecordingBlobOpenAi = (blob: any) => {
    return {
        type: SET_RECORDING_BLOB_OPENAI,
        payload: blob,
    };
};

// Existing action creators
export const setRoomParams = (params: IRoomParams) => {
    return {
        type: SET_ROOM_PARAMS,
        payload: params,
    };
};

// Existing action creators
export const messageNotification = () => {
    return {
        type: MESSAGE_NOTIFICATION,
    };
};

export const fetchMeetingData = (params: IFetchMeetingData) => async (dispatch: any, getState: any) => {
    // Dispatch an action to store the parameters in the state
    try {
        const { meetingNameQuery, token, initialName, meetingId } = params;
        const data = await getMeetingInformation(meetingId, token, initialName);

        if (data) {
            dispatch(setMeetingData(data.meetingData));
            dispatch(setModeratorData(data.moderatorData));
            dispatch(setLinguistData(data.linguistData));
            dispatch(setParticipantData(data.participantData));
            dispatch(setEntityData(data.thisEntityData));

            const displayDialectAndName = createDisplayNameAndDialect(
                initialName,
                data.moderatorData,
                data.participantData,
                data.linguistData
            );

            dispatch(setDisplayName(displayDialectAndName.displayName));
            dispatch(setDisplayDialect(displayDialectAndName.displayDialect));
        }
    } catch (error) {
        console.error("Error while fetching meeting information:", error);

        // Optionally, dispatch an error action
    }
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

export const startTranscription = () => async (dispatch: any, getState: any) => {
    dispatch({ type: START_TRANSCRIPTION });
    try {
        await transcribeAndTranslateService(dispatch, getState);

        // Handle success if needed
    } catch (err) {
        console.error("Error during transcription:", err);
        dispatch(setIsTranscribing(false));
    }
};

export const stopTranscription = () => async (dispatch: any, getState: any) => {
    dispatch({ type: STOP_TRANSCRIPTION });
    try {
        await stopTranscriptionService(dispatch, getState);
        dispatch(setIsTranscribing(false));
    } catch (err) {
        console.error("Error stopping transcription:", err);
    }
};

export const startRecordingOpenAi = () => {
    return {
        type: START_RECORDING_OPENAI,
    };
};

export const stopRecordingOpenAi = () => {
    return {
        type: STOP_RECORDING_OPENAI,
    };
};

// export const translateOpenAi = () => ({
//     type: TRANSLATE_OPENAI,
// });

export const translateOpenAi = (recordedBlob: any) => async (dispatch: any, getState: any) => {
    try {
        console.log("TRANSLATE OPENAI");

        // Dispatch action to set recording state
        dispatch(setIsRecording(false));

        // Call the asynchronous service
        await transcribeAndTranslateServiceOpenAi(dispatch, getState, recordedBlob);

        // Optionally, dispatch success actions or handle results
        // For example:
        // dispatch({ type: TRANSLATE_OPENAI_SUCCESS, payload: result });
    } catch (err) {
        console.error("Error in OpenAI translate service:", err);

        // Optionally, dispatch failure actions
        // dispatch({ type: TRANSLATE_OPENAI_FAILURE, payload: err });
    }
};

export const debugging = () => {
    return {
        type: DEBUGGING,
    };
};

export const setParticipantData = (participants: IParticipant[]) => {
    return {
        type: SET_PARTICIPANT_DATA,
        payload: participants,
    };
};

export const setDisplayName = (displayName: string) => {
    return {
        type: SET_DISPLAY_NAME,
        payload: displayName,
    };
};

export const setDisplayDialect = (displayDialect: string) => {
    return {
        type: SET_DISPLAY_DIALECT,
        payload: displayDialect,
    };
};

export const setEntityData = (thisEntityData: IEntityData) => {
    return {
        type: SET_ENTITY_DATA,
        payload: thisEntityData,
    };
};

export const setModeratorData = (moderators: IModerator[]) => {
    return {
        type: SET_MODERATOR_DATA,
        payload: moderators,
    };
};

export const setLinguistData = (linguists: ILinguist) => {
    return {
        type: SET_LINGUIST_DATA,
        payload: linguists,
    };
};

export const setIsTranscribing = (isTranscribing: boolean) => {
    return {
        type: SET_IS_TRANSCRIBING,
        payload: isTranscribing,
    };
};

export const setIsRecording = (isRecording: boolean) => {
    return {
        type: SET_IS_RECORDING,
        payload: isRecording,
    };
};

export const setTranscriptionResult = (result: IRecognitionResultPayload) => {
    return {
        type: SET_TRANSCRIPTION_RESULT,
        payload: result,
    };
};

export const setMeetingData = (meetingData: IMeetingData) => {
    return {
        type: SET_MEETING_DATA,
        payload: meetingData,
    };
};

export const setLatestPrivateMessage = (latestPrivateMessage: string) => {
    return {
        type: SET_LATEST_PRIVATE_MESSAGE,
        payload: latestPrivateMessage,
    };
};

export const setMessages = () => {
    return {
        type: SET_MESSAGES,
    };
};

export function addMessageVideoTranslatorAI(messageDetails: Object) {
    return {
        type: ADD_MESSAGE_VIDEOTRANSLATORAI,
        ...messageDetails,
    };
}
