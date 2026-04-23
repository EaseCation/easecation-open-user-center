import React from 'react';
import {
    AlertOutlined,
    AppstoreAddOutlined,
    BulbOutlined,
    CustomerServiceOutlined,
    FlagOutlined,
    GiftOutlined,
    SafetyCertificateOutlined,
    TeamOutlined,
    TrophyOutlined,
    UnlockOutlined,
} from '@ant-design/icons';
import clsx from 'clsx';
import { TicketType } from '@ecuc/shared/types/ticket.types';
import styles from './TicketForm.module.css';

export interface TicketTypeItem {
    type: TicketType;
    label: string;
    summary: string;
    icon: React.ReactNode;
    accent: string;
    shadow: string;
}

export interface TicketTypeGroup {
    key: string;
    title: string;
    description: string;
    items: TicketTypeItem[];
}

interface TicketTypeSelectorProps {
    value?: TicketType;
    onChange?: (value: TicketType) => void;
    onTypeSelect?: (value: TicketType) => void;
    groups: TicketTypeGroup[];
    isDark: boolean;
}

export const TicketTypeSelector: React.FC<TicketTypeSelectorProps> = ({
    value,
    onChange,
    onTypeSelect,
    groups,
    isDark,
}) => {
    const handleSelect = (type: TicketType) => {
        onChange?.(type);
        onTypeSelect?.(type);
    };

    return (
        <div className={styles.typeSelector}>
            {groups.map((group, groupIndex) => {
                const groupDelay = groupIndex * 0.15;
                return (
                    <section
                        key={group.key}
                        className={styles.typeGroup}
                        style={{
                            opacity: 0,
                            transform: 'translateY(10px)',
                            animation: `fadeInUp 0.5s ease-in-out ${groupDelay}s forwards`,
                        }}
                    >
                        <header className={styles.typeGroupHeader}>
                            <h3
                                className={clsx(
                                    styles.typeGroupTitle,
                                    isDark && styles.typeGroupTitleDark
                                )}
                            >
                                {group.title}
                            </h3>
                            <p
                                className={clsx(
                                    styles.typeGroupDesc,
                                    isDark && styles.typeGroupDescDark
                                )}
                            >
                                {group.description}
                            </p>
                        </header>
                        <div className={styles.typeGrid}>
                            {group.items.map((item, itemIndex) => {
                                const isSelected = value === item.type;
                                const cardDelay = groupDelay + 0.1 + itemIndex * 0.05;
                                return (
                                    <button
                                        type="button"
                                        key={item.type}
                                        onClick={() => handleSelect(item.type)}
                                        aria-pressed={isSelected}
                                        className={clsx(
                                            styles.typeCard,
                                            isSelected && styles.typeCardSelected,
                                            isDark && styles.typeCardDark
                                        )}
                                        style={
                                            {
                                                '--ticket-accent': item.accent,
                                                '--ticket-shadow': item.shadow,
                                                opacity: 0,
                                                transform: 'translateY(10px)',
                                                animation: `fadeInUp 0.5s ease-in-out ${cardDelay}s forwards`,
                                            } as React.CSSProperties
                                        }
                                    >
                                        <span className={styles.typeIcon}>{item.icon}</span>
                                        <span className={styles.typeName}>{item.label}</span>
                                        <span
                                            className={clsx(
                                                styles.typeDesc,
                                                isDark && styles.typeDescDark
                                            )}
                                        >
                                            {item.summary}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                );
            })}
        </div>
    );
};

export const getTicketTypeGroups = (translate: (key: string) => string): TicketTypeGroup[] => [
    {
        key: 'support',
        title: translate('ticketList.typeGroups.support.title'),
        description: translate('ticketList.typeGroups.support.description'),
        items: [
            {
                type: TicketType.ReportPlayer,
                label: translate('ticket.type.RP'),
                summary: translate('ticketList.typeSummary.RP'),
                icon: <AlertOutlined />,
                accent: '#FF7A45',
                shadow: 'rgba(255, 122, 69, 0.35)',
            },
            {
                type: TicketType.ResendProduct,
                label: translate('ticket.type.SP'),
                summary: translate('ticketList.typeSummary.SP'),
                icon: <GiftOutlined />,
                accent: '#13C2C2',
                shadow: 'rgba(19, 194, 194, 0.3)',
            },
            {
                type: TicketType.Consultation,
                label: translate('ticket.type.OP'),
                summary: translate('ticketList.typeSummary.OP'),
                icon: <CustomerServiceOutlined />,
                accent: '#9254DE',
                shadow: 'rgba(146, 84, 222, 0.32)',
            },
            {
                type: TicketType.Suggestion,
                label: translate('ticket.type.JY'),
                summary: translate('ticketList.typeSummary.JY'),
                icon: <BulbOutlined />,
                accent: '#FADB14',
                shadow: 'rgba(250, 219, 20, 0.28)',
            },
        ],
    },
    {
        key: 'security',
        title: translate('ticketList.typeGroups.security.title'),
        description: translate('ticketList.typeGroups.security.description'),
        items: [
            {
                type: TicketType.Argument,
                label: translate('ticket.type.AG'),
                summary: translate('ticketList.typeSummary.AG'),
                icon: <SafetyCertificateOutlined />,
                accent: '#FF4D4F',
                shadow: 'rgba(255, 77, 79, 0.32)',
            },
            {
                type: TicketType.WeChatUnfreeze,
                label: translate('ticket.type.AW'),
                summary: translate('ticketList.typeSummary.AW'),
                icon: <UnlockOutlined />,
                accent: '#2F54EB',
                shadow: 'rgba(47, 84, 235, 0.32)',
            },
            {
                type: TicketType.ReportStaff,
                label: translate('ticket.type.RS'),
                summary: translate('ticketList.typeSummary.RS'),
                icon: <TrophyOutlined />,
                accent: '#FA8C16',
                shadow: 'rgba(250, 140, 22, 0.32)',
            },
        ],
    },
    {
        key: 'feature',
        title: translate('ticketList.typeGroups.feature.title'),
        description: translate('ticketList.typeGroups.feature.description'),
        items: [
            {
                type: TicketType.Others,
                label: translate('ticket.type.OT'),
                summary: translate('ticketList.typeSummary.OT'),
                icon: <AppstoreAddOutlined />,
                accent: '#36CFC9',
                shadow: 'rgba(54, 207, 201, 0.32)',
            },
            {
                type: TicketType.MediaEvents,
                label: translate('ticket.type.ME'),
                summary: translate('ticketList.typeSummary.ME'),
                icon: <FlagOutlined />,
                accent: '#52C41A',
                shadow: 'rgba(82, 196, 26, 0.3)',
            },
            {
                type: TicketType.Application,
                label: translate('ticket.type.AP'),
                summary: translate('ticketList.typeSummary.AP'),
                icon: <TeamOutlined />,
                accent: '#722ED1',
                shadow: 'rgba(114, 46, 209, 0.32)',
            },
        ],
    },
];

/** 与新建工单页卡片一致的可选类型（用于 /ticket/new 深度链接校验） */
export const getTicketTypesOnNewTicketPage = (): TicketType[] =>
    getTicketTypeGroups(() => '').flatMap(group => group.items.map(item => item.type));

export default TicketTypeSelector;
