import { describe, expect, it } from '@jest/globals';
import {
    getFeedbackCenterActionWrapperStyle,
    getFeedbackCenterTitleBarStyle,
    getFeedbackCenterTitleMainStyle,
    getReplyHeaderLayoutStyle,
    getReplyHeaderMetaStyle,
    getReplyHeaderTimeStyle,
} from '../pages/admin/ticket/ticket-operate/components/FeedbackCenterCard.layout';

describe('FeedbackCenterCard layout', () => {
    it('lets the action button wrap onto its own row on mobile', () => {
        expect(getFeedbackCenterTitleBarStyle()).toMatchObject({
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
        });
        expect(getFeedbackCenterTitleMainStyle()).toMatchObject({
            minWidth: 0,
            flex: '1 1 180px',
        });
        expect(getFeedbackCenterActionWrapperStyle(true)).toMatchObject({
            flex: '1 0 100%',
        });
        expect(getFeedbackCenterActionWrapperStyle(false)).toMatchObject({
            flex: '0 0 auto',
        });
    });

    it('stacks the reply header on narrow screens so the timestamp stays visible', () => {
        expect(getReplyHeaderLayoutStyle(true)).toMatchObject({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
        });
        expect(getReplyHeaderMetaStyle(true)).toMatchObject({
            minWidth: 0,
            flex: '1 1 auto',
        });
        expect(getReplyHeaderTimeStyle(true)).toMatchObject({
            maxWidth: '100%',
            wordBreak: 'break-word',
            textAlign: 'right',
            alignSelf: 'flex-end',
        });
    });

    it('keeps the reply header in a horizontal layout on desktop', () => {
        expect(getReplyHeaderLayoutStyle(false)).toMatchObject({
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'flex-start',
        });
        expect(getReplyHeaderMetaStyle(false)).toMatchObject({
            flex: '1 1 0%',
        });
        expect(getReplyHeaderTimeStyle(false)).toMatchObject({
            textAlign: 'left',
            alignSelf: 'auto',
        });
    });
});
