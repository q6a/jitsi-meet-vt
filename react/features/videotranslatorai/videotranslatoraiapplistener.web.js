(function () {
    console.log('SCRIPT LOADED');

    function onCustomIq(iq) {
        console.log("Received IQ:", iq);
        const query = iq.querySelector('query[xmlns="custom:data"]');
        console.log("Query", query);
        console.log("Query Selector Meeting Name",query.querySelector("meetingName"))
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
        console.log("addevent iq handler1 - videotranslatorai")

        const room = APP.conference._room;
        if (room && room.xmpp && room.xmpp.connection) {
            console.log("addevent iq handler2 - videotranslatorai")

            room.xmpp.connection.addHandler(onCustomIq, "custom:data", "iq", "set", null, null);
        } else {
            // Retry if the connection is not yet available
            console.log("addevent iq handler3 - videotranslatorai")
            setTimeout(addIqHandler, 1000);
        }
    }

    // Ensure APP is initialized and ready before running your code
    if (typeof APP !== 'undefined' && APP.conference) {
        console.log("addevent listener1 - videotranslatorai")

        APP.conference.addListener(APP.conference.events.CONFERENCE_JOINED, addIqHandler);
    } else {
        document.addEventListener('APP_READY', function () {
            console.log("addevent listener2 - videotranslatorai")

            APP.conference.addListener(APP.conference.events.CONFERENCE_JOINED, addIqHandler);
        });
    }
})();
