// videotranslatorai/videotranslatorai.js

(function () {
    function onCustomIq(iq) {
        const query = iq.querySelector('query[xmlns="custom:data"]');
        if (query) {
            const meetingNameElement = query.querySelector("meetingName");
            const participantNameElement = query.querySelector("participantName");

            const meetingName = meetingNameElement ? meetingNameElement.textContent : null;
            const participantName = participantNameElement ? participantNameElement.textContent : null;

            // Use the extracted values as needed
            console.log("Meeting Name:", meetingName);
            console.log("Participant Name:", participantName);

            // Store the values globally or in your application's state
            if (meetingName) {
                window.meetingName = meetingName;
            }
            if (participantName) {
                window.participantName = participantName;
            }

            // Return true to indicate that the IQ was handled
            return true;
        }
        return false; // Continue processing if not handled
    }

    function addIqHandler() {
        const room = APP.conference._room;
        if (room && room.xmpp && room.xmpp.connection) {
            room.xmpp.connection.addHandler(onCustomIq, "custom:data", "iq", "set", null, null);
        } else {
            // Retry if the connection is not yet available
            setTimeout(addIqHandler, 1000);
        }
    }

    // Start listening when the conference is joined
    if (APP && APP.conference) {
        APP.conference.addListener(APP.conference.events.CONFERENCE_JOINED, addIqHandler);
    } else {
        // Retry if APP.conference is not yet available
        setTimeout(() => {
            if (APP && APP.conference) {
                APP.conference.addListener(APP.conference.events.CONFERENCE_JOINED, addIqHandler);
            }
        }, 1000);
    }
})();
