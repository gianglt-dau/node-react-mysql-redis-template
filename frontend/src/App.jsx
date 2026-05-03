import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

function App() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((res) => res.json())
      .then(setHealth)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <main className="page">
      <section className="card">
        <p className="eyebrow">Infrastructure as Code Demo</p>
        <h1>NodeJS + React + MySQL + Redis</h1>
        <p className="muted">
          Project này được thiết kế như một template để Terraform tạo repo,
          GitHub Actions build image và VPS chạy bằng Docker Compose.
        </p>

        <div className="status">
          <h2>Backend health</h2>
          {error && <pre className="error">{error}</pre>}
          {!health && !error && <p>Đang kiểm tra backend...</p>}
          {health && <pre>{JSON.stringify(health, null, 2)}</pre>}
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
