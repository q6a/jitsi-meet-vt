import * as speechsdk from "microsoft-cognitiveservices-speech-sdk";

import { IReduxState } from "../app/types";

import {
    ADD_COMPLETED_MESSAGE,
    ADD_MESSAGE_VIDEOTRANSLATORAI,
    DEBUGGING,
    INPERSON_SET_TTS_PARAMS,
    INPERSON_START_RECORDING_PERSONONE,
    INPERSON_START_RECORDING_PERSONTWO,
    INPERSON_START_TRANSCRIPTION,
    INPERSON_STOP_RECORDING_PERSONONE,
    INPERSON_STOP_RECORDING_PERSONTWO,
    INPERSON_STOP_TRANSCRIPTION,
    MESSAGE_NOTIFICATION,
    SET_DISPLAY_DIALECT,
    SET_DISPLAY_NAME,
    SET_ENTITY_DATA,
    SET_IS_PLAYING_TTS,
    SET_IS_RECORDING,
    SET_IS_TRANSCRIBING,
    SET_LINGUIST_DATA,
    SET_MEETING_DATA,
    SET_MICROSOFT_RECOGNIZERSDK,
    SET_MODERATOR_DATA,
    SET_PARTICIPANT_DATA,
    SET_PRIVATE_MESSAGES,
    SET_RECORDING_BLOB_OPENAI,
    SET_ROOM_PARAMS,
    SET_TRANSCRIPTION_RESULT,
    START_RECORDING_MICROSOFT_MANUAL,
    START_RECORDING_OPENAI,
    START_TEXT_TO_SPEECH,
    START_TRANSCRIPTION,
    START_TRANSLATE_MICROSOFT_MANUAL,
    STOP_RECORDING_MICROSOFT_MANUAL,
    STOP_RECORDING_OPENAI,
    STOP_TRANSCRIPTION,
    STOP_TRANSLATE_MICROSOFT_MANUAL,
    TRANSLATE_OPENAI,
} from "./actionTypes";
import { createDisplayNameAndDialect } from "./services/displayNameAndDialectService";
import { getMeetingInformation } from "./services/meetingService";
import { playVoiceFromMessage } from "./services/voiceServiceMicrosoft";
import { inPersonServiceMicrosoftCont } from "./supervisors/inPersonServiceMicrosoftCont";
import { inPersonServiceMicrosoftMan } from "./supervisors/inPersonServiceMicrosoftMan";
import { inPersonServiceOpenAi } from "./supervisors/inPersonServiceOpenAi";
import { transcribeAndTranslateServiceMicrosoftMan } from "./supervisors/transcribeAndTranslateMicrosoftMan";
import { stopTranscriptionService, transcribeAndTranslateService } from "./supervisors/transcriptionService";
import { transcribeAndTranslateServiceOpenAi } from "./supervisors/transcriptionServiceOpenAi";
import {
    IEntityData,
    IFetchMeetingData,
    IInPersonTTSCode,
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
export const inPersonSetTTSParams = (params: IInPersonTTSCode) => {
    return {
        type: INPERSON_SET_TTS_PARAMS,
        payload: params,
    };
};

// Existing action creators
export const messageNotification = () => {
    return {
        type: MESSAGE_NOTIFICATION,
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

export const setIsPlayingTTS = (isPlayingTTS: boolean) => {
    return {
        type: SET_IS_PLAYING_TTS,
        payload: isPlayingTTS,
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

export const addMessageVideoTranslatorAI = (messageDetails: Object) => {
    return {
        type: ADD_MESSAGE_VIDEOTRANSLATORAI,
        ...messageDetails,
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

export const translateOpenAi =
    (recordedBlobParam: Blob, isMessageCompleted: boolean) => async (dispatch: any, getState: any) => {
        dispatch({ type: TRANSLATE_OPENAI });

        try {
            // Dispatch action to stop the recording
            dispatch(setIsRecording(false));

            // Call the async service and pass the recorded blob
            await transcribeAndTranslateServiceOpenAi(dispatch, getState, recordedBlobParam, isMessageCompleted);

            // Optionally handle results, such as dispatching success actions
            // dispatch({ type: TRANSLATE_OPENAI_SUCCESS, payload: result });
        } catch (err) {
            console.error("Error in OpenAI translate service:", err);

            // Optionally dispatch a failure action if needed
            // dispatch({ type: TRANSLATE_OPENAI_FAILURE, payload: err });
        }
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

export const startTextToSpeech = (text: string, textToSpeechCode: string) => async (dispatch: any, getState: any) => {
    dispatch({ type: START_TEXT_TO_SPEECH });

    try {
        // Ensure only one playback at a time
        dispatch(setIsPlayingTTS(true));

        const state: IReduxState = getState();

        // Call the playVoiceFromMessage function with the text and state
        await playVoiceFromMessage(text, state, textToSpeechCode);

        // Handle success if needed
    } catch (err) {
        console.error("Error during text-to-speech:", err);

        dispatch(setIsPlayingTTS(false));
    } finally {
        dispatch(setIsPlayingTTS(false)); // Ensure isPlaying is reset after completion
    }
};

export const inPersonStartRecordingPersonOne = () => {
    return {
        type: INPERSON_START_RECORDING_PERSONONE,
    };
};

export const inPersonStopRecordingPersonOne = () => {
    return {
        type: INPERSON_STOP_RECORDING_PERSONONE,
    };
};

export const inPersonStartRecordingPersonTwo = () => {
    return {
        type: INPERSON_START_RECORDING_PERSONTWO,
    };
};

export const inPersonStopRecordingPersonTwo = () => {
    stopTranscription();

    return {
        type: INPERSON_STOP_RECORDING_PERSONTWO,
    };
};

export const inPersonStartTranscription = () => {
    return {
        type: INPERSON_START_TRANSCRIPTION,
    };
};

export const inPersonStopTranscription = () => {
    return {
        type: INPERSON_STOP_TRANSCRIPTION,
    };
};

export const inPersonTranslateOpenAi =
    (
        recordedBlobParam: any,
        langFrom: any,
        participantName: any,
        langFromTranslation: any,
        dialectIdFrom: any = "",
        dialectIdTo: any = "",
        isMessageCompleted: boolean,
        isContMode: boolean
    ) =>
    async (dispatch: any, getState: any) => {
        try {
            // Dispatch action to stop the recording
            dispatch(setIsRecording(false));

            // Call the async service and pass the recorded blob
            await inPersonServiceOpenAi(
                dispatch,
                getState,
                recordedBlobParam,
                langFrom,
                langFromTranslation,
                participantName,
                dialectIdFrom,
                dialectIdTo,
                isMessageCompleted,
                isContMode
            );

            // Optionally handle results, such as dispatching success actions
            // dispatch({ type: TRANSLATE_OPENAI_SUCCESS, payload: result });
        } catch (err) {
            console.error("Error in OpenAI translate service:", err);

            // Optionally dispatch a failure action if needed
            // dispatch({ type: TRANSLATE_OPENAI_FAILURE, payload: err });
        }
    };

export const inPersonTranslateMicrosoftMan =
    (
        recordedBlobParam: any,
        langFrom: any,
        participantName: any,
        langFromTranslation: any,
        dialectIdFrom: any = "",
        dialectIdTo: any = "",
        isMessageCompleted: boolean
    ) =>
    async (dispatch: any, getState: any) => {
        try {
            // Dispatch action to stop the recording

            // Call the async service and pass the recorded blob
            await inPersonServiceMicrosoftMan(
                dispatch,
                getState,
                recordedBlobParam,
                langFrom,
                langFromTranslation,
                participantName,
                dialectIdFrom,
                dialectIdTo,
                isMessageCompleted
            );

            // Optionally handle results, such as dispatching success actions
            // dispatch({ type: TRANSLATE_OPENAI_SUCCESS, payload: result });
        } catch (err) {
            console.error("Error in OpenAI translate service:", err);

            // Optionally dispatch a failure action if needed
            // dispatch({ type: TRANSLATE_OPENAI_FAILURE, payload: err });
        }
    };

export const inPersonTranslateMicrosoftCont =
    (langFrom: any, langTo: any, participantName: any, dialectIdFrom: any = "", dialectIdTo: any = "") =>
    async (dispatch: any, getState: any) => {
        try {
            // Call the async service and pass the recorded blob
            await inPersonServiceMicrosoftCont(
                dispatch,
                getState,
                langFrom,
                langTo,
                participantName,
                dialectIdFrom,
                dialectIdTo
            );

            // Optionally handle results, such as dispatching success actions
            // dispatch({ type: TRANSLATE_OPENAI_SUCCESS, payload: result });
        } catch (err) {
            console.error("Error in OpenAI translate service:", err);

            // Optionally dispatch a failure action if needed
            // dispatch({ type: TRANSLATE_OPENAI_FAILURE, payload: err });
        }
    };

export const startTranslateMicrosoftManual = (recordedBlobParam: any) => async (dispatch: any, getState: any) => {
    dispatch({ type: START_TRANSLATE_MICROSOFT_MANUAL });
    try {
        await transcribeAndTranslateServiceMicrosoftMan(dispatch, getState, recordedBlobParam);

        // Handle success if needed
    } catch (err) {
        console.error("Error during transcription:", err);
        dispatch(setIsTranscribing(false));
    }
};

export const stopTranslateMicrosoftManual = () => async (dispatch: any, getState: any) => {
    dispatch({ type: STOP_TRANSLATE_MICROSOFT_MANUAL });
    try {
        // await stopTranscriptionService(dispatch, getState);
        // dispatch(setIsTranscribing(false));
    } catch (err) {
        console.error("Error stopping transcription:", err);
    }
};

export const startRecordingMirosoftManual = () => {
    return {
        type: START_RECORDING_MICROSOFT_MANUAL,
    };
};

export const stopRecordingMirosoftManual = () => {
    return {
        type: STOP_RECORDING_MICROSOFT_MANUAL,
    };
};

export const addCompletedMessage = (message: string) => {
    return {
        type: ADD_COMPLETED_MESSAGE,
        payload: message,
    };
};