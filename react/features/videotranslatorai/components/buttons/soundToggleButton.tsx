import React, { FC } from "react";

import Tooltip from "../../../base/tooltip/components/Tooltip";
import "./transcriptionButton.css"; // Make sure to import your CSS file

interface SoundToggleButtonProps {
    isSoundOn: boolean;
    toggleSound: () => void;
}

const SoundToggleButton: FC<SoundToggleButtonProps> = ({ isSoundOn, toggleSound }) => (
    <Tooltip
        allowClick={true}
        containerClassName="voiceover-tooltip"
        content="Text To Speech (voiceover)"
        delay={300}
        position="top"
        zIndex={1000}
    >
        <div className="toolbox-icon">
            <div
                className="circle-region"
                onClick={toggleSound}
                style={{
                    backgroundColor: isSoundOn ? "green" : "transparent",
                    cursor: "pointer",
                    transition: "transform 0.3s ease",
                    transform: isSoundOn ? "scale(1)" : "scale(0.9)",
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
                        {isSoundOn ? (
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
                                    <line stroke="white" strokeWidth="2" x1="24" x2="30" y1="8" y2="14" /> {/* Line */}
                                    <line stroke="white" strokeWidth="2" x1="30" x2="24" y1="8" y2="14" /> {/* Line */}
                                </g>
                            </svg>
                        )}
                    </div>
                </div>
            </div>
        </div>
    </Tooltip>
);

export default SoundToggleButton;
