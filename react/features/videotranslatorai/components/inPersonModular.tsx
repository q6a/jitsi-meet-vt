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
    startTextToSpeech,
} from "../action.web";

import InPersonToggleButtonMicrosoftCont from "./buttons/inPersonToggleButtonMicrosoftCont";
import InPersonToggleButtonMicrosoftMan from "./buttons/inPersonToggleButtonMicrosoftMan";
import InPersonToggleButtonOpenAiCont from "./buttons/inPersonToggleButtonOpenAiCont";
import InPersonToggleButtonOpenAiMan from "./buttons/inPersonToggleButtonOpenAiMan";
import SoundToggleButton from "./buttons/soundToggleButton";
let whichPerson = 0;

const InPersonModular: FC = () => {
    const dispatch = useDispatch();
    const state = useSelector((state: IReduxState) => state);
    const isModerator = useSelector(isLocalParticipantModerator);

    const mode = toState(state)["features/videotranslatorai"].modeContOrMan;

    const moderatorData = toState(state)["features/videotranslatorai"].moderatorData;
    const participantData = toState(state)["features/videotranslatorai"].participantData;

    const personOneName = moderatorData[0].name;
    const personTwoName = participantData[0].name;

    const langFromPersonOneTranscription = moderatorData[0].transcriptionDialect.dialectCode;
    const langFromPersonTwoTranscription = participantData[0].transcriptionDialect.dialectCode;

    const providerPersonOne = moderatorData[0].transcriptionDialect.provider;
    const providerPersonTwo = participantData[0].transcriptionDialect.provider;

    const langFromPersonOneTranslation = moderatorData[0].translationDialect.dialectCode;
    const langFromPersonTwoTranslation = participantData[0].translationDialect.dialectCode;

    const toolTipContentPersonOne = moderatorData[0].translationDialect.name;
    const toolTipContentPersonTwo = participantData[0].translationDialect.name;

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

    useEffect(() => {
        if (!isSoundOn) {
            return;
        }
        if (messages !== previousMessages) {
            const lastMessage = messages[messages.length - 1];

            if (lastMessage) {
                if (isRecordingPersonOne || whichPerson === 1) {
                    dispatch(startTextToSpeech(lastMessage, ttsCodePersonTwo));
                }

                if (isRecordingPersonTwo || whichPerson === 2) {
                    dispatch(startTextToSpeech(lastMessage, ttsCodePersonOne));
                }
            }
            setPreviousMessages(messages);
        }

        if (!isRecordingPersonOne && !isRecordingPersonTwo) {
            whichPerson = 0;
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

    const renderButtonForPersonOne = () => {
        if (mode === "continuous") {
            return providerPersonOne === "Microsoft" ? (
                <InPersonToggleButtonMicrosoftCont
                    buttonTextValue={"1"}
                    isAudioMuted={isAudioMuted}
                    isRecording={isRecordingPersonOne}
                    isRecordingOther={isRecordingPersonTwo}
                    langFromOtherPersonTranslation={langFromPersonTwoTranslation}
                    langFromOtherPersonTranslationId={langFromPersonTwoTranslationId}
                    langFromTranscription={langFromPersonOneTranscription}
                    langFromTranscriptionId={langFromPersonOneTranscriptionId}
                    langFromTranslation={langFromPersonOneTranslation}
                    langFromTranslationId={langFromPersonOneTranslationId}
                    onStartRecording={handleStartTranscriptionOne}
                    onStopRecording={handleStopTranscriptionOne}
                    personName={personOneName}
                    tooltipContent={toolTipContentPersonOne}
                />
            ) : (
                <InPersonToggleButtonOpenAiCont
                    buttonTextValue={"1"}
                    isAudioMuted={isAudioMuted}
                    isRecording={isRecordingPersonOne}
                    isRecordingOther={isRecordingPersonTwo}
                    langFromOtherPersonTranslationId={langFromPersonTwoTranslationId}
                    langFromTranscription={langFromPersonOneTranscription}
                    langFromTranscriptionId={langFromPersonOneTranscriptionId}
                    langFromTranslation={langFromPersonOneTranslation}
                    langFromTranslationId={langFromPersonOneTranslationId}
                    onStartRecording={handleStartTranscriptionOne}
                    onStopRecording={handleStopTranscriptionOne}
                    personName={personOneName}
                    tooltipContent={toolTipContentPersonOne}
                />
            );
        }

        return providerPersonOne === "Microsoft" ? (
            <InPersonToggleButtonMicrosoftMan
                buttonTextValue={"1"}
                isAudioMuted={isAudioMuted}
                isRecording={isRecordingPersonOne}
                isRecordingOther={isRecordingPersonTwo}
                langFromOtherPersonTranslationId={langFromPersonTwoTranslationId}
                langFromTranscription={langFromPersonOneTranscription}
                langFromTranscriptionId={langFromPersonOneTranscriptionId}
                langFromTranslation={langFromPersonOneTranslation}
                langFromTranslationId={langFromPersonOneTranslationId}
                onStartRecording={handleStartTranscriptionOne}
                onStopRecording={handleStopTranscriptionOne}
                personName={personOneName}
                tooltipContent={toolTipContentPersonOne}
            />
        ) : (
            <InPersonToggleButtonOpenAiMan
                buttonTextValue={"1"}
                isAudioMuted={isAudioMuted}
                isRecording={isRecordingPersonOne}
                isRecordingOther={isRecordingPersonTwo}
                langFromOtherPersonTranslationId={langFromPersonTwoTranslationId}
                langFromTranscription={langFromPersonOneTranscription}
                langFromTranscriptionId={langFromPersonOneTranscriptionId}
                langFromTranslation={langFromPersonOneTranslation}
                langFromTranslationId={langFromPersonOneTranslationId}
                onStartRecording={handleStartTranscriptionOne}
                onStopRecording={handleStopTranscriptionOne}
                personName={personOneName}
                tooltipContent={toolTipContentPersonOne}
            />
        );
    };

    const renderButtonForPersonTwo = () => {
        if (mode === "continuous") {
            return providerPersonTwo === "Microsoft" ? (
                <InPersonToggleButtonMicrosoftCont
                    buttonTextValue={"2"}
                    isAudioMuted={isAudioMuted}
                    isRecording={isRecordingPersonTwo}
                    isRecordingOther={isRecordingPersonOne}
                    langFromOtherPersonTranslation={langFromPersonOneTranslation}
                    langFromOtherPersonTranslationId={langFromPersonOneTranslationId}
                    langFromTranscription={langFromPersonTwoTranscription}
                    langFromTranscriptionId={langFromPersonTwoTranscriptionId}
                    langFromTranslation={langFromPersonTwoTranslation}
                    langFromTranslationId={langFromPersonTwoTranslationId}
                    onStartRecording={handleStartTranscriptionTwo}
                    onStopRecording={handleStopTranscriptionTwo}
                    personName={personTwoName}
                    tooltipContent={toolTipContentPersonTwo}
                />
            ) : (
                <InPersonToggleButtonOpenAiCont
                    buttonTextValue={"2"}
                    isAudioMuted={isAudioMuted}
                    isRecording={isRecordingPersonTwo}
                    isRecordingOther={isRecordingPersonOne}
                    langFromOtherPersonTranslationId={langFromPersonOneTranslationId}
                    langFromTranscription={langFromPersonTwoTranscription}
                    langFromTranscriptionId={langFromPersonTwoTranscriptionId}
                    langFromTranslation={langFromPersonTwoTranslation}
                    langFromTranslationId={langFromPersonTwoTranslationId}
                    onStartRecording={handleStartTranscriptionTwo}
                    onStopRecording={handleStopTranscriptionTwo}
                    personName={personTwoName}
                    tooltipContent={toolTipContentPersonTwo}
                />
            );
        }

        return providerPersonTwo === "Microsoft" ? (
            <InPersonToggleButtonMicrosoftMan
                buttonTextValue={"2"}
                isAudioMuted={isAudioMuted}
                isRecording={isRecordingPersonTwo}
                isRecordingOther={isRecordingPersonOne}
                langFromOtherPersonTranslationId={langFromPersonOneTranslationId}
                langFromTranscription={langFromPersonTwoTranscription}
                langFromTranscriptionId={langFromPersonTwoTranscriptionId}
                langFromTranslation={langFromPersonTwoTranslation}
                langFromTranslationId={langFromPersonTwoTranslationId}
                onStartRecording={handleStartTranscriptionTwo}
                onStopRecording={handleStopTranscriptionTwo}
                personName={personTwoName}
                tooltipContent={toolTipContentPersonTwo}
            />
        ) : (
            <InPersonToggleButtonOpenAiMan
                buttonTextValue={"2"}
                isAudioMuted={isAudioMuted}
                isRecording={isRecordingPersonTwo}
                isRecordingOther={isRecordingPersonOne}
                langFromOtherPersonTranslationId={langFromPersonOneTranslationId}
                langFromTranscription={langFromPersonTwoTranscription}
                langFromTranscriptionId={langFromPersonTwoTranscriptionId}
                langFromTranslation={langFromPersonTwoTranslation}
                langFromTranslationId={langFromPersonTwoTranslationId}
                onStartRecording={handleStartTranscriptionTwo}
                onStopRecording={handleStopTranscriptionTwo}
                personName={personTwoName}
                tooltipContent={toolTipContentPersonTwo}
            />
        );
    };

    return (
        <div>
            {/* Buttons */}
            <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                <SoundToggleButton isSoundOn={isSoundOn} toggleSound={toggleSound} />
                {renderButtonForPersonOne()}
                {renderButtonForPersonTwo()}
            </div>
        </div>
    );
};

export default InPersonModular;
