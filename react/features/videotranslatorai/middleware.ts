import { IReduxState } from "../app/types";
import MiddlewareRegistry from "../base/redux/MiddlewareRegistry";
import { toState } from "../base/redux/functions";

import { setIsRecording, setLatestPrivateMessage, setPrivateMessages, setTranscriptionResult } from "./action.web";
import {
    DEBUGGING,
    RECOGNITION_RESULT,
    SET_MESSAGES,
    START_RECORDING_OPENAI,
    STOP_RECORDING_OPENAI,
} from "./actionTypes";
import { IMessage } from "./types";

MiddlewareRegistry.register((store) => (next) => (action) => {
    switch (action.type) {
        case START_RECORDING_OPENAI:
            console.log("START RECORDING");
            store.dispatch(setIsRecording(true));
            break;

        case STOP_RECORDING_OPENAI:
            console.log("STOP RECORDING");
            store.dispatch(setIsRecording(false));
            break;

        case RECOGNITION_RESULT:
            try {
                const { transcription, translationMap, participantId } = action.payload;

                store.dispatch(setTranscriptionResult({ transcription, translationMap, participantId }));
            } catch (err) {
                console.error("Error handling recognition result:", err);
            }
            break;

        case SET_MESSAGES: {
            const state: IReduxState = store.getState();
            const participantName: string = toState(state)["features/videotranslatorai"].participantName;
            const messages: IMessage[] = toState(state)["features/videotranslatorai"].messages;
            const prevMessages: IMessage[] = toState(state)["features/videotranslatorai"].privateMessages;

            let latestPrivateMessage = "";

            if (prevMessages !== messages) {
                const privateMessages = messages.filter(
                    (message) => message.privateMessage && message.recipient === participantName
                );

                if (privateMessages.length > 0) {
                    latestPrivateMessage = privateMessages[privateMessages.length - 1].message;
                    store.dispatch(setLatestPrivateMessage(latestPrivateMessage));
                }

                store.dispatch(setPrivateMessages(messages));
            }
            break;
        }

        case DEBUGGING: {
            const state: IReduxState = store.getState(); // Directly accessing the Redux state from the store
            const participantData = toState(state)["features/videotranslatorai"].participantData;
            const meetingData: any = toState(state)["features/videotranslatorai"].meetingData;
            const linguistData = toState(state)["features/videotranslatorai"].linguistData;
            const thisEntityData = toState(state)["features/videotranslatorai"].thisEntityData;
            const messages = toState(state)["features/videotranslatorai"].messages;
            const privateMessages = toState(state)["features/videotranslatorai"].privateMessages;
            const moderatorData = toState(state)["features/videotranslatorai"].moderatorData;

            // console.log("Participant Data", participantData);
            // console.log("Meeting Data", meetingData);
            // console.log("Linguist Data", linguistData);
            // console.log("This Entity Data", thisEntityData);
            // console.log("Messages", messages);
            // console.log("Private Messages", privateMessages);
            // console.log("Moderator Data", moderatorData);
            break;
        }

        default:
            break;
    }

    // Continue the middleware chain synchronously
    return next(action);
});
