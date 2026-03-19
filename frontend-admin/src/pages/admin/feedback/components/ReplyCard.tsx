// 管理端社区风格的回复卡片组件

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Typography, Space, Tag, Image, Flex, Button, theme } from 'antd';
import { CrownOutlined } from '@ant-design/icons';
import { TicketDetail } from '@ecuc/shared/types/ticket.types';
import useDarkMode from '@common/hooks/useDarkMode';
import VideoPlayerComponent from '../../../../components/VideoPlayerComponent';
import { generateTemporaryUrl } from '@common/utils/uploadUtils';
import { Spin } from 'antd';
import dayjs from 'dayjs';
import { gLang } from '@common/language';

const { Text } = Typography;

interface ReplyCardProps {
    detail: TicketDetail;
    floorNumber: number;
}

// 附件预览组件
const AttachmentPreview: React.FC<{ attachments: string[] }> = ({ attachments }) => {
    const [urls, setUrls] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUrls = async () => {
            setLoading(true);
            const urlPromises = (attachments || []).map(async attachment => {
                try {
                    const fullUrl = attachment.startsWith('http')
                        ? attachment
                        : `https://ec-user-center.oss-cn-hangzhou.aliyuncs.com/${attachment}`;
                    const tempUrl = await generateTemporaryUrl(fullUrl);
                    return { [attachment]: tempUrl };
                } catch {
                    return { [attachment]: attachment };
                }
            });

            const results = await Promise.all(urlPromises);
            const finalUrlMap = results.reduce((acc, urlObj) => ({ ...acc, ...urlObj }), {});
            setUrls(finalUrlMap);
            setLoading(false);
        };
        fetchUrls();
    }, [attachments]);

    return (
        <Flex wrap gap="small" style={{ marginTop: 12 }}>
            <Image.PreviewGroup>
                {attachments?.map(attachment => {
                    const lowerAttachment = attachment.toLowerCase();
                    if (loading) {
                        return <Spin key={attachment} size="small" />;
                    } else if (lowerAttachment.match(/\.(mp4|mov|webm)$/)) {
                        return (
                            <VideoPlayerComponent
                                key={attachment}
                                src={urls[attachment] || ''}
                                width={80}
                                height={80}
                            />
                        );
                    } else if (lowerAttachment.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/)) {
                        return (
                            <Image
                                key={attachment}
                                width={80}
                                height={80}
                                src={urls[attachment] || ''}
                                style={{ borderRadius: 4 }}
                            />
                        );
                    } else {
                        return (
                            <Button
                                type="dashed"
                                key={attachment}
                                size="small"
                                onClick={() => window.open(urls[attachment] || '', '_blank')}
                            >
                                {(() => {
                                    const fileName = attachment.substring(
                                        attachment.lastIndexOf('/') + 1
                                    );
                                    const pattern = /^(\d{14})_(.+)$/;
                                    const match = fileName.match(pattern);
                                    if (match) {
                                        const dateTime = dayjs(match[1], 'YYYYMMDDHHmmss').format(
                                            'MM-DD HH:mm'
                                        );
                                        return `[${dateTime}] ${match[2]}`;
                                    }
                                    return fileName.length > 20
                                        ? fileName.substring(0, 20) + '...'
                                        : fileName;
                                })()}
                            </Button>
                        );
                    }
                })}
            </Image.PreviewGroup>
        </Flex>
    );
};

// 回复内容区表格/代码块/删除线样式（与用户端一致，仅支持 Markdown 解析后的 HTML）
const FEEDBACK_REPLY_CONTENT_STYLE = `
.feedback-reply-content table { border-collapse: collapse; width: 100%; margin: 8px 0; }
.feedback-reply-content th, .feedback-reply-content td { border: 1px solid #d9d9d9; padding: 6px 8px; text-align: left; }
.feedback-reply-content th { background: rgba(0,0,0,0.02); font-weight: 600; }
.feedback-reply-content pre { margin: 8px 0; padding: 12px; overflow-x: auto; background: rgba(0,0,0,0.04); border-radius: 6px; border: 1px solid #f0f0f0; }
.feedback-reply-content pre code { padding: 0; background: transparent; }
.feedback-reply-content code { font-family: monospace; font-size: 13px; background: rgba(0,0,0,0.06); padding: 2px 6px; border-radius: 4px; }
.feedback-reply-content pre code { background: transparent; padding: 0; }
.feedback-reply-content del { text-decoration: line-through; }
[data-theme="dark"] .feedback-reply-content th, [data-theme="dark"] .feedback-reply-content td { border-color: #434343; }
[data-theme="dark"] .feedback-reply-content th { background: rgba(255,255,255,0.04); }
[data-theme="dark"] .feedback-reply-content pre { background: rgba(0,0,0,0.25); border-color: #303030; }
[data-theme="dark"] .feedback-reply-content code { background: rgba(255,255,255,0.08); }
[data-theme="dark"] .feedback-reply-content pre code { background: transparent; }
`;

const ReplyCard: React.FC<ReplyCardProps> = ({ detail, floorNumber }) => {
    const isDarkMode = useDarkMode();
    const { useToken } = theme;
    const { token } = useToken();
    const hasOperator = !!detail.operator;

    // 拦截工单引用链接点击，通过 CustomEvent 打开工单抽屉
    const handleContentClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const target = (e.target as HTMLElement).closest('a');
        if (!target) return;
        const href = target.getAttribute('href');
        if (!href || !href.startsWith('/')) return;
        e.preventDefault();
        // 匹配 /ticket/operate/backToMy/{tid} 格式的工单引用链接
        const tidMatch = href.match(/^\/ticket\/operate\/backToMy\/(\d+)$/);
        if (tidMatch) {
            window.dispatchEvent(new CustomEvent('openTidFromDetail', { detail: { tid: Number(tidMatch[1]) } }));
        } else {
            window.history.pushState({}, '', href);
            window.dispatchEvent(new PopStateEvent('popstate'));
        }
    }, []);

    return (
        <>
            <style>{FEEDBACK_REPLY_CONTENT_STYLE}</style>
            <Card
                id={`feedback-floor-${detail.id}`}
                style={{
                    marginBottom: 16,
                    borderRadius: 8,
                    borderLeft: hasOperator ? `4px solid ${token.colorPrimary}` : undefined,
                    background: hasOperator ? (isDarkMode ? '#111a2c' : '#f0f7ff') : undefined,
                }}
                bodyStyle={{ padding: '16px' }}
            >
                <div style={{ display: 'flex', gap: 12 }}>
                    {/* 内容区域 */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        {/* 楼层和时间信息 */}
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                marginBottom: 8,
                                flexWrap: 'wrap',
                                gap: 8,
                            }}
                        >
                            <Space wrap>
                                {detail.operator && (
                                    <Tag
                                        icon={<CrownOutlined />}
                                        color={token.colorPrimary}
                                        style={{ margin: 0 }}
                                    >
                                        {detail.operator}
                                    </Tag>
                                )}
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    #{floorNumber}
                                    {gLang('feedback.floorSuffix')}
                                </Text>
                            </Space>
                            {detail.create_time && (
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    {detail.create_time}
                                </Text>
                            )}
                        </div>

                        {/* 回复内容（仅支持 Markdown，后端解析为 HTML 展示） */}
                        <div
                            style={{
                                marginTop: 8,
                                lineHeight: 1.6,
                                wordBreak: 'break-word',
                            }}
                            className="feedback-reply-content"
                            onClick={handleContentClick}
                            {...(detail.contentHtml != null && detail.contentHtml !== ''
                                ? { dangerouslySetInnerHTML: { __html: detail.contentHtml } }
                                : {
                                      children: (detail.content || '')
                                          .split('\n')
                                          .map((line, i) => (
                                              <React.Fragment key={i}>
                                                  <span>{line}</span>
                                                  {i <
                                                      (detail.content || '').split('\n').length -
                                                          1 && <br />}
                                              </React.Fragment>
                                          )),
                                  })}
                        ></div>

                        {/* 附件 */}
                        {detail.attachments && detail.attachments.length > 0 && (
                            <AttachmentPreview attachments={detail.attachments} />
                        )}
                    </div>
                </div>
            </Card>
        </>
    );
};

export default ReplyCard;
