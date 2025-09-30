// src/components/GirlModal.tsx
import { useEffect, useState } from "react";
import axios from "axios";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Link,
  Box,
  TextField,
  Rating,
  Stack,
  Snackbar,
  Alert,
} from "@mui/material";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

interface GirlModalProps {
  open: boolean;
  onClose: () => void;
  girlId: number;
  girlName: string;
  profileUrl: string;
  onViewsUpdated?: (girlId: number) => void;
  onCommentsUpdated?: (girlId: number) => void;
  highlightCommentId?: number; // 👈 NEW
}

interface Comment {
  id: number;
  rating: number | null;
  comment: string | null;
  created_at: string;
  parent_id: number | null;
}

export default function GirlModal({
  open,
  onClose,
  girlId,
  girlName,
  profileUrl,
  onViewsUpdated,
  onCommentsUpdated,
  highlightCommentId,
}: GirlModalProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [views, setViews] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);

  const [rating, setRating] = useState<number | null>(0);
  const [comment, setComment] = useState("");

  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");

  const [snackbarOpen, setSnackbarOpen] = useState(false);

  // 🔥 load counts + comments when modal opens
  useEffect(() => {
    if (open && girlId) {
      axios.get(`${API_BASE}/api/views/${girlId}`).then((res) => setViews(res.data.views));
      axios.get(`${API_BASE}/api/comments/${girlId}`).then((res) => {
        setComments(res.data);
        setCommentsCount(res.data.length);
      });
    }
  }, [open, girlId]);

  // 🔥 increment views once per open
  useEffect(() => {
    if (open && girlId) {
      axios.post(`${API_BASE}/api/views/${girlId}`).then((res) => {
        setViews(res.data.views);
        if (onViewsUpdated) onViewsUpdated(girlId);
      });
    }
  }, [open, girlId]);

  // 🔥 scroll + highlight specific comment if passed
  useEffect(() => {
    if (highlightCommentId) {
      const el = document.getElementById(`comment-${highlightCommentId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("highlighted-comment");
        setTimeout(() => el.classList.remove("highlighted-comment"), 2500);
      }
    }
  }, [comments, highlightCommentId]);

  // 🔥 submit new top-level comment
  const handleSubmitComment = async () => {
    try {
      await axios.post(`${API_BASE}/api/comments/${girlId}`, {
        rating: rating && rating > 0 ? rating : null,
        comment: comment?.trim() || null,
      });

      setComment("");
      setRating(null);

      const res = await axios.get(`${API_BASE}/api/comments/${girlId}`);
      setComments(res.data);
      setCommentsCount(res.data.length);

      if (onCommentsUpdated) onCommentsUpdated(girlId);
      setSnackbarOpen(true);
    } catch (err) {
      console.error("add comment error", err);
    }
  };

  // 🔥 submit reply
  const handleSubmitReply = async (parentId: number) => {
    try {
      await axios.post(`${API_BASE}/api/comments/${girlId}`, {
        comment: replyText,
        parent_id: parentId,
      });
      setReplyText("");
      setReplyTo(null);

      const res = await axios.get(`${API_BASE}/api/comments/${girlId}`);
      setComments(res.data);
      setCommentsCount(res.data.length);

      if (onCommentsUpdated) onCommentsUpdated(girlId);
    } catch (err) {
      console.error("add reply error", err);
    }
  };

  // 🔥 group comments
  const topLevel = comments.filter((c) => !c.parent_id);
  const repliesMap = comments.reduce((acc, c) => {
    if (c.parent_id) {
      if (!acc[c.parent_id]) acc[c.parent_id] = [];
      acc[c.parent_id].push(c);
    }
    return acc;
  }, {} as Record<number, Comment[]>);

  if (!open) return null;

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h6">{girlName || "Unknown"}</Typography>
            <Box sx={{ display: "flex", gap: 2 }}>
              <Typography variant="caption">👀 {views}</Typography>
              <Typography variant="caption">💬 {commentsCount}</Typography>
            </Box>
            <Link href={profileUrl} target="_blank" rel="noreferrer">
              Visit Profile
            </Link>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          {/* Comments */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1">Comments</Typography>
            {topLevel.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No comments yet.
              </Typography>
            ) : (
              <Stack spacing={2} sx={{ mt: 1 }}>
                {topLevel.map((c) => (
                  <Box key={c.id} id={`comment-${c.id}`} sx={{ mb: 1 }}>
                    {c.rating && <Rating value={c.rating} readOnly size="small" />}
                    <Typography variant="body2">{c.comment}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(c.created_at).toLocaleString()}
                    </Typography>

                    <Button size="small" onClick={() => setReplyTo(c.id)}>
                      Reply
                    </Button>

                    {/* Replies */}
                    {repliesMap[c.id]?.map((reply) => (
                      <Box
                        key={reply.id}
                        id={`comment-${reply.id}`}
                        sx={{ ml: 4, mt: 1, p: 1, bgcolor: "#f9f9f9", borderRadius: 1 }}
                      >
                        <Typography variant="body2">{reply.comment}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(reply.created_at).toLocaleString()}
                        </Typography>
                      </Box>
                    ))}

                    {/* Reply input */}
                    {replyTo === c.id && (
                      <Stack spacing={1} sx={{ mt: 1, ml: 4 }}>
                        <TextField
                          label="Write a reply"
                          multiline
                          rows={2}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          fullWidth
                        />
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleSubmitReply(c.id)}
                          disabled={!replyText.trim()}
                        >
                          Post Reply
                        </Button>
                      </Stack>
                    )}
                  </Box>
                ))}
              </Stack>
            )}
          </Box>

          {/* Add new comment */}
          <Box>
            <Typography variant="subtitle1">Leave a Comment</Typography>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Rating value={rating} onChange={(_, val) => setRating(val)} />
              <TextField
                label="Your comment"
                multiline
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                fullWidth
              />
              <Button
                variant="contained"
                onClick={handleSubmitComment}
                disabled={!rating && !comment.trim()}
              >
                Submit
              </Button>
            </Stack>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* 🔔 Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" onClose={() => setSnackbarOpen(false)}>
          Comment submitted!
        </Alert>
      </Snackbar>
    </>
  );
}
