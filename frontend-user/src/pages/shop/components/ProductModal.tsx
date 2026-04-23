import {
    Modal,
    Grid,
    Typography,
    Form,
    InputNumber,
    Divider,
    Button,
    message,
    Row,
    Col,
    Space,
    Card,
    Tag,
} from 'antd';
import React, { useEffect, useState } from 'react';
import { fetchData } from '@common/axiosConfig';
import defaultImage from '../default-product.png';
import type { Rule } from 'antd/es/form';
import type { Product, SpinLotteryReward } from '@ecuc/shared/types/item.types';
import { gLang } from '@common/language';
import { MediaUser, MediaStatus } from '@ecuc/shared/types/media.types';
import PurchaseLimitInfo from './PurchaseLimitInfo';
import { parseProductJSON } from '../shopUtils';
import {
    MinusOutlined,
    PlusOutlined,
    ShareAltOutlined,
    ShoppingCartOutlined,
    ThunderboltOutlined,
} from '@ant-design/icons';

const { useBreakpoint } = Grid;
const { Paragraph, Text, Title } = Typography;

const formatDateTime = (value?: string | null) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('zh-CN', { hour12: false });
};

// 数量控制按钮样式
const quantityControlStyles = `
    .quantity-control-btn {
        background-color: var(--ant-color-fill-quaternary) !important;
        border-color: var(--ant-color-border) !important;
        color: var(--ant-color-text) !important;
    }
    
    .quantity-control-btn:hover:not(:disabled) {
        background-color: var(--ant-color-fill-secondary) !important;
        border-color: var(--ant-color-primary) !important;
        color: var(--ant-color-primary) !important;
        transform: scale(1.05);
    }
    
    .quantity-control-btn:active:not(:disabled) {
        transform: scale(0.95);
    }
    
    .quantity-control-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

// 注入样式
if (typeof document !== 'undefined') {
    const styleId = 'quantity-control-styles';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = quantityControlStyles;
        document.head.appendChild(style);
    }
}

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    fallback?: string;
    allowSmall?: boolean;
}

const SafeImage = ({
    src,
    alt,
    fallback = defaultImage,
    allowSmall = false,
    ...props
}: SafeImageProps) => {
    const [imgSrc, setImgSrc] = useState<string | undefined>(src);
    const [imgLoaded, setImgLoaded] = useState(false);
    const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0 });

    const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const img = e.target as HTMLImageElement;
        setImgDimensions({ width: img.naturalWidth, height: img.naturalHeight });
        setImgLoaded(true);
    };

    // 如果图片尺寸过小（小于100x100），则不显示
    const shouldShowImage =
        allowSmall || (imgDimensions.width >= 100 && imgDimensions.height >= 100);

    return imgLoaded && shouldShowImage ? (
        <img
            {...props}
            src={imgSrc || fallback}
            alt={alt}
            onError={() => {
                setImgSrc(fallback);
            }}
            onLoad={handleImageLoad}
        />
    ) : (
        <img
            {...props}
            src={imgSrc || fallback}
            alt={alt}
            onError={() => {
                setImgSrc(fallback);
            }}
            onLoad={handleImageLoad}
            style={{ display: imgLoaded && !shouldShowImage ? 'none' : 'block', ...props.style }}
        />
    );
};

interface ProductModalProps {
    media: MediaUser | null;
    product: Product | null;
    onClose: () => void;
    defaultImage: string;
    balance: number;
    onSuccess?: () => void;
}

export default function ProductModal({
    media,
    product,
    onClose,
    balance,
    onSuccess,
}: ProductModalProps) {
    const screens = useBreakpoint();
    const [form] = Form.useForm();
    const [totalAmount, setTotalAmount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [messageApi, messageContextHolder] = message.useMessage();
    const [mergedProduct, setMergedProduct] = useState<Product | null>(product);
    const [shareLoading, setShareLoading] = useState(false);
    const [spinLoading, setSpinLoading] = useState(false);
    const [spinReward, setSpinReward] = useState<SpinLotteryReward | null>(null);
    const [isSpinning, setIsSpinning] = useState(false);
    const [spinBurstVisible, setSpinBurstVisible] = useState(false);
    const [spinBatchRewards, setSpinBatchRewards] = useState<SpinLotteryReward[]>([]);
    const [spinBatchOpen, setSpinBatchOpen] = useState(false);
    const [spinPaymentOpen, setSpinPaymentOpen] = useState(false);
    const [spinPaymentDrawCount, setSpinPaymentDrawCount] = useState(1);

    const effectiveProduct = mergedProduct ?? product;
    const pricingPreview = effectiveProduct?.pricing_preview;
    const spinPreview = effectiveProduct?.spin_preview;
    const basePrice = Number(pricingPreview?.base_price ?? effectiveProduct?.price ?? 0);
    const currentPrice = Number(effectiveProduct?.price ?? 0);
    const savedAmount = Math.max(0, basePrice - currentPrice);
    const discountPercent = basePrice > 0 ? (savedAmount / basePrice) * 100 : 0;
    const isSpinLottery = effectiveProduct?.extra_config?.product_mode === 'spin_lottery';
    const spinUnitPrice = Math.max(0, Number(effectiveProduct?.price ?? 0));
    const spinPaymentAmount = Math.max(0, spinUnitPrice * spinPaymentDrawCount);
    const isSpinPaymentInsufficient = spinPaymentAmount > Math.max(0, Number(balance ?? 0));

    // 权限检查：只有权限为2或3的用户才能购买
    const hasPurchasePermission =
        media?.status === MediaStatus.ActiveCreator ||
        media?.status === MediaStatus.ExcellentCreator ||
        (media?.status === MediaStatus.PendingReview && media?.EBalance !== 0);
    const permissionDisabled = !hasPurchasePermission;

    const getPurchaseLimits = () => {
        if (!effectiveProduct) return { maxQuantity: 0, remainingText: '' };

        // 全局限购（总个人限购 global_limit）
        const remainingGlobal =
            effectiveProduct.global_limit && effectiveProduct.global_limit > 0
                ? effectiveProduct.global_limit - effectiveProduct.limit_sales
                : Infinity;

        // 每月总限购（total_limit）
        const remainingTotal =
            effectiveProduct.total_limit && effectiveProduct.total_limit > 0
                ? effectiveProduct.total_limit - effectiveProduct.sales_monthly
                : Infinity;

        // 每月个人限购（monthly_limit）
        const remainingMonthly =
            effectiveProduct.monthly_limit && effectiveProduct.monthly_limit > 0
                ? effectiveProduct.monthly_limit - effectiveProduct.current_month_sales
                : Infinity;

        // 永久总限购（permanent_limit）
        const remainingPermanent =
            effectiveProduct.permanent_limit && effectiveProduct.permanent_limit > 0
                ? effectiveProduct.permanent_limit - effectiveProduct.sales
                : Infinity;
        // 取四者最小值
        const maxQuantity = Math.min(
            remainingGlobal,
            remainingTotal,
            remainingMonthly,
            remainingPermanent
        );

        const limits = [];
        if (effectiveProduct.global_limit && effectiveProduct.global_limit > 0) {
            limits.push(`${gLang('shop.globalRemaining')}: ${remainingGlobal}`);
        }
        if (effectiveProduct.total_limit && effectiveProduct.total_limit > 0) {
            limits.push(`${gLang('shop.totalRemaining')}: ${remainingTotal}`);
        }
        if (effectiveProduct.monthly_limit && effectiveProduct.monthly_limit > 0) {
            limits.push(`${gLang('shop.monthlyRemaining')}: ${remainingMonthly}`);
        }
        if (effectiveProduct.permanent_limit && effectiveProduct.permanent_limit > 0) {
            limits.push(`${gLang('shop.permanentRemaining')}: ${remainingPermanent}`);
        }

        return {
            maxQuantity: maxQuantity > 0 ? maxQuantity : 0,
            remainingText: limits.length > 0 ? limits.join(' | ') : '',
            hasLimits: limits.length > 0,
        };
    };

    const { maxQuantity } = getPurchaseLimits();
    const isUnlimited = !Number.isFinite(maxQuantity);
    const isSoldOut = maxQuantity <= 0;
    const insufficientBalance = Number(balance ?? 0) < (totalAmount || 0);

    // 数量变化处理
    const handleQuantityChange = (value: number | null) => {
        if (!value || value < 1) return;
        const clampedValue = Math.min(value, maxQuantity);
        form.setFieldsValue({ quantity: clampedValue });
        const price = Number(effectiveProduct?.price) || 0;
        setTotalAmount(clampedValue * price);
    };

    // 验证规则
    const quantityRules: Rule[] = [
        { required: true, message: gLang('shop.pleaseSelectPurchaseQuantity') },
        { type: 'number', min: 1, message: gLang('shop.quantityCannotBeLessThan1') },
        {
            validator: (_rule, value) => {
                if (!isUnlimited && value > maxQuantity) {
                    return Promise.reject(
                        isSoldOut
                            ? gLang('shop.itemSoldOut')
                            : `${gLang('shop.maxPurchaseQuantity')}: ${maxQuantity}`
                    );
                }
                return Promise.resolve();
            },
        },
    ];

    useEffect(() => {
        if (product) {
            const price = Number((effectiveProduct ?? product).price) || 0;
            setTotalAmount(price);
            // 售罄时不显示数量
            form.setFieldsValue({
                quantity: isSoldOut ? undefined : 1,
            });
        }
    }, [product, effectiveProduct, form, isSoldOut]);

    // 弹窗打开后，拉取包含个人限购合并后的商品数据（按ID查询）
    useEffect(() => {
        setMergedProduct(product);
        setSpinReward(null);
        setIsSpinning(false);
        setSpinBurstVisible(false);
        setSpinBatchRewards([]);
        setSpinBatchOpen(false);
        setSpinPaymentOpen(false);
        setSpinPaymentDrawCount(1);
        if (!product) return;
        const resolvedItemId = Number((product as any)?.id ?? (product as any)?.ID);
        if (!Number.isFinite(resolvedItemId) || resolvedItemId <= 0) return;
        fetchData({
            url: `/item/searchById?id=${resolvedItemId}`,
            method: 'GET',
            data: {},
            setData: values => {
                const item = (values?.data ?? null) as Product | null;
                if (item) setMergedProduct(item);
            },
        });
    }, [product]);

    const spinRewards = spinPreview?.rewards ?? [];
    const getRewardTier = (reward: SpinLotteryReward) => {
        const weight = Number(reward.probability ?? 0);
        if (weight <= 1) return 'UR';
        if (weight <= 3) return 'SSR';
        if (weight <= 8) return 'SR';
        return 'R';
    };
    const getTierColors = (tier: string) => {
        if (tier === 'UR') {
            return {
                light: '#f5d76e',
                deep: '#f59e0b',
                glow: 'rgba(245, 158, 11, 0.62)',
            };
        }
        if (tier === 'SSR') {
            return {
                light: '#f472b6',
                deep: '#db2777',
                glow: 'rgba(236, 72, 153, 0.56)',
            };
        }
        if (tier === 'SR') {
            return {
                light: '#60a5fa',
                deep: '#2563eb',
                glow: 'rgba(59, 130, 246, 0.45)',
            };
        }
        return {
            light: '#94a3b8',
            deep: '#64748b',
            glow: 'rgba(100, 116, 139, 0.4)',
        };
    };
    const getRewardImage = (reward: SpinLotteryReward) =>
        `/merchandise/${reward.category}.${reward.idItem}.png`;

    const refreshSpinProduct = (updatedProduct?: Product | null) => {
        if (updatedProduct) {
            setMergedProduct(updatedProduct);
        }
    };

    const handleClaimSpinChance = async () => {
        if (!effectiveProduct) return;
        if (permissionDisabled) {
            messageApi.warning(gLang('shop.activateShopPermissionFirst'));
            return;
        }
        const resolvedItemId = Number((effectiveProduct as any)?.id ?? (effectiveProduct as any)?.ID);
        if (!Number.isFinite(resolvedItemId) || resolvedItemId <= 0) return;

        setShareLoading(true);
        try {
            const shareUrl = window.location.href;
            const shareTitle = gLang('shop.spinLotteryShareTitle');
            const shareText = gLang('shop.spinLotteryShareDescription');
            if (navigator.share) {
                await navigator.share({
                    title: shareTitle,
                    text: shareText,
                    url: shareUrl,
                });
            } else {
                await navigator.clipboard.writeText(shareUrl);
                messageApi.success(gLang('shop.spinLotteryShareCopied'));
            }

            let shareGranted = false;
            await fetchData({
                url: `/item/spin/${resolvedItemId}/share`,
                method: 'POST',
                data: {},
                setData: values => {
                    shareGranted = true;
                    const remainingChances = Number(values?.data?.remainingChances ?? 0);
                    messageApi.success(
                        gLang('shop.spinLotteryShareSuccess', { count: remainingChances })
                    );
                },
            });
            if (!shareGranted) {
                return;
            }

            await fetchData({
                url: `/item/searchById?id=${resolvedItemId}`,
                method: 'GET',
                data: {},
                setData: values => {
                    refreshSpinProduct((values?.data ?? null) as Product | null);
                },
            });
        } catch {
            messageApi.error(gLang('shop.spinLotteryShareFailed'));
        } finally {
            setShareLoading(false);
        }
    };

    const performSingleSpin = async (resolvedItemId: number): Promise<SpinLotteryReward | null> => {
        let latestReward: SpinLotteryReward | null = null;

        await fetchData({
            url: `/item/spin/${resolvedItemId}/draw`,
            method: 'POST',
            data: {},
            setData: values => {
                latestReward = (values?.data?.reward ?? null) as SpinLotteryReward | null;
            },
        });

        return latestReward;
    };

    const openSpinPayment = (drawCount: number) => {
        if (!effectiveProduct || spinRewards.length === 0 || isSpinning) return;
        if (permissionDisabled) {
            messageApi.warning(gLang('shop.activateShopPermissionFirst'));
            return;
        }
        const available = Number(spinPreview?.remaining_chances ?? 0);
        const safeDrawCount = Math.max(0, Math.min(drawCount, available));
        if (safeDrawCount <= 0) return;
        setSpinPaymentDrawCount(safeDrawCount);
        setSpinPaymentOpen(true);
    };

    const handleSpinDraw = async () => {
        if (!effectiveProduct || spinRewards.length === 0 || isSpinning) return;
        if (permissionDisabled) {
            messageApi.warning(gLang('shop.activateShopPermissionFirst'));
            return;
        }
        const resolvedItemId = Number((effectiveProduct as any)?.id ?? (effectiveProduct as any)?.ID);
        if (!Number.isFinite(resolvedItemId) || resolvedItemId <= 0) return;

        setSpinLoading(true);
        setIsSpinning(true);
        setSpinReward(null);
        setSpinBurstVisible(false);
        try {
            await new Promise(resolve => window.setTimeout(resolve, 900));
            const reward = await performSingleSpin(resolvedItemId);
            if (!reward) {
                setIsSpinning(false);
                return;
            }
            window.setTimeout(() => {
                setSpinReward(reward);
                setSpinBurstVisible(true);
                setIsSpinning(false);
            }, 420);
            window.setTimeout(() => {
                setSpinBurstVisible(false);
            }, 1300);

            await fetchData({
                url: `/item/searchById?id=${resolvedItemId}`,
                method: 'GET',
                data: {},
                setData: latestValues => {
                    refreshSpinProduct((latestValues?.data ?? null) as Product | null);
                },
            });
            if (onSuccess) onSuccess();
        } catch {
            setIsSpinning(false);
            setSpinBurstVisible(false);
            messageApi.error(gLang('shop.spinLotteryDrawFailed'));
        } finally {
            setSpinLoading(false);
        }
    };

    const handleSpinDrawBatch = async (requestedDrawCount?: number) => {
        if (!effectiveProduct || spinRewards.length === 0 || isSpinning) return;
        if (permissionDisabled) {
            messageApi.warning(gLang('shop.activateShopPermissionFirst'));
            return;
        }
        const resolvedItemId = Number((effectiveProduct as any)?.id ?? (effectiveProduct as any)?.ID);
        if (!Number.isFinite(resolvedItemId) || resolvedItemId <= 0) return;

        const available = Number(spinPreview?.remaining_chances ?? 0);
        const drawCount = Math.min(Math.max(1, requestedDrawCount ?? 10), available);
        if (drawCount <= 0) return;

        setSpinLoading(true);
        setIsSpinning(true);
        setSpinReward(null);
        setSpinBurstVisible(false);
        setSpinBatchRewards([]);
        try {
            await new Promise(resolve => window.setTimeout(resolve, 700));
            const rewards: SpinLotteryReward[] = [];
            for (let i = 0; i < drawCount; i += 1) {
                const reward = await performSingleSpin(resolvedItemId);
                if (!reward) break;
                rewards.push(reward);
                await new Promise(resolve => window.setTimeout(resolve, 140));
            }
            if (rewards.length === 0) {
                setIsSpinning(false);
                return;
            }
            setSpinBatchRewards(rewards);
            setSpinBatchOpen(true);
            setSpinBurstVisible(true);
            window.setTimeout(() => setSpinBurstVisible(false), 1100);
            setIsSpinning(false);

            await fetchData({
                url: `/item/searchById?id=${resolvedItemId}`,
                method: 'GET',
                data: {},
                setData: latestValues => {
                    refreshSpinProduct((latestValues?.data ?? null) as Product | null);
                },
            });
            if (onSuccess) onSuccess();
        } catch {
            setIsSpinning(false);
            setSpinBurstVisible(false);
            messageApi.error(gLang('shop.spinLotteryDrawFailed'));
        } finally {
            setSpinLoading(false);
        }
    };

    const handleConfirmSpinPayment = async () => {
        if (isSpinPaymentInsufficient) {
            messageApi.error(gLang('shop.spinLotteryPaymentInsufficient'));
            return;
        }
        const drawCount = Math.max(1, spinPaymentDrawCount);
        setSpinPaymentOpen(false);
        if (drawCount > 1) {
            await handleSpinDrawBatch(drawCount);
            return;
        }
        await handleSpinDraw();
    };

    const handlePurchase = async (values: { quantity: number }) => {
        if (values.quantity > maxQuantity) {
            messageApi.error(gLang('shop.purchaseQuantityExceedsAvailableStock'));
            return;
        }

        setLoading(true);
        try {
            const resolvedItemId = Number((product as any)?.id ?? (product as any)?.ID);
            if (!Number.isFinite(resolvedItemId) || resolvedItemId <= 0) {
                messageApi.error(gLang('shop.networkRequestException'));
                setLoading(false);
                return;
            }
            await fetchData({
                url: `/item/purchase`,
                method: 'POST',
                data: {
                    itemId: resolvedItemId,
                    quantity: values.quantity,
                },
                setData: value => {
                    if (value) {
                        messageApi.success(gLang('shop.purchaseSuccess'));
                    }
                    onClose();
                    if (onSuccess) onSuccess();
                },
            });
        } catch {
            messageApi.error(gLang('shop.networkRequestException'));
        } finally {
            setLoading(false);
        }
    };

    if (effectiveProduct && isSpinLottery) {
        const latestTier = spinReward ? getRewardTier(spinReward) : 'R';
        const latestTierColors = getTierColors(latestTier);
        return (
            <>
                {messageContextHolder}
                {spinBurstVisible ? (
                    <div
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 1100,
                            pointerEvents: 'none',
                            background:
                                'radial-gradient(circle at center, rgba(255,255,255,0.95) 0%, rgba(251,191,36,0.65) 24%, rgba(59,130,246,0.22) 52%, rgba(15,23,42,0) 76%)',
                            animation: 'spin-burst 0.82s ease-out forwards',
                        }}
                    />
                ) : null}
                <style>
                    {`
                    @keyframes spin-burst {
                        0% { opacity: 0; transform: scale(0.96); }
                        20% { opacity: 1; transform: scale(1.02); }
                        100% { opacity: 0; transform: scale(1.1); }
                    }
                    @keyframes spin-card-in {
                        0% { opacity: 0; transform: translateY(26px) scale(0.92); }
                        100% { opacity: 1; transform: translateY(0) scale(1); }
                    }
                    @keyframes spin-pack {
                        0% { transform: translateY(0) scale(1); filter: brightness(1); }
                        40% { transform: translateY(-6px) scale(1.03); filter: brightness(1.12); }
                        100% { transform: translateY(0) scale(1); filter: brightness(1); }
                    }
                    `}
                </style>
                <Modal
                    title={gLang('shop.spinLotteryInfoTitle')}
                    open={!!product}
                    onCancel={onClose}
                    footer={null}
                    width={screens.md ? 860 : '94%'}
                    destroyOnHidden={true}
                    style={{ top: 20 }}
                >
                    <Space direction="vertical" size={20} style={{ width: '100%' }}>
                        <Row>
                            <Col span={24} style={{ textAlign: 'center' }}>
                                <Tag color="purple" style={{ marginBottom: 12 }}>
                                    {gLang('shop.spinLotteryTag')}
                                </Tag>
                                <Title level={2} style={{ marginBottom: 8 }}>
                                    {effectiveProduct.title}
                                </Title>
                                <Paragraph style={{ color: '#666', marginBottom: 0 }}>
                                    {effectiveProduct.detail || gLang('shop.spinLotteryHint')}
                                </Paragraph>
                            </Col>
                        </Row>

                        <Card
                            style={{
                                borderRadius: 24,
                                background:
                                    'radial-gradient(circle at 20% 0%, rgba(168,85,247,0.3), rgba(59,130,246,0.18) 35%, rgba(15,23,42,0.96) 82%)',
                                border: '1px solid rgba(148,163,184,0.3)',
                                overflow: 'hidden',
                            }}
                        >
                            <Row gutter={[20, 20]} align="middle">
                                <Col xs={24} md={10}>
                                    <div
                                        style={{
                                            position: 'relative',
                                            width: '100%',
                                            maxWidth: 320,
                                            margin: '0 auto',
                                            padding: 14,
                                            borderRadius: 20,
                                            border: '1px solid rgba(148,163,184,0.32)',
                                            background:
                                                'linear-gradient(160deg, rgba(15,23,42,0.75), rgba(30,64,175,0.3))',
                                            animation: isSpinning
                                                ? 'spin-pack 780ms ease-in-out infinite'
                                                : undefined,
                                        }}
                                    >
                                        <div
                                            style={{
                                                position: 'absolute',
                                                inset: 0,
                                                borderRadius: 20,
                                                background:
                                                    'radial-gradient(circle at 30% 0%, rgba(251,191,36,0.24), rgba(251,191,36,0) 56%)',
                                                pointerEvents: 'none',
                                            }}
                                        />
                                        <div style={{ display: 'flex', gap: 10 }}>
                                            {spinRewards.slice(0, 2).map((reward, index) => {
                                                const tier = getRewardTier(reward);
                                                const tierColors = getTierColors(tier);
                                                return (
                                                    <div
                                                        key={reward.id}
                                                        style={{
                                                            flex: 1,
                                                            borderRadius: 14,
                                                            overflow: 'hidden',
                                                            border: `1px solid ${tierColors.light}`,
                                                            boxShadow: `0 0 14px ${tierColors.glow}`,
                                                            transform:
                                                                index === 0 ? 'rotate(-4deg)' : 'rotate(4deg)',
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                background: `linear-gradient(135deg, ${tierColors.deep}, #0f172a)`,
                                                                color: '#fff',
                                                                fontSize: 12,
                                                                fontWeight: 700,
                                                                padding: '6px 8px',
                                                            }}
                                                        >
                                                            {tier}
                                                        </div>
                                                        <SafeImage
                                                            src={getRewardImage(reward)}
                                                            alt={reward.label}
                                                            allowSmall
                                                            style={{
                                                                width: '100%',
                                                                aspectRatio: '1 / 1',
                                                                objectFit: 'cover',
                                                                display: 'block',
                                                                background: 'rgba(15,23,42,0.45)',
                                                            }}
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div
                                            style={{
                                                marginTop: 12,
                                                textAlign: 'center',
                                                color: 'rgba(255,255,255,0.78)',
                                                fontWeight: 600,
                                            }}
                                        >
                                            {isSpinning
                                                ? gLang('shop.spinLotterySpinning')
                                                : gLang('shop.spinLotteryCore')}
                                        </div>
                                    </div>
                                </Col>
                                <Col xs={24} md={14}>
                                    <Space direction="vertical" size={14} style={{ width: '100%' }}>
                                        <Title level={3} style={{ color: '#fff', margin: 0 }}>
                                            {gLang('shop.spinLotteryHeadline')}
                                        </Title>
                                        <Paragraph
                                            style={{
                                                color: 'rgba(255,255,255,0.72)',
                                                margin: 0,
                                            }}
                                        >
                                            {gLang('shop.spinLotteryHint')}
                                        </Paragraph>
                                        <Row gutter={[12, 12]}>
                                            <Col span={12}>
                                                <Card size="small" style={{ borderRadius: 16 }}>
                                                    <Text type="secondary">
                                                        {gLang('shop.spinLotteryRemaining')}
                                                    </Text>
                                                    <Title level={2} style={{ margin: '8px 0 0' }}>
                                                        {Number(spinPreview?.remaining_chances ?? 0)}
                                                    </Title>
                                                </Card>
                                            </Col>
                                            <Col span={12}>
                                                <Card size="small" style={{ borderRadius: 16 }}>
                                                    <Text type="secondary">
                                                        {gLang('shop.spinLotteryTodayShare')}
                                                    </Text>
                                                    <Title level={2} style={{ margin: '8px 0 0' }}>
                                                        {Number(spinPreview?.shared_today ?? 0)}/
                                                        {Number(spinPreview?.daily_share_limit ?? 0)}
                                                    </Title>
                                                </Card>
                                            </Col>
                                        </Row>
                                        <Space wrap>
                                            <Button
                                                icon={<ShareAltOutlined />}
                                                loading={shareLoading}
                                                onClick={handleClaimSpinChance}
                                                disabled={shareLoading || spinLoading || isSpinning}
                                            >
                                                {gLang('shop.spinLotteryShareAction')}
                                            </Button>
                                            <Button
                                                type="primary"
                                                icon={<ThunderboltOutlined />}
                                                loading={spinLoading}
                                                onClick={() => openSpinPayment(1)}
                                                disabled={
                                                    (!permissionDisabled &&
                                                        Number(spinPreview?.remaining_chances ?? 0) <= 0) ||
                                                    isSpinning
                                                }
                                            >
                                                {isSpinning
                                                    ? gLang('shop.spinLotterySpinning')
                                                    : gLang('shop.spinLotteryDrawAction')}
                                            </Button>
                                            <Button
                                                ghost
                                                icon={<ThunderboltOutlined />}
                                                loading={spinLoading}
                                                onClick={() => openSpinPayment(10)}
                                                disabled={
                                                    (!permissionDisabled &&
                                                        Number(spinPreview?.remaining_chances ?? 0) <= 0) ||
                                                    isSpinning
                                                }
                                            >
                                                10x
                                            </Button>
                                        </Space>
                                        {spinReward ? (
                                            <Card
                                                style={{
                                                    borderRadius: 18,
                                                    background: `linear-gradient(135deg, ${latestTierColors.light}30, ${latestTierColors.deep}26)`,
                                                    border: `1px solid ${latestTierColors.light}`,
                                                    boxShadow: `0 0 26px ${latestTierColors.glow}`,
                                                    animation: 'spin-card-in 320ms ease-out',
                                                }}
                                            >
                                                <Space align="center" size={8}>
                                                    <Tag
                                                        style={{
                                                            border: 'none',
                                                            color: '#111827',
                                                            fontWeight: 700,
                                                            background: `linear-gradient(135deg, ${latestTierColors.light}, #ffffff)`,
                                                            marginInlineEnd: 0,
                                                        }}
                                                    >
                                                        {latestTier}
                                                    </Tag>
                                                    <Text strong style={{ color: '#fff' }}>
                                                        {gLang('shop.spinLotteryResultTitle')}
                                                    </Text>
                                                </Space>
                                                <Title
                                                    level={4}
                                                    style={{
                                                        color: '#fff',
                                                        margin: '8px 0 0',
                                                        textShadow: `0 0 18px ${latestTierColors.glow}`,
                                                    }}
                                                >
                                                    {spinReward.label}
                                                </Title>
                                                <SafeImage
                                                    src={getRewardImage(spinReward)}
                                                    alt={spinReward.label}
                                                    allowSmall
                                                    style={{
                                                        width: '100%',
                                                        maxWidth: 220,
                                                        aspectRatio: '1 / 1',
                                                        marginTop: 10,
                                                        borderRadius: 14,
                                                        objectFit: 'cover',
                                                        border: `1px solid ${latestTierColors.light}`,
                                                        boxShadow: `0 0 16px ${latestTierColors.glow}`,
                                                    }}
                                                />
                                            </Card>
                                        ) : null}
                                    </Space>
                                </Col>
                            </Row>
                        </Card>

                        {spinBatchOpen && spinBatchRewards.length > 0 ? (
                            <Card
                                style={{
                                    borderRadius: 18,
                                    border: '1px solid rgba(99,102,241,0.3)',
                                    background:
                                        'linear-gradient(135deg, rgba(30,41,59,0.96), rgba(37,99,235,0.16))',
                                }}
                            >
                                <Space
                                    direction="vertical"
                                    size={12}
                                    style={{ width: '100%' }}
                                >
                                    <Space
                                        align="center"
                                        style={{ width: '100%', justifyContent: 'space-between' }}
                                    >
                                        <Text strong style={{ color: '#fff' }}>
                                            10x RESULT
                                        </Text>
                                        <Button
                                            size="small"
                                            onClick={() => setSpinBatchOpen(false)}
                                        >
                                            OK
                                        </Button>
                                    </Space>
                                    <Row gutter={[10, 10]}>
                                        {spinBatchRewards.map((reward, index) => {
                                            const tier = getRewardTier(reward);
                                            const tierColors = getTierColors(tier);
                                            return (
                                                <Col xs={12} sm={8} md={6} key={`${reward.id}-${index}`}>
                                                    <div
                                                        style={{
                                                            borderRadius: 12,
                                                            padding: 10,
                                                            minHeight: 98,
                                                            border: `1px solid ${tierColors.light}`,
                                                            background: `linear-gradient(140deg, ${tierColors.deep}24, rgba(15,23,42,0.9))`,
                                                            boxShadow: `0 0 16px ${tierColors.glow}`,
                                                        }}
                                                    >
                                                        <Tag
                                                            style={{
                                                                border: 'none',
                                                                background: tierColors.light,
                                                                color: '#111827',
                                                                fontWeight: 700,
                                                                marginInlineEnd: 0,
                                                            }}
                                                        >
                                                            {tier}
                                                        </Tag>
                                                        <div
                                                            style={{
                                                                marginTop: 8,
                                                                color: '#fff',
                                                                fontWeight: 700,
                                                                lineHeight: 1.3,
                                                                minHeight: 34,
                                                            }}
                                                        >
                                                            {reward.label}
                                                        </div>
                                                        <SafeImage
                                                            src={getRewardImage(reward)}
                                                            alt={reward.label}
                                                            allowSmall
                                                            style={{
                                                                width: '100%',
                                                                marginTop: 8,
                                                                borderRadius: 10,
                                                                aspectRatio: '1 / 1',
                                                                objectFit: 'cover',
                                                                border: `1px solid ${tierColors.light}`,
                                                            }}
                                                        />
                                                    </div>
                                                </Col>
                                            );
                                        })}
                                    </Row>
                                </Space>
                            </Card>
                        ) : null}

                        <Space direction="vertical" size={10} style={{ width: '100%' }}>
                            <Text strong>{gLang('shop.spinLotteryPrizePool')}</Text>
                            <Row gutter={[12, 12]}>
                                {spinRewards.map(reward => {
                                    const tier = getRewardTier(reward);
                                    const tierColors = getTierColors(tier);
                                    return (
                                        <Col xs={24} md={12} key={reward.id}>
                                            <Card
                                                size="small"
                                                style={{
                                                    borderRadius: 14,
                                                    border: `1px solid ${tierColors.light}`,
                                                    background: `linear-gradient(135deg, ${tierColors.deep}12, rgba(255,255,255,0.95))`,
                                                }}
                                            >
                                                <Space direction="vertical" size={4}>
                                                    <Space align="center">
                                                        <Tag
                                                            style={{
                                                                border: 'none',
                                                                marginInlineEnd: 0,
                                                                fontWeight: 700,
                                                                color: '#111827',
                                                                background: tierColors.light,
                                                            }}
                                                        >
                                                            {tier}
                                                        </Tag>
                                                        <Text strong>{reward.label}</Text>
                                                    </Space>
                                                    <SafeImage
                                                        src={getRewardImage(reward)}
                                                        alt={reward.label}
                                                        allowSmall
                                                        style={{
                                                            width: '100%',
                                                            borderRadius: 10,
                                                            aspectRatio: '16 / 9',
                                                            objectFit: 'cover',
                                                            background: 'rgba(15,23,42,0.4)',
                                                        }}
                                                    />
                                                    <Text type="secondary">
                                                        {gLang('shop.spinLotteryProbability', {
                                                            count: reward.probability,
                                                        })}
                                                    </Text>
                                                </Space>
                                            </Card>
                                        </Col>
                                    );
                                })}
                            </Row>
                        </Space>
                    </Space>
                </Modal>
                <Modal
                    title={gLang('shop.spinLotteryPaymentTitle')}
                    open={spinPaymentOpen}
                    onCancel={() => setSpinPaymentOpen(false)}
                    onOk={handleConfirmSpinPayment}
                    okText={gLang('shop.spinLotteryPayAndDraw')}
                    cancelText={gLang('common.cancel')}
                    confirmLoading={spinLoading}
                    okButtonProps={{ disabled: isSpinPaymentInsufficient || spinLoading || isSpinning }}
                    destroyOnHidden
                >
                    <Space direction="vertical" size={12} style={{ width: '100%' }}>
                        <Text>{gLang('shop.spinLotteryPaymentDescription')}</Text>
                        <Row justify="space-between">
                            <Text type="secondary">{gLang('shop.spinLotteryDrawPrice')}</Text>
                            <Text strong>{spinUnitPrice}</Text>
                        </Row>
                        <Row justify="space-between">
                            <Text type="secondary">{gLang('shop.spinLotteryPaymentCount')}</Text>
                            <Text strong>{spinPaymentDrawCount}</Text>
                        </Row>
                        <Row justify="space-between">
                            <Text type="secondary">{gLang('shop.spinLotteryPaymentTotal')}</Text>
                            <Text strong>{spinPaymentAmount}</Text>
                        </Row>
                        <Row justify="space-between">
                            <Text type="secondary">{gLang('shop.spinLotteryPaymentBalance')}</Text>
                            <Text strong>{Math.max(0, Number(balance ?? 0))}</Text>
                        </Row>
                        {isSpinPaymentInsufficient ? (
                            <Text type="danger">{gLang('shop.spinLotteryPaymentInsufficient')}</Text>
                        ) : null}
                    </Space>
                </Modal>
            </>
        );
    }

    return (
        <>
            {messageContextHolder}
            <Modal
                title={gLang('shop.confirmPurchase')}
                open={!!product}
                onCancel={onClose}
                footer={null}
                width={screens.md ? 800 : '90%'}
                destroyOnHidden={true}
                style={{ top: 20 }}
            >
                {effectiveProduct && (
                    <Form
                        form={form}
                        onFinish={handlePurchase}
                        initialValues={{ quantity: 1 }}
                        onValuesChange={({ quantity }) => {
                            if (quantity !== undefined) {
                                const price = Number(effectiveProduct?.price) || 0;
                                setTotalAmount((quantity || 1) * price);
                            }
                        }}
                    >
                        <Space direction="vertical" size={24} style={{ width: '100%' }}>
                            {/* 只在图片尺寸足够大时显示 */}
                            <Row style={{ marginBottom: 16 }}>
                                <Col span={24} style={{ textAlign: 'center' }}>
                                    <SafeImage
                                        src={(function () {
                                            const p = effectiveProduct as any;
                                            try {
                                                const { category, itemId } = parseProductJSON(p);
                                                return `/merchandise/${category}.${itemId}.png`;
                                            } catch {
                                                return defaultImage;
                                            }
                                        })()}
                                        alt={effectiveProduct.title}
                                        style={{
                                            maxWidth: '100%',
                                            maxHeight: screens.md ? 360 : 240,
                                            height: 'auto',
                                            borderRadius: 6,
                                            objectFit: 'contain',
                                        }}
                                    />
                                </Col>
                            </Row>
                            <Row>
                                <Col span={24}>
                                    <Title level={1}>{effectiveProduct.title}</Title>
                                    <Paragraph
                                        ellipsis={{ rows: 4, expandable: true }}
                                        style={{ color: '#666' }}
                                    >
                                        {effectiveProduct.detail}
                                    </Paragraph>
                                </Col>
                            </Row>

                            <Divider style={{ margin: '0 0 8px' }}>
                                {gLang('shop.orderInformation')}
                            </Divider>

                            {/* 使用解耦后的限购信息组件 */}
                            <PurchaseLimitInfo product={effectiveProduct} />

                            {effectiveProduct.extra_config?.product_mode === 'lottery' && (
                                <>
                                    <Divider style={{ margin: '0 0 8px' }}>
                                        {gLang('shop.lotteryInfoTitle')}
                                    </Divider>
                                    <Row gutter={24}>
                                        <Col span={12}>
                                            <Text strong>{gLang('shop.lotteryDrawAt')}</Text>
                                        </Col>
                                        <Col span={12} style={{ textAlign: 'right' }}>
                                            <Text>
                                                {formatDateTime(
                                                    effectiveProduct.extra_config?.lottery?.draw_at
                                                )}
                                            </Text>
                                        </Col>
                                    </Row>
                                    <Row gutter={24}>
                                        <Col span={12}>
                                            <Text strong>{gLang('shop.lotteryWinnerCount')}</Text>
                                        </Col>
                                        <Col span={12} style={{ textAlign: 'right' }}>
                                            <Text>
                                                {effectiveProduct.extra_config?.lottery
                                                    ?.winner_count ?? 1}
                                            </Text>
                                        </Col>
                                    </Row>
                                    <Row gutter={24}>
                                        <Col span={24}>
                                            <Text type="secondary">
                                                {gLang('shop.lotteryHint')}
                                            </Text>
                                        </Col>
                                    </Row>
                                </>
                            )}

                            {pricingPreview?.mode === 'market' && (
                                <>
                                    <Divider style={{ margin: '0 0 8px' }}>
                                        {gLang('shop.dynamicPriceInfoTitle')}
                                    </Divider>
                                    <div
                                        style={{
                                            marginBottom: 16,
                                            padding: screens.xs ? '14px 16px' : '16px 18px',
                                            borderRadius: 14,
                                            background:
                                                'linear-gradient(135deg, rgba(255,122,24,0.12) 0%, rgba(255,61,84,0.12) 100%)',
                                            border: '1px solid rgba(255,122,24,0.22)',
                                        }}
                                    >
                                        <Row align="middle" justify="space-between" gutter={[12, 12]}>
                                            <Col>
                                                <Text type="secondary">
                                                    {gLang('shop.salesAdjustment')}
                                                </Text>
                                                <div
                                                    style={{
                                                        fontSize: screens.xs ? 28 : 34,
                                                        fontWeight: 800,
                                                        lineHeight: 1,
                                                        color: '#ff6a00',
                                                        marginTop: 6,
                                                    }}
                                                >
                                                    {discountPercent.toFixed(1)}%
                                                </div>
                                            </Col>
                                            <Col style={{ textAlign: 'right' }}>
                                                <Text type="secondary">
                                                    {gLang('shop.savedAmount')}
                                                </Text>
                                                <div
                                                    style={{
                                                        fontSize: screens.xs ? 22 : 26,
                                                        fontWeight: 700,
                                                        lineHeight: 1.1,
                                                        color: '#ff4d4f',
                                                        marginTop: 6,
                                                    }}
                                                >
                                                    {savedAmount.toFixed(2)}
                                                </div>
                                            </Col>
                                        </Row>
                                    </div>
                                    <Row gutter={24}>
                                        <Col span={12}>
                                            <Text strong>{gLang('shop.basePrice')}</Text>
                                        </Col>
                                            <Col span={12} style={{ textAlign: 'right' }}>
                                            <Text>
                                                {Number(
                                                    pricingPreview.base_price
                                                ).toFixed(2)}
                                            </Text>
                                        </Col>
                                    </Row>
                                    <Row gutter={24}>
                                        <Col span={12}>
                                            <Text strong>{gLang('shop.currentSurprisePrice')}</Text>
                                        </Col>
                                        <Col span={12} style={{ textAlign: 'right' }}>
                                            <Text>
                                                {currentPrice.toFixed(2)}
                                            </Text>
                                        </Col>
                                    </Row>
                                    <Row gutter={24}>
                                        <Col span={12}>
                                            <Text strong>{gLang('shop.weekendMarkupPercent')}</Text>
                                        </Col>
                                        <Col span={12} style={{ textAlign: 'right' }}>
                                            <Text>
                                                {Number(
                                                    pricingPreview.weekend_markup_percent
                                                ).toFixed(2)}
                                                %
                                            </Text>
                                        </Col>
                                    </Row>
                                    <Row gutter={24}>
                                        <Col span={12}>
                                            <Text strong>{gLang('shop.weekdayNightMarkupPercent')}</Text>
                                        </Col>
                                        <Col span={12} style={{ textAlign: 'right' }}>
                                            <Text>
                                                {Number(
                                                    pricingPreview.weekday_night_markup_percent
                                                ).toFixed(2)}
                                                %
                                            </Text>
                                        </Col>
                                    </Row>
                                </>
                            )}

                            {pricingPreview?.mode === 'discriminatory' && (
                                <>
                                    <Divider style={{ margin: '0 0 8px' }}>
                                        {gLang('shop.dynamicPriceInfoTitle')}
                                    </Divider>
                                    <Row gutter={24}>
                                        <Col span={24}>
                                            <Text type="secondary">
                                                {gLang('shop.exclusivePriceHint')}
                                            </Text>
                                        </Col>
                                    </Row>
                                </>
                            )}

                            {/* 优化的数量选择区域 */}
                            <Card
                                size="small"
                                style={{
                                    backgroundColor: 'var(--ant-color-fill-quaternary)',
                                    border: '1px solid var(--ant-color-border)',
                                }}
                            >
                                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                                    {/* 数量选择标题 */}
                                    <Row>
                                        <Col span={24}>
                                            <Text strong style={{ fontSize: 16 }}>
                                                {gLang('shop.purchaseQuantity')}
                                            </Text>
                                        </Col>
                                    </Row>

                                    {/* 数量输入器 */}
                                    <Row>
                                        <Col span={24}>
                                            <Form.Item
                                                name="quantity"
                                                rules={quantityRules}
                                                style={{ marginBottom: 0 }}
                                            >
                                                <InputNumber
                                                    min={1}
                                                    max={isUnlimited ? undefined : maxQuantity}
                                                    disabled={isSoldOut || permissionDisabled}
                                                    style={{
                                                        width: '100%',
                                                        height: 40,
                                                        borderRadius: 6,
                                                    }}
                                                    step={1}
                                                    precision={0}
                                                    onChange={handleQuantityChange}
                                                    placeholder={
                                                        isSoldOut
                                                            ? gLang('shop.soldOut')
                                                            : undefined
                                                    }
                                                    controls={false}
                                                    addonBefore={
                                                        <Button
                                                            type="text"
                                                            icon={<MinusOutlined />}
                                                            onClick={() => {
                                                                const current =
                                                                    form.getFieldValue(
                                                                        'quantity'
                                                                    ) || 1;
                                                                if (current > 1) {
                                                                    handleQuantityChange(
                                                                        current - 1
                                                                    );
                                                                }
                                                            }}
                                                            disabled={
                                                                isSoldOut || permissionDisabled
                                                            }
                                                            style={{
                                                                border: 'none',
                                                                padding: '4px 8px',
                                                                borderRadius: '6px 0 0 6px',
                                                                transition: 'all 0.2s ease',
                                                            }}
                                                            className="quantity-control-btn"
                                                        />
                                                    }
                                                    addonAfter={
                                                        <Button
                                                            type="text"
                                                            icon={<PlusOutlined />}
                                                            onClick={() => {
                                                                const current =
                                                                    form.getFieldValue(
                                                                        'quantity'
                                                                    ) || 1;
                                                                if (
                                                                    isUnlimited ||
                                                                    current < maxQuantity
                                                                ) {
                                                                    handleQuantityChange(
                                                                        current + 1
                                                                    );
                                                                }
                                                            }}
                                                            disabled={
                                                                isSoldOut || permissionDisabled
                                                            }
                                                            style={{
                                                                border: 'none',
                                                                padding: '4px 8px',
                                                                borderRadius: '0 6px 6px 0',
                                                                transition: 'all 0.2s ease',
                                                            }}
                                                            className="quantity-control-btn"
                                                        />
                                                    }
                                                />
                                            </Form.Item>
                                        </Col>
                                    </Row>

                                    {/* 数量范围提示 */}
                                    {!isSoldOut && !isUnlimited && (
                                        <Row style={{ marginTop: 0 }}>
                                            <Col span={24}>
                                                <Text type="secondary" style={{ fontSize: 12 }}>
                                                    {gLang('shop.maxPurchaseQuantity')}:{' '}
                                                    {maxQuantity}
                                                </Text>
                                            </Col>
                                        </Row>
                                    )}
                                </Space>
                            </Card>

                            <Divider style={{ margin: '0 0 8px' }}>
                                {gLang('shop.paymentInformation')}
                            </Divider>

                            <Row gutter={24}>
                                <Col span={12}>
                                    <Text strong>{gLang('shop.remainingLovePoints')}</Text>
                                </Col>
                                <Col span={12} style={{ textAlign: 'right' }}>
                                    <Text style={{ color: '#10b981', fontWeight: 500 }}>
                                        {Number(balance ?? 0).toFixed(2)}
                                    </Text>
                                </Col>
                            </Row>

                            <Row gutter={24}>
                                <Col span={12}>
                                    <Text strong>{gLang('shop.itemPrice')}</Text>
                                </Col>
                                <Col span={12} style={{ textAlign: 'right' }}>
                                    <Text>{(Number(effectiveProduct.price) || 0).toFixed(2)}</Text>
                                </Col>
                            </Row>

                            {effectiveProduct.base_price !== undefined &&
                                effectiveProduct.base_price !== effectiveProduct.price && (
                                    <Row gutter={24}>
                                        <Col span={12}>
                                            <Text type="secondary">
                                                {gLang('shop.basePrice')}
                                            </Text>
                                        </Col>
                                        <Col span={12} style={{ textAlign: 'right' }}>
                                            <Text type="secondary">
                                                {Number(effectiveProduct.base_price).toFixed(2)}
                                            </Text>
                                        </Col>
                                    </Row>
                                )}

                            <Divider dashed style={{ margin: '12px 0' }} />

                            <Row gutter={24}>
                                <Col span={12}>
                                    <Text strong type="danger" style={{ fontSize: 16 }}>
                                        {gLang('shop.totalLoveCost')}
                                    </Text>
                                </Col>
                                <Col span={12} style={{ textAlign: 'right' }}>
                                    <Text strong type="danger" style={{ fontSize: 16 }}>
                                        {totalAmount.toFixed(2)}
                                    </Text>
                                </Col>
                            </Row>

                            <Form.Item>
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    size="large"
                                    loading={loading}
                                    disabled={
                                        isSoldOut ||
                                        loading ||
                                        permissionDisabled ||
                                        insufficientBalance
                                    }
                                    icon={<ShoppingCartOutlined />}
                                    style={{
                                        width: '100%',
                                        height: 48,
                                        opacity:
                                            permissionDisabled || insufficientBalance ? 0.6 : 1,
                                        borderRadius: 8,
                                    }}
                                >
                                    {isSoldOut
                                        ? gLang('shop.soldOut')
                                        : permissionDisabled
                                          ? gLang('shop.insufficientPermissionButton')
                                          : insufficientBalance
                                            ? gLang('shop.insufficientBalanceButton')
                                            : loading
                                              ? gLang('shop.submitting')
                                              : gLang('shop.immediatelyPurchase')}
                                </Button>
                            </Form.Item>
                        </Space>
                    </Form>
                )}
            </Modal>
        </>
    );
}
