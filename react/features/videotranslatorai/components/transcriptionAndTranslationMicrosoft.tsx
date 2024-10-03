import React, { FC, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import { IReduxState } from "../../app/types";
import { startTranscription, stopTranscription } from "../action.web";

import TranscriptionButton from "./buttons/transcriptionButton"; // Import the TranscriptionButton

const TranscriptionAndTranslationButton: FC = () => {
    const dispatch = useDispatch();

    const isTranscribing = useSelector((state: IReduxState) => state["features/videotranslatorai"].isTranscribing);
    const isAudioMuted = useSelector((state: IReduxState) => state["features/base/media"].audio.muted);

    const handleStartTranscription = () => {
        if (!isAudioMuted) {
            dispatch(startTranscription());
        }
    };

    const handleStopTranscription = () => {
        dispatch(stopTranscription());
    };

    useEffect(() => {
        // This will run only once when the component mounts
        if (isTranscribing) {
            dispatch(stopTranscription());
        }
    }, []);

    useEffect(() => {
        if (isAudioMuted) {
            dispatch(stopTranscription());
        }
    }, [isAudioMuted]);

    return (
        // Use TranscriptionButton here
        <TranscriptionButton
            handleStart={handleStartTranscription} // Pass handleStartTranscription
            handleStop={handleStopTranscription} // Pass handleStopTranscription
            isRecording={isTranscribing}
        />
    );
};

export default TranscriptionAndTranslationButton;
