import type React from 'react';

export const getFeedbackCenterTitleBarStyle = (): React.CSSProperties => ({
    width: '100%',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
});

export const getFeedbackCenterTitleMainStyle = (): React.CSSProperties => ({
    minWidth: 0,
    flex: '1 1 180px',
});

export const getFeedbackCenterActionWrapperStyle = (
    isCompactLayout: boolean
): React.CSSProperties => ({
    flex: isCompactLayout ? '1 0 100%' : '0 0 auto',
});

export const getReplyHeaderLayoutStyle = (isNarrowPreviewHeader: boolean): React.CSSProperties => ({
    display: 'flex',
    flexDirection: isNarrowPreviewHeader ? 'column' : 'row',
    justifyContent: 'space-between',
    alignItems: isNarrowPreviewHeader ? 'stretch' : 'flex-start',
    gap: 8,
    marginBottom: 8,
});

export const getReplyHeaderMetaStyle = (isNarrowPreviewHeader: boolean): React.CSSProperties => ({
    minWidth: 0,
    flex: isNarrowPreviewHeader ? '1 1 auto' : '1 1 0%',
});

export const getReplyHeaderTimeStyle = (isNarrowPreviewHeader: boolean): React.CSSProperties => ({
    fontSize: 12,
    maxWidth: '100%',
    wordBreak: 'break-word',
    textAlign: isNarrowPreviewHeader ? 'right' : 'left',
    alignSelf: isNarrowPreviewHeader ? 'flex-end' : 'auto',
});
