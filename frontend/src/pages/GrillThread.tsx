//frontend/src/pages/GrillThread.tsx

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  TextField,
  Button,
} from "@mui/material";
import { API_BASE } from "../config";

interface Thread {
  id: number;
  title: string;
  category: string;
  created_at: string;
  pinned: boolean;
  heat: number;
}

interface Comment {
  id: number;
  comment: string;
  user_mask: string | null;
  created_at: string;
  heat: number;
}

export default function GrillThread() {
  const { id } = useParams<{ id: string }>();
  const [thread, setThread] = useState<Thread | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");

  // Load thread + comments
  useEffect(() => {
    async function fetchData() {
      try {
        const threadRes = await axios.get(`${API_BASE}/api/threads`);
        const found = threadRes.data.find((t: Thread) => t.id === Number(id));
        setThread(found);

        const commentsRes = await axios.get(`${API_BASE}/api/comments/thread/${id}`);
        setComments(commentsRes.data);
      } catch (err) {
        console.error("Error loading grill thread:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  const handlePost = async () => {
    if (!newComment.trim()) return;
    try {
      const res = await axios.post(`${API_BASE}/api/comments`, {
        text: newComment,
        thread_id: id,
        user_mask: "🐓", // later make random or selectable
      });
      setComments((prev) => [...prev, res.data]);
      setNewComment("");
    } catch (err) {
      console.error("Error posting comment:", err);
    }
  };

  if (loading) return <CircularProgress />;

  if (!thread) return <Typography>Thread not found.</Typography>;

  return (
    <Box p={2}>
      <Typography variant="h5" gutterBottom>
        🔥 {thread.title}
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Category: {thread.category} · Heat: {thread.heat} ·{" "}
        {new Date(thread.created_at).toLocaleString()}{" "}
        {thread.pinned && " · Kept Warm"}
      </Typography>

      <Box mt={3}>
        {comments.map((c) => (
<Paper
  key={c.id}
  sx={{
    p: 2,
    mb: 2,
    backgroundColor:
      c.heat > 10 ? "rgba(255, 69, 0, 0.08)" : "inherit", // 🔥 subtle red tint
  }}
>
  <Typography variant="subtitle2">
    {c.user_mask || "Anon"} said:
  </Typography>
  <Typography variant="body1" sx={{ mb: 1 }}>
    {c.comment}
  </Typography>
  <Box display="flex" justifyContent="space-between" alignItems="center">
    <Typography variant="caption" color="text.secondary">
      {new Date(c.created_at).toLocaleString()}
    </Typography>
    <Button
      size="small"
      onClick={() => {
        axios.post(`${API_BASE}/api/comments/${c.id}/heat`)
          .then(res => {
            setComments(prev =>
              prev.map(cm =>
                cm.id === c.id ? { ...cm, heat: res.data.heat } : cm
              )
            );
          })
          .catch(err => console.error("Error adding heat:", err));
      }}
    >
      🔥 {c.heat}
    </Button>
  </Box>
</Paper>

        ))}
      </Box>

      {/* Add new roast */}
      <Box mt={3}>
        <TextField
          fullWidth
          multiline
          minRows={2}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="🔥 Throw your roast on The Grill..."
        />
        <Button
          variant="contained"
          sx={{ mt: 1 }}
          onClick={handlePost}
        >
          Roast It
        </Button>
      </Box>
    </Box>
  );
}
