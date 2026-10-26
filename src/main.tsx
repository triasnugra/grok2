import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Desk } from "@/components/meja-desk";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Desk />
  </StrictMode>,
);
