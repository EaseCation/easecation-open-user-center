import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Button,
    Flex,
    Input,
    Pagination,
    Select,
    Skeleton,
    Space,
    Tooltip,
    Typography,
    Watermark,
    theme,
} from 'antd';
import {
    DatabaseOutlined,
    HomeOutlined,
    MessageOutlined,
    PlusOutlined,
    ReloadOutlined,
    SearchOutlined,
    SortAscendingOutlined,
    TagsOutlined,
} from '@ant-design/icons';
import { gLang } from '@common/language';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@common/contexts/AuthContext';
import { FeedbackAdminListItemDto } from '@ecuc/shared/types/ticket.types';
import { fetchData } from '@common/axiosConfig';
import { useFeedbackFilters } from '@common/hooks/useFeedbackFilters';
import useDarkMode from '@common/hooks/useDarkMode';
import FeedbackListItem from './components/FeedbackListItem';
import CreateFeedbackModal from './CreateFeedbackModal';
import FeedbackTagAssignModal from './components/FeedbackTagAssignModal';
import FeedbackTagSelect, { TAG_NONE_VALUE } from '@common/components/Feedback/FeedbackTagSelect';
import type { FeedbackSortBy, FeedbackOrder } from '@common/hooks/useFeedbackFilters';
import { getGlobalMessageApi } from '@common/utils/messageApiHolder';
import { FeedbackStatus } from './feedbackStatus';

const { Title, Text } = Typography;

const FeedbackPCSidebar: React.FC = () => {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const currentTidMatch = pathname.match(/\/ticket\/operate\/[^/]+\/(\d+)/);
    const currentTid = currentTidMatch ? currentTidMatch[1] : undefined;
    const { user } = useAuth();
    const { useToken } = theme;
    const { token } = useToken();
    const isDarkMode = useDarkMode();

    const [tickets, setTickets] = useState<FeedbackAdminListItemDto[]>([]);
    const [total, setTotal] = useState(0);
    const [spinning, setSpinning] = useState(false);
    const [createFeedbackModalVisible, setCreateFeedbackModalVisible] = useState(false);
    const [editingTicket, setEditingTicket] = useState<FeedbackAdminListItemDto | null>(null);
    const [searchKeyword, setSearchKeyword] = useState('');
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const searchKeywordRef = useRef('');

    const filters = useFeedbackFilters({
        pageSize: 20,
        initialFilters: { filterStatus: [], sortBy: 'lastReplyTime', order: 'desc' },
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
        setPageSize,
    } = filters;

    useEffect(() => {
        searchKeywordRef.current = searchKeyword;
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

    const handleRemoveFromFeedback = async (tidToRemove: number) => {
        await fetchData({
            url: '/feedback/remove',
            method: 'POST',
            data: { tid: tidToRemove },
            setData: () => { },
        });
        setTickets(prev => prev.filter(ticket => ticket.tid !== tidToRemove));
        if (currentTid && Number(currentTid) === tidToRemove) {
            navigate('/feedback');
        }
        getGlobalMessageApi()?.success(gLang('feedback.removeFromListSuccess'));
    };

    return (
        <Watermark
            content={user?.openid}
            font={{ color: 'rgba(0,0,0,.05)' }}
            gap={[10, 10]}
            style={{ display: 'flex', flex: 1, overflow: 'visible' }}
        >
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Flex align="start" justify="space-between">
                    <Title level={4} style={{ margin: 0 }}>
                        {gLang('feedback.manageTitle')}
                    </Title>
                    <Space size={4}>
                        <Tooltip title={gLang('feedback.table.title')}>
                            <Button
                                type="text"
                                icon={<DatabaseOutlined />}
                                onClick={() => navigate('/feedback/table')}
                            />
                        </Tooltip>
                        <Tooltip title={gLang('feedback.tagLibrary.title')}>
                            <Button
                                type="text"
                                icon={<TagsOutlined />}
                                onClick={() => navigate('/feedback/tags')}
                            />
                        </Tooltip>
                        <Link to={'/feedback'}>
                            <Tooltip title={gLang('feedback.manageTitle')}>
                                <Button
                                    type="text"
                                    icon={<MessageOutlined />}
                                    style={{ height: 28, width: 28 }}
                                />
                            </Tooltip>
                        </Link>
                        <Link to="/">
                            <Tooltip title={gLang('dashboard.admin')}>
                                <Button type="text" icon={<HomeOutlined />} />
                            </Tooltip>
                        </Link>
                    </Space>
                </Flex>

                <Flex gap={6} align="center">
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        size="small"
                        onClick={() => setCreateFeedbackModalVisible(true)}
                    >
                        {gLang('feedback.createFeedback')}
                    </Button>
                    <div style={{ flex: 1 }} />
                    <Tooltip title={gLang('admin.feedbackRefresh')}>
                        <Button
                            icon={<ReloadOutlined />}
                            size="small"
                            loading={spinning}
                            onClick={() => loadList(page)}
                        />
                    </Tooltip>
                </Flex>

                <Space direction="vertical" size={10} style={{ width: '100%', marginBottom: 12 }}>
                    <Input
                        placeholder={gLang('feedback.searchPlaceholder')}
                        prefix={<SearchOutlined />}
                        value={searchKeyword}
                        onChange={event => setSearchKeyword(event.target.value)}
                        allowClear
                        size="small"
                        style={{ width: '100%' }}
                    />
                    <Flex gap={8} style={{ width: '100%' }}>
                        <Select
                            value={`${sortBy}_${order}`}
                            onChange={(value: string) => {
                                const [nextSortBy, nextOrder] = value.split('_');
                                setSortBy(nextSortBy as FeedbackSortBy);
                                setOrder(nextOrder as FeedbackOrder);
                            }}
                            size="small"
                            prefix={<SortAscendingOutlined />}
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
                            style={{ flex: 1 }}
                        />
                        <Select
                            size="small"
                            value={filterType ?? ''}
                            onChange={value => {
                                setFilterType(value || undefined);
                                setPage(1);
                            }}
                            options={[
                                { value: '', label: gLang('feedback.typeAll') },
                                { value: 'SUGGESTION', label: gLang('feedback.typeSuggestion') },
                                { value: 'BUG', label: gLang('feedback.typeBug') },
                            ]}
                            style={{ flex: 1 }}
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
                            options={[
                                { value: '', label: gLang('feedback.allStatus') },
                                { value: FeedbackStatus.Open, label: gLang('feedback.status.open') },
                                {
                                    value: FeedbackStatus.Closed,
                                    label: gLang('feedback.status.closed'),
                                },
                                { value: FeedbackStatus.Ended, label: gLang('feedback.status.ended') },
                            ]}
                            style={{ flex: 1 }}
                        />
                    </Flex>
                    <Flex gap={8}>
                        <FeedbackTagSelect
                            admin
                            scope="PUBLIC"
                            value={publicTagIds ?? []}
                            onChange={value => {
                                setPublicTagIds(value.length > 0 ? value : undefined);
                                setPage(1);
                            }}
                            placeholder={gLang('feedback.filterPublicTagPlaceholder')}
                            style={{ flex: 1, minWidth: 0 }}
                        />
                        <FeedbackTagSelect
                            admin
                            scope="INTERNAL"
                            value={internalTagIds ?? []}
                            onChange={value => {
                                setInternalTagIds(value.length > 0 ? value : undefined);
                                setPage(1);
                            }}
                            placeholder={gLang('feedback.filterInternalTagPlaceholder')}
                            style={{ flex: 1, minWidth: 0 }}
                        />
                    </Flex>
                    <Flex gap={8}>
                        <FeedbackTagSelect
                            admin
                            scope="DEVELOPER"
                            value={developerTagIds ?? []}
                            onChange={value => {
                                setDeveloperTagIds(value.length > 0 ? value : undefined);
                                setPage(1);
                            }}
                            placeholder={gLang('feedback.filterDeveloperTagPlaceholder')}
                            style={{ flex: 1, minWidth: 0 }}
                        />
                        <FeedbackTagSelect
                            admin
                            scope="PROGRESS"
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
                            style={{ flex: 1, minWidth: 0 }}
                        />
                    </Flex>
                </Space>

                {spinning ? (
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                        {[1, 2, 3, 4, 5].map(index => (
                            <Skeleton key={index} title paragraph={{ rows: 3 }} active />
                        ))}
                    </Space>
                ) : tickets.length > 0 ? (
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                        {tickets.map(ticket => (
                            <FeedbackListItem
                                key={ticket.tid}
                                ticket={ticket}
                                to={`/ticket/operate/backToMy/${ticket.tid}`}
                                selected={currentTid === ticket.tid.toString()}
                                highlightColor={token.colorPrimary}
                                onEditTags={setEditingTicket}
                                onRemove={handleRemoveFromFeedback}
                            />
                        ))}
                    </Space>
                ) : (
                    <Flex
                        vertical
                        align="center"
                        justify="center"
                        style={{ padding: '40px 0', color: isDarkMode ? '#8c8c8c' : '#8c8c8c' }}
                    >
                        <Text type="secondary" style={{ fontSize: 13 }}>
                            {gLang('feedback.noFeedback')}
                        </Text>
                    </Flex>
                )}

                {total > pageSize && (
                    <Flex justify="center" style={{ paddingBottom: 16 }}>
                        <Pagination
                            simple
                            current={page}
                            pageSize={pageSize}
                            total={total}
                            onChange={nextPage => setPage(nextPage)}
                            onShowSizeChange={(current, size) => {
                                setPageSize(size);
                                setPage(1);
                            }}
                            showSizeChanger
                            size="small"
                        />
                    </Flex>
                )}
            </Space>

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
        </Watermark>
    );
};

export default FeedbackPCSidebar;
