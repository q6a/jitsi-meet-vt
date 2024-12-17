import axios from 'axios';

export const logEvent = async ({ event, token }: { event: object; token: string; }) => {
    try {
        const endpoint = process.env.REACT_APP_LOGGER_ENDPOINT;

        if (!endpoint) {
            throw new Error('logger endpoint has not been setup!');
        }
        await axios.post(endpoint, { message: { ...event } },
            {
                headers: {
                    Authorization: `Bearer ${token}`, // Use the provided token
                    'Content-Type': 'application/json',
                    'x-jitsi': 'true'
                }
            });
    } catch (err) {
        console.error('Error while logging meeting event: ', err);
    }
};
