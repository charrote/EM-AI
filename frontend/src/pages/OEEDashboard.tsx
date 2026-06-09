import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Statistic, Table, Tag, Spin } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, BarChartOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import PageCard from '../components/PageCard';
import api from '../services/api';
import { Colors } from '../styles/theme';

export default function OEEDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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
      label: { formatter: '{b}\n{d}%' },
      data: losses.map((l: any) => ({ name: l.type, value: l.value })),
      color: ['#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6', '#22C55E', '#EC4899'],
      itemStyle: { borderRadius: 4 },
    }],
  };

  const trendChartOption = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: (oee.trend || []).map((t: any) => t.date.slice(5)) },
    yAxis: { type: 'value', min: 60, max: 100 },
    grid: { left: 50, right: 20, top: 30, bottom: 20 },
    series: [{
      data: (oee.trend || []).map((t: any) => t.oee),
      type: 'line',
      smooth: true,
      areaStyle: { opacity: 0.12, color: Colors.primaryLight },
      lineStyle: { color: Colors.primary, width: 2 },
      itemStyle: { color: Colors.primary },
      markLine: {
        data: [{ yAxis: 85, label: { formatter: '目标 85%' } }],
        lineStyle: { color: Colors.dangerLight, type: 'dashed' },
      },
    }],
  };

  const deviceColumns = [
    {
      title: '设备', dataIndex: 'name', key: 'name',
      render: (name: string, record: any) => (
        <a onClick={() => navigate(`/devices/${record.id}`)} style={{ color: Colors.primary }}>{name}</a>
      ),
    },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (s: string) => {
        const colors: Record<string, string> = { running: Colors.successLight, idle: Colors.gray400, fault: Colors.dangerLight, maintenance: Colors.info, repair: '#F97316' };
        return <Tag color={colors[s] || Colors.gray400} style={{ borderRadius: 4, border: 'none' }}>{s}</Tag>;
      },
    },
    {
      title: 'OEE', dataIndex: 'oee', key: 'oee',
      render: (v: number) => (
        <span style={{
          color: v >= 85 ? Colors.successLight : v >= 75 ? Colors.warningLight : Colors.dangerLight,
          fontWeight: 600,
        }}>{v}%</span>
      ),
      sorter: (a: any, b: any) => a.oee - b.oee,
    },
    { title: '可用率', dataIndex: 'availability', key: 'availability', render: (v: number) => `${v}%` },
    { title: '性能率', dataIndex: 'performance', key: 'performance', render: (v: number) => `${v}%` },
    { title: '质量率', dataIndex: 'quality', key: 'quality', render: (v: number) => `${v}%` },
  ];

  return (
    <div>
      {/* Top KPI Cards */}
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <PageCard bodyStyle={{ padding: '20px 24px' }}>
            <Statistic
              title={<span style={{ fontSize: 13, color: Colors.gray500 }}>全厂 OEE</span>}
              value={oee.overallOEE}
              suffix="%"
              valueStyle={{
                color: oee.overallOEE >= 85 ? Colors.successLight : oee.overallOEE >= 75 ? Colors.warningLight : Colors.dangerLight,
                fontSize: 32, fontWeight: 700,
              }}
            />
          </PageCard>
        </Col>
        <Col span={6}>
          <PageCard bodyStyle={{ padding: '20px 24px' }}>
            <Statistic
              title={<span style={{ fontSize: 13, color: Colors.gray500 }}>设备总数</span>}
              value={oee.totalDevices}
              suffix="台"
              valueStyle={{ fontSize: 32, fontWeight: 700, color: Colors.gray800 }}
            />
          </PageCard>
        </Col>
        <Col span={6}>
          <PageCard bodyStyle={{ padding: '20px 24px' }}>
            <Statistic
              title={<span style={{ fontSize: 13, color: Colors.gray500 }}>待处理告警</span>}
              value={oee.alertCount}
              valueStyle={{ color: oee.alertCount > 0 ? Colors.dangerLight : Colors.successLight, fontSize: 32, fontWeight: 700 }}
              prefix={oee.alertCount > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
            />
          </PageCard>
        </Col>
        <Col span={6}>
          <PageCard bodyStyle={{ padding: '20px 24px' }}>
            <Statistic
              title={<span style={{ fontSize: 13, color: Colors.gray500 }}>OEE 目标</span>}
              value={85}
              suffix="%"
              valueStyle={{ color: Colors.primary, fontSize: 32, fontWeight: 700 }}
            />
          </PageCard>
        </Col>
      </Row>

      {/* Charts */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={12}>
          <PageCard icon={<BarChartOutlined />} title="六大损失分布" bodyStyle={{ padding: 16 }}>
            <ReactECharts option={lossChartOption} style={{ height: 280 }} />
          </PageCard>
        </Col>
        <Col span={12}>
          <PageCard icon={<BarChartOutlined />} title="OEE 趋势" bodyStyle={{ padding: 16 }}>
            <ReactECharts option={trendChartOption} style={{ height: 280 }} />
          </PageCard>
        </Col>
      </Row>

      {/* Device OEE Table */}
      <PageCard icon={<BarChartOutlined />} title="设备 OEE 排行" style={{ marginTop: 16 }}>
        <Table
          dataSource={oee.deviceOEE || []}
          columns={deviceColumns}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </PageCard>
    </div>
  );
}
