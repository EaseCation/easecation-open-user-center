import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Button,
    Empty,
    Grid,
    message,
    Result,
    Space,
    Tag,
    Typography,
    theme,
} from 'antd';
import { ArrowRightOutlined, RightOutlined } from '@ant-design/icons';
import ProductModal from './components/ProductModal';
import PurchaseLogsModal from './components/PurchaseLogsModal';
import { CATEGORY_NAME_MAP } from '@ecuc/shared/constants/shop.constants';
import type { Product } from '@ecuc/shared/types/item.types';
import { fetchData } from '@common/axiosConfig';
// search handled inside ProductToolbar
import { MediaUser, MediaStatus } from '@ecuc/shared/types/media.types';
import { gLang } from '@common/language';
import { parseProductJSON, getUniqueCategories } from './shopUtils';
import ProductCard from './components/ProductCard';
import ProductToolbar from './components/ProductToolbar';
import SafeImage from './components/SafeImage';
import PageTitle from '@common/components/PageTitle/PageTitle';
import BalanceInfoCard from './components/BalanceInfoCard';
import defaultImage from './default-product.png';
import usePageTitle from '@common/hooks/usePageTitle';
import { useTheme } from '@common/contexts/ThemeContext';
import { CUSTOM_THEME_PALETTES } from '@common/themes/customPalettes';

// removed icon imports; toolbar handles icons internally
import { MEDIA_SHOP_MAINTENANCE } from '@ecuc/shared/constants/shop.constants';
import { useAuth } from '@common/contexts/AuthContext';

const { useBreakpoint } = Grid;
const { Paragraph, Title } = Typography;

type ShopSection = {
    key: string;
    title: string;
    subtitle: string;
    products: Product[];
    desktopInitialCount: number;
};

const SPIN_TAB_KEY = '__spin_lottery__';

// 预设颜色数组用于分类标签
const CATEGORY_COLORS = [
    'magenta',
    'red',
    'volcano',
    'orange',
    'gold',
    'lime',
    'green',
    'cyan',
    'blue',
    'geekblue',
    'purple',
];

export default function Shop() {
    usePageTitle(); // 使用页面标题管理Hook

    const [messageApi, contextHolder] = message.useMessage();
    const { token } = theme.useToken();
    const screens = useBreakpoint();
    const isMobile = !!screens.xs;
    const isTablet = !screens.xs && !!screens.md && !screens.xl;
    const isDesktopWide = !!screens.xl;
    const [userInfo, setUserInfo] = useState<MediaUser | null>(null);
    const [purchaseVisible, setPurchaseVisible] = useState(false);
    const [sortKey, setSortKey] = useState<
        'default' | 'priceAsc' | 'priceDesc' | 'salesAsc' | 'salesDesc' | 'timeAsc'
    >('default');
    const [searchValue, setSearchValue] = useState('');
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [productsLoading, setProductsLoading] = useState(true);
    const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({});
    const [mobileExpandedSections, setMobileExpandedSections] = useState<Record<string, boolean>>({});
    const catalogRef = useRef<HTMLDivElement | null>(null);

    // 购买记录里显示商品名所需映射（兼容后端返回 id/ID、字符串数字等差异）
    const idToTitle = useMemo(() => {
        const map = new Map<number, string>();
        for (const product of allProducts) {
            const rawId = (product as any).id ?? (product as any).ID;
            const pid = typeof rawId === 'string' ? Number(rawId) : rawId;
            if (typeof pid === 'number' && Number.isFinite(pid)) {
                map.set(pid, product.title);
            }
        }
        return map;
    }, [allProducts]);

    const { getThemeColor, customTheme, isCustomThemeActive } = useTheme();
    const palette = CUSTOM_THEME_PALETTES.blackOrange;
    const isBlackOrangeActive = isCustomThemeActive && customTheme === 'blackOrange';
    const productSurface = getThemeColor({
        light: '#ffffff',
        dark: '#1f1f1f',
        custom: { blackOrange: palette.surfaceAlt },
    });
    const productBorder = getThemeColor({
        light: '#f0f0f0',
        dark: '#303030',
        custom: { blackOrange: palette.border },
    });
    const emptyColor = getThemeColor({
        light: 'rgba(0, 0, 0, 0.45)',
        dark: 'rgba(255, 255, 255, 0.55)',
        custom: { blackOrange: palette.textSecondary },
    });
    const pageBackground = getThemeColor({
        light: 'linear-gradient(180deg, #f6f7fb 0%, #ffffff 24%, #f8fafc 100%)',
        dark: 'linear-gradient(180deg, #111111 0%, #151515 100%)',
        custom: { blackOrange: 'linear-gradient(180deg, #120b05 0%, #1b120a 100%)' },
    });
    const pageTitleColor = getThemeColor({
        light: '#1d1d1f',
        dark: '#f5f5f7',
        custom: { blackOrange: palette.textPrimary },
    });
    const pageSubtitleColor = getThemeColor({
        light: '#6e6e73',
        dark: 'rgba(255, 255, 255, 0.7)',
        custom: { blackOrange: palette.textSecondary },
    });
    const sectionSurface = getThemeColor({
        light: 'rgba(255, 255, 255, 0.82)',
        dark: 'rgba(24, 24, 24, 0.92)',
        custom: { blackOrange: 'rgba(35, 24, 14, 0.92)' },
    });
    const sectionBorder = getThemeColor({
        light: 'rgba(15, 23, 42, 0.06)',
        dark: 'rgba(255, 255, 255, 0.08)',
        custom: { blackOrange: 'rgba(255, 140, 26, 0.16)' },
    });
    const sectionShadow = isBlackOrangeActive
        ? '0 22px 48px rgba(255, 140, 26, 0.16)'
        : '0 20px 48px rgba(15, 23, 42, 0.08)';
    const heroGradient = getThemeColor({
        light: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 52%, #60a5fa 100%)',
        dark: 'linear-gradient(135deg, #15171d 0%, #1b3d7a 55%, #3c78f0 100%)',
        custom: { blackOrange: 'linear-gradient(135deg, #1a120b 0%, #6f3400 55%, #ff8c1a 100%)' },
    });
    const heroSecondaryText = getThemeColor({
        light: 'rgba(255, 255, 255, 0.78)',
        dark: 'rgba(255, 255, 255, 0.74)',
        custom: { blackOrange: 'rgba(255, 244, 229, 0.8)' },
    });
    const heroPillBackground = getThemeColor({
        light: 'rgba(255, 255, 255, 0.14)',
        dark: 'rgba(255, 255, 255, 0.12)',
        custom: { blackOrange: 'rgba(255, 255, 255, 0.12)' },
    });
    const heroButtonBackground = getThemeColor({
        light: '#ffffff',
        dark: '#f5f5f7',
        custom: { blackOrange: '#fff3e5' },
    });
    const heroButtonColor = getThemeColor({
        light: '#0f172a',
        dark: '#111111',
        custom: { blackOrange: '#8a4200' },
    });
    const { user } = useAuth();
    const isAdminUser = !!user?.permission?.some(
        p => p === 'authorize.super' || p === 'authorize.normal'
    );

    const [shouldAnimate, setShouldAnimate] = useState(false);

    useEffect(() => {
        setProductsLoading(true);
        setShouldAnimate(false);
        Promise.all([
            fetchData({
                url: `/media/info`,
                method: 'GET',
                setData: values => {
                    setUserInfo(values.result);
                },
                data: {},
            }),
            fetchData({
                url: `/item/search`,
                method: 'GET',
                setData: values => {
                    setAllProducts(values.data);
                },
                data: {},
            }),
        ])
            .catch(() => {
                messageApi.error(gLang('shop.fetchFail'));
            })
            .finally(() => {
                setProductsLoading(false);
                // Trigger animation after loading completes
                setTimeout(() => setShouldAnimate(true), 50);
            });
    }, [messageApi]);

    const handleInfo = () => {
        fetchData({
            url: `/media/info`,
            method: 'GET',
            setData: values => {
                setUserInfo(values.result);
            },
            data: {},
        });
    };

    const handleSearch = () => {
        setProductsLoading(true);
        fetchData({
            url: `/item/search?keyword=${searchValue}`,
            method: 'GET',
            setData: values => {
                setAllProducts(values.data);
            },
            data: {},
        })
            .catch(() => {
                messageApi.error(gLang('shop.searchFail'));
            })
            .finally(() => {
                setProductsLoading(false);
            });
    };

    // 购买记录搬到独立弹窗组件内部加载

    const getTitleById = (id: number) => {
        const key = Number(id);
        if (Number.isFinite(key)) {
            const title = idToTitle.get(key);
            if (title) return title;
        }
        return `#${id}`;
    };

    // 根据当前分类和搜索条件筛选商品
    const filteredProducts = useMemo(() => {
        if (activeCategory === 'all') {
            return allProducts;
        }
        if (activeCategory === SPIN_TAB_KEY) {
            return allProducts.filter(
                product => product.extra_config?.product_mode === 'spin_lottery'
            );
        }
        return allProducts.filter(product => {
            const { category } = parseProductJSON(product);
            return category === activeCategory;
        });
    }, [allProducts, activeCategory]);

    // 排序后的商品
    const sortedProducts = useMemo(() => {
        const list = [...filteredProducts];
        switch (sortKey) {
            case 'timeAsc':
                return list.sort((a, b) => (a as any).id - (b as any).id);
            case 'priceAsc':
                return list.sort((a, b) => a.price - b.price);
            case 'priceDesc':
                return list.sort((a, b) => b.price - a.price);
            case 'salesAsc':
                return list.sort((a, b) => a.sales - b.sales);
            case 'salesDesc':
                return list.sort((a, b) => b.sales - a.sales);
            case 'default':
            default:
                return list;
        }
    }, [filteredProducts, sortKey]);

    // 获取所有商品分类（带颜色）
    const productCategories = useMemo(() => {
        const categories = getUniqueCategories(allProducts);

        return categories.map((category, index) => ({
            name: category,
            color: CATEGORY_COLORS[index % CATEGORY_COLORS.length] ?? 'blue',
        }));
    }, [allProducts]);

    const getCategoryLabel = (categoryName: string) => {
        if (categoryName === SPIN_TAB_KEY) {
            return gLang('shop.spinLotteryTag');
        }
        const translationKey = `shop.category.${categoryName}`;
        const translated = gLang(translationKey);
        return translated === translationKey
            ? (CATEGORY_NAME_MAP.get(categoryName) ?? categoryName)
            : translated;
    };

    const tabItems = useMemo(
        () => [
            { key: 'all', label: gLang('shop.all') },
            {
                key: SPIN_TAB_KEY,
                label: (
                    <Tag color="purple" style={{ margin: 0 }}>
                        {gLang('shop.spinLotteryTag')}
                    </Tag>
                ),
            },
            ...productCategories.map(category => {
                return {
                    key: category.name,
                    label: (
                        <Tag color={category.color} style={{ margin: 0 }}>
                            {getCategoryLabel(category.name)}
                        </Tag>
                    ),
                };
            }),
        ],
        [productCategories]
    );

    const getImageUrl = (category: string, itemId: string): string => {
        const combinedKey = `${category}.${itemId}`;
        return `/merchandise/${combinedKey}.png`;
    };

    const productCards = useMemo(
        () =>
            sortedProducts.map(product => {
                const { category, itemId } = parseProductJSON(product);
                return {
                    product,
                    category,
                    itemImage: (product as any).imageUrl ?? getImageUrl(category, itemId),
                };
            }),
        [sortedProducts]
    );

    const heroProducts = useMemo(() => {
        const featuredCards = productCards.filter(item => item.product.extra_config?.homepage_featured);
        const scoreCard = (item: (typeof productCards)[number]) =>
            Number(item.product.sales ?? 0) +
            (item.product.extra_config?.product_mode === 'lottery' ? 60 : 0) +
            (item.product.extra_config?.product_mode === 'spin_lottery' ? 70 : 0) +
            (item.product.pricing_preview?.mode === 'market' ? 40 : 0) +
            (item.product.pricing_preview?.mode === 'discriminatory' ? 25 : 0) +
            (item.product.is_vip === 1 ? 15 : 0);
        const sortByScore = (left: (typeof productCards)[number], right: (typeof productCards)[number]) => {
            const leftScore =
                scoreCard(left);
            const rightScore = scoreCard(right);
            return rightScore - leftScore;
        };
        const limit = isMobile ? 1 : 2;
        const prioritized = [...featuredCards].sort(sortByScore).slice(0, limit);
        if (prioritized.length >= limit) {
            return prioritized;
        }
        const prioritizedIds = new Set(prioritized.map(item => (item.product as any).id));
        const fallback = [...productCards]
            .filter(item => !prioritizedIds.has((item.product as any).id))
            .sort(sortByScore)
            .slice(0, limit - prioritized.length);
        return [...prioritized, ...fallback];
    }, [isMobile, productCards]);

    const heroProductIds = useMemo(
        () => new Set(heroProducts.map(item => (item.product as any).id)),
        [heroProducts]
    );

    const remainingCards = useMemo(
        () => productCards.filter(item => !heroProductIds.has((item.product as any).id)),
        [productCards, heroProductIds]
    );

    const homepageSections = useMemo<ShopSection[]>(() => {
        const featured = [...remainingCards]
            .sort((a, b) => Number(b.product.sales ?? 0) - Number(a.product.sales ?? 0))
            .slice(0, 8)
            .map(item => item.product);
        const deals = remainingCards
            .filter(item => item.product.pricing_preview?.mode === 'market')
            .slice(0, 8)
            .map(item => item.product);
        const latest = [...remainingCards]
            .sort((a, b) => Number((b.product as any).id ?? 0) - Number((a.product as any).id ?? 0))
            .slice(0, 8)
            .map(item => item.product);
        const exclusive = remainingCards
            .filter(item => item.product.pricing_preview?.mode === 'discriminatory')
            .slice(0, 8)
            .map(item => item.product);

        return [
            {
                key: 'featured',
                title: gLang('shop.sections.featured.title'),
                subtitle: gLang('shop.sections.featured.subtitle'),
                products: featured,
                desktopInitialCount: 4,
            },
            {
                key: 'deals',
                title: gLang('shop.sections.deals.title'),
                subtitle: gLang('shop.sections.deals.subtitle'),
                products: deals,
                desktopInitialCount: 4,
            },
            {
                key: 'latest',
                title: gLang('shop.sections.latest.title'),
                subtitle: gLang('shop.sections.latest.subtitle'),
                products: latest,
                desktopInitialCount: 4,
            },
            {
                key: 'exclusive',
                title: gLang('shop.sections.exclusive.title'),
                subtitle: gLang('shop.sections.exclusive.subtitle'),
                products: exclusive,
                desktopInitialCount: 4,
            },
            {
                key: 'all',
                title: gLang('shop.sections.all.title'),
                subtitle: gLang('shop.sections.all.subtitle'),
                products: sortedProducts,
                desktopInitialCount: 8,
            },
        ].filter(section => section.products.length > 0);
    }, [remainingCards, sortedProducts]);

    const displaySections = useMemo<ShopSection[]>(() => {
        if (searchValue.trim()) {
            return [
                {
                    key: 'search',
                    title: gLang('shop.sections.search.title'),
                    subtitle: gLang('shop.sections.search.subtitle'),
                    products: sortedProducts,
                    desktopInitialCount: 8,
                },
            ];
        }

        if (activeCategory !== 'all') {
            return [
                {
                    key: `category-${activeCategory}`,
                    title: gLang('shop.sections.category.title', {
                        name: getCategoryLabel(activeCategory),
                    }),
                    subtitle: gLang('shop.sections.category.subtitle'),
                    products: sortedProducts,
                    desktopInitialCount: 8,
                },
            ];
        }

        return homepageSections;
    }, [activeCategory, homepageSections, searchValue, sortedProducts]);

    const getSectionVisibleCount = (section: ShopSection) => {
        if (isMobile) {
            return section.products.length;
        }
        return visibleCounts[section.key] ?? section.desktopInitialCount;
    };

    const handleToggleSection = (section: ShopSection) => {
        setVisibleCounts(current => {
            const currentCount = current[section.key] ?? section.desktopInitialCount;
            const nextCount =
                currentCount >= section.products.length
                    ? section.desktopInitialCount
                    : Math.min(currentCount + 4, section.products.length);
            return {
                ...current,
                [section.key]: nextCount,
            };
        });
    };

    const handleToggleMobileSection = (sectionKey: string) => {
        setMobileExpandedSections(current => ({
            ...current,
            [sectionKey]: !current[sectionKey],
        }));
    };

    const getEmptyDescription = () => {
        if (searchValue) {
            return gLang('shop.noMatchFound');
        }
        if (activeCategory === 'all') {
            return gLang('shop.noProduct');
        }
        return gLang('shop.noProductInCategory');
    };

    const renderProduct = (product: Product) => {
        const productCard = productCards.find(item => item.product === product);
        if (!productCard) return null;

        return (
            <ProductCard
                key={(product as any).id}
                product={product}
                itemImage={productCard.itemImage}
                screens={screens}
                onClick={() =>
                    setSelectedProduct({
                        ...product,
                        imageUrl: productCard.itemImage,
                    } as any)
                }
                gLang={gLang}
                userInfo={userInfo}
                messageApi={messageApi}
            />
        );
    };

    const renderSection = (section: ShopSection, sectionIndex: number) => {
        const visibleProducts = section.products.slice(0, getSectionVisibleCount(section));
        const desktopExpanded = getSectionVisibleCount(section) >= section.products.length;
        const showToggle = !isMobile && section.products.length > section.desktopInitialCount;
        const canUseMobileCarousel = isMobile && !searchValue.trim() && activeCategory === 'all';
        const mobileExpanded = Boolean(mobileExpandedSections[section.key]);
        const useMobileCarousel = canUseMobileCarousel && !mobileExpanded;
        const showMobileToggle = canUseMobileCarousel && section.products.length > 1;
        const desktopColumns = isDesktopWide ? 4 : isTablet ? 2 : 3;

        return (
            <div
                key={section.key}
                style={{
                    opacity: 0,
                    transform: 'translateY(12px)',
                    animation: shouldAnimate
                        ? `fadeInUp 0.55s ease ${0.18 + sectionIndex * 0.08}s forwards`
                        : undefined,
                }}
            >
                <div
                    style={{
                        background: sectionSurface,
                        border: `1px solid ${sectionBorder}`,
                        borderRadius: isMobile ? 24 : 28,
                        boxShadow: sectionShadow,
                        backdropFilter: 'blur(20px)',
                        padding: isMobile ? 18 : 28,
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            gap: 16,
                            justifyContent: 'space-between',
                            alignItems: isMobile ? 'flex-start' : 'center',
                            flexDirection: isMobile ? 'column' : 'row',
                            marginBottom: isMobile ? 16 : 22,
                        }}
                    >
                        <div>
                            <Title
                                level={isMobile ? 4 : 3}
                                style={{
                                    margin: 0,
                                    color: pageTitleColor,
                                    letterSpacing: '-0.02em',
                                }}
                            >
                                {section.title}
                            </Title>
                            <Paragraph
                                style={{
                                    margin: '8px 0 0',
                                    color: pageSubtitleColor,
                                    maxWidth: 560,
                                }}
                            >
                                {section.subtitle}
                            </Paragraph>
                        </div>
                        {(showToggle || showMobileToggle) && (
                            <Button
                                type="text"
                                onClick={() =>
                                    isMobile
                                        ? handleToggleMobileSection(section.key)
                                        : handleToggleSection(section)
                                }
                                icon={
                                    isMobile
                                        ? mobileExpanded
                                            ? undefined
                                            : <ArrowRightOutlined />
                                        : desktopExpanded
                                          ? undefined
                                          : <ArrowRightOutlined />
                                }
                                style={{
                                    color: token.colorPrimary,
                                    paddingInline: 0,
                                    fontWeight: 600,
                                }}
                            >
                                {isMobile
                                    ? mobileExpanded
                                        ? gLang('shop.showLess')
                                        : gLang('shop.viewAll')
                                    : desktopExpanded
                                      ? gLang('shop.showLess')
                                      : gLang('shop.viewAll')}
                            </Button>
                        )}
                    </div>

                    <div
                        style={
                            useMobileCarousel
                                ? {
                                      display: 'grid',
                                      gridAutoFlow: 'column',
                                      gridAutoColumns: 'minmax(78vw, 82vw)',
                                      gap: 14,
                                      overflowX: 'auto',
                                      paddingBottom: 8,
                                      scrollSnapType: 'x mandatory',
                                      msOverflowStyle: 'none',
                                      scrollbarWidth: 'none',
                                  }
                                : isMobile
                                  ? {
                                        display: 'grid',
                                        gridTemplateColumns: '1fr',
                                        gap: 14,
                                    }
                                : {
                                      display: 'grid',
                                      gridTemplateColumns: `repeat(${desktopColumns}, minmax(0, 1fr))`,
                                      gap: isTablet ? 16 : 18,
                                  }
                        }
                        className={useMobileCarousel ? 'shop-horizontal-scroll' : undefined}
                    >
                        {visibleProducts.map(product => (
                            <div
                                key={(product as any).id}
                                style={useMobileCarousel ? { scrollSnapAlign: 'start' } : undefined}
                            >
                                {renderProduct(product)}
                            </div>
                        ))}
                    </div>

                    {showToggle && !desktopExpanded && (
                        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }}>
                            <Button
                                size="large"
                                onClick={() => handleToggleSection(section)}
                                style={{
                                    borderRadius: 999,
                                    paddingInline: 24,
                                    borderColor: sectionBorder,
                                }}
                            >
                                {gLang('shop.loadMore')}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (MEDIA_SHOP_MAINTENANCE && !isAdminUser) {
        return (
            <Space direction="vertical" style={{ width: '100%' }}>
                {contextHolder}
                <PageTitle title={gLang('shop.title')} />
                <Result
                    status="warning"
                    title={gLang('shop.maintenance.title')}
                    subTitle={gLang('shop.maintenance.subTitle')}
                />
            </Space>
        );
    }

    if (productsLoading) {
        return (
            <Space direction="vertical" style={{ width: '100%' }}>
                {contextHolder}
                <div style={{ opacity: 0 }}>
                    <PageTitle title={gLang('shop.title')} />
                </div>
            </Space>
        );
    }

    return (
        <Space
            direction="vertical"
            style={{
                width: '100%',
                background: pageBackground,
                borderRadius: 32,
                padding: isMobile ? 12 : 20,
            }}
        >
            {contextHolder}
            <style>
                {`
                    @keyframes shopFloat {
                        0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
                        50% { transform: translate3d(0, -12px, 0) scale(1.02); }
                    }
                    @keyframes shopGlow {
                        0%, 100% { opacity: 0.38; transform: scale(1); }
                        50% { opacity: 0.62; transform: scale(1.08); }
                    }
                    @keyframes shopPulseLine {
                        0% { transform: translateX(-110%); opacity: 0; }
                        20% { opacity: 0.32; }
                        100% { transform: translateX(210%); opacity: 0; }
                    }
                    .shop-horizontal-scroll::-webkit-scrollbar {
                        display: none;
                    }
                `}
            </style>
            <div
                style={{
                    opacity: 0,
                    transform: 'translateY(-10px)',
                    animation: shouldAnimate ? 'fadeInUp 0.5s ease-in-out forwards' : undefined,
                }}
            >
                <PageTitle title={gLang('shop.title')} />
            </div>

            <Space
                direction="vertical"
                size="large"
                style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}
            >
                {userInfo && (
                    <div
                        style={{
                            opacity: 0,
                            transform: 'translateY(10px)',
                            animation: shouldAnimate
                                ? 'fadeInUp 0.5s ease-in-out 0.1s forwards'
                                : undefined,
                        }}
                    >
                        <BalanceInfoCard
                            userInfo={userInfo}
                            screens={screens}
                            onViewPurchases={() => setPurchaseVisible(true)}
                        />
                    </div>
                )}
                <div
                    style={{
                        opacity: 0,
                        transform: 'translateY(10px)',
                        animation: shouldAnimate
                            ? 'fadeInUp 0.5s ease-in-out 0.12s forwards'
                            : undefined,
                    }}
                >
                    <div
                        style={{
                            background: heroGradient,
                            color: '#ffffff',
                            borderRadius: isMobile ? 28 : 36,
                            overflow: 'hidden',
                            position: 'relative',
                            boxShadow: isBlackOrangeActive
                                ? '0 32px 60px rgba(255, 140, 26, 0.2)'
                                : '0 28px 60px rgba(37, 99, 235, 0.18)',
                            padding: isMobile ? 20 : 30,
                        }}
                    >
                        <div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                pointerEvents: 'none',
                                overflow: 'hidden',
                            }}
                        >
                            <div
                                style={{
                                    position: 'absolute',
                                    width: isMobile ? 180 : 280,
                                    height: isMobile ? 180 : 280,
                                    borderRadius: '50%',
                                    background: 'radial-gradient(circle, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 72%)',
                                    top: isMobile ? -40 : -70,
                                    right: isMobile ? -30 : -20,
                                    animation: 'shopGlow 9s ease-in-out infinite',
                                }}
                            />
                            <div
                                style={{
                                    position: 'absolute',
                                    width: isMobile ? 220 : 360,
                                    height: isMobile ? 220 : 360,
                                    borderRadius: '50%',
                                    background: isBlackOrangeActive
                                        ? 'radial-gradient(circle, rgba(255, 196, 112, 0.18) 0%, rgba(255,255,255,0) 74%)'
                                        : 'radial-gradient(circle, rgba(125, 211, 252, 0.18) 0%, rgba(255,255,255,0) 74%)',
                                    bottom: isMobile ? -120 : -180,
                                    left: isMobile ? -80 : -100,
                                    animation: 'shopGlow 11s ease-in-out infinite 1.5s',
                                }}
                            />
                            <div
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    bottom: 0,
                                    width: '24%',
                                    background:
                                        'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.26) 52%, rgba(255,255,255,0) 100%)',
                                    transform: 'skewX(-18deg)',
                                    animation: 'shopPulseLine 6.8s ease-in-out infinite',
                                    filter: 'blur(8px)',
                                }}
                            />
                        </div>
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: isMobile
                                    ? '1fr'
                                    : isTablet
                                      ? '1fr'
                                      : 'minmax(0, 1.2fr) minmax(320px, 0.8fr)',
                                gap: isMobile ? 20 : isTablet ? 22 : 28,
                                alignItems: 'stretch',
                                position: 'relative',
                                zIndex: 1,
                            }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <Tag
                                    bordered={false}
                                    style={{
                                        alignSelf: 'flex-start',
                                        borderRadius: 999,
                                        padding: '6px 12px',
                                        background: heroPillBackground,
                                        color: '#ffffff',
                                        fontSize: 12,
                                        letterSpacing: '0.08em',
                                    }}
                                >
                                    {gLang('shop.heroEyebrow')}
                                </Tag>
                                <Title
                                    level={isMobile ? 2 : isTablet ? 2 : 1}
                                    style={{
                                        color: '#ffffff',
                                        margin: 0,
                                        lineHeight: 1.05,
                                        letterSpacing: '-0.04em',
                                        maxWidth: 560,
                                    }}
                                >
                                    {gLang('shop.heroTitle')}
                                </Title>
                                <Paragraph
                                    style={{
                                        margin: 0,
                                        color: heroSecondaryText,
                                        fontSize: isMobile ? 15 : isTablet ? 16 : 17,
                                        maxWidth: 560,
                                    }}
                                >
                                    {gLang('shop.heroSubtitle')}
                                </Paragraph>
                                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                    <Button
                                        size="large"
                                        onClick={() =>
                                            catalogRef.current?.scrollIntoView({
                                                behavior: 'smooth',
                                                block: 'start',
                                            })
                                        }
                                        style={{
                                            borderRadius: 999,
                                            paddingInline: 22,
                                            background: heroButtonBackground,
                                            color: heroButtonColor,
                                            border: 'none',
                                            fontWeight: 600,
                                        }}
                                    >
                                        {gLang('shop.heroAction')}
                                    </Button>
                                </div>
                            </div>

                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns:
                                        heroProducts.length > 1 && !isMobile && !isTablet
                                            ? 'repeat(2, minmax(0, 1fr))'
                                            : '1fr',
                                    gap: 16,
                                }}
                            >
                                {heroProducts.map(hero => (
                                    <div
                                        key={(hero.product as any).id}
                                        style={{
                                            minHeight: isMobile ? 220 : isTablet ? 224 : 260,
                                            borderRadius: 26,
                                            padding: 18,
                                            background: 'rgba(255,255,255,0.14)',
                                            border: '1px solid rgba(255,255,255,0.16)',
                                            backdropFilter: 'blur(12px)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                            gap: 16,
                                            transformOrigin: 'center',
                                            animation: `shopFloat ${isMobile ? 7.2 : 8.4}s ease-in-out infinite`,
                                            overflow: 'hidden',
                                            position: 'relative',
                                        }}
                                    >
                                        <div
                                            style={{
                                                position: 'absolute',
                                                top: -20,
                                                right: -10,
                                                width: isMobile ? 120 : 150,
                                                height: isMobile ? 120 : 150,
                                                borderRadius: '50%',
                                                background:
                                                    'radial-gradient(circle, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0) 72%)',
                                                pointerEvents: 'none',
                                            }}
                                        />
                                        <div>
                                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                {hero.product.extra_config?.product_mode === 'lottery' && (
                                                    <Tag color="processing" style={{ margin: 0 }}>
                                                        {gLang('shop.lotteryTag')}
                                                    </Tag>
                                                )}
                                                {hero.product.extra_config?.product_mode === 'spin_lottery' && (
                                                    <Tag color="purple" style={{ margin: 0 }}>
                                                        {gLang('shop.spinLotteryTag')}
                                                    </Tag>
                                                )}
                                                {hero.product.pricing_preview?.mode === 'market' && (
                                                    <Tag color="volcano" style={{ margin: 0 }}>
                                                        {gLang('shop.surprisePriceTag')}
                                                    </Tag>
                                                )}
                                                {hero.product.pricing_preview?.mode === 'discriminatory' && (
                                                    <Tag color="gold" style={{ margin: 0 }}>
                                                        {gLang('shop.exclusivePriceTag')}
                                                    </Tag>
                                                )}
                                            </div>
                                            <div
                                                style={{
                                                    display: 'grid',
                                                    gridTemplateColumns:
                                                        isMobile || isTablet
                                                            ? '1fr'
                                                            : 'minmax(0, 1fr) 108px',
                                                    gap: 14,
                                                    alignItems: 'center',
                                                    marginTop: 16,
                                                }}
                                            >
                                                <div>
                                                    <Title
                                                        level={isMobile ? 4 : isTablet ? 4 : 3}
                                                        style={{ color: '#ffffff', margin: '0 0 8px' }}
                                                    >
                                                        {hero.product.title}
                                                    </Title>
                                                    <Paragraph
                                                        ellipsis={{ rows: isMobile || isTablet ? 2 : 3 }}
                                                        style={{
                                                            color: heroSecondaryText,
                                                            margin: 0,
                                                            minHeight: isMobile || isTablet ? undefined : 66,
                                                        }}
                                                    >
                                                        {hero.product.detail || gLang('shop.welcomeMessage')}
                                                    </Paragraph>
                                                </div>
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        justifyContent:
                                                            isMobile || isTablet ? 'flex-start' : 'center',
                                                    }}
                                                >
                                                    <SafeImage
                                                        src={hero.itemImage}
                                                        alt={hero.product.title}
                                                        style={{
                                                            width: isMobile ? 88 : isTablet ? 96 : 108,
                                                            height: isMobile ? 88 : isTablet ? 96 : 108,
                                                            objectFit: 'contain',
                                                            borderRadius: 24,
                                                            background: 'rgba(255,255,255,0.14)',
                                                            padding: 10,
                                                            boxShadow: '0 14px 30px rgba(9, 20, 54, 0.18)',
                                                            backdropFilter: 'blur(8px)',
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                gap: 12,
                                            }}
                                        >
                                            <div>
                                                <div style={{ color: heroSecondaryText, fontSize: 12 }}>
                                                    {gLang('shop.currentSurprisePrice')}
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: isMobile ? 22 : isTablet ? 24 : 28,
                                                        fontWeight: 700,
                                                    }}
                                                >
                                                    {Number(hero.product.price ?? 0)}
                                                </div>
                                            </div>
                                            <Button
                                                type="primary"
                                                shape="round"
                                                icon={<RightOutlined />}
                                                onClick={() =>
                                                    setSelectedProduct({
                                                        ...hero.product,
                                                        imageUrl: hero.itemImage,
                                                    } as any)
                                                }
                                            >
                                                {gLang('shop.immediatelyPurchase')}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    ref={catalogRef}
                    style={{
                        width: '100%',
                        background: isBlackOrangeActive ? productSurface : sectionSurface,
                        borderRadius: 28,
                        border: `1px solid ${isBlackOrangeActive ? productBorder : sectionBorder}`,
                        padding: isMobile ? 16 : 24,
                        boxShadow: isBlackOrangeActive
                            ? '0 18px 44px rgba(255, 140, 26, 0.18)'
                            : sectionShadow,
                        transition: 'all 0.3s ease',
                    }}
                >
                    {userInfo &&
                        userInfo.status !== MediaStatus.ActiveCreator &&
                        userInfo.status !== MediaStatus.ExcellentCreator &&
                        !(
                            userInfo.status === MediaStatus.PendingReview &&
                            userInfo.EBalance !== 0
                        ) && (
                            <Alert
                                message={gLang('shop.insufficientPermission')}
                                type="warning"
                                showIcon
                                style={{ marginBottom: 16, position: 'relative', zIndex: 1 }}
                            />
                        )}

                    <Space direction="vertical" style={{ width: '100%' }} size="large">
                        <div
                            style={{
                                opacity: 0,
                                transform: 'translateY(10px)',
                                animation: shouldAnimate
                                    ? 'fadeInUp 0.5s ease-in-out 0.15s forwards'
                                    : undefined,
                            }}
                        >
                            <ProductToolbar
                                screens={screens}
                                gLang={gLang}
                                searchValue={searchValue}
                                onSearchValueChange={setSearchValue}
                                onSearch={handleSearch}
                                sortKey={sortKey}
                                onSortKeyChange={key => setSortKey(key)}
                                tabItems={tabItems}
                                activeCategory={activeCategory}
                                onActiveCategoryChange={setActiveCategory}
                                disabled={productsLoading}
                            />
                        </div>

                        {displaySections.length > 0 ? (
                            <Space
                                direction="vertical"
                                size={isMobile ? 'middle' : 'large'}
                                style={{ width: '100%' }}
                            >
                                {displaySections.map((section, index) =>
                                    renderSection(section, index)
                                )}
                            </Space>
                        ) : (
                            <div
                                style={{
                                    padding: '48px 0',
                                    opacity: 0,
                                    transform: 'translateY(10px)',
                                    animation: shouldAnimate
                                        ? 'fadeInUp 0.5s ease-in-out 0.2s forwards'
                                        : undefined,
                                }}
                            >
                                <Empty
                                    description={
                                        <span style={{ color: emptyColor }}>
                                            {getEmptyDescription()}
                                        </span>
                                    }
                                />
                            </div>
                        )}
                    </Space>
                </div>
            </Space>
            <ProductModal
                media={userInfo ?? null}
                product={selectedProduct}
                onClose={() => {
                    handleInfo();
                    setSelectedProduct(null);
                }}
                balance={userInfo?.EBalance ?? 0}
                defaultImage={defaultImage}
                onSuccess={handleInfo}
            />
            <PurchaseLogsModal
                open={purchaseVisible}
                onClose={() => setPurchaseVisible(false)}
                getTitleById={getTitleById}
                messageApi={messageApi}
            />
        </Space>
    );
}
