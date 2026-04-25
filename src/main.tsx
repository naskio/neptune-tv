import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { LocaleSync } from "./components/LocaleSync.tsx";
import { ThemeProvider } from "./components/ThemeProvider.tsx";
import { ThemeSync } from "./components/ThemeSync.tsx";
import "./i18n";
import { initStores } from "./store/index.ts";

void initStores().then(() => {
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <ThemeProvider>
        <ThemeSync />
        <LocaleSync />
        <App />
      </ThemeProvider>
    </React.StrictMode>,
  );
});
