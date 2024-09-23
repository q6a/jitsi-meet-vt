import React, { FC, useEffect, useState } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { IReduxState } from '../../app/types';
import { startRecordingOpenAi, stopRecordingOpenAi, translateOpenAi, setRecordingBlobOpenAi } from '../action.web';
//import { ReactMic } from 'react-mic';
import { transcribeAndTranslateServiceOpenAi } from '../services/transcriptionServiceOpenAi';

const TranscriptionAndTranslationOpenAiButton: FC = () => {
    const dispatch = useDispatch();
    const store = useStore();
    const isRecording = useSelector((state: IReduxState) => state['features/videotranslatorai'].isRecording);
    const isAudioMuted = useSelector((state: IReduxState) => state['features/base/media'].audio.muted);
    const [recording, setRecording] = useState(false);

    const handleStartTranscription = () => {
        if (!isAudioMuted) {
            dispatch(startRecordingOpenAi());
        }
    };

    const handleStopTranscription = () => {
        dispatch(stopRecordingOpenAi());
        handleTranslation();
    };

    const handleTranslation = () => {
        dispatch(translateOpenAi());
    };

    useEffect(() => {
        // This will run only once when the component mounts
        if (isRecording) {
            dispatch(stopRecordingOpenAi());
        }
    }, []);

    useEffect(() => {
        if (isAudioMuted) {
            dispatch(stopRecordingOpenAi());
        }
    }, [ isAudioMuted]);

    const handleOnStop = async (recordedBlob: any) => {
        console.log('Recorded Blob:', recordedBlob);

        await transcribeAndTranslateServiceOpenAi(store, recordedBlob);
        
        dispatch(setRecordingBlobOpenAi(recordedBlob)); // Dispatch the blob to Redux
    };

    const handleOnData = (recordedBlob: any) => {
        console.log('Chunk of real-time data:', recordedBlob);
    };

    return (
        <div>
            <div  style={{ visibility: 'hidden', height: 0, width: 0, overflow: 'hidden' }}>
                {/* <ReactMic
                    record={isRecording}
                    className="sound-wave"
                    onStop={handleOnStop}
                    onData={handleOnData}
                    strokeColor="#000000"
                    backgroundColor="#FF4081"/> */}
            </div>


            <div
                className="toolbox-icon"
                onClick={isRecording ? handleStopTranscription : handleStartTranscription}
                style={{ backgroundColor: isRecording ? 'green' : 'transparent' }}
            >
                <div className="jitsi-icon jitsi-icon-default">
                    <div>
                        {isRecording ? (
                            <svg fill="#ffffff" width={20} height={20} version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
                                <g>
                                    <circle cx="16" cy="16" r="4" fill="#ffffff"></circle>
                                    <path d="M16,2C8.3,2,2,8.3,2,16s6.3,14,14,14s14-6.3,14-14S23.7,2,16,2z M16,22c-3.3,0-6-2.7-6-6s2.7-6,6-6s6,2.7,6,6S19.3,22,16,22z"></path>
                                </g>
                            </svg>
                        ) : (
                            <svg fill="#ffffff" width={20} height={20} version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
                                <g>
                                    <circle cx="16" cy="16" r="4"></circle>
                                    <path d="M16,2C8.3,2,2,8.3,2,16s6.3,14,14,14s14-6.3,14-14S23.7,2,16,2z M16,22c-3.3,0-6-2.7-6-6s2.7-6,6-6s6,2.7,6,6S19.3,22,16,22z"></path>
                                </g>
                            </svg>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
};

export default TranscriptionAndTranslationOpenAiButton;
