import React, { FC, useEffect, useState } from "react";
import { ReactMic } from "react-mic";
import { useDispatch, useSelector } from "react-redux";

import { IReduxState } from "../../app/types";
import { toState } from "../../base/redux/functions";
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

const InPersonOpenAi: FC = () => {
    const dispatch = useDispatch();
    const state = useSelector((state: IReduxState) => state);

    const moderatorData = toState(state)["features/videotranslatorai"].moderatorData;
    const participantData = toState(state)["features/videotranslatorai"].participantData;

    const personOneName = moderatorData[0].name;
    const personTwoName = participantData[0].name;
    const langFromPersonOne = moderatorData[0].translationDialect.dialectCode;
    const langFromPersonTwo = participantData[0].translationDialect.dialectCode;

    const isRecordingPersonOne = useSelector(
        (state: IReduxState) => state["features/videotranslatorai"].inPersonIsRecordingPersonOne
    );
    const isRecordingPersonTwo = useSelector(
        (state: IReduxState) => state["features/videotranslatorai"].inPersonIsRecordingPersonTwo
    );

    const isAudioMuted = useSelector((state: IReduxState) => state["features/base/media"].audio.muted);
    const messages = useSelector((state: IReduxState) => state["features/videotranslatorai"].messages);

    const [previousMessages, setPreviousMessages] = useState(messages);
    const [isSoundOn, setIsSoundOn] = useState(true);

    const toggleSound = () => {
        setIsSoundOn((prev) => !prev);
    };

    useEffect(() => {
        if (!isSoundOn) {
            return;
        }
        if (messages !== previousMessages) {
            const lastMessage = messages[messages.length - 1];

            if (lastMessage) {
                dispatch(startTextToSpeech(lastMessage.message));
            }
            setPreviousMessages(messages);
        }
    }, [messages, previousMessages]);

    const handleStartTranscriptionOne = () => {
        if (!isAudioMuted && !isRecordingPersonTwo) {
            dispatch(inPersonStartRecordingPersonOne());
            whichPerson = 1;
        }
    };

    const handleStopTranscriptionOne = () => {
        dispatch(inPersonStopRecordingPersonOne());
    };

    const handleStartTranscriptionTwo = () => {
        if (!isAudioMuted && !isRecordingPersonOne) {
            dispatch(inPersonStartRecordingPersonTwo());
            whichPerson = 2;
        }
    };

    const handleStopTranscriptionTwo = () => {
        dispatch(inPersonStopRecordingPersonTwo());
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

    const handleOnStop = async (recordedBlob: any) => {
        if (whichPerson === 1 && !isRecordingPersonTwo) {
            console.log("PERSON 1");
            console.log("LANG FROM", langFromPersonOne);
            console.log("PERSON NAME", personOneName);
            dispatch(inPersonTranslateOpenAi(recordedBlob, langFromPersonOne, personOneName));
        }

        if (whichPerson === 2 && !isRecordingPersonOne) {
            console.log("PERSON 2");
            console.log("LANG FROM", langFromPersonTwo);
            console.log("PERSON NAME", personTwoName);
            dispatch(inPersonTranslateOpenAi(recordedBlob, langFromPersonTwo, personTwoName));
        }

        whichPerson = 0;
    };

    const handleOnData = (recordedBlob: any) => {
        // console.log("Chunk of real-time data:", recordedBlob);
    };

    return (
        <div>
            <div style={{ visibility: "hidden", height: 0, width: 0, overflow: "hidden" }}>
                <ReactMic
                    backgroundColor="#FF4081"
                    className="sound-wave"
                    onStop={handleOnStop}
                    record={isRecordingPersonOne || isRecordingPersonTwo}
                    strokeColor="#000000"
                />
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                <SoundToggleButton isSoundOn={isSoundOn} toggleSound={toggleSound} />
                <InPersonButton
                    handleStart={handleStartTranscriptionOne}
                    handleStop={handleStopTranscriptionOne}
                    isRecording={isRecordingPersonOne}
                    number={1}
                />
                <InPersonButton
                    handleStart={handleStartTranscriptionTwo}
                    handleStop={handleStopTranscriptionTwo}
                    isRecording={isRecordingPersonTwo}
                    number={2}
                />
            </div>
        </div>
    );
};

export default InPersonOpenAi;
