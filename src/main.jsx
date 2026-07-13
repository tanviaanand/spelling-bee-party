import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import * as db from "./db";
import "./styles.css";

if (import.meta.env.DEV) window.bee = db; // console access for testing

createRoot(document.getElementById("root")).render(<App />);
