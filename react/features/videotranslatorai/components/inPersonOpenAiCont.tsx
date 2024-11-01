import React, { FC, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

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

// let audioChunks: any = [];
let lastVoiceStopTime: number | null = Date.now();
let lastDispatchTime: number | null = null;
let speechStartTime: number | null = null;

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
    const messages = useSelector((state: IReduxState) => state["features/videotranslatorai"].messages);

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

    const [previousMessages, setPreviousMessages] = useState<string>("");
    const [isSoundOn, setIsSoundOn] = useState(true);

    // const mediaRecorder = useRef<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);

    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

    const [vadInstance, setVadInstance] = useState<any>(null);
    const [stream, setStream] = useState<MediaStream | undefined>(undefined); // Initialize stream state
    const [audioContext, setAudioContext] = useState<any | null>(null);
    const [sendDataWhenReady, setSendDataWhenReady] = useState<boolean>(false);

    const [lastVoiceStopTimeEnd, setLastVoiceStopTimeEnd] = useState<boolean>(false);

    // State variables for media recorder, audio context, script processor, and RNNoise processor
    const [scriptProcessor, setScriptProcessor] = useState<ScriptProcessorNode | null>(null);
    const [rnnoiseProcessor, setRnnoiseProcessor] = useState<any | null>(null);

    // const [startTTSForLastMessage, setStartTTSForLastMessage] = useState<boolean>(false);

    const toggleSound = () => {
        setIsSoundOn((prev) => !prev);
    };

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
    useEffect(() => {
        if (sendDataWhenReady && audioChunks.current.length > 0) {
            const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });

            if (audioChunks.current.length > 0) {
                if (whichPerson === 1 && !isRecordingPersonTwo) {
                    dispatch(
                        inPersonTranslateOpenAi(
                            audioBlob,
                            langFromPersonOneTranscription,
                            personOneName,
                            langFromPersonOneTranslation
                        )
                    );
                }

                if (whichPerson === 2 && !isRecordingPersonOne) {
                    dispatch(
                        inPersonTranslateOpenAi(
                            audioBlob,
                            langFromPersonTwoTranscription,
                            personTwoName,
                            langFromPersonTwoTranslation
                        )
                    );
                }
            }
            setSendDataWhenReady(false);
        }
    }, [sendDataWhenReady]);

    const handleStartTranscription = async () => {
        if (!isAudioMuted) {
            const streamVar = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });
            const audioContextVar = new AudioContext({ sampleRate: 44100 });

            setAudioContext(audioContextVar);

            const recorder = new MediaRecorder(streamVar);

            // Collect audio data as chunks when recording is active
            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.current.push(event.data);
                }
            };

            recorder.onstop = () => {
                audioChunks.current = [];
            };

            recorder.start();
            setMediaRecorder(recorder);

            const source = audioContextVar.createMediaStreamSource(streamVar);
            const scriptProcessorVar = audioContextVar.createScriptProcessor(512, 1, 1);

            source.connect(scriptProcessorVar);
            scriptProcessorVar.connect(audioContextVar.destination);
            setStream(streamVar);

            // Store audioContext and scriptProcessor to use in useEffect
            setScriptProcessor(scriptProcessorVar);
        }
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

    const handleStartTranscriptionOne = () => {
        if (!isAudioMuted && !isRecordingPersonTwo) {
            dispatch(inPersonStartRecordingPersonOne());
            handleStartTranscription();
            whichPerson = 1;
        }
    };

    const handleStopTranscriptionOne = () => {
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
            mediaRecorder.stop();
        }

        dispatch(inPersonStopRecordingPersonOne());
        whichPerson = 0;
        stream?.getTracks().forEach((track) => track.stop());
        setStream(undefined);

        if (vadInstance) {
            vadInstance.destroy();
            setVadInstance(null);
        }
        audioChunks.current = [];
    };

    const handleStartTranscriptionTwo = () => {
        if (!isAudioMuted && !isRecordingPersonOne) {
            dispatch(inPersonStartRecordingPersonTwo());
            handleStartTranscription();
            whichPerson = 2;
        }
    };

    const handleStopTranscriptionTwo = () => {
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
            mediaRecorder.stop();
        }

        dispatch(inPersonStopRecordingPersonTwo());
        whichPerson = 0;
        stream?.getTracks().forEach((track) => track.stop());
        setStream(undefined);

        if (vadInstance) {
            vadInstance.destroy();
            setVadInstance(null);
        }
        audioChunks.current = [];
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

        setPreviousMessages("message1");
    }, []);

    useEffect(() => {
        if (isAudioMuted) {
            dispatch(inPersonStopRecordingPersonOne());
            dispatch(inPersonStopRecordingPersonTwo());
        }
    }, [isAudioMuted]);

    useEffect(() => {
        if (lastVoiceStopTimeEnd) {
            setLastVoiceStopTimeEnd(false);
            if (mediaRecorder && mediaRecorder?.state === "inactive") {
                mediaRecorder?.start();
            }

            if (!isSoundOn) {
                return;
            }

            if (messages) {
                const lastMessage = messages[messages.length - 2];

                if (lastMessage && lastMessage.message !== previousMessages) {
                    if (whichPerson === 1) {
                        dispatch(startTextToSpeech(lastMessage.message, ttsCodePersonTwo));
                    }

                    if (whichPerson === 2) {
                        dispatch(startTextToSpeech(lastMessage.message, ttsCodePersonOne));
                    }

                    setPreviousMessages(lastMessage.message);
                }
            }
        }
    }, [lastVoiceStopTimeEnd, mediaRecorder]);

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
