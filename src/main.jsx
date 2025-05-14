import React from "react";
import ReactDOM from "react-dom/client";
import App from "./src/App";
import "./src/styles/globals.css";

// Import the dev tools and initialize them
import { TempoDevtools } from "tempo-devtools";
TempoDevtools.init();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
