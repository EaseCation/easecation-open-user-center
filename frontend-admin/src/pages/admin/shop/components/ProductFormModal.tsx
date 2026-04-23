import {
    Button,
    DatePicker,
    Form,
    Input,
    InputNumber,
    Modal,
    Radio,
    Select,
    Space,
    Switch,
    Typography,
    Upload,
    message,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import type { Dayjs } from 'dayjs';
import { gLang } from '@common/language';
import { MinusCircleOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { fetchData } from '@common/axiosConfig';
import {
    PricingMode,
    ProductMode,
    SpinLotteryReward,
} from '@ecuc/shared/types/item.types';

export type ProductFormMode = 'add' | 'edit';

export type ProductFormValues = {
    title: string;
    price: number;
    detail: string;
    data?: number;
    total_limit?: number | null;
    monthly_limit?: number | null;
    global_limit?: number | null;
    permanent_limit?: number | null;
    is_vip?: number;
    is_hidden?: number;
    homepage_featured?: boolean;
    category?: string;
    idItem?: string;
    product_mode?: ProductMode;
    draw_at?: Dayjs;
    winner_count?: number;
    pricing_mode?: PricingMode;
    sales_threshold?: number;
    sales_step_percent?: number;
    weekend_markup_percent?: number;
    weekday_night_markup_percent?: number;
    min_adjustment_percent?: number;
    max_adjustment_percent?: number;
    high_price?: number;
    low_price?: number;
    spin_chance_per_share?: number;
    spin_daily_share_limit?: number;
    spin_rewards?: Array<Partial<SpinLotteryReward>>;
};

export type SpinRewardProductOption = {
    value: string;
    title: string;
    category: string;
    idItem: string;
    data: number;
};

type ProductFormModalProps = {
    readonly open: boolean;
    readonly onCancel: () => void;
    readonly onSubmit: (values: ProductFormValues) => void;
    readonly confirmLoading?: boolean;
    readonly initialValues?: Partial<ProductFormValues>;
    readonly mode: ProductFormMode;
    readonly enableImageUpload?: boolean;
    readonly productIdForUpload?: number;
    readonly onDelete?: () => void;
    readonly onDrawLottery?: () => void;
    readonly previewCategory?: string;
    readonly previewIdItem?: string;
    readonly spinRewardProductOptions?: SpinRewardProductOption[];
};

export default function ProductFormModal({
    open,
    onCancel,
    onSubmit,
    confirmLoading,
    initialValues,
    mode,
    enableImageUpload,
    productIdForUpload,
    onDelete,
    onDrawLottery,
    previewCategory,
    previewIdItem,
    spinRewardProductOptions = [],
}: ProductFormModalProps) {
    const [form] = Form.useForm<ProductFormValues>();
    const [messageApi, messageContextHolder] = message.useMessage();
    const [overwrite, setOverwrite] = useState(false);
    const isAdd = mode === 'add';

    useEffect(() => {
        if (open) {
            form.resetFields();
            if (initialValues) {
                form.setFieldsValue(initialValues as ProductFormValues);
            }
            // 编辑旧配置时尝试自动匹配已存在奖池商品，减少手动重填
            setTimeout(() => {
                const rewards = (form.getFieldValue('spin_rewards') ?? []) as Array<
                    Record<string, any>
                >;
                if (!Array.isArray(rewards) || rewards.length === 0) return;
                const normalizedRewards = rewards.map(reward => {
                    const matched = spinRewardProductOptions.find(
                        option =>
                            option.category === String(reward?.category ?? '') &&
                            option.idItem === String(reward?.idItem ?? '') &&
                            Number(option.data) === Number(reward?.data ?? 1)
                    );
                    if (!matched) return reward;
                    return {
                        ...reward,
                        _source_product_id: reward?._source_product_id ?? matched.value,
                        label: String(reward?.label ?? '').trim() || matched.title,
                    };
                });
                form.setFieldValue('spin_rewards', normalizedRewards);
            }, 0);
        }
    }, [open, form, initialValues, spinRewardProductOptions]);

    const initialRadioValues = useMemo(
        () => ({
            is_vip: 0,
            is_hidden: 0,
            homepage_featured: false,
            product_mode: 'normal' as ProductMode,
            pricing_mode: 'fixed' as PricingMode,
            spin_chance_per_share: 1,
            spin_daily_share_limit: 1,
            spin_rewards: [
                {
                    label: '',
                    category: '',
                    idItem: '',
                    data: 1,
                    probability: 1,
                },
            ],
        }),
        []
    );

    const productMode = Form.useWatch('product_mode', form) ?? 'normal';
    const pricingMode = Form.useWatch('pricing_mode', form) ?? 'fixed';
    const spinRewards = Form.useWatch('spin_rewards', form) ?? [];
    const watchedCategory = Form.useWatch('category', form);
    const watchedIdItem = Form.useWatch('idItem', form);
    const watchedData = Form.useWatch('data', form);

    const previewText =
        productMode === 'spin_lottery'
            ? (() => {
                  const reward = spinRewards[0];
                  return reward
                      ? `${reward.category || ''}${reward.category || reward.idItem ? '.' : ''}${reward.idItem || ''}${reward.data !== undefined ? `:${reward.data}` : ''}`
                      : '-';
              })()
            : `${(isAdd ? watchedCategory : (previewCategory ?? watchedCategory)) || ''}${(isAdd ? watchedCategory : (previewCategory ?? watchedCategory)) || (isAdd ? watchedIdItem : (previewIdItem ?? watchedIdItem)) ? '.' : ''}${(isAdd ? watchedIdItem : (previewIdItem ?? watchedIdItem)) || ''}${watchedData !== undefined ? `:${watchedData}` : ''}`;
    const totalSpinWeight = useMemo(
        () =>
            (spinRewards as Array<Partial<SpinLotteryReward>>).reduce(
                (total, reward) => total + Number(reward?.probability ?? 0),
                0
            ),
        [spinRewards]
    );
    const sampleWeight = Number(
        (spinRewards as Array<Partial<SpinLotteryReward>>).find(
            reward => Number(reward?.probability ?? 0) > 0
        )?.probability ?? 1
    );
    const samplePercent =
        totalSpinWeight > 0 ? ((sampleWeight / totalSpinWeight) * 100).toFixed(2) : '0.00';

    const handleSpinRewardProductChange = (rewardIndex: number, productKey: string) => {
        const selectedProduct = spinRewardProductOptions.find(option => option.value === productKey);
        if (!selectedProduct) return;
        const rewards = [...((form.getFieldValue('spin_rewards') ?? []) as Array<Record<string, any>>)];
        const currentReward = rewards[rewardIndex] ?? {};
        rewards[rewardIndex] = {
            ...currentReward,
            _source_product_id: selectedProduct.value,
            label: String(currentReward.label ?? '').trim() || selectedProduct.title,
            category: selectedProduct.category,
            idItem: selectedProduct.idItem,
            data: Number(currentReward.data ?? selectedProduct.data ?? 1),
        };
        form.setFieldValue('spin_rewards', rewards);
    };

    const handleOk = () => {
        form.submit();
    };

    return (
        <Modal
            forceRender
            title={isAdd ? gLang('shopAdmin.modal.add.title') : gLang('shopAdmin.modal.edit.title')}
            open={open}
            onCancel={() => {
                onCancel();
                form.resetFields();
            }}
            onOk={handleOk}
            confirmLoading={!!confirmLoading}
            destroyOnHidden
            width={720}
            footer={
                [
                    !isAdd && onDrawLottery ? (
                        <Button key="drawLottery" onClick={onDrawLottery}>
                            {gLang('shopAdmin.button.drawLottery')}
                        </Button>
                    ) : null,
                    !isAdd && onDelete ? (
                        <Button key="delete" danger onClick={onDelete}>
                            {gLang('common.delete')}
                        </Button>
                    ) : null,
                    <Button
                        key="cancel"
                        onClick={() => {
                            onCancel();
                            form.resetFields();
                        }}
                    >
                        {gLang('common.cancel')}
                    </Button>,
                    <Button key="ok" type="primary" onClick={handleOk} loading={!!confirmLoading}>
                        {gLang('common.confirm')}
                    </Button>,
                ].filter(Boolean) as any
            }
        >
            {messageContextHolder}
            <Form<ProductFormValues>
                form={form}
                layout="vertical"
                initialValues={{ ...initialRadioValues, ...(initialValues ?? {}) }}
                onFinish={onSubmit}
            >
                {!isAdd ? (
                    <Form.Item label={gLang('shopAdmin.label.productId')}>
                        <Input value={productIdForUpload} disabled />
                    </Form.Item>
                ) : null}

                <Form.Item
                    label={gLang('shopAdmin.label.productName')}
                    name="title"
                    rules={[
                        {
                            required: true,
                            message: gLang('shopAdmin.validation.required.productName'),
                        },
                    ]}
                >
                    <Input />
                </Form.Item>

                {isAdd && productMode !== 'spin_lottery' ? (
                    <>
                        <Form.Item
                            label={gLang('shopAdmin.label.productCategory')}
                            name="category"
                            rules={[
                                {
                                    required: true,
                                    message: gLang('shopAdmin.validation.required.productCategory'),
                                },
                            ]}
                        >
                            <Input placeholder={gLang('shopAdmin.placeholder.productCategory')} />
                        </Form.Item>
                        <Form.Item
                            label={gLang('shopAdmin.label.itemId')}
                            name="idItem"
                            rules={[
                                {
                                    required: true,
                                    message: gLang('shopAdmin.validation.required.itemId'),
                                },
                            ]}
                        >
                            <Input placeholder={gLang('shopAdmin.placeholder.itemId')} />
                        </Form.Item>
                    </>
                ) : null}

                <Form.Item
                    label={gLang('shopAdmin.label.productMode')}
                    name="product_mode"
                    rules={[
                        {
                            required: true,
                            message: gLang('shopAdmin.validation.required.productMode'),
                        },
                    ]}
                >
                    <Radio.Group>
                        <Radio value="normal">{gLang('shopAdmin.option.normalMode')}</Radio>
                        <Radio value="lottery">{gLang('shopAdmin.option.lotteryMode')}</Radio>
                        <Radio value="spin_lottery">
                            {gLang('shopAdmin.option.spinLotteryMode')}
                        </Radio>
                    </Radio.Group>
                </Form.Item>

                {productMode === 'lottery' ? (
                    <>
                        <Form.Item
                            label={gLang('shopAdmin.label.drawAt')}
                            name="draw_at"
                            rules={[
                                {
                                    required: true,
                                    message: gLang('shopAdmin.validation.required.drawAt'),
                                },
                            ]}
                        >
                            <DatePicker
                                showTime
                                style={{ width: '100%' }}
                                placeholder={gLang('shopAdmin.placeholder.drawAt')}
                            />
                        </Form.Item>

                        <Form.Item
                            label={gLang('shopAdmin.label.winnerCount')}
                            name="winner_count"
                            rules={[
                                {
                                    required: true,
                                    message: gLang('shopAdmin.validation.required.winnerCount'),
                                },
                            ]}
                        >
                            <InputNumber min={1} precision={0} style={{ width: '100%' }} />
                        </Form.Item>

                        <Typography.Paragraph type="secondary">
                            {gLang('shopAdmin.hint.lotteryPrize')}
                        </Typography.Paragraph>
                    </>
                ) : null}

                {productMode === 'spin_lottery' ? (
                    <>
                        <Form.Item
                            label={gLang('shopAdmin.label.spinChancePerShare')}
                            name="spin_chance_per_share"
                            rules={[
                                {
                                    required: true,
                                    message: gLang('shopAdmin.validation.required.spinChancePerShare'),
                                },
                            ]}
                        >
                            <InputNumber min={1} precision={0} style={{ width: '100%' }} />
                        </Form.Item>

                        <Form.Item
                            label={gLang('shopAdmin.label.spinDailyShareLimit')}
                            name="spin_daily_share_limit"
                            rules={[
                                {
                                    required: true,
                                    message: gLang('shopAdmin.validation.required.spinDailyShareLimit'),
                                },
                            ]}
                        >
                            <InputNumber min={1} precision={0} style={{ width: '100%' }} />
                        </Form.Item>

                        <Typography.Paragraph type="secondary">
                            {gLang('shopAdmin.hint.spinLottery')}
                        </Typography.Paragraph>

                        <Form.List
                            name="spin_rewards"
                            rules={[
                                {
                                    validator: async (_, value) => {
                                        if (!Array.isArray(value) || value.length === 0) {
                                            throw new Error(
                                                gLang('shopAdmin.validation.required.spinRewards')
                                            );
                                        }
                                    },
                                },
                            ]}
                        >
                            {(fields, { add, remove }, { errors }) => (
                                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                                    {fields.map((field, index) => (
                                        <div
                                            key={field.key}
                                            style={{
                                                padding: 12,
                                                borderRadius: 12,
                                                border: '1px solid var(--ant-color-border)',
                                                background: 'var(--ant-color-fill-quaternary)',
                                            }}
                                        >
                                            <Space
                                                align="center"
                                                style={{
                                                    width: '100%',
                                                    justifyContent: 'space-between',
                                                    marginBottom: 8,
                                                }}
                                            >
                                                <Typography.Text strong>
                                                    {gLang('shopAdmin.label.spinRewardCard', {
                                                        index: index + 1,
                                                    })}
                                                </Typography.Text>
                                                {fields.length > 1 ? (
                                                    <Button
                                                        danger
                                                        type="text"
                                                        icon={<MinusCircleOutlined />}
                                                        onClick={() => remove(field.name)}
                                                    >
                                                        {gLang('common.delete')}
                                                    </Button>
                                                ) : null}
                                            </Space>

                                            <Form.Item
                                                label={gLang('shopAdmin.label.spinRewardProduct')}
                                                name={[field.name, '_source_product_id']}
                                            >
                                                <Select
                                                    showSearch
                                                    optionFilterProp="label"
                                                    disabled={spinRewardProductOptions.length === 0}
                                                    placeholder={gLang(
                                                        'shopAdmin.placeholder.spinRewardProduct'
                                                    )}
                                                    options={spinRewardProductOptions.map(option => ({
                                                        value: option.value,
                                                        label: `${option.title} (${option.category}.${option.idItem}:${option.data})`,
                                                    }))}
                                                    onChange={value =>
                                                        handleSpinRewardProductChange(
                                                            Number(field.name),
                                                            String(value)
                                                        )
                                                    }
                                                />
                                            </Form.Item>

                                            {spinRewardProductOptions.length === 0 ? (
                                                <Typography.Text type="secondary">
                                                    {gLang('shopAdmin.hint.spinRewardNoProducts')}
                                                </Typography.Text>
                                            ) : null}

                                            <Form.Item
                                                label={gLang('shopAdmin.label.spinRewardLabel')}
                                                name={[field.name, 'label']}
                                                rules={[
                                                    {
                                                        required: true,
                                                        message: gLang(
                                                            'shopAdmin.validation.required.spinRewardLabel'
                                                        ),
                                                    },
                                                ]}
                                            >
                                                <Input />
                                            </Form.Item>

                                            <Form.Item
                                                label={gLang('shopAdmin.label.productCategory')}
                                                name={[field.name, 'category']}
                                                rules={[
                                                    {
                                                        required: true,
                                                        message: gLang(
                                                            'shopAdmin.validation.required.productCategory'
                                                        ),
                                                    },
                                                ]}
                                            >
                                                <Input
                                                    placeholder={gLang(
                                                        'shopAdmin.placeholder.productCategory'
                                                    )}
                                                />
                                            </Form.Item>

                                            <Form.Item
                                                label={gLang('shopAdmin.label.itemId')}
                                                name={[field.name, 'idItem']}
                                                rules={[
                                                    {
                                                        required: true,
                                                        message: gLang(
                                                            'shopAdmin.validation.required.itemId'
                                                        ),
                                                    },
                                                ]}
                                            >
                                                <Input
                                                    placeholder={gLang('shopAdmin.placeholder.itemId')}
                                                />
                                            </Form.Item>

                                            <Form.Item
                                                label={gLang('shopAdmin.label.validTime')}
                                                name={[field.name, 'data']}
                                                rules={[{ required: true, type: 'number', min: 1 }]}
                                            >
                                                <InputNumber
                                                    min={1}
                                                    style={{ width: '100%' }}
                                                />
                                            </Form.Item>

                                            <Form.Item
                                                label={gLang('shopAdmin.label.spinRewardProbability')}
                                                name={[field.name, 'probability']}
                                                rules={[
                                                    {
                                                        required: true,
                                                        message: gLang(
                                                            'shopAdmin.validation.required.spinRewardProbability'
                                                        ),
                                                    },
                                                ]}
                                            >
                                                <InputNumber min={1} precision={0} style={{ width: '100%' }} />
                                            </Form.Item>
                                        </div>
                                    ))}

                                    <Button
                                        type="dashed"
                                        icon={<PlusOutlined />}
                                        onClick={() =>
                                            add({
                                                label: '',
                                                category: '',
                                                idItem: '',
                                                data: 1,
                                                probability: 1,
                                            })
                                        }
                                    >
                                        {gLang('shopAdmin.button.addSpinReward')}
                                    </Button>

                                    <Form.ErrorList errors={errors} />
                                    <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                                        {gLang('shopAdmin.hint.spinWeight')}
                                    </Typography.Paragraph>
                                    <Typography.Text type="secondary">
                                        {gLang('shopAdmin.hint.spinWeightExample', {
                                            total: totalSpinWeight,
                                            weight: sampleWeight,
                                            percent: samplePercent,
                                        })}
                                    </Typography.Text>
                                </Space>
                            )}
                        </Form.List>
                    </>
                ) : null}

                <Form.Item
                    label={gLang('shopAdmin.label.isVip')}
                    name="is_vip"
                    rules={[
                        { required: true, message: gLang('shopAdmin.validation.required.isVip') },
                    ]}
                >
                    <Radio.Group>
                        <Radio value={0}>{gLang('shopAdmin.option.normalProduct')}</Radio>
                        <Radio value={1}>{gLang('shopAdmin.option.vipProduct')}</Radio>
                    </Radio.Group>
                </Form.Item>

                <Form.Item label={gLang('shopAdmin.label.isHidden')} name="is_hidden">
                    <Radio.Group>
                        <Radio value={0}>{gLang('shopAdmin.option.visible')}</Radio>
                        <Radio value={1}>{gLang('shopAdmin.option.hidden')}</Radio>
                    </Radio.Group>
                </Form.Item>

                <Form.Item
                    label={gLang('shopAdmin.label.homepageFeatured')}
                    name="homepage_featured"
                    valuePropName="checked"
                >
                    <Switch
                        checkedChildren={gLang('common.switch.open')}
                        unCheckedChildren={gLang('common.switch.close')}
                    />
                </Form.Item>

                <Typography.Paragraph type="secondary" style={{ marginTop: -8 }}>
                    {gLang('shopAdmin.hint.homepageFeatured')}
                </Typography.Paragraph>

                <Form.Item
                    label={gLang('shopAdmin.label.price')}
                    name="price"
                    rules={[
                        { required: true, message: gLang('shopAdmin.validation.required.price') },
                        { type: 'number', min: 0 },
                        {
                            validator: (_, value) =>
                                Number.isInteger(value)
                                    ? Promise.resolve()
                                    : Promise.reject(gLang('shop.priceMustBeInteger')),
                        },
                    ]}
                >
                    <InputNumber
                        min={0}
                        step={1}
                        precision={0}
                        formatter={value => `${value}`}
                        style={{ width: '100%' }}
                    />
                </Form.Item>

                {productMode !== 'spin_lottery' ? (
                    <>
                        <Form.Item
                            label={gLang('shopAdmin.label.pricingMode')}
                            name="pricing_mode"
                            rules={[
                                {
                                    required: true,
                                    message: gLang('shopAdmin.validation.required.pricingMode'),
                                },
                            ]}
                        >
                            <Select
                                options={[
                                    { label: gLang('shopAdmin.option.fixedPricing'), value: 'fixed' },
                                    { label: gLang('shopAdmin.option.marketPricing'), value: 'market' },
                                    {
                                        label: gLang('shopAdmin.option.discriminatoryPricing'),
                                        value: 'discriminatory',
                                    },
                                ]}
                            />
                        </Form.Item>

                        {pricingMode === 'market' ? (
                            <>
                                <Form.Item
                                    label={gLang('shopAdmin.label.salesThreshold')}
                                    name="sales_threshold"
                                    rules={[
                                        {
                                            required: true,
                                            message: gLang(
                                                'shopAdmin.validation.required.salesThreshold'
                                            ),
                                        },
                                    ]}
                                >
                                    <InputNumber min={1} precision={0} style={{ width: '100%' }} />
                                </Form.Item>
                                <Form.Item
                                    label={gLang('shopAdmin.label.salesStepPercent')}
                                    name="sales_step_percent"
                                    rules={[
                                        {
                                            required: true,
                                            message: gLang(
                                                'shopAdmin.validation.required.salesStepPercent'
                                            ),
                                        },
                                    ]}
                                >
                                    <InputNumber precision={0} style={{ width: '100%' }} />
                                </Form.Item>
                                <Form.Item
                                    label={gLang('shopAdmin.label.weekendMarkupPercent')}
                                    name="weekend_markup_percent"
                                >
                                    <InputNumber precision={0} style={{ width: '100%' }} />
                                </Form.Item>
                                <Form.Item
                                    label={gLang('shopAdmin.label.weekdayNightMarkupPercent')}
                                    name="weekday_night_markup_percent"
                                >
                                    <InputNumber precision={0} style={{ width: '100%' }} />
                                </Form.Item>
                                <Form.Item
                                    label={gLang('shopAdmin.label.minAdjustmentPercent')}
                                    name="min_adjustment_percent"
                                >
                                    <InputNumber precision={0} style={{ width: '100%' }} />
                                </Form.Item>
                                <Form.Item
                                    label={gLang('shopAdmin.label.maxAdjustmentPercent')}
                                    name="max_adjustment_percent"
                                >
                                    <InputNumber precision={0} style={{ width: '100%' }} />
                                </Form.Item>
                            </>
                        ) : null}

                        {pricingMode === 'discriminatory' ? (
                            <>
                                <Form.Item
                                    label={gLang('shopAdmin.label.highPrice')}
                                    name="high_price"
                                    rules={[
                                        {
                                            required: true,
                                            message: gLang('shopAdmin.validation.required.highPrice'),
                                        },
                                    ]}
                                >
                                    <InputNumber min={0} precision={0} style={{ width: '100%' }} />
                                </Form.Item>
                                <Form.Item
                                    label={gLang('shopAdmin.label.lowPrice')}
                                    name="low_price"
                                    rules={[
                                        {
                                            required: true,
                                            message: gLang('shopAdmin.validation.required.lowPrice'),
                                        },
                                    ]}
                                >
                                    <InputNumber min={0} precision={0} style={{ width: '100%' }} />
                                </Form.Item>
                            </>
                        ) : null}
                    </>
                ) : null}

                {productMode !== 'spin_lottery' ? (
                    <Form.Item
                        label={gLang('shopAdmin.label.validTime')}
                        name="data"
                        rules={[{ required: true, type: 'number', min: 1 }]}
                    >
                        <InputNumber
                            min={1}
                            style={{ width: '100%' }}
                            placeholder={gLang('shopAdmin.placeholder.validTime')}
                        />
                    </Form.Item>
                ) : null}

                <Form.Item label={gLang('shopAdmin.label.itemId')}>
                    <Typography.Text type="secondary" code style={{ userSelect: 'text' }}>
                        {previewText || '-'}
                    </Typography.Text>
                </Form.Item>

                <Form.Item label={gLang('shopAdmin.label.totalLimit')} name="total_limit">
                    <InputNumber min={0} precision={0} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item label={gLang('shopAdmin.label.monthlyLimit')} name="monthly_limit">
                    <InputNumber min={0} precision={0} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item label={gLang('shopAdmin.label.globalLimit')} name="global_limit">
                    <InputNumber min={0} precision={0} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item label={gLang('shopAdmin.label.permanentLimit')} name="permanent_limit">
                    <InputNumber min={0} precision={0} style={{ width: '100%' }} />
                </Form.Item>

                <Form.Item
                    label={gLang('shopAdmin.label.productDescription')}
                    name="detail"
                    rules={[
                        {
                            required: true,
                            message: gLang('shopAdmin.validation.required.productDescription'),
                        },
                    ]}
                >
                    <Input.TextArea rows={3} />
                </Form.Item>

                {import.meta.env.DEV && !isAdd && enableImageUpload ? (
                    <Space
                        direction="horizontal"
                        size="middle"
                        style={{ width: '100%', display: 'flex', alignItems: 'center' }}
                    >
                        <Typography.Text strong>
                            {gLang('shopAdmin.tools.upload.title')}
                        </Typography.Text>
                        <Space>
                            <Typography.Text>
                                {gLang('shopAdmin.tools.upload.overwrite')}
                            </Typography.Text>
                            <Switch checked={overwrite} onChange={setOverwrite} />
                        </Space>
                        <Upload
                            accept="image/*"
                            maxCount={1}
                            showUploadList={false}
                            beforeUpload={async file => {
                                try {
                                    if (!productIdForUpload) return Upload.LIST_IGNORE;
                                    const fileBase64 = await new Promise<string>(
                                        (resolve, reject) => {
                                            const reader = new FileReader();
                                            reader.onload = () => resolve(String(reader.result));
                                            reader.onerror = reject;
                                            reader.readAsDataURL(file);
                                        }
                                    );
                                    await fetchData({
                                        url: '/utils/image/upload-local',
                                        method: 'POST',
                                        data: {
                                            itemId: Number(productIdForUpload),
                                            fileBase64,
                                            overwrite,
                                        },
                                        setData: () => {
                                            messageApi.success(gLang('shopAdmin.tools.upload.success'));
                                        },
                                    });
                                } catch {
                                    messageApi.error(gLang('shopAdmin.tools.upload.failed'));
                                }
                                return Upload.LIST_IGNORE;
                            }}
                        >
                            <Button icon={<UploadOutlined />}>
                                {gLang('shopAdmin.tools.upload.button')}
                            </Button>
                        </Upload>
                    </Space>
                ) : null}
            </Form>
        </Modal>
    );
}
