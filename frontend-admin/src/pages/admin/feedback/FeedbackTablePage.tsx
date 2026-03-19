import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
    Card,
    Table,
    Button,
    Space,
    Typography,
    Tag,
    Input,
    Select,
    Pagination,
    Skeleton,
    Flex,
    Segmented,
} from 'antd';
import {
    SearchOutlined,
    SortAscendingOutlined,
    EyeOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { gLang } from '@common/language';
import {
    FeedbackAdvancedFilter,
    FeedbackAdminListItemDto,
    FeedbackListSummary,
} from '@ecuc/shared/types/ticket.types';
import { fetchData } from '@common/axiosConfig';
import { useFeedbackFilters } from '@common/hooks/useFeedbackFilters';
import useIsPC from '@common/hooks/useIsPC';
import FeedbackTagGroup, { ProgressTag } from '@common/components/Feedback/FeedbackTagGroup';
import { convertUTCToFormat } from '@common/components/TimeConverter';
import { ltransTicketStatusColor, ltransTicketStatusForUser } from '@common/languageTrans';
import FeedbackDetailDrawer from './components/FeedbackDetailDrawer';
import FeedbackTableToolbar from './components/FeedbackTableToolbar';
import FeedbackTableSummary from './components/FeedbackTableSummary';
import { FeedbackStatus } from './feedbackStatus';

const { Title, Text } = Typography;

const createEmptyFeedbackSummary = (): FeedbackListSummary => ({
    statusCounts: {
        total: 0,
        open: 0,
        closed: 0,
        ended: 0,
    },
    publicTags: [],
    internalTags: [],
    developerTags: [],
    progressTags: [],
    noProgressCount: 0,
});

const toggleTagGroupIds = (
    current: number[] | undefined,
    tagIds: number[],
    canonicalTagId: number
): number[] | undefined => {
    const targetIdSet = new Set(tagIds);
    const currentIds = current ?? [];
    const hasActive = currentIds.some(id => targetIdSet.has(id));

    if (hasActive) {
        const next = currentIds.filter(id => !targetIdSet.has(id));
        return next.length > 0 ? next : undefined;
    }

    return Array.from(new Set([...currentIds.filter(id => !targetIdSet.has(id)), canonicalTagId]));
};

const FeedbackTablePage: React.FC = () => {
    const isPC = useIsPC();
    const { tid: urlTid } = useParams<{ tid?: string }>();
    const navigate = useNavigate();

    const [tickets, setTickets] = useState<FeedbackAdminListItemDto[]>([]);
    const [total, setTotal] = useState(0);
    const [summary, setSummary] = useState<FeedbackListSummary>(createEmptyFeedbackSummary);
    const [spinning, setSpinning] = useState(false);
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<FeedbackAdminListItemDto | null>(null);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [debouncedSearchKeyword, setDebouncedSearchKeyword] = useState('');
    const [columnsConfig, setColumnsConfig] = useState<any[]>([]);
    const [advancedFilters, setAdvancedFilters] = useState<FeedbackAdvancedFilter[]>([]);
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const filters = useFeedbackFilters({
        pageSize: 20,
        initialFilters: { filterStatus: [FeedbackStatus.Open], sortBy: 'lastReplyTime', order: 'desc' },
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

    const loadList = useCallback(
        async (keyword?: string, options?: { silent?: boolean }) => {
            if (!options?.silent) setSpinning(true);
            const params: Record<string, string | number | string[] | number[]> = {
                sortBy,
                order,
                page: String(page),
                pageSize: String(pageSize),
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
            const nextKeyword = (keyword ?? debouncedSearchKeyword).trim();
            if (nextKeyword) params.keyword = nextKeyword;
            if (advancedFilters.length > 0) {
                params.advancedFilters = JSON.stringify(advancedFilters);
            }

            try {
                const pageData = await new Promise<{
                    list?: FeedbackAdminListItemDto[];
                    total?: number;
                    summary?: FeedbackListSummary;
                }>((resolve, reject) => {
                    fetchData({
                        url: '/feedback/admin/list',
                        method: 'GET',
                        data: params,
                        setData: (data: {
                            list?: FeedbackAdminListItemDto[];
                            total?: number;
                            summary?: FeedbackListSummary;
                        }) => {
                            resolve(data);
                        },
                    }).catch(reject);
                });

                setTickets(pageData.list ?? []);
                setTotal(Number(pageData.total) || 0);
                setSummary(pageData.summary ?? createEmptyFeedbackSummary());
            } finally {
                if (!options?.silent) setSpinning(false);
                setHasLoadedOnce(true);
            }
        },
        [
            sortBy,
            order,
            publicTagIds,
            internalTagIds,
            developerTagIds,
            progressTagIds,
            noProgressTag,
            filterType,
            filterStatus,
            debouncedSearchKeyword,
            advancedFilters,
            page,
            pageSize,
        ]
    );

    useEffect(() => {
        loadList();
    }, [loadList]);

    // URL 中携带 tid 时，数据加载完成后自动打开工单抽屉
    useEffect(() => {
        if (!urlTid || !hasLoadedOnce || drawerVisible) return;
        const tidNum = Number(urlTid);
        if (isNaN(tidNum)) return;

        const found = tickets.find(t => t.tid === tidNum);
        if (found) {
            openDrawer(found);
            return;
        }

        // 不在当前页，通过 API 获取基本信息后打开抽屉
        fetchData({
            url: '/ticket/detail',
            method: 'GET',
            data: { tid: urlTid },
            setData: (ticket: any) => {
                if (ticket && ticket.tid) {
                    openDrawer(ticket as FeedbackAdminListItemDto);
                }
            },
        });
    }, [urlTid, hasLoadedOnce]);

    useEffect(() => {
        if (searchDebounceRef.current) {
            clearTimeout(searchDebounceRef.current);
        }
        searchDebounceRef.current = setTimeout(() => {
            searchDebounceRef.current = null;
            setPage(1);
            setDebouncedSearchKeyword(searchKeyword.trim());
        }, 300);
        return () => {
            if (searchDebounceRef.current) {
                clearTimeout(searchDebounceRef.current);
            }
        };
    }, [searchKeyword, setPage]);

    const openDrawer = useCallback((ticket: FeedbackAdminListItemDto) => {
        setSelectedTicket(ticket);
        setDrawerVisible(true);
        navigate(`/feedback/table/${ticket.tid}`, { replace: true });
    }, [navigate]);

    const closeDrawer = useCallback(() => {
        setDrawerVisible(false);
        navigate('/feedback/table', { replace: true });
        void loadList(undefined, { silent: true });
    }, [loadList, navigate]);

    const defaultColumns = [
        {
            title: gLang('feedback.table.columns.tid'),
            dataIndex: 'tid',
            key: 'tid',
            align: 'center',
            width: 80,
            render: (tid: number) => (
                <Text strong>{tid}</Text>
            ),
        },
        {
            title: gLang('feedback.table.columns.title'),
            dataIndex: 'title',
            key: 'title',
            flex: 1,
            render: (title: string, record: FeedbackAdminListItemDto) => (
                <Text
                    ellipsis={{ tooltip: title }}
                    style={{ cursor: 'pointer' }}
                    onClick={() => openDrawer(record)}
                >
                    {title.length > 35 ? title.substring(0, 35) + '...' : title}
                </Text>
            ),
        },
        {
            title: gLang('feedback.table.columns.type'),
            dataIndex: 'feedbackType',
            key: 'feedbackType',
            align: 'center',
            width: 100,
            render: (type: string) => (
                type === 'BUG' ? (
                    <Tag color="red">{gLang('feedback.typeBug')}</Tag>
                ) : type === 'SUGGESTION' ? (
                    <Tag color="green">{gLang('feedback.typeSuggestion')}</Tag>
                ) : null
            ),
        },
        {
            title: gLang('feedback.table.columns.status'),
            dataIndex: 'status',
            key: 'status',
            align: 'center',
            width: 120,
            render: (status: string, record: FeedbackAdminListItemDto) => (
                <Text ellipsis={{ tooltip: gLang(ltransTicketStatusForUser(status, record.priority, true, record.type)) }}>
                    <Tag color={ltransTicketStatusColor(status)}>
                        {gLang(ltransTicketStatusForUser(status, record.priority, true, record.type))}
                    </Tag>
                </Text>
            ),
        },
        {
            title: gLang('feedback.table.columns.tags'),
            dataIndex: 'publicTags',
            key: 'tags',
            align: 'center',
            width: 150,
            render: (tags: any[]) => (
                <FeedbackTagGroup publicTags={tags} />
            ),
        },
        {
            title: gLang('admin.feedbackTableDeveloper'),
            dataIndex: 'developerTags',
            key: 'developerTags',
            align: 'center',
            width: 150,
            render: (tags: any[]) => (
                <FeedbackTagGroup developerTags={tags} showDeveloper />
            ),
        },
        {
            title: gLang('admin.feedbackTableProgress'),
            dataIndex: 'progressTag',
            key: 'progressTag',
            align: 'center',
            width: 100,
            render: (tag: any) =>
                tag ? <ProgressTag tag={tag} /> : null,
        },
        {
            title: gLang('feedback.table.columns.replyCount'),
            dataIndex: 'replyCount',
            key: 'replyCount',
            align: 'center',
            width: 80,
            render: (count: number) => (
                <Text>{count}</Text>
            ),
        },
        {
            title: gLang('feedback.table.columns.createTime'),
            dataIndex: 'create_time',
            key: 'create_time',
            align: 'center',
            width: 150,
            render: (time: string) => (
                <Text>{convertUTCToFormat(time)}</Text>
            ),
        },
        {
            title: gLang('feedback.table.columns.lastReplyTime'),
            dataIndex: 'lastReplyTime',
            key: 'lastReplyTime',
            align: 'center',
            width: 150,
            render: (time: string) => (
                <Text>{time ? convertUTCToFormat(time) : '-'}</Text>
            ),
        },
        {
            title: gLang('feedback.table.columns.action'),
            key: 'action',
            align: 'center',
            render: (_: any, record: FeedbackAdminListItemDto) => (
                <Button
                    type="text"
                    icon={<EyeOutlined />}
                    onClick={() => openDrawer(record)}
                    size="small"
                />
            ),
        },
    ];

    // 从本地存储加载列配置
    useEffect(() => {
        const savedColumns = localStorage.getItem('feedbackTableColumns');
        if (savedColumns) {
            try {
                const parsedColumns = JSON.parse(savedColumns);
                // 确保 parsedColumns 是数组
                if (Array.isArray(parsedColumns)) {
                    const newColumns = parsedColumns
                        .filter((col: any) => col.visible)
                        .map((col: any) => defaultColumns.find(defaultCol => defaultCol.key === col.key))
                        .filter(Boolean);
                    setColumnsConfig(newColumns.length > 0 ? newColumns : defaultColumns);
                } else {
                    setColumnsConfig(defaultColumns);
                }
            } catch {
                setColumnsConfig(defaultColumns);
            }
        } else {
            setColumnsConfig(defaultColumns);
        }
    }, []);

    const handleColumnsChange = (newColumns: any[]) => {
        setColumnsConfig(newColumns);
    };

    const handleReset = () => {
        setColumnsConfig(defaultColumns);
        setAdvancedFilters([]);
        filters.resetFilters();
        if (searchDebounceRef.current) {
            clearTimeout(searchDebounceRef.current);
            searchDebounceRef.current = null;
        }
        setSearchKeyword('');
        setDebouncedSearchKeyword('');
        localStorage.removeItem('feedbackTableColumns');
    };

    const handleApplyFilter = (newFilters: FeedbackAdvancedFilter[]) => {
        setAdvancedFilters(newFilters);
        setPage(1);
    };

    const sortOptions = [
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
        {
            value: 'createTime_asc',
            label: gLang('feedback.sortCreateTime') + ' ↑',
        },
        { value: 'heat_desc', label: gLang('feedback.sortHeat') + ' ↓' },
        { value: 'heat_asc', label: gLang('feedback.sortHeat') + ' ↑' },
    ];

    const typeOptions = [
        { value: '', label: gLang('feedback.typeAll') },
        { value: 'SUGGESTION', label: gLang('feedback.typeSuggestion') },
        { value: 'BUG', label: gLang('feedback.typeBug') },
    ];

    const statusOptions = [
        { value: '', label: gLang('feedback.allStatus') },
        { value: FeedbackStatus.Open, label: gLang('feedback.status.open') },
        { value: FeedbackStatus.Closed, label: gLang('feedback.status.closed') },
        { value: FeedbackStatus.Ended, label: gLang('feedback.status.ended') },
    ];

    const selectedStatusValue =
        Array.isArray(filterStatus) && filterStatus.length === 1 ? filterStatus[0] : '';

    const handleSortChange = (value: string) => {
        const [nextSortBy, nextOrder] = value.split('_');
        setSortBy(nextSortBy as any);
        setOrder(nextOrder as any);
    };

    const handleTypeChange = (value: string) => {
        setFilterType(value || undefined);
        setPage(1);
    };

    const handleStatusChange = (value: string) => {
        setFilterStatus(value ? [value] : []);
        setPage(1);
    };

    const columns = isPC
        ? columnsConfig
        : columnsConfig.filter(col => !['tags', 'lastReplyTime'].includes(col.key));
    const tableData = tickets.map(ticket => ({
        ...ticket,
        key: ticket.tid,
    }));

    const toggleSummaryPublicTag = useCallback((tagIds: number[], canonicalTagId: number) => {
        setPublicTagIds(toggleTagGroupIds(publicTagIds, tagIds, canonicalTagId));
        setPage(1);
    }, [publicTagIds, setPublicTagIds, setPage]);

    const toggleSummaryInternalTag = useCallback((tagIds: number[], canonicalTagId: number) => {
        setInternalTagIds(toggleTagGroupIds(internalTagIds, tagIds, canonicalTagId));
        setPage(1);
    }, [internalTagIds, setInternalTagIds, setPage]);

    const toggleQuickDeveloper = useCallback((tagIds: number[], canonicalTagId: number) => {
        setDeveloperTagIds(toggleTagGroupIds(developerTagIds, tagIds, canonicalTagId));
        setPage(1);
    }, [developerTagIds, setDeveloperTagIds, setPage]);

    const toggleQuickProgress = useCallback((tagIds: number[], canonicalTagId: number) => {
        // 选择具体进度时，取消"无状态"
        setNoProgressTag(undefined);
        setProgressTagIds(toggleTagGroupIds(progressTagIds, tagIds, canonicalTagId));
        setPage(1);
    }, [progressTagIds, setProgressTagIds, setNoProgressTag, setPage]);

    const toggleNoProgressTag = useCallback(() => {
        if (noProgressTag) {
            setNoProgressTag(undefined);
        } else {
            setNoProgressTag(true);
            setProgressTagIds(undefined); // 互斥：清空具体进度筛选
        }
        setPage(1);
    }, [noProgressTag, setNoProgressTag, setProgressTagIds, setPage]);

    const selectedIndex = useMemo(
        () => selectedTicket ? tickets.findIndex(t => t.tid === selectedTicket.tid) : -1,
        [selectedTicket, tickets]
    );

    const showInitialSkeleton = spinning && !hasLoadedOnce;

    return (
        <div style={{ width: '100%', height: '100%' }}>
            <Typography style={{ marginBottom: 24 }}>
                <Title level={4} style={{ marginBottom: 8 }}>
                    {gLang('feedback.table.title')}
                </Title>
                <Text type="secondary">{gLang('feedback.table.description')}</Text>
            </Typography>

            {showInitialSkeleton ? (
                <Skeleton active paragraph={{ rows: 8 }} />
            ) : (
                <>
                    <Space direction="vertical" size={12} style={{ width: '100%' }}>
                        <Card size="small">
                            <Space direction="vertical" size={12} style={{ width: '100%' }}>
                                <Flex gap={8} wrap align="center">
                                    <Input
                                        placeholder={gLang('feedback.searchPlaceholder')}
                                        prefix={<SearchOutlined />}
                                        value={searchKeyword}
                                        onChange={event => setSearchKeyword(event.target.value)}
                                        allowClear
                                        size="small"
                                        style={{
                                            flex: isPC ? '1 1 280px' : '1 1 100%',
                                            minWidth: isPC ? 280 : undefined,
                                        }}
                                    />
                                    <Select
                                        value={`${sortBy}_${order}`}
                                        onChange={handleSortChange}
                                        size="small"
                                        prefix={<SortAscendingOutlined />}
                                        options={sortOptions}
                                        style={{
                                            width: isPC ? 180 : '100%',
                                            minWidth: isPC ? undefined : '100%',
                                        }}
                                    />
                                    {isPC ? (
                                        <>
                                            <Segmented
                                                size="small"
                                                value={filterType ?? ''}
                                                onChange={value => handleTypeChange(String(value))}
                                                options={typeOptions}
                                            />
                                            <Segmented
                                                size="small"
                                                value={selectedStatusValue}
                                                onChange={value => handleStatusChange(String(value))}
                                                options={statusOptions}
                                            />
                                        </>
                                    ) : (
                                        <>
                                            <Select
                                                size="small"
                                                value={filterType ?? ''}
                                                onChange={handleTypeChange}
                                                options={typeOptions}
                                                style={{ width: '100%' }}
                                            />
                                            <Select
                                                size="small"
                                                value={selectedStatusValue}
                                                onChange={handleStatusChange}
                                                options={statusOptions}
                                                style={{ width: '100%' }}
                                            />
                                        </>
                                    )}
                                    <div style={{ marginInlineStart: isPC ? 'auto' : 0 }}>
                                        <FeedbackTableToolbar
                                            columns={columnsConfig}
                                            onColumnsChange={handleColumnsChange}
                                            onReset={handleReset}
                                            onApplyFilter={handleApplyFilter}
                                            advancedFilters={advancedFilters}
                                        />
                                    </div>
                                </Flex>
                            </Space>
                        </Card>

                        <FeedbackTableSummary
                            summary={summary}
                            publicTagIds={publicTagIds}
                            internalTagIds={internalTagIds}
                            developerTagIds={developerTagIds}
                            progressTagIds={progressTagIds}
                            noProgressTag={noProgressTag}
                            onTogglePublicTag={toggleSummaryPublicTag}
                            onToggleInternalTag={toggleSummaryInternalTag}
                            onToggleDeveloperTag={toggleQuickDeveloper}
                            onToggleProgressTag={toggleQuickProgress}
                            onToggleNoProgressTag={toggleNoProgressTag}
                        />

                        <Card
                            size="small"
                            title={gLang('feedback.table.listTitle')}
                        >
                            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                                <Table
                                    columns={columns}
                                    dataSource={tableData}
                                    loading={spinning}
                                    pagination={false}
                                    rowKey="tid"
                                    scroll={{ x: 'max-content' }}
                                    size="small"
                                />

                                {total > pageSize && (
                                    <Pagination
                                        current={page}
                                        pageSize={pageSize}
                                        total={total}
                                        onChange={nextPage => setPage(nextPage)}
                                    />
                                )}
                            </Space>
                        </Card>
                    </Space>
                </>
            )}

            <FeedbackDetailDrawer
                visible={drawerVisible}
                onClose={closeDrawer}
                onActionComplete={closeDrawer}
                ticket={selectedTicket}
                hasPrev={selectedIndex > 0}
                hasNext={selectedIndex >= 0 && selectedIndex < tickets.length - 1}
                onPrev={() => {
                    if (selectedIndex > 0) openDrawer(tickets[selectedIndex - 1]);
                }}
                onNext={() => {
                    if (selectedIndex >= 0 && selectedIndex < tickets.length - 1) openDrawer(tickets[selectedIndex + 1]);
                }}
            />

        </div>
    );
};

export default FeedbackTablePage;
