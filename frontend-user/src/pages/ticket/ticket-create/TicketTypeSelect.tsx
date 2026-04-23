import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Col, Modal, Row, Typography } from 'antd';
import {
    ArrowLeftOutlined,
    CloudOutlined,
    EditOutlined,
    NotificationOutlined,
    UploadOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import Wrapper from '@common/components/Wrapper/Wrapper';
import { gLang } from '@common/language';
import { useTheme } from '@common/contexts/ThemeContext';
import usePageTitle from '@common/hooks/usePageTitle';
import TicketForm, {
    TicketFormInitialMediaActivityKey,
    TicketFormInitialMediaEvent,
} from '../ticket-list/components/TicketForm';
import TicketTypeSelector, {
    getTicketTypeGroups,
    getTicketTypesOnNewTicketPage,
} from '../ticket-list/components/TicketTypeSelector';
import styles from '../ticket-list/components/TicketForm.module.css';
import { TicketType } from '@ecuc/shared/types/ticket.types';

/** 将误用第二个 ? 连接参数的情况转为标准查询串（如 ?type=ME?event=wechat → ?type=ME&event=wechat） */
const normalizeSearchForParams = (search: string): string => {
    if (!search || search === '?') {
        return '';
    }
    const body = search.startsWith('?') ? search.slice(1) : search;
    const chunks = body.split('?');
    if (chunks.length <= 1) {
        return search.startsWith('?') ? search : `?${body}`;
    }
    return `?${chunks[0]}&${chunks.slice(1).join('&')}`;
};

const TicketTypeSelect: React.FC = () => {
    usePageTitle();
    const navigate = useNavigate();
    const location = useLocation();
    const locationState =
        (location.state as { preselectedType?: TicketType; fromFeedbackCenter?: boolean } | null) ??
        null;
    const searchParams = new URLSearchParams(normalizeSearchForParams(location.search));
    const { isDark } = useTheme();
    const ticketTypeGroups = useMemo(() => getTicketTypeGroups((key: string) => gLang(key)), []);
    const selectableTypesOnNewPage = useMemo(
        () => new Set(getTicketTypesOnNewTicketPage()),
        []
    );
    const [selectedType, setSelectedType] = useState<TicketType | undefined>();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isMediaActivityModalOpen, setIsMediaActivityModalOpen] = useState(false);
    const [selectedMediaActivityKey, setSelectedMediaActivityKey] =
        useState<TicketFormInitialMediaActivityKey | undefined>(undefined);

    const rawQueryType = searchParams.get('type');
    const queryType =
        rawQueryType && selectableTypesOnNewPage.has(rawQueryType as TicketType)
            ? (rawQueryType as TicketType)
            : null;
    const statePreselect = locationState?.preselectedType;
    const stateType =
        statePreselect && selectableTypesOnNewPage.has(statePreselect) ? statePreselect : undefined;
    const preselectedType = stateType ?? queryType ?? undefined;

    const rawEvent = searchParams.get('event')?.trim().toLowerCase();
    const queryMediaEvent: TicketFormInitialMediaEvent | undefined =
        rawEvent === 'wechat' || rawEvent === 'rednote' || rawEvent === 'other'
            ? rawEvent
            : undefined;
    const queryMediaActivityFromEvent: TicketFormInitialMediaActivityKey | undefined =
        queryMediaEvent === 'wechat'
            ? 'ECNET_LIKE'
            : queryMediaEvent === 'rednote'
              ? 'ECXHS_POST'
              : queryMediaEvent === 'other'
                ? 'OTHER'
                : undefined;
    const initialMediaEventForForm =
        selectedType === TicketType.MediaEvents && queryMediaEvent ? queryMediaEvent : undefined;
    const fromFeedbackCenter =
        locationState?.fromFeedbackCenter === true || searchParams.get('from') === 'feedback';
    const isFeedbackSuggestionEntry =
        fromFeedbackCenter && preselectedType === TicketType.Suggestion;

    useEffect(() => {
        if (isFeedbackSuggestionEntry) {
            return;
        }
        if (!preselectedType) {
            return;
        }

        setSelectedType(preselectedType);
        if (preselectedType === TicketType.MediaEvents) {
            if (queryMediaActivityFromEvent) {
                setSelectedMediaActivityKey(queryMediaActivityFromEvent);
                setIsModalOpen(true);
                setIsMediaActivityModalOpen(false);
                return;
            }
            setIsMediaActivityModalOpen(true);
            setIsModalOpen(false);
            return;
        }
        setIsModalOpen(true);
    }, [isFeedbackSuggestionEntry, preselectedType, queryMediaActivityFromEvent]);

    const handleTypeSelect = (type: TicketType) => {
        setSelectedType(type);
        if (type === TicketType.MediaEvents) {
            setIsMediaActivityModalOpen(true);
            setIsModalOpen(false);
            setSelectedMediaActivityKey(undefined);
            return;
        }
        setIsModalOpen(true);
    };

    const handleMediaActivitySelect = (activityKey: TicketFormInitialMediaActivityKey) => {
        setSelectedMediaActivityKey(activityKey);
        setIsMediaActivityModalOpen(false);
        setIsModalOpen(true);
    };

    const handleModalToggle = (open: boolean) => {
        setIsModalOpen(open);
        if (!open) {
            setIsMediaActivityModalOpen(false);
            setSelectedMediaActivityKey(undefined);
            if (fromFeedbackCenter) {
                navigate('/feedback');
                return;
            }
            setSelectedType(undefined);
        }
    };

    const handleMediaActivityModalToggle = (open: boolean) => {
        setIsMediaActivityModalOpen(open);
        if (!open && !isModalOpen) {
            if (fromFeedbackCenter) {
                navigate('/feedback');
                return;
            }
            setSelectedType(undefined);
            setSelectedMediaActivityKey(undefined);
        }
    };

    const mediaActivityCards: Array<{
        key: TicketFormInitialMediaActivityKey;
        title: string;
        summary: string;
        icon: React.ReactNode;
        color: string;
        shadow: string;
    }> = [
        {
            key: 'ECNET_LIKE',
            title: gLang('ticketList.quickInsertListTitle.ECNET_LIKE'),
            summary: gLang('ticketList.mediaEventSummary.ECNET_LIKE'),
            icon: <NotificationOutlined />,
            color: '#13C2C2',
            shadow: 'rgba(19, 194, 194, 0.28)',
        },
        {
            key: 'ECXHS_POST',
            title: gLang('ticketList.quickInsertListTitle.ECXHS_POST'),
            summary: gLang('ticketList.mediaEventSummary.ECXHS_POST'),
            icon: <EditOutlined />,
            color: '#F759AB',
            shadow: 'rgba(247, 89, 171, 0.28)',
        },
        {
            key: 'CLOUD_MATERIAL',
            title: gLang('ticketList.quickInsertListTitle.CLOUD_MATERIAL'),
            summary: gLang('ticketList.mediaEventSummary.CLOUD_MATERIAL'),
            icon: <CloudOutlined />,
            color: '#2F54EB',
            shadow: 'rgba(47, 84, 235, 0.3)',
        },
        {
            key: 'OTHER',
            title: gLang('ticketList.quickInsertListTitle.OTHER'),
            summary: gLang('ticketList.mediaEventSummary.OTHER'),
            icon: <UploadOutlined />,
            color: '#52C41A',
            shadow: 'rgba(82, 196, 26, 0.3)',
        },
    ];

    if (isFeedbackSuggestionEntry) {
        return (
            <Wrapper>
                <div
                    style={{
                        marginBottom: 16,
                        opacity: 0,
                        transform: 'translateY(-10px)',
                        animation: 'fadeInUp 0.5s ease-in-out forwards',
                    }}
                >
                    <Button
                        type="link"
                        icon={<ArrowLeftOutlined />}
                        onClick={() => navigate('/feedback')}
                    >
                        {gLang('ticketList.backToList')}
                    </Button>
                </div>

                <Typography>
                    <Alert
                        type="info"
                        showIcon
                        style={{ marginBottom: 16 }}
                        message={gLang('ticketList.feedbackSuggestionEntryTitle')}
                        description={gLang('ticketList.feedbackSuggestionEntryDesc')}
                    />

                    <TicketForm
                        setIsModalOpen={() => undefined}
                        initialType={TicketType.Suggestion}
                        hideTypeSelector
                    />
                </Typography>
            </Wrapper>
        );
    }

    return (
        <Wrapper>
            <div
                style={{
                    marginBottom: 16,
                    opacity: 0,
                    transform: 'translateY(-10px)',
                    animation: 'fadeInUp 0.5s ease-in-out forwards',
                }}
            >
                <Button
                    type="link"
                    icon={<ArrowLeftOutlined />}
                    onClick={() => navigate(fromFeedbackCenter ? '/feedback' : '/ticket')}
                >
                    {gLang('ticketList.backToList')}
                </Button>
            </div>
            <Typography>
                <div className={styles.ticketLayout}></div>
                {fromFeedbackCenter && (
                    <Alert
                        type="info"
                        showIcon
                        style={{ marginBottom: 16 }}
                        message={gLang('ticketList.feedbackSuggestionEntryTitle')}
                        description={gLang('ticketList.feedbackSuggestionEntryDesc')}
                    />
                )}
                <TicketTypeSelector
                    groups={ticketTypeGroups}
                    isDark={isDark}
                    value={selectedType}
                    onChange={setSelectedType}
                    onTypeSelect={handleTypeSelect}
                />
            </Typography>
            <Modal
                title={
                    fromFeedbackCenter && selectedType === TicketType.Suggestion
                        ? gLang('ticketList.feedbackSuggestionEntryAction')
                        : gLang('ticketList.newBtn')
                }
                open={isModalOpen}
                onCancel={() => handleModalToggle(false)}
                footer={null}
                destroyOnHidden
            >
                {selectedType && (
                    <TicketForm
                        setIsModalOpen={handleModalToggle}
                        initialType={selectedType}
                        hideTypeSelector
                        initialMediaEvent={initialMediaEventForForm}
                        initialMediaActivityKey={
                            selectedType === TicketType.MediaEvents
                                ? selectedMediaActivityKey
                                : undefined
                        }
                    />
                )}
            </Modal>
            <Modal
                title={gLang('ticketList.activity')}
                open={isMediaActivityModalOpen}
                onCancel={() => handleMediaActivityModalToggle(false)}
                footer={null}
                destroyOnHidden
            >
                <Row gutter={[12, 12]}>
                    {mediaActivityCards.map(item => (
                        <Col key={item.key} xs={24} sm={12}>
                            <Button
                                type="text"
                                block
                                onClick={() => handleMediaActivitySelect(item.key)}
                                style={{
                                    height: 'auto',
                                    borderRadius: 14,
                                    border: '1px solid rgba(0,0,0,0.08)',
                                    boxShadow: `0 2px 8px ${item.shadow}`,
                                    padding: '14px 16px',
                                    textAlign: 'left',
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        gap: 10,
                                        alignItems: 'flex-start',
                                    }}
                                >
                                    <span
                                        style={{
                                            width: 36,
                                            height: 36,
                                            borderRadius: 10,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#fff',
                                            background: item.color,
                                        }}
                                    >
                                        {item.icon}
                                    </span>
                                    <span>
                                        <div
                                            style={{
                                                fontWeight: 600,
                                                color: 'rgba(0,0,0,0.88)',
                                            }}
                                        >
                                            {item.title}
                                        </div>
                                        <div
                                            style={{
                                                marginTop: 6,
                                                fontSize: 12,
                                                color: 'rgba(0,0,0,0.55)',
                                                lineHeight: 1.5,
                                            }}
                                        >
                                            {item.summary}
                                        </div>
                                    </span>
                                </div>
                            </Button>
                        </Col>
                    ))}
                </Row>
            </Modal>
        </Wrapper>
    );
};

export default TicketTypeSelect;
