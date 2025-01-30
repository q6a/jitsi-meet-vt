import MiddlewareRegistry from "../base/redux/MiddlewareRegistry";

import { setIsRecording, setTranscriptionResult } from "./action.web";
import { RECOGNITION_RESULT, START_RECORDING_OPENAI, STOP_RECORDING_OPENAI } from "./actionTypes";

MiddlewareRegistry.register((store) => (next) => (action) => {
    switch (action.type) {
        case START_RECORDING_OPENAI:
            store.dispatch(setIsRecording(true));
            break;

        case STOP_RECORDING_OPENAI:
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

        default:
            break;
    }

    // Continue the middleware chain synchronously
    return next(action);
});
