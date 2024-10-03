import React, { FC, useEffect, useState } from "react";
import { ReactMic } from "react-mic";
import { useDispatch, useSelector } from "react-redux";

import { IReduxState } from "../../app/types";
import { startRecordingOpenAi, startTextToSpeech, stopRecordingOpenAi, translateOpenAi } from "../action.web";

import SoundToggleButton from "./buttons/soundToggleButton";
import TranscriptionButton from "./buttons/transcriptionButton";

const TranscriptionAndTranslationOpenAiButton: FC = () => {
    const dispatch = useDispatch();
    const state = useSelector((state: IReduxState) => state);

    const isRecording = useSelector((state: IReduxState) => state["features/videotranslatorai"].isRecording);
    const isAudioMuted = useSelector((state: IReduxState) => state["features/base/media"].audio.muted);
    const messages = useSelector((state: IReduxState) => state["features/videotranslatorai"].messages);

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
                // playVoiceFromMessage(lastMessage.message, state);
                dispatch(startTextToSpeech(lastMessage.message));
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
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <SoundToggleButton isSoundOn={isSoundOn} toggleSound={toggleSound} />
                <TranscriptionButton
                    handleStart={handleStartTranscription}
                    handleStop={handleStopTranscription}
                    isRecording={isRecording}
                />
            </div>
        </div>
    );
};

export default TranscriptionAndTranslationOpenAiButton;
