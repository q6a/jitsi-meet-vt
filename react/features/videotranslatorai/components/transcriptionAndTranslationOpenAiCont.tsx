import React, { FC, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Subject } from "rxjs";
import { debounceTime, distinctUntilChanged, map, throttleTime } from "rxjs/operators";

import { IReduxState } from "../../app/types";
import { isLocalParticipantModerator } from "../../base/participants/functions";
import { toState } from "../../base/redux/functions";
import { createRnnoiseProcessor } from "../../stream-effects/rnnoise"; // Import the create function
import { startTextToSpeech } from "../action.web";
import transcribeAudioOpenAi from "../services/transcribeAudioOpenAi";

import SoundToggleButton from "./buttons/soundToggleButton";
import TranscriptionButton from "./buttons/transcriptionButton";

// let audioChunks: any = [];

let audioChunks: Blob[] = [];

type VadScore = number;
type IsVoiceActive = boolean;
const vadScore$ = new Subject<number>(); // Specify Subject<number>
let isVoiceActive: IsVoiceActive = false;
let offTimeout: any = 0;
const TranscriptionAndTranslationOpenAiCont: FC = () => {
    const dispatch = useDispatch();
    const state = useSelector((state: IReduxState) => state);

    const isAudioMuted = useSelector((state) => state["features/base/media"].audio.muted);
    const messages = useSelector((state: IReduxState) => state["features/videotranslatorai"].completedMessages);
    const isModerator = useSelector(isLocalParticipantModerator);
    const meetingTypeVideoTranslatorAi = useSelector((state) => state["features/videotranslatorai"].meetingType);
    const transcriptionButtonRef = useRef<HTMLDivElement>(null);

    const [isRecording, setIsRecording] = useState(false);
    const [isSoundOn, setIsSoundOn] = useState(true);
    const [previousMessages, setPreviousMessages] = useState(messages);

    // const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const stream = useRef<MediaStream | undefined>(undefined);
    const [rnnoiseProcessor, setRnnoiseProcessor] = useState<any | null>(null);
    const [sendDataWhenReady, setSendDataWhenReady] = useState<boolean>(false);
    const [lastVoiceStopTimeEnd, setLastVoiceStopTimeEnd] = useState<boolean>(false);
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const apiEndpoint = process.env.REACT_APP_OPENAI_TRANSCRIBE_ENDPOINT_VIDEOTRANSLATORAI; // New API endpoint
    const tokenData = toState(state)["features/videotranslatorai"].jwtToken;

    // State variables for media recorder, audio context, script processor, and RNNoise processor
    const [scriptProcessor, setScriptProcessor] = useState<ScriptProcessorNode | null>(null);
    const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

    const intializeStream = async () => {
        const streamVar = await navigator.mediaDevices.getUserMedia({
            audio: true,
        });

        stream.current = streamVar;
        const audioContextVar = new AudioContext({ sampleRate: 44100 });
        const recorder = new MediaRecorder(stream.current);

        setAudioContext(audioContextVar);

        const source = audioContextVar.createMediaStreamSource(streamVar);
        const scriptProcessorVar = audioContextVar.createScriptProcessor(512, 1, 1);

        // Collect audio chunks
        recorder.ondataavailable = async (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }

            if (audioChunks.length > 0) {
                const audioBlob = new Blob(audioChunks, { type: "audio/webm" });

                console.log("AUDIO CHUNKS PROCESSED:", audioChunks);

                // dispatch(translateOpenAi(audioBlob, true));

                const transcriptionText = await transcribeAudioOpenAi("en", audioBlob, apiEndpoint, tokenData);

                console.log("transcription", transcriptionText);
            }
        };

        recorder.onstop = () => {};

        recorder.start(1000); // Start recording with 1-second intervals
        mediaRecorder.current = recorder;

        source.connect(scriptProcessorVar);
        scriptProcessorVar.connect(audioContextVar.destination);

        setScriptProcessor(scriptProcessorVar);

        // Initialize RNNoise after mediaRecorder is set
        const rnnoise = await createRnnoiseProcessor();

        setRnnoiseProcessor(rnnoise);
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

    useEffect(() => {
        setIsSoundOn(false);
    }, []);

    const handleStartVAD = async () => {
        setIsRecording(true);
        intializeStream();
    };

    const handleStopVAD = () => {
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
        audioChunks = [];

        setIsRecording(false);

        // if (rnnoiseProcessor) {
        //     rnnoiseProcessor.destroy();
        //     setRnnoiseProcessor(null);
        // }

        audioChunks = [];
    };

    // Stream processing
    vadScore$
        .pipe(
            throttleTime(100),
            map((vadScore: VadScore) => vadScore > 0.6), // Convert vadScore to boolean
            distinctUntilChanged(), // Only emit on true/false change
            debounceTime(200) // Debounce to ensure stability
        )
        .subscribe((stateVar: IsVoiceActive) => {
            if (isVoiceActive !== stateVar) {
                isVoiceActive = stateVar;
                console.log(`Switched to ${stateVar ? "ON" : "OFF"} state`);

                if (isVoiceActive) {
                    if (offTimeout) {
                        clearTimeout(offTimeout);
                    }

                    console.log("timeout with media recorder", mediaRecorder.current);
                    if (mediaRecorder.current === null) {
                        console.log("ACTIVATE");
                        audioChunks = [];

                        handleStartVAD();
                    }
                } else {
                    offTimeout = setTimeout(() => {
                        if (mediaRecorder.current && mediaRecorder.current.state == "recording") {
                            console.log("DE-ACTIVATE");

                            if (mediaRecorder.current) {
                                // Stop the media recorder and remove the ondataavailable event listener
                                mediaRecorder.current.ondataavailable = null;
                                mediaRecorder.current.stop();
                                mediaRecorder.current = null;
                            }

                            // Stop all audio tracks to release the stream
                            // stream?.current?.getTracks().forEach((track) => track.stop());
                            // stream.current = undefined;

                            // Clear audio chunks immediately to prevent any further processing
                            audioChunks = [];
                        }
                    }, 2000);
                }
            }
        });

    // Function to handle VAD score updates
    function handleVADScore(vadScore: VadScore): void {
        vadScore$.next(vadScore);
    }

    useEffect(() => {
        if (sendDataWhenReady) {
            setSendDataWhenReady(false);
        }
    }, [sendDataWhenReady]);

    useEffect(() => {
        if (lastVoiceStopTimeEnd) {
            setLastVoiceStopTimeEnd(false);

            setLastVoiceStopTimeEnd(false);
        }
    }, [lastVoiceStopTimeEnd, mediaRecorder.current]);

    useEffect(() => {
        if (!isSoundOn) {
            return;
        }
        if (messages !== previousMessages) {
            const lastMessage = messages[messages.length - 2];

            if (lastMessage) {
                const textToSpeechCode = toState(state)["features/videotranslatorai"].textToSpeechCode;

                dispatch(startTextToSpeech(lastMessage, textToSpeechCode));
            }
            setPreviousMessages(messages);
        }
    }, [messages, previousMessages]);

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
