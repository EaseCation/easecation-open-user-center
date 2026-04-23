// 可复用的账户匹配表单组件
// 支持自定义 label、name、extra 参数

import React, { useState, useCallback, useRef } from 'react';
import { Form, Input, Select } from 'antd';
import { fetchData } from '@common/axiosConfig';
import { SearchedPlayer } from '@ecuc/shared/types/player.types';
import { BindPlayerDetailBasic } from '@ecuc/shared/types/player.types';
import { gLang } from '@common/language';

// 账户匹配选项接口
export interface AccountMatchingOptions {
    // 搜索触发方式：'blur' - 失焦时搜索, 'input' - 输入时搜索
    triggerMode?: 'blur' | 'input';
    // 是否在输入为空时清空结果
    clearOnEmpty?: boolean;
    // 搜索防抖延迟（毫秒），仅在 triggerMode 为 'input' 时有效
    debounceDelay?: number;
}

// 账户匹配结果接口
export interface AccountMatchingResult {
    // 输入值
    inputValue: string;
    // 设置输入值
    setInputValue: (value: string) => void;
    // 可用用户列表
    availableUsers: SearchedPlayer[] | BindPlayerDetailBasic[];
    // 是否正在搜索
    isSearching: boolean;
    // 处理输入变化
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    // 处理输入失焦
    handleInputBlur: () => void;
    // 处理下拉选择
    handleChooseChange: (ecid: string, onSelect?: (ecid: string) => void) => void;
    // 手动搜索
    searchUsers: (query: string) => Promise<void>;
    // 清空结果
    clearResults: () => void;
}

// 账户匹配Hook
export const useAccountMatching = (options: AccountMatchingOptions = {}): AccountMatchingResult => {
    const { triggerMode = 'blur', clearOnEmpty = true, debounceDelay = 300 } = options;

    const [inputValue, setInputValue] = useState<string>('');
    const [lastQueriedValue, setLastQueriedValue] = useState<string>('');
    const [availableUsers, setAvailableUsers] = useState<
        SearchedPlayer[] | BindPlayerDetailBasic[]
    >([]);
    const [isSearching, setIsSearching] = useState<boolean>(false);

    // 防抖定时器引用
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // 搜索用户的通用方法
    const searchUsers = useCallback(
        async (query: string) => {
            if (!query.trim()) {
                if (clearOnEmpty) {
                    setAvailableUsers([]);
                }
                return;
            }

            // 避免重复搜索相同内容
            if (query === lastQueriedValue) {
                return;
            }

            setIsSearching(true);
            try {
                await fetchData({
                    url: '/ec/search',
                    method: 'GET',
                    data: { name: query },
                    setData: setAvailableUsers,
                });
                setLastQueriedValue(query);
            } catch {
                setAvailableUsers([]);
            } finally {
                setIsSearching(false);
            }
        },
        [lastQueriedValue, clearOnEmpty]
    );

    // 处理输入变化
    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value.trim();
            setInputValue(value);

            if (triggerMode === 'input') {
                // 输入模式：使用防抖搜索
                if (debounceTimerRef.current) {
                    clearTimeout(debounceTimerRef.current);
                }
                debounceTimerRef.current = setTimeout(() => {
                    searchUsers(value);
                }, debounceDelay);
            } else if (triggerMode === 'blur' && clearOnEmpty && !value) {
                // 失焦模式：输入为空时清空结果
                setAvailableUsers([]);
            }
        },
        [triggerMode, clearOnEmpty, debounceDelay, searchUsers]
    );

    // 处理输入失焦
    const handleInputBlur = useCallback(() => {
        if (triggerMode === 'blur') {
            const value = inputValue.trim();
            // 只有内容变更且非空才发请求
            if (value && value !== lastQueriedValue) {
                searchUsers(value);
            }
        }
    }, [triggerMode, inputValue, lastQueriedValue, searchUsers]);

    // 处理下拉选择
    const handleChooseChange = useCallback((ecid: string, onSelect?: (ecid: string) => void) => {
        setInputValue(ecid);
        if (onSelect) {
            onSelect(ecid);
        }
    }, []);

    // 清空结果
    const clearResults = useCallback(() => {
        setAvailableUsers([]);
        setInputValue('');
        setLastQueriedValue('');
    }, []);

    return {
        inputValue,
        setInputValue,
        availableUsers,
        isSearching,
        handleInputChange,
        handleInputBlur,
        handleChooseChange,
        searchUsers,
        clearResults,
    };
};

interface AccountMatchingFormItemProps {
    // 表单字段名
    name: string;
    // 表单标签
    label: string;
    // 额外说明文本
    extra?: string;
    // 是否必填
    required?: boolean;
    // 必填时的错误提示
    requiredMessage?: string;
    // 账户匹配选项
    matchingOptions?: AccountMatchingOptions;
    // 下拉选择字段名（可选）
    chooseFieldName?: string;
    // 下拉选择是否必填
    chooseRequired?: boolean;
    // 下拉选择必填时的错误提示
    chooseRequiredMessage?: string;
    // 下拉选择标签
    chooseLabel?: string;
    // 下拉选择额外说明
    chooseExtra?: string;
    // 输入框占位符
    placeholder?: string;
    // 下拉选择占位符
    choosePlaceholder?: string;
    // 自定义验证规则
    rules?: any[];
    // 自定义下拉选择验证规则
    chooseRules?: any[];
    // 选择用户时的回调
    onUserSelect?: (ecid: string) => void;
    // 输入框失焦时的回调
    onInputBlur?: () => void;
    // 自定义样式
    style?: React.CSSProperties;
    // 是否禁用输入框（当下拉选择有值时）
    disableInputWhenChosen?: boolean;
}

const AccountMatchingFormItem: React.FC<AccountMatchingFormItemProps> = ({
    name,
    label,
    extra,
    matchingOptions = {},
    chooseFieldName,
    chooseRequired = false,
    chooseRequiredMessage = gLang('required'),
    chooseLabel = gLang('ticketList.bestMatch'),
    chooseExtra = gLang('ticketList.bestMatchIntro'),
    placeholder,
    choosePlaceholder = gLang('ticketList.bestMatchPlaceholder'),
    rules = [],
    chooseRules = [],
    onUserSelect,
    onInputBlur,
    style,
    disableInputWhenChosen = true,
}) => {
    const accountMatching = useAccountMatching(matchingOptions);
    const form = Form.useFormInstance();

    // 构建输入框验证规则（不设置required，避免显示必填错误）
    const inputRules = [
        ...rules,
        {
            validator: (_: any, value: any) => {
                if (!value) return Promise.resolve();
                if (
                    accountMatching.availableUsers.length > 0 &&
                    !accountMatching.availableUsers.some(u => u.ecid === value)
                ) {
                    return Promise.reject(gLang('ecDetail.accountMatching.noMatch'));
                }
                return Promise.resolve();
            },
        },
    ];

    // 构建下拉选择验证规则（只在有下拉字段时才验证）
    const selectRules = [
        ...chooseRules,
        ...(chooseRequired && chooseFieldName
            ? [
                  {
                      required: true,
                      message:
                          chooseRequiredMessage || gLang('ecDetail.accountMatching.selectUser'),
                  },
              ]
            : []),
    ];

    // 处理下拉选择变化
    const handleChooseChange = (value: string) => {
        accountMatching.handleChooseChange(value, ecid => {
            if (form) {
                form.setFieldsValue({ [name]: ecid, [chooseFieldName || '']: ecid });
                form.validateFields([name]).catch(() => {});
            }
            if (onUserSelect) {
                onUserSelect(ecid);
            }
        });
    };

    // 处理输入框失焦
    const handleInputBlur = () => {
        accountMatching.handleInputBlur();
        if (chooseFieldName) {
            form.resetFields([chooseFieldName]);
        }
        if (onInputBlur) {
            onInputBlur();
        }
    };

    return (
        <>
            {/* 输入框 */}
            <Form.Item
                name={name}
                label={label}
                extra={extra}
                rules={inputRules}
            >
                <Input
                    onChange={accountMatching.handleInputChange}
                    onBlur={handleInputBlur}
                    placeholder={placeholder}
                    disabled={Boolean(
                        disableInputWhenChosen &&
                        chooseFieldName &&
                        form.getFieldValue(chooseFieldName)
                    )}
                    style={style}
                />
            </Form.Item>

            {/* 下拉选择（可选） */}
            {chooseFieldName && (
                <Form.Item
                    name={chooseFieldName}
                    label={chooseLabel}
                    extra={chooseExtra}
                    rules={selectRules}
                >
                    <Select
                        value={form.getFieldValue(chooseFieldName)}
                        onChange={handleChooseChange}
                        allowClear
                        loading={accountMatching.isSearching}
                        placeholder={choosePlaceholder}
                        disabled={!form.getFieldValue(name) || accountMatching.availableUsers.length === 0}
                        style={style}
                    >
                        {accountMatching.availableUsers.map(user => (
                            <Select.Option key={user.ecid} value={user.ecid}>
                                <span>LV.{user.level} - {user.name}</span>
                            </Select.Option>
                        ))}
                    </Select>
                </Form.Item>
            )}
        </>
    );
};

export default AccountMatchingFormItem;
