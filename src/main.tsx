import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App.tsx"
import "./index.css"

if (import.meta.env.PROD) {
  console.debug = () => undefined
  console.info = () => undefined
  console.log = () => undefined
  console.warn = () => undefined
  console.error = () => undefined
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
