import { AnyAction } from "redux";
import JitsiMeetJS, { JitsiConnection, JitsiConnectionEvents } from "../base/lib-jitsi-meet";
import { PARTICIPANT_JOINED } from "../base/participants/actionTypes";
import { CONFERENCE_JOINED } from "../base/conference/actionTypes";
import { setRoomParams, fetchMeetingData, debugging } from "../videotranslatorai/action.web"; // Make sure this is the correct path to your action creator
import { addIqHandler } from "../videotranslatorai/videotranslatoraiapplistener"; // Adjust the path accordingly

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

    // function onCustomIq(stanza: any) {
    //     console.log("IQ message received:", stanza);

    //     const query = stanza.getElementsByTagName('query')[0];
    //     if (query && query.getAttribute('xmlns') === 'custom:data') {
    //         const meetingNameElement = query.getElementsByTagName('meetingName')[0];
    //         const participantNameElement = query.getElementsByTagName('participantName')[0];
    //         const jwtTokenElement = query.getElementsByTagName('jwt')[0];

    //         const meetingName = meetingNameElement ? meetingNameElement.textContent : null;
    //         const participantName = participantNameElement ? participantNameElement.textContent : null;
    //         const jwtToken = jwtTokenElement ? jwtTokenElement.textContent : null;

    //         console.log("Extracted Meeting Name:", meetingName);
    //         console.log("Extracted Participant Name:", participantName);
    //         console.log("Extracted JWT Token:", jwtToken);

    //         if (meetingName && participantName) {
    //             console.log("Dispatching room parameters and meeting data to Redux...");

    //             // Dispatch the values to the Redux store
    //             store.dispatch(
    //                 setRoomParams({
    //                     meetingName,
    //                     participantName,
    //                     jwtToken,
    //                 })
    //             );

    //             store.dispatch(
    //                 fetchMeetingData({
    //                     meetingNameQuery: meetingName,
    //                     token: jwtToken,
    //                     initialName: participantName,
    //                 })
    //             );
    //         }
    //     } else {
    //         console.log("No valid custom:data namespace found in the IQ message.");
    //     }

    //     return true; // Continue processing stanzas
    // }

    // function addIqHandler() {
    //     console.log("Attempting to add IQ handler...");

    //     const xmpp = APP.conference._room?.xmpp;
    //     const stropheConn = xmpp?.connection?._stropheConn;

    //     if (stropheConn) {
    //         console.log("Strophe connection found:", stropheConn);

    //         stropheConn.addHandler(
    //             onCustomIq,
    //             'custom:data',
    //             'iq',
    //             'set',
    //             null,
    //             null
    //         );

    //         stropheConn.rawInput = function (data: any) {
    //             console.log('Strophe IN (incoming XMPP data): ', data);
    //         };

    //         // Log all raw XMPP output (outgoing data)
    //         stropheConn.rawOutput = function (data: any) {
    //             console.log('Strophe OUT (outgoing XMPP data): ', data);
    //         };

    //         console.log("Custom IQ handler added successfully.");
    //     } else {
    //         console.error("Strophe connection not ready. Retrying...");
    //         setTimeout(addIqHandler, 1000);
    //     }
    // }

    // const conference = APP.conference;
    // if (conference) {
    //     console.log("Conference is available. Adding IQ handler...");
    //     addIqHandler();
    // } else {
    //     console.error("Conference not available yet.");
    // }

    const conference = APP.conference;
    if (conference) {
        console.log("Conference is available. Adding IQ handler...");
        addIqHandler(store); // Call the function to add the IQ handler
    } else {
        console.error("Conference not available yet.");
    }

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
