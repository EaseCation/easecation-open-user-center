import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Select, Space, Spin, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { fetchData } from '@common/axiosConfig';
import { gLang } from '@common/language';
import { FeedbackTagScope, FeedbackTagSummary } from '@ecuc/shared/types/ticket.types';

const { Text } = Typography;

/** 哨兵值：代表"无标签"选项 */
export const TAG_NONE_VALUE = -1;

interface FeedbackTagSelectProps {
    scope: FeedbackTagScope;
    value?: number[];
    onChange?: (value: number[]) => void;
    admin?: boolean;
    allowCreate?: boolean;
    includeArchived?: boolean;
    placeholder?: string;
    disabled?: boolean;
    style?: React.CSSProperties;
    selectedTags?: FeedbackTagSummary[];
    size?: 'small' | 'middle' | 'large';
    /** 是否在选项列表头部显示一个"无标签"选项，选中后与其他标签互斥 */
    noneOption?: string;
}

interface TagOption {
    label: string;
    value: number;
    aliases?: string[];
}

const normalizeTagKeyword = (value: string): string => value.trim().toLocaleLowerCase();

const dedupeAliasOptions = (options: TagOption[]): TagOption[] => {
    const aliasOwnerMap = new Map<string, number>();
    for (const option of options) {
        for (const alias of option.aliases ?? []) {
            const normalizedAlias = normalizeTagKeyword(alias);
            if (!normalizedAlias) continue;
            aliasOwnerMap.set(normalizedAlias, option.value);
        }
    }

    return options.filter(option => {
        const normalizedLabel = normalizeTagKeyword(option.label);
        if (!normalizedLabel) {
            return true;
        }
        const aliasOwner = aliasOwnerMap.get(normalizedLabel);
        return aliasOwner == null || aliasOwner === option.value;
    });
};

const FeedbackTagSelect: React.FC<FeedbackTagSelectProps> = ({
    scope,
    value = [],
    onChange,
    admin = false,
    allowCreate = false,
    includeArchived = false,
    placeholder,
    disabled,
    style,
    selectedTags = [],
    size = 'small',
    noneOption,
}) => {
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [options, setOptions] = useState<TagOption[]>([]);
    const [searchKeyword, setSearchKeyword] = useState('');
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const skipSearchEffectRef = useRef(true);
    const knownOptionsRef = useRef<Map<number, TagOption>>(new Map());
    const requestIdRef = useRef(0);

    useEffect(() => {
        for (const tag of selectedTags) {
            knownOptionsRef.current.set(tag.id, {
                label: tag.name,
                value: tag.id,
                aliases: tag.aliases ?? [],
            });
        }
    }, [selectedTags]);

    const mergedOptions = useMemo(() => {
        const optionMap = new Map<number, TagOption>();
        for (const option of options) {
            optionMap.set(option.value, option);
        }
        for (const selectedId of value ?? []) {
            const knownOption = knownOptionsRef.current.get(selectedId);
            if (knownOption) {
                optionMap.set(selectedId, knownOption);
            }
        }
        for (const tag of selectedTags) {
            optionMap.set(tag.id, {
                label: tag.name,
                value: tag.id,
                aliases: tag.aliases ?? [],
            });
        }
        const result = Array.from(optionMap.values());
        if (noneOption) {
            result.unshift({ label: noneOption, value: TAG_NONE_VALUE });
        }
        return dedupeAliasOptions(result);
    }, [options, selectedTags, value, noneOption]);

    const loadOptions = (keyword = '') => {
        const requestId = ++requestIdRef.current;
        setLoading(true);
        fetchData({
            url: admin ? '/feedback/admin/tags/options' : '/feedback/tags/options',
            method: 'GET',
            data: admin
                ? {
                      scope,
                      keyword: keyword || undefined,
                      includeArchived: includeArchived ? 'true' : undefined,
                  }
                : {
                      keyword: keyword || undefined,
                  },
            setData: (data: { list?: FeedbackTagSummary[] }) => {
                if (requestId !== requestIdRef.current) {
                    return;
                }
                const nextOptions = dedupeAliasOptions(
                    (data?.list ?? []).map(tag => ({
                        label: tag.name,
                        value: tag.id,
                        aliases: tag.aliases ?? [],
                    }))
                );
                for (const option of nextOptions) {
                    knownOptionsRef.current.set(option.value, option);
                }
                setOptions(nextOptions);
            },
        }).finally(() => {
            if (requestId === requestIdRef.current) {
                setLoading(false);
            }
        });
    };

    useEffect(() => {
        skipSearchEffectRef.current = true;
        setSearchKeyword('');
        loadOptions('');
    }, [scope, admin, includeArchived]);

    useEffect(() => {
        if (skipSearchEffectRef.current) {
            skipSearchEffectRef.current = false;
            return;
        }
        if (searchDebounceRef.current) {
            clearTimeout(searchDebounceRef.current);
        }
        searchDebounceRef.current = setTimeout(() => {
            searchDebounceRef.current = null;
            loadOptions(searchKeyword);
        }, 250);
        return () => {
            if (searchDebounceRef.current) {
                clearTimeout(searchDebounceRef.current);
            }
        };
    }, [searchKeyword, scope, admin, includeArchived]);

    const canCreate =
        admin &&
        allowCreate &&
        normalizeTagKeyword(searchKeyword) !== '' &&
        !mergedOptions.some(
            option =>
                [option.label, ...(option.aliases ?? [])].some(
                    keyword => normalizeTagKeyword(keyword) === normalizeTagKeyword(searchKeyword)
                )
        );

    const handleCreate = async () => {
        const name = searchKeyword.trim();
        if (!name) return;
        setCreating(true);
        try {
            let nextCreatedTag:
                | (FeedbackTagSummary & {
                      aliasOfTagId?: number | null;
                      aliasOfTagName?: string | null;
                  })
                | undefined;
            await fetchData({
                url: '/feedback/admin/tags',
                method: 'POST',
                data: { name, scope },
                setData: (
                    data: FeedbackTagSummary & {
                        aliasOfTagId?: number | null;
                        aliasOfTagName?: string | null;
                    }
                ) => {
                    nextCreatedTag = data;
                },
            });
            const createdTag = nextCreatedTag;
            if (!createdTag) return;
            const resolvedTagId = createdTag.aliasOfTagId ?? createdTag.id;
            const resolvedTagLabel =
                createdTag.aliasOfTagId != null
                    ? (createdTag.aliasOfTagName ?? createdTag.name)
                    : createdTag.name;
            const resolvedAliases =
                createdTag.aliasOfTagId != null
                    ? Array.from(new Set([...(createdTag.aliases ?? []), createdTag.name]))
                    : (createdTag.aliases ?? []);
            knownOptionsRef.current.set(resolvedTagId, {
                label: resolvedTagLabel,
                value: resolvedTagId,
                aliases: resolvedAliases,
            });
            setOptions(prev => {
                if (prev.some(option => option.value === resolvedTagId)) return prev;
                return [
                    {
                        label: resolvedTagLabel,
                        value: resolvedTagId,
                        aliases: resolvedAliases,
                    },
                    ...prev,
                ];
            });
            onChange?.(Array.from(new Set([...(value ?? []), resolvedTagId])));
            setSearchKeyword('');
        } finally {
            setCreating(false);
        }
    };

    return (
        <Select
            mode="multiple"
            value={value}
            options={mergedOptions}
            onChange={nextValue => {
                if (!noneOption) {
                    onChange?.(nextValue as number[]);
                    return;
                }
                const arr = nextValue as number[];
                const hadNone = (value ?? []).includes(TAG_NONE_VALUE);
                const hasNone = arr.includes(TAG_NONE_VALUE);
                if (hasNone && !hadNone) {
                    // 刚选中"无标签"，清除其他
                    onChange?.([TAG_NONE_VALUE]);
                } else if (hasNone && arr.length > 1) {
                    // 已有"无标签"又选了其他，移除"无标签"
                    onChange?.(arr.filter(v => v !== TAG_NONE_VALUE));
                } else {
                    onChange?.(arr);
                }
            }}
            placeholder={placeholder}
            disabled={disabled}
            showSearch
            filterOption={false}
            onSearch={setSearchKeyword}
            onOpenChange={open => {
                if (open) {
                    loadOptions(searchKeyword.trim());
                }
            }}
            style={style}
            size={size}
            maxTagCount="responsive"
            notFoundContent={
                loading ? (
                    <Space size="small">
                        <Spin size="small" />
                        <Text type="secondary">{gLang('feedback.tagSelectLoading')}</Text>
                    </Space>
                ) : (
                    <Text type="secondary">{gLang('feedback.tagSelectEmpty')}</Text>
                )
            }
            dropdownRender={menu => (
                <div>
                    {menu}
                    {canCreate && (
                        <div
                            style={{
                                padding: 8,
                                borderTop: '1px solid var(--ant-colorBorderSecondary)',
                            }}
                        >
                            <Button
                                type="link"
                                icon={<PlusOutlined />}
                                loading={creating}
                                onClick={handleCreate}
                                style={{ paddingInline: 4 }}
                            >
                                {gLang('feedback.createTagWithName', {
                                    name: searchKeyword.trim(),
                                })}
                            </Button>
                        </div>
                    )}
                </div>
            )}
        />
    );
};

export default FeedbackTagSelect;
