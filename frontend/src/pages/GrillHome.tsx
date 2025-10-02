import { useEffect, useState } from "react";
import axios from "axios";
import { Box, Typography, Paper, CircularProgress, TextField, Button, MenuItem } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../config";

interface Thread {
  id: number;
  title: string;
  category: string;
  created_at: string;
  pinned: boolean;
  heat: number;
}

export default function GrillHome() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const navigate = useNavigate();

  // Load threads
  useEffect(() => {        
    axios.get(`${API_BASE}/api/threads`)
      .then(res => setThreads(res.data))
      .catch(err => console.error("Error fetching grill threads:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleCreateThread = async () => {
    if (!newTitle.trim()) return;
    try {
      const res = await axios.post(`${API_BASE}/api/threads`, {
        title: newTitle,
        category: newCategory,
      });
      // Prepend new thread to list
      setThreads((prev) => [res.data, ...prev]);
      setNewTitle("");
      setNewCategory("general");
    } catch (err) {
      console.error("Error creating thread:", err);
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Box p={2}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: "bold" }}>
        🔥 The Grill
      </Typography>
      <Typography variant="subtitle1" gutterBottom color="text.secondary">
        Fresh gossip, hot takes, and stories roasted daily.
      </Typography>

      {/* New Thread Form */}
      <Box mb={3}>
        <TextField
          fullWidth
          label="What's on your mind?"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          sx={{ mb: 1 }}
        />
        <TextField
          select
          label="Category"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          sx={{ mb: 1, minWidth: 200 }}
        >
          <MenuItem value="general">General</MenuItem>
          <MenuItem value="story">Story</MenuItem>
          <MenuItem value="health">Health</MenuItem>
          <MenuItem value="fun">Fun</MenuItem>
        </TextField>
        <Button
          variant="contained"
          onClick={handleCreateThread}
        >
          Throw it on The Grill
        </Button>
      </Box>

      {/* Thread List */}
      {threads.map((thread) => (
        <Paper
  key={thread.id}
  sx={{
    p: 2,
    mb: 2,
    borderLeft: thread.pinned ? "4px solid orange" : "2px solid #eee",
    "&:hover": { boxShadow: 3, cursor: "pointer" },
    backgroundColor:
      thread.heat > 20 ? "rgba(255, 69, 0, 0.1)" : "inherit", // 🔥 hot glow
  }}
  onClick={() => navigate(`/grill/${thread.id}`)}
>

          <Typography variant="h6">{thread.title}</Typography>
          <Box display="flex" justifyContent="space-between" alignItems="center">
  <Typography variant="body2" color="text.secondary">
    Category: {thread.category} · {new Date(thread.created_at).toLocaleString()}
  </Typography>
<Button
  size="small"
  onClick={(e) => {
    e.stopPropagation();

    // optimistic update
    setThreads(prev =>
      prev.map(t =>
        t.id === thread.id ? { ...t, heat: t.heat + 1 } : t
      )
    );

    axios.post(`${API_BASE}/api/threads/${thread.id}/heat`)
      .then(res => {
        // sync with server (in case decay adjusted it)
        setThreads(prev =>
          prev.map(t => t.id === thread.id ? res.data : t)
        );
      })
      .catch(err => {
        console.error("Error adding heat:", err);
        // rollback if server failed
        setThreads(prev =>
          prev.map(t =>
            t.id === thread.id ? { ...t, heat: t.heat - 1 } : t
          )
        );
      });
  }}
>
  🔥 {thread.heat}
</Button>
</Box>
        </Paper>
      ))}
    </Box>
  );
}
