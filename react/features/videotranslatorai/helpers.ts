import { getLocalizedDurationFormatter } from '../base/i18n/dateUtil';

export const getElapsedTime = (refValueUTC:any, currentValueUTC:any) => {
    if (!refValueUTC || !currentValueUTC) {
        return;
    }

    if (currentValueUTC < refValueUTC) {
        return;
    }

    const timerMsValue = currentValueUTC - refValueUTC;

    const localizedTime = getLocalizedDurationFormatter(timerMsValue);

    return localizedTime;
};
