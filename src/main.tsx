import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { configureGoban } from "@/lib/gobanConfig";
import "./styles/globals.css";

configureGoban();

const rootElement = document.getElementById("root");
if (!rootElement) {
    throw new Error("#root element not found");
}

createRoot(rootElement).render(
    <StrictMode>
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    </StrictMode>,
);
