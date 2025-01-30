// import { IReduxState } from "../../app/types";
// import { toState } from "../../base/redux/functions";
// import { inPersonTranslateOpenAi, setMicrosoftRecognizerSDK } from "../action.web";
// import fetchAzureToken from "../services/fetchAzureToken"; // Adjust the path as necessary
// let recording = false;

// let mediaRecorder: MediaRecorder | null = null;
// let recordedChunks: BlobPart[] = [];
// let mediaStream: MediaStream | null = null;

// const initializeMediaRecorder = async () => {
//     if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
//         try {
//             mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
//             mediaRecorder = new MediaRecorder(mediaStream);

//             mediaRecorder.ondataavailable = (event) => {
//                 if (event.data.size > 0) {
//                     recordedChunks.push(event.data);
//                 }
//             };

//             mediaRecorder.onstop = () => {
//                 const audioBlob = new Blob(recordedChunks, { type: "audio/webm" });

//                 recordedChunks = [];
//             };
//         } catch (error) {
//             console.error("Error accessing microphone:", error);
//         }
//     } else {
//         console.error("MediaDevices API not supported.");
//     }
// };

// export const inPersonServiceMicrosoftAutoCont = async (
//     dispatch: any,
//     getState: any,
//     langPersonOneTranscription: any,
//     langPersonOneTranslation: any,
//     langPersonTwoTranscription: any,
//     langPersonTwoTranslation: any,
//     personOneName: any = "",
//     personTwoName: any = "",
//     langPersonOneTranscriptionId: any = "",
//     langPersonOneTranslationId: any = "",
//     langPersonTwoTranscriptionId: any = "",
//     langPersonTwoTranslationId: any = "",
//     whichPerson: React.MutableRefObject<number> // Add whichPerson as a parameter
// ) => {
//     const state: IReduxState = getState();

//     // initializeMediaRecorder();
//     recording = true;
//     const tokenData = toState(state)["features/videotranslatorai"].jwtToken;
//     const participantState = toState(state)["features/base/participants"];
//     const participantData = toState(state)["features/videotranslatorai"].participantData;
//     const meetingData: any = toState(state)["features/videotranslatorai"].meetingData;
//     const moderatorData = toState(state)["features/videotranslatorai"].moderatorData;
//     const entityData: any = toState(state)["features/videotranslatorai"].thisEntityData;
//     const conference = toState(state)["features/base/conference"].conference;
//     const clientId = toState(state)["features/videotranslatorai"].clientId;
//     const meetingId = toState(state)["features/videotranslatorai"].meetingId;
//     const participantAndModeratorData = [...moderatorData, ...participantData];
//     const participantLanguageName = "";

//     const baseEndpoint = process.env.REACT_APP_MICROSOFT_SPEECH_TO_TEXT_ENDPOINT;
//     const speechRegion = process.env.REACT_APP_SPEECH_REGION_MICROSOFT_SDK;

//     // Error checking for environment variables
//     if (!speechRegion || !baseEndpoint || !mediaStream) {
//         throw new Error("Required environment variables are missing.");
//     }

//     try {
//         // langFrom = participant.transcriptionDialect.dialectCode;
//         // langFromTranslation = participant.translationDialect.dialectCode;
//         let authToken = "";

//         authToken = await fetchAzureToken(speechRegion, tokenData);
//         const speechConfig = speechsdk.SpeechConfig.fromAuthorizationToken(authToken, speechRegion);
//         const audioConfig = speechsdk.AudioConfig.fromStreamInput(mediaStream);

//         // Step 2: Set up auto-detection for languages
//         const autoDetectSourceLanguageConfig = speechsdk.AutoDetectSourceLanguageConfig.fromLanguages([
//             langPersonOneTranscription,
//             langPersonTwoTranscription,
//         ]);

//         let speechRecognizer: speechsdk.SpeechRecognizer = null;

//         if (!state["features/videotranslatorai"].microsoftRecognizerSDK) {
//             speechRecognizer = speechsdk.SpeechRecognizer.FromConfig(
//                 speechConfig,
//                 autoDetectSourceLanguageConfig,
//                 audioConfig
//             );

//             dispatch(setMicrosoftRecognizerSDK(speechRecognizer));
//         } else {
//             speechRecognizer = state["features/videotranslatorai"].microsoftRecognizerSDK;
//         }

//         // Error checking for environment variables
//         if (!speechRecognizer) {
//             throw new Error("No sdk present.");
//         }

//         // Handle recognizing event (interim results)
//         speechRecognizer.recognizing = async (s: any, e: speechsdk.SpeechRecognitionEventArgs) => {
//             console.log("IN HERE", speechRecognizer);

//             if (!recording) {
//                 speechRecognizer.stopContinuousRecognitionAsync(
//                     () => {
//                         console.log("Recognizer stopped. Restarting...");
//                     },
//                     (err: any) => {
//                         console.error("Error stopping recognizer:", err);
//                     }
//                 );
//             }

//             if (mediaRecorder && mediaRecorder.state === "recording") {
//                 mediaRecorder?.requestData();
//                 if (recordedChunks.length % 2 !== 0 || recordedChunks.length === 0) {
//                     return;
//                 }

//                 const blobOptions: BlobOptions = { type: "audio/webm", lastModified: Date.now() };

//                 const audioBlob = new Blob(recordedChunks, blobOptions);

//                 dispatch(
//                     inPersonTranslateOpenAi(
//                         audioBlob,
//                         langPersonOneTranscriptionId,
//                         personOneName,
//                         langPersonOneTranslation,
//                         langPersonOneTranscriptionId,
//                         langPersonTwoTranslationId,
//                         langPersonOneTranslationId,
//                         false,
//                         true
//                     )
//                 );
//             }
//         };

//         // Handle recognized event (final results)
//         speechRecognizer.recognized = async (s: any, e: speechsdk.SpeechRecognitionEventArgs) => {
//             if (e.result.reason === speechsdk.ResultReason.RecognizedSpeech) {
//                 // Stop MediaRecorder and process the recorded audio
//                 if (mediaRecorder && mediaRecorder.state === "recording") {
//                     mediaRecorder.stop();
//                     console.log("MediaRecorder stopped");
//                 }

//                 // Restart MediaRecorder after processing
//                 if (mediaRecorder) {
//                     mediaRecorder.start();
//                     console.log("MediaRecorder restarted");
//                 }

//                 speechRecognizer.stopContinuousRecognitionAsync(
//                     () => {
//                         console.log("Recognizer stopped. Restarting...");
//                         if (recording) {
//                             speechRecognizer.startContinuousRecognitionAsync(
//                                 () => {
//                                     console.log("Recognizer restarted.");
//                                 },
//                                 (err: any) => {
//                                     console.error("Error restarting recognizer:", err);
//                                 }
//                             );
//                         }
//                     },
//                     (err: any) => {
//                         console.error("Error stopping recognizer:", err);
//                     }
//                 );
//             } else {
//                 console.error("Recognition failed:", e.result.reason);
//             }
//         };

//         // Handle session stopped event
//         speechRecognizer.sessionStopped = (s: any, e: any) => {
//             console.log("Session stopped. Continuous recognition terminated.");
//             speechRecognizer.stopContinuousRecognitionAsync();
//         };

//         // Handle any errors during recognition
//         speechRecognizer.canceled = (s: any, e: any) => {
//             console.error(`Canceled: ${e.reason}`);
//             speechRecognizer.stopContinuousRecognitionAsync();
//         };

//         speechRecognizer.startContinuousRecognitionAsync(
//             () => {
//                 console.log("Continuous recognition started.");
//             },
//             (err: any) => {
//                 console.error("Error starting continuous recognition:", err);
//             }
//         );

//         // Await all translation promises
//     } catch (err: any) {
//         console.error("Error during transcription and translation:", err);
//     }
// };

// export const stopTranscriptionAutoService = (dispatch: any, state: any) =>
//     new Promise<void>((resolve, reject) => {
//         const recognizerSdk = state["features/videotranslatorai"].microsoftRecognizerSDK;

//         if (!recognizerSdk) {
//             console.error("SDK recognizer not set");
//             reject(new Error("SDK recognizer not set"));

//             return;
//         }

//         try {
//             // Stop continuous recognition
//             recognizerSdk.stopContinuousRecognitionAsync(
//                 () => {
//                     console.log("Continuous recognition stopped.");
//                     recording = false;
//                     resolve();
//                 },
//                 (err: any) => {
//                     console.error("Error stopping continuous recognition:", err);
//                     reject(err);
//                 }
//             );
//         } catch (err: any) {
//             console.error("Error during stop process:", err);
//             reject(err);
//         }
//     });
