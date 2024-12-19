import React, { FC, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";

import { IReduxState } from "../../../app/types";
import Tooltip from "../../../base/tooltip/components/Tooltip";
import { inPersonTranslateAutoCont } from "../../action.web";
import { stopTranscriptionAutoService } from "../../supervisors/inPersonServiceMicrosoftAutoCont";
import "./transcriptionButton.css";

const debounceTimeout: NodeJS.Timeout | null = null;

interface InPersonButtonAutoContProps {
    // Add this prop
    buttonTextValue: string;
    handleDebouncedClick: (callback: () => void) => void;
    isAudioMuted: boolean;
    isRecording: boolean;
    langPersonOneTranscription: string;
    langPersonOneTranscriptionId: string;
    langPersonOneTranslation: string;
    langPersonOneTranslationId: string;
    langPersonTwoTranscription: string;
    langPersonTwoTranscriptionId: string;
    langPersonTwoTranslation: string;
    langPersonTwoTranslationId: string;
    onStartRecording: () => void;
    onStopRecording: () => void;
    personOneName: string;
    personTwoName: string;
    tooltipContent: string;
    whichPerson: React.MutableRefObject<number>;
}

const InPersonToggleButtonAutoCont: FC<InPersonButtonAutoContProps> = ({
    isAudioMuted,
    isRecording,
    personOneName,
    personTwoName,
    buttonTextValue,
    tooltipContent,
    langPersonOneTranscription,
    langPersonOneTranscriptionId,
    langPersonOneTranslation,
    langPersonOneTranslationId,
    langPersonTwoTranscription,
    langPersonTwoTranscriptionId,
    langPersonTwoTranslation,
    langPersonTwoTranslationId,
    onStartRecording,
    onStopRecording,
    handleDebouncedClick,
    whichPerson,
}) => {
    const dispatch = useDispatch();
    const state = useSelector((state: IReduxState) => state); // Access getState-like functionality

    // Use useSelector to get the latest ttsVoiceoverActive value
    const ttsVoiceoverActive = useSelector((state: IReduxState) => state["features/videotranslatorai"].isPlayingTTS);
    const isInActiveState = useRef<number>(0);

    // Use a ref to store ttsVoiceoverActive so it's accessible in the RxJS subscription
    const ttsVoiceoverActiveRef = useRef(ttsVoiceoverActive);

    const handleStartRecording = async () => {
        if (isAudioMuted || !isRecording || isInActiveState.current === 1) {
            return;
        }

        dispatch(
            inPersonTranslateAutoCont(
                langPersonOneTranscription,
                langPersonOneTranslation,
                langPersonTwoTranscription,
                langPersonTwoTranslation,
                personOneName,
                personTwoName,
                langPersonOneTranscriptionId,
                langPersonOneTranslationId,
                langPersonTwoTranscriptionId,
                langPersonTwoTranslationId,
                whichPerson
            )
        );
    };

    const handleStopRecording = () => {
        stopTranscriptionAutoService(dispatch, state);
    };

    useEffect(() => {
        if (isRecording && !isAudioMuted && isInActiveState.current === 0 && !ttsVoiceoverActiveRef.current) {
            handleStartRecording();
            isInActiveState.current = 1;
        } else {
            handleStopRecording();
            isInActiveState.current = 0;
        }
    }, [isRecording, isAudioMuted]);

    const handleButtonClick = () => {
        handleDebouncedClick(() => {
            if (isRecording) {
                onStopRecording();
            } else if (!isRecording && !isAudioMuted) {
                stopTranscriptionAutoService(dispatch, state);
                onStartRecording();
            }
        });
    };

    const handleStartTTSRecording = async () => {
        if (isAudioMuted || !isRecording || isInActiveState.current === 0) {
            return;
        }

        dispatch(
            inPersonTranslateAutoCont(
                langPersonOneTranscription,
                langPersonOneTranslation,
                langPersonTwoTranscription,
                langPersonTwoTranslation,
                personOneName,
                personTwoName,
                langPersonOneTranscriptionId,
                langPersonOneTranslationId,
                langPersonTwoTranscriptionId,
                langPersonTwoTranslationId,
                whichPerson
            )
        );
    };

    useEffect(() => {
        ttsVoiceoverActiveRef.current = ttsVoiceoverActive;

        if (ttsVoiceoverActiveRef.current === true) {
            stopTranscriptionAutoService(dispatch, state);
        }

        if (ttsVoiceoverActiveRef.current === false) {
            handleStartTTSRecording();
        }
    }, [ttsVoiceoverActive]);

    return (
        <Tooltip containerClassName="transcription-tooltip" content={tooltipContent} position="top">
            <div className="toolbox-icon">
                <div
                    className="circle-region"
                    onClick={handleButtonClick}
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
                                {buttonTextValue}
                            </text>
                        </svg>
                    </div>
                </div>
            </div>
        </Tooltip>
    );
};

export default InPersonToggleButtonAutoCont;
