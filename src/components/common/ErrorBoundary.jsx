import React from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

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
    window.location.reload();
  };

  handleResetApp = () => {
    try {
      localStorage.removeItem('i4u_notifications');
      localStorage.removeItem('i4u_conversations');
      sessionStorage.clear();
    } catch (e) {}
    this.setState({ hasError: false, error: null });
    window.location.href = window.location.pathname;
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0B192C] text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#152E52] border border-[#D4AF37]/50 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-amber-500/20 text-[#DFB76C] border border-[#D4AF37]/40 flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7 text-[#DFB76C]" />
            </div>

            <h2 className="text-xl font-serif font-bold text-white">
              Something went wrong
            </h2>

            <p className="text-xs text-slate-300 leading-relaxed">
              We encountered an unexpected display issue. Please reload the page to continue exploring verified matrimonial profiles.
            </p>

            {this.state.error?.message && (
              <p className="text-[10px] font-mono text-rose-300 bg-black/40 p-2.5 rounded-xl border border-white/10 text-left overflow-x-auto">
                {this.state.error.message}
              </p>
            )}

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <button
                onClick={this.handleReload}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] font-bold text-xs hover:opacity-95 transition-all shadow-md flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Website</span>
              </button>
              <button
                onClick={this.handleResetApp}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 border border-white/20 font-semibold text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
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
