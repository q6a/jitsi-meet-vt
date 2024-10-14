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

            console.log("DATA in meeting service", data);

            const participants = data.participant_meetings.map((pm: IParticipantMeeting) => {
                return {
                    participantId: pm.participant.participant_id,
                    name: pm.participant.name,
                    email: pm.participant.email,
                    transcriptionDialect: pm.participant.transcription_dialect
                        ? {
                              name: pm.participant.transcription_dialect.name,
                              dialectCode: pm.participant.transcription_dialect.dialect_code,
                              dialectId: pm.participant.transcription_dialect.dialect_id,
                              language: {
                                  name: pm.participant.transcription_dialect.language.name,
                                  languageId: pm.participant.transcription_dialect.language.language_id,
                              },
                          }
                        : null,
                    translationDialect: {
                        name: pm.participant.translation_dialect.name,
                        dialectCode: pm.participant.translation_dialect.dialect_code,
                        dialectId: pm.participant.translation_dialect.dialect_id,
                        language: {
                            name: pm.participant.translation_dialect.language.name,
                            languageId: pm.participant.translation_dialect.language.language_id,
                        },
                    },

                    type: "PARTICIPANT",
                };
            });

            const moderators = data.moderator_meetings.map((mm: IModeratorMeeting) => {
                return {
                    moderatorId: mm.moderator.user_id,
                    name: mm.moderator.name,
                    email: mm.moderator.email,
                    transcriptionDialect: {
                        name: mm.transcription_dialect.name,
                        dialectCode: mm.transcription_dialect.dialect_code,
                        dialectId: mm.transcription_dialect.dialect_id,
                        language: {
                            name: mm.transcription_dialect.language.name,
                            languageId: mm.transcription_dialect.language.language_id,
                        },
                    },
                    translationDialect: {
                        name: mm.translation_dialect.name,
                        dialectCode: mm.translation_dialect.dialect_code,
                        dialectId: mm.translation_dialect.dialect_id,
                        language: {
                            name: mm.translation_dialect.language.name,
                            languageId: mm.translation_dialect.language.language_id,
                        },
                    },
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
