import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Table, Spin } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import api from '../services/api';

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
  if (!data) return <div>暂无数据</div>;

  const healthChartOption = {
    tooltip: { trigger: 'item', formatter: '{b}: {c}台 ({d}%)' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      label: { formatter: '{b}\n{d}%' },
      data: data.healthDistribution.map((h: any) => ({ name: h.label, value: h.count })),
      color: ['#22C55E', '#3B82F6', '#F59E0B', '#EF4444'],
    }],
  };

  const oeeChartOption = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: data.monthlyOEETrend.map((t: any) => t.month.slice(5)) },
    yAxis: { type: 'value', min: 65, max: 90 },
    series: [{
      type: 'line',
      data: data.monthlyOEETrend.map((t: any) => t.oee),
      smooth: true,
      areaStyle: { opacity: 0.15 },
      lineStyle: { color: '#2563EB', width: 3 },
      markLine: { data: [{ yAxis: 85, label: { formatter: '目标' } }] },
    }],
  };

  const costChartOption = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: data.maintenanceCost.map((c: any) => c.month.slice(5)) },
    yAxis: { type: 'value' },
    series: [{
      type: 'bar',
      data: data.maintenanceCost.map((c: any) => c.cost),
      itemStyle: { color: '#F59E0B' },
    }],
  };

  const roiColumns = [
    { title: '改善项目', dataIndex: 'project', key: 'project' },
    { title: '投入 (¥)', dataIndex: 'investment', key: 'investment', render: (v: number) => `¥${v.toLocaleString()}` },
    { title: '年化节省 (¥)', dataIndex: 'saving', key: 'saving', render: (v: number) => `¥${v.toLocaleString()}` },
    { title: 'ROI', dataIndex: 'roi', key: 'roi', render: (v: string) => <span style={{ color: '#22C55E', fontWeight: 600 }}>{v}</span> },
  ];

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Card>
            <Statistic title="当前 OEE" value={data.monthlyOEETrend[data.monthlyOEETrend.length - 1]?.oee} suffix="%"
              valueStyle={{ color: '#2563EB', fontSize: 36 }}
              prefix={data.monthlyOEETrend.length > 1 && data.monthlyOEETrend[data.monthlyOEETrend.length - 1]?.oee > data.monthlyOEETrend[data.monthlyOEETrend.length - 2]?.oee ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="设备总数" value={8} suffix="台" valueStyle={{ fontSize: 36 }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="本月维保成本" value={data.maintenanceCost[data.maintenanceCost.length - 1]?.cost || 0}
              prefix="¥" suffix="元" valueStyle={{ fontSize: 36 }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={8}>
          <Card title="设备健康度分布">
            <ReactECharts option={healthChartOption} style={{ height: 260 }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="OEE 月度趋势">
            <ReactECharts option={oeeChartOption} style={{ height: 260 }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="维保成本趋势">
            <ReactECharts option={costChartOption} style={{ height: 260 }} />
          </Card>
        </Col>
      </Row>

      <Card title="改善活动 ROI 分析" style={{ marginTop: 16 }}>
        <Table dataSource={data.improvementROI} columns={roiColumns} rowKey="project" pagination={false} />
        <div style={{ marginTop: 12, textAlign: 'right', color: '#22C55E', fontWeight: 600 }}>
          总投入: ¥{(data.improvementROI as any[]).reduce((s: number, p: any) => s + p.investment, 0).toLocaleString()} · 总年化节省: ¥{(data.improvementROI as any[]).reduce((s: number, p: any) => s + p.saving, 0).toLocaleString()}
        </div>
      </Card>
    </div>
  );
}
