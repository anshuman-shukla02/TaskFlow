import React from "react";

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-6 text-center">
                    <div className="bg-white p-8 rounded-2xl shadow-xl max-w-2xl w-full border border-red-100">
                        <h1 className="text-3xl font-bold text-red-600 mb-4">Something went wrong.</h1>
                        <p className="text-slate-600 mb-6">The application encountered a runtime error.</p>

                        <div className="bg-slate-900 text-red-300 p-4 rounded-lg text-left overflow-auto font-mono text-sm mb-6 max-h-64">
                            <p className="font-bold border-b border-white/10 pb-2 mb-2">{this.state.error && this.state.error.toString()}</p>
                            <pre className="whitespace-pre-wrap">{this.state.errorInfo && this.state.errorInfo.componentStack}</pre>
                        </div>

                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => window.location.reload()}
                                className="px-6 py-2 bg-slate-900 text-white rounded-full hover:bg-slate-800 transition"
                            >
                                Reload Page
                            </button>
                            <button
                                onClick={() => window.history.back()}
                                className="px-6 py-2 border border-slate-300 text-slate-700 rounded-full hover:bg-slate-50 transition"
                            >
                                Go Back
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
