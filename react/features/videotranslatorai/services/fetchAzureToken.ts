import axios from "axios";

// Export as default with token and region as parameters
export default async function fetchAzureToken(region: string, token: string): Promise<string> {
    try {
        const endpoint = process.env.REACT_APP_AZURE_TTS_TOKEN_ENDPOINT;

        if (!endpoint) {
            throw new Error("Azure token endpoint is not set in the environment variables.");
        }

        const response = await axios.post(
            endpoint,
            { region },
            {
                headers: {
                    Authorization: `Bearer ${token}`, // Use the provided token
                    "Content-Type": "application/json",
                },
            }
        );

        return response.data.data.token;
    } catch (error) {
        console.error("Error fetching Azure token:", error);
        throw new Error("Could not retrieve Azure token.");
    }
}
