import React, { FC, useEffect, useState } from "react";
import { ReactMic } from "react-mic";
import { useDispatch, useSelector } from "react-redux";

import { IReduxState } from "../../app/types";
import { isLocalParticipantModerator } from "../../base/participants/functions";
import { toState } from "../../base/redux/functions";
import { startRecordingOpenAi, startTextToSpeech, stopRecordingOpenAi, translateOpenAi } from "../action.web";

import SoundToggleButton from "./buttons/soundToggleButton";
import TranscriptionButton from "./buttons/transcriptionButton";

const TranscriptionAndTranslationOpenAi: FC = () => {
    const dispatch = useDispatch();
    const state = useSelector((state: IReduxState) => state);

    const isRecording = useSelector((state: IReduxState) => state["features/videotranslatorai"].isRecording);
    const isAudioMuted = useSelector((state: IReduxState) => state["features/base/media"].audio.muted);
    const messages = useSelector((state: IReduxState) => state["features/videotranslatorai"].messages);
    const isModerator = useSelector(isLocalParticipantModerator);
    const meetingTypeVideoTranslatorAi = useSelector(
        (state: IReduxState) => state["features/videotranslatorai"].meetingType
    );

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

                dispatch(startTextToSpeech(lastMessage.message, textToSpeechCode));
            }
            setPreviousMessages(messages);
        }
    }, [messages, previousMessages]);

    const handleStartTranscription = () => {
        if (!isAudioMuted) {
            dispatch(startRecordingOpenAi());
        }
    };

    const handleStopTranscription = () => {
        dispatch(stopRecordingOpenAi());
    };

    useEffect(() => {
        // This will run only once when the component mounts
        if (isRecording) {
            dispatch(stopRecordingOpenAi());
        }

        setIsSoundOn(false);
    }, []);

    useEffect(() => {
        if (isAudioMuted) {
            dispatch(stopRecordingOpenAi());
        }
    }, [isAudioMuted]);

    const handleOnStop = async (recordedBlob: any) => {
        dispatch(translateOpenAi(recordedBlob));
    };

    const handleOnData = (recordedBlob: any) => {
        // console.log("Chunk of real-time data:", recordedBlob);
    };

    return (
        <div>
            <div style={{ visibility: "hidden", height: 0, width: 0, overflow: "hidden" }}>
                <ReactMic
                    backgroundColor="#FF4081"
                    className="sound-wave"
                    onStop={handleOnStop}
                    record={isRecording}
                    strokeColor="#000000"
                />
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                <SoundToggleButton isSoundOn={isSoundOn} toggleSound={toggleSound} />

                {(meetingTypeVideoTranslatorAi !== "broadcast" || isModerator) && (
                    <TranscriptionButton
                        handleStart={handleStartTranscription}
                        handleStop={handleStopTranscription}
                        isRecording={isRecording}
                    />
                )}
            </div>
        </div>
    );
};

export default TranscriptionAndTranslationOpenAi;
