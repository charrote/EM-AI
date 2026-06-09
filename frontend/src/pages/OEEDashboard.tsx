import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Statistic, Table, Tag, Spin } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, BarChartOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import PageCard from '../components/PageCard';
import api from '../services/api';
import { Colors } from '../styles/theme';
import { useResponsive } from '../hooks/useResponsive';
import { StatCol, ChartCol } from '../styles/responsive';

export default function OEEDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { isMobile, isTablet, width } = useResponsive();

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/oee'),
      api.get('/dashboard/losses'),
    ]).then(([oeeRes, lossRes]) => {
      setData({ oee: oeeRes.data.data, losses: lossRes.data.data });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!data) return <div style={{ textAlign: 'center', padding: 40, color: Colors.gray500 }}>暂无数据</div>;

  const { oee, losses } = data;

  const lossChartOption = {
    tooltip: { trigger: 'item', formatter: '{b}: {c}小时 ({d}%)' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      label: { formatter: '{b}\n{d}%', fontSize: isMobile ? 10 : 12 },
      data: losses.map((l: any) => ({ name: l.type, value: l.value })),
      color: ['#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6', '#22C55E', '#EC4899'],
      itemStyle: { borderRadius: 4 },
    }],
  };

  const trendChartOption = {
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: (oee.trend || []).map((t: any) => t.date.slice(5)),
      axisLabel: { fontSize: isMobile ? 10 : 12 },
    },
    yAxis: { type: 'value', min: 60, max: 100 },
    grid: { left: 40, right: 15, top: 30, bottom: 20 },
    series: [{
      data: (oee.trend || []).map((t: any) => t.oee),
      type: 'line',
      smooth: true,
      areaStyle: { opacity: 0.12, color: Colors.primaryLight },
      lineStyle: { color: Colors.primary, width: 2 },
      itemStyle: { color: Colors.primary },
      markLine: {
        data: [{ yAxis: 85, label: { formatter: '目标 85%', fontSize: 11 } }],
        lineStyle: { color: Colors.dangerLight, type: 'dashed' },
      },
    }],
  };

  const deviceColumns = [
    {
      title: '设备', dataIndex: 'name', key: 'name',
      render: (name: string, record: any) => (
        <a onClick={() => navigate(`/devices/${record.id}`)} style={{ color: Colors.primary, fontSize: isMobile ? 12 : 14 }}>{name}</a>
      ),
    },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (s: string) => {
        const colors: Record<string, string> = { running: Colors.successLight, idle: Colors.gray400, fault: Colors.dangerLight, maintenance: Colors.info, repair: '#F97316' };
        return <Tag color={colors[s] || Colors.gray400} style={{ borderRadius: 4, border: 'none', fontSize: isMobile ? 11 : 12 }}>{isMobile ? ({ running: '运行', idle: '待机', fault: '故障', maintenance: '保养', repair: '检修' })[s] || s : s}</Tag>;
      },
    },
    {
      title: 'OEE', dataIndex: 'oee', key: 'oee',
      render: (v: number) => (
        <span style={{
          color: v >= 85 ? Colors.successLight : v >= 75 ? Colors.warningLight : Colors.dangerLight,
          fontWeight: 600, fontSize: isMobile ? 12 : 14,
        }}>{v}%</span>
      ),
      sorter: (a: any, b: any) => a.oee - b.oee,
    },
    ...(isMobile ? [] : [
      { title: '可用率', dataIndex: 'availability', key: 'availability', render: (v: number) => `${v}%` },
      { title: '性能率', dataIndex: 'performance', key: 'performance', render: (v: number) => `${v}%` },
      { title: '质量率', dataIndex: 'quality', key: 'quality', render: (v: number) => `${v}%` },
    ]),
  ];

  const chartHeight = isMobile ? 220 : isTablet ? 250 : 280;

  return (
    <div>
      {/* Top KPI Cards — 响应式列 */}
      <Row gutter={[isMobile ? 8 : 16, isMobile ? 8 : 16]}>
        <StatCol span={6}>
          <PageCard bodyStyle={{ padding: isMobile ? '14px 16px' : '20px 24px' }}>
            <Statistic
              title={<span style={{ fontSize: isMobile ? 12 : 13, color: Colors.gray500 }}>全厂 OEE</span>}
              value={oee.overallOEE}
              suffix="%"
              valueStyle={{
                color: oee.overallOEE >= 85 ? Colors.successLight : oee.overallOEE >= 75 ? Colors.warningLight : Colors.dangerLight,
                fontSize: isMobile ? 24 : 32, fontWeight: 700,
              }}
            />
          </PageCard>
        </StatCol>
        <StatCol span={6}>
          <PageCard bodyStyle={{ padding: isMobile ? '14px 16px' : '20px 24px' }}>
            <Statistic
              title={<span style={{ fontSize: isMobile ? 12 : 13, color: Colors.gray500 }}>设备总数</span>}
              value={oee.totalDevices}
              suffix="台"
              valueStyle={{ fontSize: isMobile ? 24 : 32, fontWeight: 700, color: Colors.gray800 }}
            />
          </PageCard>
        </StatCol>
        <StatCol span={6}>
          <PageCard bodyStyle={{ padding: isMobile ? '14px 16px' : '20px 24px' }}>
            <Statistic
              title={<span style={{ fontSize: isMobile ? 12 : 13, color: Colors.gray500 }}>待处理告警</span>}
              value={oee.alertCount}
              valueStyle={{ color: oee.alertCount > 0 ? Colors.dangerLight : Colors.successLight, fontSize: isMobile ? 24 : 32, fontWeight: 700 }}
              prefix={oee.alertCount > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
            />
          </PageCard>
        </StatCol>
        <StatCol span={6}>
          <PageCard bodyStyle={{ padding: isMobile ? '14px 16px' : '20px 24px' }}>
            <Statistic
              title={<span style={{ fontSize: isMobile ? 12 : 13, color: Colors.gray500 }}>OEE 目标</span>}
              value={85}
              suffix="%"
              valueStyle={{ color: Colors.primary, fontSize: isMobile ? 24 : 32, fontWeight: 700 }}
            />
          </PageCard>
        </StatCol>
      </Row>

      {/* Charts — 桌面2列，移动端1列 */}
      <Row gutter={[isMobile ? 8 : 16, isMobile ? 8 : 16]} style={{ marginTop: isMobile ? 8 : 16 }}>
        <ChartCol>
          <PageCard icon={<BarChartOutlined />} title="六大损失分布" bodyStyle={{ padding: isMobile ? 12 : 16 }}>
            <ReactECharts option={lossChartOption} style={{ height: chartHeight }} />
          </PageCard>
        </ChartCol>
        <ChartCol>
          <PageCard icon={<BarChartOutlined />} title="OEE 趋势" bodyStyle={{ padding: isMobile ? 12 : 16 }}>
            <ReactECharts option={trendChartOption} style={{ height: chartHeight }} />
          </PageCard>
        </ChartCol>
      </Row>

      {/* Device OEE Table */}
      <PageCard icon={<BarChartOutlined />} title="设备 OEE 排行" style={{ marginTop: isMobile ? 8 : 16 }}>
        <div className={isMobile ? 'responsive-table' : ''}>
          <Table
            dataSource={oee.deviceOEE || []}
            columns={deviceColumns}
            rowKey="id"
            pagination={isMobile ? { pageSize: 5, size: 'small' } : false}
            size={isMobile ? 'small' : 'small'}
          />
        </div>
      </PageCard>
    </div>
  );
}
