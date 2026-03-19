import React, { useCallback, useEffect, useState } from 'react';
import {
    Button,
    Form,
    Input,
    message,
    Modal,
    Pagination,
    Select,
    Space,
    Table,
    Tag,
    Typography,
} from 'antd';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import { fetchData } from '@common/axiosConfig';
import { gLang } from '@common/language';
import {
    FeedbackTagDictionaryItem,
    FeedbackTagScope,
    FeedbackTagStatus,
    FeedbackTagSummary,
} from '@ecuc/shared/types/ticket.types';

const { Title, Text } = Typography;

interface FeedbackTagAliasSelectProps {
    scope?: FeedbackTagScope;
    value?: number | null;
    excludeId?: number;
    disabled?: boolean;
    onChange?: (value: number | null) => void;
}

const FeedbackTagAliasSelect: React.FC<FeedbackTagAliasSelectProps> = ({
    scope,
    value,
    excludeId,
    disabled,
    onChange,
}) => {
    const [options, setOptions] = useState<FeedbackTagSummary[]>([]);
    const [loading, setLoading] = useState(false);

    const loadOptions = useCallback(
        (keyword = '') => {
            if (!scope) {
                setOptions([]);
                return;
            }
            setLoading(true);
            fetchData({
                url: '/feedback/admin/tags/options',
                method: 'GET',
                data: {
                    scope,
                    keyword: keyword.trim() || undefined,
                },
                setData: (data: { list?: FeedbackTagSummary[] }) => {
                    setOptions((data?.list ?? []).filter(tag => tag.id !== excludeId));
                },
            }).finally(() => setLoading(false));
        },
        [scope, excludeId]
    );

    useEffect(() => {
        loadOptions('');
    }, [loadOptions]);

    return (
        <Select
            allowClear
            showSearch
            filterOption={false}
            value={value ?? undefined}
            onChange={nextValue => onChange?.(typeof nextValue === 'number' ? nextValue : null)}
            onSearch={loadOptions}
            disabled={disabled || !scope}
            placeholder={gLang('feedback.tagLibrary.aliasPlaceholder')}
            notFoundContent={
                loading ? gLang('feedback.tagSelectLoading') : gLang('feedback.tagSelectEmpty')
            }
            options={options.map(tag => ({
                value: tag.id,
                label: tag.name,
            }))}
        />
    );
};

const FeedbackTagLibraryPage: React.FC = () => {
    const [messageApi, messageContextHolder] = message.useMessage();
    const [list, setList] = useState<FeedbackTagDictionaryItem[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);
    const [loading, setLoading] = useState(false);
    const [keyword, setKeyword] = useState('');
    const [scope, setScope] = useState<FeedbackTagScope | undefined>(undefined);
    const [status, setStatus] = useState<FeedbackTagStatus | undefined>(undefined);
    const [createOpen, setCreateOpen] = useState(false);
    const [editingTag, setEditingTag] = useState<FeedbackTagDictionaryItem | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [createForm] = Form.useForm();
    const [editForm] = Form.useForm();
    const createScope = Form.useWatch<FeedbackTagScope | undefined>('scope', createForm);
    const createAliasOfTagId = Form.useWatch<number | null>('aliasOfTagId', createForm);
    const editAliasOfTagId = Form.useWatch<number | null>('aliasOfTagId', editForm);

    const loadList = useCallback(() => {
        setLoading(true);
        fetchData({
            url: '/feedback/admin/tags',
            method: 'GET',
            data: {
                page,
                pageSize,
                keyword: keyword.trim() || undefined,
                scope,
                status,
            },
            setData: (data: { list?: FeedbackTagDictionaryItem[]; total?: number }) => {
                setList(data?.list ?? []);
                setTotal(data?.total ?? 0);
            },
        }).finally(() => setLoading(false));
    }, [page, pageSize, keyword, scope, status]);

    useEffect(() => {
        loadList();
    }, [loadList]);

    const handleCreate = async (values: {
        name: string;
        scope: FeedbackTagScope;
        aliasOfTagId?: number | null;
    }) => {
        setSubmitting(true);
        try {
            let isSuccess = false;
            await fetchData({
                url: '/feedback/admin/tags',
                method: 'POST',
                data: values,
                setData: () => {
                    isSuccess = true;
                },
            });
            if (!isSuccess) {
                return;
            }
            createForm.resetFields();
            setCreateOpen(false);
            setPage(1);
            loadList();
            messageApi.success(gLang('feedback.tagLibrary.createSuccess'));
        } catch (error: any) {
            if (!error?.response?.data?.EPF_code) {
                messageApi.error(gLang('feedback.tagLibrary.createFailed'));
            }
        } finally {
            setSubmitting(false);
        }
    };

    const patchTag = async (
        id: number,
        data: Partial<Pick<FeedbackTagDictionaryItem, 'name' | 'status' | 'aliasOfTagId'>>
    ) => {
        setSubmitting(true);
        try {
            let isSuccess = false;
            await fetchData({
                url: `/feedback/admin/tags/${id}`,
                method: 'PUT',
                data,
                setData: () => {
                    isSuccess = true;
                },
            });
            if (!isSuccess) {
                return;
            }
            setEditingTag(null);
            loadList();
            if (data.name != null || data.aliasOfTagId !== undefined) {
                messageApi.success(gLang('feedback.tagLibrary.updateSuccess'));
            } else if (data.status === 'ARCHIVED') {
                messageApi.success(gLang('feedback.tagLibrary.archiveSuccess'));
            } else {
                messageApi.success(gLang('feedback.tagLibrary.restoreSuccess'));
            }
        } catch (error: any) {
            if (!error?.response?.data?.EPF_code) {
                messageApi.error(
                    data.name != null || data.aliasOfTagId !== undefined
                        ? gLang('feedback.tagLibrary.updateFailed')
                        : gLang('feedback.tagLibrary.archiveFailed')
                );
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Space direction="vertical" style={{ width: '100%' }} size="large">
            {messageContextHolder}
            <div>
                <Title level={4} style={{ marginBottom: 8 }}>
                    {gLang('feedback.tagLibrary.title')}
                </Title>
                <Text type="secondary">{gLang('feedback.tagLibrary.description')}</Text>
            </div>

            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Input.Search
                        allowClear
                        placeholder={gLang('feedback.tagLibrary.searchPlaceholder')}
                        value={keyword}
                        onChange={event => {
                            setKeyword(event.target.value);
                            setPage(1);
                        }}
                        style={{ maxWidth: 320 }}
                    />
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setCreateOpen(true)}
                    >
                        {gLang('feedback.tagLibrary.create')}
                    </Button>
                </Space>

                <Space wrap>
                    <Select
                        allowClear
                        placeholder={gLang('feedback.tagLibrary.allScopes')}
                        value={scope}
                        onChange={value => {
                            setScope(value);
                            setPage(1);
                        }}
                        style={{ width: 160 }}
                        options={[
                            { value: 'PUBLIC', label: gLang('feedback.publicTag') },
                            { value: 'INTERNAL', label: gLang('feedback.internalTag') },
                            { value: 'DEVELOPER', label: gLang('feedback.developerTag') },
                            { value: 'PROGRESS', label: gLang('feedback.tagLibrary.progressScope') },
                        ]}
                    />
                    <Select
                        allowClear
                        placeholder={gLang('feedback.tagLibrary.allStatuses')}
                        value={status}
                        onChange={value => {
                            setStatus(value);
                            setPage(1);
                        }}
                        style={{ width: 160 }}
                        options={[
                            { value: 'ACTIVE', label: gLang('feedback.tagLibrary.active') },
                            { value: 'ARCHIVED', label: gLang('feedback.tagLibrary.archived') },
                        ]}
                    />
                </Space>

                <Table
                    rowKey="id"
                    loading={loading}
                    dataSource={list}
                    pagination={false}
                    columns={[
                            {
                                title: gLang('feedback.tagLibrary.tagName'),
                                dataIndex: 'name',
                            },
                            {
                                title: gLang('feedback.tagLibrary.aliasOf'),
                                key: 'aliasOf',
                                render: (_, record: FeedbackTagDictionaryItem) =>
                                    record.aliasOfTagName ? (
                                        <Text>{record.aliasOfTagName}</Text>
                                    ) : (
                                        <Text type="secondary">
                                            {gLang('feedback.tagLibrary.primaryTag')}
                                        </Text>
                                    ),
                            },
                            {
                                title: gLang('feedback.tagLibrary.aliases'),
                                key: 'aliases',
                                render: (_, record: FeedbackTagDictionaryItem) =>
                                    record.aliases && record.aliases.length > 0 ? (
                                        <Space size={[4, 4]} wrap>
                                            {record.aliases.map(alias => (
                                                <Tag key={`${record.id}-${alias}`}>{alias}</Tag>
                                            ))}
                                        </Space>
                                    ) : (
                                        <Text type="secondary">-</Text>
                                    ),
                            },
                            {
                                title: gLang('feedback.tagLibrary.scope'),
                                dataIndex: 'scope',
                                render: (value: FeedbackTagScope) => {
                                    const colorMap: Record<string, string> = {
                                        PUBLIC: 'blue',
                                        INTERNAL: 'gold',
                                        DEVELOPER: 'green',
                                        PROGRESS: 'purple',
                                    };
                                    const labelMap: Record<string, string> = {
                                        PUBLIC: gLang('feedback.tagLibrary.publicScope'),
                                        INTERNAL: gLang('feedback.tagLibrary.internalScope'),
                                        DEVELOPER: gLang('feedback.tagLibrary.developerScope'),
                                        PROGRESS: gLang('feedback.tagLibrary.progressScope'),
                                    };
                                    return (
                                        <Tag color={colorMap[value] ?? 'default'}>
                                            {labelMap[value] ?? value}
                                        </Tag>
                                    );
                                },
                            },
                            {
                                title: gLang('feedback.tagLibrary.status'),
                                dataIndex: 'status',
                                render: (value: FeedbackTagStatus) => (
                                    <Tag color={value === 'ACTIVE' ? 'green' : 'default'}>
                                        {value === 'ACTIVE'
                                            ? gLang('feedback.tagLibrary.active')
                                            : gLang('feedback.tagLibrary.archived')}
                                    </Tag>
                                ),
                            },
                            {
                                title: gLang('feedback.tagLibrary.usageCount'),
                                dataIndex: 'usageCount',
                                width: 120,
                            },
                            {
                                title: gLang('feedback.tagLibrary.actions'),
                                key: 'actions',
                                width: 220,
                                render: (_, record: FeedbackTagDictionaryItem) => (
                                    <Space>
                                        <Button
                                            icon={<EditOutlined />}
                                            onClick={() => {
                                                setEditingTag(record);
                                                editForm.setFieldsValue({
                                                    name: record.name,
                                                    status: record.status,
                                                    aliasOfTagId: record.aliasOfTagId ?? null,
                                                });
                                            }}
                                        >
                                            {gLang('feedback.tagLibrary.edit')}
                                        </Button>
                                        <Button
                                            onClick={() =>
                                                patchTag(record.id, {
                                                    status:
                                                        record.status === 'ACTIVE'
                                                            ? 'ARCHIVED'
                                                            : 'ACTIVE',
                                                })
                                            }
                                        >
                                            {record.status === 'ACTIVE'
                                                ? gLang('feedback.tagLibrary.archive')
                                                : gLang('feedback.tagLibrary.restore')}
                                        </Button>
                                    </Space>
                                ),
                            },
                        ]}
                />

                {total > pageSize && (
                    <Pagination
                        current={page}
                        pageSize={pageSize}
                        total={total}
                        onChange={nextPage => setPage(nextPage)}
                    />
                )}
            </Space>

            <Modal
                title={gLang('feedback.tagLibrary.createTitle')}
                open={createOpen}
                onCancel={() => {
                    setCreateOpen(false);
                    createForm.resetFields();
                }}
                footer={null}
                destroyOnHidden
            >
                <Form form={createForm} layout="vertical" onFinish={handleCreate}>
                    <Form.Item
                        name="name"
                        label={gLang('feedback.tagLibrary.tagName')}
                        rules={[
                            {
                                required: true,
                                message: gLang('feedback.tagLibrary.tagNameRequired'),
                            },
                        ]}
                    >
                        <Input maxLength={64} />
                    </Form.Item>
                    <Form.Item
                        name="scope"
                        label={gLang('feedback.tagLibrary.scope')}
                        initialValue="PUBLIC"
                        rules={[
                            { required: true, message: gLang('feedback.tagLibrary.scopeRequired') },
                        ]}
                    >
                        <Select
                            options={[
                                { value: 'PUBLIC', label: gLang('feedback.publicTag') },
                                { value: 'INTERNAL', label: gLang('feedback.internalTag') },
                                { value: 'DEVELOPER', label: gLang('feedback.developerTag') },
                                { value: 'PROGRESS', label: gLang('feedback.tagLibrary.progressScope') },
                            ]}
                        />
                    </Form.Item>
                    <Form.Item name="aliasOfTagId" label={gLang('feedback.tagLibrary.aliasOf')}>
                        <FeedbackTagAliasSelect
                            scope={createScope}
                            value={createAliasOfTagId ?? null}
                            onChange={value => createForm.setFieldValue('aliasOfTagId', value)}
                        />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" loading={submitting}>
                        {gLang('common.create')}
                    </Button>
                </Form>
            </Modal>

            <Modal
                title={gLang('feedback.editTag')}
                open={Boolean(editingTag)}
                onCancel={() => {
                    setEditingTag(null);
                    editForm.resetFields();
                }}
                footer={null}
                destroyOnHidden
            >
                <Form
                    form={editForm}
                    layout="vertical"
                    onFinish={values =>
                        editingTag
                            ? patchTag(editingTag.id, {
                                  name: values.name,
                                  status: values.status,
                                  aliasOfTagId: values.aliasOfTagId ?? null,
                              })
                            : Promise.resolve()
                    }
                >
                    <Form.Item
                        name="name"
                        label={gLang('feedback.tagLibrary.tagName')}
                        rules={[
                            {
                                required: true,
                                message: gLang('feedback.tagLibrary.tagNameRequired'),
                            },
                        ]}
                    >
                        <Input maxLength={64} />
                    </Form.Item>
                    <Form.Item
                        name="status"
                        label={gLang('feedback.tagLibrary.status')}
                        rules={[
                            {
                                required: true,
                                message: gLang('feedback.tagLibrary.statusRequired'),
                            },
                        ]}
                        >
                            <Select
                                options={[
                                    { value: 'ACTIVE', label: gLang('feedback.tagLibrary.active') },
                                    { value: 'ARCHIVED', label: gLang('feedback.tagLibrary.archived') },
                                ]}
                            />
                        </Form.Item>
                    <Form.Item label={gLang('feedback.tagLibrary.aliasOf')} name="aliasOfTagId">
                        <FeedbackTagAliasSelect
                            scope={editingTag?.scope}
                            value={editAliasOfTagId ?? null}
                            excludeId={editingTag?.id}
                            onChange={value => editForm.setFieldValue('aliasOfTagId', value)}
                            disabled={!editingTag}
                        />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" loading={submitting}>
                        {gLang('common.save')}
                    </Button>
                </Form>
            </Modal>
        </Space>
    );
};

export default FeedbackTagLibraryPage;
