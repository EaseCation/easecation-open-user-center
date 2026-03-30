// 工单管理页面的所有工单列表

// TODO 重构
import {
    Button,
    Checkbox,
    DatePicker,
    Divider,
    Flex,
    Input,
    Select,
    Space,
    theme,
    Tooltip,
    Typography,
} from 'antd';
import { gLang } from '@common/language';
import { Ticket, TicketStatus, TicketType, TicketPriority } from '@ecuc/shared/types/ticket.types';
import { MEDIA_TYPES } from '@ecuc/shared/constants/media.constants';
import React, { useCallback, useEffect, useState } from 'react';
import { fetchData } from '@common/axiosConfig';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import {
    CodeOutlined,
    DownOutlined,
    ExportOutlined,
    SearchOutlined,
    SortAscendingOutlined,
    UpOutlined,
} from '@ant-design/icons';
import useIsPC from '@common/hooks/useIsPC';
import TicketListComponent from '../../../components/TicketListComponent';
import { useTicketStatusUpdate } from '@common/hooks/useTicketStatusUpdate';
import { ltransTicketPriority } from '@common/languageTrans';

const { Text } = Typography;

interface TicketQueryProps {
    type: 'common' | 'media';
}

const TicketQuery: React.FC<TicketQueryProps> = ({ type }) => {
    const navigate = useNavigate();
    const { tid } = useParams();
    const isPC = useIsPC();
    const { useToken } = theme;
    const { token } = useToken();

    // 筛选状态
    const [types, setTypes] = useState<string[]>([]);
    const [status, setStatus] = useState<string[]>([]);
    const [priority, setPriority] = useState<number | undefined>(undefined);
    const [advisorUid, setAdvisorUid] = useState<number[]>([]);
    const [createdAtRange, setCreatedAtRange] = useState<[Dayjs | null, Dayjs | null]>([
        null,
        null,
    ]);
    const [sortBy, setSortBy] = useState<string>('lastReplyDesc');

    // 搜索相关状态
    const [searchKeyword, setSearchKeyword] = useState<string>('');
    const [searchTitle, setSearchTitle] = useState<boolean>(true);
    const [searchDetails, setSearchDetails] = useState<boolean>(true);
    const [useRegex, setUseRegex] = useState<boolean>(false);

    // 高级筛选展开状态
    const [advancedOpen, setAdvancedOpen] = useState<boolean>(false);

    const [spinning, setSpinning] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [tickets, setTickets] = useState<Ticket[]>([]);

    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);
    const [hasMore, setHasMore] = useState(false);
    const [, setTotal] = useState(0);
    const [toTicketUrl, settoTicketUrl] = useState('');

    // 使用实时更新hook
    const updatedTickets = useTicketStatusUpdate(tickets);

    // 统一将所有搜索和筛选参数通过 GET 传递给后端
    const query = useCallback(
        (page: number) => {
            let url: string;
            if (type === 'media') {
                url = '/ticket/query/media';
                settoTicketUrl('/media/ticket/operate/backToMy/');
            } else {
                url = '/ticket/query';
                settoTicketUrl('/ticket/operate/backToMy/');
            }

            // 构建所有参数
            const queryParams: any = {
                page, // 分页页码
                pageSize, // 分页大小
                types, // 工单类型
                status, // 工单状态
                priority, // 优先级
                advisorUid, // 顾问UID
                createdAtStart: createdAtRange[0]
                    ? createdAtRange[0].format('YYYY-MM-DD')
                    : undefined, // 创建时间起
                createdAtEnd: createdAtRange[1]
                    ? createdAtRange[1].format('YYYY-MM-DD')
                    : undefined, // 创建时间止
                sortBy, // 排序方式
                searchKeyword, // 新增：搜索关键词（标题/详情）
                searchTitle, // 新增：是否搜索标题
                searchDetails, // 新增：是否搜索详情内容
                useRegex, // 新增：是否使用正则表达式
            };

            fetchData({
                url: url,
                method: 'GET',
                data: queryParams,
                setData: r => {
                    if (page === 1) {
                        setTickets(r.result);
                    } else {
                        setTickets(prevTickets => [...prevTickets, ...r.result]);
                    }
                    setHasMore(r.hasMore);
                    setTotal(r.total);
                },
            }).then(() => {
                setSpinning(false);
                setLoadingMore(false);
                setPage(page + 1);
            });
        },
        [
            type,
            pageSize,
            types,
            status,
            priority,
            advisorUid,
            createdAtRange,
            sortBy,
            searchKeyword,
            searchTitle,
            searchDetails,
            useRegex,
        ]
    );

    // 手动触发查询（点击查询按钮或按 Enter）
    const handleSearch = useCallback(() => {
        setSpinning(true);
        setLoadingMore(false);
        setTickets([]);
        setPage(1);
        setHasMore(false);
        setTotal(0);
        query(1);
    }, [query]);

    // 初始加载
    useEffect(() => {
        handleSearch();
    }, [type]);

    const handleLoadMore = () => {
        if (hasMore) {
            setLoadingMore(true);
            query(page);
        }
    };

    // 客户端过滤函数
    // 只保留时间区间过滤，其他全部交由后端
    const filterTickets = (ticket: Ticket) => {
        // 创建时间范围过滤
        const [start, end] = createdAtRange;
        let matchTime = true;
        const ticketTime = ticket.create_time ? dayjs(ticket.create_time) : null;
        if (ticketTime) {
            if (start && end) {
                matchTime =
                    ticketTime.isSame(start, 'day') ||
                    ticketTime.isSame(end, 'day') ||
                    (ticketTime.isAfter(start, 'day') && ticketTime.isBefore(end, 'day'));
            } else if (start) {
                matchTime = ticketTime.isSame(start, 'day') || ticketTime.isAfter(start, 'day');
            } else if (end) {
                matchTime = ticketTime.isSame(end, 'day') || ticketTime.isBefore(end, 'day');
            }
        }
        return matchTime;
    };

    // 切换高级筛选的显示状态
    const toggleAdvanced = () => {
        setAdvancedOpen(!advancedOpen);
    };

    // 用于定位日期选择器弹出层的ref
    const datePickerContainerRef = React.useRef<HTMLDivElement>(null);

    // 获取弹出层容器，防止溢出
    const getPopupContainer = () => {
        return datePickerContainerRef.current || document.body;
    };

    return (
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
            {/* 基础筛选区域 */}
            <Flex wrap gap={8} style={{ marginBottom: 16 }}>
                {/* 类型筛选：根据 props.type 仅展示对应的工单类型 */}
                <Select
                    mode="multiple"
                    allowClear
                    placeholder={gLang('ticketQuery.types')}
                    value={types}
                    style={{ minWidth: 120 }}
                    options={(type === 'media'
                        ? Object.values(TicketType).filter(
                              t => t !== TicketType.None && MEDIA_TYPES.includes(t)
                          )
                        : Object.values(TicketType).filter(
                              t => t !== TicketType.None && !MEDIA_TYPES.includes(t)
                          )
                    ).map(t => ({
                        value: t,
                        label: gLang(`ticket.type.${t}`),
                    }))}
                    onChange={value => setTypes([...value])}
                    onClear={() => setTypes([])}
                />
                <Select
                    mode="multiple"
                    allowClear
                    placeholder={gLang('ticketQuery.status')}
                    value={status}
                    style={{ minWidth: 140 }}
                    options={Object.values(TicketStatus).map(status => ({
                        value: status,
                        label: gLang(`ticket.status.${status}`),
                    }))}
                    onChange={value => setStatus([...value])}
                    onClear={() => setStatus([])}
                />
                <Select
                    mode="tags"
                    allowClear
                    placeholder={gLang('ticketQuery.advisorUid')}
                    value={advisorUid}
                    style={{ minWidth: 120 }}
                    options={[]}
                    onChange={value => setAdvisorUid(value)}
                    onClear={() => setAdvisorUid([])}
                    popupRender={menu => (
                        <>
                            {menu}
                            <Divider style={{ margin: '8px 0' }} />
                            <Space style={{ padding: '0 8px 4px' }}>
                                <Text type="secondary">{gLang('ticketQuery.advisorUidTips')}</Text>
                            </Space>
                        </>
                    )}
                />
                <Select
                    allowClear
                    placeholder={gLang('ticketQuery.priority')}
                    value={priority}
                    style={{ minWidth: 140 }}
                    options={[
                        TicketPriority.Upgrade,
                        TicketPriority.WeChatUnfreeze,
                        TicketPriority.MediaShop,
                        TicketPriority.MediaFast,
                        TicketPriority.MediaNormal,
                        TicketPriority.Vip4,
                        TicketPriority.Vip3,
                        TicketPriority.Normal,
                    ].map(p => ({
                        value: p,
                        label: '≥ ' + gLang(`ticket.priority.${p}`),
                    }))}
                    onSelect={value => setPriority(value)}
                    onClear={() => setPriority(undefined)}
                />
                {/*TODO 排序功能需要实现*/}
                <Select
                    value={sortBy}
                    onChange={value => setSortBy(value)}
                    style={{ minWidth: 180 }}
                    options={[
                        { value: 'tidDesc', label: gLang('ticketQuery.sortByTidDesc') },
                        { value: 'tidAsc', label: gLang('ticketQuery.sortByTidAsc') },
                        {
                            value: 'lastReplyDesc',
                            label: gLang('ticketQuery.sortByLastReplyDesc'),
                        },
                        { value: 'lastReplyAsc', label: gLang('ticketQuery.sortByLastReplyAsc') },
                        // 因为优先级是越小越大，所以这里文案反过来
                        { value: 'priorityDesc', label: gLang('ticketQuery.sortByPriorityAsc') },
                        { value: 'priorityAsc', label: gLang('ticketQuery.sortByPriorityDesc') },
                    ]}
                    prefix={<SortAscendingOutlined />}
                />

                <Button type="primary" onClick={handleSearch}>
                    {gLang('ticketQuery.search')}
                </Button>
                <Button
                    type="link"
                    onClick={toggleAdvanced}
                    icon={advancedOpen ? <UpOutlined /> : <DownOutlined />}
                >
                    {gLang('admin.ticketAdvancedSearch')}
                </Button>
                {isPC && (
                    <Tooltip title={gLang('admin.ticketNewWindow')}>
                        <Button
                            type="text"
                            icon={<ExportOutlined />}
                            onClick={() =>
                                navigate(type === 'media' ? '/media/ticket/query' : '/ticket/query')
                            }
                        />
                    </Tooltip>
                )}
            </Flex>

            {/* 高级搜索区域 */}
            {advancedOpen && (
                <div
                    style={{
                        marginBottom: 16,
                        padding: 16,
                        background: token.colorBgContainer,
                        borderRadius: token.borderRadiusLG,
                        border: `1px solid ${token.colorBorderSecondary}`,
                    }}
                >
                    <Space direction="vertical" size={12} style={{ width: '100%' }}>
                        {/* 搜索框和选项 */}
                        <Flex align="center" gap={8}>
                            <Input.Search
                                allowClear
                                value={searchKeyword}
                                onChange={e => setSearchKeyword(e.target.value)}
                                onSearch={handleSearch}
                                style={{ flex: 1 }}
                                prefix={<SearchOutlined />}
                            />

                            <Tooltip title={gLang('ticketQuery.useRegex')}>
                                <Button
                                    type={useRegex ? 'primary' : 'default'}
                                    icon={<CodeOutlined />}
                                    onClick={() => setUseRegex(!useRegex)}
                                />
                            </Tooltip>
                        </Flex>

                        <Flex gap={16}>
                            <Checkbox
                                checked={searchTitle}
                                onChange={e => setSearchTitle(e.target.checked)}
                            >
                                {gLang('ticketQuery.searchTitle')}
                            </Checkbox>

                            <Checkbox
                                checked={searchDetails}
                                onChange={e => setSearchDetails(e.target.checked)}
                            >
                                {gLang('ticketQuery.searchDetails')}
                            </Checkbox>
                        </Flex>

                        {/* 日期筛选 */}
                        <div
                            ref={datePickerContainerRef}
                            style={{ position: 'relative', width: '100%' }}
                        >
                            {isPC ? (
                                <DatePicker.RangePicker
                                    allowClear
                                    value={createdAtRange}
                                    onChange={dates => setCreatedAtRange(dates ?? [null, null])}
                                    style={{ width: '100%' }}
                                    placeholder={[
                                        gLang('ticketQuery.createdAtStart'),
                                        gLang('ticketQuery.createdAtEnd'),
                                    ]}
                                    getPopupContainer={getPopupContainer}
                                />
                            ) : (
                                <Flex gap={8}>
                                    <DatePicker
                                        allowClear
                                        value={createdAtRange[0]}
                                        onChange={date =>
                                            setCreatedAtRange([date, createdAtRange[1]])
                                        }
                                        style={{ flex: 1, minWidth: 0 }}
                                        placeholder={gLang('ticketQuery.createdAtStart')}
                                        getPopupContainer={getPopupContainer}
                                        inputReadOnly={true}
                                        popupStyle={{
                                            maxWidth: '90vw',
                                            position: 'fixed',
                                            zIndex: 1050,
                                        }}
                                    />
                                    <span style={{ margin: '0 4px' }}>-</span>
                                    <DatePicker
                                        allowClear
                                        value={createdAtRange[1]}
                                        onChange={date =>
                                            setCreatedAtRange([createdAtRange[0], date])
                                        }
                                        style={{ flex: 1, minWidth: 0 }}
                                        placeholder={gLang('ticketQuery.createdAtEnd')}
                                        getPopupContainer={getPopupContainer}
                                        inputReadOnly={true}
                                        popupStyle={{
                                            maxWidth: '90vw',
                                            position: 'fixed',
                                            zIndex: 1050,
                                        }}
                                    />
                                </Flex>
                            )}
                        </div>
                    </Space>
                </div>
            )}

            {/* 工单列表 */}
            <TicketListComponent
                tickets={
                    updatedTickets && updatedTickets.length > 0
                        ? updatedTickets.filter(filterTickets)
                        : []
                }
                to={ticket => toTicketUrl + ticket.tid}
                style={{ width: '100%' }}
                loading={spinning}
                selectedTid={tid}
                highlightColor={token.colorPrimary}
                subTitle={ticket => {
                    return `TID#${ticket.tid} - ${ltransTicketPriority(ticket.priority)}`;
                }}
            />

            {hasMore && (
                <Button block type={'dashed'} loading={loadingMore} onClick={handleLoadMore}>
                    {gLang('ticketQuery.loadMore')}
                </Button>
            )}
        </Space>
    );
};

export default TicketQuery;
