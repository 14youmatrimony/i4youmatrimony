import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    try {
      if ('caches' in window) {
        caches.keys().then(names => Promise.all(names.map(name => caches.delete(name))));
      }
    } catch (e) {}
    window.location.href = `${window.location.origin}${window.location.pathname}?reload=${Date.now()}`;
  };

  handleResetApp = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      if ('caches' in window) {
        caches.keys().then(names => Promise.all(names.map(name => caches.delete(name))));
      }
    } catch (e) {}
    this.setState({ hasError: false, error: null });
    window.location.href = `${window.location.origin}${window.location.pathname}?reset=${Date.now()}`;
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FFF7FA] text-[#5A4463] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white border border-[#E8C6D1] rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-xl">
            <div className="w-14 h-14 rounded-full bg-[#C76B85]/10 text-[#C76B85] border border-[#E8C6D1] flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7 text-[#C76B85]" />
            </div>

            <h2 className="text-xl font-serif font-bold text-[#2E1A36]">
              Something went wrong
            </h2>

            <p className="text-xs text-[#5A4463] leading-relaxed">
              We encountered an unexpected display issue. Please reload the page to continue exploring verified matrimonial profiles.
            </p>

            {this.state.error?.message && (
              <p className="text-[10px] font-mono text-rose-800 bg-rose-50 p-2.5 rounded-xl border border-rose-200 text-left overflow-x-auto">
                {this.state.error.message}
              </p>
            )}

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <button
                onClick={this.handleReload}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#C76B85] hover:bg-[#B35872] text-white font-bold text-xs hover:opacity-95 transition-all shadow-md shadow-[#C76B85]/20 flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Website</span>
              </button>
              <button
                onClick={this.handleResetApp}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white hover:bg-[#FFF7FA] text-[#C76B85] border border-[#C76B85] font-semibold text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <span>Reset Cache & Reopen</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
