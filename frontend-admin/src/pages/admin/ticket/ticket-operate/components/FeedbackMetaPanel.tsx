import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Grid, Spin, Tooltip, Typography, message } from 'antd';
import { fetchData } from '@common/axiosConfig';
import { gLang } from '@common/language';
import { FeedbackTagSummary, TicketStatus } from '@ecuc/shared/types/ticket.types';
import FeedbackTagSelect from '@common/components/Feedback/FeedbackTagSelect';
import FeedbackProgressSelect from '@common/components/Feedback/FeedbackProgressSelect';

interface FeedbackMetaPanelProps {
    tid: number;
    currentStatus?: TicketStatus;
    onSaved?: () => void;
    refreshSignal?: number;
    onProgressChanged?: (
        newTag: FeedbackTagSummary | null,
        oldTag: FeedbackTagSummary | null
    ) => void;
    compact?: boolean;
}

const serializeTagState = (
    publicIds: number[],
    internalIds: number[],
    developerIds: number[]
): string =>
    JSON.stringify({
        publicIds,
        internalIds,
        developerIds,
    });

const FeedbackMetaPanel: React.FC<FeedbackMetaPanelProps> = ({
    tid,
    onSaved,
    refreshSignal = 0,
    onProgressChanged,
    compact = false,
}) => {
    const screens = Grid.useBreakpoint();
    const isWide = Boolean(screens.lg);
    const [loading, setLoading] = useState(false);
    const [tagSaving, setTagSaving] = useState(false);
    const [publicTagIds, setPublicTagIds] = useState<number[]>([]);
    const [internalTagIds, setInternalTagIds] = useState<number[]>([]);
    const [developerTagIds, setDeveloperTagIds] = useState<number[]>([]);
    const [publicTags, setPublicTags] = useState<FeedbackTagSummary[]>([]);
    const [internalTags, setInternalTags] = useState<FeedbackTagSummary[]>([]);
    const [developerTags, setDeveloperTags] = useState<FeedbackTagSummary[]>([]);
    const [progressTag, setProgressTag] = useState<FeedbackTagSummary | null>(null);
    const [messageApi, contextHolder] = message.useMessage();
    const metaReadyRef = useRef(false);
    const lastSavedTagStateRef = useRef<string>('');
    const tagDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const loadMeta = useCallback(() => {
        if (!tid) return;
        metaReadyRef.current = false;
        setLoading(true);
        fetchData({
            url: '/feedback/meta',
            method: 'GET',
            data: { tid },
            setData: (data: {
                type?: 'SUGGESTION' | 'BUG';
                publicTags?: FeedbackTagSummary[];
                internalTags?: FeedbackTagSummary[];
                developerTags?: FeedbackTagSummary[];
                progressTag?: FeedbackTagSummary | null;
            }) => {
                const nextPublicTags = data?.publicTags ?? [];
                const nextInternalTags = data?.internalTags ?? [];
                const nextDeveloperTags = data?.developerTags ?? [];
                const nextDeveloperIds = nextDeveloperTags.map(tag => tag.id);

                setPublicTags(nextPublicTags);
                setInternalTags(nextInternalTags);
                setDeveloperTags(nextDeveloperTags);
                setPublicTagIds(nextPublicTags.map(tag => tag.id));
                setInternalTagIds(nextInternalTags.map(tag => tag.id));
                setDeveloperTagIds(nextDeveloperIds);
                lastSavedTagStateRef.current = serializeTagState(
                    nextPublicTags.map(tag => tag.id),
                    nextInternalTags.map(tag => tag.id),
                    nextDeveloperIds
                );
                setProgressTag(data?.progressTag ?? null);
                metaReadyRef.current = true;
            },
        })
            .catch(() => messageApi.error(gLang('admin.feedbackMetaLoadFailed')))
            .finally(() => setLoading(false));
    }, [tid, messageApi]);

    useEffect(() => {
        loadMeta();
    }, [loadMeta, refreshSignal]);

    const handleSaveTags = useCallback(async () => {
        setTagSaving(true);
        try {
            await fetchData({
                url: '/feedback/admin/tags/set',
                method: 'POST',
                data: {
                    tid,
                    publicTagIds,
                    internalTagIds,
                    developerTagIds,
                    progressTagId: progressTag?.id ?? null,
                },
                setData: (data: {
                    publicTags?: FeedbackTagSummary[];
                    internalTags?: FeedbackTagSummary[];
                    developerTags?: FeedbackTagSummary[];
                    progressTag?: FeedbackTagSummary | null;
                }) => {
                    const nextPublicTags = data?.publicTags ?? [];
                    const nextInternalTags = data?.internalTags ?? [];
                    const nextDeveloperTags = data?.developerTags ?? [];
                    const nextDeveloperIds = nextDeveloperTags.map(tag => tag.id);
                    setPublicTags(nextPublicTags);
                    setInternalTags(nextInternalTags);
                    setDeveloperTags(nextDeveloperTags);
                    setPublicTagIds(nextPublicTags.map(tag => tag.id));
                    setInternalTagIds(nextInternalTags.map(tag => tag.id));
                    setDeveloperTagIds(nextDeveloperIds);
                    lastSavedTagStateRef.current = serializeTagState(
                        nextPublicTags.map(tag => tag.id),
                        nextInternalTags.map(tag => tag.id),
                        nextDeveloperIds
                    );
                    setProgressTag(data?.progressTag ?? null);
                },
            });
            onSaved?.();
        } finally {
            setTagSaving(false);
        }
    }, [tid, publicTagIds, internalTagIds, developerTagIds, progressTag, onSaved]);

    useEffect(() => {
        const serialized = serializeTagState(publicTagIds, internalTagIds, developerTagIds);
        if (!tid || !metaReadyRef.current || serialized === lastSavedTagStateRef.current) return;
        if (tagDebounceRef.current) {
            clearTimeout(tagDebounceRef.current);
        }
        tagDebounceRef.current = setTimeout(() => {
            tagDebounceRef.current = null;
            void handleSaveTags();
        }, 800);
        return () => {
            if (tagDebounceRef.current) {
                clearTimeout(tagDebounceRef.current);
            }
        };
    }, [publicTagIds, internalTagIds, developerTagIds, tid, handleSaveTags]);

    const fieldLabelStyle: React.CSSProperties = {
        display: 'block',
        fontSize: isWide ? 11 : 10,
        fontWeight: 600,
        marginBottom: isWide ? 4 : 3,
        color: 'var(--ant-color-text-secondary)',
        letterSpacing: '0.02em',
    };
    const rowGridStyle: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
        gap: isWide ? (compact ? 14 : 8) : 6,
        width: '100%',
        alignItems: 'end',
    };
    const compactRootStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: isWide ? (compact ? 10 : 8) : 6,
        width: '100%',
    };
    const compactFieldStyle: React.CSSProperties = {
        minWidth: 0,
    };
    const fieldStyle: React.CSSProperties = compactFieldStyle;

    return (
        <>
            {contextHolder}
            <Spin spinning={loading}>
                <div style={compactRootStyle}>
                    <div style={rowGridStyle}>
                        <div style={fieldStyle}>
                            <Typography.Text style={fieldLabelStyle}>
                                {gLang('feedback.publicTag')}
                            </Typography.Text>
                            <FeedbackTagSelect
                                admin
                                allowCreate
                                scope="PUBLIC"
                                value={publicTagIds}
                                onChange={setPublicTagIds}
                                selectedTags={publicTags}
                                placeholder={
                                    isWide
                                        ? gLang('feedback.selectOrCreatePublicTag')
                                        : gLang('feedback.publicTag')
                                }
                                style={{ width: '100%' }}
                                size="small"
                            />
                        </div>
                        <div style={fieldStyle}>
                            <Typography.Text style={fieldLabelStyle}>
                                {gLang('feedback.internalTag')}
                            </Typography.Text>
                            <FeedbackTagSelect
                                admin
                                allowCreate
                                scope="INTERNAL"
                                value={internalTagIds}
                                onChange={setInternalTagIds}
                                selectedTags={internalTags}
                                placeholder={
                                    isWide
                                        ? gLang('feedback.selectOrCreateInternalTag')
                                        : gLang('feedback.internalTag')
                                }
                                style={{ width: '100%' }}
                                size="small"
                            />
                        </div>
                    </div>
                    <div style={rowGridStyle}>
                        <div style={fieldStyle}>
                            <Typography.Text style={fieldLabelStyle}>
                                {gLang('admin.feedbackDevProgress')}
                            </Typography.Text>
                            <FeedbackProgressSelect
                                tid={tid}
                                value={progressTag}
                                onChanged={(newTag, oldTag) => {
                                    setProgressTag(newTag);
                                    onSaved?.();
                                    onProgressChanged?.(newTag, oldTag);
                                }}
                                size="small"
                                block
                                showBadge
                            />
                        </div>
                        <div style={fieldStyle}>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    marginBottom: isWide ? 4 : 3,
                                }}
                            >
                                <Tooltip title={gLang('feedback.developerTagInternalOnly')}>
                                    <Typography.Text style={{ ...fieldLabelStyle, marginBottom: 0 }}>
                                        {gLang('feedback.developerTag')}
                                    </Typography.Text>
                                </Tooltip>
                                {tagSaving ? <Spin size="small" /> : null}
                            </div>
                            <FeedbackTagSelect
                                admin
                                allowCreate
                                scope="DEVELOPER"
                                value={developerTagIds}
                                onChange={setDeveloperTagIds}
                                selectedTags={developerTags}
                                placeholder={
                                    isWide
                                        ? gLang('feedback.selectOrCreateDeveloperTag')
                                        : gLang('feedback.developerTag')
                                }
                                style={{ width: '100%' }}
                                size="small"
                            />
                        </div>
                    </div>
                </div>
            </Spin>
        </>
    );
};

export default FeedbackMetaPanel;
