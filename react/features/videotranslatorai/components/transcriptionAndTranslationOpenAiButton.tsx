import React, { FC, useEffect, useState } from "react";
import { ReactMic } from "react-mic";
import { useDispatch, useSelector } from "react-redux";

import { IReduxState } from "../../app/types";
import { startRecordingOpenAi, stopRecordingOpenAi, translateOpenAi } from "../action.web";
import { playVoiceFromMessage } from "../services/voiceServiceOpenai";

// declare module "react-mic";

// import { ReactMic } from 'react-mic';

const TranscriptionAndTranslationOpenAiButton: FC = () => {
    const dispatch = useDispatch();
    const state = useSelector((state: IReduxState) => state); // Get the entire state

    const isRecording = useSelector((state: IReduxState) => state["features/videotranslatorai"].isRecording);
    const isAudioMuted = useSelector((state: IReduxState) => state["features/base/media"].audio.muted);
    const messages = useSelector((state: IReduxState) => state["features/videotranslatorai"].messages); // Get messages
    const [previousMessages, setPreviousMessages] = useState(messages);
    const [isSoundOn, setIsSoundOn] = useState(true); // New state for sound toggle

    // Toggle sound on or off
    const toggleSound = () => {
        setIsSoundOn((prev) => !prev);
    };

    useEffect(() => {
        // // Detect a change in messages
        if (!isSoundOn) {
            return;
        }
        if (messages !== previousMessages) {
            const lastMessage = messages[messages.length - 1]; // Get the last message

            if (lastMessage) {
                playVoiceFromMessage(lastMessage.message, state); // Pass the message to the voice service
            }
            setPreviousMessages(messages); // Update the previous messages state
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
            {/* Button to toggle sound on/off */}

            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <div
                    className="toolbox-icon"
                    onClick={toggleSound}
                    style={{
                        backgroundColor: isSoundOn ? "green" : "transparent", // Change based on sound state
                        cursor: "pointer",
                        transition: "transform 0.3s ease",
                        transform: isSoundOn ? "scale(1.1)" : "scale(1)",
                        border: "2px solid white", // Add white contours (border)
                        borderRadius: "50%", // Keep it circular if required
                        width: "40px", // Set the dimensions to match Jitsi style
                        height: "40px",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                    }}
                >
                    <div className="jitsi-icon jitsi-icon-default">
                        <div>
                            {isSoundOn ? (
                                // Sound On Icon
                                <svg
                                    fill="#ffffff"
                                    height={20}
                                    version="1.1"
                                    viewBox="0 0 32 32"
                                    width={20}
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <g>
                                        <path d="M8 12v8h6l6 5v-18l-6 5h-6z" /> {/* Speaker body */}
                                        <path d="M20 10c2 1 4 3 4 6s-2 5-4 6" /> {/* Sound waves */}
                                        <path d="M22 8c3 2 6 5 6 8s-3 6-6 8" /> {/* Sound waves */}
                                    </g>
                                </svg>
                            ) : (
                                // Sound Off Icon
                                <svg
                                    fill="#ffffff"
                                    height={20}
                                    version="1.1"
                                    viewBox="0 0 32 32"
                                    width={20}
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <g>
                                        <path d="M8 12v8h6l6 5v-18l-6 5h-6z" /> {/* Speaker body */}
                                        <line stroke="white" strokeWidth="2" x1="24" x2="30" y1="8" y2="14" />{" "}
                                        {/* Line for sound off */}
                                        <line stroke="white" strokeWidth="2" x1="30" x2="24" y1="8" y2="14" />{" "}
                                        {/* Line for sound off */}
                                    </g>
                                </svg>
                            )}
                        </div>
                    </div>
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
        </div>
    );
};

export default TranscriptionAndTranslationOpenAiButton;
