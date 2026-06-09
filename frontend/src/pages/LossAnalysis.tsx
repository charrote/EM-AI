import { useEffect, useState } from 'react';
import { Table, Tag, Row, Col } from 'antd';
import { PieChartOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import PageCard from '../components/PageCard';
import api from '../services/api';
import { Colors } from '../styles/theme';

export default function LossAnalysis() {
  const [pareto, setPareto] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/pareto?scope=plant').then((res) => {
      setPareto(res.data.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const paretoChartOption = {
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: pareto.map((p) => p.cause),
      axisLabel: { rotate: 30, fontSize: 11 },
    },
    yAxis: [
      { type: 'value', name: '停机时长 (分钟)' },
      { type: 'value', name: '累计百分比 (%)', max: 100 },
    ],
    grid: { left: 60, right: 60, top: 30, bottom: 40 },
    series: [
      {
        type: 'bar',
        data: pareto.map((p) => p.duration),
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: (params: any) => {
            const cum = pareto[params.dataIndex]?.cumulative || 0;
            return cum <= 80 ? Colors.dangerLight : cum <= 90 ? Colors.warningLight : Colors.info;
          },
        },
      },
      {
        type: 'line',
        yAxisIndex: 1,
        data: pareto.map((p) => p.cumulative),
        lineStyle: { color: Colors.primary, width: 2 },
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: { color: Colors.primary },
      },
    ],
  };

  const columns = [
    { title: '原因', dataIndex: 'cause', key: 'cause' },
    {
      title: '发生次数', dataIndex: 'count', key: 'count',
      sorter: (a: any, b: any) => b.count - a.count,
    },
    {
      title: '停机时长 (min)', dataIndex: 'duration', key: 'duration',
      sorter: (a: any, b: any) => b.duration - a.duration,
      render: (v: number) => <strong>{v}</strong>,
    },
    {
      title: '占比', dataIndex: 'percentage', key: 'percentage',
      render: (v: number) => `${v}%`,
    },
    {
      title: '累计占比', dataIndex: 'cumulative', key: 'cumulative',
      render: (v: number) => (
        <Tag
          color={v <= 80 ? Colors.dangerLight : v <= 90 ? Colors.warningLight : Colors.info}
          style={{ borderRadius: 4, border: 'none' }}
        >
          {v.toFixed(1)}%
        </Tag>
      ),
    },
  ];

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <PageCard icon={<PieChartOutlined />} title="帕累托分析 — TOP 损失原因 (80/20 法则)">
            <ReactECharts option={paretoChartOption} style={{ height: 360 }} />
          </PageCard>
        </Col>
      </Row>

      <PageCard icon={<PieChartOutlined />} title="损失明细" style={{ marginTop: 16 }}>
        <Table
          dataSource={pareto}
          columns={columns}
          rowKey="cause"
          pagination={false}
          size="small"
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}><strong>TOP 3 占总量</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={1}>
                <strong>{pareto.slice(0, 3).reduce((s, p) => s + p.count, 0)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2}>
                <strong>{pareto.slice(0, 3).reduce((s, p) => s + p.duration, 0)} min</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3}>
                <strong>{pareto.slice(0, 3).reduce((s, p) => s + p.percentage, 0).toFixed(1)}%</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={4}>
                <Tag color={Colors.dangerLight} style={{ borderRadius: 4, border: 'none' }}>
                  {pareto[2]?.cumulative.toFixed(1) || 0}%
                </Tag>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
      </PageCard>
    </div>
  );
}
