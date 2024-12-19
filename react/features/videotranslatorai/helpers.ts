import { getLocalizedDurationFormatter } from '../base/i18n/dateUtil';

export const getElapsedTime = (refValueUTC, currentValueUTC) => {
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
