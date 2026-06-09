import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Statistic, Table, Tag, Spin, Progress } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import api from '../services/api';

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
  if (!data) return <div>暂无数据</div>;

  const { oee, losses } = data;

  const lossChartOption = {
    tooltip: { trigger: 'item', formatter: '{b}: {c}小时 ({d}%)' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      label: { formatter: '{b}\n{d}%' },
      data: losses.map((l: any) => ({ name: l.type, value: l.value })),
      color: ['#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6', '#22C55E', '#EC4899'],
    }],
  };

  const trendChartOption = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: (oee.trend || []).map((t: any) => t.date.slice(5)) },
    yAxis: { type: 'value', min: 60, max: 100 },
    series: [{
      data: (oee.trend || []).map((t: any) => t.oee),
      type: 'line',
      smooth: true,
      areaStyle: { opacity: 0.15 },
      lineStyle: { color: '#2563EB', width: 3 },
      markLine: { data: [{ yAxis: 85, label: { formatter: '目标: 85%' } }] },
    }],
  };

  const deviceColumns = [
    { title: '设备', dataIndex: 'name', key: 'name',
      render: (name: string, record: any) => <a onClick={() => navigate(`/devices/${record.id}`)}>{name}</a> },
    { title: '状态', dataIndex: 'status', key: 'status',
      render: (s: string) => {
        const colors: Record<string, string> = { running: 'green', idle: 'default', fault: 'red', maintenance: 'blue', repair: 'orange' };
        return <Tag color={colors[s] || 'default'}>{s}</Tag>;
      },
    },
    { title: 'OEE', dataIndex: 'oee', key: 'oee',
      render: (v: number) => <span style={{ color: v >= 85 ? '#22C55E' : v >= 75 ? '#F59E0B' : '#EF4444', fontWeight: 600 }}>{v}%</span>,
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
          <Card>
            <Statistic
              title="全厂 OEE"
              value={oee.overallOEE}
              suffix="%"
              valueStyle={{ color: oee.overallOEE >= 85 ? '#22C55E' : oee.overallOEE >= 75 ? '#F59E0B' : '#EF4444', fontSize: 36 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="设备总数" value={oee.totalDevices} suffix="台" />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待处理告警"
              value={oee.alertCount}
              valueStyle={{ color: oee.alertCount > 0 ? '#EF4444' : '#22C55E' }}
              prefix={oee.alertCount > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="OEE 目标" value={85} suffix="%" valueStyle={{ color: '#2563EB' }} />
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card title="六大损失分布">
            <ReactECharts option={lossChartOption} style={{ height: 280 }} />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="OEE 趋势">
            <ReactECharts option={trendChartOption} style={{ height: 280 }} />
          </Card>
        </Col>
      </Row>

      {/* Device OEE Table */}
      <Card title="设备 OEE 排行" style={{ marginTop: 16 }}>
        <Table
          dataSource={oee.deviceOEE || []}
          columns={deviceColumns}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  );
}
