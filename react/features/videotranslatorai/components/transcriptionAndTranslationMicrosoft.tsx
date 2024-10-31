import React, { FC, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { IReduxState } from "../../app/types";
import { isLocalParticipantModerator } from "../../base/participants/functions";
import { toState } from "../../base/redux/functions";
import { startTextToSpeech, startTranscription, stopTranscription } from "../action.web";

import SoundToggleButton from "./buttons/soundToggleButton";
import TranscriptionButton from "./buttons/transcriptionButton"; // Import the TranscriptionButton

const TranscriptionAndTranslationButton: FC = () => {
    const dispatch = useDispatch();
    const state = useSelector((state: IReduxState) => state);

    const isTranscribing = useSelector((state: IReduxState) => state["features/videotranslatorai"].isTranscribing);
    const isAudioMuted = useSelector((state: IReduxState) => state["features/base/media"].audio.muted);
    const meetingTypeVideoTranslatorAi = useSelector(
        (state: IReduxState) => state["features/videotranslatorai"].meetingType
    );
    const isModerator = useSelector(isLocalParticipantModerator);
    const messages = useSelector((state: IReduxState) => state["features/videotranslatorai"].completedMessages);

    const [previousMessages, setPreviousMessages] = useState(messages);
    const [isSoundOn, setIsSoundOn] = useState(true);

    const toggleSound = () => {
        setIsSoundOn((prev) => !prev);
    };

    useEffect(() => {
        if (!isSoundOn) {
            return;
        }
        if (messages !== previousMessages) {
            const lastMessage = messages[messages.length - 1];

            if (lastMessage) {
                const textToSpeechCode = toState(state)["features/videotranslatorai"].textToSpeechCode;

                dispatch(startTextToSpeech(lastMessage, textToSpeechCode));
            }
            setPreviousMessages(messages);
        }
    }, [messages, previousMessages]);

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

        setIsSoundOn(false);
    }, []);

    useEffect(() => {
        if (isAudioMuted) {
            dispatch(stopTranscription());
        }
    }, [isAudioMuted]);

    return (
        <div>
            {/* Buttons */}
            <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                <SoundToggleButton isSoundOn={isSoundOn} toggleSound={toggleSound} />

                {(meetingTypeVideoTranslatorAi !== "broadcast" || isModerator) && (
                    <TranscriptionButton
                        handleStart={handleStartTranscription}
                        handleStop={handleStopTranscription}
                        isRecording={isTranscribing}
                    />
                )}
            </div>
        </div>
    );
};

export default TranscriptionAndTranslationButton;
