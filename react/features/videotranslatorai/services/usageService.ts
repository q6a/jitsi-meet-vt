import axios from "axios";

export default async function genericUsageIntake(
    text: string,
    type: string,
    provider: string,
    meeting_id: string,
    client_id: string,
    authToken: string,
    sender_id: string,
    elapsed_time: number
): Promise<boolean> {
    try {
        const endpoint = process.env.REACT_APP_GENERIC_USAGE_INTAKE_API_ENDPOINT;

        if (!endpoint) {
            throw new Error("Generic usage endpoint is not set in the environment variables.");
        }

        const response = await axios.post(
            endpoint,
            { text, type, provider, meeting_id, client_id, sender_id, elapsed_time },
            {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                    "Content-Type": "application/json",
                },
            }
        );

        return response.data.success;
    } catch (error) {
        console.error("Error in generic usage intake request:", error);
        throw new Error("Could not process generic usage intake request.");
    }
}
