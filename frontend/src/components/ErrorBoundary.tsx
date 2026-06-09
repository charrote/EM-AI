import { Component, type ReactNode } from 'react';
import { Alert, Button } from 'antd';

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24 }}>
          <Alert
            type="error"
            showIcon
            message="页面渲染错误"
            description={this.state.error.message}
            action={
              <Button size="small" onClick={() => this.setState({ error: null })}>
                重试
              </Button>
            }
          />
        </div>
      );
    }
    return this.props.children;
  }
}
