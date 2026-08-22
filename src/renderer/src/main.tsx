import React from "react";
import ReactDOM from "react-dom/client";
import { Theme } from "@radix-ui/themes";
import App from "./App";
import "./index.css";

import { useVideoStore } from "./store/videoStore";

function MainApp(): React.JSX.Element {
  const theme = useVideoStore((state) => state.theme);

  return (
    <Theme appearance={theme} accentColor="blue" radius="medium">
      <App />
    </Theme>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <MainApp />
  </React.StrictMode>,
);
