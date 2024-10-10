import axios from "axios";

/**
 * Translates a given transcription text to the specified target dialect.
 *
 * @param {string} transcriptionText - The text to be translated.
 * @param {string} translateApiKey - The API key for the translation service.
 * @param {string} targetDialectCode - The target dialect code for translation.
 * @param {string} [region='australiaeast'] - The region for the translation service.
 * @returns {Promise<string>} - A promise that resolves to the translated text.
 */
async function translateTextMicrosoft(
    transcriptionText,
    translateApiKey,
    targetDialectCode,
    translationEndpoint,
    langFrom = "",
    region = "australiaeast"
) {
    try {
        // const translationEndpoint = "https://api.cognitive.microsofttranslator.com/translate";

        const response = await axios.post(translationEndpoint, [{ Text: transcriptionText }], {
            headers: {
                "Ocp-Apim-Subscription-Key": translateApiKey,
                "Ocp-Apim-Subscription-Region": region,
                "Content-Type": "application/json",
            },
            params: {
                // from: langFromTranslation,

                to: targetDialectCode,
            },
        });

        const translationText = response.data[0].translations[0].text;

        return translationText;
    } catch (error) {
        console.error("Error translating text:", error);
        throw new Error("Failed to translate text");
    }
}

export default translateTextMicrosoft;
