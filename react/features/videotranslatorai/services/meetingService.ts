import axios from "axios";

import { ILinguistMeeting, IModeratorMeeting, IParticipantMeeting } from "../types";

export const getMeetingInformation = async (meetingId: string, token: string, initialName: string) => {
    try {
        // Load the backend URL from environment variables
        const backendUrl = process.env.REACT_APP_GET_MEETING_NAME_BACKEND_API_URL;

        if (!backendUrl) {
            throw new Error("Backend API URL is not set in environment variables.");
        }

        const response = await axios.get(`${backendUrl}/${encodeURIComponent(meetingId)}`, {
            headers: {
                authorization: `Bearer ${token}`,
                "x-jitsi": "true",
            },
        });

        if (response.data) {
            const data = response.data.data;
            const participants = data.participant_meetings.map((pm: IParticipantMeeting) => {
                return {
                    participant_id: pm.participant.participant_id,
                    name: pm.participant.name,
                    email: pm.participant.email,
                    dialects: pm.participant.dialects,
                    type: "PARTICIPANT",
                };
            });

            const moderators = data.moderator_meetings.map((mm: IModeratorMeeting) => {
                return {
                    moderator_id: mm.moderator.user_id,
                    name: mm.moderator.name,
                    email: mm.moderator.email,
                    dialects: mm.moderator.dialects,
                    type: "MODERATOR",
                };
            });

            const linguists = data.linguist_meetings.map((lm: ILinguistMeeting) => {
                return {
                    linguist_id: lm.linguist.linguist_id,
                    name: lm.linguist.name,
                    email: lm.linguist.email,
                    type: "LINGUIST",
                };
            });

            const combinedModeratorAndParticipants = [...moderators, ...participants];
            const allCombinedDataOfDifferentEntityTypes = [...moderators, ...linguists, ...participants];
            const thisEntityInstanceData = allCombinedDataOfDifferentEntityTypes.find(
                (item) => item.name === initialName
            );

            return {
                meetingData: {
                    name: data.name,
                    client: data.client,
                    dictionaryName: data.dictionary_name,
                    dictionaryLanguages: data.dictionary_languages,
                    dictionaryWordKeyPairs: data.dictionary_word_key_pairs,
                },
                thisEntityData: thisEntityInstanceData,
                moderatorData: moderators,
                linguistData: linguists,
                participantData: participants,
            };
        }
    } catch (error: any) {
        console.error("Error while fetching meeting information:", error);
        throw error;
    }
};
