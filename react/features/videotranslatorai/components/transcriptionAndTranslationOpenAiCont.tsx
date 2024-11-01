import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import VAD from "voice-activity-detection";

import { IReduxState } from "../../app/types";
import { isLocalParticipantModerator } from "../../base/participants/functions";
import { toState } from "../../base/redux/functions";
import { startTextToSpeech, stopRecordingOpenAi, translateOpenAi } from "../action.web";

import SoundToggleButton from "./buttons/soundToggleButton";
import TranscriptionButton from "./buttons/transcriptionButton";

// let audioChunks: any = [];
let lastVoiceStopTime: number | null = Date.now();
let lastDispatchTime: number | null = null;
let speechStartTime: number | null = null;

let audioChunks: any[] = [];

const TranscriptionAndTranslationOpenAiCont = () => {
    const dispatch = useDispatch();
    const state = useSelector((state: IReduxState) => state);

    const isAudioMuted = useSelector((state) => state["features/base/media"].audio.muted);
    const messages = useSelector((state) => state["features/videotranslatorai"].messages);
    const isModerator = useSelector(isLocalParticipantModerator);
    const meetingTypeVideoTranslatorAi = useSelector((state) => state["features/videotranslatorai"].meetingType);
    const transcriptionButtonRef = useRef<HTMLDivElement>(null);

    // const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
    const [isRecording, setIsRecording] = useState(false);
    const [isSoundOn, setIsSoundOn] = useState(true);
    const [previousMessages, setPreviousMessages] = useState(messages);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [vadInstance, setVadInstance] = useState<any>(null);
    const [stream, setStream] = useState<MediaStream | undefined>(undefined); // Initialize stream state
    const [audioContext, setAudioContext] = useState<any | null>(null);
    const [sendDataWhenReady, setSendDataWhenReady] = useState<boolean>(false);

    const [lastVoiceStopTimeEnd, setLastVoiceStopTimeEnd] = useState<boolean>(false);

    // Initialize VAD options
    const vadOptions = {
        onUpdate: (isSpeech: boolean) => {
            if (lastVoiceStopTime && Date.now() - lastVoiceStopTime >= 3600) {
                setLastVoiceStopTimeEnd(true);

                audioChunks = [];
                if (mediaRecorder && mediaRecorder.state !== "inactive") {
                    mediaRecorder?.stop();
                }
                lastVoiceStopTime = null;
            } else {
                // for some reason mediarecorder sometimes is inactvie when it gets deactivated
                if (mediaRecorder?.state === "inactive") {
                    mediaRecorder?.start();
                }
            }

            if (isSpeech) {
                // if (mediaRecorder && mediaRecorder.state !== "inactive") {
                if (speechStartTime) {
                    console.log("start time elapsed", Date.now() - speechStartTime);
                }

                if (speechStartTime && Date.now() - speechStartTime >= 50 && mediaRecorder?.state !== "inactive") {
                    mediaRecorder?.requestData();
                }

                // }

                const currentTime = Date.now();

                if (!lastDispatchTime || currentTime - lastDispatchTime >= 1500) {
                    setTimeout(() => {
                        setSendDataWhenReady(true);

                        if (mediaRecorder && mediaRecorder.state !== "inactive") {
                            mediaRecorder?.requestData();
                        }
                    }, 1000);

                    lastDispatchTime = currentTime;
                }
            }

            if (isSpeech) {
                lastVoiceStopTime = null;
            } else if (lastVoiceStopTime === null && !isSpeech) {
                lastVoiceStopTime = Date.now();
            }

            if (!isSpeech) {
                speechStartTime = Date.now();
            }
        },

        onVoiceStart: () => {},

        onVoiceStop: () => {},
        noiseCaptureDuration: 100, // in ms
    };

    const handleStartVAD = async () => {
        const streamVar = await navigator.mediaDevices.getUserMedia({
            audio: true,
        });
        const audioContextVar = new AudioContext();

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

        setStream(streamVar);
        setIsRecording(true);
    };

    useEffect(() => {
        if (mediaRecorder && stream && audioContext) {
            const vad = VAD(audioContext, stream, vadOptions);

            setVadInstance(vad); // Store the VAD instance to stop later
        }
    }, [mediaRecorder, stream, audioContext]);

    useEffect(() => {
        if (lastVoiceStopTimeEnd) {
            setLastVoiceStopTimeEnd(false);
            if (mediaRecorder && mediaRecorder.state === "inactive") {
                mediaRecorder?.start();
            }
        }
    }, [lastVoiceStopTimeEnd, mediaRecorder]);

    // Stop VAD when Transcription button is turned off
    const handleStopVAD = () => {
        stream?.getTracks().forEach((track) => track.stop());
        setStream(undefined);
        setIsRecording(false);

        // mediaRecorder?.requestData();
        mediaRecorder?.stop();
        setIsRecording(false);
        if (vadInstance) {
            vadInstance.destroy();
            setVadInstance(null);
        }

        // setAudioChunks([]); // Reset chunks for next recording
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
        if (!isSoundOn) {
            return;
        }

        if (messages !== previousMessages) {
            const lastMessage = messages[messages.length - 1];

            if (lastMessage) {
                const textToSpeechCode = toState(state)["features/videotranslatorai"].textToSpeechCode;

                dispatch(startTextToSpeech(lastMessage.message, textToSpeechCode));
            }
            setPreviousMessages(messages);
        }
    }, [messages, previousMessages]);

    useEffect(() => {
        if (isAudioMuted) {
            dispatch(stopRecordingOpenAi());
        }
    }, [isAudioMuted]);

    return (
        <div>
            <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                <SoundToggleButton isSoundOn={isSoundOn} toggleSound={() => setIsSoundOn(!isSoundOn)} />
                {(meetingTypeVideoTranslatorAi !== "broadcast" || isModerator) && (
                    <TranscriptionButton
                        handleStart={handleStartVAD}
                        handleStop={handleStopVAD}
                        isRecording={isRecording}
                        ref={transcriptionButtonRef}
                    />
                )}
            </div>
        </div>
    );
};

export default TranscriptionAndTranslationOpenAiCont;
