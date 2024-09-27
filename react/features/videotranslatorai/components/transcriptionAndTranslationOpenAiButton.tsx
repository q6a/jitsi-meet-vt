import React, { FC, useEffect, useState } from "react";
import { ReactMic } from "react-mic";
import { useDispatch, useSelector, useStore } from "react-redux";

import { IReduxState } from "../../app/types";
import { startRecordingOpenAi, stopRecordingOpenAi, translateOpenAi } from "../action.web";

// declare module "react-mic";

// import { ReactMic } from 'react-mic';

const TranscriptionAndTranslationOpenAiButton: FC = () => {
    const dispatch = useDispatch();
    const store = useStore();
    const isRecording = useSelector((state: IReduxState) => state["features/videotranslatorai"].isRecording);
    const isAudioMuted = useSelector((state: IReduxState) => state["features/base/media"].audio.muted);
    const [recording, setRecording] = useState(false);

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
        console.log("Recorded Blob:", recordedBlob);

        // dispatch(setRecordingBlobOpenAi(recordedBlob)); // Update the state first
        dispatch(translateOpenAi(recordedBlob)); // Then start translation
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
                    onData={handleOnData}
                    onStop={handleOnStop}
                    record={isRecording}
                    strokeColor="#000000"
                />
            </div>

            <div
                className="toolbox-icon"
                onClick={isRecording ? handleStopTranscription : handleStartTranscription}
                style={{ backgroundColor: isRecording ? "green" : "transparent" }}
            >
                <div className="jitsi-icon jitsi-icon-default">
                    <div>
                        {isRecording ? (
                            <svg
                                fill="#ffffff"
                                height={20}
                                version="1.1"
                                viewBox="0 0 32 32"
                                width={20}
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <g>
                                    <circle cx="16" cy="16" fill="#ffffff" r="4" />
                                    <path d="M16,2C8.3,2,2,8.3,2,16s6.3,14,14,14s14-6.3,14-14S23.7,2,16,2z M16,22c-3.3,0-6-2.7-6-6s2.7-6,6-6s6,2.7,6,6S19.3,22,16,22z" />
                                </g>
                            </svg>
                        ) : (
                            <svg
                                fill="#ffffff"
                                height={20}
                                version="1.1"
                                viewBox="0 0 32 32"
                                width={20}
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <g>
                                    <circle cx="16" cy="16" r="4" />
                                    <path d="M16,2C8.3,2,2,8.3,2,16s6.3,14,14,14s14-6.3,14-14S23.7,2,16,2z M16,22c-3.3,0-6-2.7-6-6s2.7-6,6-6s6,2.7,6,6S19.3,22,16,22z" />
                                </g>
                            </svg>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TranscriptionAndTranslationOpenAiButton;
