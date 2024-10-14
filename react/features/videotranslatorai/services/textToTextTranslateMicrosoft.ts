import axios from "axios";

/**
 * Translates a given transcription text to the specified target dialect by calling the backend translation API.
 *
 * @param {string} transcriptionText - The text to be translated.
 * @param {string} targetDialectCode - The target dialect code for translation.
 * @param {string} langFrom - The source language code for translation (optional).
 * @param {string} [region='australiaeast'] - The region for the translation service.
 * @param {string} authToken - Authorization token for accessing the backend API.
 * @returns {Promise<string>} - A promise that resolves to the translated text.
 */
async function translateTextMicrosoft(
    transcriptionText: string,
    authToken: string,
    targetDialectCode: string,
    langFrom = "",
    region = "australiaeast"
): Promise<string> {
    try {
        const backendEndpoint = process.env.REACT_APP_TRANSLATE_API_ENDPOINT;

        if (!backendEndpoint) {
            throw new Error("Envrionment variable not set");
        }
        const response = await axios.post(
            backendEndpoint,
            {
                transcriptionText,
                targetDialectCode,

                // langFrom,
                region,
            },
            {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                    "Content-Type": "application/json",
                },
            }
        );

        const translatedText = response.data.data.translatedText;

        return translatedText;
    } catch (error) {
        console.error("Error translating text:", error);
        throw new Error("Failed to translate text");
    }
}

export default translateTextMicrosoft;
