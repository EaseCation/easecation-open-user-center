import React, { useState } from 'react';
import { Card, Typography, theme, Tag } from 'antd';
import { FireOutlined } from '@ant-design/icons';
import SafeImage from './SafeImage';
import type { Product } from '@ecuc/shared/types/item.types';
import { MediaStatus } from '@ecuc/shared/types/media.types';
import { useTheme } from '@common/contexts/ThemeContext';
import { CUSTOM_THEME_PALETTES } from '@common/themes/customPalettes';

interface ProductCardProps {
    product: Product;
    itemImage: string;
    isDarkMode?: boolean;
    screens: any;
    onClick: () => void;
    gLang: (key: string, params?: { [key: string]: string | number }) => string;
    userInfo: any;
    messageApi: any;
    actions?: React.ReactNode;
    itemIdText?: string;
}

const { Text } = Typography;

const ProductCard: React.FC<ProductCardProps> = ({
    product,
    itemImage,
    screens,
    onClick,
    gLang,
    userInfo,
    messageApi,
    actions,
    itemIdText,
}) => {
    const { token } = theme.useToken();
    const { getThemeColor, customTheme, isCustomThemeActive } = useTheme();
    const palette = CUSTOM_THEME_PALETTES.blackOrange;
    const isBlackOrangeActive = isCustomThemeActive && customTheme === 'blackOrange';
    const [isHover, setIsHover] = useState(false);
    const cardBackground = getThemeColor({
        light: token.colorBgContainer,
        dark: token.colorBgContainer,
        custom: { blackOrange: palette.surface },
    });
    const cardBorder = getThemeColor({
        light: token.colorBorderSecondary,
        dark: '#303030',
        custom: { blackOrange: palette.border },
    });
    const cardHoverBorder = isBlackOrangeActive ? palette.accent : token.colorPrimaryBorderHover;
    const cardShadow = isBlackOrangeActive
        ? '0 16px 42px rgba(255, 140, 26, 0.16)'
        : token.boxShadow;
    const titleColor = getThemeColor({
        light: token.colorText,
        dark: token.colorText,
        custom: { blackOrange: palette.textPrimary },
    });
    const descriptionColor = getThemeColor({
        light: token.colorTextSecondary,
        dark: 'rgba(255, 255, 255, 0.65)',
        custom: { blackOrange: palette.textSecondary },
    });
    const metaColor = getThemeColor({
        light: token.colorTextQuaternary,
        dark: 'rgba(255, 255, 255, 0.45)',
        custom: { blackOrange: palette.textMuted },
    });
    const priceColor = getThemeColor({
        light: token.colorSuccessText,
        dark: token.colorSuccessText,
        custom: { blackOrange: palette.accent },
    });
    const salesColor = getThemeColor({
        light: token.colorTextTertiary,
        dark: 'rgba(255, 255, 255, 0.6)',
        custom: { blackOrange: palette.textSecondary },
    });
    const salesIconColor = getThemeColor({
        light: token.colorTextQuaternary,
        dark: 'rgba(255, 255, 255, 0.45)',
        custom: { blackOrange: palette.accent },
    });
    const imageBackground = getThemeColor({
        light: token.colorFillTertiary,
        dark: token.colorFillTertiary,
        custom: { blackOrange: palette.surfaceAlt },
    });

    return (
        <Card
            key={(product as any).id}
            hoverable
            onMouseEnter={() => setIsHover(true)}
            onMouseLeave={() => setIsHover(false)}
            onClick={() => {
                if (product.is_vip === 1 && userInfo?.status !== MediaStatus.ExcellentCreator) {
                    messageApi.warning(gLang('shop.VIPWarning'));
                    return;
                }
                onClick();
            }}
            styles={{
                body: {
                    padding: screens.xs ? 8 : 12,
                    paddingBottom: screens.xs ? 26 : 24, // 为右下角销量浮层预留空间，避免与ID行重叠
                    minHeight: screens.xs ? 100 : 90,
                    display: 'flex',
                    flexDirection: screens.xs ? 'column' : 'row',
                    gap: screens.xs ? 6 : 8,
                    cursor: 'pointer',
                    borderRadius: 6,
                    overflow: 'hidden',
                    background: cardBackground,
                },
            }}
            style={{
                transition: 'all 0.2s ease',
                position: 'relative',
                border: `1px solid ${cardBorder}`,
                borderColor: isHover ? cardHoverBorder : cardBorder,
                borderRadius: 8,
                minWidth: screens.xs ? '260px' : 'auto',
                width: screens.xs ? '100%' : 'auto',
                boxShadow: isHover ? cardShadow : undefined,
                transform: isHover ? 'translateY(-1px)' : undefined,
                willChange: 'transform, box-shadow, border-color',
                zIndex: isHover ? 1 : 0,
                background: cardBackground,
            }}
        >
            {/* VIP标签和价格 - 悬浮在右上角 */}
            <div
                style={{
                    position: 'absolute',
                    top: screens.xs ? 6 : 6,
                    right: screens.xs ? 6 : 6,
                    zIndex: 10,
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: screens.xs ? 4 : 6,
                    flexDirection: 'row',
                }}
            >
                {product.is_vip === 1 && (
                    <Tag
                        color="warning"
                        style={{
                            fontSize: screens.xs ? 8 : 10,
                            fontWeight: '500',
                            borderRadius: screens.xs ? 6 : 12,
                            padding: screens.xs ? '2px 6px' : '4px 8px',
                            lineHeight: screens.xs ? '1.2' : '1.4',
                            maxWidth: screens.xs ? '60px' : 'auto',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                        }}
                    >
                        {screens.xs
                            ? gLang('shop.executiveLimitShort')
                            : gLang('shop.executiveLimit')}
                    </Tag>
                )}
                {product.extra_config?.product_mode === 'lottery' && (
                    <Tag color="processing" style={{ margin: 0 }}>
                        {gLang('shop.lotteryTag')}
                    </Tag>
                )}
                {product.extra_config?.product_mode === 'spin_lottery' && (
                    <Tag color="purple" style={{ margin: 0 }}>
                        {gLang('shop.spinLotteryTag')}
                    </Tag>
                )}
                {product.pricing_preview?.mode === 'market' && (
                    <Tag color="volcano" style={{ margin: 0 }}>
                        {gLang('shop.surprisePriceTag')}
                    </Tag>
                )}
                {product.pricing_preview?.mode === 'discriminatory' && (
                    <Tag color="gold" style={{ margin: 0 }}>
                        {gLang('shop.exclusivePriceTag')}
                    </Tag>
                )}
                {product.extra_config?.homepage_featured && (
                    <Tag color="blue" style={{ margin: 0 }}>
                        {gLang('shopAdmin.option.homepageFeaturedBadge')}
                    </Tag>
                )}
                <Text
                    style={{
                        color: priceColor,
                        fontWeight: 600,
                        fontSize: screens.xs ? 12 : 14,
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                    }}
                >
                    {Number(product.price || 0)}
                </Text>
            </div>
            {/* 自定义操作区域（可选） */}
            {actions && (
                <div
                    style={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        zIndex: 11,
                        display: 'flex',
                        gap: 6,
                    }}
                    onClick={e => {
                        e.stopPropagation();
                    }}
                >
                    {actions}
                </div>
            )}
            {/* 手机端布局 */}
            {screens.xs ? (
                <>
                    {/* 第一行：图片 + 右侧信息区（标题与价格同行、描述单行） */}
                    <div
                        style={{
                            display: 'flex',
                            gap: screens.xs ? 8 : 10,
                            alignItems: 'flex-start',
                        }}
                    >
                        <SafeImage
                            src={itemImage}
                            alt={product.title}
                            style={{
                                width: screens.xs ? 56 : 60,
                                height: screens.xs ? 56 : 60,
                                objectFit: 'contain',
                                borderRadius: 6,
                                flexShrink: 0,
                                background: imageBackground,
                            }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <h4
                                    style={{
                                        margin: 0,
                                        fontSize: screens.xs ? 13 : 14,
                                        lineHeight: '1.3',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        fontWeight: 600,
                                        flex: 1,
                                        minWidth: 0,
                                        color: titleColor,
                                    }}
                                >
                                    {product.title}
                                </h4>
                            </div>
                            <Text
                                style={{
                                    marginTop: 4,
                                    fontSize: 12,
                                    color: descriptionColor,
                                    display: '-webkit-box',
                                    WebkitBoxOrient: 'vertical',
                                    WebkitLineClamp: 1,
                                    overflow: 'hidden',
                                    lineHeight: '1.4',
                                }}
                            >
                                {product.detail}
                            </Text>
                            {itemIdText && (
                                <Text
                                    style={{
                                        marginTop: 4,
                                        fontSize: 11,
                                        color: metaColor,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}
                                >
                                    {itemIdText}
                                </Text>
                            )}
                        </div>
                    </div>
                    {/* 悬浮销量信息（不占布局高度） */}
                    <div
                        style={{
                            position: 'absolute',
                            right: 8,
                            bottom: 8,
                            pointerEvents: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            color: salesColor,
                            fontSize: 12,
                            userSelect: 'none',
                        }}
                    >
                        <FireOutlined style={{ fontSize: 12, color: salesIconColor }} />
                        <span>{gLang('shop.soldCountLabel', { count: product.sales })}</span>
                    </div>
                </>
            ) : (
                /* 桌面端布局 */
                <>
                    <SafeImage
                        src={itemImage}
                        alt={product.title}
                        style={{
                            width: 60,
                            height: 60,
                            objectFit: 'contain',
                            borderRadius: 6,
                            marginRight: 12,
                            flexShrink: 0,
                            background: imageBackground,
                        }}
                    />
                    <div
                        style={{
                            flex: 1,
                            minWidth: 0,
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'flex-start',
                        }}
                    >
                        <h4
                            style={{
                                margin: 0,
                                fontSize: 15,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                lineHeight: '1.3',
                                minWidth: 0,
                                color: titleColor,
                            }}
                        >
                            {product.title}
                        </h4>
                        <div
                            style={{
                                margin: '8px 0 0 0',
                                fontSize: 12,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-start',
                                gap: 2,
                            }}
                        >
                            <Text
                                style={{
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    display: '-webkit-box',
                                    WebkitBoxOrient: 'vertical',
                                    WebkitLineClamp: 2,
                                    color: descriptionColor,
                                }}
                            >
                                {product.detail}
                            </Text>
                            {itemIdText && (
                                <Text
                                    style={{
                                        whiteSpace: 'nowrap',
                                        color: metaColor,
                                        fontSize: 11,
                                        flexShrink: 0,
                                    }}
                                >
                                    {itemIdText}
                                </Text>
                            )}
                        </div>
                    </div>
                    <div
                        style={{
                            position: 'absolute',
                            right: 8,
                            bottom: 6,
                            background: 'transparent',
                            color: salesColor,
                            fontSize: 12,
                            fontWeight: 400,
                            pointerEvents: 'none',
                            userSelect: 'none',
                            maxWidth: '120px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        <FireOutlined
                            style={{ fontSize: 12, color: salesIconColor, marginRight: 4 }}
                        />
                        <span>{gLang('shop.soldCountLabel', { count: product.sales })}</span>
                    </div>
                </>
            )}
        </Card>
    );
};

export default ProductCard;
