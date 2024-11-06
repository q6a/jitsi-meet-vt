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
    inPersonTranslateMicrosoftCont,
    startTextToSpeech,
} from "../action.web";

import InPersonButton from "./buttons/inPersonToggleButton";
import SoundToggleButton from "./buttons/soundToggleButton";
let whichPerson = 0;

const InPersonMicrosoftCont: FC = () => {
    const dispatch = useDispatch();
    const state = useSelector((state: IReduxState) => state);
    const isModerator = useSelector(isLocalParticipantModerator);

    const moderatorData = toState(state)["features/videotranslatorai"].moderatorData;
    const participantData = toState(state)["features/videotranslatorai"].participantData;

    const personOneName = moderatorData[0].name;
    const personTwoName = participantData[0].name;

    const langFromPersonOneTranscription = moderatorData[0].transcriptionDialect.dialectCode;
    const langFromPersonTwoTranscription = participantData[0].transcriptionDialect.dialectCode;

    const langFromPersonOneTranscriptionId = moderatorData[0].transcriptionDialect.dialectId;
    const langFromPersonTwoTranscriptionId = participantData[0].transcriptionDialect.dialectId;

    const langFromPersonOneTranslationId = moderatorData[0].translationDialect.dialectId;
    const langFromPersonTwoTranslationId = participantData[0].translationDialect.dialectId;

    const langFromPersonOneTranslation = moderatorData[0].translationDialect.dialectCode;
    const langFromPersonTwoTranslation = participantData[0].translationDialect.dialectCode;

    const toolTipContentPersonOne = moderatorData[0].translationDialect.name;
    const toolTipContenPersonTwo = participantData[0].translationDialect.name;

    const isRecordingPersonOne = useSelector(
        (state: IReduxState) => state["features/videotranslatorai"].inPersonIsRecordingPersonOne
    );
    const isRecordingPersonTwo = useSelector(
        (state: IReduxState) => state["features/videotranslatorai"].inPersonIsRecordingPersonTwo
    );

    const isAudioMuted = useSelector((state: IReduxState) => state["features/base/media"].audio.muted);
    const messages = useSelector((state: IReduxState) => state["features/videotranslatorai"].completedMessages);

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

    const endTranscriptionRecognizer = () => {
        new Promise<void>((resolve, reject) => {
            const recognizerSdk = state["features/videotranslatorai"].microsoftRecognizerSDK;

            if (!recognizerSdk) {
                console.error("SDK recognizer not set");
                reject(new Error("SDK recognizer not set"));

                return;
            }
            recognizerSdk.stopContinuousRecognitionAsync(
                () => {
                    resolve();
                },
                (err: any) => {
                    console.error("Error stopping transcription:", err);
                    reject(err);
                }
            );
        });
    };

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

    const handleStartTranscription = async () => {
        if (!isAudioMuted) {
            if (whichPerson === 1 && !isRecordingPersonTwo) {
                dispatch(
                    inPersonTranslateMicrosoftCont(
                        langFromPersonOneTranscription,
                        langFromPersonTwoTranslation,
                        personOneName,
                        langFromPersonOneTranscriptionId,
                        langFromPersonTwoTranslationId
                    )
                );
            }

            if (whichPerson === 2 && !isRecordingPersonOne) {
                dispatch(
                    inPersonTranslateMicrosoftCont(
                        langFromPersonTwoTranscription,
                        langFromPersonOneTranslation,
                        personTwoName,
                        langFromPersonTwoTranscriptionId,
                        langFromPersonOneTranslationId
                    )
                );
            }
            audioChunks.current = [];
        }
    };

    const handleStartTranscriptionOne = () => {
        if (!isAudioMuted && !isRecordingPersonTwo) {
            dispatch(inPersonStartRecordingPersonOne());
            whichPerson = 1;
            handleStartTranscription();
        }
    };

    const handleStopTranscriptionOne = () => {
        endTranscriptionRecognizer();
        dispatch(inPersonStopRecordingPersonOne());
        whichPerson = 0;
    };

    const handleStartTranscriptionTwo = () => {
        if (!isAudioMuted && !isRecordingPersonOne) {
            dispatch(inPersonStartRecordingPersonTwo());
            whichPerson = 2;
            handleStartTranscription();
        }
    };

    const handleStopTranscriptionTwo = () => {
        dispatch(inPersonStopRecordingPersonTwo());
        endTranscriptionRecognizer();
        whichPerson = 0;
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

export default InPersonMicrosoftCont;
