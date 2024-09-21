// customIqHandler.ts

import { IStore } from "../app/types"; // Import your Redux store type
import { fetchMeetingData, setRoomParams } from "./action.web"; // Adjust the path as needed

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

        console.log("Extracted Meeting Name:", meetingName);
        console.log("Extracted Participant Name:", participantName);
        console.log("Extracted JWT Token:", jwtToken);

        if (meetingName && participantName) {
            console.log("Dispatching room parameters and meeting data to Redux...");

            // Dispatch the values to the Redux store
            store.dispatch(
                setRoomParams({
                    meetingName,
                    participantName,
                    jwtToken,
                })
            );

            store.dispatch(
                fetchMeetingData({
                    meetingNameQuery: meetingName,
                    token: jwtToken,
                    initialName: participantName,
                })
            );
        }
    } else {
        console.log("No valid custom:data namespace found in the IQ message.");
    }

    // Set the local participant's display name using the extracted participant name
    const conference = APP.conference._room;

    if (conference) {
        console.log("Setting local participant display name:", participantName);
        conference.setDisplayName(participantName);
    } else {
        console.error("Conference object is not available to set the display name.");
    }

    return true; // Continue processing stanzas
}

// Function to add the IQ handler
export function addIqHandler(store: IStore) {
    console.log("Attempting to add IQ handler...");

    const xmpp = APP.conference._room?.xmpp;
    const stropheConn = xmpp?.connection?._stropheConn;

    if (stropheConn) {
        console.log("Strophe connection found:", stropheConn);

        stropheConn.addHandler((stanza) => onCustomIq(stanza, store), "custom:data", "iq", "set", null, null);

        //This code below can be used to track the XMPP
        //communication between the client and the server.
        //We are to leave this commented as a form of documentation

        // stropheConn.rawInput = function (data: any) {
        //     console.log("Strophe IN (incoming XMPP data): ", data);
        // };

        // stropheConn.rawOutput = function (data: any) {
        //     console.log("Strophe OUT (outgoing XMPP data): ", data);
        // };

        console.log("Custom IQ handler added successfully.");
    } else {
        console.error("Strophe connection not ready. Retrying...");
        setTimeout(() => addIqHandler(store), 1000);
    }
}
