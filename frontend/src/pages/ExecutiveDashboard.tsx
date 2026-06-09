import { useEffect, useState } from 'react';
import { Row, Col, Statistic, Table, Spin } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, RobotOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import PageCard from '../components/PageCard';
import api from '../services/api';
import { Colors } from '../styles/theme';
import { useResponsive } from '../hooks/useResponsive';
import { StatCol, TripleCol } from '../styles/responsive';

export default function ExecutiveDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { isMobile, isTablet } = useResponsive();

  useEffect(() => {
    api.get('/dashboard/executive').then((res) => {
      setData(res.data.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!data) return <div style={{ textAlign: 'center', padding: 40, color: Colors.gray500 }}>暂无数据</div>;

  const chartHeight = isMobile ? 220 : isTablet ? 240 : 260;

  const healthChartOption = {
    tooltip: { trigger: 'item', formatter: '{b}: {c}台 ({d}%)' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      label: { formatter: '{b}\n{d}%', fontSize: isMobile ? 10 : 12 },
      data: data.healthDistribution.map((h: any) => ({ name: h.label, value: h.count })),
      color: ['#22C55E', '#3B82F6', '#F59E0B', '#EF4444'],
      itemStyle: { borderRadius: 4 },
    }],
  };

  const oeeChartOption = {
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: data.monthlyOEETrend.map((t: any) => t.month.slice(5)),
      axisLabel: { fontSize: isMobile ? 10 : 12 },
    },
    yAxis: { type: 'value', min: 65, max: 90 },
    grid: { left: 40, right: 15, top: 30, bottom: 20 },
    series: [{
      type: 'line',
      data: data.monthlyOEETrend.map((t: any) => t.oee),
      smooth: true,
      areaStyle: { opacity: 0.12, color: Colors.primaryLight },
      lineStyle: { color: Colors.primary, width: 2 },
      itemStyle: { color: Colors.primary },
      markLine: {
        data: [{ yAxis: 85, label: { formatter: '目标', fontSize: 11 } }],
        lineStyle: { color: Colors.dangerLight, type: 'dashed' },
      },
    }],
  };

  const costChartOption = {
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: data.maintenanceCost.map((c: any) => c.month.slice(5)),
      axisLabel: { fontSize: isMobile ? 10 : 12 },
    },
    yAxis: { type: 'value' },
    grid: { left: 50, right: 15, top: 30, bottom: 20 },
    series: [{
      type: 'bar',
      data: data.maintenanceCost.map((c: any) => c.cost),
      itemStyle: { color: Colors.warningLight, borderRadius: [4, 4, 0, 0] },
    }],
  };

  const roiColumns = [
    { title: '改善项目', dataIndex: 'project', key: 'project' },
    {
      title: isMobile ? '投入' : '投入 (¥)', dataIndex: 'investment', key: 'investment',
      render: (v: number) => <span style={{ fontSize: isMobile ? 12 : 14 }}>¥{v.toLocaleString()}</span>,
    },
    {
      title: isMobile ? '年节省' : '年化节省 (¥)', dataIndex: 'saving', key: 'saving',
      render: (v: number) => <span style={{ fontSize: isMobile ? 12 : 14 }}>¥{v.toLocaleString()}</span>,
    },
    {
      title: 'ROI', dataIndex: 'roi', key: 'roi',
      render: (v: string) => <span style={{ color: Colors.successLight, fontWeight: 600, fontSize: isMobile ? 12 : 14 }}>{v}</span>,
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
      {/* Top KPI Cards — 响应式：桌面3列，平板2列，移动1列 */}
      <Row gutter={[isMobile ? 8 : 16, isMobile ? 8 : 16]}>
        <StatCol>
          <PageCard bodyStyle={{ padding: isMobile ? '14px 16px' : '20px 24px' }}>
            <Statistic
              title={<span style={{ fontSize: isMobile ? 12 : 13, color: Colors.gray500 }}>当前 OEE</span>}
              value={latestOEE}
              suffix="%"
              valueStyle={{ color: Colors.primary, fontSize: isMobile ? 24 : 32, fontWeight: 700 }}
              prefix={latestOEE > prevOEE ? <ArrowUpOutlined style={{ color: Colors.successLight }} /> : <ArrowDownOutlined style={{ color: Colors.dangerLight }} />}
            />
          </PageCard>
        </StatCol>
        <StatCol>
          <PageCard bodyStyle={{ padding: isMobile ? '14px 16px' : '20px 24px' }}>
            <Statistic
              title={<span style={{ fontSize: isMobile ? 12 : 13, color: Colors.gray500 }}>设备总数</span>}
              value={8}
              suffix="台"
              valueStyle={{ fontSize: isMobile ? 24 : 32, fontWeight: 700, color: Colors.gray800 }}
            />
          </PageCard>
        </StatCol>
        <StatCol>
          <PageCard bodyStyle={{ padding: isMobile ? '14px 16px' : '20px 24px' }}>
            <Statistic
              title={<span style={{ fontSize: isMobile ? 12 : 13, color: Colors.gray500 }}>本月维保成本</span>}
              value={data.maintenanceCost[data.maintenanceCost.length - 1]?.cost || 0}
              prefix="¥"
              suffix="元"
              valueStyle={{ fontSize: isMobile ? 24 : 32, fontWeight: 700, color: Colors.gray800 }}
            />
          </PageCard>
        </StatCol>
      </Row>

      {/* Charts Row — 桌面3列，移动端1列 */}
      <Row gutter={[isMobile ? 8 : 16, isMobile ? 8 : 16]} style={{ marginTop: isMobile ? 8 : 16 }}>
        <TripleCol>
          <PageCard icon={<RobotOutlined />} title="设备健康度分布" bodyStyle={{ padding: isMobile ? 12 : 16 }}>
            <ReactECharts option={healthChartOption} style={{ height: chartHeight }} />
          </PageCard>
        </TripleCol>
        <TripleCol>
          <PageCard icon={<RobotOutlined />} title="OEE 月度趋势" bodyStyle={{ padding: isMobile ? 12 : 16 }}>
            <ReactECharts option={oeeChartOption} style={{ height: chartHeight }} />
          </PageCard>
        </TripleCol>
        <TripleCol>
          <PageCard icon={<RobotOutlined />} title="维保成本趋势" bodyStyle={{ padding: isMobile ? 12 : 16 }}>
            <ReactECharts option={costChartOption} style={{ height: chartHeight }} />
          </PageCard>
        </TripleCol>
      </Row>

      {/* ROI Table */}
      <PageCard icon={<RobotOutlined />} title="改善活动 ROI 分析" style={{ marginTop: isMobile ? 8 : 16 }}>
        <div className={isMobile ? 'responsive-table' : ''}>
          <Table dataSource={data.improvementROI} columns={roiColumns} rowKey="project" pagination={isMobile ? { pageSize: 5, size: 'small' } : false} size={isMobile ? 'small' : 'small'} />
        </div>
        <div style={{
          marginTop: isMobile ? 8 : 12,
          textAlign: isMobile ? 'left' : 'right',
          color: Colors.gray600,
          fontSize: isMobile ? 12 : 13,
        }}>
          总投入：<strong style={{ color: Colors.gray800 }}>¥{totalInvestment.toLocaleString()}</strong>
          &nbsp;·&nbsp;总年化节省：<strong style={{ color: Colors.successLight }}>¥{totalSaving.toLocaleString()}</strong>
        </div>
      </PageCard>
    </div>
  );
}
