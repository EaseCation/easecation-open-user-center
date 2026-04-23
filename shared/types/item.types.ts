/**
 * 物品 JSON 基础结构
 */
export type ItemJson = {
    /** 分类标识，如 addition、attack-eff */
    category: string;
    /** 物品原始 ID */
    idItem: string;
    /** 数量、等级或时长 */
    data: number;
};

/**
 * 商品限购记录
 */
export type SalesLimit = {
    /** 用户 ID */
    uid: number;
    /** 商品 ID */
    itemID: number;
    /** 用户累计购买数量 */
    sales: number;
    /** 用户当月购买数量 */
    current_month_sales: number;
};

/**
 * 发货物品结构
 */
export type Merchandise = {
    /** 分类标识 */
    category: string;
    /** 物品原始 ID */
    idItem: string;
    /** 数量、等级或时长 */
    data: number;
};

export type ProductMode = 'normal' | 'lottery' | 'spin_lottery';

export type PricingMode = 'fixed' | 'market' | 'discriminatory';

export type LotteryWinner = {
    openid: string;
    quantity: number;
    wonAt: string;
};

export type LotteryConfig = {
    /** 开奖时间，ISO 字符串 */
    draw_at: string;
    /** 中奖人数 */
    winner_count: number;
    /** 实际开奖时间 */
    drawn_at?: string | null;
    /** 已开奖时记录中奖人 */
    winners?: LotteryWinner[];
};

export type SpinLotteryReward = {
    /** 奖项唯一标识 */
    id: string;
    /** 奖项展示名称 */
    label: string;
    /** 物品分类，空值表示谢谢参与 */
    category: string;
    /** 物品 ID，空值表示谢谢参与 */
    idItem: string;
    /** 数量、等级或时长 */
    data: number;
    /** 奖项权重 */
    probability: number;
};

export type SpinLotteryConfig = {
    /** 每次分享赠送的抽奖次数 */
    chance_per_share: number;
    /** 每日最多可通过分享获得的次数 */
    daily_share_limit: number;
    /** 奖池配置 */
    rewards: SpinLotteryReward[];
};

export type MarketPricingConfig = {
    enabled: boolean;
    mode: 'market';
    /** 销量每达到多少触发一档涨跌 */
    sales_threshold: number;
    /** 每档涨跌百分比 */
    sales_step_percent: number;
    /** 周末全天加价百分比 */
    weekend_markup_percent: number;
    /** 工作日晚间加价百分比 */
    weekday_night_markup_percent: number;
    /** 最低浮动百分比，可为负数 */
    min_adjustment_percent: number;
    /** 最高浮动百分比 */
    max_adjustment_percent: number;
};

export type DiscriminatoryPricingConfig = {
    enabled: boolean;
    mode: 'discriminatory';
    /** 面向老媒体的最高价格 */
    high_price: number;
    /** 面向新媒体的最低价格 */
    low_price: number;
};

export type ProductPricingConfig = MarketPricingConfig | DiscriminatoryPricingConfig;

export type ProductExtraConfig = {
    product_mode?: ProductMode;
    homepage_featured?: boolean;
    lottery?: LotteryConfig | null;
    spin_lottery?: SpinLotteryConfig | null;
    pricing?: ProductPricingConfig | null;
};

export type ProductPricingPreview = {
    mode: PricingMode;
    base_price: number;
    current_price: number;
    sales_monthly: number;
    sales_adjustment_percent: number;
    weekend_markup_percent: number;
    weekday_night_markup_percent: number;
    total_adjustment_percent: number;
    next_sales_threshold: number | null;
    next_price: number | null;
    high_price?: number | null;
    low_price?: number | null;
    media_id?: number | null;
    max_media_id?: number | null;
};

export type SpinLotteryPreview = {
    remaining_chances: number;
    daily_share_limit: number;
    shared_today: number;
    chance_per_share: number;
    rewards: SpinLotteryReward[];
};

/**
 * 商品基础字段
 */
export interface ItemBase {
    /** 商品标题 */
    title: string;
    /** 商品内容 JSON 字符串 */
    json: string;
    /** 当前展示价格 */
    price: number;
    /** 商品描述 */
    detail: string;
    /** 每月总限购 */
    total_limit?: number | null;
    /** 每月个人限购 */
    monthly_limit?: number | null;
    /** 个人累计限购 */
    global_limit?: number | null;
    /** 永久总库存 */
    permanent_limit?: number | null;
    /** 是否 VIP 商品 */
    is_vip?: number;
    /** 是否隐藏 */
    is_hidden?: number;
    /** 商品附加配置 */
    extra_config?: ProductExtraConfig | null;
}

/**
 * 创建商品 DTO
 */
export type CreateProductDTO = Required<Pick<ItemBase, 'title' | 'json' | 'price' | 'detail'>> &
    Partial<Omit<ItemBase, 'title' | 'json' | 'price' | 'detail'>>;

/**
 * 更新商品 DTO
 */
export type UpdateProductDTO = Partial<CreateProductDTO>;

/**
 * 服务端商品结构
 */
export interface VirtualProduct extends ItemBase {
    /** 商品主键 */
    id: number;
    /** 基础价格，未叠加浮动规则 */
    base_price: number;
    /** 所有人当月销量 */
    sales_monthly: number;
    /** 永久总库存 */
    permanent_limit: number;
    /** 是否隐藏 */
    is_hidden: number;
    /** 用户累计购买数量 */
    limit_sales: number;
    /** 用户当月购买数量 */
    current_month_sales: number;
    /** 所有人累计销量 */
    sales: number;
    /** 价格预览信息 */
    pricing_preview?: ProductPricingPreview;
    /** 大转盘抽奖预览信息 */
    spin_preview?: SpinLotteryPreview;
}

/**
 * 前端商品展示结构
 */
export type Product = Omit<VirtualProduct, 'permanent_limit' | 'is_hidden'> & {
    /** 商品图片链接 */
    imageUrl?: string;
    /** 永久总库存 */
    permanent_limit: number | null;
    /** 是否隐藏 */
    is_hidden?: number;
};

/**
 * 管理端本周统计返回类型
 */
export interface WeeklyStatsResponse {
    totalPurchases: number;
    totalEBalanceSpent: number;
    topItem: {
        itemId: number;
        quantity: number;
        totalSpent: number;
        title?: string;
        imgLink?: string;
    } | null;
}
