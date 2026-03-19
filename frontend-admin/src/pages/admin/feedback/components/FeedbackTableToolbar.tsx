import React, { useEffect, useState } from 'react';
import { Badge, Button, Space, Modal, message, List, Select, Input, DatePicker } from 'antd';
import dayjs from 'dayjs';
import { SettingOutlined, FilterOutlined, ReloadOutlined, EyeOutlined, EyeInvisibleOutlined, HolderOutlined, CloseOutlined, PlusOutlined, UpOutlined, DownOutlined } from '@ant-design/icons';
import { gLang } from '@common/language';
import useIsPC from '@common/hooks/useIsPC';
import { fetchData } from '@common/axiosConfig';

interface ColumnConfig {
  key: string;
  title: string;
  visible: boolean;
}

interface FeedbackTableToolbarProps {
  columns: any[];
  onColumnsChange: (columns: any[]) => void;
  onReset: () => void;
  onApplyFilter: (filters: any[]) => void;
  advancedFilters: any[];
}

const FeedbackTableToolbar: React.FC<FeedbackTableToolbarProps> = ({
  columns,
  onColumnsChange,
  onReset,
  onApplyFilter,
  advancedFilters,
}) => {
  const [visibleModal, setVisibleModal] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>(
    columns.map(col => ({
      key: col.key,
      title: col.title,
      visible: true,
    }))
  );
  const [filters, setFilters] = useState<any[]>([]);
  const isPC = useIsPC();

  // 当高级筛选条件改变时，更新本地状态
  useEffect(() => {
    setFilters(advancedFilters);
  }, [advancedFilters]);

  const handleAddFilter = () => {
    setFilters([...filters, {
      column: columns[0]?.key || '',
      operator: 'equals',
      value: ''
    }]);
  };

  const [messageApi, contextHolder] = message.useMessage();

  const handleRemoveFilter = (index: number) => {
    const newFilters = [...filters];
    newFilters.splice(index, 1);
    setFilters(newFilters);
  };

  const handleFilterChange = (index: number, field: string, value: any) => {
    const newFilters = [...filters];
    const currentFilter = newFilters[index];

    if (field === 'column') {
      // 当列类型改变时，重置操作符和值
      const operators = getOperatorOptions(value);
      const defaultOperator = operators[0]?.value || 'equals';
      newFilters[index] = {
        column: value,
        operator: defaultOperator,
        value: ''
      };
    } else {
      newFilters[index] = { ...currentFilter, [field]: value };
    }

    setFilters(newFilters);
  };

  const handleApplyFilter = () => {
    onApplyFilter(filters);
    setFilterModalVisible(false);
  };

  const handleResetFilter = () => {
    setFilters([]);
  };

  // 根据列类型获取操作符选项
  const getOperatorOptions = (columnKey: string) => {
    // 定义不同类型列的操作符选项
    const operatorMap: Record<string, Array<{ value: string; label: string }>> = {
      // 数字类型
      tid: [
        { value: 'equals', label: gLang('feedback.table.filter.equals') },
        { value: 'notEquals', label: gLang('feedback.table.filter.notEquals') },
        { value: 'greaterThan', label: gLang('feedback.table.filter.greaterThan') },
        { value: 'greaterThanOrEqual', label: gLang('feedback.table.filter.greaterThanOrEqual') },
        { value: 'lessThan', label: gLang('feedback.table.filter.lessThan') },
        { value: 'lessThanOrEqual', label: gLang('feedback.table.filter.lessThanOrEqual') },
        { value: 'isEmpty', label: gLang('feedback.table.filter.isEmpty') },
        { value: 'isNotEmpty', label: gLang('feedback.table.filter.isNotEmpty') }
      ],
      // 数字类型（回复数）
      replyCount: [
        { value: 'equals', label: gLang('feedback.table.filter.equals') },
        { value: 'notEquals', label: gLang('feedback.table.filter.notEquals') },
        { value: 'greaterThan', label: gLang('feedback.table.filter.greaterThan') },
        { value: 'greaterThanOrEqual', label: gLang('feedback.table.filter.greaterThanOrEqual') },
        { value: 'lessThan', label: gLang('feedback.table.filter.lessThan') },
        { value: 'lessThanOrEqual', label: gLang('feedback.table.filter.lessThanOrEqual') },
        { value: 'isEmpty', label: gLang('feedback.table.filter.isEmpty') },
        { value: 'isNotEmpty', label: gLang('feedback.table.filter.isNotEmpty') }
      ],
      // 文本类型
      title: [
        { value: 'equals', label: gLang('feedback.table.filter.equals') },
        { value: 'notEquals', label: gLang('feedback.table.filter.notEquals') },
        { value: 'contains', label: gLang('feedback.table.filter.contains') },
        { value: 'notContains', label: gLang('feedback.table.filter.notContains') },
        { value: 'isEmpty', label: gLang('feedback.table.filter.isEmpty') },
        { value: 'isNotEmpty', label: gLang('feedback.table.filter.isNotEmpty') }
      ],
      // 标签类型
      tags: [
        { value: 'equals', label: gLang('feedback.table.filter.equals') },
        { value: 'notEquals', label: gLang('feedback.table.filter.notEquals') },
        { value: 'contains', label: gLang('feedback.table.filter.contains') },
        { value: 'notContains', label: gLang('feedback.table.filter.notContains') },
        { value: 'isEmpty', label: gLang('feedback.table.filter.isEmpty') },
        { value: 'isNotEmpty', label: gLang('feedback.table.filter.isNotEmpty') }
      ],
      // 枚举类型
      feedbackType: [
        { value: 'equals', label: gLang('feedback.table.filter.equals') },
        { value: 'notEquals', label: gLang('feedback.table.filter.notEquals') }
      ],
      status: [
        { value: 'equals', label: gLang('feedback.table.filter.equals') },
        { value: 'notEquals', label: gLang('feedback.table.filter.notEquals') }
      ],
      // 日期类型
      create_time: [
        { value: 'equals', label: gLang('feedback.table.filter.equals') },
        { value: 'notEquals', label: gLang('feedback.table.filter.notEquals') },
        { value: 'greaterThan', label: gLang('feedback.table.filter.laterThan') },
        { value: 'greaterThanOrEqual', label: gLang('feedback.table.filter.laterThanOrEqual') },
        { value: 'lessThan', label: gLang('feedback.table.filter.earlierThan') },
        { value: 'lessThanOrEqual', label: gLang('feedback.table.filter.earlierThanOrEqual') },
        { value: 'isEmpty', label: gLang('feedback.table.filter.isEmpty') },
        { value: 'isNotEmpty', label: gLang('feedback.table.filter.isNotEmpty') }
      ],
      lastReplyTime: [
        { value: 'equals', label: gLang('feedback.table.filter.equals') },
        { value: 'notEquals', label: gLang('feedback.table.filter.notEquals') },
        { value: 'greaterThan', label: gLang('feedback.table.filter.laterThan') },
        { value: 'greaterThanOrEqual', label: gLang('feedback.table.filter.laterThanOrEqual') },
        { value: 'lessThan', label: gLang('feedback.table.filter.earlierThan') },
        { value: 'lessThanOrEqual', label: gLang('feedback.table.filter.earlierThanOrEqual') },
        { value: 'isEmpty', label: gLang('feedback.table.filter.isEmpty') },
        { value: 'isNotEmpty', label: gLang('feedback.table.filter.isNotEmpty') }
      ],
      // 默认操作符
      default: [
        { value: 'equals', label: gLang('feedback.table.filter.equals') },
        { value: 'notEquals', label: gLang('feedback.table.filter.notEquals') },
        { value: 'isEmpty', label: gLang('feedback.table.filter.isEmpty') },
        { value: 'isNotEmpty', label: gLang('feedback.table.filter.isNotEmpty') }
      ]
    };

    return operatorMap[columnKey] || operatorMap.default;
  };

  // 标签选项状态
  const [tagOptions, setTagOptions] = useState<Array<{ value: string; label: string; children?: Array<{ value: number; label: string }> }>>([]);


  // 加载标签选项
  useEffect(() => {
    const loadTagOptions = async () => {
      try {
        // 加载公开标签
        let publicTags: any[] = [];
        await fetchData({
          url: '/feedback/admin/tags/options',
          method: 'GET',
          data: { scope: 'PUBLIC' },
          setData: (data: { list?: any[] }) => {
            publicTags = data?.list || [];
          },
        });

        // 加载内部标签
        let internalTags: any[] = [];
        await fetchData({
          url: '/feedback/admin/tags/options',
          method: 'GET',
          data: { scope: 'INTERNAL' },
          setData: (data: { list?: any[] }) => {
            internalTags = data?.list || [];
          },
        });

        // 构建标签选项
        const tagOptionsData = [
          {
            value: 'PUBLIC',
            label: gLang('feedback.table.filter.publicTags'),
            children: publicTags.map((tag: any) => ({
              value: tag.id,
              label: tag.name
            }))
          },
          {
            value: 'INTERNAL',
            label: gLang('feedback.table.filter.internalTags'),
            children: internalTags.map((tag: any) => ({
              value: tag.id,
              label: tag.name
            }))
          }
        ];

        setTagOptions(tagOptionsData);
      } catch (error) {
        console.error(gLang('feedback.table.filter.loadingTagsFailed'), error);
      }
    };

    loadTagOptions();
  }, []);

  // 获取列的选项值
  const getColumnOptions = (columnKey: string) => {
    const optionsMap: Record<string, Array<{ value: string | number; label: string }>> = {
      feedbackType: [
        { value: 'BUG', label: 'BUG' },
        { value: 'SUGGESTION', label: gLang('feedback.table.filter.suggestion') }
      ],
      status: [
        { value: 'Open', label: gLang('feedback.table.filter.open') },
        { value: 'Closed', label: gLang('feedback.table.filter.closed') },
        { value: 'Ended', label: gLang('feedback.table.filter.ended') }
      ]
    };

    return optionsMap[columnKey] || [];
  };

  const handleColumnToggle = (key: string) => {
    setColumnConfig(prev =>
      prev.map(col => (col.key === key ? { ...col, visible: !col.visible } : col))
    );
  };

  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  // 当 columns 属性变化时，更新 columnConfig，但保持用户的可见性设置
  React.useEffect(() => {
    setColumnConfig(prevConfig => {
      // 创建一个映射，存储现有列的可见性设置
      const visibilityMap = new Map<string, boolean>();
      prevConfig.forEach(col => {
        visibilityMap.set(col.key, col.visible);
      });

      // 根据新的 columns 属性更新 columnConfig，保持现有列的可见性设置
      return columns.map(col => ({
        key: col.key,
        title: col.title,
        visible: visibilityMap.get(col.key) ?? true,
      }));
    });
  }, [columns]);

  const handleDragStart = (e: React.DragEvent, key: string) => {
    setDraggedItem(key);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    // 添加视觉指示
    const target = e.currentTarget as HTMLElement;
    target.style.borderColor = '#1890ff';
    target.style.backgroundColor = '#f0f7ff';
  };

  const handleDrop = (e: React.DragEvent, targetKey: string) => {
    e.preventDefault();

    // 移除视觉指示
    const target = e.currentTarget as HTMLElement;
    target.style.borderColor = '#e8e8e8';
    target.style.backgroundColor = '';

    if (draggedItem && draggedItem !== targetKey) {
      setColumnConfig(prev => {
        const newConfig = [...prev];
        const draggedIndex = newConfig.findIndex(col => col.key === draggedItem);
        const targetIndex = newConfig.findIndex(col => col.key === targetKey);

        const [dragged] = newConfig.splice(draggedIndex, 1);
        newConfig.splice(targetIndex, 0, dragged);

        return newConfig;
      });
    }
    setDraggedItem(null);
  };

  // 上下按钮调整顺序
  const handleMoveUp = (index: number) => {
    if (index > 0) {
      setColumnConfig(prev => {
        const newConfig = [...prev];
        const [moved] = newConfig.splice(index, 1);
        newConfig.splice(index - 1, 0, moved);
        return newConfig;
      });
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < columnConfig.length - 1) {
      setColumnConfig(prev => {
        const newConfig = [...prev];
        const [moved] = newConfig.splice(index, 1);
        newConfig.splice(index + 1, 0, moved);
        return newConfig;
      });
    }
  };

  const handleSaveColumns = () => {
    const newColumns = columnConfig
      .filter(col => col.visible)
      .map(config => columns.find(col => col.key === config.key))
      .filter(Boolean);
    onColumnsChange(newColumns);
    // 保存到本地存储
    localStorage.setItem('feedbackTableColumns', JSON.stringify(columnConfig));
    setVisibleModal(false);
    messageApi.success(gLang('feedback.table.filter.columnsSaved'));
  };


  return (
    <>
      {contextHolder}
      <Space wrap size={8} style={{ width: isPC ? undefined : '100%' }}>
        <Button
          type={(columnConfig.some(col => !col.visible) || JSON.stringify(columnConfig.map(c => c.key)) !== JSON.stringify(columns.map(c => c.key))) ? "primary" : "default"}
          icon={<SettingOutlined />}
          size="small"
          onClick={() => setVisibleModal(true)}
        >
          {gLang('feedback.table.columnsSetting')}
        </Button>
        <Badge count={filters.length} size="small" offset={[-2, 4]}>
          <Button
            type={filters.length > 0 ? "primary" : "default"}
            icon={<FilterOutlined />}
            size="small"
            onClick={() => setFilterModalVisible(true)}
          >
            {gLang('feedback.table.advancedFilter')}
          </Button>
        </Badge>
        <Button type="default" icon={<ReloadOutlined />} size="small" onClick={onReset}>
          {gLang('feedback.table.reset')}
        </Button>
      </Space>

      <Modal
        title={gLang('feedback.table.columnsSetting')}
        open={visibleModal}
        onCancel={() => setVisibleModal(false)}
        onOk={handleSaveColumns}
        width={500}
      >
        <List
          itemLayout="horizontal"
          dataSource={columnConfig}
          renderItem={(col, index) => (
            <List.Item
              draggable={isPC}
              onDragStart={isPC ? (e) => handleDragStart(e, col.key) : undefined}
              onDragOver={isPC ? handleDragOver : undefined}
              onDrop={isPC ? (e) => handleDrop(e, col.key) : undefined}
              style={{
                padding: '6px 10px',
                marginBottom: '4px',
                border: '1px solid #e8e8e8',
                borderRadius: '4px',
                cursor: isPC ? 'move' : 'default',
                transition: 'all 0.2s ease',
              }}
              onDragEnter={isPC ? (e) => {
                e.currentTarget.style.borderColor = '#1890ff';
                e.currentTarget.style.backgroundColor = '#f0f7ff';
              } : undefined}
              onDragLeave={isPC ? (e) => {
                e.currentTarget.style.borderColor = '#e8e8e8';
                e.currentTarget.style.backgroundColor = '';
              } : undefined}
            >
              <List.Item.Meta
                title={
                  <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Space align="center">
                      {isPC ? (
                        <HolderOutlined style={{ cursor: 'grab' }} />
                      ) : (
                        <span style={{ marginRight: '8px' }}>{index + 1}.</span>
                      )}
                      <span>{col.title}</span>
                    </Space>
                    <Space>
                      {!isPC && (
                        <>
                          <Button
                            icon={<UpOutlined />}
                            size="small"
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0}
                          />
                          <Button
                            icon={<DownOutlined />}
                            size="small"
                            onClick={() => handleMoveDown(index)}
                            disabled={index === columnConfig.length - 1}
                          />
                        </>
                      )}
                      <Button
                        type={col.visible ? 'primary' : 'default'}
                        icon={col.visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                        size="small"
                        onClick={() => handleColumnToggle(col.key)}
                      />
                    </Space>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Modal>

      <Modal
        title={gLang('feedback.table.filter.setFilterCondition')}
        open={filterModalVisible}
        onCancel={() => setFilterModalVisible(false)}
        onOk={handleApplyFilter}
        width={600}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          {filters.map((filter, index) => (
            <div key={index} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Select
                value={filter.column}
                onChange={(value) => handleFilterChange(index, 'column', value)}
                style={{ flex: 1, minWidth: 100 }}
                options={columns
                  .filter(col => col.key !== 'action' && col.key !== 'feedbackType' && col.key !== 'status' && col.key !== 'tags')
                  .map(col => ({
                    value: col.key,
                    label: col.title
                  }))
                }
              />
              <Select
                value={filter.operator}
                onChange={(value) => handleFilterChange(index, 'operator', value)}
                style={{ flex: 1, minWidth: 100 }}
                options={getOperatorOptions(filter.column)}
              />
              {(() => {
                const isEmptyOperator = ['isEmpty', 'isNotEmpty'].includes(filter.operator);

                if (isEmptyOperator) {
                  return null;
                }

                if (filter.column === 'tags') {
                  // 判断是否允许多选
                  const isMultiple = ['contains', 'notContains'].includes(filter.operator);

                  // 构建扁平化的标签选项
                  const flatTagOptions: any[] | undefined = [];
                  tagOptions.forEach(group => {
                    group.children?.forEach(tag => {
                      flatTagOptions.push({
                        value: tag.value,
                        label: tag.label
                      });
                    });
                  });

                  return (
                    <Select
                      mode={isMultiple ? "multiple" : undefined}
                      value={isMultiple ? (filter.value || []) : (filter.value && filter.value.length > 0 ? filter.value[0] : null)}
                      onChange={(value) => {
                        if (isMultiple) {
                          handleFilterChange(index, 'value', value as number[]);
                        } else {
                          handleFilterChange(index, 'value', value ? [value as number] : []);
                        }
                      }}
                      style={{ flex: 2, minWidth: 150 }}
                      placeholder={gLang('feedback.table.filter.selectTag')}
                      maxTagCount="responsive"
                      options={flatTagOptions}
                      showSearch
                      optionFilterProp="label"
                    />
                  );
                }

                const columnOptions = getColumnOptions(filter.column);
                if (columnOptions.length > 0) {
                  return (
                    <Select
                      value={filter.value}
                      onChange={(value) => handleFilterChange(index, 'value', value)}
                      style={{ flex: 2, minWidth: 150 }}
                      placeholder={gLang('feedback.table.filter.select')}
                      options={columnOptions}
                    />
                  );
                }

                // 时间类型字段使用日期选择器
                if (['create_time', 'lastReplyTime'].includes(filter.column)) {
                  return (
                    <DatePicker
                      value={filter.value ? dayjs(filter.value) : null}
                      onChange={(date) => handleFilterChange(index, 'value', date ? date.format('YYYY-MM-DD HH:mm:ss') : '')}
                      style={{ flex: 2, minWidth: 150 }}
                      showTime
                      placeholder={gLang('feedback.table.filter.selectTime')}
                    />
                  );
                }

                return (
                  <Input
                    value={filter.value}
                    onChange={(e) => handleFilterChange(index, 'value', e.target.value)}
                    placeholder={gLang('feedback.table.filter.input')}
                    style={{ flex: 2, minWidth: 150 }}
                  />
                );
              })()}
              <Button
                type="text"
                icon={<CloseOutlined />}
                size="small"
                danger
                onClick={() => handleRemoveFilter(index)}
                style={{ flexShrink: 0 }}
              />
            </div>
          ))}
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={handleAddFilter}
          >
            {gLang('feedback.table.filter.addCondition')}
          </Button>
          <Button
            type="text"
            onClick={handleResetFilter}
          >
            {gLang('feedback.table.filter.resetFilter')}
          </Button>
        </Space>
      </Modal>
    </>
  );
};

export default FeedbackTableToolbar;
