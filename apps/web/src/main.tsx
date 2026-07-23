import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app.js";
import "./styles.css";

const queryClient = new QueryClient();
const rootElement = document.querySelector("#root");

if (rootElement === null) {
  throw new Error("StockHawk application root is missing");
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
