import * as speechsdk from 'microsoft-cognitiveservices-speech-sdk';

import { IReduxState, IStore } from '../app/types';
import { getLocalizedDurationFormatter } from '../base/i18n/dateUtil';
import { toState } from '../base/redux/functions';

import {
    ADD_COMPLETED_MESSAGE,
    ADD_MESSAGE_VIDEOTRANSLATORAI,
    DEBUGGING,
    FETCH_MEETING_DATA,
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
    VTAI_LOG_EVENT
} from './actionTypes';
import { createDisplayNameAndDialect } from './services/displayNameAndDialectService';
import { logEvent } from './services/loggerService';
import { getMeetingInformation } from './services/meetingService';
import { playVoiceFromMessage } from './services/voiceServiceMicrosoft';
import { inPersonServiceMicrosoftCont } from './supervisors/inPersonServiceMicrosoftCont';
import { inPersonServiceMicrosoftMan } from './supervisors/inPersonServiceMicrosoftMan';
import { inPersonServiceOpenAi } from './supervisors/inPersonServiceOpenAi';
import { transcribeAndTranslateServiceMicrosoftMan } from './supervisors/transcribeAndTranslateMicrosoftMan';
import { stopTranscriptionService, transcribeAndTranslateService } from './supervisors/transcriptionService';
import { transcribeAndTranslateServiceOpenAi } from './supervisors/transcriptionServiceOpenAi';
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
    IRoomParams
} from './types';


export enum VtaiEventTypes {
    API_CALL_INPERSON_OPENAI_TRANSLATE = 'api_call_inperson_openai_translate',
    API_CALL_MICROSOFT_CONT_TRANSLATE = 'api_call_microsoft_cont_translate',
    API_CALL_MICROSOFT_MAN_TRANSLATE = 'api_call_microsoft_man_translate',
    API_CALL_TRANSCRIPTION = 'api_call_transcription',
    API_CALL_TRANSLATE_MICROSOFT_MANUAL = 'api_call_translate_microsoft_manual',
    API_CALL_VOICEOVER = 'api_call_voiceover',
    API_FAIL_INPERSON_OPENAI_TRANSLATE = 'api_fail_inperson_openai_translate',
    API_FAIL_MICROSOFT_CONT_TRANSLATE = 'api_fail_microsoft_cont_translate',
    API_FAIL_MICROSOFT_MAN_TRANSLATE = 'api_fail_microsoft_man_translate',
    API_FAIL_TRANSCRIPTION = 'api_fail_transcription',
    API_FAIL_TRANSLATE_MICROSOFT_MANUAL = 'api_fail_translate_microsoft_manual',
    API_FAIL_VOICEOVER = 'api_fail_voiceover',
    API_SUCCESS_INPERSON_OPENAI_TRANSLATE = 'api_success_inperson_openai_translate',
    API_SUCCESS_MICROSOFT_CONT_TRANSLATE = 'api_success_microsoft_cont_translate',
    API_SUCCESS_MICROSOFT_MAN_TRANSLATE = 'api_success_microsoft_man_translate',
    API_SUCCESS_TRANSCRIPTION = 'api_success_transcription',
    API_SUCCESS_TRANSLATE_MICROSOFT_MANUAL = 'api_success_translate_microsoft_manual',
    API_SUCCESS_VOICEOVER = 'api_success_voiceover',
    CONTINUOUS_TRANSCRIPTION_DISABLED = 'continuous_transcription_disabled',
    CONTINUOUS_TRANSCRIPTION_ENABLED = 'continuous_transcription_enabled',
    ENDED_MEETING = 'end_meeting',
    FETCH_MEETING_DATA_ERROR = 'fetch_meeting_data_error',
    FETCH_MEETING_DATA_SUCCESS = 'fetch_meeting_data_success',
    JOINED_MEETING = 'joined_meeting',
    JOIN_MEETING_CLICKED = 'join_meeting_clicked',
    LEFT_CALL = 'left_call',
    MANUAL_TRANSCRIPTION_DISABLED = 'manual_transcription_disabled',
    MANUAL_TRANSCRIPTION_ENABLED = 'manual_transcription_enabled',
    MIC_MUTED = 'mic_muted',
    MIC_UNMUTED = 'mic_unmuted',
    RECORDING_STARTED = 'recording_started',
    RECORDING_STOPPED = 'recording_stopped',
    TEXT_TO_SPEECH_API_CALLED = 'text_to_speech_api_called',
    TEXT_TO_SPEECH_API_RESPONDED = 'text_to_speech_api_responded',
    TRANSCRIBE_API_CALLED = 'transcribe_api_called',
    TRANSCRIBE_API_RESPONDED = 'transcribe_api_responded',
    TRANSCRIPTION_ERROR = 'transcription_error',
    TRANSLATE_API_CALLED = 'translate_api_called',
    TRANSLATE_API_RESPONDED = 'translate_api_responded',
    VIDEO_MUTED = 'video_muted',
    VIDEO_UNMUTED = 'video_unmuted',
    VOICEOVER_DISABLED = 'voiceover_disabled',
    VOICEOVER_ENABLED = 'voiceover_enabled'
}


export const sendEventLogToServer = ({ eventType }: { eventType: string; }) =>
    (dispatch: IStore['dispatch'], getState: IStore['getState']) => {
        const state = getState();
        const token = toState(state)['features/videotranslatorai'].jwtToken;
        const meetingId = toState(state)['features/videotranslatorai'].meetingId;
        const clientId = toState(state)['features/videotranslatorai'].clientId;
        const moderatorId = toState(state)['features/videotranslatorai'].thisEntityData.moderatorId;
        const participantId = toState(state)['features/videotranslatorai'].thisEntityData.participant_id;
        const userType = toState(state)['features/videotranslatorai'].thisEntityData.type;
        const meetingType = toState(state)['features/videotranslatorai'].meetingType;

        // time when the first user joined conference
        const startTimestamp = toState(state)['features/base/conference'].conferenceTimestamp;
        const currentTimestamp = new Date();
        const elapsedTime = startTimestamp
            ? getLocalizedDurationFormatter(currentTimestamp.getTime() - startTimestamp)
            : currentTimestamp.toISOString();

        logEvent({
            event: {
                eventType,
                meetingId,
                clientId,
                moderatorId,
                participantId,
                userType,
                meetingType,
                localTimestamp: currentTimestamp.toISOString(),
                elapsedTime
            },
            token
        });
        console.log('VTAI EVENT', eventType);

        return {
            type: VTAI_LOG_EVENT
        };
    };

export const setRecordingBlobOpenAi = (blob: any) => {
    return {
        type: SET_RECORDING_BLOB_OPENAI,
        payload: blob
    };
};

// Existing action creators
export const setRoomParams = (params: IRoomParams) => {
    return {
        type: SET_ROOM_PARAMS,
        payload: params
    };
};

// Existing action creators
export const inPersonSetTTSParams = (params: IInPersonTTSCode) => {
    return {
        type: INPERSON_SET_TTS_PARAMS,
        payload: params
    };
};

// Existing action creators
export const messageNotification = () => {
    return {
        type: MESSAGE_NOTIFICATION
    };
};

export const setMicrosoftRecognizerSDK = (params: speechsdk.TranslationRecognizer) => {
    return {
        type: SET_MICROSOFT_RECOGNIZERSDK,
        payload: params
    };
};

export const setPrivateMessages = (params: IMessage[]) => {
    return {
        type: SET_PRIVATE_MESSAGES,
        payload: params
    };
};

export const startRecordingOpenAi = () => {
    return {
        type: START_RECORDING_OPENAI
    };
};

export const stopRecordingOpenAi = () => {
    return {
        type: STOP_RECORDING_OPENAI
    };
};

export const debugging = () => {
    return {
        type: DEBUGGING
    };
};

export const setParticipantData = (participants: IParticipant[]) => {
    return {
        type: SET_PARTICIPANT_DATA,
        payload: participants
    };
};

export const setDisplayName = (displayName: string) => {
    return {
        type: SET_DISPLAY_NAME,
        payload: displayName
    };
};

export const setDisplayDialect = (displayDialect: string) => {
    return {
        type: SET_DISPLAY_DIALECT,
        payload: displayDialect
    };
};

export const setEntityData = (thisEntityData: IEntityData) => {
    return {
        type: SET_ENTITY_DATA,
        payload: thisEntityData
    };
};

export const setModeratorData = (moderators: IModerator[]) => {
    return {
        type: SET_MODERATOR_DATA,
        payload: moderators
    };
};

export const setLinguistData = (linguists: ILinguist) => {
    return {
        type: SET_LINGUIST_DATA,
        payload: linguists
    };
};

export const setIsTranscribing = (isTranscribing: boolean) => {
    return {
        type: SET_IS_TRANSCRIBING,
        payload: isTranscribing
    };
};

export const setIsPlayingTTS = (isPlayingTTS: boolean) => {
    return {
        type: SET_IS_PLAYING_TTS,
        payload: isPlayingTTS
    };
};

export const setIsRecording = (isRecording: boolean) => {
    return {
        type: SET_IS_RECORDING,
        payload: isRecording
    };
};

export const setTranscriptionResult = (result: IRecognitionResultPayload) => {
    return {
        type: SET_TRANSCRIPTION_RESULT,
        payload: result
    };
};

export const setMeetingData = (meetingData: IMeetingData) => {
    return {
        type: SET_MEETING_DATA,
        payload: meetingData
    };
};

export const addMessageVideoTranslatorAI = (messageDetails: Object) => {
    return {
        type: ADD_MESSAGE_VIDEOTRANSLATORAI,
        ...messageDetails
    };
};

export const fetchMeetingData = (params: IFetchMeetingData) => async (dispatch: any) => {
    // Dispatch an action to store the parameters in the state
    try {
        dispatch(sendEventLogToServer({ eventType: FETCH_MEETING_DATA }));
        const { meetingNameQuery, token, initialName, meetingId } = params;
        const data = await getMeetingInformation(meetingId, token, initialName);

        if (data) {
            dispatch(sendEventLogToServer({ eventType: VtaiEventTypes.FETCH_MEETING_DATA_SUCCESS }));
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
        console.error('Error while fetching meeting information:', error);
        dispatch(sendEventLogToServer({ eventType: VtaiEventTypes.FETCH_MEETING_DATA_ERROR }));
    }
};

export const translateOpenAi
    = (recordedBlobParam: Blob, isMessageCompleted: boolean) => async (dispatch: any, getState: any) => {
        dispatch({ type: TRANSLATE_OPENAI });

        try {
            // Dispatch action to stop the recording
            dispatch(setIsRecording(false));

            // Call the async service and pass the recorded blob
            await transcribeAndTranslateServiceOpenAi(dispatch, getState, recordedBlobParam, isMessageCompleted);

            // Optionally handle results, such as dispatching success actions
            // dispatch({ type: TRANSLATE_OPENAI_SUCCESS, payload: result });
        } catch (err) {
            console.error('Error in OpenAI translate service:', err);

            // Optionally dispatch a failure action if needed
            // dispatch({ type: TRANSLATE_OPENAI_FAILURE, payload: err });
        }
    };

export const startTranscription = () => async (dispatch: any, getState: any) => {
    dispatch({ type: START_TRANSCRIPTION });
    try {
        dispatch(sendEventLogToServer({ eventType: VtaiEventTypes.API_CALL_TRANSCRIPTION }));
        await transcribeAndTranslateService(dispatch, getState);
        dispatch(sendEventLogToServer({ eventType: VtaiEventTypes.API_SUCCESS_TRANSCRIPTION }));

        // Handle success if needed
    } catch (err) {
        console.error('Error during transcription:', err);
        dispatch(sendEventLogToServer({ eventType: VtaiEventTypes.API_FAIL_TRANSCRIPTION }));
    }
};

export const stopTranscription = () => async (dispatch: any, getState: any) => {
    dispatch({ type: STOP_TRANSCRIPTION });
    try {
        await stopTranscriptionService(dispatch, getState);
        dispatch(setIsTranscribing(false));
    } catch (err) {
        console.error('Error stopping transcription:', err);
    }
};

export const startTextToSpeech = (text: string, textToSpeechCode: string) => async (dispatch: any, getState: any) => {
    dispatch({ type: START_TEXT_TO_SPEECH });

    try {
        const state: IReduxState = getState();

        dispatch(sendEventLogToServer({ eventType: VtaiEventTypes.API_CALL_VOICEOVER }));

        // Call the playVoiceFromMessage function with the text and state
        await playVoiceFromMessage(text, state, textToSpeechCode, dispatch);

        // Handle success if needed
    } catch (err) {
        console.error('Error during text-to-speech:', err);
        dispatch(sendEventLogToServer({ eventType: VtaiEventTypes.API_FAIL_VOICEOVER }));
    } finally {
        dispatch(sendEventLogToServer({ eventType: VtaiEventTypes.API_SUCCESS_VOICEOVER }));
    }
};

export const inPersonStartRecordingPersonOne = () => {
    return {
        type: INPERSON_START_RECORDING_PERSONONE
    };
};

export const inPersonStopRecordingPersonOne = () => {
    return {
        type: INPERSON_STOP_RECORDING_PERSONONE
    };
};

export const inPersonStartRecordingPersonTwo = () => {
    return {
        type: INPERSON_START_RECORDING_PERSONTWO
    };
};

export const inPersonStopRecordingPersonTwo = () => {
    stopTranscription();

    return {
        type: INPERSON_STOP_RECORDING_PERSONTWO
    };
};

export const inPersonStartTranscription = () => {
    return {
        type: INPERSON_START_TRANSCRIPTION
    };
};

export const inPersonStopTranscription = () => {
    return {
        type: INPERSON_STOP_TRANSCRIPTION
    };
};

export const inPersonTranslateOpenAi
    = (
            recordedBlobParam: any,
            langFrom: any,
            participantName: any,
            langFromTranslation: any,
            dialectIdFrom: any = '',
            dialectIdTo: any = '',
            langFromTranslationId: any = '',
            isMessageCompleted: boolean,
            isContMode: boolean
    ) =>
        async (dispatch: any, getState: any) => {
            try {

                dispatch(sendEventLogToServer({ eventType: VtaiEventTypes.API_CALL_INPERSON_OPENAI_TRANSLATE }));

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
                    langFromTranslationId,
                    isMessageCompleted,
                    isContMode
                );

                dispatch(sendEventLogToServer({ eventType: VtaiEventTypes.API_SUCCESS_INPERSON_OPENAI_TRANSLATE }));

                // Optionally handle results, such as dispatching success actions
                // dispatch({ type: TRANSLATE_OPENAI_SUCCESS, payload: result });
            } catch (err) {
                console.error('Error in OpenAI translate service:', err);

                dispatch(sendEventLogToServer({ eventType: VtaiEventTypes.API_FAIL_INPERSON_OPENAI_TRANSLATE }));

                // Optionally dispatch a failure action if needed
                // dispatch({ type: TRANSLATE_OPENAI_FAILURE, payload: err });
            }
        };

export const inPersonTranslateMicrosoftMan
    = (
            recordedBlobParam: any,
            langFrom: any,
            participantName: any,
            langFromTranslation: any,
            dialectIdFrom: any = '',
            dialectIdTo: any = '',
            langFromTranslationId: any = '',
            isMessageCompleted: boolean
    ) =>
        async (dispatch: any, getState: any) => {
            try {
                dispatch(sendEventLogToServer({ eventType: VtaiEventTypes.API_CALL_MICROSOFT_MAN_TRANSLATE }));

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
                    langFromTranslationId,
                    isMessageCompleted
                );

                dispatch(sendEventLogToServer({ eventType: VtaiEventTypes.API_SUCCESS_MICROSOFT_MAN_TRANSLATE }));


                // Optionally handle results, such as dispatching success actions
                // dispatch({ type: TRANSLATE_OPENAI_SUCCESS, payload: result });
            } catch (err) {
                console.error('Error in OpenAI translate service:', err);

                dispatch(sendEventLogToServer({ eventType: VtaiEventTypes.API_FAIL_MICROSOFT_MAN_TRANSLATE }));

                // Optionally dispatch a failure action if needed
                // dispatch({ type: TRANSLATE_OPENAI_FAILURE, payload: err });
            }
        };

export const inPersonTranslateMicrosoftCont
    = (langFrom: any, langTo: any, participantName: any, dialectIdFrom: any = '', dialectIdTo: any = '') =>
        async (dispatch: any, getState: any) => {
            try {

                dispatch(sendEventLogToServer({ eventType: VtaiEventTypes.API_CALL_MICROSOFT_CONT_TRANSLATE }));

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

                dispatch(sendEventLogToServer({ eventType: VtaiEventTypes.API_SUCCESS_MICROSOFT_CONT_TRANSLATE }));

                // Optionally handle results, such as dispatching success actions
                // dispatch({ type: TRANSLATE_OPENAI_SUCCESS, payload: result });
            } catch (err) {
                console.error('Error in OpenAI translate service:', err);

                dispatch(sendEventLogToServer({ eventType: VtaiEventTypes.API_FAIL_MICROSOFT_CONT_TRANSLATE }));

                // Optionally dispatch a failure action if needed
                // dispatch({ type: TRANSLATE_OPENAI_FAILURE, payload: err });
            }
        };

export const startTranslateMicrosoftManual = (recordedBlobParam: any) => async (dispatch: any, getState: any) => {
    dispatch({ type: START_TRANSLATE_MICROSOFT_MANUAL });
    try {
        dispatch(sendEventLogToServer({ eventType: VtaiEventTypes.API_CALL_TRANSLATE_MICROSOFT_MANUAL }));
        await transcribeAndTranslateServiceMicrosoftMan(dispatch, getState, recordedBlobParam);
        dispatch(sendEventLogToServer({ eventType: VtaiEventTypes.API_SUCCESS_TRANSLATE_MICROSOFT_MANUAL }));

        // Handle success if needed
    } catch (err) {
        dispatch(sendEventLogToServer({ eventType: VtaiEventTypes.API_FAIL_TRANSLATE_MICROSOFT_MANUAL }));
        console.error('Error during transcription:', err);
        dispatch(setIsTranscribing(false));
    }
};

export const stopTranslateMicrosoftManual = () => async (dispatch: any) => {
    dispatch({ type: STOP_TRANSLATE_MICROSOFT_MANUAL });
    try {
        // await stopTranscriptionService(dispatch, getState);
        // dispatch(setIsTranscribing(false));
    } catch (err) {
        console.error('Error stopping transcription:', err);
    }
};

export const startRecordingMirosoftManual = () => {
    return {
        type: START_RECORDING_MICROSOFT_MANUAL
    };
};

export const stopRecordingMirosoftManual = () => {
    return {
        type: STOP_RECORDING_MICROSOFT_MANUAL
    };
};

export const addCompletedMessage = (message: string) => {
    return {
        type: ADD_COMPLETED_MESSAGE,
        payload: message
    };
};
