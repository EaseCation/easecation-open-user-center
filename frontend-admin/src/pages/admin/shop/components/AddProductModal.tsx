import type { AddFormValues } from '../ShopAdmin';
import ProductFormModal, { type SpinRewardProductOption } from './ProductFormModal';

interface AddProductModalProps {
    readonly open: boolean;
    readonly onCancel: () => void;
    readonly onOk: (values: AddFormValues) => void;
    readonly confirmLoading: boolean;
    readonly spinRewardProductOptions?: SpinRewardProductOption[];
}

export default function AddProductModal({
    open,
    onCancel,
    onOk,
    confirmLoading,
    spinRewardProductOptions = [],
}: AddProductModalProps) {
    return (
        <ProductFormModal
            open={open}
            onCancel={onCancel}
            onSubmit={onOk as any}
            confirmLoading={confirmLoading}
            mode={'add'}
            initialValues={{}}
            spinRewardProductOptions={spinRewardProductOptions}
        />
    );
}
