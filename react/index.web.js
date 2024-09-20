import React from 'react';
import ReactDOM from 'react-dom';

import { App } from './features/app/components/App.web';
import { getLogger } from './features/base/logging/functions';
import Platform from './features/base/react/Platform.web';
import { getJitsiMeetGlobalNS } from './features/base/util/helpers';
import DialInSummaryApp from './features/invite/components/dial-in-summary/web/DialInSummaryApp';
import PrejoinApp from './features/prejoin/components/web/PrejoinApp';
import WhiteboardApp from './features/whiteboard/components/web/WhiteboardApp';
//import './features/videotranslatorai/videotranslatoraiapplistener.web';



const logger = getLogger('index.web');

// Add global loggers.
window.addEventListener('error', ev => {
    logger.error(
        `UnhandledError: ${ev.message}`,
        `Script: ${ev.filename}`,
        `Line: ${ev.lineno}`,
        `Column: ${ev.colno}`,
        'StackTrace: ', ev.error?.stack);
});

window.addEventListener('unhandledrejection', ev => {
    logger.error(
        `UnhandledPromiseRejection: ${ev.reason}`,
        'StackTrace: ', ev.reason?.stack);
});

// Workaround for the issue when returning to a page with the back button and
// the page is loaded from the 'back-forward' cache on iOS which causes nothing
// to be rendered.
if (Platform.OS === 'ios') {
    window.addEventListener('pageshow', event => {
        // Detect pages loaded from the 'back-forward' cache
        // (https://webkit.org/blog/516/webkit-page-cache-ii-the-unload-event/)
        if (event.persisted) {
            // Maybe there is a more graceful approach but in the moment of
            // writing nothing else resolves the issue. I tried to execute our
            // DOMContentLoaded handler but it seems that the 'onpageshow' event
            // is triggered only when 'window.location.reload()' code exists.
            window.location.reload();
        }
    });
}

const globalNS = getJitsiMeetGlobalNS();

// Used for automated performance tests.
globalNS.connectionTimes = {
    'index.loaded': window.indexLoadedTime
};

window.addEventListener('load', () => {
    globalNS.connectionTimes['window.loaded'] = window.loadedEventTime;
});

document.addEventListener('DOMContentLoaded', () => {
    const now = window.performance.now();

    globalNS.connectionTimes['document.ready'] = now;
    logger.log('(TIME) document ready:\t', now);
});

globalNS.entryPoints = {
    APP: App,
    PREJOIN: PrejoinApp,
    DIALIN: DialInSummaryApp,
    WHITEBOARD: WhiteboardApp
};

globalNS.renderEntryPoint = ({
    Component,
    props = {},
    elementId = 'react'
}) => {
    ReactDOM.render(
        <Component { ...props } />,
        document.getElementById(elementId)
    );
};



(function () {
    console.log("SCRIPT INITIATED")
    function onCustomIq(iq) {
        console.log("Received IQ:", iq);
        const query = iq.querySelector('query[xmlns="custom:data"]');
        
        console.log("Query", query);
        console.log("Query Selector Meeting Name", query ? query.querySelector("meetingName") : "No query");

        if (query) {
            const meetingNameElement = query.querySelector("meetingName");
            const participantNameElement = query.querySelector("participantName");

            const meetingName = meetingNameElement ? meetingNameElement.textContent : null;
            const participantName = participantNameElement ? participantNameElement.textContent : null;

            console.log("Meeting Name:", meetingName);
            console.log("Participant Name:", participantName);

            if (meetingName) {
                window.meetingName = meetingName;
            }
            if (participantName) {
                window.participantName = participantName;
            }

            return true;
        }
        return false;
    }

    function addIqHandler() {
        console.log("Adding IQ handler");

        const room = APP.conference._room;
        if (room && room.xmpp && room.xmpp.connection) {
            console.log("Adding handler for IQ messages");

            room.xmpp.connection.addHandler(onCustomIq, "custom:data", "iq", "set", null, null);
        } else {
            console.log("Retrying handler setup - room or connection not ready yet");
            setTimeout(addIqHandler, 1000); // Retry if connection is not yet available
        }
    }

    if (typeof APP !== 'undefined' && APP.conference) {
        console.log("APP is available, adding conference joined listener");

        APP.conference.addListener(APP.conference.events.CONFERENCE_JOINED, addIqHandler);
    } else {
        console.log("APP not yet available, waiting for APP_READY event");

        document.addEventListener('APP_READY', function () {
            console.log("APP_READY event triggered, adding conference joined listener");
            APP.conference.addListener(APP.conference.events.CONFERENCE_JOINED, addIqHandler);
        });
    }
})();