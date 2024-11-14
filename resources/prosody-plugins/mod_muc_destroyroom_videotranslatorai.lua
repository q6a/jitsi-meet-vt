local json = require "util.json"
local jid_bare = require "util.jid".bare
local util = module:require "util"

-- Check for async support and load async handler wrapper
local have_async = pcall(require, "util.async")
if not have_async then
    module:log("error", "This module requires a version of Prosody with util.async")
    return
end
local async_handler_wrapper = module:require "util".async_handler_wrapper

-- Function to destroy a room by name
local function destroy_room(room_name)
    -- Access the MUC component directly from Prosody's host configuration
    local host_session = prosody.hosts["conference.meet.stg.videotranslator.ai"]
    if host_session and host_session.modules.muc then
        local room = host_session.modules.muc.get_room_from_jid(room_name)
        if room then
            module:log("info", "Destroying room %s", room_name)
            room:set_persistent(false) -- Mark room as non-persistent
            room:destroy(nil, "Room is being destroyed due to zero credits.")
            return true
        else
            module:log("warn", "Room %s not found", room_name)
            return false
        end
    else
        module:log("error", "MUC component not found for %s", room_name)
        return false
    end
end

-- HTTP handler for destroying a room
local function handle_destroy_request(event)
    local request = event.request
    local response = event.response

    if request.method ~= "POST" then
        response.status_code = 405 -- Method Not Allowed
        return "Only POST requests are allowed"
    end

    -- Parse the request body to get roomName
    local body = json.decode(request.body)
    if not body or not body.roomName then
        response.status_code = 400 -- Bad Request
        return "Missing 'roomName' in request body"
    end

    local room_name = jid_bare(body.roomName .. "@conference.meet.stg.videotranslator.ai")
    module:log("info", "Room Cleanup Module, room-name %s", room_name)

    -- Attempt to destroy the room
    if destroy_room(room_name) then
        response.status_code = 200
        return "Room destroyed successfully"
    else
        response.status_code = 404 -- Not Found
        return "Room not found or could not be destroyed"
    end
end

-- Register the HTTP endpoint with async handling
function module.load()
    module:depends("http")
    module:provides("http", {
        default_path = "/",
        route = {
            ["POST destroy-room"] = function(event)
                return async_handler_wrapper(event, handle_destroy_request)
            end
        }
    })
end

module:log("info", "Room Cleanup Module loaded with HTTP endpoint /destroy-room")
