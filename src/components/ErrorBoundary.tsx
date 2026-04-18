import { Component, type ReactNode } from 'react';

/**
 * Simple React error boundary.
 *
 * Renders a fallback UI with the error message + stack instead of unmounting
 * the entire tree silently (the default behaviour — which is what used to
 * leave the admin panel showing only the dark background when a child page
 * crashed). Wrap per-route or per-page so a broken /quests doesn't break the
 * sidebar.
 */
interface State {
  error: Error | null;
  info: { componentStack?: string | null } | null;
}

interface Props {
  children: ReactNode;
  /** Optional label to help identify which boundary caught the crash. */
  label?: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): State {
    return { error, info: null };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    // Log verbosely so the crash is visible in the DevTools console even
    // when the in-page fallback is shown.
    // eslint-disable-next-line no-console
    console.error(`[ErrorBoundary${this.props.label ? ` ${this.props.label}` : ''}]`, error, info);
    this.setState({ info });
  }

  reset = () => this.setState({ error: null, info: null });

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="max-w-3xl mx-auto my-10 p-6 bg-red-950/20 border border-red-500/40 rounded-2xl text-red-200 space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">💥</span>
          <h2 className="text-lg font-bold">Страница упала</h2>
        </div>
        <p className="text-sm text-red-300/90">
          Случилась JS-ошибка при рендере. Скопируйте текст ниже и пришлите в чат — я починю.
        </p>
        <div className="space-y-2 text-xs font-mono">
          <div className="bg-black/40 rounded-lg p-3 border border-red-500/30 whitespace-pre-wrap break-words">
            {error.name}: {error.message}
          </div>
          {error.stack && (
            <details className="bg-black/40 rounded-lg p-3 border border-red-500/30">
              <summary className="cursor-pointer text-red-300">stack trace</summary>
              <pre className="mt-2 whitespace-pre-wrap break-words text-[11px]">{error.stack}</pre>
            </details>
          )}
          {info?.componentStack && (
            <details className="bg-black/40 rounded-lg p-3 border border-red-500/30">
              <summary className="cursor-pointer text-red-300">component stack</summary>
              <pre className="mt-2 whitespace-pre-wrap break-words text-[11px]">{info.componentStack}</pre>
            </details>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={this.reset}
            className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 text-xs font-semibold"
          >
            Попробовать снова
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold"
          >
            Перезагрузить страницу
          </button>
        </div>
      </div>
    );
  }
}
