// src/App.tsx
import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { API_BASE } from "./config";

import HomePage from "./pages/HomePage";
import HelpPage from "./pages/HelpPage";
import BlogPage from "./pages/BlogPage";
import Layout from "./components/Layout";
import AboutPage from "./pages/AboutPage";
import NotFoundPage from "./pages/NotFoundPage";
import AdminPage from "./pages/AdminPage";
import DataPage from "./pages/DataPage";
import RoastHome from "./pages/RoastHome";
import RoastView from "./pages/RoastView";
import EmploymentPage from "./pages/EmploymentPage";
import EmploymentGirlPage from "./pages/EmploymentGirlPage";
import EmploymentReceptionPage from "./pages/EmploymentReceptionPage";


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
      <Route path="/help" element={<Layout><HelpPage /></Layout>} />
      <Route path="/about" element={<Layout><AboutPage /></Layout>} />
      <Route path="/blog" element={<Layout><BlogPage /></Layout>} />
      <Route path="/admin" element={<Layout><AdminPage /></Layout>} />
      <Route path="/data" element={<Layout><DataPage /></Layout>} />
      <Route path="/roast" element={<Layout><RoastHome /></Layout>} />
      <Route path="/roast/:id" element={<Layout><RoastView /></Layout>} />
      <Route path="employment" element={<Layout><EmploymentPage /></Layout>} />
      <Route path="employment/girls" element={<Layout><EmploymentGirlPage /></Layout>} />
      <Route path="employment/reception" element={<Layout><EmploymentReceptionPage /></Layout>} />

    </Routes>
  );
}
