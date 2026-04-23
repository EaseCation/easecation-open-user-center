import ProductFormModal, {
    ProductFormValues,
    type SpinRewardProductOption,
} from './ProductFormModal';

interface Product {
    id: string | number;
    title: string;
    price: number;
    detail: string;
    json: string;
    total_limit: number | null;
    monthly_limit: number | null;
    global_limit: number | null;
    permanent_limit: number | null;
    current_month_sales: number;
    sales: number;
    is_hidden?: number;
}

interface UpdateFormValues {
    title: string;
    price: number;
    detail: string;
    data: number;
    total_limit: number | null;
    monthly_limit: number | null;
    global_limit: number | null;
    permanent_limit: number | null;
    is_vip: number;
    is_hidden?: number;
}

interface EditProductModalProps {
    readonly open: boolean;
    readonly onCancel: () => void;
    readonly onOk: (values: UpdateFormValues) => void;
    readonly confirmLoading: boolean;
    readonly product: Product | null;
    readonly initialFormValues?: Partial<UpdateFormValues>;
    readonly onDelete?: () => void;
    readonly onDrawLottery?: () => void;
    readonly spinRewardProductOptions?: SpinRewardProductOption[];
}

export default function EditProductModal({
    open,
    onCancel,
    onOk,
    confirmLoading,
    product,
    initialFormValues,
    onDelete: _onDelete,
    onDrawLottery,
    spinRewardProductOptions = [],
}: EditProductModalProps) {
    return (
        <ProductFormModal
            open={open}
            onCancel={onCancel}
            onSubmit={onOk as any}
            confirmLoading={confirmLoading}
            initialValues={initialFormValues as Partial<ProductFormValues>}
            mode={'edit'}
            enableImageUpload={true}
            productIdForUpload={
                product ? Number((product as any).id ?? (product as any).ID) : undefined
            }
            onDelete={_onDelete}
            onDrawLottery={onDrawLottery}
            spinRewardProductOptions={spinRewardProductOptions}
            previewCategory={(() => {
                try {
                    const parsed = product?.json ? JSON.parse(product.json) : null;
                    const payload = Array.isArray(parsed) ? parsed[0] : parsed;
                    return payload?.category ?? '';
                } catch {
                    return '';
                }
            })()}
            previewIdItem={(() => {
                try {
                    const parsed = product?.json ? JSON.parse(product.json) : null;
                    const payload = Array.isArray(parsed) ? parsed[0] : parsed;
                    return payload?.idItem ?? '';
                } catch {
                    return '';
                }
            })()}
        />
    );
}

export type { Product, UpdateFormValues };
