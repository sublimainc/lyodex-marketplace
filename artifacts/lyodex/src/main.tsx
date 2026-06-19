import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initErrorReporter } from "./lib/errorReporter";
import { ErrorBoundary } from "./components/ErrorBoundary";

initErrorReporter();

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
