import { useState, useEffect } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css"; // code theme

const STORAGE_KEY = "blog-draft";

export default function NewPostPage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState(""); // markdown
  const [message, setMessage] = useState(""); // success/error
  const [showPreview, setShowPreview] = useState(true);

  // Load draft from localStorage
  useEffect(() => {
    const draft = localStorage.getItem(STORAGE_KEY);
    if (draft) {
      const { title, content } = JSON.parse(draft);
      setTitle(title);
      setContent(content);
    }
  }, []);

  // Autosave
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ title, content }));
  }, [title, content]);

  const handleSubmit = async () => {
    try {
      await axios.post(
        "/api/blog",
        { title, content },
        { headers: { "x-admin-key": import.meta.env.VITE_BLOG_ADMIN_KEY } }
      );
      setMessage("✅ Post published!");
      setTitle("");
      setContent("");
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      setMessage("❌ Failed to save post");
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setMessage("✅ Markdown copied");
    } catch {
      setMessage("❌ Copy failed");
    }
  };

  const handleReset = () => {
    setTitle("");
    setContent("");
    localStorage.removeItem(STORAGE_KEY);
    setMessage("⚠️ Draft cleared");
  };

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const charCount = content.length;

  return (
    <div style={{ maxWidth: "1100px", margin: "40px auto", padding: "0 16px" }}>
      <h2>New Blog Post</h2>

      <input
        type="text"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{
          width: "100%",
          padding: "8px",
          fontSize: "16px",
          marginBottom: "12px",
        }}
      />

      <label style={{ display: "block", marginBottom: "8px" }}>
        <input
          type="checkbox"
          checked={showPreview}
          onChange={(e) => setShowPreview(e.target.checked)}
        />{" "}
        Show Preview
      </label>

      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        {/* Editor */}
        <div style={{ flex: showPreview ? "1 1 50%" : "1 1 100%" }}>
          <textarea
            placeholder="Content (Markdown)"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={20}
            style={{
              width: "100%",
              padding: "8px",
              fontSize: "14px",
              fontFamily: "monospace",
            }}
          />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "8px",
            }}
          >
            <span style={{ fontSize: "12px", color: "#666" }}>
              {wordCount} words • {charCount} chars
            </span>
            <span>
              <button onClick={handleCopy} style={{ marginRight: "8px" }}>
                Copy
              </button>
              <button onClick={handleReset}>Reset</button>
            </span>
          </div>
        </div>

        {/* Preview */}
        {showPreview && (
          <div
            style={{
              flex: "1 1 50%",
              border: "1px solid #333",
              borderRadius: "6px",
              padding: "12px",
              background: "#0d1117",
              color: "#f0f6fc",
              overflowX: "auto",
            }}
          >
            <h4 style={{ marginTop: 0 }}>Preview</h4>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>

      <button
        onClick={handleSubmit}
        style={{
          marginTop: "16px",
          padding: "10px 20px",
          background: "#0070f3",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Publish
      </button>

      {message && (
        <div style={{ marginTop: "12px", fontSize: "14px" }}>{message}</div>
      )}
    </div>
  );
}
