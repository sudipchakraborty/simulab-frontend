import React from "react";
import ReactDOM from "react-dom/client";
import { ReactFlowProvider } from "@xyflow/react";
import App from "./App";
import { loadSystemConfig } from "./accounts/systemConfig";
import { AccountRoot } from "./accounts";
import { applyTheme, readThemeCache } from "./themes";
import { useEditor } from "./editor/store";
import { createSampleProject } from "./circuit/project";
import "@xyflow/react/dist/style.css";
import "./styles.css";
import "./ide/ide.css";
import "./accounts/accounts.css";
import "./themes/themes.css";
import "./layout/layout.css";
import "./editor/selection.css";
applyTheme(readThemeCache());
void loadSystemConfig().then((config) =>
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <ReactFlowProvider>
        <AccountRoot
          loginEnabled={config.loginEnabled}
          onIdentityChange={() =>
            useEditor.setState({
              project: createSampleProject(),
              past: [],
              future: [],
            })
          }
        >
          <App />
        </AccountRoot>
      </ReactFlowProvider>
    </React.StrictMode>,
  ),
);
