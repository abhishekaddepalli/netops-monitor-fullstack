import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', background: '#450a0a', color: '#fecaca', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h1 style={{ color: '#f87171', fontSize: '24px', marginBottom: '10px' }}>Something went wrong.</h1>
          <p style={{ marginBottom: '20px' }}>The application crashed due to an unhandled exception.</p>
          
          <h2 style={{ fontSize: '18px', color: '#fca5a5' }}>Error:</h2>
          <pre style={{ background: '#270808', padding: '10px', borderRadius: '4px', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
            {this.state.error && this.state.error.toString()}
          </pre>

          <h2 style={{ fontSize: '18px', color: '#fca5a5', marginTop: '20px' }}>Component Stack:</h2>
          <pre style={{ background: '#270808', padding: '10px', borderRadius: '4px', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </pre>
          
          <button 
            onClick={() => window.location.reload()}
            style={{ marginTop: '20px', padding: '8px 16px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
