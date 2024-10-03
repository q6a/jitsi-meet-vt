import React, { FC } from "react";

interface SoundToggleButtonProps {
    isSoundOn: boolean;
    toggleSound: () => void;
}

const SoundToggleButton: FC<SoundToggleButtonProps> = ({ isSoundOn, toggleSound }) => (
    <div
        className="toolbox-icon"
        onClick={toggleSound}
        style={{
            backgroundColor: isSoundOn ? "green" : "transparent",
            cursor: "pointer",
            transition: "transform 0.3s ease",
            transform: isSoundOn ? "scale(1.1)" : "scale(1)",
            border: "2px solid white",
            borderRadius: "50%",
            width: "40px",
            height: "40px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
        }}
    >
        <div className="jitsi-icon jitsi-icon-default">
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
);

export default SoundToggleButton;
