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
    sendEventLogToServer,
    startTextToSpeech,
    VtaiEventTypes,
} from "../action.web";

import InPersonToggleButtonAutoCont from "./buttons/inPersonToggleButtonAutoCont";
import InPersonToggleButtonMicrosoftCont from "./buttons/inPersonToggleButtonMicrosoftCont";
import InPersonToggleButtonMicrosoftMan from "./buttons/inPersonToggleButtonMicrosoftMan";
import InPersonToggleButtonOpenAiCont from "./buttons/inPersonToggleButtonOpenAiCont";
import InPersonToggleButtonOpenAiMan from "./buttons/inPersonToggleButtonOpenAiMan";
import SoundToggleButton from "./buttons/soundToggleButton";
import InPersonOpenAiCont from "./deprecated/inPersonOpenAiCont";

const InPersonModular: FC = () => {
    const dispatch = useDispatch();
    const state = useSelector((state: IReduxState) => state);
    const isModerator = useSelector(isLocalParticipantModerator);

    const mode = toState(state)["features/videotranslatorai"].modeContOrMan;
    const whichPerson = useRef<number>(0);

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

    // Define the conditional check
    const bothAreOpenAiAndContinuous =
        mode === "continuous" && providerPersonOne === "OpenAI" && providerPersonTwo === "OpenAI";

    const [previousMessages, setPreviousMessages] = useState(messages);
    const [isSoundOn, setIsSoundOn] = useState(true);

    const toggleSound = () => {
        setIsSoundOn((prev) => !prev);
        if (isSoundOn) {
            dispatch(sendEventLogToServer({ eventType: VtaiEventTypes.VOICEOVER_DISABLED }));
        } else {
            dispatch(sendEventLogToServer({ eventType: VtaiEventTypes.VOICEOVER_ENABLED }));
        }
    };
    const debounceTimeout = useRef<NodeJS.Timeout | null>(null); // Shared debounce timeout

    const handleDebouncedClick = (callback: () => void) => {
        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }

        debounceTimeout.current = setTimeout(() => {
            callback();
        }, 1000); // Shared debounce time
    };

    useEffect(() => {
        if (!isSoundOn || bothAreOpenAiAndContinuous) {
            return;
        }
        if (messages !== previousMessages) {
            const lastMessage = messages[messages.length - 1];

            if (lastMessage) {
                if (isRecordingPersonOne || whichPerson.current === 1) {
                    dispatch(startTextToSpeech(lastMessage, ttsCodePersonTwo));
                }

                if (isRecordingPersonTwo || whichPerson.current === 2) {
                    dispatch(startTextToSpeech(lastMessage, ttsCodePersonOne));
                }
            }
            setPreviousMessages(messages);
        }

        if (!isRecordingPersonOne && !isRecordingPersonTwo) {
            whichPerson.current = 0;
        }
    }, [messages, previousMessages]);

    const handleStartTranscriptionOne = () => {
        if (!isAudioMuted && !isRecordingPersonTwo) {
            dispatch(inPersonStartRecordingPersonOne());
            whichPerson.current = 1;
        }
    };

    const handleStopTranscriptionOne = () => {
        dispatch(inPersonStopRecordingPersonOne());
    };

    const handleStartTranscriptionTwo = () => {
        if (!isAudioMuted && !isRecordingPersonOne) {
            dispatch(inPersonStartRecordingPersonTwo());
            whichPerson.current = 2;
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
                    handleDebouncedClick={handleDebouncedClick}
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
                    handleDebouncedClick={handleDebouncedClick}
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
                handleDebouncedClick={handleDebouncedClick}
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
                handleDebouncedClick={handleDebouncedClick}
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
                    handleDebouncedClick={handleDebouncedClick}
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
                    handleDebouncedClick={handleDebouncedClick}
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
                handleDebouncedClick={handleDebouncedClick}
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
                handleDebouncedClick={handleDebouncedClick}
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
                <div>
                    {bothAreOpenAiAndContinuous ? (
                        <div>
                            <InPersonOpenAiCont />
                        </div>
                    ) : (
                        <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                            <SoundToggleButton isSoundOn={isSoundOn} toggleSound={toggleSound} />
                            {mode === "continuous_auto" ? (
                                <InPersonToggleButtonAutoCont
                                    buttonTextValue={"Auto"}
                                    handleDebouncedClick={handleDebouncedClick}
                                    isAudioMuted={isAudioMuted}
                                    isRecording={isRecordingPersonTwo}
                                    langPersonOneTranscription={langFromPersonOneTranscription}
                                    langPersonOneTranscriptionId={langFromPersonOneTranscriptionId}
                                    langPersonOneTranslation={langFromPersonOneTranslation}
                                    langPersonOneTranslationId={langFromPersonOneTranslationId}
                                    langPersonTwoTranscription={langFromPersonTwoTranscription}
                                    langPersonTwoTranscriptionId={langFromPersonTwoTranscriptionId}
                                    langPersonTwoTranslation={langFromPersonTwoTranslation}
                                    langPersonTwoTranslationId={langFromPersonTwoTranslationId}
                                    onStartRecording={handleStartTranscriptionTwo}
                                    onStopRecording={handleStopTranscriptionTwo}
                                    personOneName={personOneName}
                                    personTwoName={personTwoName}
                                    tooltipContent={"Auto"}
                                    whichPerson={whichPerson}
                                />
                            ) : (
                                <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                                    {renderButtonForPersonOne()}
                                    {renderButtonForPersonTwo()}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InPersonModular;
