import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
    children: ReactNode;
    /** 自定义兜底文案（可选） */
    title?: string;
    hint?: string;
}

interface ErrorBoundaryState {
    hasError: boolean;
    message: string;
}

/**
 * 顶层错误边界。
 *
 * 作用：goban 引擎在非法着法（例如自杀手 "Self-capture is not allowed"）等异常路径上
 * 可能抛出未被捕获的错误。React 19 下未捕获的渲染/副作用异常会导致整棵树被卸载，
 * 表现就是「围棋界面直接跳出 / 白屏」。这里兜住异常并提供一个可恢复的界面。
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = { hasError: false, message: "" };

    static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
        return {
            hasError: true,
            message: error instanceof Error ? error.message : String(error),
        };
    }

    componentDidCatch(error: Error, info: ErrorInfo): void {
        // 保留现场，便于排查
        console.error("[ErrorBoundary]", error, info.componentStack);
    }

    private handleRetry = (): void => {
        this.setState({ hasError: false, message: "" });
    };

    private handleHome = (): void => {
        try {
            if (typeof location !== "undefined") {
                location.hash = "";
            }
        } catch {
            /* ignore */
        }
        this.setState({ hasError: false, message: "" });
    };

    render(): ReactNode {
        if (!this.state.hasError) {
            return this.props.children;
        }

        return (
            <div className="app">
                <div className="level-screen">
                    <h2 className="error-boundary-title">{this.props.title ?? "出了点小状况"}</h2>
                    <p className="instruction">
                        {this.props.hint ??
                            "棋盘遇到了一次异常，已为你安全停下。点「重试」重新加载当前页面即可继续。"}
                    </p>
                    <div className="actions">
                        <button className="ghost-btn" onClick={this.handleRetry}>
                            ↻ 重试
                        </button>
                        <button className="ghost-btn" onClick={this.handleHome}>
                            ⌂ 回到首页
                        </button>
                    </div>
                </div>
            </div>
        );
    }
}
