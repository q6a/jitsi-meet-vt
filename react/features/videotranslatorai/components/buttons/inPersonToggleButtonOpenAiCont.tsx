import React, { FC, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Subject } from "rxjs";
import { debounceTime, distinctUntilChanged, map, throttleTime } from "rxjs/operators";

import { IReduxState } from "../../../app/types";
import Tooltip from "../../../base/tooltip/components/Tooltip";
import { createRnnoiseProcessor } from "../../../stream-effects/rnnoise"; // Import the create function
import { VtaiEventTypes, inPersonTranslateOpenAi, sendEventLogToServer } from "../../action.web";
import "./transcriptionButton.css";

type VadScore = number;
type IsVoiceActive = boolean;

// const vadScore$ = new Subject<number>(); // Specify Subject<number>

// let offTimeout: any = 0;
// let isVoiceActive = false; // Tracks current state (on/off)

interface InPersonButtonOpenAiContProps {
    buttonTextValue: string;

    handleDebouncedClick: (callback: () => void) => void;
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

const InPersonToggleButtonOpenAiCont: FC<InPersonButtonOpenAiContProps> = ({
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
    handleDebouncedClick,
}) => {
    const dispatch = useDispatch();
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);
    const stream = useRef<MediaStream | undefined>(undefined);

    // Move these variables inside the component
    const vadScore$ = useRef(new Subject<number>()).current;
    const isVoiceActiveRef = useRef<boolean>(false);
    const offTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const isRecordingLocal = useRef<Boolean>(false);

    // Use useSelector to get the latest ttsVoiceoverActive value
    const ttsVoiceoverActive = useSelector((state: IReduxState) => state["features/videotranslatorai"].isPlayingTTS);

    // Use a ref to store ttsVoiceoverActive so it's accessible in the RxJS subscription
    const ttsVoiceoverActiveRef = useRef(ttsVoiceoverActive);

    useEffect(() => {
        ttsVoiceoverActiveRef.current = ttsVoiceoverActive;

        // // Stop recording when ttsVoiceoverActive becomes true
        // if (ttsVoiceoverActive && isRecordingLocal.current) {
        //     handleStopRecording();
        // }
    }, [ttsVoiceoverActive]);

    // Function to handle VAD score updates
    function handleVADScore(vadScore: VadScore): void {
        vadScore$.next(vadScore);
    }

    const handleStopRecording = () => {
        if (mediaRecorder.current) {
            // Stop the media recorder and remove the ondataavailable event listener
            mediaRecorder.current.ondataavailable = null;
            mediaRecorder.current.stop();
            mediaRecorder.current = null;
        }

        // Stop all audio tracks to release the stream
        stream?.current?.getTracks().forEach((track) => track.stop());
        stream.current = undefined;

        // Clear audio chunks immediately to prevent any further processing
        audioChunks.current = [];

        // if (rnnoiseProcessor) {
        //     rnnoiseProcessor.destroy();
        //     setRnnoiseProcessor(null);
        // }

        audioChunks.current = [];

        isRecordingLocal.current = false;
    };

    const handleStartRecordingInternal = async () => {
        if (isRecordingOther || isAudioMuted) {
            return;
        }

        const streamVar = await navigator.mediaDevices.getUserMedia({
            audio: {
                sampleRate: 192000, // Sets the sample rate to 48 kHz (high quality)
                channelCount: 2, // Sets stereo recording
                sampleSize: 32, // Specifies 16-bit samples
                echoCancellation: false, // Disables echo cancellation for cleaner input
                noiseSuppression: false, // Disables noise suppression
                autoGainControl: false, // Disables auto gain control
            },
        });

        stream.current = streamVar;
        const audioContextVar = new AudioContext({ sampleRate: 44100 });
        const recorder = new MediaRecorder(stream.current);

        const source = audioContextVar.createMediaStreamSource(streamVar);
        const scriptProcessorVar = audioContextVar.createScriptProcessor(512, 1, 1);

        // Collect audio chunks
        recorder.ondataavailable = async (event) => {
            if (event.data.size > 0) {
                audioChunks.current.push(event.data);
            }
        };

        recorder.onstop = () => {};

        recorder.start(); // Start recording with 1-second intervals
        mediaRecorder.current = recorder;

        source.connect(scriptProcessorVar);
        scriptProcessorVar.connect(audioContextVar.destination);

        // Initialize RNNoise after mediaRecorder is set
        const rnnoise = await createRnnoiseProcessor();

        if (!rnnoise) {
            return;
        }
        scriptProcessorVar.onaudioprocess = (event) => {
            const pcmFrame = event.inputBuffer.getChannelData(0);

            // Process pcmFrame with rnnoise
            if (rnnoise) {
                const vadScore = rnnoise.calculateAudioFrameVAD(pcmFrame);

                // Handle VAD score as per your logic
                handleVADScore(vadScore);
            }
        };
    };

    const handleStartRecording = async () => {
        isRecordingLocal.current = true;
        handleStartRecordingInternal();
    };

    // Stream processing
    vadScore$
        .pipe(
            throttleTime(270),
            map((vadScore: VadScore) => vadScore >= 0.99), // Convert vadScore to boolean
            distinctUntilChanged(), // Only emit on true/false change
            debounceTime(20) // Debounce to ensure stability
        )
        .subscribe((stateVar: IsVoiceActive) => {
            if (
                isRecordingOther ||
                !isRecordingLocal.current ||
                ttsVoiceoverActiveRef.current ||
                !isRecording ||
                isAudioMuted
            ) {
                return;
            }

            console.log("stateVar", stateVar);

            if (isVoiceActiveRef.current !== stateVar) {
                isVoiceActiveRef.current = stateVar;

                if (isVoiceActiveRef.current) {
                    if (offTimeoutRef.current) {
                        clearTimeout(offTimeoutRef.current);
                    }

                    if (mediaRecorder.current === null) {
                        audioChunks.current = [];

                        handleStartRecordingInternal();

                        if (isRecordingOther) {
                            handleStopRecording();

                            return;
                        }
                    }

                    if (mediaRecorder.current && mediaRecorder.current.state === "recording") {
                        mediaRecorder.current?.requestData();
                        if (audioChunks.current.length % 2 !== 0 || audioChunks.current.length === 0) {
                            return;
                        }

                        const blobOptions: BlobOptions = { type: "audio/webm", lastModified: Date.now() };

                        const audioBlob = new Blob(audioChunks.current, blobOptions);

                        // dispatch(
                        //     inPersonTranslateOpenAi(
                        //         audioBlob,
                        //         langFromTranscription,
                        //         personName,
                        //         langFromTranslation,
                        //         langFromTranscriptionId,
                        //         langFromOtherPersonTranslationId,
                        //         langFromTranslationId,
                        //         false,
                        //         true
                        //     )
                        // );
                    }
                } else {
                    offTimeoutRef.current = setTimeout(() => {
                        if (mediaRecorder.current && mediaRecorder.current.state === "recording") {
                            if (audioChunks.current.length > 1) {
                                mediaRecorder.current?.requestData();

                                const blobOptions: BlobOptions = { type: "audio/webm", lastModified: Date.now() };

                                const audioBlob = new Blob(audioChunks.current, blobOptions);

                                dispatch(
                                    inPersonTranslateOpenAi(
                                        audioBlob,
                                        langFromTranscription,
                                        personName,
                                        langFromTranslation,
                                        langFromTranscriptionId,
                                        langFromOtherPersonTranslationId,
                                        langFromTranslationId,
                                        true,
                                        true
                                    )
                                );
                            }

                            // Stop the media recorder and remove the ondataavailable event listener
                            mediaRecorder.current.ondataavailable = null;
                            mediaRecorder.current.stop();
                            mediaRecorder.current = null;

                            audioChunks.current = [];
                        }

                        setTimeout(() => {
                            handleStartRecordingInternal();
                        }, 200);
                    }, 2300);
                }
            }
        });

    useEffect(() => {
        if (isRecording && !isAudioMuted && !isRecordingOther) {
            handleStartRecording();
        } else {
            handleStopRecording();
        }
    }, [isRecording, isAudioMuted, isRecordingOther]);

    const handleButtonClick = () => {
        handleDebouncedClick(() => {
            if (isRecording) {
                onStopRecording();

                // sending logs to server
                dispatch(sendEventLogToServer({ eventType: VtaiEventTypes.CONTINUOUS_TRANSCRIPTION_DISABLED }));
            } else if (!isRecording && !isRecordingOther && !isAudioMuted) {
                onStartRecording();

                // sending logs to server
                dispatch(sendEventLogToServer({ eventType: VtaiEventTypes.CONTINUOUS_TRANSCRIPTION_ENABLED }));
            }
        });
    };

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

export default InPersonToggleButtonOpenAiCont;
