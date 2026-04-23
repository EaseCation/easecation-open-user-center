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
    const isMobile = !!screens?.xs;
    const isTablet = !screens?.xs && !!screens?.md && !screens?.xl;
    const palette = CUSTOM_THEME_PALETTES.blackOrange;
    const isBlackOrangeActive = isCustomThemeActive && customTheme === 'blackOrange';
    const [isHover, setIsHover] = useState(false);
    const cardBackground = getThemeColor({
        light: 'rgba(255, 255, 255, 0.94)',
        dark: 'rgba(28, 28, 28, 0.94)',
        custom: { blackOrange: palette.surface },
    });
    const cardBorder = getThemeColor({
        light: 'rgba(15, 23, 42, 0.06)',
        dark: 'rgba(255, 255, 255, 0.08)',
        custom: { blackOrange: 'rgba(255, 140, 26, 0.12)' },
    });
    const cardHoverBorder = isBlackOrangeActive ? palette.accent : 'rgba(59, 130, 246, 0.28)';
    const cardShadow = isBlackOrangeActive
        ? '0 18px 38px rgba(255, 140, 26, 0.16)'
        : '0 14px 34px rgba(15, 23, 42, 0.08)';
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
        light: '#f5f7fb',
        dark: 'rgba(255, 255, 255, 0.04)',
        custom: { blackOrange: palette.surfaceAlt },
    });
    const pricingPreview = product.pricing_preview;
    const basePrice = Number(pricingPreview?.base_price ?? product.price ?? 0);
    const currentPrice = Number(product.price ?? 0);
    const discountRate =
        pricingPreview?.mode === 'market' && basePrice > 0 && currentPrice < basePrice
            ? `${((currentPrice / basePrice) * 10).toFixed(1)}${gLang('shop.discountSuffix')}`
            : null;
    const promoBadgeText =
        pricingPreview?.mode === 'market'
            ? discountRate ?? gLang('shop.surprisePriceTag')
            : pricingPreview?.mode === 'discriminatory'
              ? gLang('shop.exclusivePriceTag')
              : null;
    const promoBadgeColor =
        pricingPreview?.mode === 'market'
            ? 'linear-gradient(135deg, #ff7a18 0%, #ff3d54 100%)'
            : 'linear-gradient(135deg, #f7d774 0%, #d99100 100%)';

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
                    padding: isMobile ? 14 : isTablet ? 16 : 18,
                    paddingBottom: isMobile ? 32 : isTablet ? 24 : 30,
                    minHeight: isMobile ? 150 : isTablet ? 160 : 176,
                    display: 'flex',
                    flexDirection: 'row',
                    gap: isMobile ? 12 : isTablet ? 12 : 14,
                    cursor: 'pointer',
                    borderRadius: 18,
                    overflow: 'hidden',
                    background: cardBackground,
                },
            }}
            style={{
                transition: 'all 0.25s ease',
                position: 'relative',
                border: `1px solid ${cardBorder}`,
                borderColor: isHover ? cardHoverBorder : cardBorder,
                borderRadius: 20,
                minWidth: isMobile ? '100%' : 'auto',
                width: isMobile ? '100%' : 'auto',
                boxShadow: isHover ? cardShadow : '0 6px 22px rgba(15, 23, 42, 0.05)',
                transform: isHover ? 'translateY(-4px)' : undefined,
                willChange: 'transform, box-shadow, border-color',
                zIndex: isHover ? 1 : 0,
                background: cardBackground,
            }}
        >
            {/* VIP标签和价格 - 悬浮在右上角 */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 20,
                    background: isHover
                        ? 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 36%, rgba(255,255,255,0.1) 100%)'
                        : 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 36%, rgba(255,255,255,0.04) 100%)',
                    pointerEvents: 'none',
                    opacity: isHover ? 1 : 0.72,
                    transition: 'opacity 0.25s ease',
                }}
            />
            {!isMobile && (
                <div
                    style={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        zIndex: 10,
                        pointerEvents: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        flexDirection: 'row',
                    }}
                >
                {product.is_vip === 1 && (
                    <Tag
                        color="warning"
                        style={{
                            fontSize: 10,
                            fontWeight: '500',
                            borderRadius: 12,
                            padding: '4px 8px',
                            lineHeight: '1.4',
                            flexShrink: 0,
                        }}
                    >
                        {gLang('shop.executiveLimit')}
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
                <Text
                    style={{
                        color: priceColor,
                        fontWeight: 600,
                        fontSize: 14,
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                    }}
                >
                    {Number(product.price || 0)}
                </Text>
                </div>
            )}
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
            {isMobile ? (
                <>
                    {/* 第一行：图片 + 右侧信息区（标题与价格同行、描述单行） */}
                    <div
                        style={{
                            display: 'flex',
                            gap: isMobile ? 8 : 10,
                            alignItems: 'flex-start',
                        }}
                    >
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                            <SafeImage
                                src={itemImage}
                                alt={product.title}
                                style={{
                                    width: isMobile ? 88 : 96,
                                    height: isMobile ? 88 : 96,
                                    objectFit: 'contain',
                                    borderRadius: 16,
                                    flexShrink: 0,
                                    background: imageBackground,
                                    transform: isHover ? 'scale(1.05) translateY(-2px)' : 'scale(1)',
                                    transition: 'transform 0.28s ease',
                                }}
                            />
                            {promoBadgeText && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: -8,
                                        left: -10,
                                        padding: isMobile ? '3px 8px' : '4px 10px',
                                        borderRadius: 999,
                                        background: promoBadgeColor,
                                        color: '#fff',
                                        fontSize: isMobile ? 10 : 11,
                                        fontWeight: 700,
                                        lineHeight: 1.1,
                                        boxShadow: '0 8px 18px rgba(255, 92, 61, 0.28)',
                                        transform: 'rotate(-12deg)',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {promoBadgeText}
                                </div>
                            )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    flexWrap: 'wrap',
                                    marginBottom: 6,
                                }}
                            >
                                {product.is_vip === 1 && (
                                    <Tag color="warning" style={{ margin: 0 }}>
                                        {gLang('shop.executiveLimitShort')}
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
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <h4
                                    style={{
                                        margin: 0,
                                        fontSize: 15,
                                        lineHeight: '1.3',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'normal',
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
                                    WebkitLineClamp: isTablet ? 3 : 1,
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
                            <div
                                style={{
                                    marginTop: 10,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-start',
                                    gap: 10,
                                }}
                            >
                                <div>
                                    <Text
                                        style={{
                                            display: 'block',
                                            fontSize: 11,
                                            color: metaColor,
                                            lineHeight: 1.2,
                                        }}
                                    >
                                        {gLang('shop.itemPrice')}
                                    </Text>
                                    <Text
                                        style={{
                                            color: priceColor,
                                            fontWeight: 700,
                                            fontSize: 22,
                                            lineHeight: 1.1,
                                        }}
                                    >
                                        {Number(product.price || 0)}
                                    </Text>
                                </div>
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        color: salesColor,
                                        fontSize: 12,
                                        whiteSpace: 'normal',
                                        lineHeight: 1.4,
                                    }}
                                >
                                    <FireOutlined style={{ fontSize: 12, color: salesIconColor }} />
                                    <span>{gLang('shop.soldCountLabel', { count: product.sales })}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* 悬浮销量信息（不占布局高度） */}
                    {!isMobile && (
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
                    )}
                </>
            ) : (
                /* 桌面端布局 */
                <>
                    <div style={{ position: 'relative', marginRight: 12, flexShrink: 0 }}>
                        <SafeImage
                            src={itemImage}
                            alt={product.title}
                            style={{
                                width: 96,
                                height: 96,
                                objectFit: 'contain',
                                borderRadius: 16,
                                flexShrink: 0,
                                background: imageBackground,
                                transform: isHover ? 'scale(1.06) translateY(-3px)' : 'scale(1)',
                                transition: 'transform 0.28s ease',
                            }}
                        />
                        {promoBadgeText && (
                            <div
                                style={{
                                    position: 'absolute',
                                    top: -10,
                                    left: -12,
                                    padding: '4px 10px',
                                    borderRadius: 999,
                                    background: promoBadgeColor,
                                    color: '#fff',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    lineHeight: 1.1,
                                    boxShadow: '0 10px 22px rgba(255, 92, 61, 0.28)',
                                    transform: 'rotate(-12deg)',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {promoBadgeText}
                            </div>
                        )}
                    </div>
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
                                whiteSpace: isTablet ? 'normal' : 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                lineHeight: '1.3',
                                minWidth: 0,
                                color: titleColor,
                                display: isTablet ? '-webkit-box' : 'block',
                                WebkitBoxOrient: isTablet ? 'vertical' : undefined,
                                WebkitLineClamp: isTablet ? 2 : undefined,
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
