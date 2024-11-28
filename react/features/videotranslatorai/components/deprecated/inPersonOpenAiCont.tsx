import React, { FC, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Subject } from "rxjs";
import { debounceTime, distinctUntilChanged, map, throttleTime } from "rxjs/operators";

import { IReduxState } from "../../../app/types";
import { isLocalParticipantModerator } from "../../../base/participants/functions";
import { toState } from "../../../base/redux/functions";
import { createRnnoiseProcessor } from "../../../stream-effects/rnnoise"; // Import the create function
import {
    inPersonStartRecordingPersonOne,
    inPersonStartRecordingPersonTwo,
    inPersonStopRecordingPersonOne,
    inPersonStopRecordingPersonTwo,
    inPersonTranslateOpenAi,
    startTextToSpeech,
} from "../../action.web";
import InPersonButton from "../buttons/inPersonToggleButton";
import SoundToggleButton from "../buttons/soundToggleButton";

type VadScore = number;
type IsVoiceActive = boolean;
const vadScore$ = new Subject<number>(); // Specify Subject<number>
// let audioChunks: any = [];
let lastLogTime = 0; // Track the last time the log was printed

let offTimeout: any = 0;
let isVoiceActive = false; // Tracks current state (on/off)
const InPersonOpenAiCont: FC = () => {
    const dispatch = useDispatch();
    const state = useSelector((state: IReduxState) => state);
    const isModerator = useSelector(isLocalParticipantModerator);

    const moderatorData = toState(state)["features/videotranslatorai"].moderatorData;
    const participantData = toState(state)["features/videotranslatorai"].participantData;

    const personOneName = moderatorData[0].name;
    const personTwoName = participantData[0].name;

    const langFromPersonOneTranscription = moderatorData[0].transcriptionDialect.dialectCode;
    const langFromPersonTwoTranscription = participantData[0].transcriptionDialect.dialectCode;

    const langFromPersonOneTranslation = moderatorData[0].translationDialect.dialectCode;
    const langFromPersonTwoTranslation = participantData[0].translationDialect.dialectCode;

    const toolTipContentPersonOne = moderatorData[0].translationDialect.name;
    const toolTipContenPersonTwo = participantData[0].translationDialect.name;

    const langFromPersonOneTranscriptionId = moderatorData[0].transcriptionDialect.dialectId;
    const langFromPersonTwoTranscriptionId = participantData[0].transcriptionDialect.dialectId;

    const langFromPersonOneTranslationId = moderatorData[0].translationDialect.dialectId;
    const langFromPersonTwoTranslationId = participantData[0].translationDialect.dialectId;

    const isRecordingPersonOne = useSelector(
        (state: IReduxState) => state["features/videotranslatorai"].inPersonIsRecordingPersonOne
    );
    const isRecordingPersonTwo = useSelector(
        (state: IReduxState) => state["features/videotranslatorai"].inPersonIsRecordingPersonTwo
    );

    const isAudioMuted = useSelector((state: IReduxState) => state["features/base/media"].audio.muted);

    const ttsCodePersonOne = useSelector(
        (state: IReduxState) => state["features/videotranslatorai"].inPersontextToSpeechCodePersonOne
    );
    const ttsCodePersonTwo = useSelector(
        (state: IReduxState) => state["features/videotranslatorai"].inPersontextToSpeechCodePersonTwo
    );

    // Use useSelector to get the latest ttsVoiceoverActive value
    const ttsVoiceoverActive = useSelector((state: IReduxState) => state["features/videotranslatorai"].isPlayingTTS);
    const whichPerson = useRef<number>(0);

    // Use a ref to store ttsVoiceoverActive so it's accessible in the RxJS subscription
    const ttsVoiceoverActiveRef = useRef(ttsVoiceoverActive);

    useEffect(() => {
        ttsVoiceoverActiveRef.current = ttsVoiceoverActive;

        // // Stop recording when ttsVoiceoverActive becomes true
        // if (ttsVoiceoverActive && isRecordingLocal.current) {
        //     handleStopRecording();
        // }
    }, [ttsVoiceoverActive]);

    const [isSoundOn, setIsSoundOn] = useState(true);

    // const mediaRecorder = useRef<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);

    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const rnnoiseProcesorRef = useRef<any | null>(null);

    const stream = useRef<MediaStream | undefined>(undefined);
    const [audioContext, setAudioContext] = useState<any | null>(null);
    const audioContextRef = useRef<any | null>(null);
    const messages = useSelector((state: IReduxState) => state["features/videotranslatorai"].completedMessages);
    const [previousMessages, setPreviousMessages] = useState(messages);

    // State variables for media recorder, audio context, script processor, and RNNoise processor
    const [scriptProcessor, setScriptProcessor] = useState<ScriptProcessorNode | null>(null);
    const [rnnoiseProcessor, setRnnoiseProcessor] = useState<any | null>(null);

    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

    // const [startTTSForLastMessage, setStartTTSForLastMessage] = useState<boolean>(false);

    const toggleSound = () => {
        setIsSoundOn((prev) => !prev);
    };

    function destroyRnnoiseProcessor(rnnoiseProcessor) {
        if (rnnoiseProcessor && !rnnoiseProcessor._destroyed) {
            try {
                // Call the destroy function with the context handle

                if (rnnoiseProcessor._wasmInterface && rnnoiseProcessor._wasmInterface._rnnoise_destroy) {
                    rnnoiseProcessor._wasmInterface._rnnoise_destroy(rnnoiseProcessor._context);
                }

                // Optionally free allocated memory
                if (rnnoiseProcessor._wasmInterface && rnnoiseProcessor._wasmInterface._free) {
                    rnnoiseProcessor._wasmInterface._free(rnnoiseProcessor._wasmPcmInput);
                    rnnoiseProcessor._wasmInterface._free(rnnoiseProcessor._context);
                }

                // Mark the processor as destroyed

                console.log("RnnoiseProcessor destroyed successfully.", rnnoiseProcessor);
            } catch (error) {
                console.error("Error destroying RnnoiseProcessor:", error);
            }
        } else {
            console.log("RnnoiseProcessor is already destroyed or invalid.");
        }
    }

    const intializeStream = async () => {
        // Ensure the stream is cleaned up if it exists
        if (stream.current) {
            stream.current.getTracks().forEach((track) => track.stop());
            stream.current = undefined;
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

        // Cleanup and create a new AudioContext
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }

        const audioContextVar = new AudioContext({ sampleRate: 44100 });

        // Cleanup and create a new MediaRecorder
        if (mediaRecorder.current) {
            mediaRecorder.current.ondataavailable = null;
            mediaRecorder.current.stream.getTracks().forEach((track) => track.stop());
            mediaRecorder.current = null;
        }

        const recorder = new MediaRecorder(stream.current);

        audioContextRef.current = audioContextVar;

        const source = audioContextVar.createMediaStreamSource(streamVar);

        // Cleanup and create a new ScriptProcessor
        if (scriptProcessorRef.current !== null) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }

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
        scriptProcessorRef.current = scriptProcessorVar;

        if (rnnoiseProcesorRef.current) {
            destroyRnnoiseProcessor(rnnoiseProcesorRef.current);
        }

        if (rnnoiseProcesorRef.current === null) {
            rnnoiseProcesorRef.current = await createRnnoiseProcessor();
        }

        // Initialize RNNoise after mediaRecorder is set

        if (!rnnoiseProcesorRef.current) {
            return;
        }

        scriptProcessorVar.onaudioprocess = (event) => {
            const pcmFrame = event.inputBuffer.getChannelData(0);

            // Process pcmFrame with rnnoise
            if (rnnoiseProcesorRef.current) {
                const vadScore = rnnoiseProcesorRef.current.calculateAudioFrameVAD(pcmFrame);

                // Handle VAD score as per your logic
                handleVADScore(vadScore);
            }
        };
    };

    const handleStop = () => {
        if (mediaRecorder.current) {
            // Stop the media recorder and remove the ondataavailable event listener
            mediaRecorder.current.ondataavailable = null;
            mediaRecorder.current.stop();
            mediaRecorder.current = null;
        }

        // Stop all audio tracks to release the stream
        stream?.current?.getTracks().forEach((track) => track.stop());
        stream.current = undefined;

        // if (rnnoiseProcessor) {
        //     rnnoiseProcessor.destroy();
        //     setRnnoiseProcessor(null);
        // }

        setScriptProcessor(null);
        setRnnoiseProcessor(null);

        whichPerson.current = 0;
        audioChunks.current = [];
    };

    // Stream processing
    vadScore$
        .pipe(
            throttleTime(200),
            map((vadScore: VadScore) => vadScore >= 0.99), // Convert vadScore to boolean
            distinctUntilChanged(), // Only emit on true/false change
            debounceTime(20) // Debounce to ensure stability
        )
        .subscribe((stateVar: IsVoiceActive) => {
            if (whichPerson.current === 0 || ttsVoiceoverActiveRef.current) {
                return;
            }

            console.log("stateVar", stateVar);

            if (isVoiceActive !== stateVar) {
                isVoiceActive = stateVar;

                if (isVoiceActive) {
                    if (offTimeout) {
                        clearTimeout(offTimeout);
                    }

                    if (mediaRecorder.current === null) {
                        audioChunks.current = [];

                        intializeStream();
                        if (whichPerson.current === 0) {
                            handleStop();

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

                        if (whichPerson.current === 1 && !isRecordingPersonTwo) {
                            dispatch(
                                inPersonTranslateOpenAi(
                                    audioBlob,
                                    langFromPersonOneTranscription,
                                    personOneName,
                                    langFromPersonOneTranslation,
                                    langFromPersonOneTranscriptionId,
                                    langFromPersonTwoTranslationId,
                                    langFromPersonOneTranslationId,
                                    false,
                                    true
                                )
                            );
                        }

                        if (whichPerson.current === 2 && !isRecordingPersonOne) {
                            dispatch(
                                inPersonTranslateOpenAi(
                                    audioBlob,
                                    langFromPersonTwoTranscription,
                                    personTwoName,
                                    langFromPersonTwoTranslation,
                                    langFromPersonTwoTranscriptionId,
                                    langFromPersonOneTranslationId,
                                    langFromPersonTwoTranslationId,
                                    false,
                                    true
                                )
                            );
                        }
                    }
                } else {
                    offTimeout = setTimeout(() => {
                        if (mediaRecorder.current && mediaRecorder.current.state === "recording") {
                            if (audioChunks.current.length > 1) {
                                mediaRecorder.current?.requestData();

                                const blobOptions: BlobOptions = { type: "audio/webm", lastModified: Date.now() };

                                const audioBlob = new Blob(audioChunks.current, blobOptions);

                                if (whichPerson.current === 1 && !isRecordingPersonTwo) {
                                    dispatch(
                                        inPersonTranslateOpenAi(
                                            audioBlob,
                                            langFromPersonOneTranscription,
                                            personOneName,
                                            langFromPersonOneTranslation,
                                            langFromPersonOneTranscriptionId,
                                            langFromPersonTwoTranslationId,
                                            langFromPersonOneTranslationId,
                                            true,
                                            true
                                        )
                                    );
                                }

                                if (whichPerson.current === 2 && !isRecordingPersonOne) {
                                    dispatch(
                                        inPersonTranslateOpenAi(
                                            audioBlob,
                                            langFromPersonTwoTranscription,
                                            personTwoName,
                                            langFromPersonTwoTranslation,
                                            langFromPersonTwoTranscriptionId,
                                            langFromPersonOneTranslationId,
                                            langFromPersonTwoTranslationId,
                                            true,
                                            true
                                        )
                                    );
                                }
                            }

                            // Stop the media recorder and remove the ondataavailable event listener
                            mediaRecorder.current.ondataavailable = null;
                            mediaRecorder.current.stop();
                            mediaRecorder.current = null;

                            audioChunks.current = [];
                        }

                        setTimeout(() => {
                            intializeStream();
                        }, 200);
                    }, 2300);
                }
            }
        });

    // Function to handle VAD score updates
    function handleVADScore(vadScore: VadScore): void {
        const now = Date.now();

        // Only log if 5 seconds have passed since the last log
        if (now - lastLogTime >= 100) {
            // console.log("vadScore", vadScore);
            lastLogTime = now; // Update the last log time
        }

        // Continue with the rest of the logic (e.g., emitting to Subject)
        vadScore$.next(vadScore);
    }

    const handleStartTranscriptionOne = () => {
        if (!isAudioMuted && !isRecordingPersonTwo) {
            dispatch(inPersonStartRecordingPersonOne());
            whichPerson.current = 1;

            intializeStream();
        }
    };

    const handleStopTranscriptionOne = () => {
        dispatch(inPersonStopRecordingPersonOne());
        handleStop();
    };

    const handleStartTranscriptionTwo = () => {
        if (!isAudioMuted && !isRecordingPersonOne) {
            dispatch(inPersonStartRecordingPersonTwo());
            whichPerson.current = 2;

            intializeStream();
        }
    };

    const handleStopTranscriptionTwo = () => {
        dispatch(inPersonStopRecordingPersonTwo());
        handleStop();
    };

    useEffect(() => {
        // This will run only once when the component mounts
        if (isRecordingPersonOne) {
            dispatch(inPersonStopRecordingPersonOne());
        }

        if (isRecordingPersonTwo) {
            dispatch(inPersonStopRecordingPersonTwo());
        }

        setIsSoundOn(false);
    }, []);

    useEffect(() => {
        if (isAudioMuted) {
            dispatch(inPersonStopRecordingPersonOne());
            dispatch(inPersonStopRecordingPersonTwo());
        }
    }, [isAudioMuted]);

    useEffect(() => {
        if (!isSoundOn) {
            return;
        }
        if (messages !== previousMessages) {
            const lastMessage = messages[messages.length - 1];

            if (lastMessage) {
                if (whichPerson.current === 1) {
                    dispatch(startTextToSpeech(lastMessage, ttsCodePersonTwo));
                }

                if (whichPerson.current === 2) {
                    dispatch(startTextToSpeech(lastMessage, ttsCodePersonOne));
                }
            }
            setPreviousMessages(messages);
        }
    }, [messages, previousMessages]);

    return (
        <div>
            {/* Buttons */}
            <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                <SoundToggleButton isSoundOn={isSoundOn} toggleSound={toggleSound} />
                <InPersonButton
                    handleStart={handleStartTranscriptionOne}
                    handleStop={handleStopTranscriptionOne}
                    isRecording={isRecordingPersonOne}
                    number={1}
                    toolTipContent={toolTipContentPersonOne}
                />
                <InPersonButton
                    handleStart={handleStartTranscriptionTwo}
                    handleStop={handleStopTranscriptionTwo}
                    isRecording={isRecordingPersonTwo}
                    number={2}
                    toolTipContent={toolTipContenPersonTwo}
                />
            </div>
        </div>
    );
};

export default InPersonOpenAiCont;
