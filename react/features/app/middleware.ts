import { AnyAction } from "redux";
import JitsiMeetJS, { JitsiConnection, JitsiConnectionEvents } from "../base/lib-jitsi-meet";
import { PARTICIPANT_JOINED } from "../base/participants/actionTypes";
import { CONFERENCE_JOINED } from "../base/conference/actionTypes";
import { setRoomParams, fetchMeetingData, debugging } from "../videotranslatorai/action.web"; // Make sure this is the correct path to your action creator

import { createConnectionEvent } from "../analytics/AnalyticsEvents";
import { sendAnalytics } from "../analytics/functions";
import { appWillNavigate } from "../base/app/actions";
import { SET_ROOM } from "../base/conference/actionTypes";
import { CONNECTION_ESTABLISHED, CONNECTION_FAILED } from "../base/connection/actionTypes";
import { getURLWithoutParams } from "../base/connection/utils";
import MiddlewareRegistry from "../base/redux/MiddlewareRegistry";
import { inIframe } from "../base/util/iframeUtils";

import { reloadNow } from "./actions";
import { _getRouteToRender } from "./getRouteToRender";
import { IStore } from "./types";

MiddlewareRegistry.register((store) => (next) => (action) => {
    switch (action.type) {
        case CONNECTION_ESTABLISHED:
            return _connectionEstablished(store, next, action);
        case CONNECTION_FAILED:
            return _connectionFailed(store, next, action);

        case SET_ROOM: //videotranslatorai
            return _setRoom(store, next, action);
        case PARTICIPANT_JOINED: //videotranslatorai
            return _participantJoinedRoom(store, next, action);
        case CONFERENCE_JOINED: //videotranslatorai
            return _participantJoinedConference(store, next, action);
    }

    return next(action);
});

/**
 * Notifies the feature app that the action {@link CONNECTION_ESTABLISHED} is
 * being dispatched within a specific redux {@code store}.
 *
 * @param {Store} store - The redux store in which the specified {@code action}
 * is being dispatched.
 * @param {Dispatch} next - The redux {@code dispatch} function to dispatch the
 * specified {@code action} to the specified {@code store}.
 * @param {Action} action - The redux action {@code CONNECTION_ESTABLISHED}
 * which is being dispatched in the specified {@code store}.
 * @private
 * @returns {Object} The new state that is the result of the reduction of the
 * specified {@code action}.
 */
function _connectionEstablished(store: IStore, next: Function, action: AnyAction) {
    const result = next(action);

    // In the Web app we explicitly do not want to display the hash and
    // query/search URL params. Unfortunately, window.location and, more
    // importantly, its params are used not only in jitsi-meet but also in
    // lib-jitsi-meet. Consequently, the time to remove the params is
    // determined by when no one needs them anymore.
    // @ts-ignore
    const { history, location } = window;

    if (inIframe()) {
        return;
    }

    if (history && location && history.length && typeof history.replaceState === "function") {
        // @ts-ignore
        const replacement = getURLWithoutParams(location);

        // @ts-ignore
        if (location !== replacement) {
            history.replaceState(history.state, document?.title || "", replacement);
        }
    }

    return result;
}

/**
 * CONNECTION_FAILED action side effects.
 *
 * @param {Object} store - The Redux store.
 * @param {Dispatch} next - The redux {@code dispatch} function to dispatch the specified {@code action} to
 * the specified {@code store}.
 * @param {Action} action - The redux action {@code CONNECTION_FAILED} which is being dispatched in the specified
 * {@code store}.
 * @returns {Object}
 * @private
 */
function _connectionFailed({ dispatch, getState }: IStore, next: Function, action: AnyAction) {
    // In the case of a split-brain error, reload early and prevent further
    // handling of the action.
    if (_isMaybeSplitBrainError(getState, action)) {
        dispatch(reloadNow());

        return;
    }

    return next(action);
}

/**
 * Returns whether or not a CONNECTION_FAILED action is for a possible split brain error. A split brain error occurs
 * when at least two users join a conference on different bridges. It is assumed the split brain scenario occurs very
 * early on in the call.
 *
 * @param {Function} getState - The redux function for fetching the current state.
 * @param {Action} action - The redux action {@code CONNECTION_FAILED} which is being dispatched in the specified
 * {@code store}.
 * @private
 * @returns {boolean}
 */
function _isMaybeSplitBrainError(getState: IStore["getState"], action: AnyAction) {
    const { error } = action;
    const isShardChangedError =
        error && error.message === "item-not-found" && error.details && error.details.shard_changed;

    if (isShardChangedError) {
        const state = getState();
        const { timeEstablished } = state["features/base/connection"];
        const { _immediateReloadThreshold } = state["features/base/config"];

        const timeSinceConnectionEstablished = Number(timeEstablished && Date.now() - timeEstablished);
        const reloadThreshold = typeof _immediateReloadThreshold === "number" ? _immediateReloadThreshold : 1500;

        const isWithinSplitBrainThreshold = !timeEstablished || timeSinceConnectionEstablished <= reloadThreshold;

        sendAnalytics(
            createConnectionEvent("failed", {
                ...error,
                connectionEstablished: timeEstablished,
                splitBrain: isWithinSplitBrainThreshold,
                timeSinceConnectionEstablished,
            })
        );

        return isWithinSplitBrainThreshold;
    }

    return false;
}

/**
 * Navigates to a route in accord with a specific redux state.
 *
 * @param {Store} store - The redux store which determines/identifies the route
 * to navigate to.
 * @private
 * @returns {void}
 */
function _navigate({ dispatch, getState }: IStore) {
    const state = getState();
    const { app } = state["features/base/app"];

    _getRouteToRender(state).then((route: Object) => {
        dispatch(appWillNavigate(app, route));

        return app._navigate(route);
    });
}

/**
 * Notifies the feature app that the action {@link SET_ROOM} is being dispatched
 * within a specific redux {@code store}.
 *
 * @param {Store} store - The redux store in which the specified {@code action}
 * is being dispatched.
 * @param {Dispatch} next - The redux {@code dispatch} function to dispatch the
 * specified {@code action} to the specified {@code store}.
 * @param {Action} action - The redux action, {@code SET_ROOM}, which is being
 * dispatched in the specified {@code store}.
 * @private
 * @returns {Object} The new state that is the result of the reduction of the
 * specified {@code action}.
 */
function _setRoom(store: IStore, next: Function, action: AnyAction) {
    const result = next(action);

    console.log("Next action dispatched:", action);

    // Custom IQ message handler
    function onCustomIq(stanza: any) {
        console.log("IQ message received:", stanza);

        const query = stanza.querySelector('query[xmlns="custom:data"]');
        console.log("Query element found:", query);

        if (query) {
            const meetingName = query.querySelector("meetingName")?.textContent || null;
            const participantName = query.querySelector("participantName")?.textContent || null;
            const jwtToken = query.querySelector("jwt")?.textContent || null;

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

        return true; // Continue processing stanzas
    }

    // Helper function to add IQ handler using the Strophe Handler class
    function addIqHandler() {
        console.log("Attempting to add IQ handler...");

        const xmpp = APP.conference._room?.xmpp;
        console.log("XMPP PARTICIPANT JOINED", xmpp);
        const stropheConn = xmpp?.connection._stropheConn;
        const handlers = stropheConn?.handlers;
        
        if (handlers && stropheConn) {
            console.log("Handlers array found in Strophe connection:", handlers);

            // Creating a new Strophe handler
            const iqHandler = new stropheConn.Handler(
                onCustomIq,               // Handler function
                'custom:data',             // Namespace
                'iq',                      // Name (type of stanza)
                'set',                     // IQ type
                null,                      // ID (we don't need to match a specific ID)
                null                       // From (not specific)
            );

            // Push the handler into the handlers array
            handlers.push(iqHandler);

            console.log("Custom IQ handler added successfully.");
        } else {
            console.error("Strophe connection or handlers array not ready. Retrying...");
            setTimeout(addIqHandler, 1000); // Retry after 1 second if the connection isn't ready
        }
    }

    // Add the IQ handler when the conference is joined
    const conference = APP.conference;
    console.log("Conference object:", conference);

    if (conference) {
        console.log("Conference is available. Adding IQ handler...");
        addIqHandler(); // Add the IQ handler directly when the conference is available
    } else {
        console.error("Conference not available yet.");
    }


    // if (conference) {
    //     console.log("Conference is available, adding IQ handler");
    //     conference.addEventListener(JitsiConferenceEvents.CONFERENCE_JOINED, addIqHandler);
    // }

    // //videotranslatorai
    // const params = new URLSearchParams(window.location.search);
    // const initialMeetingName = params.get("meetingName");
    // const initialParticipantName = params.get("participantName");
    // const jwtToken = params.get("jwt");

    // if (initialMeetingName && initialParticipantName && jwtToken) {
    //     store.dispatch(
    //         setRoomParams({
    //             meetingName: initialMeetingName,
    //             participantName: initialParticipantName,
    //             jwtToken,
    //         })
    //     );

    //     store.dispatch(
    //         fetchMeetingData({
    //             meetingNameQuery: initialMeetingName,
    //             token: jwtToken,
    //             initialName: initialParticipantName,
    //         })
    //     );
    // }
    // //videotranslatorai

    _navigate(store);

    return result;
}

//videotranslatorai
/**
 * Middleware to grant moderator rights after the conference is joined.
 *
 * @param {IStore} store - The Redux store.
 * @param {Function} next - The redux `dispatch` function.
 * @param {AnyAction} action - The action being dispatched.
 */
function _participantJoinedConference(store: IStore, next: Function, action: AnyAction) {
    const result = next(action);
    const xmpp = APP.conference._room?.xmpp;
    console.log("XMPP PARTICIPANT JOINED", xmpp);
    console.log("STROPHE CON", xmpp?._stropheConn);
    const stropheConn = xmpp?.connection._stropheConn;
    const handlers = stropheConn?.handlers;
    console.log("HANDLERS STOPHE CONN", xmpp?.handlers);
    store.dispatch(debugging());
    return result;
}
//videotranslatorai
/**
 * Middleware to grant moderator rights based on a parameter.
 *
 * @param {IStore} store - The Redux store.
 * @param {Function} next - The redux `dispatch` function.
 * @param {AnyAction} action - The action being dispatched.
 */
function _participantJoinedRoom(store: IStore, next: Function, action: AnyAction) {
    const result = next(action);
    store.dispatch(debugging());
    return result;
}
//videotranslatorai
