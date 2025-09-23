import { useState, useEffect } from "react";
import axios from "axios";
import {
  TextField,
  Button,
  Box,
  Typography,
  Snackbar,
  Alert,
  Grid,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
} from "@mui/material";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import "highlight.js/styles/github-dark.css"; // pick your fav theme

const STORAGE_KEY = "blog-draft";

export default function NewPostPage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState(""); // markdown
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
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

  // Autosave to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ title, content }));
  }, [title, content]);

  const handleSubmit = async () => {
    try {
      await axios.post(
        "/api/blog",
        { title, content },
        {
          headers: { "x-admin-key": import.meta.env.VITE_BLOG_ADMIN_KEY },
        }
      );

      setSuccess(true);
      setTitle("");
      setContent("");
      localStorage.removeItem(STORAGE_KEY);
    } catch (err: any) {
      console.error(err);
      setError("Failed to save post");
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setSuccess(true);
    } catch {
      setError("Copy failed");
    }
  };

  const handleReset = () => {
    setTitle("");
    setContent("");
    localStorage.removeItem(STORAGE_KEY);
  };

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const charCount = content.length;

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto", mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        New Blog Post
      </Typography>

      <TextField
        label="Title"
        fullWidth
        margin="normal"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <FormControlLabel
        control={
          <Switch
            checked={showPreview}
            onChange={(e) => setShowPreview(e.target.checked)}
          />
        }
        label="Show Preview"
      />

      <Grid container spacing={2}>
        {/* Editor */}
        <Grid item xs={12} md={showPreview ? 6 : 12}>
          <TextField
            label="Content (Markdown)"
            fullWidth
            multiline
            rows={20}
            margin="normal"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          {/* Counters + tools */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mt: 1,
            }}
          >
            <Typography variant="caption">
              {wordCount} words • {charCount} chars
            </Typography>
            <Box>
              <Tooltip title="Copy Markdown">
                <IconButton onClick={handleCopy}>
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Reset Draft">
                <IconButton onClick={handleReset}>
                  <DeleteSweepIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Grid>

        {/* Preview */}
        {showPreview && (
          <Grid
            item
            xs={12}
            md={6}
            sx={{
              mt: 2,
              border: "1px solid #333",
              borderRadius: 2,
              p: 2,
              background: "#0d1117",
              color: "#f0f6fc",
              overflowX: "auto",
            }}
          >
            <Typography variant="subtitle1" gutterBottom>
              Preview
            </Typography>
            <Box
              sx={{
                "& img": { maxWidth: "100%", borderRadius: "8px" },
                "& pre": {
                  background: "#161b22",
                  padding: "12px",
                  borderRadius: "6px",
                  overflowX: "auto",
                },
                "& code": {
                  fontFamily: "monospace",
                  fontSize: "0.9em",
                },
              }}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
              >
                {content}
              </ReactMarkdown>
            </Box>
          </Grid>
        )}
      </Grid>

      <Button
        sx={{ mt: 2 }}
        variant="contained"
        color="primary"
        onClick={handleSubmit}
      >
        Publish
      </Button>

      <Snackbar
        open={success}
        autoHideDuration={3000}
        onClose={() => setSuccess(false)}
      >
        <Alert severity="success">Done!</Alert>
      </Snackbar>
      <Snackbar
        open={!!error}
        autoHideDuration={3000}
        onClose={() => setError("")}
      >
        <Alert severity="error">{error}</Alert>
      </Snackbar>
    </Box>
  );
}
