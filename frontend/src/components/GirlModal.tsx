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
  onCommentsUpdated?: (
    girlId: number,
    newStats?: { commentsCount?: number; avgRating?: number }
  ) => void;
  highlightCommentId?: number;
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
  const [avgRating, setAvgRating] = useState(0);

  const [rating, setRating] = useState<number | null>(0);
  const [comment, setComment] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  // 🧠 load comments only once per open
  useEffect(() => {
    if (!open || !girlId) return;
    axios
      .get(`${API_BASE}/api/roasts/${girlId}/replies`)
      .then((res) => {
        setComments(res.data.replies || []);
        setCommentsCount(res.data.repliesCount ?? 0);
        setAvgRating(res.data.avgRating ?? 0);
      })
      .catch((err) => console.error("fetch replies error", err));
  }, [open, girlId]);

  // 👀 increment views once
  useEffect(() => {
    if (open && girlId) {
      axios.post(`${API_BASE}/api/views/${girlId}`).then((res) => {
        setViews(res.data.views);
        onViewsUpdated?.(girlId);
      });
    }
  }, [open, girlId]);

  // 🔦 scroll to highlighted comment
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

  // 🧠 optimistic comment submit
  const handleSubmitComment = async () => {
    if (!comment.trim() && !rating) return;

    const tempId = Date.now();
    const newComment: Comment = {
      id: tempId,
      rating,
      comment,
      created_at: new Date().toISOString(),
      parent_id: null,
    };

    // optimistic UI
    setComments((prev) => [...prev, newComment]);
    setCommentsCount((c) => c + 1);

    const allRatings = [
      ...comments.map((c) => c.rating).filter((r): r is number => !!r),
      rating || 0,
    ];
    const newAvg =
      allRatings.length > 0
        ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length
        : avgRating;
    setAvgRating(newAvg);

    setComment("");
    setRating(null);
    setSnackbarOpen(true);

    try {
      await axios.post(`${API_BASE}/api/roasts/${girlId}/replies`, {
        rating: rating && rating > 0 ? rating : null,
        comment: comment?.trim() || null,
      });
      onCommentsUpdated?.(girlId, {
        commentsCount: commentsCount + 1,
        avgRating: newAvg,
      });
    } catch (err) {
      console.error("Error adding comment:", err);
    }
  };

  // 🧠 optimistic reply submit
  const handleSubmitReply = async (parentId: number) => {
    if (!replyText.trim()) return;
    const tempId = Date.now();
    const newReply: Comment = {
      id: tempId,
      rating: null,
      comment: replyText.trim(),
      created_at: new Date().toISOString(),
      parent_id: parentId,
    };

    setComments((prev) => [...prev, newReply]);
    setCommentsCount((c) => c + 1);
    setReplyText("");
    setReplyTo(null);

    try {
      await axios.post(`${API_BASE}/api/roasts/${girlId}/replies`, {
        comment: replyText?.trim() || null,
        parent_id: parentId,
      });
      onCommentsUpdated?.(girlId, { commentsCount: commentsCount + 1 });
    } catch (err) {
      console.error("Error posting reply:", err);
    }
  };

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
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Typography variant="h6">{girlName || "Unknown"}</Typography>
            <Box sx={{ display: "flex", gap: 2 }}>
              <Typography variant="caption">👀 {views}</Typography>
              <Typography variant="caption">💬 {commentsCount}</Typography>
              <Typography variant="caption">
                ⭐️ {avgRating.toFixed(1)}
              </Typography>
            </Box>
            <Link href={profileUrl} target="_blank" rel="noreferrer">
              Visit Profile
            </Link>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          <Typography variant="subtitle1">Comments</Typography>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {topLevel.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No comments yet.
              </Typography>
            ) : (
              topLevel.map((c) => (
                <Box key={c.id} id={`comment-${c.id}`}>
                  {c.rating && (
                    <Typography variant="body2">
                      ⭐️ {Number(c.rating).toFixed(1)}
                    </Typography>
                  )}
                  <Typography variant="body2">{c.comment}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(c.created_at).toLocaleString()}
                  </Typography>
                  <Button size="small" onClick={() => setReplyTo(c.id)}>
                    Reply
                  </Button>
                  {repliesMap[c.id]?.map((r) => (
                    <Box
                      key={r.id}
                      sx={{
                        ml: 4,
                        mt: 1,
                        p: 1,
                        bgcolor: "#f9f9f9",
                        borderRadius: 1,
                      }}
                    >
                      <Typography variant="body2">{r.comment}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(r.created_at).toLocaleString()}
                      </Typography>
                    </Box>
                  ))}
                  {replyTo === c.id && (
                    <Stack spacing={1} sx={{ mt: 1, ml: 4 }}>
                      <TextField
                        label="Write a reply"
                        multiline
                        rows={2}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
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
              ))
            )}
          </Stack>

          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1">Leave a Comment</Typography>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Rating
                value={rating}
                onChange={(_, val) => setRating(val)}
                precision={0.5}
              />
              <TextField
                label="Your comment"
                multiline
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
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
