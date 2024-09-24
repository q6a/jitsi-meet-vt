// customIqHandler.ts

import { IStore } from "../app/types"; // Import your Redux store type
import { CONFERENCE_JOINED } from '../base/conference/actionTypes'; // Adjust path if necessary
import { fetchMeetingData, setRoomParams } from "./action.web"; // Adjust the path as needed


/***
 * BELOW IS AN XMPP LISTENER SNIPPET WHICH DOES THREE THINGS
 * 
 * 1. SCANS ALL INCOMING XMPP PROTOCOL MESSAGES (IQ, MESSAGE, PRESENCE)
 * 2. SCANS ALL OUTGOING XMPP PROTOCOL MESSAGES (IQ, MESSAGE, PRESENCE)
 * 3. ADDS A HANDLER TO THE XMPP CONNECTION TO DEAL WITH A XMPP PROTOCOL MESSAGE WITHIN A NAMESPACE
 * THE XMPP HANDLER ALLOWS FOR SCANNING OF A PARTICULAR MESSAGE IF SENT BY THE SERVER
 * 
 * THIS WAS DONE BY RETRIEVING THE STROPHE OBJECT CONNECTION, WHICH PROVIDES SERVICES
 * TO CONNECT TO THE XMPP PROSODY SERVER. THE STROPHE OBJECT CONNECTION IS PART OF THE
 * "APP" GLOBAL OBJECT.
 * 
 * ORIGINALLY THIS CODE WAS INTENDED TO RETRIEVE INFORMATION FROM THE XMPP MESSAGE
 * SENT BY THE SERVER IN RELATION TO PARTICIPANT NAME AND MEETING NAME. 
 * 
 * TO MAKE USE OF THE THE CODE, YOU MUST CHECK IF APP.conference IS RETURNING THE OBJECT.
 * THE COMMENTED OUT CODE AT THE TOP OF THIS FUNCTION WAS PLACED IN THE MIDDLEWARE.ts FILE
 * FEATURES/APP/MIDDLEWARE.ts IN THE PARTICIPANT JOINED FUNCTION.
 * 
 * 
 */

    // const conference = APP.conference;
    // if (conference) {
    //     console.log("Conference is available. Adding IQ handler...");
    //     addIqHandler(store); // Call the function to add the IQ handler
    // } else {
    //     console.error("Conference not available yet.");
    // }


// Custom IQ message handler function
export function onCustomIq(stanza: any, store: IStore) {
    console.log("IQ message received:", stanza);

    const query = stanza.getElementsByTagName("query")[0];
    if (query && query.getAttribute("xmlns") === "custom:data") {
        const meetingNameElement = query.getElementsByTagName("meetingName")[0];
        const participantNameElement = query.getElementsByTagName("participantName")[0];
        const jwtTokenElement = query.getElementsByTagName("jwt")[0];

        const meetingName = meetingNameElement ? meetingNameElement.textContent : null;
        const participantName = participantNameElement ? participantNameElement.textContent : null;
        const jwtToken = jwtTokenElement ? jwtTokenElement.textContent : null;
        const meetingId = '';
        const languageName  = '';
        const clientId = '';
        console.log("Extracted Meeting Name:", meetingName);
        console.log("Extracted Participant Name:", participantName);
        console.log("Extracted JWT Token:", jwtToken);

        if (meetingName && participantName) {
            console.log("Dispatching room parameters and meeting data to Redux...");

            store.dispatch(setRoomParams({
                meetingName: meetingName,
                participantName: participantName,
                jwtToken,
                meetingId: meetingId,
                languageName: languageName,
                clientId: clientId
            }));
    


            store.dispatch(fetchMeetingData({
                meetingNameQuery: meetingName,
                token: jwtToken,
                initialName: participantName,
                meetingId: meetingId
            }));


            // Wait for the conference to fully initialize before setting the name
            const conference = APP.conference._room;
            console.log("CONFERENCE", conference);
            if (conference) {
                // Listen for the CONFERENCE_JOINED event
                console.log("Local participant before setting name:", conference.getLocalParticipant());
                conference.setDisplayName("Blackjack");
                console.log("Local participant after setting name:", conference.getLocalParticipant());

                conference.on(CONFERENCE_JOINED, () => {
                    console.log("Local participant before setting name:", conference.getLocalParticipant());
                    conference.setDisplayName(participantName);
                    console.log("Local participant after setting name:", conference.getLocalParticipant());
                });
            } else {
                console.error("Conference object is not available to set the display name.");
            }
        }
    } else {
        console.log("No valid custom:data namespace found in the IQ message.");
    }

    return true; // Continue processing stanzas
}
// Function to add the IQ handler
export function addIqHandler(store: IStore) {
    console.log("Attempting to add IQ handler...");

    //get the xmpp information
    const xmpp = APP.conference._room?.xmpp;
    //the stropheConnection is within the object
    const stropheConn = xmpp?.connection?._stropheConn;

    if (stropheConn) {
        console.log("Strophe connection found:", stropheConn);


        //add handler to scan the incoming XMPP messages, of the stanza type iq, and of type set, within a specific name space (custom:data)
        stropheConn.addHandler((stanza: any) => onCustomIq(stanza, store), "custom:data", "iq", "set", null, null);


        //log all xmpp communication stanzas coming from the XMPP prosody server
        stropheConn.rawInput = function (data: any) {
            console.log("Strophe IN (incoming XMPP data): ", data);
        };

        //log all xmpp communication stanzas going to the XMPP prosody server
        stropheConn.rawOutput = function (data: any) {
            console.log("Strophe OUT (outgoing XMPP data): ", data);
        };

        console.log("Custom IQ handler added successfully.");
    } else {
        console.error("Strophe connection not ready. Retrying...");
        setTimeout(() => addIqHandler(store), 1000);
    }
}
