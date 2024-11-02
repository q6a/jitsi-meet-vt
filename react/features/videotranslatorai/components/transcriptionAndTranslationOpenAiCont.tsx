import React, { FC, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Subject, Subscription, interval } from "rxjs";
import { debounceTime, distinctUntilChanged, map } from "rxjs/operators";

import { IReduxState } from "../../app/types";
import { isLocalParticipantModerator } from "../../base/participants/functions";
import { toState } from "../../base/redux/functions";
import { createRnnoiseProcessor } from "../../stream-effects/rnnoise"; // Import the create function
import { startTextToSpeech, translateOpenAi } from "../action.web";

import SoundToggleButton from "./buttons/soundToggleButton";
import TranscriptionButton from "./buttons/transcriptionButton";

// let audioChunks: any = [];
const lastVoiceStopTime: number | null = Date.now();
const lastDispatchTime: number | null = null;
const speechStartTime: number | null = null;
const speechEndTime: number | null = null;
let audioChunks: Blob[] = [];

type VadScore = number;
type IsVoiceActive = boolean;
let offTimeout: NodeJS.Timeout | null = null; // Timeout for the "off" state

const vadScore$ = new Subject<number>(); // Specify Subject<number>
let isVoiceActive: IsVoiceActive = false;
let messageIntervalSubscription: Subscription | null = null; // Subscription for the message interval
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
    const [stream, setStream] = useState<MediaStream | undefined>(undefined);
    const [rnnoiseProcessor, setRnnoiseProcessor] = useState<any | null>(null);
    const [sendDataWhenReady, setSendDataWhenReady] = useState<boolean>(false);
    const [lastVoiceStopTimeEnd, setLastVoiceStopTimeEnd] = useState<boolean>(false);
    const mediaRecorder = useRef<MediaRecorder | null>(null);

    // State variables for media recorder, audio context, script processor, and RNNoise processor
    const [scriptProcessor, setScriptProcessor] = useState<ScriptProcessorNode | null>(null);
    const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

    useEffect(() => {
        setIsSoundOn(false);
    }, []);

    const startSendingMessages = () => {
        // Create an interval that emits every 500 ms
        console.log("how many runs here");
        if (mediaRecorder.current && mediaRecorder.current?.state === "inactive") {
            mediaRecorder.current?.start();
        }
        messageIntervalSubscription = interval(600).subscribe(() => {
            console.log("Sending message while voice is active", mediaRecorder.current);
            mediaRecorder.current?.requestData();
            const audioBlob = new Blob(audioChunks, { type: "audio/webm" });

            console.log("AUDIO BLOB DATA WHEN READY", audioBlob);
            if (audioChunks.length > 0) {
                dispatch(translateOpenAi(audioBlob, false));
            }
        });
    };

    const stopSendingMessages = () => {
        if (messageIntervalSubscription) {
            messageIntervalSubscription.unsubscribe(); // Unsubscribe to stop sending messages
            messageIntervalSubscription = null;
        }
    };

    const startOffTimeout = () => {
        // Start a 3-second timeout for actions after "off" state
        offTimeout = setTimeout(() => {
            console.log("3 seconds of silence reached - Performing action");

            setTimeout(() => {
                const audioBlob = new Blob(audioChunks, { type: "audio/webm" });

                mediaRecorder.current?.requestData();

                console.log("300 ms off time mediarecorder", mediaRecorder.current);

                console.log("3 second audio blob off time", audioBlob);
                if (audioChunks.length > 0) {
                    dispatch(translateOpenAi(audioBlob, true));
                }

                mediaRecorder.current?.stop();
            }, 300);

            setTimeout(() => {
                // Your action here
                audioChunks = [];
                console.log("1 second off time mediarecorder", mediaRecorder.current);
                if (mediaRecorder.current && mediaRecorder.current?.state === "inactive") {
                    mediaRecorder.current?.start();
                }
            }, 1000);
        }, 3000);
    };

    const clearOffTimeout = () => {
        // Clear the off timeout if it's active
        if (offTimeout) {
            clearTimeout(offTimeout);
            offTimeout = null;
        }
    };

    // Stream processing
    vadScore$
        .pipe(
            map((vadScore: VadScore) => vadScore > 0.6), // Convert vadScore to boolean
            distinctUntilChanged(), // Only emit on true/false change
            debounceTime(200) // Debounce to ensure stability
        )
        .subscribe((stateVar: IsVoiceActive) => {
            if (isVoiceActive !== stateVar) {
                isVoiceActive = stateVar;
                console.log(`Switched to ${stateVar ? "ON" : "OFF"} state`);

                if (isVoiceActive) {
                    // When switching to "on" state
                    startSendingMessages();
                    clearOffTimeout(); // Clear off timeout if voice reactivates
                } else {
                    // When switching to "off" state
                    stopSendingMessages();
                    startOffTimeout(); // Start a 3-second timeout for "off" state
                }

                if (mediaRecorder.current && mediaRecorder.current.state === "inactive") {
                    mediaRecorder.current.start();
                }
            }
        });

    // Function to handle VAD score updates
    function handleVADScore(vadScore: VadScore): void {
        vadScore$.next(vadScore);
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
            console.log("event data", event.data);

            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        recorder.onstop = () => {
            // audioChunks = [];
        };

        recorder.onstart = () => {
            // audioChunks = [];
        };

        recorder.start();
        mediaRecorder.current = recorder;
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
        if (mediaRecorder.current && stream && scriptProcessor && audioContext) {
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
    }, [mediaRecorder.current, stream, scriptProcessor, audioContext]); // Run useEffect when mediaRecorder or stream changes

    const handleStopVAD = () => {
        stream?.getTracks().forEach((track) => track.stop());
        setStream(undefined);
        setIsRecording(false);
        mediaRecorder.current?.stop();
        setIsRecording(false);

        // if (rnnoiseProcessor) {
        //     rnnoiseProcessor.destroy();
        //     setRnnoiseProcessor(null);
        // }

        audioChunks = [];
    };

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
