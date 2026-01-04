import React, { Component, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: '40px',
                    fontFamily: 'system-ui, sans-serif',
                    maxWidth: '800px',
                    margin: '0 auto'
                }}>
                    <h1 style={{ color: '#dc2626', marginBottom: '16px' }}>
                        Something went wrong
                    </h1>
                    <div style={{
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '8px',
                        padding: '16px',
                        marginBottom: '16px'
                    }}>
                        <h2 style={{ color: '#991b1b', fontSize: '18px', marginBottom: '8px' }}>
                            Error Message:
                        </h2>
                        <pre style={{
                            color: '#7f1d1d',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            margin: 0
                        }}>
                            {this.state.error?.message || 'Unknown error'}
                        </pre>
                    </div>
                    {this.state.error?.stack && (
                        <details style={{ marginBottom: '16px' }}>
                            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                                Stack Trace
                            </summary>
                            <pre style={{
                                background: '#f8f9fa',
                                padding: '12px',
                                borderRadius: '4px',
                                overflow: 'auto',
                                fontSize: '12px'
                            }}>
                                {this.state.error.stack}
                            </pre>
                        </details>
                    )}
                    {this.state.errorInfo?.componentStack && (
                        <details>
                            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                                Component Stack
                            </summary>
                            <pre style={{
                                background: '#f8f9fa',
                                padding: '12px',
                                borderRadius: '4px',
                                overflow: 'auto',
                                fontSize: '12px'
                            }}>
                                {this.state.errorInfo.componentStack}
                            </pre>
                        </details>
                    )}
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            marginTop: '16px',
                            padding: '10px 20px',
                            background: '#2563eb',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
