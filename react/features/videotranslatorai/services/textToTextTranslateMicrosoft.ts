import axios from "axios";

async function translateTextMicrosoft(
    transcriptionTextParam: string,
    authToken: string,
    targetDialectCodeParam: string,
    langFromParam = "",
    regionParam = "australiaeast"
): Promise<string> {
    try {
        const backendEndpoint = process.env.REACT_APP_TRANSLATE_API_ENDPOINT;

        if (!backendEndpoint) {
            throw new Error("Envrionment variable not set");
        }

        const response = await axios.post(
            backendEndpoint,
            {
                transcriptionText: transcriptionTextParam,
                targetDialectCode: targetDialectCodeParam,
                langFrom: langFromParam, // Explicitly assigning langFrom to langFrom
                region: regionParam, // Explicitly assigning region to region
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
