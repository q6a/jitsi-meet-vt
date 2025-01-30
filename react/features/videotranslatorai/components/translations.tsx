import React from 'react';
import { connect } from 'react-redux';
import { makeStyles } from 'tss-react/mui';

import { IReduxState } from '../../app/types';
import { translate } from '../../base/i18n/functions';


const useStyles = makeStyles()(theme => {
    return {
        container: {
            padding: theme.spacing(4),
            height: '100%',
            overflow: 'auto'
        },
        messageFirst: {
            marginTop: theme.spacing(1)
        },
        message: {
            marginTop: theme.spacing(6)
        },
        messageBorder: {
            border: '1px solid rgba(83, 83, 83, 0.5)'
        }
    };
});

const Translations = ({
    _translations
}: {
    _translations: { original: string; timestamp: string; translated: string; }[];
}) => {
    const { classes } = useStyles();

    return (
        <div className = { classes.container }>
            {_translations.map((c, i) => (
                <div
                    className = { i > 0 ? classes.message : classes.messageFirst }
                    key = { i }>
                    <p>{c.timestamp}</p>
                    <p>{c.original}</p>
                    <hr className = { classes.messageBorder } />
                    <p>{c.translated}</p>
                </div>
            ))}
        </div>
    );
};

/**
 * Function that maps parts of Redux state tree into component props.
 *
 * @param {Object} state - Redux state.
 * @returns {Object}
 */
const mapStateToProps = (state: IReduxState) => {
    return {
        _translations: state['features/videotranslatorai'].inpersonTranslations
    };
};

export default translate(connect(mapStateToProps)(Translations));
