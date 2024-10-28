import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { IReduxState } from "../../app/types";
import { isLocalParticipantModerator } from "../../base/participants/functions";
import { toState } from "../../base/redux/functions";
import { startTextToSpeech, stopRecordingOpenAi, translateOpenAi } from "../action.web";

import SoundToggleButton from "./buttons/soundToggleButton";
import TranscriptionButton from "./buttons/transcriptionButton";
const MIN_DECIBELS = -45;

const TranscriptionAndTranslationOpenAi = () => {
    const dispatch = useDispatch();
    const state = useSelector((state: IReduxState) => state);

    const isAudioMuted = useSelector((state) => state["features/base/media"].audio.muted);
    const messages = useSelector((state) => state["features/videotranslatorai"].messages);
    const isModerator = useSelector(isLocalParticipantModerator);
    const meetingTypeVideoTranslatorAi = useSelector((state) => state["features/videotranslatorai"].meetingType);
    const transcriptionButtonRef = useRef<HTMLDivElement>(null);

    // const audioChunks = useRef<Blob[]>([]);
    const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
    const [totalAudioChunk, setTotalAudioChunks] = useState<Blob[]>([]);

    const [isRecording, setIsRecording] = useState(false);
    const [isSoundOn, setIsSoundOn] = useState(true);
    const [isSilenceDetected, setIsSilenceDetected] = useState(false);
    const [isSilenceFinished, setIsSilenceFinished] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

    const silenceStartTime = useRef<number | null>(null);

    const SILENCE_THRESHOLD = 0.01;
    const SILENCE_DURATION = 3000;

    // Refs for audio processing
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const animationFrameIdRef = useRef<number | null>(null);

    const [previousMessages, setPreviousMessages] = useState(messages);

    useEffect(
        () =>
            // Cleanup function to stop recording and close audio context
            () => {
                if (mediaRecorder && mediaRecorder.state !== "inactive") {
                    mediaRecorder.stop();
                }
                if (audioContextRef.current) {
                    audioContextRef.current.close();
                }
                if (animationFrameIdRef.current) {
                    cancelAnimationFrame(animationFrameIdRef.current);
                }
            },
        []
    );

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

    const setupAudioContext = async (stream: MediaStream) => {
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();

        analyser.minDecibels = MIN_DECIBELS;
        analyser.fftSize = 4096;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        source.connect(analyser);
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        dataArrayRef.current = dataArray;
        sourceRef.current = source;
    };

    const detectSilence = () => {
        if (!analyserRef.current || !dataArrayRef.current) {
            return;
        }

        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        const isSilent = dataArrayRef.current.every((value) => value < 10);

        if (isSilent) {
            if (!silenceStartTime.current) {
                silenceStartTime.current = Date.now();
            } else if (Date.now() - silenceStartTime.current > SILENCE_DURATION) {
                console.log("SILENCE DETECTED");
                setIsSilenceDetected(true);
                silenceStartTime.current = null; // Reset on sound detection
                setAudioChunks([]);

                return;
            }
        } else {
            silenceStartTime.current = null; // Reset on sound detection
        }

        // Re-run the detectSilence function in the next animation frame
        animationFrameIdRef.current = requestAnimationFrame(detectSilence);
    };

    const startRecording = async () => {
        if (isAudioMuted) {
            return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);

        setMediaRecorder(recorder);
        recorder.ondataavailable = async (event) => {
            setAudioChunks((prevChunks) => [...prevChunks, event.data]);
        };

        recorder.onstop = () => console.log("Recording stopped, processing audio chunks...");
        recorder.start(1000); // Capture data every 1 second

        await setupAudioContext(stream);
        setIsRecording(true);

        animationFrameIdRef.current = requestAnimationFrame(detectSilence); // Start detecting silence
    };

    const stopRecordingAndSendAudio = () => {
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
            mediaRecorder.stop();
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }

        if (animationFrameIdRef.current !== null) {
            cancelAnimationFrame(animationFrameIdRef.current);
            animationFrameIdRef.current = null;
        }
        setAudioChunks([]);
    };

    useEffect(() => {
        if (isSilenceDetected) {
            console.log("SILENCE DETECTED");
            setIsSilenceDetected(false);
            console.log("CLICK 1");
            setIsSilenceFinished(true);
            stopRecordingAndSendAudio();
            setAudioChunks([]);

            // stopRecordingAndSendAudio();
            // setIsSilenceFinished(true);
            // mediaRecorder?.start();

            // stopRecordingAndSendAudio();
        }
    }, [isSilenceDetected]);

    useEffect(() => {
        if (isSilenceFinished) {
            setTimeout(() => {
                // startRecording();
                console.log("CLICK 2");
                transcriptionButtonRef.current?.click();
                transcriptionButtonRef.current?.click();
            }, 100);
        }
        setIsSilenceFinished(false);
    }, [isSilenceFinished]);

    useEffect(() => {
        if (!isAudioMuted) {
            console.log("AUDIO CHUNKS", audioChunks);
            if (audioChunks.length > 0) {
                const audioBlob = new Blob(audioChunks, { type: "audio/webm; codecs=opus" });

                if (audioBlob.size > 0) {
                    dispatch(translateOpenAi({ blob: audioBlob }));

                    // setAudioChunks([]); // Clear chunks after dispatch
                }
            }
        }
    }, [audioChunks]);

    return (
        <div>
            <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                <SoundToggleButton isSoundOn={isSoundOn} toggleSound={() => setIsSoundOn(!isSoundOn)} />

                {(meetingTypeVideoTranslatorAi !== "broadcast" || isModerator) && (
                    <TranscriptionButton
                        handleStart={startRecording}
                        handleStop={() => {
                            stopRecordingAndSendAudio(); // Call your stop function
                            setIsRecording(false); // Then set recording state to false
                        }}
                        isRecording={isRecording}
                        ref={transcriptionButtonRef}
                    />
                )}
            </div>
        </div>
    );
};

export default TranscriptionAndTranslationOpenAi;
