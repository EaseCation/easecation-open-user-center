import React from 'react';
import { Card, Statistic, Typography } from 'antd';
import { Link } from 'react-router-dom';
import styles from '../admin-dashboard/Admin.module.css';

type AdminStatLinkItemProps = {
    to: string;
    count?: number;
    isPC: boolean;
    icon: React.ReactNode;
    title: React.ReactNode;
    onClick?: () => void;
    loading?: boolean;
    showValue?: boolean;
    buttonText?: React.ReactNode;
};

const AdminStatLinkItem: React.FC<AdminStatLinkItemProps> = props => {
    const { to, count = 0, isPC, icon, title, onClick, loading, showValue = true, buttonText } = props;

    const pending = count > 0;
    const valueStyle = count === 0 ? { color: 'var(--ant-color-text-secondary)' } : undefined;

    const renderContent = () =>
        showValue ? (
            <div>
                <Statistic
                    loading={!!loading}
                    title={title}
                    value={count}
                    prefix={icon}
                    valueStyle={valueStyle}
                />
                {buttonText && (
                    <Typography.Text
                        type="secondary"
                        style={{ fontSize: 12, marginTop: 4, display: 'inline-block' }}
                    >
                        {buttonText}
                    </Typography.Text>
                )}
            </div>
        ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{icon}</span>
                <Typography.Text>{title}</Typography.Text>
            </div>
        );

    const interactiveProps = onClick
        ? {
              role: 'button' as const,
              tabIndex: 0,
              onClick,
              onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onClick();
                  }
              },
          }
        : undefined;

    const cardClassName = isPC
        ? `${styles.adminTicketCard} ${pending && showValue ? styles.adminTicketCardPending : ''}`.trim()
        : `${styles.adminTicketCard} ${styles.adminTicketCardMobile} ${pending && showValue ? styles.adminTicketCardPending : ''}`.trim();

    if (onClick) {
        return (
            <div style={{ width: '100%' }} {...interactiveProps}>
                <Card className={cardClassName} variant="outlined" hoverable>
                    {renderContent()}
                </Card>
            </div>
        );
    }

    return (
        <Link to={to} style={{ width: '100%' }}>
            <Card className={cardClassName} variant="outlined" hoverable>
                {renderContent()}
            </Card>
        </Link>
    );
};

export default AdminStatLinkItem;
