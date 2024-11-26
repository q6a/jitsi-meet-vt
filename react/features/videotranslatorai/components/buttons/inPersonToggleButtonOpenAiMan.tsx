import React, { FC, useEffect, useRef } from "react";
import { useDispatch } from "react-redux";

import Tooltip from "../../../base/tooltip/components/Tooltip";
import { inPersonTranslateOpenAi } from "../../action.web";
import "./transcriptionButton.css";

interface InPersonButtonOpenAiManProps {
    buttonTextValue: string;

    isAudioMuted: boolean;
    isRecording: boolean;
    isRecordingOther: boolean;
    langFromOtherPersonTranslationId: string;
    langFromTranscription: string;
    langFromTranscriptionId: string;
    langFromTranslation: string;
    langFromTranslationId: string;
    onStartRecording: () => void;

    // Add this prop
    onStopRecording: () => void;
    personName: string;
    tooltipContent: string;
}

const InPersonToggleButtonOpenAiMan: FC<InPersonButtonOpenAiManProps> = ({
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
    onStartRecording,
    onStopRecording,
}) => {
    const dispatch = useDispatch();
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);

    const handleStartRecording = async () => {
        if (isAudioMuted || isRecordingOther || !isRecording) {
            onStopRecording();

            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 48000,
                    channelCount: 2,
                    sampleSize: 16,
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                },
            });
            const recorder = new MediaRecorder(stream);

            mediaRecorder.current = recorder;

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.current.push(event.data);
                }
            };

            recorder.onstop = () => {
                const blobOptions: BlobOptions = { type: "audio/webm", lastModified: Date.now() };
                const recordedBlob = new Blob(audioChunks.current, blobOptions);

                dispatch(
                    inPersonTranslateOpenAi(
                        recordedBlob,
                        langFromTranscription,
                        personName,
                        langFromTranslation,
                        langFromTranscriptionId,
                        langFromOtherPersonTranslationId,
                        langFromTranslationId,
                        true,
                        false
                    )
                );

                audioChunks.current = [];
            };

            recorder.start();
        } catch (error) {
            console.error("Error accessing media devices:", error);
        }
    };

    const handleStopRecording = () => {
        if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
            mediaRecorder.current.stop();
        }
    };

    useEffect(() => {
        if (isRecording && !isAudioMuted && !isRecordingOther) {
            console.log("Starting recording via effect");
            handleStartRecording();
        } else {
            handleStopRecording();
        }
    }, [isRecording, isAudioMuted, isRecordingOther]);

    return (
        <Tooltip containerClassName="transcription-tooltip" content={tooltipContent} position="top">
            <div className="toolbox-icon">
                <div
                    className="circle-region"
                    onClick={() => {
                        if (isRecording) {
                            onStopRecording();
                        } else {
                            onStartRecording();
                        }
                    }}
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

export default InPersonToggleButtonOpenAiMan;
