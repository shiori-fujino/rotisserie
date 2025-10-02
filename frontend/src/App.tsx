// src/App.tsx
import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import HelpPage from "./pages/HelpPage";
import CommentsPage from "./pages/CommentsPage";
import BlogPage from "./pages/BlogPage";
import Layout from "./components/Layout";
import AboutPage from "./pages/AboutPage";
import NotFoundPage from "./pages/NotFoundPage";
import AdminPage from "./pages/AdminPage";
import DataPage from "./pages/DataPage";
import GrillHome from "./pages/GrillHome";
import GrillThread from "./pages/GrillThread"
import { API_BASE } from "./config";

export default function App() {
  // 🔹 track visit once per app load
  useEffect(() => {
    fetch(`${API_BASE}/api/visits`, { method: "POST" }).catch(() =>
      console.warn("visit track failed")
    );
  }, []);

  return (
    <Routes>
      <Route path="*" element={<NotFoundPage />} />
      <Route path="/" element={<HomePage />} />
      <Route path="/comments" element={<Layout><CommentsPage /></Layout>} />
      <Route path="/help" element={<Layout><HelpPage /></Layout>} />
      <Route path="/about" element={<Layout><AboutPage /></Layout>} />
      <Route path="/blog" element={<Layout><BlogPage /></Layout>} />
      <Route path="/admin" element={<Layout><AdminPage /></Layout>} />
      <Route path="/data" element={<Layout><DataPage /></Layout>} />
      <Route path="/grill" element={<Layout><GrillHome /></Layout>} />
      <Route path="/grill/:id" element={<Layout><GrillThread /></Layout>} />

    </Routes>
  );
}
