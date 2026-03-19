// 移动端反馈页面的锚点目录组件

import React, { useState } from 'react';
import Card from 'antd/es/card';
import Anchor from 'antd/es/anchor';
import Button from 'antd/es/button';
import { gLang } from '@common/language';
import { MenuOutlined } from '@ant-design/icons';
import useDarkMode from '@common/hooks/useDarkMode';

const { Link: AnchorLink } = Anchor;

interface FeedbackAnchorMobileProps {
    officialReplies: Array<{
        id: number;
        floor: number;
        title: string;
    }>;
    cardIndex: React.MutableRefObject<number>;
    animationDelay: number;
}

const FeedbackAnchorMobile: React.FC<FeedbackAnchorMobileProps> = ({ officialReplies }) => {
    const [open, setOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const isDarkMode = useDarkMode();

    // 处理目录关闭，先触发关闭动画，动画结束后再真正关闭
    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setOpen(false);
            setIsClosing(false);
        }, 300); // 与动画时长一致
    };

    if (officialReplies.length === 0) {
        return null;
    }

    return (
        <>
            {/* 浮动按钮 */}
            <Button
                type="default"
                icon={<MenuOutlined style={{ fontSize: '16px' }} />}
                onClick={() => {
                    if (open) {
                        handleClose();
                    } else {
                        setOpen(true);
                    }
                }}
                style={{
                    position: 'fixed',
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 100,
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    minWidth: 'unset',
                    padding: 0,
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                }}
            />

            {/* 展开的目录 */}
            {(open || isClosing) && (
                <div
                    style={{
                        position: 'fixed',
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: '240px',
                        background: isDarkMode ? '#141414' : '#ffffff',
                        boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.15)',
                        borderLeft: `1px solid ${isDarkMode ? '#303030' : '#f0f0f0'}`,
                        zIndex: 99,
                        animation: isClosing
                            ? 'slideOutRight 0.3s ease-in-out'
                            : 'slideInRight 0.3s ease-in-out',
                        overflowY: 'auto',
                    }}
                >
                    <Card
                        title={gLang('feedback.officialReplyIndex')}
                        size="small"
                        style={{
                            height: '100%',
                            border: 'none',
                            borderRadius: 0,
                            background: isDarkMode ? '#141414' : '#ffffff',
                        }}
                        headStyle={{
                            background: isDarkMode ? '#141414' : '#ffffff',
                            borderBottom: `1px solid ${isDarkMode ? '#303030' : '#f0f0f0'}`,
                            color: isDarkMode ? 'rgba(255,255,255,0.88)' : undefined,
                        }}
                        bodyStyle={{ padding: '16px', paddingTop: '24px' }}
                    >
                        <Anchor onClick={handleClose}>
                            {officialReplies.map(reply => (
                                <AnchorLink
                                    key={reply.id}
                                    href={`#feedback-floor-${reply.id}`}
                                    title={`#${reply.floor} ${reply.title}`}
                                />
                            ))}
                        </Anchor>
                    </Card>
                </div>
            )}

            {/* 遮罩层 */}
            {(open || isClosing) && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.3)',
                        zIndex: 98,
                        animation: isClosing
                            ? 'fadeOut 0.4s ease-in-out'
                            : 'fadeIn 0.4s ease-in-out',
                    }}
                    onClick={handleClose}
                />
            )}

            {/* 动画样式 */}
            <style
                dangerouslySetInnerHTML={{
                    __html: `
                    @keyframes slideInRight {
                        from {
                            transform: translateX(100%);
                        }
                        to {
                            transform: translateX(0);
                        }
                    }
                    @keyframes slideOutRight {
                        from {
                            transform: translateX(0);
                        }
                        to {
                            transform: translateX(100%);
                        }
                    }
                    @keyframes fadeIn {
                        from {
                            opacity: 0;
                        }
                        to {
                            opacity: 1;
                        }
                    }
                    @keyframes fadeOut {
                        from {
                            opacity: 1;
                        }
                        to {
                            opacity: 0;
                        }
                    }
                `,
                }}
            />
        </>
    );
};

export default FeedbackAnchorMobile;
