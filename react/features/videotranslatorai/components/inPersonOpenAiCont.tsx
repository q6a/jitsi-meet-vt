import React, { FC, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Subject } from "rxjs";
import { debounceTime, distinctUntilChanged, map, throttleTime } from "rxjs/operators";

import { IReduxState } from "../../app/types";
import { isLocalParticipantModerator } from "../../base/participants/functions";
import { toState } from "../../base/redux/functions";
import { createRnnoiseProcessor } from "../../stream-effects/rnnoise"; // Import the create function
import {
    inPersonStartRecordingPersonOne,
    inPersonStartRecordingPersonTwo,
    inPersonStopRecordingPersonOne,
    inPersonStopRecordingPersonTwo,
    inPersonTranslateOpenAi,
    startTextToSpeech,
} from "../action.web";

import InPersonButton from "./buttons/inPersonToggleButton";
import SoundToggleButton from "./buttons/soundToggleButton";
let whichPerson = 0;

type VadScore = number;
type IsVoiceActive = boolean;
const vadScore$ = new Subject<number>(); // Specify Subject<number>
// let audioChunks: any = [];

let offTimeout: any = 0;
let isVoiceActive = false; // Tracks current state (on/off)
const lastStateChangeTime = Date.now(); // Tracks the last time the state changed
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

    const [isSoundOn, setIsSoundOn] = useState(true);

    // const mediaRecorder = useRef<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);

    const mediaRecorder = useRef<MediaRecorder | null>(null);

    const stream = useRef<MediaStream | undefined>(undefined);
    const [audioContext, setAudioContext] = useState<any | null>(null);
    const messages = useSelector((state: IReduxState) => state["features/videotranslatorai"].completedMessages);
    const [previousMessages, setPreviousMessages] = useState(messages);

    // State variables for media recorder, audio context, script processor, and RNNoise processor
    const [scriptProcessor, setScriptProcessor] = useState<ScriptProcessorNode | null>(null);
    const [rnnoiseProcessor, setRnnoiseProcessor] = useState<any | null>(null);

    // const [startTTSForLastMessage, setStartTTSForLastMessage] = useState<boolean>(false);

    const toggleSound = () => {
        setIsSoundOn((prev) => !prev);
    };

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
                audioChunks.current.push(event.data);
            }

            if (audioChunks.current.length > 0) {
                const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });

                if (whichPerson === 1 && !isRecordingPersonTwo) {
                    dispatch(
                        inPersonTranslateOpenAi(
                            audioBlob,
                            langFromPersonOneTranscription,
                            personOneName,
                            langFromPersonOneTranslation,
                            langFromPersonOneTranscriptionId,
                            langFromPersonTwoTranslationId,
                            false
                        )
                    );
                }

                if (whichPerson === 2 && !isRecordingPersonOne) {
                    dispatch(
                        inPersonTranslateOpenAi(
                            audioBlob,
                            langFromPersonTwoTranscription,
                            personTwoName,
                            langFromPersonTwoTranslation,
                            langFromPersonTwoTranscriptionId,
                            langFromPersonOneTranslationId,
                            false
                        )
                    );
                }

                // const transcriptionText = await transcribeAudioOpenAi("en", audioBlob, apiEndpoint, tokenData);
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

        // Clear audio chunks immediately to prevent any further processing
        audioChunks.current = [];

        // if (rnnoiseProcessor) {
        //     rnnoiseProcessor.destroy();
        //     setRnnoiseProcessor(null);
        // }

        audioChunks.current = [];
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

                if (isVoiceActive) {
                    if (offTimeout) {
                        clearTimeout(offTimeout);
                    }

                    if (mediaRecorder.current === null) {
                        audioChunks.current = [];

                        intializeStream();
                    }
                } else {
                    offTimeout = setTimeout(() => {
                        if (mediaRecorder.current && mediaRecorder.current.state == "recording") {
                            if (audioChunks.current.length > 0) {
                                const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });

                                if (whichPerson === 1 && !isRecordingPersonTwo) {
                                    dispatch(
                                        inPersonTranslateOpenAi(
                                            audioBlob,
                                            langFromPersonOneTranscription,
                                            personOneName,
                                            langFromPersonOneTranslation,
                                            langFromPersonOneTranscriptionId,
                                            langFromPersonTwoTranslationId,
                                            true
                                        )
                                    );
                                }

                                if (whichPerson === 2 && !isRecordingPersonOne) {
                                    dispatch(
                                        inPersonTranslateOpenAi(
                                            audioBlob,
                                            langFromPersonTwoTranscription,
                                            personTwoName,
                                            langFromPersonTwoTranslation,
                                            langFromPersonTwoTranscriptionId,
                                            langFromPersonOneTranslationId,
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
                    }, 1500);
                }
            }
        });

    // Function to handle VAD score updates
    function handleVADScore(vadScore: VadScore): void {
        vadScore$.next(vadScore);
    }

    const handleStartTranscriptionOne = () => {
        if (!isAudioMuted && !isRecordingPersonTwo) {
            dispatch(inPersonStartRecordingPersonOne());
            intializeStream();

            whichPerson = 1;
        }
    };

    const handleStopTranscriptionOne = () => {
        dispatch(inPersonStopRecordingPersonOne());
        handleStop();
    };

    const handleStartTranscriptionTwo = () => {
        if (!isAudioMuted && !isRecordingPersonOne) {
            dispatch(inPersonStartRecordingPersonTwo());
            intializeStream();

            whichPerson = 2;
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
                if (whichPerson === 1) {
                    dispatch(startTextToSpeech(lastMessage, ttsCodePersonTwo));
                }

                if (whichPerson === 2) {
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
