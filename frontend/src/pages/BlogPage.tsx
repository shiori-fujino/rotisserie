// src/pages/BlogPage.tsx
import { useState, useEffect } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  List,
  ListItemButton,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { API_BASE } from "../config";

export default function BlogPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    const api = import.meta.env.VITE_API_BASE || "";
axios.get(`${api}/api/blog`).then((res) => setPosts(res.data));
  }, []);

  const handleClick = (index: number) => {
    setActiveIndex(index);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setActiveIndex(null);
  };

  const handlePrev = () => {
    if (activeIndex !== null && activeIndex > 0) {
      setActiveIndex(activeIndex - 1);
    }
  };

  const handleNext = () => {
    if (activeIndex !== null && activeIndex < posts.length - 1) {
      setActiveIndex(activeIndex + 1);
    }
  };

  const activePost = activeIndex !== null ? posts[activeIndex] : null;

  return (
    <Box sx={{ maxWidth: 800, mx: "auto", mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Notes
      </Typography>

      <List>
        {posts.map((post, i) => (
          <Box key={post.id}>
            <ListItemButton onClick={() => handleClick(i)}>
              <Typography variant="h6">{post.title}</Typography>
              <Typography variant="body2" sx={{ ml: "auto" }}>
                {new Date(post.created_at).toLocaleDateString("en-AU", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </Typography>
            </ListItemButton>
            <Divider />
          </Box>
        ))}
      </List>

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        scroll="paper"
        sx={{
          "& .MuiDialog-paper": {
            fontFamily: "Inter, Roboto, Helvetica, Arial, sans-serif",
          },
        }}
      >
        {activePost && (
          <>
            <DialogTitle>{activePost.title}</DialogTitle>
            <DialogContent dividers>
              <Typography
                variant="caption"
                color="text.secondary"
                gutterBottom
                display="block"
              >
                {new Date(activePost.created_at).toLocaleDateString("en-AU", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </Typography>
              <Box
                sx={{
                  fontFamily: "Inter, Roboto, Helvetica, Arial, sans-serif",
                  mt: 2,
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
                  {activePost.content}
                </ReactMarkdown>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handlePrev} disabled={activeIndex === 0}>
                Previous
              </Button>
              <Button
                onClick={handleNext}
                disabled={activeIndex === posts.length - 1}
              >
                Next
              </Button>
              <Button onClick={handleClose}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
