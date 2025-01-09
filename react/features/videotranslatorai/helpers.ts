import { getLocalizedDurationFormatter } from '../base/i18n/dateUtil';

export const getElapsedTime = <T extends boolean>(refValueUTC, currentValueUTC, milliSeconds: T): T extends true ? number : string => {
    if (!refValueUTC || !currentValueUTC) {
        return;
    }

    if (currentValueUTC < refValueUTC) {
        return;
    }

    const timerMsValue = currentValueUTC - refValueUTC;

    const localizedTime = milliSeconds ? timerMsValue : getLocalizedDurationFormatter(timerMsValue);

    return localizedTime;
};
