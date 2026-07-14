import { useState } from 'react';
import {
  Card, Button, Space, Typography, Row, Col, Tag, message, Select, Spin, Tooltip, Modal, Switch,
} from 'antd';
import {
  CalendarOutlined, ReloadOutlined, LeftOutlined, RightOutlined,
  SunOutlined, MoonOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import api from '../services/api';
import { Colors } from '../styles/theme';
import { useResponsive } from '../hooks/useResponsive';
import dayjs from 'dayjs';
import { useCalendarDataSource } from '../services/dataSource';

const { Text, Title } = Typography;

const SHIFT_OPTIONS = [
  { value: 'day', label: '白班', color: Colors.primary, icon: <SunOutlined /> },
  { value: 'night', label: '夜班', color: '#8B5CF6', icon: <MoonOutlined /> },
  { value: 'middle', label: '中班', color: Colors.warning, icon: <ClockCircleOutlined /> },
  { value: 'off', label: '休息', color: Colors.gray400, icon: null },
];

const SHIFT_LABELS: Record<string, { label: string; color: string }> = {
  day: { label: '白班', color: Colors.primary },
  night: { label: '夜班', color: '#8B5CF6' },
  middle: { label: '中班', color: Colors.warning },
  off: { label: '休息', color: Colors.gray400 },
};

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

export default function WorkCalendar() {
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [initModalOpen, setInitModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [editShift, setEditShift] = useState<string | undefined>(undefined);
  const [editHoliday, setEditHoliday] = useState<string | undefined>(undefined);
  const [editIsWorkDay, setEditIsWorkDay] = useState(true);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchShiftValue, setBatchShiftValue] = useState<string | undefined>(undefined);
  const { isMobile } = useResponsive();

  const year = currentDate.year();
  const month = currentDate.month() + 1;
  const daysInMonth = currentDate.daysInMonth();
  const firstDayOfWeek = dayjs(new Date(year, month - 1, 1)).day();

  // ── Unified data source hook ───────────────────────────────
  const {
    data: entries,
    loading,
    refresh: fetchData,
  } = useCalendarDataSource(year, month);

  const handlePrevMonth = () => setCurrentDate(currentDate.subtract(1, 'month'));
  const handleNextMonth = () => setCurrentDate(currentDate.add(1, 'month'));

  const handleInitCalendar = async () => {
    try {
      const res = await api.post('/calendar/init', { year, month });
      message.success(`已初始化 ${year}年${month}月 共${res.data.data.count}天`);
      setInitModalOpen(false);
      fetchData();
    } catch {
      message.error('初始化失败');
    }
  };

  const openEditModal = (entry: any) => {
    setEditingEntry(entry);
    setEditShift(entry?.shiftType || undefined);
    setEditHoliday(entry?.holidayName || undefined);
    setEditIsWorkDay(entry?.isWorkDay !== false);
    setEditModalOpen(true);
  };

  const handleBatchShift = async () => {
    if (!batchShiftValue) return;
    const workDayEntries = entries.filter(e => e.isWorkDay !== false);
    if (workDayEntries.length === 0) {
      message.warning('当前月份没有工作日');
      return;
    }
    try {
      for (const entry of workDayEntries) {
        await api.put(`/calendar/${entry.id}`, { shiftType: batchShiftValue });
      }
      message.success(`已为 ${workDayEntries.length} 个工作日设置班次`);
      setBatchModalOpen(false);
      setBatchShiftValue(undefined);
      fetchData();
    } catch {
      message.error('批量设置失败');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingEntry) return;
    try {
      await api.put(`/calendar/${editingEntry.id}`, {
        isWorkDay: editIsWorkDay,
        shiftType: editShift || null,
        holidayName: editHoliday || null,
      });
      message.success('已更新');
      setEditModalOpen(false);
      fetchData();
    } catch {
      message.error('更新失败');
    }
  };

  const getEntryForDay = (day: number) => entries.find(e => e.day === day);

  const renderCalendar = () => {
    const cells: React.ReactNode[] = [];

    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push(<div key={`empty-${i}`} style={{ minHeight: isMobile ? 60 : 90 }} />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const entry = getEntryForDay(day);
      const isToday = day === dayjs().date() && month === dayjs().month() + 1 && year === dayjs().year();
      const isWorkDay = entry?.isWorkDay !== false;
      const shiftCfg = entry?.shiftType ? SHIFT_LABELS[entry.shiftType] : null;

      cells.push(
        <div
          key={day}
          onClick={() => entry && openEditModal(entry)}
          style={{
            border: `1px solid ${isToday ? Colors.primary : Colors.gray200}`,
            borderRadius: 6,
            padding: isMobile ? 4 : 6,
            minHeight: isMobile ? 60 : 90,
            background: isToday ? Colors.sidebarActive : isWorkDay ? '#fff' : Colors.gray50,
            cursor: entry ? 'pointer' : 'default',
            transition: 'all 0.2s',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
          onMouseEnter={e => { if (!isToday && entry) e.currentTarget.style.borderColor = Colors.primary; }}
          onMouseLeave={e => { if (!isToday && entry) e.currentTarget.style.borderColor = Colors.gray200; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{
              fontSize: isMobile ? 12 : 14,
              fontWeight: isToday ? 700 : 400,
              color: isToday ? Colors.primary : isWorkDay ? Colors.gray800 : Colors.gray400,
            }}>
              {day}
            </Text>
            {entry && (
              <Switch
                size="small"
                checked={isWorkDay}
                onChange={() => { openEditModal(entry); }}
                style={{ transform: 'scale(0.7)' }}
              />
            )}
          </div>
          {entry && (
            <div style={{ marginTop: 'auto' }}>
              {!isWorkDay && (
                <Tag color="default" style={{ borderRadius: 4, border: 'none', fontSize: 10, padding: '0 4px', lineHeight: '16px' }}>
                  休息
                </Tag>
              )}
              {entry.holidayName && (
                <Tag color={Colors.danger} style={{ borderRadius: 4, border: 'none', fontSize: 10, padding: '0 4px', lineHeight: '16px', marginTop: 1 }}>
                  {entry.holidayName}
                </Tag>
              )}
              {entry.shiftType && entry.shiftType !== 'day' && shiftCfg && (
                <Tag color={shiftCfg.color} style={{ borderRadius: 4, border: 'none', fontSize: 10, padding: '0 4px', lineHeight: '16px', marginTop: 1 }}>
                  {shiftCfg.label}
                </Tag>
              )}
              {entry.shiftType === 'day' && isWorkDay && (
                <Tag color={Colors.primary} style={{ borderRadius: 4, border: 'none', fontSize: 10, padding: '0 4px', lineHeight: '16px', marginTop: 1 }}>
                  白班
                </Tag>
              )}
            </div>
          )}
        </div>
      );
    }

    return cells;
  };

  const workDays = entries.filter(e => e.isWorkDay !== false).length;
  const restDays = entries.length - workDays;

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            <CalendarOutlined style={{ marginRight: 8 }} />
            工作日历
          </Title>
        </Col>
        <Col>
          <Space>
            <Button size="small" onClick={() => setInitModalOpen(true)}>初始化月份</Button>
            <Button size="small" onClick={() => setBatchModalOpen(true)} disabled={entries.length === 0}>批量排班</Button>
            <Button size="small" icon={<ReloadOutlined />} onClick={fetchData}>刷新</Button>
          </Space>
        </Col>
      </Row>

      {/* Stats */}
      <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
        <Col xs={8}>
          <Card size="small" styles={{ body: { padding: '10px 16px' } }}>
            <Text style={{ fontSize: 11, color: Colors.gray500 }}>工作日</Text>
            <div style={{ fontSize: 20, fontWeight: 700, color: Colors.primary }}>{workDays} 天</div>
          </Card>
        </Col>
        <Col xs={8}>
          <Card size="small" styles={{ body: { padding: '10px 16px' } }}>
            <Text style={{ fontSize: 11, color: Colors.gray500 }}>休息日</Text>
            <div style={{ fontSize: 20, fontWeight: 700, color: Colors.gray500 }}>{restDays} 天</div>
          </Card>
        </Col>
        <Col xs={8}>
          <Card size="small" styles={{ body: { padding: '10px 16px' } }}>
            <Text style={{ fontSize: 11, color: Colors.gray500 }}>排班天数</Text>
            <div style={{ fontSize: 20, fontWeight: 700, color: Colors.warning }}>
              {entries.filter(e => e.shiftType && e.shiftType !== 'day').length} 个
            </div>
          </Card>
        </Col>
      </Row>

      {/* Month Navigation */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 12, background: '#fff', borderRadius: 8, border: '1px solid #eee', padding: '8px 16px',
      }}>
        <Button type="text" icon={<LeftOutlined />} onClick={handlePrevMonth} />
        <Text strong style={{ fontSize: 16 }}>{year}年{month}月</Text>
        <Button type="text" icon={<RightOutlined />} onClick={handleNextMonth} />
      </div>

      {/* Calendar Grid */}
      <Spin spinning={loading}>
        <div style={{
          background: '#fff', borderRadius: 8, border: '1px solid #eee', padding: isMobile ? 8 : 12,
        }}>
          {/* Weekday headers */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4,
          }}>
            {WEEKDAY_LABELS.map((label, i) => (
              <div key={i} style={{
                textAlign: 'center', padding: '4px 0', fontSize: isMobile ? 11 : 13,
                fontWeight: 600, color: i === 0 || i === 6 ? Colors.danger : Colors.gray600,
              }}>
                {label}
              </div>
            ))}
          </div>

          {/* Calendar cells */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4,
          }}>
            {renderCalendar()}
          </div>
        </div>
      </Spin>

      {/* Legend */}
      <div style={{
        marginTop: 12, padding: '8px 16px', background: '#fff', borderRadius: 8, border: '1px solid #eee',
        display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: Colors.gray500,
      }}>
        <span><Tag color={Colors.primary} style={{ borderRadius: 4, border: 'none' }}>●</Tag> 今日</span>
        <span><Tag color="#fff" style={{ border: `1px solid ${Colors.gray200}`, borderRadius: 4 }}> 工作日</Tag></span>
        <span><Tag color={Colors.gray50} style={{ border: `1px solid ${Colors.gray200}`, borderRadius: 4 }}> 休息日</Tag></span>
        <span><SunOutlined style={{ color: Colors.primary }} /> 白班</span>
        <span><MoonOutlined style={{ color: '#8B5CF6' }} /> 夜班</span>
        <span><ClockCircleOutlined style={{ color: Colors.warning }} /> 中班</span>
        <span><Tooltip title="点击日期编辑详细设置"><CalendarOutlined /> 点击编辑</Tooltip></span>
      </div>

      {/* Init Modal */}
      <Modal
        title="初始化工作日历"
        open={initModalOpen}
        onCancel={() => setInitModalOpen(false)}
        onOk={handleInitCalendar}
        okText="初始化"
      >
        <p>将为 {year} 年 {month} 月初始化工作日历（周一至周五工作日，周六周日休息）。</p>
        <p style={{ color: Colors.gray500, fontSize: 12 }}>如果该月已初始化，此操作不会重复执行。</p>
      </Modal>

      {/* Batch Shift Modal */}
      <Modal
        title="批量设置班次"
        open={batchModalOpen}
        onCancel={() => setBatchModalOpen(false)}
        onOk={handleBatchShift}
        okText="应用"
        width={400}
      >
        <div style={{ padding: '8px 0' }}>
          <p style={{ marginBottom: 16, color: Colors.gray500, fontSize: 13 }}>
            将 {year} 年 {month} 月所有<strong>工作日</strong>的班次设置为：
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {SHIFT_OPTIONS.filter(o => o.value !== 'off').map(opt => (
              <Tag
                key={opt.value}
                onClick={() => setBatchShiftValue(batchShiftValue === opt.value ? undefined : opt.value)}
                style={{
                  cursor: 'pointer', padding: '6px 16px', fontSize: 14, borderRadius: 6,
                  border: batchShiftValue === opt.value ? `2px solid ${opt.color}` : '1px solid #d9d9d9',
                  background: batchShiftValue === opt.value ? `${opt.color}15` : '#fff',
                  color: batchShiftValue === opt.value ? opt.color : Colors.gray600,
                }}
              >
                {opt.icon}{' '}{opt.label}
              </Tag>
            ))}
          </div>
        </div>
      </Modal>

      {/* Edit Day Modal */}
      <Modal
        title={editingEntry ? `编辑 ${year}年${month}月${editingEntry.day}日` : '编辑'}
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        onOk={handleSaveEdit}
        okText="保存"
        width={400}
      >
        {editingEntry && (
          <div style={{ padding: '8px 0' }}>
            <div style={{ marginBottom: 16 }}>
              <Text style={{ fontWeight: 500, color: Colors.gray700 }}>工作日/休息日</Text>
              <div style={{ marginTop: 8 }}>
                <Switch checked={editIsWorkDay} onChange={(v) => setEditIsWorkDay(v)} />
                <span style={{ marginLeft: 8, color: Colors.gray600 }}>
                  {editIsWorkDay ? '工作日' : '休息日'}
                </span>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <Text style={{ fontWeight: 500, color: Colors.gray700 }}>班次</Text>
              <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {SHIFT_OPTIONS.map(opt => (
                  <Tag
                    key={opt.value}
                    onClick={() => setEditShift(editShift === opt.value ? undefined : opt.value)}
                    style={{
                      cursor: 'pointer', padding: '4px 12px', fontSize: 13, borderRadius: 6,
                      border: editShift === opt.value ? `2px solid ${opt.color}` : '1px solid #d9d9d9',
                      background: editShift === opt.value ? `${opt.color}15` : '#fff',
                      color: editShift === opt.value ? opt.color : Colors.gray600,
                    }}
                  >
                    {opt.icon}{' '}{opt.label}
                  </Tag>
                ))}
              </div>
            </div>
            <div>
              <Text style={{ fontWeight: 500, color: Colors.gray700 }}>节假日名称（可选）</Text>
              <div style={{ marginTop: 8 }}>
                <Select
                  style={{ width: '100%' }}
                  placeholder="选择或输入节假日"
                  allowClear
                  value={editHoliday}
                  onChange={setEditHoliday}
                  options={[
                    { value: '元旦', label: '元旦' },
                    { value: '春节', label: '春节' },
                    { value: '清明节', label: '清明节' },
                    { value: '劳动节', label: '劳动节' },
                    { value: '端午节', label: '端午节' },
                    { value: '中秋节', label: '中秋节' },
                    { value: '国庆节', label: '国庆节' },
                  ]}
                />
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
