import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ThemeProvider } from "@/components/ui/theme-provider";

// Render the application
createRoot(document.getElementById("root")!).render(
  <ThemeProvider defaultTheme="system" storageKey="loan-tracker-theme">
    <App />
  </ThemeProvider>
);
