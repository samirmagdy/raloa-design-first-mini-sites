import React from 'react';

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

interface AppErrorBoundaryState {
  error: Error | null;
}

export class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('RALOA application error', error, info.componentStack);
    }
  }

  handleReset = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-16 text-ink">
        <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-indigo-600">RALOA</p>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight">Something went wrong</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            The page could not finish rendering. Your saved local work was not changed.
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            Reload RALOA
          </button>
        </section>
      </main>
    );
  }
}

