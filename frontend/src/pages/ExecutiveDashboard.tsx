import { useEffect, useState } from 'react';
import { Row, Col, Statistic, Table, Spin } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, RobotOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import PageCard from '../components/PageCard';
import api from '../services/api';
import { Colors } from '../styles/theme';

export default function ExecutiveDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/executive').then((res) => {
      setData(res.data.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!data) return <div style={{ textAlign: 'center', padding: 40, color: Colors.gray500 }}>暂无数据</div>;

  const healthChartOption = {
    tooltip: { trigger: 'item', formatter: '{b}: {c}台 ({d}%)' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      label: { formatter: '{b}\n{d}%' },
      data: data.healthDistribution.map((h: any) => ({ name: h.label, value: h.count })),
      color: ['#22C55E', '#3B82F6', '#F59E0B', '#EF4444'],
      itemStyle: { borderRadius: 4 },
    }],
  };

  const oeeChartOption = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: data.monthlyOEETrend.map((t: any) => t.month.slice(5)) },
    yAxis: { type: 'value', min: 65, max: 90 },
    grid: { left: 50, right: 20, top: 30, bottom: 20 },
    series: [{
      type: 'line',
      data: data.monthlyOEETrend.map((t: any) => t.oee),
      smooth: true,
      areaStyle: { opacity: 0.12, color: Colors.primaryLight },
      lineStyle: { color: Colors.primary, width: 2 },
      itemStyle: { color: Colors.primary },
      markLine: {
        data: [{ yAxis: 85, label: { formatter: '目标' } }],
        lineStyle: { color: Colors.dangerLight, type: 'dashed' },
      },
    }],
  };

  const costChartOption = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: data.maintenanceCost.map((c: any) => c.month.slice(5)) },
    yAxis: { type: 'value' },
    grid: { left: 60, right: 20, top: 30, bottom: 20 },
    series: [{
      type: 'bar',
      data: data.maintenanceCost.map((c: any) => c.cost),
      itemStyle: { color: Colors.warningLight, borderRadius: [4, 4, 0, 0] },
    }],
  };

  const roiColumns = [
    { title: '改善项目', dataIndex: 'project', key: 'project' },
    {
      title: '投入 (¥)', dataIndex: 'investment', key: 'investment',
      render: (v: number) => <span style={{ color: Colors.gray700 }}>¥{v.toLocaleString()}</span>,
    },
    {
      title: '年化节省 (¥)', dataIndex: 'saving', key: 'saving',
      render: (v: number) => <span style={{ color: Colors.gray700 }}>¥{v.toLocaleString()}</span>,
    },
    {
      title: 'ROI', dataIndex: 'roi', key: 'roi',
      render: (v: string) => <span style={{ color: Colors.successLight, fontWeight: 600 }}>{v}</span>,
    },
  ];

  const latestOEE = data.monthlyOEETrend[data.monthlyOEETrend.length - 1]?.oee;
  const prevOEE = data.monthlyOEETrend.length > 1
    ? data.monthlyOEETrend[data.monthlyOEETrend.length - 2]?.oee
    : latestOEE;
  const totalInvestment = data.improvementROI.reduce((s: number, p: any) => s + p.investment, 0);
  const totalSaving = data.improvementROI.reduce((s: number, p: any) => s + p.saving, 0);

  return (
    <div>
      {/* Top KPI Cards */}
      <Row gutter={[16, 16]}>
        <Col span={8}>
          <PageCard bodyStyle={{ padding: '20px 24px' }}>
            <Statistic
              title={<span style={{ fontSize: 13, color: Colors.gray500 }}>当前 OEE</span>}
              value={latestOEE}
              suffix="%"
              valueStyle={{ color: Colors.primary, fontSize: 32, fontWeight: 700 }}
              prefix={latestOEE > prevOEE ? <ArrowUpOutlined style={{ color: Colors.successLight }} /> : <ArrowDownOutlined style={{ color: Colors.dangerLight }} />}
            />
          </PageCard>
        </Col>
        <Col span={8}>
          <PageCard bodyStyle={{ padding: '20px 24px' }}>
            <Statistic
              title={<span style={{ fontSize: 13, color: Colors.gray500 }}>设备总数</span>}
              value={8}
              suffix="台"
              valueStyle={{ fontSize: 32, fontWeight: 700, color: Colors.gray800 }}
            />
          </PageCard>
        </Col>
        <Col span={8}>
          <PageCard bodyStyle={{ padding: '20px 24px' }}>
            <Statistic
              title={<span style={{ fontSize: 13, color: Colors.gray500 }}>本月维保成本</span>}
              value={data.maintenanceCost[data.maintenanceCost.length - 1]?.cost || 0}
              prefix="¥"
              suffix="元"
              valueStyle={{ fontSize: 32, fontWeight: 700, color: Colors.gray800 }}
            />
          </PageCard>
        </Col>
      </Row>

      {/* Charts Row */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={8}>
          <PageCard icon={<RobotOutlined />} title="设备健康度分布" bodyStyle={{ padding: 16 }}>
            <ReactECharts option={healthChartOption} style={{ height: 260 }} />
          </PageCard>
        </Col>
        <Col span={8}>
          <PageCard icon={<RobotOutlined />} title="OEE 月度趋势" bodyStyle={{ padding: 16 }}>
            <ReactECharts option={oeeChartOption} style={{ height: 260 }} />
          </PageCard>
        </Col>
        <Col span={8}>
          <PageCard icon={<RobotOutlined />} title="维保成本趋势" bodyStyle={{ padding: 16 }}>
            <ReactECharts option={costChartOption} style={{ height: 260 }} />
          </PageCard>
        </Col>
      </Row>

      {/* ROI Table */}
      <PageCard icon={<RobotOutlined />} title="改善活动 ROI 分析" style={{ marginTop: 16 }}>
        <Table dataSource={data.improvementROI} columns={roiColumns} rowKey="project" pagination={false} size="small" />
        <div style={{ marginTop: 12, textAlign: 'right', color: Colors.gray600, fontSize: 13 }}>
          总投入：<strong style={{ color: Colors.gray800 }}>¥{totalInvestment.toLocaleString()}</strong>
          &nbsp;·&nbsp;总年化节省：<strong style={{ color: Colors.successLight }}>¥{totalSaving.toLocaleString()}</strong>
        </div>
      </PageCard>
    </div>
  );
}
