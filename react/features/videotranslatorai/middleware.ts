// import MiddlewareRegistry from '../base/redux/MiddlewareRegistry';
// import { toState } from '../base/redux/functions';
// import { IReduxState, IStore } from '../app/types';
// import * as speechsdk from 'microsoft-cognitiveservices-speech-sdk';

// import { 
//     START_TRANSCRIPTION,
//     STOP_TRANSCRIPTION,
//     RECOGNITION_RESULT,
//     SET_ROOM_PARAMS,
//     SET_ALL_DATA_PARTICIPANT_ENTITIES,
//     SET_PARTICIPANT_DATA,
//     SET_MODERATOR_DATA,
//     SET_LINGUIST_DATA,
//     SET_IS_TRANSCRIBING,
//     SET_TRANSCRIPTION_RESULT,
//     SET_MEETING_DATA,
//     FETCH_MEETING_DATA,
//     DEBUGGING,
//     SET_MESSAGES,
//     START_RECORDING_OPENAI,
//     STOP_RECORDING_OPENAI,
//     TRANSLATE_OPENAI
// } from './actionTypes';


// import { 
//     setIsTranscribing, 
//     setTranscriptionResult,
//     setRoomParams,
//     setParticipantData,
//     setModeratorData,
//     setLinguistData,
//     setMeetingData,
//     fetchMeetingData,
//     setEntityData,
//     setDisplayName,
//     setDisplayDialect,
//     setMicrosoftRecognizerSDK,
//     startTranscription,
//     stopTranscription,
//     setPrivateMessages,
//     setLatestPrivateMessage,
//     setIsRecording
// } from './action.web';


// import {
//     IMessage,
//     IRoomParams,
//     IFetchMeetingData,
//     IParticipant,
//     IModerator,
//     ILinguist,
//     IMeetingData,
//     IEntityData,
//     IRecognitionResultPayload
// } from './types';

// import { stopTranscriptionService, transcribeAndTranslateService, } from './services/transcriptionService';
// import { transcribeAndTranslateServiceOpenAi } from './services/transcriptionServiceOpenAi';
// import { getMeetingInformation } from './services/meetingService';
// import { createDisplayNameAndDialect } from './services/displayNameAndDialectService';


// MiddlewareRegistry.register(store => next => action => {
//     switch (action.type) {
//         case START_TRANSCRIPTION:
//             store.dispatch(setIsTranscribing(true));
//             transcribeAndTranslateService(store)
//                 .then(() => {
//                     // Handle successful transcription if needed
                    
//                 })
//                 .catch(err => {
//                     console.error('Error during transcription:', err);
//                     store.dispatch(setIsTranscribing(false));
//                 });
//             break;

//         case STOP_TRANSCRIPTION:
//             stopTranscriptionService(store)
//                 .then(() => {
//                     store.dispatch(setIsTranscribing(false));
//                 })
//                 .catch(err => {
//                     console.error('Error stopping transcription:', err);
//                 });
//             break;

//         case START_RECORDING_OPENAI:
//             console.log("START RECORDING");
//             store.dispatch(setIsRecording(true));
//             break;

//         case STOP_RECORDING_OPENAI:
//             console.log("STOP RECORDING");
//             store.dispatch(setIsRecording(false));
//             break;

//         case TRANSLATE_OPENAI:
//             console.log("TRANSLATE OPENAI");
//             store.dispatch(setIsRecording(false));
//             // If transcribeAndTranslateServiceOpenAi returns a Promise, handle it accordingly
//             // transcribeAndTranslateServiceOpenAi(store)
//             //     .then(() => {
//             //         // Handle successful translation if needed
//             //     })
//             //     .catch(err => {
//             //         console.error('Error in OpenAI translate service:', err);
//             //     });
//             break;

//         case RECOGNITION_RESULT:
//             try {
//                 const { transcription, translationMap, participantId } = action.payload;
//                 store.dispatch(setTranscriptionResult({ transcription, translationMap, participantId }));
//             } catch (err) {
//                 console.error('Error handling recognition result:', err);
//             }
//             break;

//         case SET_MESSAGES: {
//             const state: IReduxState = store.getState();
//             const participantName: string = toState(state)['features/videotranslatorai'].participantName;
//             const messages: IMessage[] = toState(state)['features/videotranslatorai'].messages;
//             const prevMessages: IMessage[] = toState(state)['features/videotranslatorai'].privateMessages;

//             let latestPrivateMessage: string = '';
//             if (prevMessages !== messages) {
//                 const privateMessages = messages.filter(message => message.privateMessage && message.recipient === participantName);
//                 if (privateMessages.length > 0) {
//                     latestPrivateMessage = privateMessages[privateMessages.length - 1].message;
//                     store.dispatch(setLatestPrivateMessage(latestPrivateMessage));
//                 }

//                 store.dispatch(setPrivateMessages(messages));
//             }
//             break;
//         }

//         case FETCH_MEETING_DATA:
//             (async () => {
//                 try {
//                     const { meetingNameQuery, token, initialName, meetingId } = action.payload;
//                     const data = await getMeetingInformation(meetingId, token, initialName);
//                     if (data) {
//                         // Dispatch actions with the fetched data
//                         store.dispatch(setMeetingData(data.meetingData));
//                         store.dispatch(setModeratorData(data.moderatorData));
//                         store.dispatch(setLinguistData(data.linguistData));
//                         store.dispatch(setParticipantData(data.participantData));
//                         store.dispatch(setEntityData(data.thisEntityData));
//                         const displayDialectAndName = createDisplayNameAndDialect(initialName, data.moderatorData, data.participantData, data.linguistData);
//                         store.dispatch(setDisplayName(displayDialectAndName.displayName));
//                         store.dispatch(setDisplayDialect(displayDialectAndName.displayDialect));
//                     }
//                 } catch (error) {
//                     console.error('Error while fetching meeting information:', error);
//                     // Handle error, e.g., dispatch an error action
//                 }
//             })();
//             break;

//         case DEBUGGING: {
//             const state: IReduxState = store.getState(); // Directly accessing the Redux state from the store
//             const participantData = toState(state)['features/videotranslatorai'].participantData;
//             const meetingData: any = toState(state)['features/videotranslatorai'].meetingData;
//             const linguistData = toState(state)['features/videotranslatorai'].linguistData;
//             const thisEntityData = toState(state)['features/videotranslatorai'].thisEntityData;
//             const messages = toState(state)['features/videotranslatorai'].messages;
//             const privateMessages = toState(state)['features/videotranslatorai'].privateMessages;
//             const moderatorData = toState(state)['features/videotranslatorai'].moderatorData;

//             console.log("Participant Data", participantData);
//             console.log("Meeting Data", meetingData);
//             console.log("Linguist Data", linguistData);
//             console.log("This Entity Data", thisEntityData);
//             console.log("Messages", messages);
//             console.log("Private Messages", privateMessages);
//             console.log("Moderator Data", moderatorData);
//             break;
//         }

//         default:
//             break;
//     }

//     // Continue the middleware chain synchronously
//     return next(action);
// });


import MiddlewareRegistry from '../base/redux/MiddlewareRegistry';
import { toState } from '../base/redux/functions';
import { IReduxState, IStore } from '../app/types';
import * as speechsdk from 'microsoft-cognitiveservices-speech-sdk';

import { 
    START_TRANSCRIPTION,
    STOP_TRANSCRIPTION,
    RECOGNITION_RESULT,
    SET_ROOM_PARAMS,
    SET_ALL_DATA_PARTICIPANT_ENTITIES,
    SET_PARTICIPANT_DATA,
    SET_MODERATOR_DATA,
    SET_LINGUIST_DATA,
    SET_IS_TRANSCRIBING,
    SET_TRANSCRIPTION_RESULT,
    SET_MEETING_DATA,
    FETCH_MEETING_DATA,
    DEBUGGING,
    SET_MESSAGES,
    START_RECORDING_OPENAI,
    STOP_RECORDING_OPENAI,
    TRANSLATE_OPENAI
} from './actionTypes';


import { 
    setIsTranscribing, 
    setTranscriptionResult,
    setRoomParams,
    setParticipantData,
    setModeratorData,
    setLinguistData,
    setMeetingData,
    fetchMeetingData,
    setEntityData,
    setDisplayName,
    setDisplayDialect,
    setMicrosoftRecognizerSDK,
    startTranscription,
    stopTranscription,
    setPrivateMessages,
    setLatestPrivateMessage,
    setIsRecording
} from './action.web';


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

import { stopTranscriptionService, transcribeAndTranslateService, } from './services/transcriptionService';
import { transcribeAndTranslateServiceOpenAi } from './services/transcriptionServiceOpenAi';
import { getMeetingInformation } from './services/meetingService';
import { createDisplayNameAndDialect } from './services/displayNameAndDialectService';


MiddlewareRegistry.register(store => next => async action => {
    switch (action.type) {
        case START_TRANSCRIPTION:
            store.dispatch(setIsTranscribing(true));
            try {
                await transcribeAndTranslateService(store);
            } catch (err) {
                console.error('Error during transcription:', err);
                store.dispatch(setIsTranscribing(false));
            }
            break;

        case STOP_TRANSCRIPTION:
            try {
                await stopTranscriptionService(store);
                store.dispatch(setIsTranscribing(false));
            } catch (err) {
                console.error('Error stopping transcription:', err);
            }
            break;

        case START_RECORDING_OPENAI:
            console.log("START RECORDING");
            store.dispatch(setIsRecording(true));
            break;

        case STOP_RECORDING_OPENAI:
            console.log("STOP RECORDING");
            store.dispatch(setIsRecording(false));
            break;

        case TRANSLATE_OPENAI:
            try {     
                console.log("TRANSLATE OPENAI");       
                store.dispatch(setIsRecording(false));
                //await transcribeAndTranslateServiceOpenAi(store);
            } catch (err) {
                console.error('Error openai translate service:', err);
            }
            break;

        case RECOGNITION_RESULT:
            try {
                const { transcription, translationMap, participantId } = action.payload;
                store.dispatch(setTranscriptionResult({ transcription, translationMap, participantId }));
            } catch (err) {
                console.error('Error handling recognition result:', err);
            }
            break;

        case SET_MESSAGES:
            {
                const state: IReduxState = store.getState(); 
                const participantName: string = toState(state)['features/videotranslatorai'].participantName;
                //const messages = toState(state)['features/chat'].messages;
                const messages: IMessage[] = toState(state)['features/videotranslatorai'].messages;
                const prevMessages: IMessage[] = toState(state)['features/videotranslatorai'].privateMessages;
                
                let latestPrivateMessage: string = '';
                if(prevMessages != messages){

                    const privateMessages = messages.filter(message => message.privateMessage && message.recipient === participantName);
                    if(privateMessages.length > 0){
                        latestPrivateMessage = privateMessages[privateMessages.length - 1].message
                        store.dispatch(setLatestPrivateMessage(latestPrivateMessage));
                    }

                    store.dispatch(setPrivateMessages(messages));
                }
                
            }
            break;

        case FETCH_MEETING_DATA:
            try {


                const { meetingNameQuery, token, initialName, meetingId } = action.payload;
                const data = await  await getMeetingInformation(meetingId, token, initialName);
                if(data)
                {
                        // Dispatch actions with the fetched data
                        store.dispatch(setMeetingData(data.meetingData));
                        store.dispatch(setModeratorData(data.moderatorData));
                        store.dispatch(setLinguistData(data.linguistData));
                        store.dispatch(setParticipantData(data.participantData));
                        store.dispatch(setEntityData(data.thisEntityData));
                        const displayDialectAndName = createDisplayNameAndDialect(initialName, data.moderatorData, data.participantData, data.linguistData);
                        store.dispatch(setDisplayName(displayDialectAndName.displayName));
                        store.dispatch(setDisplayDialect(displayDialectAndName.displayDialect));
                }   

            } catch (error) {
                console.error('Error while fetching meeting information:', error);
                // Handle error, e.g., dispatch an error action
            }
            break;


        case DEBUGGING:
            const state: IReduxState = store.getState(); // Directly accessing the Redux state from the store
            const participantState = toState(state)['features/base/participants'];
            const tokenData = toState(state)['features/videotranslatorai'].jwtToken;
            const participantData = toState(state)['features/videotranslatorai'].participantData;
            const participantName = toState(state)['features/videotranslatorai'].participantName;
            const meetingData: any = toState(state)['features/videotranslatorai'].meetingData;
            const linguistData = toState(state)['features/videotranslatorai'].linguistData;
            const thisEnityData = toState(state)['features/videotranslatorai'].thisEnityData;
            const  messages = toState(state)['features/videotranslatorai'].messages;
            const privateMessages = toState(state)['features/videotranslatorai'].privateMessages;
            const moderatorData = toState(state)['features/videotranslatorai'].moderatorData;
            const conference = toState(state)['features/base/conference'].conference;

            console.log("Participant Data", participantData);
            console.log("Meeting Data", meetingData);
            console.log("linguist Data", linguistData);
            console.log("thisEntityData", thisEnityData);
            console.log("messages", messages);
            console.log("privateMessages", privateMessages)
            console.log("moderatorData", moderatorData)
            break;

        default:
            break;
    }

    // Continue the middleware chain synchronously
    return next(action);
});


