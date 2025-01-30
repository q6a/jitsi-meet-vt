import React, { FC } from "react";

import Tooltip from "../../../base/tooltip/components/Tooltip";

import "./transcriptionButton.css"; // Import your CSS file

interface InPersonButtonProps {
    handleStart: () => void;
    handleStop: () => void;
    isRecording: boolean;
    number: number;
    toolTipContent: string;
}

const InPersonToggleButton: FC<InPersonButtonProps> = ({
    isRecording,
    handleStart,
    handleStop,
    number,
    toolTipContent,
}) => (
    <Tooltip containerClassName="transcription-tooltip" content={toolTipContent} position="top">
        <div className="toolbox-icon">
            <div
                className="circle-region"
                onClick={isRecording ? handleStop : handleStart}
                // onTouchStart={isRecording ? handleStop : handleStart}
                style={{
                    backgroundColor: isRecording ? "green" : "transparent",
                    cursor: "pointer",
                    transition: "transform 0.3s ease",
                    transform: isRecording ? "scale(1)" : "scale(0.9)",
                    border: "2px solid white",
                    borderRadius: "50%",
                    width: "40px",
                    height: "40px",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    margin: "0 auto",
                }}
            >
                <div className="jitsi-icon jitsi-icon-default" style={{ margin: "0 auto" }}>
                    <div>
                        <svg fill="none" height={20} viewBox="0 0 32 32" width={20} xmlns="http://www.w3.org/2000/svg">
                            <circle cx="16" cy="16" fill="none" r="15" stroke="white" strokeWidth="2" />
                            <text
                                dominantBaseline="middle"
                                fill="white"
                                fontFamily="Arial, sans-serif"
                                fontSize="12"
                                fontWeight="bold"
                                textAnchor="middle"
                                x="50%"
                                y="50%"
                            >
                                {number}
                            </text>
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    </Tooltip>
);

export default InPersonToggleButton;
