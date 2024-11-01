import React, { FC, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { IReduxState } from "../../app/types";
import { isLocalParticipantModerator } from "../../base/participants/functions";
import { createRnnoiseProcessor } from "../../stream-effects/rnnoise"; // Import the create function
import { translateOpenAi } from "../action.web";

import SoundToggleButton from "./buttons/soundToggleButton";
import TranscriptionButton from "./buttons/transcriptionButton";

// let audioChunks: any = [];
let lastVoiceStopTime: number | null = Date.now();
let lastDispatchTime: number | null = null;
let speechStartTime: number | null = null;

let audioChunks: Blob[] = [];

const TranscriptionAndTranslationOpenAiCont: FC = () => {
    const dispatch = useDispatch();
    const state = useSelector((state: IReduxState) => state);

    const isAudioMuted = useSelector((state) => state["features/base/media"].audio.muted);
    const messages = useSelector((state) => state["features/videotranslatorai"].messages);
    const isModerator = useSelector(isLocalParticipantModerator);
    const meetingTypeVideoTranslatorAi = useSelector((state) => state["features/videotranslatorai"].meetingType);
    const transcriptionButtonRef = useRef<HTMLDivElement>(null);

    const [isRecording, setIsRecording] = useState(false);
    const [isSoundOn, setIsSoundOn] = useState(true);
    const [previousMessages, setPreviousMessages] = useState(messages);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [stream, setStream] = useState<MediaStream | undefined>(undefined);
    const [rnnoiseProcessor, setRnnoiseProcessor] = useState<any | null>(null);
    const [sendDataWhenReady, setSendDataWhenReady] = useState<boolean>(false);
    const [lastVoiceStopTimeEnd, setLastVoiceStopTimeEnd] = useState<boolean>(false);

    // State variables for media recorder, audio context, script processor, and RNNoise processor
    const [scriptProcessor, setScriptProcessor] = useState<ScriptProcessorNode | null>(null);
    const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

    function handleVADScore(vadScore) {
        if (lastVoiceStopTime && Date.now() - lastVoiceStopTime >= 3600) {
            setLastVoiceStopTimeEnd(true);

            audioChunks.current = [];
            if (mediaRecorder && mediaRecorder.state !== "inactive") {
                mediaRecorder.stop();
            }
            lastVoiceStopTime = null;
        }

        if (vadScore > 0.85) {
            if (mediaRecorder && mediaRecorder.state === "inactive") {
                mediaRecorder.start();
            }
            mediaRecorder.requestData();

            if (speechStartTime) {
                // console.log("start time elapsed", Date.now() - speechStartTime);
            }

            // console.log("Voice detected with VAD score:", vadScore);
            lastVoiceStopTime = null;
            const currentTime = Date.now();

            if (!lastDispatchTime || currentTime - lastDispatchTime >= 500) {
                setTimeout(() => {
                    setSendDataWhenReady(true);

                    if (mediaRecorder && mediaRecorder.state !== "inactive") {
                        mediaRecorder.requestData();
                    }
                }, 500);

                lastDispatchTime = currentTime;
            }

            lastVoiceStopTime = null;
        }

        if (vadScore <= 0.7) {
            if (lastVoiceStopTime === null) {
                lastVoiceStopTime = Date.now();
            }
            speechStartTime = Date.now();
        }
    }

    const handleStartVAD = async () => {
        const streamVar = await navigator.mediaDevices.getUserMedia({
            audio: true,
        });
        const audioContextVar = new AudioContext({ sampleRate: 44100 });

        setAudioContext(audioContextVar);

        const recorder = new MediaRecorder(streamVar);

        // Collect audio data as chunks when recording is active
        recorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        recorder.onstop = () => {
            audioChunks = [];
        };

        recorder.start();
        setMediaRecorder(recorder);
        setIsRecording(true);

        const source = audioContextVar.createMediaStreamSource(streamVar);
        const scriptProcessorVar = audioContextVar.createScriptProcessor(512, 1, 1);

        source.connect(scriptProcessorVar);
        scriptProcessorVar.connect(audioContextVar.destination);
        setStream(streamVar);

        // Store audioContext and scriptProcessor to use in useEffect
        setScriptProcessor(scriptProcessorVar);
    };

    // useEffect to initialize RNNoise processing only after recorder has been set
    useEffect(() => {
        if (mediaRecorder && stream && scriptProcessor && audioContext) {
            const initializeRnnoise = async () => {
                try {
                    // Initialize RNNoise after mediaRecorder is set
                    const rnnoise = await createRnnoiseProcessor();

                    setRnnoiseProcessor(rnnoise);
                    if (!rnnoise) {
                        return;
                    }
                    scriptProcessor.onaudioprocess = (event) => {
                        const pcmFrame = event.inputBuffer.getChannelData(0);

                        // Process pcmFrame with rnnoise
                        if (rnnoise) {
                            const vadScore = rnnoise.calculateAudioFrameVAD(pcmFrame);

                            // Handle VAD score as per your logic
                            handleVADScore(vadScore);
                        }
                    };
                } catch (error) {
                    console.error("Failed to initialize RNNoise processor:", error);
                }
            };

            initializeRnnoise();
        }
    }, [mediaRecorder, stream, scriptProcessor, audioContext]); // Run useEffect when mediaRecorder or stream changes

    const handleStopVAD = () => {
        stream?.getTracks().forEach((track) => track.stop());
        setStream(undefined);
        setIsRecording(false);
        mediaRecorder?.stop();
        setIsRecording(false);

        // if (rnnoiseProcessor) {
        //     rnnoiseProcessor.destroy();
        //     setRnnoiseProcessor(null);
        // }

        audioChunks = [];
    };

    useEffect(() => {
        if (sendDataWhenReady) {
            const audioBlob = new Blob(audioChunks, { type: "audio/webm" });

            if (audioChunks.length > 0) {
                dispatch(translateOpenAi(audioBlob));
            }
            setSendDataWhenReady(false);
        }
    }, [sendDataWhenReady]);

    useEffect(() => {
        if (lastVoiceStopTimeEnd) {
            setLastVoiceStopTimeEnd(false);
            if (mediaRecorder && mediaRecorder.state === "inactive") {
                mediaRecorder?.start();
            }
        }
    }, [lastVoiceStopTimeEnd, mediaRecorder]);

    return (
        <div>
            <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                <SoundToggleButton isSoundOn={isSoundOn} toggleSound={() => setIsSoundOn(!isSoundOn)} />
                {(meetingTypeVideoTranslatorAi !== "broadcast" || isModerator) && (
                    <TranscriptionButton
                        handleStart={handleStartVAD}
                        handleStop={handleStopVAD}
                        isRecording={isRecording}
                    />
                )}
            </div>
        </div>
    );
};

export default TranscriptionAndTranslationOpenAiCont;
