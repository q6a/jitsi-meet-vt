import axios from "axios";

/**
 * Fetches an authentication token from Azure Cognitive Services.
 *
 * @param {string} subscriptionKey - The subscription key for Azure Cognitive Services.
 * @param {string} region - The region where your Azure services are hosted.
 * @returns {Promise<string>} - A promise that resolves to the authentication token.
 */
export const getAuthToken = async () => {
    const authTokenUrl: string | undefined = process.env.REACT_APP_AUTH_TOKEN_URL_MICROSOFT_SDK;
    const subscriptionKey: string | undefined = process.env.REACT_APP_SUBSCRIPTION_KEY_MICROSOFT_SDK;

    // Check if the environment variables are defined
    if (!authTokenUrl || !subscriptionKey) {
        throw new Error('Environment variables must be set for getAuthToken().');
    }

    const headers = {
        headers: {
            "Ocp-Apim-Subscription-Key": subscriptionKey,
            "Content-Type": "application/x-www-form-urlencoded",
        },
    };

    try {
        const tokenResponse = await axios.post(authTokenUrl, null, headers);

        return tokenResponse.data;
    } catch (error: any) {
        console.error("Error fetching the authentication token:", error);
        throw new Error("Could not fetch the authentication token.");
    }
};
