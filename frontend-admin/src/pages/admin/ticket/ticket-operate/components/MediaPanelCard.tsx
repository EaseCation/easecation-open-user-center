// 媒体面板统一卡片：标题展示关键信息，集成媒体面板入口、E点发放与更换兑奖账号

import React, { useEffect, useState } from 'react';
import {
    Button,
    Card,
    Form,
    InputNumber,
    Modal,
    Space,
    Tag,
    Typography,
    Spin,
    message,
} from 'antd';
import { IdcardOutlined, EyeOutlined, UpOutlined, DownOutlined } from '@ant-design/icons';
import { gLang } from '@common/language';
import { getGlobalMessageApi } from '@common/utils/messageApiHolder';
import { Ticket, TicketType } from '@ecuc/shared/types/ticket.types';
import { UserBindMediaWithFullData, MediaStatus } from '@ecuc/shared/types/media.types';
import MediaPanelComponent from '../../../media/media-list/components/MediaPanelComponent';
import { getStatusNumber } from '../../../media/media-list/AdminMediaList';
import { fetchData } from '@common/axiosConfig';
import { ticketWithCreator } from '../../../../../config/ticketConfig';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

interface MediaPanelCardProps {
    ticket: Ticket;
    onRefresh: () => Promise<void>;
}

const MediaPanelCard: React.FC<MediaPanelCardProps> = ({ ticket, onRefresh }) => {
    const [collapsed, setCollapsed] = useState(false);
    const [previewMediaOpenid, setPreviewMediaOpenid] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [mediaData, setMediaData] = useState<UserBindMediaWithFullData | null>(null);
    const [isEpointValid, setIsEpointValid] = useState<boolean>(true);
    const [form] = Form.useForm();
    const [messageApi, messageContextHolder] = message.useMessage();

    const actualMediaID = mediaData?.id?.toString() || '';
    const mediaStatus = mediaData?.status || '0';
    const titleText = `${gLang('mediaUser.id')}: ${actualMediaID || gLang('admin.mediaPanelNone')}`;
    const hasValidMediaID = !!actualMediaID;

    useEffect(() => {
        setIsLoading(true);
        fetchData({
            url: '/media/detail',
            method: 'GET',
            data: { mid: '', openid: ticket.creator_openid },
            setData: setMediaData,
            setSpin: setIsLoading,
        }).finally(() => setIsLoading(false));
    }, [ticket.creator_openid]);

    const handleGiveEpoints = async () => {
        try {
            setIsLoading(true);
            const values = await form.validateFields();
            const epoints = typeof values.epoints === 'number' ? values.epoints : 0;
            if (epoints <= 0) {
                messageApi.error(gLang('admin.mediaPanelEpointInvalid'));
                return;
            }
            await fetchData({
                url: '/media/giveEpoints',
                method: 'POST',
                data: { tid: ticket.tid, openID: ticket.creator_openid, epoints },
                setData: () => {
                    messageApi.success(gLang('admin.mediaPanelEpointSuccess'));
                    onRefresh?.();
                },
            });
        } catch {
            messageApi.error(gLang('admin.mediaPanelEpointError'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleGiveMonthlyGift = async () => {
        try {
            setIsLoading(true);
            await fetchData({
                url: '/media/giveMonthlyGift',
                method: 'POST',
                data: { tid: ticket.tid, openID: ticket.creator_openid },
                setData: () => {
                    messageApi.success(gLang('admin.mediaPanelMonthlySuccess'));
                    onRefresh?.();
                },
            });
        } catch (err: any) {
            const errorMessage =
                err?.response?.data?.message ||
                err?.response?.data?.EPF_description ||
                err?.EPF_description;
            if (errorMessage) {
                messageApi.error(errorMessage);
            } else {
                messageApi.error(gLang('admin.mediaPanelMonthlyError'));
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateECID = async () => {
        try {
            setIsLoading(true);
            await fetchData({
                url: '/media/updateECID',
                method: 'POST',
                data: { tid: ticket.tid },
                setData: () => {
                    messageApi.success(gLang('mediaUpdateTicket.submitButton'));
                    onRefresh?.();
                },
            });
        } catch {
            messageApi.error(gLang('admin.mediaPanelStatusError'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card
            size="small"
            styles={{
                header: { padding: '8px 12px' },
                body: collapsed ? { padding: 0, display: 'none' } : { padding: 12 },
            }}
            title={
                <Space size={8} align="center" wrap>
                    <Space
                        size={6}
                        wrap
                        direction={window.innerWidth < 480 ? 'vertical' : 'horizontal'}
                        align={window.innerWidth < 480 ? 'start' : 'center'}
                    >
                        <Space size={6} align="center" wrap={false}>
                            <IdcardOutlined />
                            <Typography.Text
                                style={{
                                    fontSize: 16,
                                    fontWeight: 600,
                                    textDecoration: 'underline',
                                    textDecorationStyle: 'dotted',
                                    textUnderlineOffset: 2,
                                    textDecorationThickness: 1,
                                    cursor: 'pointer',
                                    ...(window.innerWidth < 480 ? { display: 'block' } : {}),
                                }}
                                onClick={() => {
                                    const api = getGlobalMessageApi();
                                    const copyText = actualMediaID || gLang('admin.mediaPanelNone');
                                    if (
                                        navigator &&
                                        navigator.clipboard &&
                                        navigator.clipboard.writeText
                                    ) {
                                        navigator.clipboard
                                            .writeText(copyText)
                                            .then(() => api?.success(gLang('common.copySuccess')))
                                            .catch(() => api?.error(gLang('common.copyFailed')));
                                    } else {
                                        try {
                                            const textarea = document.createElement('textarea');
                                            textarea.value = copyText;
                                            document.body.appendChild(textarea);
                                            textarea.select();
                                            document.execCommand('copy');
                                            document.body.removeChild(textarea);
                                            api?.success(gLang('common.copySuccess'));
                                        } catch {
                                            api?.error(gLang('common.copyFailed'));
                                        }
                                    }
                                }}
                                title={gLang('common.copy')}
                            >
                                {titleText}
                            </Typography.Text>
                        </Space>
                        <Space size={4} wrap>
                            <Tag color="blue">{gLang('ticketOperate.modifyMedia')}</Tag>
                        </Space>
                    </Space>
                </Space>
            }
            extra={
                <Button
                    type="text"
                    size="small"
                    icon={collapsed ? <DownOutlined /> : <UpOutlined />}
                    onClick={() => setCollapsed(prev => !prev)}
                    title={collapsed ? gLang('common.switch.open') : gLang('common.switch.close')}
                />
            }
        >
            {/* 若无有效媒体数据则不渲染 */}
            {!collapsed && ticket && ticketWithCreator(ticket) && (
                <Spin spinning={isLoading}>
                    {messageContextHolder}
                    <Space direction="vertical" style={{ width: '100%' }} size="small">
                        {/* 创作者信息展示 */}
                        <Space size={8} wrap>
                            <Tag
                                color={
                                    mediaStatus === MediaStatus.ExcellentCreator
                                        ? 'green'
                                        : mediaStatus === MediaStatus.ActiveCreator
                                          ? 'blue'
                                          : mediaStatus === MediaStatus.ExpiredCreator
                                            ? 'orange'
                                            : mediaStatus === MediaStatus.Frozen
                                              ? 'red'
                                              : mediaStatus === MediaStatus.PendingReview
                                                ? 'purple'
                                                : 'default'
                                }
                            >
                                {String(mediaStatus)}{' '}
                                {gLang(
                                    `mediaPanel.status.${getStatusNumber(String(mediaStatus))}`
                                )}
                            </Tag>
                            <Tag color="gold">
                                {gLang('mediaPanel.EBalance')}:{' '}
                                {mediaData?.EBalance !== undefined ? mediaData.EBalance : '-'}
                            </Tag>
                            <Tag color="cyan">
                                {gLang('mediaPanel.expire_date')}:{' '}
                                {mediaData?.expireDate
                                    ? dayjs.utc(mediaData.expireDate).local().format('YYYY-MM-DD')
                                    : '-'}
                            </Tag>
                            <Tag color="default">
                                {gLang('mediaPanel.lastReviewed')}:{' '}
                                {mediaData?.lastReviewed
                                    ? dayjs.utc(mediaData.lastReviewed).local().format('YYYY-MM-DD')
                                    : '-'}
                            </Tag>
                        </Space>
                        
                        <Space size={8} wrap>
                            <Button
                                icon={<EyeOutlined />}
                                onClick={() => setPreviewMediaOpenid(ticket.creator_openid)}
                                disabled={!hasValidMediaID}
                            >
                                {gLang('ticketOperate.modifyMedia')}
                            </Button>
                            {mediaStatus === '3' && (
                                <Button
                                    type="default"
                                    onClick={handleGiveMonthlyGift}
                                    loading={isLoading}
                                    disabled={!hasValidMediaID}
                                >
                                    {gLang('admin.mediaPanelGiveMonthly')}
                                </Button>
                            )}
                            {[TicketType.MediaUpdate].includes(ticket.type) && (
                                <Button
                                    onClick={handleUpdateECID}
                                    loading={isLoading}
                                    disabled={!hasValidMediaID}
                                >
                                    {gLang('mediaUpdateTicket.submitButton')}
                                </Button>
                            )}
                        </Space>

                        {[
                            TicketType.MediaMonthlyReport,
                            TicketType.MediaApplyBinding,
                            TicketType.MediaEvents,
                        ].includes(ticket.type) && (
                            <Form
                                form={form}
                                layout="vertical"
                                onValuesChange={(_, allValues) => {
                                    const value = allValues.epoints;
                                    setIsEpointValid(Number.isInteger(value) && value > 0);
                                }}
                            >
                                <Space direction="vertical" style={{ width: '100%' }} size="small">
                                    <Space.Compact style={{ width: '100%' }}>
                                        <Form.Item
                                            name="epoints"
                                            rules={[
                                                {
                                                    required: true,
                                                    message: gLang(
                                                        'admin.mediaPanelEpointPlaceholder'
                                                    ),
                                                },
                                                {
                                                    type: 'number',
                                                    min: 1,
                                                    message: gLang(
                                                        'admin.mediaPanelEpointPositive'
                                                    ),
                                                },
                                                {
                                                    validator: (_, value) => {
                                                        if (value && !Number.isInteger(value)) {
                                                            return Promise.reject(
                                                                gLang(
                                                                    'admin.mediaPanelEpointInteger'
                                                                )
                                                            );
                                                        }
                                                        return Promise.resolve();
                                                    },
                                                },
                                            ]}
                                            initialValue={10}
                                            style={{ marginBottom: '12px', flex: 1 }}
                                        >
                                            <InputNumber
                                                placeholder={gLang(
                                                    'admin.mediaPanelEpointPlaceholder'
                                                )}
                                                min={1}
                                                style={{ width: '100%' }}
                                                step={1}
                                                onKeyDown={e => {
                                                    if (
                                                        e.key === 'Enter' &&
                                                        isEpointValid &&
                                                        !isLoading
                                                    ) {
                                                        handleGiveEpoints();
                                                    }
                                                }}
                                            />
                                        </Form.Item>
                                        <Button
                                            type="primary"
                                            onClick={handleGiveEpoints}
                                            loading={isLoading}
                                            disabled={
                                                !hasValidMediaID || !isEpointValid || isLoading
                                            }
                                        >
                                            {gLang('mediaPanel.giveEpoints')}
                                        </Button>
                                    </Space.Compact>

                                    {/* 顶部已放置“发放月礼包/同意修改ECID”，这里不再重复 */}
                                </Space>
                            </Form>
                        )}

                        <Modal
                            title={gLang('ticketOperate.modifyMedia')}
                            open={!!previewMediaOpenid}
                            onCancel={() => setPreviewMediaOpenid(null)}
                            footer={null}
                            centered
                            width={900}
                        >
                            <MediaPanelComponent openid={previewMediaOpenid ?? ''} />
                        </Modal>
                    </Space>
                </Spin>
            )}
        </Card>
    );
};

export default MediaPanelCard;
