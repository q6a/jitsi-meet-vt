import React, { FC, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { IReduxState } from "../../app/types";
import { isLocalParticipantModerator } from "../../base/participants/functions";
import { toState } from "../../base/redux/functions";
import {
    inPersonStartRecordingPersonOne,
    inPersonStartRecordingPersonTwo,
    inPersonStopRecordingPersonOne,
    inPersonStopRecordingPersonTwo,
    inPersonTranslateMicrosoftMan,
    startTextToSpeech,
} from "../action.web";

import InPersonButton from "./buttons/inPersonToggleButton";
import SoundToggleButton from "./buttons/soundToggleButton";
let whichPerson = 0;

const InPersonMicrosoftMan: FC = () => {
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

    const langFromPersonOneTranscriptionId = moderatorData[0].transcriptionDialect.dialectId;
    const langFromPersonTwoTranscriptionId = participantData[0].transcriptionDialect.dialectId;

    const langFromPersonOneTranslationId = moderatorData[0].translationDialect.dialectId;
    const langFromPersonTwoTranslationId = participantData[0].translationDialect.dialectId;

    const toolTipContentPersonOne = moderatorData[0].translationDialect.name;
    const toolTipContenPersonTwo = participantData[0].translationDialect.name;

    const isRecordingPersonOne = useSelector(
        (state: IReduxState) => state["features/videotranslatorai"].inPersonIsRecordingPersonOne
    );
    const isRecordingPersonTwo = useSelector(
        (state: IReduxState) => state["features/videotranslatorai"].inPersonIsRecordingPersonTwo
    );

    const isAudioMuted = useSelector((state: IReduxState) => state["features/base/media"].audio.muted);
    const messages = useSelector((state: IReduxState) => state["features/videotranslatorai"].messages);

    const ttsCodePersonOne = useSelector(
        (state: IReduxState) => state["features/videotranslatorai"].inPersontextToSpeechCodePersonOne
    );
    const ttsCodePersonTwo = useSelector(
        (state: IReduxState) => state["features/videotranslatorai"].inPersontextToSpeechCodePersonTwo
    );

    const [previousMessages, setPreviousMessages] = useState(messages);
    const [isSoundOn, setIsSoundOn] = useState(true);
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);

    const toggleSound = () => {
        setIsSoundOn((prev) => !prev);
    };

    useEffect(() => {
        if (!isSoundOn) {
            whichPerson = 0;

            return;
        }
        if (messages !== previousMessages) {
            const lastMessage = messages[messages.length - 1];

            if (lastMessage) {
                if (whichPerson === 1) {
                    dispatch(startTextToSpeech(lastMessage.message, ttsCodePersonTwo));
                }

                if (whichPerson === 2) {
                    dispatch(startTextToSpeech(lastMessage.message, ttsCodePersonOne));
                }
            }
            setPreviousMessages(messages);
        }

        whichPerson = 0;
    }, [messages, previousMessages]);

    const handleStartTranscription = async () => {
        if (!isAudioMuted) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const recorder = new MediaRecorder(stream);

                mediaRecorder.current = recorder;

                recorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        audioChunks.current.push(event.data);
                    }
                };

                recorder.onstop = () => {
                    const recordedBlob = new Blob(audioChunks.current, { type: "audio/webm" });

                    if (whichPerson === 1 && !isRecordingPersonTwo) {
                        dispatch(
                            inPersonTranslateMicrosoftMan(
                                recordedBlob,
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
                            inPersonTranslateMicrosoftMan(
                                recordedBlob,
                                langFromPersonTwoTranscription,
                                personTwoName,
                                langFromPersonTwoTranslation,
                                langFromPersonOneTranscriptionId,
                                langFromPersonTwoTranslationId,
                                false
                            )
                        );
                    }
                    audioChunks.current = [];
                };

                recorder.start();
            } catch (error) {
                console.error("Error accessing media devices:", error);
            }
        }
    };

    const handleStartTranscriptionOne = () => {
        if (!isAudioMuted && !isRecordingPersonTwo) {
            dispatch(inPersonStartRecordingPersonOne());
            handleStartTranscription();
            whichPerson = 1;
        }
    };

    const handleStopTranscriptionOne = () => {
        if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
            mediaRecorder.current.stop();
            dispatch(inPersonStopRecordingPersonOne());
        }
    };

    const handleStartTranscriptionTwo = () => {
        if (!isAudioMuted && !isRecordingPersonOne) {
            dispatch(inPersonStartRecordingPersonTwo());
            handleStartTranscription();
            whichPerson = 2;
        }
    };

    const handleStopTranscriptionTwo = () => {
        if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
            mediaRecorder.current.stop();
            dispatch(inPersonStopRecordingPersonTwo());
        }
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

export default InPersonMicrosoftMan;
