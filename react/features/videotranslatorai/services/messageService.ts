import axios from 'axios';

export const createMessageStorageSendTranslationToDatabase = async (messageToSendToDataBase: string, tokenData: string) => {
    
    const url = process.env.REACT_APP_CREATE_MESSAGE_BACKEND_API_URL;
    
    if(!url)
    {            
        throw new Error('Backend API URL is not set in environment variables.');
    }

    try {
        const response = await axios.post(url, messageToSendToDataBase, {
            headers: {
                'Authorization': `Bearer ${tokenData}`,
                'Content-Type': 'application/json',
                'x-jitsi': 'true',

            }
        });

        if (response.status === 201) {
            console.log('Message added successfully', response.data);
        }
    } catch (error: any) {
        // Type guard to check if error is an AxiosError
        if (axios.isAxiosError(error)) {
            if (error.response) {
                console.error('Error response:', error.response.data);
            } else if (error.request) {
                console.error('Error request:', error.request);
            } else {
                console.error('Error message:', error.message);
            }
        } else {
            console.error('Unexpected error:', error);
        }
    }
};
