import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Tag, Select, Space, DatePicker } from 'antd';
import { BarChartIcon, LineChartUpIcon, SpinnerIcon, ArrowUpIcon, ArrowDownIcon } from '../components/Icons';
import { useStore } from '../store/useStore';
import { Colors } from '../styles/theme';
import api from '../services/api';
import { useOrgTreeDataSource, useOEEDataSource, useLossDataSource } from '../services/dataSource';

const { RangePicker } = DatePicker;

// ── Inline KPI block ──
function KpiBlock({ title, value, suffix, color, prefix }: {
  title: string; value: number | string; suffix?: string; color: string; prefix?: React.ReactNode;
}) {
  return (
    <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #eee', padding: 16 }}>
      <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>{title}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        {prefix && <span style={{ fontSize: 16 }}>{prefix}</span>}
        <span style={{ color, fontSize: 28, fontWeight: 700, lineHeight: 1.2 }}>{value}</span>
        {suffix && <span style={{ color: '#999', fontSize: 14 }}>{suffix}</span>}
      </div>
    </div>
  );
}

export default function OEEDashboard() {
  const { selectedOrganizationId, setSelectedOrganizationId, setSelectedOrgName } = useStore();
  const navigate = useNavigate();

  // ── Unified data source hooks ──────────────────────────────
  const {
    data: orgTree,
    loading: orgLoading,
  } = useOrgTreeDataSource();

  const {
    data: oee,
    loading: oeeLoading,
  } = useOEEDataSource();

  const {
    data: losses,
    loading: lossLoading,
  } = useLossDataSource('plant');

  const loading = orgLoading || oeeLoading || lossLoading;

  // Flatten org tree for dropdown
  const flatOrgTree: any[] = [];
  const flattenOrg = (nodes: any[]) => {
    nodes.forEach((n: any) => {
      flatOrgTree.push({ id: n.id, name: n.name, level: n.level });
      if (n.children) flattenOrg(n.children);
    });
  };
  if (orgTree && orgTree.length > 0) flattenOrg(orgTree);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}><SpinnerIcon size={18} style={{ marginRight: 6 }} />加载中...</div>;
  if (!oee) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>暂无数据</div>;

  // ── Device OEE table columns ──
  const deviceColumns = [
    {
      title: '设备', dataIndex: 'name', key: 'name',
      render: (name: string, record: any) => (
        <a onClick={() => navigate(`/devices/${record.id}`)} style={{ color: '#1677ff', cursor: 'pointer' }}>{name}</a>
      ),
    },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (s: string) => {
        const colors: Record<string, string> = { running: '#22C55E', idle: '#999', fault: '#EF4444', maintenance: '#3B82F6', repair: '#F97316' };
        const labels: Record<string, string> = { running: '运行中', idle: '待机', fault: '故障', maintenance: '保养', repair: '检修' };
        return <Tag color={colors[s] || '#999'}>{labels[s] || s}</Tag>;
      },
    },
    {
      title: 'OEE', dataIndex: 'oee', key: 'oee',
      render: (v: number) => (
        <span style={{ color: v >= 85 ? '#22C55E' : v >= 75 ? '#F59E0B' : '#EF4444', fontWeight: 600 }}>{v}%</span>
      ),
      sorter: (a: any, b: any) => a.oee - b.oee,
    },
    { title: '可用率', dataIndex: 'availability', key: 'availability', render: (v: number) => `${v}%` },
    { title: '性能率', dataIndex: 'performance', key: 'performance', render: (v: number) => `${v}%` },
    { title: '质量率', dataIndex: 'quality', key: 'quality', render: (v: number) => `${v}%` },
  ];

  const handleOrgChange = (orgId: string | null) => {
    setSelectedOrganizationId(orgId);
    const org = orgTree.find(o => o.id === orgId);
    setSelectedOrgName(org?.name || '全厂');
  };

  return (
    <div style={{ padding: 4, fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      {/* 筛选栏 */}
      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #eee', padding: '12px 16px', marginBottom: 16 }}>
        <Space wrap size={12}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>筛选</span>
          <Select
            style={{ width: 200 }}
            size="small"
            placeholder="选择组织层级"
            allowClear
            value={selectedOrganizationId}
            onChange={handleOrgChange}
            options={orgTree.map((o: any) => ({
              value: o.id,
              label: `${'  '.repeat({ group: 0, company: 1, workshop: 2, line: 3 }[o.level] || 0)}${o.name}`,
            }))}
          />
        </Space>
      </div>

      {/* KPI 行 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
        <KpiBlock title="全厂 OEE" value={oee.overallOEE} suffix="%" color={oee.overallOEE >= 85 ? '#22C55E' : oee.overallOEE >= 75 ? '#F59E0B' : '#EF4444'} />
        <KpiBlock title="设备总数" value={oee.totalDevices} suffix="台" color="#333" />
        <KpiBlock title="待处理告警" value={oee.alertCount} color={oee.alertCount > 0 ? '#EF4444' : '#22C55E'} prefix={oee.alertCount > 0 ? <ArrowUpIcon size={16} color="#EF4444" /> : <ArrowDownIcon size={16} color="#22C55E" />} />
        <KpiBlock title="OEE 目标" value={85} suffix="%" color="#1677ff" />
      </div>

      {/* 图表行 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12, marginBottom: 16 }}>
        {/* 六大损失分布 */}
        <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #eee', padding: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#333', margin: '0 0 12px 0' }}><BarChartIcon size={16} color="#3B82F6" style={{ marginRight: 4 }} /> 六大损失分布</h3>
          {(losses || []).map((l: any) => {
            const lossColors = ['#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6', '#22C55E', '#EC4899'];
            const maxVal = Math.max(...(losses || []).map((x: any) => x.value), 1);
            const idx = (losses || []).indexOf(l);
            const pct = maxVal > 0 ? Math.round((l.value / maxVal) * 100) : 0;
            return (
              <div key={l.type} style={{ marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#666', marginBottom: 2 }}>
                  <span>{l.type}</span>
                  <span style={{ fontWeight: 600, color: lossColors[idx % lossColors.length] }}>{l.value}{l.unit}</span>
                </div>
                <div style={{ height: 10, background: '#f5f5f5', borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: lossColors[idx % lossColors.length], borderRadius: 5 }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* OEE 趋势 */}
        <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #eee', padding: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#333', margin: '0 0 12px 0' }}><LineChartUpIcon size={16} color="#22C55E" style={{ marginRight: 4 }} /> OEE 趋势</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(oee.trend || []).map((t: any) => {
              const pct = Math.min(100, Math.max(0, t.oee));
              const barColor = pct >= 85 ? '#22C55E' : pct >= 75 ? '#F59E0B' : '#EF4444';
              return (
                <div key={t.date} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 60, fontSize: 11, color: '#999', textAlign: 'right' }}>{t.date.slice(5)}</span>
                  <div style={{ flex: 1, height: 14, background: '#f5f5f5', borderRadius: 7, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 7 }} />
                  </div>
                  <span style={{ width: 36, fontSize: 12, fontWeight: 600, color: barColor, textAlign: 'right' }}>{t.oee}%</span>
                  <span style={{ width: 36, fontSize: 10, color: '#EF4444', textAlign: 'center' }}>目标85%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 设备 OEE 排行表 */}
      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #eee', padding: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: '#333', margin: '0 0 12px 0' }}><BarChartIcon size={16} color="#3B82F6" style={{ marginRight: 4 }} /> 设备 OEE 排行</h3>
        <Table
          dataSource={oee.deviceOEE || []}
          columns={deviceColumns}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </div>
    </div>
  );
}
