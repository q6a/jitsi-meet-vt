import { getLocalizedDurationFormatter } from '../base/i18n/dateUtil';

export const getElapsedTime = <T extends boolean>(refValueUTC: any, currentValueUTC: any, milliSeconds: T): T extends true ? number | undefined : string | undefined=> {
    if (!refValueUTC || !currentValueUTC) {
        return;
    }

    if (currentValueUTC < refValueUTC) {
        return;
    }

    const timerMsValue = currentValueUTC - refValueUTC;

    return (milliSeconds ? timerMsValue : getLocalizedDurationFormatter(timerMsValue)) as T extends true ? number : string;
};
