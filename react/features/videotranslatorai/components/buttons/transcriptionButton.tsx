import React, { FC } from "react";

import Tooltip from "../../../base/tooltip/components/Tooltip";

import "./transcriptionButton.css"; // Make sure to import your CSS file

// import Tooltip from "../../../tooltip/components/Tooltip";

interface TranscriptionButtonProps {
    handleStart: () => void;
    handleStop: () => void;
    isRecording: boolean;
}

const TranscriptionButton: FC<TranscriptionButtonProps> = ({ isRecording, handleStart, handleStop }) => (
    <Tooltip containerClassName="transcription-tooltip" content="Transcription/Translation" position="top">
        <div className={`toolbox-icon ${isRecording ? "on" : ""}`} onClick={isRecording ? handleStop : handleStart}>
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
    </Tooltip>
);

export default TranscriptionButton;