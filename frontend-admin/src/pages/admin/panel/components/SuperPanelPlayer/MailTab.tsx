import React from 'react';
import { Button, Card, Descriptions, Popconfirm, Space, Spin, Typography } from 'antd';
import { gLang } from '@common/language';
import { convertUTCToFormat } from '@common/components/TimeConverter';

const { Title, Text } = Typography;

interface MailTabProps {
    playerMailHistory: any[] | undefined;
    spinningMail: boolean;
    onDeleteMail?: (idmail: number) => Promise<void>;
}

export const MailTab: React.FC<MailTabProps> = ({ playerMailHistory, spinningMail, onDeleteMail }) => (
    <Spin spinning={spinningMail}>
        <Space orientation="vertical" style={{ width: '100%' }}>
            <Title level={5}>{gLang('superPanel.title.mail')}</Title>
            {playerMailHistory?.map(mail => (
                <Card
                    key={mail.idmail}
                    extra={
                        !mail.readtime && onDeleteMail ? (
                            <Popconfirm
                                title={gLang('admin.deleteMailConfirm')}
                                onConfirm={() => onDeleteMail(mail.idmail)}
                                okText={gLang('admin.banYes')}
                                cancelText={gLang('admin.banNo')}
                            >
                                <Button size="small" danger>{gLang('admin.deleteMail')}</Button>
                            </Popconfirm>
                        ) : null
                    }
                >
                    <Text disabled>
                        #{mail.idmail} @{' '}
                        {mail.readtime
                            ? convertUTCToFormat(mail.readtime)
                            : gLang('admin.mailUnread')}
                    </Text>
                    <Descriptions size="small" column={{ xs: 1, sm: 2 }} style={{ marginTop: 8 }}>
                        <Descriptions.Item label={gLang('superPanel.item.sender')}>
                            {mail.addresser}
                        </Descriptions.Item>
                        <Descriptions.Item label={gLang('superPanel.item.recipient')}>
                            {mail.addressee}
                        </Descriptions.Item>
                        <Descriptions.Item label={gLang('superPanel.item.title')} span={2}>
                            <Text
                                ellipsis={{ tooltip: mail.title }}
                                style={{ maxWidth: '100%', display: 'block' }}
                            >
                                {mail.title}
                            </Text>
                        </Descriptions.Item>
                        <Descriptions.Item label={gLang('superPanel.item.content')} span={2}>
                            <Text
                                ellipsis={{ tooltip: mail.content }}
                                style={{ maxWidth: '100%', display: 'block' }}
                            >
                                {mail.content}
                            </Text>
                        </Descriptions.Item>
                        {mail.gift && (
                            <Descriptions.Item label={gLang('superPanel.item.gift')} span={2}>
                                {/* gift 在后端格式化为逗号分隔的字符串，uc直接显示 */}
                                {mail.gift.replace(/,/g, ', ')}
                            </Descriptions.Item>
                        )}
                        <Descriptions.Item label={gLang('superPanel.item.autoshow')}>
                            {mail.autoshow ? gLang('admin.banYes') : gLang('admin.banNo')}
                        </Descriptions.Item>
                    </Descriptions>
                </Card>
            ))}
        </Space>
    </Spin>
);
