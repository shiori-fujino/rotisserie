// src/App.tsx
import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import HelpPage from "./pages/HelpPage";
import CommentsPage from "./pages/CommentsPage";
import BlogPage from "./pages/BlogPage";
import NewPostPage from "./pages/NewPostPage";
import Layout from "./components/Layout";
import EditPostPage from "./pages/EditPostPage";
import AboutPage from "./pages/AboutPage";
import NotFoundPage from "./pages/NotFoundPage";
import AdminPage from "./pages/AdminPage";

export default function App() {
  return (
    <Routes>
      <Route path="*" element={<NotFoundPage />} />
      <Route path="/" element={<HomePage />} />
      <Route path="/comments" element={<Layout><CommentsPage /></Layout>} />
      <Route path="/help" element={<Layout><HelpPage /></Layout>} />
      <Route path="/about" element={<Layout><AboutPage /></Layout>} />
      <Route path="/blog" element={<Layout><BlogPage /></Layout>} />
      <Route path="/newpost" element={<Layout><NewPostPage /></Layout>} />
      <Route path="/blog/edit/:id" element={<Layout><EditPostPage /></Layout>} />
      <Route path="/admin" element={<Layout><AdminPage /></Layout>} />
    </Routes>
  );
}
