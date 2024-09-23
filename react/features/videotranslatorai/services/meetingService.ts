import axios from 'axios';


import {
  IParticipantMeeting,
  IModeratorMeeting,
  ILinguistMeeting

} from '../types';



export const getMeetingInformation = async (meetingId: string, token: string, initialName: string) => {
    try {

        // Load the backend URL from environment variables
        const backendUrl = process.env.REACT_APP_GET_MEETING_NAME_BACKEND_API_URL;

        if (!backendUrl) {
            throw new Error('Backend API URL is not set in environment variables.');
        }

        const response = await axios.get(
            `${backendUrl}${encodeURIComponent(meetingId)}`,
            {
                headers: {
                    authorization: `Bearer ${token}`,
                },
            }
        );

        if (response.data) {
            const data = response.data.data;

            const participants = data.participant_meetings.map((pm: IParticipantMeeting) => ({
                participant_id: pm.participant.participant_id,
                name: pm.participant.name,
                email: pm.participant.email,
                dialect_id: pm.participant.dialect.dialect_id,
                dialectName: pm.participant.dialect.name,
                dialectCode: pm.participant.dialect.dialect_code,
                languageName: pm.participant.dialect.language.name,
                type: "PARTICIPANT"
            }));

            const moderators = data.moderator_meetings.map((mm: IModeratorMeeting) => ({
                moderator_id: mm.moderator.moderator_id,
                name: mm.moderator.name,
                email: mm.moderator.email,
                dialect_id: mm.dialect.dialect_id,
                dialectName: mm.dialect.name,
                dialectCode: mm.dialect.dialect_code,
                languageName: mm.dialect.language.name,
                type: "MODERATOR"
            }));

            const linguists = data.linguist_meetings.map((lm:ILinguistMeeting) => ({
                linguist_id: lm.linguist.linguist_id,
                name: lm.linguist.name,
                email: lm.linguist.email,
                type: "LINGUIST"
            }));

            const combinedModeratorAndParticipants = [...moderators, ...participants];
            const allCombinedDataOfDifferentEntityTypes = [...moderators, ...linguists, ...participants];
            const thisEntityInstanceData = allCombinedDataOfDifferentEntityTypes.find(item => item.name === initialName);

            return {
                meetingData: {
                    user_created_id: data.user_created.user_created_id,
                    meeting_id: data.meeting_id,
                    name: data.name,
                    userCreated: data.user_created,
                    client: data.client,
                    userLinguist: data.user_linguist,
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
        console.error('Error while fetching meeting information:', error);
        throw error;
    }
};
