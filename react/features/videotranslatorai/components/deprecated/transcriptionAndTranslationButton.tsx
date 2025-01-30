// import React, { FC, useEffect } from "react";
// import { useDispatch, useSelector } from "react-redux";

// import { IReduxState } from "../../../app/types";
// import { startTranscription, stopTranscription } from "../../action.web";

// const TranscriptionAndTranslationButton: FC = () => {
//     const dispatch = useDispatch();

//     const isTranscribing = useSelector((state: IReduxState) => state["features/videotranslatorai"].isTranscribing);
//     const isAudioMuted = useSelector((state: IReduxState) => state["features/base/media"].audio.muted);

//     const handleStartTranscription = () => {
//         if (!isAudioMuted) {
//             dispatch(startTranscription());
//         }
//     };

//     const handleStopTranscription = () => {
//         dispatch(stopTranscription());
//     };

//     useEffect(() => {
//         // This will run only once when the component mounts
//         if (isTranscribing) {
//             dispatch(stopTranscription());
//         }
//     }, []);

//     useEffect(() => {
//         if (isAudioMuted) {
//             dispatch(stopTranscription());
//         }
//     }, [isAudioMuted]);

//     return (
//         <div
//             className="toolbox-icon"
//             onClick={isTranscribing ? handleStopTranscription : handleStartTranscription}
//             style={{ backgroundColor: isTranscribing ? "green" : "transparent" }}
//         >
//             <div className="jitsi-icon jitsi-icon-default">
//                 <div>
//                     {isTranscribing ? (
//                         <svg
//                             fill="#ffffff"
//                             height={20}
//                             version="1.1"
//                             viewBox="0 0 32 32"
//                             width={20}
//                             xmlns="http://www.w3.org/2000/svg"
//                         >
//                             <g>
//                                 <circle cx="16" cy="16" fill="#ffffff" r="4" />
//                                 <path d="M16,2C8.3,2,2,8.3,2,16s6.3,14,14,14s14-6.3,14-14S23.7,2,16,2z M16,22c-3.3,0-6-2.7-6-6s2.7-6,6-6s6,2.7,6,6S19.3,22,16,22z" />
//                             </g>
//                         </svg>
//                     ) : (
//                         <svg
//                             fill="#ffffff"
//                             height={20}
//                             version="1.1"
//                             viewBox="0 0 32 32"
//                             width={20}
//                             xmlns="http://www.w3.org/2000/svg"
//                         >
//                             <g>
//                                 <circle cx="16" cy="16" r="4" />
//                                 <path d="M16,2C8.3,2,2,8.3,2,16s6.3,14,14,14s14-6.3,14-14S23.7,2,16,2z M16,22c-3.3,0-6-2.7-6-6s2.7-6,6-6s6,2.7,6,6S19.3,22,16,22z" />
//                             </g>
//                         </svg>
//                     )}
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default TranscriptionAndTranslationButton;
