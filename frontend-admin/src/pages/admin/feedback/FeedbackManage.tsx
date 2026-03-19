import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Flex, Grid, Input, Pagination, Select, Skeleton, Space, Typography } from 'antd';
import {
    ArrowLeftOutlined,
    DatabaseOutlined,
    PlusOutlined,
    ReloadOutlined,
    SearchOutlined,
    SortAscendingOutlined,
    TagsOutlined,
} from '@ant-design/icons';
import { gLang } from '@common/language';
import { FeedbackAdminListItemDto } from '@ecuc/shared/types/ticket.types';
import { fetchData } from '@common/axiosConfig';
import { getGlobalMessageApi } from '@common/utils/messageApiHolder';
import FeedbackListItem from './components/FeedbackListItem';
import CreateFeedbackModal from './CreateFeedbackModal';
import { useNavigate } from 'react-router-dom';
import { useFeedbackFilters } from '@common/hooks/useFeedbackFilters';
import type { FeedbackSortBy, FeedbackOrder } from '@common/hooks/useFeedbackFilters';
import FeedbackTagAssignModal from './components/FeedbackTagAssignModal';
import FeedbackTagSelect, { TAG_NONE_VALUE } from '@common/components/Feedback/FeedbackTagSelect';
import { FeedbackStatus } from './feedbackStatus';

const STORAGE_KEY = 'feedback-manage-filters';

const FeedbackManage: React.FC = () => {
    const navigate = useNavigate();
    const screens = Grid.useBreakpoint();
    const [spinning, setSpinning] = useState(false);
    const [tickets, setTickets] = useState<FeedbackAdminListItemDto[]>([]);
    const [total, setTotal] = useState(0);
    const [createFeedbackModalVisible, setCreateFeedbackModalVisible] = useState(false);
    const [editingTicket, setEditingTicket] = useState<FeedbackAdminListItemDto | null>(null);
    const [searchKeyword, setSearchKeyword] = useState(() => {
        try {
            return sessionStorage.getItem(`${STORAGE_KEY}_keyword`) ?? '';
        } catch {
            return '';
        }
    });
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const searchKeywordRef = useRef('');

    const filters = useFeedbackFilters({
        pageSize: 20,
        initialFilters: { filterStatus: [], sortBy: 'lastReplyTime', order: 'desc' },
        storageKey: STORAGE_KEY,
    });
    const {
        publicTagIds,
        internalTagIds,
        developerTagIds,
        progressTagIds,
        noProgressTag,
        filterType,
        filterStatus,
        sortBy,
        order,
        page,
        pageSize,
        setPublicTagIds,
        setInternalTagIds,
        setDeveloperTagIds,
        setProgressTagIds,
        setNoProgressTag,
        setFilterType,
        setFilterStatus,
        setSortBy,
        setOrder,
        setPage,
    } = filters;

    useEffect(() => {
        searchKeywordRef.current = searchKeyword;
    }, [searchKeyword]);

    useEffect(() => {
        try {
            sessionStorage.setItem(`${STORAGE_KEY}_keyword`, searchKeyword);
        } catch {
            // ignore
        }
    }, [searchKeyword]);

    const loadList = useCallback(
        (pageNum: number, keyword?: string) => {
            setSpinning(true);
            const params: Record<string, string | number | string[] | number[]> = {
                page: String(pageNum),
                pageSize: String(pageSize),
                sortBy,
                order,
            };
            if (publicTagIds?.length) params.publicTagIds = publicTagIds;
            if (internalTagIds?.length) params.internalTagIds = internalTagIds;
            if (developerTagIds?.length) params.developerTagIds = developerTagIds;
            if (noProgressTag) {
                params.noProgressTag = 'true';
            } else if (progressTagIds?.length) {
                params.progressTagIds = progressTagIds;
            }
            if (filterType) params.type = filterType;
            if (Array.isArray(filterStatus) && filterStatus.length > 0) {
                params.status = filterStatus;
            }
            const nextKeyword = keyword !== undefined ? keyword : searchKeywordRef.current.trim();
            if (nextKeyword) params.keyword = nextKeyword;
            fetchData({
                url: '/feedback/admin/list',
                method: 'GET',
                data: params,
                setData: (data: { list?: FeedbackAdminListItemDto[]; total?: number }) => {
                    setTickets(data?.list ?? []);
                    setTotal(data?.total ?? 0);
                },
            }).finally(() => setSpinning(false));
        },
        [pageSize, sortBy, order, publicTagIds, internalTagIds, developerTagIds, progressTagIds, noProgressTag, filterType, filterStatus]
    );

    useEffect(() => {
        loadList(page);
    }, [
        page,
        pageSize,
        sortBy,
        order,
        filterType,
        filterStatus,
        publicTagIds,
        internalTagIds,
        developerTagIds,
        progressTagIds,
        noProgressTag,
        loadList,
    ]);

    useEffect(() => {
        if (searchDebounceRef.current) {
            clearTimeout(searchDebounceRef.current);
        }
        searchDebounceRef.current = setTimeout(() => {
            searchDebounceRef.current = null;
            setPage(1);
            loadList(1, searchKeyword.trim());
        }, 300);
        return () => {
            if (searchDebounceRef.current) {
                clearTimeout(searchDebounceRef.current);
            }
        };
    }, [searchKeyword]);

    const isWideLayout = Boolean(screens?.lg);
    const compactControlStyle = useMemo<React.CSSProperties>(
        () => ({
            flex: isWideLayout ? '1 1 160px' : '1 1 33.333%',
            minWidth: isWideLayout ? 140 : 100,
        }),
        [isWideLayout]
    );
    const compactTagStyle = useMemo<React.CSSProperties>(
        () => ({
            flex: isWideLayout ? '1 1 240px' : '1 1 100%',
            minWidth: isWideLayout ? 220 : undefined,
        }),
        [isWideLayout]
    );

    const handleRemoveFromFeedback = async (tidToRemove: number) => {
        await fetchData({
            url: '/feedback/remove',
            method: 'POST',
            data: { tid: tidToRemove },
            setData: () => { },
        });
        setTickets(prev => prev.filter(ticket => ticket.tid !== tidToRemove));
        getGlobalMessageApi()?.success(gLang('feedback.removeFromListSuccess'));
    };

    return (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Flex align="center" gap={8}>
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')} />
                <Typography.Title level={4} style={{ margin: 0, flex: 1 }}>
                    {gLang('feedback.manageTitle')}
                </Typography.Title>
                <Button icon={<DatabaseOutlined />} onClick={() => navigate('/feedback/table')} />
                <Button icon={<TagsOutlined />} onClick={() => navigate('/feedback/tags')} />
            </Flex>

            <Flex gap={8} wrap align="center">
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setCreateFeedbackModalVisible(true)}
                >
                    {gLang('feedback.createFeedback')}
                </Button>
                <Button
                    icon={<ReloadOutlined />}
                    loading={spinning}
                    onClick={() => loadList(page)}
                />
            </Flex>

            <Flex gap={8} wrap>
                <Input
                    size="small"
                    placeholder={gLang('feedback.searchPlaceholder')}
                    prefix={<SearchOutlined />}
                    value={searchKeyword}
                    onChange={event => setSearchKeyword(event.target.value)}
                    allowClear
                    style={{
                        flex: isWideLayout ? '2 1 280px' : '1 1 100%',
                        minWidth: isWideLayout ? 240 : undefined,
                    }}
                />

                <Select
                    size="small"
                    value={`${sortBy}_${order}`}
                    onChange={(value: string) => {
                        const [nextSortBy, nextOrder] = value.split('_');
                        setSortBy(nextSortBy as FeedbackSortBy);
                        setOrder(nextOrder as FeedbackOrder);
                    }}
                    prefix={<SortAscendingOutlined />}
                    style={compactControlStyle}
                    options={[
                        {
                            value: 'lastReplyTime_desc',
                            label: gLang('feedback.sortLastReplyTime') + ' ↓',
                        },
                        {
                            value: 'lastReplyTime_asc',
                            label: gLang('feedback.sortLastReplyTime') + ' ↑',
                        },
                        {
                            value: 'createTime_desc',
                            label: gLang('feedback.sortCreateTime') + ' ↓',
                        },
                        { value: 'createTime_asc', label: gLang('feedback.sortCreateTime') + ' ↑' },
                        { value: 'heat_desc', label: gLang('feedback.sortHeat') + ' ↓' },
                        { value: 'heat_asc', label: gLang('feedback.sortHeat') + ' ↑' },
                    ]}
                />

                <Select
                    size="small"
                    value={filterType ?? ''}
                    onChange={value => {
                        setFilterType(value || undefined);
                        setPage(1);
                    }}
                    style={compactControlStyle}
                    options={[
                        { value: '', label: gLang('feedback.typeAll') },
                        { value: 'SUGGESTION', label: gLang('feedback.typeSuggestion') },
                        { value: 'BUG', label: gLang('feedback.typeBug') },
                    ]}
                />

                <Select
                    size="small"
                    value={
                        Array.isArray(filterStatus) && filterStatus.length === 1
                            ? filterStatus[0]
                            : ''
                    }
                    onChange={value => {
                        setFilterStatus(value ? [value] : []);
                        setPage(1);
                    }}
                    style={compactControlStyle}
                    options={[
                        { value: '', label: gLang('feedback.allStatus') },
                        { value: FeedbackStatus.Open, label: gLang('feedback.status.open') },
                        { value: FeedbackStatus.Closed, label: gLang('feedback.status.closed') },
                        { value: FeedbackStatus.Ended, label: gLang('feedback.status.ended') },
                    ]}
                />

                <FeedbackTagSelect
                    admin
                    scope="PUBLIC"
                    size="small"
                    value={publicTagIds ?? []}
                    onChange={value => {
                        setPublicTagIds(value.length > 0 ? value : undefined);
                        setPage(1);
                    }}
                    placeholder={gLang('feedback.filterPublicTagPlaceholder')}
                    style={compactTagStyle}
                />

                <FeedbackTagSelect
                    admin
                    scope="INTERNAL"
                    size="small"
                    value={internalTagIds ?? []}
                    onChange={value => {
                        setInternalTagIds(value.length > 0 ? value : undefined);
                        setPage(1);
                    }}
                    placeholder={gLang('feedback.filterInternalTagPlaceholder')}
                    style={compactTagStyle}
                />

                <FeedbackTagSelect
                    admin
                    scope="DEVELOPER"
                    size="small"
                    value={developerTagIds ?? []}
                    onChange={value => {
                        setDeveloperTagIds(value.length > 0 ? value : undefined);
                        setPage(1);
                    }}
                    placeholder={gLang('feedback.filterDeveloperTagPlaceholder')}
                    style={compactTagStyle}
                />

                <FeedbackTagSelect
                    admin
                    scope="PROGRESS"
                    size="small"
                    noneOption={gLang('feedback.noProgressTag')}
                    value={noProgressTag ? [TAG_NONE_VALUE] : (progressTagIds ?? [])}
                    onChange={value => {
                        if (value.includes(TAG_NONE_VALUE)) {
                            setNoProgressTag(true);
                            setProgressTagIds(undefined);
                        } else {
                            setNoProgressTag(undefined);
                            setProgressTagIds(value.length > 0 ? value : undefined);
                        }
                        setPage(1);
                    }}
                    placeholder={gLang('feedback.filterProgressPlaceholder')}
                    style={compactTagStyle}
                />
            </Flex>

            {spinning ? (
                <Space direction="vertical" style={{ width: '100%' }}>
                    {[1, 2, 3, 4].map(index => (
                        <Skeleton key={index} active paragraph={{ rows: 3 }} />
                    ))}
                </Space>
            ) : tickets.length > 0 ? (
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                    {tickets.map(ticket => (
                        <FeedbackListItem
                            key={ticket.tid}
                            ticket={ticket}
                            to={`/ticket/operate/backToMy/${ticket.tid}`}
                            onEditTags={setEditingTicket}
                            onRemove={handleRemoveFromFeedback}
                        />
                    ))}
                </Space>
            ) : (
                <Typography.Text type="secondary">{gLang('feedback.noFeedback')}</Typography.Text>
            )}

            {total > pageSize && (
                <Pagination
                    current={page}
                    pageSize={pageSize}
                    total={total}
                    onChange={nextPage => setPage(nextPage)}
                    style={{ alignSelf: 'center' }}
                />
            )}

            <CreateFeedbackModal
                open={createFeedbackModalVisible}
                onClose={() => {
                    setCreateFeedbackModalVisible(false);
                    loadList(1);
                }}
            />

            <FeedbackTagAssignModal
                open={Boolean(editingTicket)}
                tid={editingTicket?.tid}
                onClose={() => setEditingTicket(null)}
                onSaved={() => loadList(page)}
            />
        </Space>
    );
};

export default FeedbackManage;
