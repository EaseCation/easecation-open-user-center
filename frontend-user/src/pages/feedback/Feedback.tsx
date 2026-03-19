// 反馈中心主页面 - 社区讨论风格

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
    App,
    Button,
    Input,
    Space,
    Grid,
    Card,
    Typography,
    Skeleton,
    Modal,
    Drawer,
    Tag,
    Segmented,
    Pagination,
} from 'antd';
import {
    SettingOutlined,
    SearchOutlined,
    CheckCircleOutlined,
    BellOutlined,
    FilterOutlined,
    CloseOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { gLang } from '@common/language';
import Wrapper from '@common/components/Wrapper/Wrapper';
import FeedbackListItem from './components/FeedbackListItem';
import { FeedbackListItemDto } from '@ecuc/shared/types/ticket.types';
import { fetchData } from '@common/axiosConfig';
import usePageTitle from '@common/hooks/usePageTitle';
import { useTheme } from '@common/contexts/ThemeContext';
import { useFeedbackFilters } from '@common/hooks/useFeedbackFilters';
import { FeedbackListLayout } from '@common/components/FeedbackListLayout';
import FeedbackSettingsModal from './components/FeedbackSettingsModal';
import FeedbackTagSelect from '@common/components/Feedback/FeedbackTagSelect';

const { useBreakpoint } = Grid;
const { Text, Title } = Typography;

const STORAGE_KEY = 'feedback-list-filters';

const Feedback: React.FC = () => {
    usePageTitle();
    const { message: messageApi } = App.useApp();
    const navigate = useNavigate();
    const location = useLocation();
    const screens = useBreakpoint();
    const isMobile = !screens.md;
    const { getThemeColor } = useTheme();

    // 使用共享的筛选 Hook
    const filters = useFeedbackFilters({ pageSize: 20, storageKey: STORAGE_KEY });
    const {
        publicTagIds,
        filterType,
        filterStatus,
        sortBy,
        order,
        page,
        pageSize,
        setPublicTagIds,
        setFilterType,
        setFilterStatus,
        setSortBy,
        setOrder,
        setPage,
    } = filters;

    const [allTicketList, setAllTicketList] = useState<FeedbackListItemDto[] | undefined>(
        undefined
    );
    const [total, setTotal] = useState(0);
    const [searchValue, setSearchValue] = useState(() => {
        try {
            return sessionStorage.getItem(`${STORAGE_KEY}_keyword`) ?? '';
        } catch {
            return '';
        }
    });
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [isSpinning, setIsSpinning] = useState(true);
    const [isListLoading, setIsListLoading] = useState(false);
    const [experience, setExperience] = useState(0);
    const [canCheckinToday, setCanCheckinToday] = useState(false);
    const [isCheckingIn, setIsCheckingIn] = useState(false);
    const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);
    const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
    const [settingsModalOpen, setSettingsModalOpen] = useState(false);

    // Check if this is the first visit after login
    const isFirstVisitAfterLogin = useMemo(() => {
        const hasShownAnimation = sessionStorage.getItem('feedbackAnimationShown');
        const isFromLogin =
            document.referrer.includes('/login') ||
            document.referrer.includes('/login/callback') ||
            location.state?.fromLogin === true;

        // If coming from login and haven't shown animation yet, show full animation
        if (isFromLogin && !hasShownAnimation) {
            sessionStorage.setItem('feedbackAnimationShown', 'true');
            return true;
        }
        return false;
    }, [location.state]);

    // Animation delay: first login uses slightly richer stagger; normal navigation stays snappy
    const animationDelay = isFirstVisitAfterLogin ? 0.07 : 0.015;
    const animationStyle = (order: number): React.CSSProperties => ({
        opacity: 0,
        willChange: 'transform, opacity',
        animation: `fadeInUp 0.42s cubic-bezier(0.22, 1, 0.36, 1) ${Math.min(order * animationDelay, 0.2)}s forwards`,
    });

    const loadList = useCallback(
        (
            isInitialLoad = false,
            overrides?: {
                sortBy?: 'createTime' | 'lastReplyTime' | 'heat';
                order?: 'asc' | 'desc';
                page?: number;
                publicTagIds?: number[];
                filterType?: string;
                filterStatus?: string;
                /** 关键词搜索（服务端搜索全部数据后分页） */
                keyword?: string;
            }
        ) => {
            // 首次加载显示全页面骨架屏，后续只显示列表加载
            if (isInitialLoad) {
                setIsSpinning(true);
            } else {
                setIsListLoading(true);
            }

            const params: Record<string, string | number | string[] | number[]> = {
                sortBy: overrides?.sortBy ?? sortBy,
                order: overrides?.order ?? order,
                page: String(overrides?.page ?? page),
                pageSize: String(pageSize),
            };
            const nextPublicTagIds =
                overrides?.publicTagIds !== undefined ? overrides.publicTagIds : publicTagIds;
            const type = overrides?.filterType !== undefined ? overrides.filterType : filterType;
            const status =
                overrides?.filterStatus !== undefined ? overrides.filterStatus : filterStatus;
            // 优先用 overrides.keyword，否则用当前输入框关键词（翻页/筛选时保留搜索）
            const keyword =
                overrides?.keyword !== undefined
                    ? overrides.keyword
                    : searchValue.trim() || undefined;

            if (nextPublicTagIds != null && nextPublicTagIds.length > 0)
                params.publicTagIds = nextPublicTagIds;
            if (type != null && type !== '') params.type = type;
            if (status != null && status !== '') params.status = status;
            if (keyword != null && keyword !== '') params.keyword = keyword;

            fetchData({
                url: '/feedback/list',
                method: 'GET',
                data: params,
                setData: (data: { list?: FeedbackListItemDto[]; total?: number }) => {
                    setAllTicketList(data?.list ?? []);
                    setTotal(data?.total ?? 0);
                    setIsSpinning(false);
                    setIsListLoading(false);
                },
            }).catch(() => {
                setIsSpinning(false);
                setIsListLoading(false);
            });
        },
        [sortBy, order, page, publicTagIds, filterType, filterStatus, pageSize, searchValue]
    );

    // 搜索关键词防抖：输入后 300ms 请求服务端搜索全部数据（跳过首次挂载，避免与 loadList(true) 重复）
    const searchEffectFirstRun = useRef(true);
    useEffect(() => {
        if (searchEffectFirstRun.current) {
            searchEffectFirstRun.current = false;
            return;
        }
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = setTimeout(() => {
            searchDebounceRef.current = null;
            setPage(1);
            loadList(false, { keyword: searchValue.trim() || undefined, page: 1 });
        }, 300);
        return () => {
            if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        };
    }, [searchValue]);

    useEffect(() => {
        try {
            sessionStorage.setItem(`${STORAGE_KEY}_keyword`, searchValue);
        } catch {
            // ignore
        }
    }, [searchValue]);

    const loadExperienceData = () => {
        fetchData({
            url: '/feedback/experience',
            method: 'GET',
            data: {},
            setData: (data: any) => {
                setExperience(Number(data?.experience || 0));
                setCanCheckinToday(Boolean(data?.canCheckinToday));
            },
        }).catch(() => undefined);
    };

    // 首次加载
    useEffect(() => {
        loadList(true);
    }, []);

    useEffect(() => {
        loadExperienceData();
    }, []);

    const openCheckinModal = () => {
        setIsCheckinModalOpen(true);
        loadExperienceData();
    };

    const handleCheckin = async () => {
        setIsCheckingIn(true);
        try {
            await fetchData({
                url: '/feedback/checkin',
                method: 'POST',
                data: {},
                setData: (data: any) => {
                    setExperience(Number(data?.experience || 0));
                    setCanCheckinToday(false);
                    if (data?.awarded) {
                        messageApi.success(gLang('feedback.checkinSuccess'));
                    } else {
                        messageApi.info(gLang('feedback.checkedInToday'));
                    }
                },
            });
        } catch {
            // 错误提示由 fetchData 统一处理
        } finally {
            setIsCheckingIn(false);
        }
    };

    return (
        <Wrapper>
            {isSpinning ? (
                // 加载状态：显示完整的骨架屏
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                    <div style={{ marginBottom: 24 }}>
                        <Skeleton active title paragraph={{ rows: 1 }} />
                    </div>
                    <Skeleton active paragraph={{ rows: 3 }} />
                    <Skeleton active paragraph={{ rows: 5 }} />
                </Space>
            ) : (
                // 加载完成：显示带动画的内容
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    {/* 标题和统计 */}
                    <div
                        style={{
                            marginBottom: isMobile ? 2 : 8,
                            ...animationStyle(0),
                        }}
                    >
                        <Title
                            level={3}
                            style={{
                                textAlign: 'center',
                                margin: 0,
                                fontSize: isMobile ? 34 : 40,
                                lineHeight: 1.2,
                            }}
                        >
                            {gLang('feedback.title')}
                        </Title>
                        {!isSpinning && total > 0 && (
                            <div
                                style={{
                                    textAlign: 'center',
                                    marginTop: 8,
                                }}
                            >
                                <Text type="secondary" style={{ fontSize: 14 }}>
                                    {searchValue
                                        ? gLang('feedback.searchResultCount', {
                                              total: String(total),
                                          })
                                        : gLang('feedback.totalFeedback', { total: String(total) })}
                                </Text>
                            </div>
                        )}
                    </div>

                    {/* 顶部操作栏 - 响应式布局 */}
                    <div style={animationStyle(1)}>
                        <Card
                            size="small"
                            style={{
                                borderRadius: 8,
                                background: getThemeColor({
                                    light: '#fafafa',
                                    dark: '#1a1a1a',
                                }),
                            }}
                            bodyStyle={{ padding: isMobile ? '12px' : '16px' }}
                        >
                            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                                {/* 筛选器 - 桌面端直接显示，移动端使用抽屉 */}
                                {isMobile ? (
                                    <>
                                        {/* 移动端：搜索栏 */}
                                        <Input
                                            placeholder={gLang('feedback.searchPlaceholder')}
                                            prefix={<SearchOutlined />}
                                            value={searchValue}
                                            onChange={e => setSearchValue(e.target.value)}
                                            style={{ width: '100%' }}
                                            allowClear
                                            size="large"
                                        />

                                        {/* 移动端：快捷操作按钮 */}
                                        <Space.Compact style={{ width: '100%' }} block>
                                            <Button
                                                icon={<CheckCircleOutlined />}
                                                onClick={openCheckinModal}
                                                style={{ flex: 1 }}
                                            >
                                                {gLang('feedback.checkin')}
                                            </Button>
                                            <Button
                                                icon={<SettingOutlined />}
                                                onClick={() => setSettingsModalOpen(true)}
                                                style={{ flex: 1 }}
                                            >
                                                {gLang('feedback.settings')}
                                            </Button>
                                            <Button
                                                type="primary"
                                                icon={<BellOutlined />}
                                                onClick={() => navigate('/feedback/subscriptions')}
                                                style={{ flex: 1 }}
                                            >
                                                {gLang('feedback.mySubscriptions')}
                                            </Button>
                                        </Space.Compact>
                                    </>
                                ) : (
                                    /* 桌面端：搜索框 + 按钮 + 筛选器在同一区域 */
                                    <div
                                        style={{
                                            display: 'flex',
                                            gap: 12,
                                            alignItems: 'flex-start',
                                            flexWrap: 'wrap',
                                        }}
                                    >
                                        {/* 左侧：搜索框 */}
                                        <Input
                                            placeholder={gLang('feedback.searchPlaceholder')}
                                            prefix={<SearchOutlined />}
                                            value={searchValue}
                                            onChange={e => setSearchValue(e.target.value)}
                                            style={{ width: 280 }}
                                            allowClear
                                        />

                                        {/* 中间：快捷按钮 */}
                                        <Space>
                                            <Button
                                                onClick={openCheckinModal}
                                                icon={<CheckCircleOutlined />}
                                            >
                                                {gLang('feedback.checkin')}
                                            </Button>
                                            <Button
                                                icon={<SettingOutlined />}
                                                onClick={() => setSettingsModalOpen(true)}
                                            >
                                                {gLang('feedback.settings')}
                                            </Button>
                                            <Button
                                                type="primary"
                                                onClick={() => navigate('/feedback/subscriptions')}
                                            >
                                                {gLang('feedback.mySubscriptions')}
                                            </Button>
                                        </Space>
                                    </div>
                                )}

                                {/* 移动端筛选抽屉 */}
                                {isMobile ? (
                                    <>
                                        <Button
                                            icon={<FilterOutlined />}
                                            onClick={() => setFilterDrawerOpen(true)}
                                            block
                                            style={{
                                                height: 40,
                                                borderStyle: 'dashed',
                                            }}
                                        >
                                            {gLang('feedback.filterOptions')}
                                            {(filterType ||
                                                filterStatus ||
                                                (publicTagIds?.length ?? 0) > 0) && (
                                                <Tag color="blue" style={{ marginLeft: 8 }}>
                                                    {
                                                        [
                                                            filterType,
                                                            filterStatus,
                                                            ...(publicTagIds?.map(() => 'tag') ??
                                                                []),
                                                        ].filter(Boolean).length
                                                    }
                                                </Tag>
                                            )}
                                        </Button>

                                        {/* 移动端筛选抽屉 */}
                                        <Drawer
                                            title={gLang('feedback.filterOptions')}
                                            placement="bottom"
                                            height="auto"
                                            open={filterDrawerOpen}
                                            onClose={() => setFilterDrawerOpen(false)}
                                            closable={false}
                                            extra={
                                                <Button
                                                    type="text"
                                                    icon={<CloseOutlined />}
                                                    onClick={() => setFilterDrawerOpen(false)}
                                                />
                                            }
                                        >
                                            <Space
                                                direction="vertical"
                                                style={{ width: '100%' }}
                                                size="large"
                                            >
                                                {/* 类型筛选 */}
                                                <div>
                                                    <Text
                                                        type="secondary"
                                                        style={{
                                                            fontSize: 12,
                                                            marginBottom: 8,
                                                            display: 'block',
                                                        }}
                                                    >
                                                        {gLang('feedback.filterType')}
                                                    </Text>
                                                    <Segmented
                                                        options={[
                                                            {
                                                                label: gLang('feedback.typeAll'),
                                                                value: '',
                                                            },
                                                            {
                                                                label: gLang(
                                                                    'feedback.typeSuggestion'
                                                                ),
                                                                value: 'SUGGESTION',
                                                            },
                                                            {
                                                                label: gLang('feedback.typeBug'),
                                                                value: 'BUG',
                                                            },
                                                        ]}
                                                        value={filterType ?? ''}
                                                        onChange={v =>
                                                            setFilterType(
                                                                v === '' ? undefined : String(v)
                                                            )
                                                        }
                                                        block
                                                    />
                                                </div>

                                                {/* 状态筛选 */}
                                                <div>
                                                    <Text
                                                        type="secondary"
                                                        style={{
                                                            fontSize: 12,
                                                            marginBottom: 8,
                                                            display: 'block',
                                                        }}
                                                    >
                                                        {gLang('feedback.filterStatus')}
                                                    </Text>
                                                    <Segmented
                                                        options={[
                                                            {
                                                                label: gLang('feedback.allStatus'),
                                                                value: '',
                                                            },
                                                            {
                                                                label: gLang(
                                                                    'feedback.status.open'
                                                                ),
                                                                value: 'open',
                                                            },
                                                            {
                                                                label: gLang(
                                                                    'feedback.status.closed'
                                                                ),
                                                                value: 'closed',
                                                            },
                                                            {
                                                                label: gLang(
                                                                    'feedback.status.ended'
                                                                ),
                                                                value: 'ended',
                                                            },
                                                        ]}
                                                        value={filterStatus ?? ''}
                                                        onChange={v =>
                                                            setFilterStatus(
                                                                v === '' ? undefined : String(v)
                                                            )
                                                        }
                                                        block
                                                    />
                                                </div>

                                                {/* 排序方式 */}
                                                <div>
                                                    <Text
                                                        type="secondary"
                                                        style={{
                                                            fontSize: 12,
                                                            marginBottom: 8,
                                                            display: 'block',
                                                        }}
                                                    >
                                                        {gLang('feedback.sortOrder')}
                                                    </Text>
                                                    <Segmented
                                                        options={[
                                                            {
                                                                label: gLang(
                                                                    'feedback.sortCreateTime'
                                                                ),
                                                                value: 'createTime',
                                                            },
                                                            {
                                                                label: gLang(
                                                                    'feedback.sortLastReplyTime'
                                                                ),
                                                                value: 'lastReplyTime',
                                                            },
                                                            {
                                                                label: gLang('feedback.sortHeat'),
                                                                value: 'heat',
                                                            },
                                                        ]}
                                                        value={sortBy}
                                                        onChange={v => setSortBy(v as any)}
                                                        block
                                                    />
                                                </div>

                                                {/* 排序方向 - 根据排序方式显示不同文案 */}
                                                <div>
                                                    <Text
                                                        type="secondary"
                                                        style={{
                                                            fontSize: 12,
                                                            marginBottom: 8,
                                                            display: 'block',
                                                        }}
                                                    >
                                                        {gLang('feedback.sortDirection')}
                                                    </Text>
                                                    <Segmented
                                                        options={
                                                            sortBy === 'heat'
                                                                ? [
                                                                      {
                                                                          label: gLang(
                                                                              'feedback.sortHighToLow'
                                                                          ),
                                                                          value: 'desc',
                                                                      },
                                                                      {
                                                                          label: gLang(
                                                                              'feedback.sortLowToHigh'
                                                                          ),
                                                                          value: 'asc',
                                                                      },
                                                                  ]
                                                                : [
                                                                      {
                                                                          label: gLang(
                                                                              'feedback.sortNewToOld'
                                                                          ),
                                                                          value: 'desc',
                                                                      },
                                                                      {
                                                                          label: gLang(
                                                                              'feedback.sortOldToNew'
                                                                          ),
                                                                          value: 'asc',
                                                                      },
                                                                  ]
                                                        }
                                                        value={order}
                                                        onChange={v => setOrder(v as any)}
                                                        block
                                                    />
                                                </div>

                                                {/* 标签筛选 */}
                                                <div>
                                                    <Text
                                                        type="secondary"
                                                        style={{
                                                            fontSize: 12,
                                                            marginBottom: 8,
                                                            display: 'block',
                                                        }}
                                                    >
                                                        {gLang('feedback.tag')}
                                                    </Text>
                                                    <FeedbackTagSelect
                                                        scope="PUBLIC"
                                                        value={publicTagIds ?? []}
                                                        onChange={value =>
                                                            setPublicTagIds(
                                                                value.length > 0 ? value : undefined
                                                            )
                                                        }
                                                        placeholder={gLang(
                                                            'feedback.filterPublicTagPlaceholder'
                                                        )}
                                                        style={{ width: '100%' }}
                                                    />
                                                </div>

                                                {/* 操作按钮 */}
                                                <Space style={{ width: '100%' }}>
                                                    <Button
                                                        onClick={() => {
                                                            setFilterType(undefined);
                                                            setFilterStatus(undefined);
                                                            setPublicTagIds(undefined);
                                                            setSortBy('createTime');
                                                            setOrder('desc');
                                                            setPage(1);
                                                            loadList(false, {
                                                                filterType: undefined,
                                                                filterStatus: undefined,
                                                                publicTagIds: undefined,
                                                                sortBy: 'createTime',
                                                                order: 'desc',
                                                                page: 1,
                                                            });
                                                            setFilterDrawerOpen(false);
                                                        }}
                                                        block
                                                        style={{ flex: 1 }}
                                                    >
                                                        {gLang('feedback.resetFilter')}
                                                    </Button>
                                                    <Button
                                                        type="primary"
                                                        onClick={() => {
                                                            setPage(1);
                                                            loadList(false, { page: 1 });
                                                            setFilterDrawerOpen(false);
                                                        }}
                                                        block
                                                        style={{ flex: 1 }}
                                                    >
                                                        {gLang('feedback.applyFilter')}
                                                    </Button>
                                                </Space>
                                            </Space>
                                        </Drawer>
                                    </>
                                ) : null}

                                {/* 桌面端筛选器 - 与搜索框和按钮在同一个卡片 */}
                                {!isMobile && (
                                    <div
                                        style={{
                                            padding: '12px 16px',
                                            background: getThemeColor({
                                                light: '#fafafa',
                                                dark: '#141414',
                                            }),
                                            borderRadius: 8,
                                            border: `1px solid ${getThemeColor({ light: '#e8e8e8', dark: '#303030' })}`,
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                gap: 16,
                                                alignItems: 'center',
                                                flexWrap: 'wrap',
                                            }}
                                        >
                                            {/* 类型 */}
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 8,
                                                }}
                                            >
                                                <Text
                                                    type="secondary"
                                                    style={{ fontSize: 12, whiteSpace: 'nowrap' }}
                                                >
                                                    {gLang('feedback.filterType')}
                                                </Text>
                                                <Segmented
                                                    options={[
                                                        {
                                                            label: gLang('feedback.typeAll'),
                                                            value: '',
                                                        },
                                                        {
                                                            label: gLang('feedback.typeSuggestion'),
                                                            value: 'SUGGESTION',
                                                        },
                                                        {
                                                            label: gLang('feedback.typeBug'),
                                                            value: 'BUG',
                                                        },
                                                    ]}
                                                    value={filterType ?? ''}
                                                    onChange={v => {
                                                        const newType =
                                                            v === '' ? undefined : String(v);
                                                        setFilterType(newType);
                                                        setPage(1);
                                                        loadList(false, {
                                                            filterType: newType,
                                                            page: 1,
                                                        });
                                                    }}
                                                    size="small"
                                                />
                                            </div>

                                            {/* 状态 */}
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 8,
                                                }}
                                            >
                                                <Text
                                                    type="secondary"
                                                    style={{ fontSize: 12, whiteSpace: 'nowrap' }}
                                                >
                                                    {gLang('feedback.filterStatus')}
                                                </Text>
                                                <Segmented
                                                    options={[
                                                        {
                                                            label: gLang('feedback.allStatus'),
                                                            value: '',
                                                        },
                                                        {
                                                            label: gLang('feedback.status.open'),
                                                            value: 'open',
                                                        },
                                                        {
                                                            label: gLang('feedback.status.closed'),
                                                            value: 'closed',
                                                        },
                                                        {
                                                            label: gLang('feedback.status.ended'),
                                                            value: 'ended',
                                                        },
                                                    ]}
                                                    value={filterStatus ?? ''}
                                                    onChange={v => {
                                                        const newStatus =
                                                            v === '' ? undefined : String(v);
                                                        setFilterStatus(newStatus);
                                                        setPage(1);
                                                        loadList(false, {
                                                            filterStatus: newStatus,
                                                            page: 1,
                                                        });
                                                    }}
                                                    size="small"
                                                />
                                            </div>

                                            {/* 标签 */}
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 8,
                                                }}
                                            >
                                                <Text
                                                    type="secondary"
                                                    style={{ fontSize: 12, whiteSpace: 'nowrap' }}
                                                >
                                                    {gLang('feedback.tag')}
                                                </Text>
                                                <FeedbackTagSelect
                                                    scope="PUBLIC"
                                                    value={publicTagIds ?? []}
                                                    onChange={value => {
                                                        const nextValue =
                                                            value.length > 0 ? value : undefined;
                                                        setPublicTagIds(nextValue);
                                                        setPage(1);
                                                        loadList(false, {
                                                            publicTagIds: nextValue,
                                                            page: 1,
                                                        });
                                                    }}
                                                    placeholder={gLang(
                                                        'feedback.publicTagPlaceholder'
                                                    )}
                                                    style={{ width: 220 }}
                                                />
                                            </div>

                                            {/* 分隔线 */}
                                            <div
                                                style={{
                                                    width: 1,
                                                    height: 24,
                                                    background: getThemeColor({
                                                        light: '#e8e8e8',
                                                        dark: '#303030',
                                                    }),
                                                }}
                                            />

                                            {/* 排序方式 */}
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 8,
                                                }}
                                            >
                                                <Text
                                                    type="secondary"
                                                    style={{ fontSize: 12, whiteSpace: 'nowrap' }}
                                                >
                                                    {gLang('feedback.sortBy')}
                                                </Text>
                                                <Segmented
                                                    options={[
                                                        {
                                                            label: gLang('feedback.sortCreateTime'),
                                                            value: 'createTime',
                                                        },
                                                        {
                                                            label: gLang(
                                                                'feedback.sortLastReplyTime'
                                                            ),
                                                            value: 'lastReplyTime',
                                                        },
                                                        {
                                                            label: gLang('feedback.sortHeat'),
                                                            value: 'heat',
                                                        },
                                                    ]}
                                                    value={sortBy}
                                                    onChange={v => {
                                                        const newSortBy = v as
                                                            | 'createTime'
                                                            | 'lastReplyTime'
                                                            | 'heat';
                                                        setSortBy(newSortBy);
                                                        setPage(1);
                                                        // 立即加载，使用新的 sortBy 值
                                                        setIsListLoading(true);
                                                        const params: Record<
                                                            string,
                                                            string | number | string[] | number[]
                                                        > = {
                                                            sortBy: newSortBy,
                                                            order,
                                                            page: '1',
                                                            pageSize: String(pageSize),
                                                        };
                                                        if (publicTagIds?.length)
                                                            params.publicTagIds = publicTagIds;
                                                        if (filterType != null && filterType !== '')
                                                            params.type = filterType;
                                                        if (
                                                            filterStatus != null &&
                                                            filterStatus !== ''
                                                        )
                                                            params.status = filterStatus;
                                                        fetchData({
                                                            url: '/feedback/list',
                                                            method: 'GET',
                                                            data: params,
                                                            setData: (data: {
                                                                list?: FeedbackListItemDto[];
                                                                total?: number;
                                                            }) => {
                                                                setAllTicketList(data?.list ?? []);
                                                                setTotal(data?.total ?? 0);
                                                                setIsListLoading(false);
                                                            },
                                                        }).catch(() => setIsListLoading(false));
                                                    }}
                                                    size="small"
                                                />
                                            </div>

                                            {/* 排序方向 - 根据排序方式显示不同文案 */}
                                            {/* 热度: desc=从高到低(reply_count大的在前), asc=从低到高 */}
                                            {/* 时间: desc=从新到旧(时间戳大的在前), asc=从旧到新 */}
                                            <Segmented
                                                key={sortBy} // 强制重新渲染，避免选项改变时状态不同步
                                                options={
                                                    sortBy === 'heat'
                                                        ? [
                                                              {
                                                                  label: gLang(
                                                                      'feedback.sortHighToLow'
                                                                  ),
                                                                  value: 'desc',
                                                              },
                                                              {
                                                                  label: gLang(
                                                                      'feedback.sortLowToHigh'
                                                                  ),
                                                                  value: 'asc',
                                                              },
                                                          ]
                                                        : [
                                                              {
                                                                  label: gLang(
                                                                      'feedback.sortNewToOld'
                                                                  ),
                                                                  value: 'desc',
                                                              },
                                                              {
                                                                  label: gLang(
                                                                      'feedback.sortOldToNew'
                                                                  ),
                                                                  value: 'asc',
                                                              },
                                                          ]
                                                }
                                                value={order}
                                                onChange={v => {
                                                    const newOrder = v as 'asc' | 'desc';
                                                    setOrder(newOrder);
                                                    setPage(1);
                                                    // 立即加载，使用新的 order 值
                                                    setIsListLoading(true);
                                                    const params: Record<
                                                        string,
                                                        string | number | string[] | number[]
                                                    > = {
                                                        sortBy,
                                                        order: newOrder,
                                                        page: '1',
                                                        pageSize: String(pageSize),
                                                    };
                                                    if (publicTagIds?.length)
                                                        params.publicTagIds = publicTagIds;
                                                    if (filterType != null && filterType !== '')
                                                        params.type = filterType;
                                                    if (filterStatus != null && filterStatus !== '')
                                                        params.status = filterStatus;
                                                    fetchData({
                                                        url: '/feedback/list',
                                                        method: 'GET',
                                                        data: params,
                                                        setData: (data: {
                                                            list?: FeedbackListItemDto[];
                                                            total?: number;
                                                        }) => {
                                                            setAllTicketList(data?.list ?? []);
                                                            setTotal(data?.total ?? 0);
                                                            setIsListLoading(false);
                                                        },
                                                    }).catch(() => setIsListLoading(false));
                                                }}
                                                size="small"
                                            />
                                        </div>
                                    </div>
                                )}
                            </Space>
                        </Card>
                    </div>

                    {/* 帖子列表 */}
                    {isListLoading ? (
                        <Skeleton active paragraph={{ rows: 5 }} />
                    ) : allTicketList && allTicketList.length > 0 ? (
                        <>
                            <FeedbackListLayout
                                items={allTicketList}
                                renderItem={ticket => (
                                    <FeedbackListItem
                                        ticket={ticket}
                                        to={`/feedback/${ticket.tid}`}
                                    />
                                )}
                                gap={12}
                                animationDelay={animationDelay}
                                enableAnimation={true}
                            />

                            {/* 分页组件 */}
                            {total > pageSize && (
                                <div
                                    style={{
                                        ...animationStyle(3 + Math.min(allTicketList.length, 8)),
                                        marginTop: 24,
                                        display: 'flex',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Pagination
                                        current={page}
                                        pageSize={pageSize}
                                        total={total}
                                        onChange={newPage => {
                                            setPage(newPage);
                                            loadList(false, { page: newPage });
                                            // 滚动到顶部
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        showTotal={total =>
                                            gLang('feedback.totalFeedback', {
                                                total: String(total),
                                            })
                                        }
                                        showSizeChanger={false}
                                        responsive
                                        size={isMobile ? 'small' : undefined}
                                    />
                                </div>
                            )}
                        </>
                    ) : (
                        <div style={animationStyle(2)}>
                            <Card
                                style={{
                                    borderRadius: 12,
                                    textAlign: 'center',
                                    padding: 40,
                                }}
                            >
                                <Text type="secondary" style={{ fontSize: 16 }}>
                                    {gLang('feedback.noFeedbackContent')}
                                </Text>
                            </Card>
                        </div>
                    )}
                </Space>
            )}
            <Modal
                title={gLang('feedback.checkinModalTitle')}
                open={isCheckinModalOpen}
                onCancel={() => setIsCheckinModalOpen(false)}
                footer={null}
                width={isMobile ? '92vw' : 520}
                centered
                styles={{
                    header: {
                        borderRadius: '12px 12px 0 0',
                        marginBottom: 10,
                    },
                    body: {
                        padding: isMobile ? 14 : 20,
                    },
                    footer: {
                        borderRadius: '0 0 12px 12px',
                    },
                }}
            >
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <div>
                        <Text type="secondary">{gLang('feedback.seedBalanceLabel')}</Text>
                        <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>
                            {experience}
                        </div>
                    </div>
                    <div>
                        <Text strong>{gLang('feedback.seedRulesTitle')}</Text>
                        <div style={{ marginTop: 8 }}>
                            <Text type="secondary">{gLang('feedback.seedRuleCheckin')}</Text>
                        </div>
                        <div>
                            <Text type="secondary">{gLang('feedback.seedRuleReply')}</Text>
                        </div>
                    </div>
                    {canCheckinToday ? (
                        <Button type="primary" onClick={handleCheckin} loading={isCheckingIn} block>
                            {gLang('feedback.checkin')}
                        </Button>
                    ) : (
                        <Text type="secondary">{gLang('feedback.checkedInToday')}</Text>
                    )}
                </Space>
            </Modal>

            {/* 设置 Modal */}
            <FeedbackSettingsModal
                open={settingsModalOpen}
                onClose={() => setSettingsModalOpen(false)}
            />
        </Wrapper>
    );
};

export default Feedback;
