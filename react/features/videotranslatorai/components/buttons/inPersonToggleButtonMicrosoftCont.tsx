import React, { FC, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";

import { IReduxState } from "../../../app/types";
import Tooltip from "../../../base/tooltip/components/Tooltip";
import { inPersonTranslateMicrosoftCont, sendEventLogToServer, VtaiEventTypes } from "../../action.web";
import { stopTranscriptionService } from "../../supervisors/inPersonServiceMicrosoftCont";
import "./transcriptionButton.css";

const debounceTimeout: NodeJS.Timeout | null = null;

interface InPersonButtonMicrosoftContProps {
    // Add this prop
    buttonTextValue: string;
    handleDebouncedClick: (callback: () => void) => void;
    isAudioMuted: boolean;
    isRecording: boolean;
    isRecordingOther: boolean;
    langFromOtherPersonTranslation: string;
    langFromOtherPersonTranslationId: string;
    langFromTranscription: string;
    langFromTranscriptionId: string;
    langFromTranslation: string;
    langFromTranslationId: string;
    onStartRecording: () => void;
    onStopRecording: () => void;
    personName: string;
    tooltipContent: string;
}

const InPersonToggleButtonMicrosoftCont: FC<InPersonButtonMicrosoftContProps> = ({
    isAudioMuted,
    isRecordingOther,
    isRecording,
    personName,
    langFromTranscription,
    langFromTranslation,
    langFromTranscriptionId,
    langFromOtherPersonTranslationId,
    langFromTranslationId,
    tooltipContent,
    buttonTextValue,
    langFromOtherPersonTranslation,
    onStartRecording,
    onStopRecording,
    handleDebouncedClick,
}) => {
    const dispatch = useDispatch();
    const state = useSelector((state: IReduxState) => state); // Access getState-like functionality

    // Use useSelector to get the latest ttsVoiceoverActive value
    const ttsVoiceoverActive = useSelector((state: IReduxState) => state["features/videotranslatorai"].isPlayingTTS);
    const isInActiveState = useRef<number>(0);

    // Use a ref to store ttsVoiceoverActive so it's accessible in the RxJS subscription
    const ttsVoiceoverActiveRef = useRef(ttsVoiceoverActive);

    const handleStartRecording = async () => {
        if (isAudioMuted || isRecordingOther || !isRecording || isInActiveState.current === 1) {
            return;
        }

        dispatch(
            inPersonTranslateMicrosoftCont(
                langFromTranscription,
                langFromOtherPersonTranslation,
                personName,
                langFromTranscriptionId,
                langFromOtherPersonTranslationId
            )
        );
    };

    const handleStopRecording = () => {
        // dispatch(stopTranscription());
        stopTranscriptionService(dispatch, state);
    };

    useEffect(() => {
        if (
            isRecording &&
            !isAudioMuted &&
            !isRecordingOther &&
            isInActiveState.current === 0 &&
            !ttsVoiceoverActiveRef.current
        ) {
            handleStartRecording();
            isInActiveState.current = 1;
        } else {
            handleStopRecording();
            isInActiveState.current = 0;
        }
    }, [isRecording, isAudioMuted, isRecordingOther]);

    const handleButtonClick = () => {
        handleDebouncedClick(() => {
            if (isRecording) {
                onStopRecording();

                // sending logs to server
                dispatch(sendEventLogToServer({ eventType: VtaiEventTypes.CONTINUOUS_TRANSCRIPTION_DISABLED }));
            } else if (
                !isRecording &&
                !isRecordingOther &&
                !isAudioMuted &&
                isInActiveState.current === 0 &&
                !ttsVoiceoverActiveRef.current
            ) {
                stopTranscriptionService(dispatch, state);
                onStartRecording();

                // sending logs to server
                dispatch(sendEventLogToServer({ eventType: VtaiEventTypes.CONTINUOUS_TRANSCRIPTION_ENABLED }));
            }
        });
    };

    const handleStartTTSRecording = async () => {
        if (isAudioMuted || isRecordingOther || !isRecording || isInActiveState.current === 0) {
            return;
        }

        dispatch(
            inPersonTranslateMicrosoftCont(
                langFromTranscription,
                langFromOtherPersonTranslation,
                personName,
                langFromTranscriptionId,
                langFromOtherPersonTranslationId
            )
        );
    };

    useEffect(() => {
        ttsVoiceoverActiveRef.current = ttsVoiceoverActive;

        if (ttsVoiceoverActiveRef.current === true) {
            stopTranscriptionService(dispatch, state);
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
                    onTouchStart={handleButtonClick}
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

export default InPersonToggleButtonMicrosoftCont;
