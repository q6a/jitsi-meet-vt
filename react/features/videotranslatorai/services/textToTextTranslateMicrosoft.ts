import axios from "axios";

async function translateTextMicrosoft(
    transcriptionTextParam: string,
    authToken: string,
    targetDialectCodeParam: string,
    langFromParam: any = "",
    regionParam: any = "australiaeast",
    meetingId: string,
    clientId: string
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
                langFrom: langFromParam,
                region: regionParam,
                meeting_id: meetingId,
                client_id: clientId,
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
    } catch (error: any) {
        console.error("Error translating text:", error);
        throw new Error("Failed to translate text");
    }
}

export default translateTextMicrosoft;
