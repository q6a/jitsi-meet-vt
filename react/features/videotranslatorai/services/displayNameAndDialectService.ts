// displayNameAndDialectService.ts

export const createDisplayNameAndDialect = (
    nameToDisplay: string,
    moderators: any[],
    participants: any[],
    linguists: any[]
): { displayName: string; displayDialect: string } => {


    const allDataParticipantEntities : any = [...moderators, ...participants, ...linguists];
    let participantEntity: any | null = null;

    if (allDataParticipantEntities.length > 0) {
        for (let i = 0; i < allDataParticipantEntities.length; i++) {
            if (allDataParticipantEntities[i].name === nameToDisplay) {
                participantEntity = allDataParticipantEntities[i];
                break;
            }
        }
    }

    const entityType = participantEntity ? participantEntity.type : 'UNKNOWN';
    const dialectType = participantEntity ? participantEntity.dialectName : 'UNKNOWN';

    let displayName = '';
    if (entityType !== 'UNKNOWN') {
        displayName = `${nameToDisplay}: ${entityType}`;
    }
    else
    {
        displayName = nameToDisplay;
    }

    let displayDialect = '';

    if (entityType !== 'LINGUIST' && entityType !== 'UNKNOWN') {
        displayDialect = dialectType || '';
    }

    return {
        displayName,
        displayDialect
    };
};
