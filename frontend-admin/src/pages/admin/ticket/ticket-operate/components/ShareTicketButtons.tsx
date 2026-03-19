import React, { useRef, useState } from 'react';
import { Button, message, Modal, Space } from 'antd';
import { CopyOutlined, ShareAltOutlined } from '@ant-design/icons';
import html2canvas from 'html2canvas';
import { Ticket } from '@ecuc/shared/types/ticket.types';
import { generateTemporaryUrl } from '@common/utils/uploadUtils';
import { gLang } from '@common/language';
import useIsPC from '@common/hooks/useIsPC';
import TidJumpComponent from '../../../../../components/TidJumpComponent';
import { fetchData } from '@common/axiosConfig';
import { convertUTCToFormat } from '@common/components/TimeConverter';

interface ShareTicketButtonsProps {
    ticket?: Ticket;
    ticketDetailRef: React.RefObject<HTMLDivElement>;
    isDarkMode: boolean;
    user?: any;
    setPreviewImage: (image: string | null) => void;
}

const ShareTicketButtons: React.FC<ShareTicketButtonsProps> = ({
    ticket,
    ticketDetailRef,
    isDarkMode,
    user,
    setPreviewImage,
}) => {
    const [messageApi, contextHolder] = message.useMessage();
    const [modal, modalContextHolder] = Modal.useModal();
    const [isGeneratingScreenshot, setIsGeneratingScreenshot] = useState(false);
    const screenshotCache = useRef<string | null>(null);
    const lastTicketId = useRef<number | null>(null);
    const isPC = useIsPC();

    // 优化：使用缓存避免重复截图
    const getScreenshotBase64 = async (forceRefresh = false): Promise<string | null> => {
        // 如果有缓存且工单ID没变，直接返回缓存
        if (!forceRefresh && screenshotCache.current && lastTicketId.current === ticket?.tid) {
            return screenshotCache.current;
        }

        if (!ticketDetailRef.current) return null;

        try {
            setIsGeneratingScreenshot(true);
            messageApi.loading(gLang('admin.shareGeneratingScreenshot'));

            const bgColor = isDarkMode ? '#141414' : '#fff';

            // 找出所有需要处理的图片元素
            const originalImages = Array.from(ticketDetailRef.current.querySelectorAll('img'));
            const imageCount = originalImages.length;

            // 动态计算等待时间 - 根据图片数量调整
            const waitTime = Math.min(Math.max(imageCount * 100, 500), 1500);

            // 创建包装元素
            const wrapper = document.createElement('div');
            wrapper.style.position = 'absolute';
            wrapper.style.left = '-9999px';
            wrapper.style.top = '0';
            wrapper.style.padding = '32px';
            wrapper.style.background = bgColor;
            wrapper.style.width = ticketDetailRef.current.offsetWidth + 'px';
            wrapper.style.overflow = 'visible';

            // 克隆内容
            const clone = ticketDetailRef.current.cloneNode(true) as HTMLElement;

            // 简化DOM处理 - 直接处理所有图片，不分类处理
            const allImages = clone.querySelectorAll('img');
            const ossImages: HTMLImageElement[] = [];

            allImages.forEach(img => {
                // 基本处理 - 确保图片可见
                img.style.display = 'inline-block';
                img.style.visibility = 'visible';
                img.style.opacity = '1';

                // 处理data-src
                const dataSrc = img.getAttribute('data-src');
                if (dataSrc) {
                    img.src = dataSrc;
                    img.removeAttribute('data-src');
                }

                // 收集OSS图片以便并行处理
                if (
                    (img.src && img.src.includes('aliyuncs.com')) ||
                    (dataSrc && dataSrc.includes('aliyuncs.com'))
                ) {
                    ossImages.push(img as HTMLImageElement);
                }

                // 去除延迟加载
                img.removeAttribute('loading');
                img.removeAttribute('decoding');
            });

            // 添加到DOM
            wrapper.appendChild(clone);
            document.body.appendChild(wrapper);

            // 并行处理OSS图片 - 批量请求临时URL
            if (ossImages.length > 0) {
                // 分批处理以避免过多并行请求
                const batchSize = 5;
                const batches = Math.ceil(ossImages.length / batchSize);

                for (let i = 0; i < batches; i++) {
                    const batch = ossImages.slice(i * batchSize, (i + 1) * batchSize);
                    await Promise.all(
                        batch.map(async img => {
                            try {
                                const url = img.getAttribute('data-src') || img.src;
                                // 只处理还没有处理过的图片
                                if (url && url.includes('aliyuncs.com')) {
                                    img.src = await generateTemporaryUrl(url);
                                    img.setAttribute('crossorigin', 'anonymous');
                                }
                            } catch {
                                // 忽略单个图片处理错误
                            }
                        })
                    );
                }
            }

            // 动态等待图片加载
            await new Promise(resolve => setTimeout(resolve, waitTime));

            // 创建水印
            const watermark = document.createElement('canvas');
            const wmWidth = 400;
            const wmHeight = 200;
            watermark.width = wmWidth;
            watermark.height = wmHeight;
            const ctx = watermark.getContext('2d');
            if (ctx && user?.openid) {
                ctx.globalAlpha = 0.1;
                ctx.font = '20px sans-serif';
                ctx.fillStyle = '#888';
                ctx.rotate(-Math.PI / 12);
                for (let x = -wmWidth; x < wmWidth * 2; x += 220) {
                    for (let y = 0; y < wmHeight * 2; y += 80) {
                        ctx.save();
                        ctx.translate(x, y);
                        ctx.fillText(user.openid, 0, 0);
                        ctx.restore();
                    }
                }
            }

            // 水印div
            const wmDiv = document.createElement('div');
            wmDiv.style.position = 'absolute';
            wmDiv.style.left = '0';
            wmDiv.style.top = '0';
            wmDiv.style.width = '100%';
            wmDiv.style.height = '100%';
            wmDiv.style.pointerEvents = 'none';
            wmDiv.style.zIndex = '99';
            wmDiv.style.background = `url(${watermark.toDataURL('image/png')}) repeat`;
            wrapper.appendChild(wmDiv);

            // 优化html2canvas配置
            const canvas = await html2canvas(wrapper, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: bgColor,
                logging: false,
                imageTimeout: 10000, // 减少超时等待
                removeContainer: true, // 自动移除临时容器
                ignoreElements: el =>
                    el.classList &&
                    (el.classList.contains('ant-image-preview-operations') ||
                        el.classList.contains('ant-image-preview-switch')),
            });

            // 清理DOM
            if (document.body.contains(wrapper)) {
                document.body.removeChild(wrapper);
            }

            const imageData = canvas.toDataURL('image/png');

            // 保存到缓存
            screenshotCache.current = imageData;
            lastTicketId.current = ticket?.tid || null;

            return imageData;
        } catch {
            return null;
        } finally {
            setIsGeneratingScreenshot(false);
            messageApi.destroy();
        }
    };

    const handleShareScreenshot = async () => {
        if (isGeneratingScreenshot) return;

        const image = await getScreenshotBase64();
        if (!image) {
            messageApi.error(gLang('admin.shareScreenshotFailedShort'));
            return;
        }
        const now = new Date();
        const formattedTime = convertUTCToFormat(now, 'YYYYMMDD_HHmmss');
        const filename = gLang('admin.shareFilename', {
            tid: String(ticket?.tid ?? ''),
            time: formattedTime,
        });

        const link = document.createElement('a');
        link.href = image;
        link.download = filename;
        link.click();
        messageApi.success(gLang('admin.shareScreenshotSaved'));
    };

    const handlePreviewScreenshot = async () => {
        if (isGeneratingScreenshot) return;

        const image = await getScreenshotBase64();
        if (!image) {
            messageApi.error(gLang('admin.shareScreenshotFailedShort'));
            return;
        }
        setPreviewImage(image);
    };

    const handleShareLink = async () => {
        if (!ticket?.tid) {
            messageApi.error(gLang('admin.shareLinkIncomplete'));
            return;
        }

        try {
            messageApi.loading(gLang('admin.shareGeneratingLink'));

            // 调用后端 API 生成匿名访问令牌
            await fetchData({
                url: '/ticket/generate-share-token',
                method: 'POST',
                data: { tid: ticket.tid },
                setData: (result: any) => {
                    if (result.EPF_code === 200 && result.url) {
                        const url = result.url;
                        void copyToClipboard(url);
                    }
                },
                setSpin: (loading: boolean) => {
                    if (!loading) {
                        messageApi.destroy();
                    }
                },
            });
        } catch {
            messageApi.error(gLang('admin.shareLinkFailedRetry'));
        } finally {
            messageApi.destroy();
        }
    };

    const handleCopyFeedbackLink = async () => {
        if (!ticket?.tid) {
            messageApi.error(gLang('admin.shareLinkIncomplete'));
            return;
        }
        const url = `${window.location.origin}/feedback/table/${ticket.tid}`;
        await copyToClipboard(url, 'admin.shareFeedbackLinkCopied');
    };

    // 复制到剪贴板的核心函数
    const copyToClipboard = async (url: string, successMsgKey = 'admin.shareLinkCopied'): Promise<void> => {
        // 首先尝试现代 Clipboard API
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            await navigator.clipboard.writeText(url);
            messageApi.success(gLang(successMsgKey), 5);
            return;
        }

        // 降级方案：使用 document.execCommand（已废弃但兼容性更好）
        const input = document.createElement('input');
        input.value = url;
        input.readOnly = true;
        input.style.position = 'absolute';
        input.style.left = '-9999px';
        document.body.appendChild(input);
        input.select();
        input.setSelectionRange(0, input.value.length);

        try {
            const copied = document.execCommand('copy');
            document.body.removeChild(input);

            if (copied) {
                messageApi.success(gLang(successMsgKey), 5);
                return;
            }
        } catch {
            if (document.body.contains(input)) {
                document.body.removeChild(input);
            }
        }

        // 所有自动复制方法都失败，显示手动复制弹窗
        showManualCopyModal(url);
    };

    // 显示手动复制弹窗
    const showManualCopyModal = (url: string) => {
        const isIOS = /iP(ad|hone|od)/.test(navigator.userAgent);
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

        modal.info({
            title: gLang('admin.shareCopyManual'),
            content: (
                <div>
                    <div
                        style={{
                            width: '100%',
                            fontSize: 16,
                            padding: 8,
                            marginTop: 8,
                            border: isDarkMode ? '1px solid #303030' : '1px solid #eee',
                            borderRadius: 4,
                            minHeight: 80,
                            fontFamily: 'inherit',
                            wordBreak: 'break-all',
                            userSelect: 'text',
                            WebkitUserSelect: 'text',
                            cursor: 'text',
                            whiteSpace: 'pre-wrap',
                            backgroundColor: isDarkMode ? '#1a1a1a' : '#fafafa',
                            color: isDarkMode ? '#ffffff' : '#000000',
                        }}
                        contentEditable={false}
                        spellCheck={false}
                        onMouseUp={e => {
                            const selection = window.getSelection();
                            if (!selection || selection.toString().length > 0) return;
                            const range = document.createRange();
                            range.selectNodeContents(e.currentTarget);
                            selection?.removeAllRanges();
                            selection?.addRange(range);
                        }}
                        onTouchEnd={e => {
                            // 针对iOS Safari的特殊处理
                            if (isIOS && isSafari) {
                                // 不需要自动全选，让用户长按选择
                                return;
                            }
                            setTimeout(() => {
                                const selection = window.getSelection();
                                if (!selection || selection.toString().length > 0) return;
                                const range = document.createRange();
                                range.selectNodeContents(e.currentTarget);
                                selection?.removeAllRanges();
                                selection?.addRange(range);
                            }, 100);
                        }}
                    >
                        {url}
                    </div>
                    <div style={{ marginTop: 8, color: isDarkMode ? '#999' : '#888' }}>
                        {isIOS && isSafari
                            ? gLang('admin.shareLongPressCopy')
                            : gLang('admin.shareCtrlCopy')}
                    </div>
                </div>
            ),
            okText: gLang('admin.shareKnow'),
            width: 520,
        });
    };

    // dataURL 转 Blob
    const dataURLtoBlob = (dataUrl: string): Blob => {
        const [header, base64] = dataUrl.split(',');
        const mimeMatch = header.match(/data:(.*?);base64/);
        const mime = mimeMatch ? mimeMatch[1] : 'image/png';
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return new Blob([bytes], { type: mime });
    };

    // 截图并复制到剪贴板
    const handleCopyScreenshot = async () => {
        if (isGeneratingScreenshot) return;
        const image = await getScreenshotBase64();
        if (!image) {
            messageApi.error(gLang('admin.shareScreenshotFailedShort'));
            return;
        }
        try {
            const blob = dataURLtoBlob(image);
            const mimeType = blob.type || 'image/png';
            const ClipboardItemCtor: any = (window as any).ClipboardItem;
            if (
                navigator.clipboard &&
                typeof (navigator.clipboard as any).write === 'function' &&
                ClipboardItemCtor
            ) {
                const item = new ClipboardItemCtor({ [mimeType]: blob });
                await (navigator.clipboard as any).write([item]);
                messageApi.success(gLang('ticketOperate.share.copySuccess'));
            } else if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                await navigator.clipboard.writeText(image);
                messageApi.info(gLang('ticketOperate.share.copyAsLinkInfo'));
            } else {
                messageApi.error(gLang('ticketOperate.share.clipboardNotSupported'));
            }
        } catch {
            messageApi.error(gLang('ticketOperate.share.copyFailed'));
        }
    };

    return (
        <>
            {contextHolder}
            {modalContextHolder}
            <Space size="small" wrap>
                <Button
                    icon={<ShareAltOutlined />}
                    onClick={handleShareScreenshot}
                    loading={isGeneratingScreenshot}
                    title={gLang('admin.shareDownloadScreenshot')}
                >
                    {gLang('admin.shareDownload')}
                </Button>
                <Button
                    icon={<ShareAltOutlined />}
                    onClick={handlePreviewScreenshot}
                    loading={isGeneratingScreenshot}
                    title={gLang('admin.shareScreenshotPreview')}
                >
                    {gLang('admin.shareScreenshot')}
                </Button>
                {isPC && (
                    <Button
                        icon={<CopyOutlined />}
                        onClick={handleCopyScreenshot}
                        loading={isGeneratingScreenshot}
                        title={gLang('ticketOperate.share.copy')}
                    >
                        {gLang('ticketOperate.share.copy')}
                    </Button>
                )}
                <Button
                    icon={<CopyOutlined />}
                    onClick={handleShareLink}
                    title={gLang('admin.shareCopySnapshotLink')}
                >
                    {gLang('admin.shareSnapshotLink')}
                </Button>
                {ticket?.type === 'GU' && (
                    <Button
                        icon={<CopyOutlined />}
                        onClick={handleCopyFeedbackLink}
                        title={gLang('admin.shareFeedbackLink')}
                    >
                        {gLang('admin.shareFeedbackLink')}
                    </Button>
                )}
                <TidJumpComponent type="default" />
            </Space>
        </>
    );
};

export default ShareTicketButtons;
