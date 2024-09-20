import React from 'react';

import GlobalStyles from '../../base/ui/components/GlobalStyles.web';
import JitsiThemeProvider from '../../base/ui/components/JitsiThemeProvider.web';
import DialogContainer from '../../base/ui/components/web/DialogContainer';
import ChromeExtensionBanner from '../../chrome-extension-banner/components/ChromeExtensionBanner.web';
import OverlayContainer from '../../overlay/components/web/OverlayContainer';

import { AbstractApp } from './AbstractApp';

// Register middlewares and reducers.
import '../middlewares';
import '../reducers';


/**
 * Root app {@code Component} on Web/React.
 *
 * @augments AbstractApp
 */
export class App extends AbstractApp {


    componentDidMount() {
        super.componentDidMount();

        // Add your custom IQ handler logic here
        function onCustomIq(iq) {
            console.log("Received IQ:", iq);
            const query = iq.querySelector('query[xmlns="custom:data"]');
            console.log("Query", query);
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
            const room = window.APP.conference._room;
            if (room && room.xmpp && room.xmpp.connection) {
                console.log("Adding handler for IQ messages");

                room.xmpp.connection.addHandler(onCustomIq, "custom:data", "iq", "set", null, null);
            } else {
                console.log("Retrying handler setup - room or connection not ready yet");
                setTimeout(addIqHandler, 1000); // Retry if connection is not yet available
            }
        }

        // Ensure APP is available
        if (typeof window.APP !== 'undefined' && window.APP.conference) {
            window.APP.conference.addListener(window.APP.conference.events.CONFERENCE_JOINED, addIqHandler);
        } else {
            console.log("APP not yet available, waiting for APP_READY event");

            document.addEventListener('APP_READY', function () {
                window.APP.conference.addListener(window.APP.conference.events.CONFERENCE_JOINED, addIqHandler);
            });
        }
    }



    /**
     * Creates an extra {@link ReactElement}s to be added (unconditionally)
     * alongside the main element.
     *
     * @abstract
     * @protected
     * @returns {ReactElement}
     */
    _createExtraElement() {
        return (
            <JitsiThemeProvider>
                <OverlayContainer />
            </JitsiThemeProvider>
        );
    }

    /**
     * Overrides the parent method to inject {@link AtlasKitThemeProvider} as
     * the top most component.
     *
     * @override
     */
    _createMainElement(component: React.ComponentType, props?: Object) {
        return (
            <JitsiThemeProvider>
                <GlobalStyles />
                <ChromeExtensionBanner />
                { super._createMainElement(component, props) }
            </JitsiThemeProvider>
        );
    }

    /**
     * Renders the platform specific dialog container.
     *
     * @returns {React$Element}
     */
    _renderDialogContainer() {
        return (
            <JitsiThemeProvider>
                <DialogContainer />
            </JitsiThemeProvider>
        );
    }
}
