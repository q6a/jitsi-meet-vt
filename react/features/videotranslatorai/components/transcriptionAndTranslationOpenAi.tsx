import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { IReduxState } from "../../app/types";
import { isLocalParticipantModerator } from "../../base/participants/functions";
import { toState } from "../../base/redux/functions";
import { startTextToSpeech, stopRecordingOpenAi, translateOpenAi } from "../action.web";

import SoundToggleButton from "./buttons/soundToggleButton";
import TranscriptionButton from "./buttons/transcriptionButton";

const TranscriptionAndTranslationOpenAi = () => {
    const dispatch = useDispatch();
    const state = useSelector((state: IReduxState) => state);

    const isAudioMuted = useSelector((state) => state["features/base/media"].audio.muted);
    const messages = useSelector((state) => state["features/videotranslatorai"].messages);
    const isModerator = useSelector(isLocalParticipantModerator);
    const meetingTypeVideoTranslatorAi = useSelector((state) => state["features/videotranslatorai"].meetingType);

    const [isRecording, setIsRecording] = useState(false);
    const [isSoundOn, setIsSoundOn] = useState(true);
    const [isSilenceDetected, setIsSilenceDetected] = useState(false);
    const [isSetAudioChunkToNull, setIsSetAudioChunkToNull] = useState(false);

    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [audioChunks, setAudioChunks] = useState<Blob[]>([]);

    const silenceStartTime = useRef<number | null>(null);

    const SILENCE_THRESHOLD = 0.01;
    const SILENCE_DURATION = 3000;

    // Refs for audio processing
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const dataArrayRef = useRef<Float32Array | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const animationFrameIdRef = useRef<number | null>(null);

    const [previousMessages, setPreviousMessages] = useState(messages);

    useEffect(
        () =>
            // Cleanup on component unmount
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
        // This will run only once when the component mounts
        if (isRecording) {
            dispatch(stopRecordingOpenAi());
        }

        setIsSoundOn(false);
    }, []);

    useEffect(() => {
        if (isAudioMuted) {
            dispatch(stopRecordingOpenAi());
        }
    }, [isAudioMuted]);
    const isAudioBlobSilent = async (audioBlob: Blob): Promise<boolean> => {
        const audioContext = new AudioContext();

        // Read the audio blob as an array buffer
        const arrayBuffer = await audioBlob.arrayBuffer();

        // Decode the audio data
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Extract audio data from the buffer
        const rawData = audioBuffer.getChannelData(0); // Assuming mono audio

        // Calculate RMS (Root Mean Square)
        let squares = 0;

        for (let i = 0; i < rawData.length; i++) {
            squares += rawData[i] * rawData[i];
        }
        const rms = Math.sqrt(squares / rawData.length);

        // Define a threshold for silence
        const SILENCE_THRESHOLD = 0.01;

        return rms < SILENCE_THRESHOLD;
    };

    useEffect(() => {
        if (!isAudioMuted) {
            // Create a blob from the audio chunks

            const processAudio = async () => {
                const audioBlob = new Blob(audioChunks, { type: "audio/webm; codecs=opus" });

                console.log("AUDIO CHUNKS", audioChunks);
                console.log("AUDIO BLOB", audioBlob);

                // Send the audio blob for transcription/translation
                const isSilent = await isAudioBlobSilent(audioBlob);

                if (!isSilent && audioBlob.size > 0) {
                    dispatch(translateOpenAi({ blob: audioBlob }));
                }
            };

            if (audioChunks.length > 0) {
                processAudio();
            }
        }
    }, [audioChunks]);

    const setupAudioContext = async (stream: MediaStream) => {
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();

        analyser.fftSize = 2048;
        const bufferLength = analyser.fftSize;
        const dataArray = new Float32Array(bufferLength);

        source.connect(analyser);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        dataArrayRef.current = dataArray;
        sourceRef.current = source;
    };

    const stopRecordingAndSendAudio = () => {
        console.log("MEDIA RECORDER", mediaRecorder);
        if (!mediaRecorder || mediaRecorder.state === "inactive") {
            return;
        }

        setIsSetAudioChunkToNull(true);

        console.log("Stopping recording...", mediaRecorder);

        mediaRecorder.stop();

        // The rest of the logic is handled in mediaRecorder.onstop
    };

    const detectSilence = () => {
        const analyser = analyserRef.current;
        const dataArray = dataArrayRef.current;

        if (!analyser || !dataArray || !mediaRecorder || mediaRecorder.state === "inactive") {
            return;
        }

        analyser.getFloatTimeDomainData(dataArray);

        let sumSquares = 0.0;

        for (const amplitude of dataArray) {
            sumSquares += amplitude * amplitude;
        }
        const volume = Math.sqrt(sumSquares / dataArray.length);

        if (volume < SILENCE_THRESHOLD) {
            if (!silenceStartTime.current) {
                silenceStartTime.current = Date.now();
            } else if (Date.now() - silenceStartTime.current > SILENCE_DURATION) {
                console.log("SILENCE DETECTED");

                stopRecordingAndSendAudio();

                if (mediaRecorder.state !== "inactive") {
                    mediaRecorder?.requestData();
                }

                setIsSilenceDetected(true);
                setIsSetAudioChunkToNull(true);

                silenceStartTime.current = null;
            }
        } else {
            silenceStartTime.current = null;
        }

        animationFrameIdRef.current = requestAnimationFrame(detectSilence);
    };

    useEffect(() => {
        if (mediaRecorder) {
            console.log("MEDIA RECORDER DETECTED");
            detectSilence();
        }
    }, [mediaRecorder]);

    const startRecording = async () => {
        if (isAudioMuted) {
            return;
        }

        console.log("START RECORDING");

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);

        setMediaRecorder(recorder);

        // Set up event handlers before starting recording
        recorder.ondataavailable = (event) => {
            console.log("ON DATA AVAILABLE", event);
            setAudioChunks((prev) => [...prev, event.data]);
        };

        recorder.onstop = async () => {
            console.log("Recording stopped, processing audio chunks...");

            // Clean up audio context
            if (audioContextRef.current) {
                audioContextRef.current.close();
                audioContextRef.current = null;
            }

            // Cancel the animation frame if it exists
            if (animationFrameIdRef.current !== null) {
                cancelAnimationFrame(animationFrameIdRef.current);
                animationFrameIdRef.current = null;
            }
        };

        recorder.start();

        await setupAudioContext(stream);

        // detectSilence();

        setIsRecording(true);
    };

    useEffect(() => {
        if (isSilenceDetected) {
            setIsSilenceDetected(false);
            mediaRecorder?.stop();
            startRecording();
            detectSilence();
            setIsRecording(false);
        }
    }, [isSilenceDetected]);

    useEffect(() => {
        if (isSetAudioChunkToNull) {
            setAudioChunks([]);
            setIsSetAudioChunkToNull(false);
        }
    }, [isSetAudioChunkToNull]);

    return (
        <div>
            {/* Buttons */}
            <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                <SoundToggleButton isSoundOn={isSoundOn} toggleSound={() => setIsSoundOn(!isSoundOn)} />

                {(meetingTypeVideoTranslatorAi !== "broadcast" || isModerator) && (
                    <TranscriptionButton
                        handleStart={startRecording}
                        handleStop={() => {
                            stopRecordingAndSendAudio();
                            setIsRecording(false);
                        }}
                        isRecording={isRecording}
                    />
                )}
            </div>
        </div>
    );
};

export default TranscriptionAndTranslationOpenAi;
