import React, { FC, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { IReduxState } from "../../app/types";
import { isLocalParticipantModerator } from "../../base/participants/functions";
import { toState } from "../../base/redux/functions";
import {
    startRecordingMirosoftManual,
    startTextToSpeech,
    startTranslateMicrosoftManual,
    stopRecordingMirosoftManual,
} from "../action.web";

import SoundToggleButton from "./buttons/soundToggleButton";
import TranscriptionButton from "./buttons/transcriptionButton";

const TranscriptionAndTranslationButtonMicrosoftMan: FC = () => {
    const dispatch = useDispatch();
    const state = useSelector((state: IReduxState) => state);

    const isRecording = useSelector(
        (state: IReduxState) => state["features/videotranslatorai"].isRecordingMicrosoftMan
    );
    const isAudioMuted = useSelector((state: IReduxState) => state["features/base/media"].audio.muted);
    const messages = useSelector((state: IReduxState) => state["features/videotranslatorai"].messages);
    const isModerator = useSelector(isLocalParticipantModerator);
    const meetingTypeVideoTranslatorAi = useSelector(
        (state: IReduxState) => state["features/videotranslatorai"].meetingType
    );

    const [previousMessages, setPreviousMessages] = useState(messages);
    const [isSoundOn, setIsSoundOn] = useState(true);

    // const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
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
                const textToSpeechCode = toState(state)["features/videotranslatorai"].textToSpeechCode;

                dispatch(startTextToSpeech(lastMessage.message, textToSpeechCode));
            }
            setPreviousMessages(messages);
        }
    }, [messages, previousMessages]);

    const handleStartTranscription = async () => {
        if (!isAudioMuted) {
            dispatch(startRecordingMirosoftManual());

            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        sampleRate: 48000, // Sets the sample rate to 48 kHz (high quality)
                        channelCount: 2, // Sets stereo recording
                        sampleSize: 16, // Specifies 16-bit samples
                        echoCancellation: false, // Disables echo cancellation for cleaner input
                        noiseSuppression: false, // Disables noise suppression
                        autoGainControl: false, // Disables auto gain control
                    },
                });
                const recorder = new MediaRecorder(stream);

                mediaRecorder.current = recorder;

                recorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        audioChunks.current.push(event.data);
                    }
                };

                recorder.onstop = () => {
                    const blobOptions: BlobOptions = { type: "audio/webm", lastModified: Date.now() };

                    const recordedBlob = new Blob(audioChunks.current, blobOptions);

                    dispatch(startTranslateMicrosoftManual(recordedBlob));

                    audioChunks.current = [];
                };

                recorder.start();
            } catch (error) {
                console.error("Error accessing media devices:", error);
            }
        }
    };

    const handleStopTranscription = () => {
        if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
            mediaRecorder.current.stop();
            dispatch(stopRecordingMirosoftManual());
        }
    };

    useEffect(() => {
        // This will run only once when the component mounts
        if (isRecording) {
            dispatch(stopRecordingMirosoftManual());
        }

        setIsSoundOn(false);
    }, []);

    useEffect(() => {
        if (isAudioMuted) {
            dispatch(stopRecordingMirosoftManual());
        }
    }, [isAudioMuted]);

    return (
        <div>
            <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                <SoundToggleButton isSoundOn={isSoundOn} toggleSound={toggleSound} />

                {(meetingTypeVideoTranslatorAi !== "broadcast" || isModerator) && (
                    <TranscriptionButton
                        handleStart={handleStartTranscription}
                        handleStop={handleStopTranscription}
                        isRecording={isRecording}
                    />
                )}
            </div>
        </div>
    );
};

export default TranscriptionAndTranslationButtonMicrosoftMan;