import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  TextField, Button, Box, Typography, Snackbar, Alert
} from "@mui/material";

export default function EditPostPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [date, setDate] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    axios.get(`/api/blog`).then((res) => {
      const post = res.data.find((p: any) => p.id === Number(id));
      if (post) {
        setTitle(post.title);
        setContent(post.content);
        setDate(post.created_at.split("T")[0]); // YYYY-MM-DD
      }
    });
  }, [id]);

  const handleUpdate = async () => {
    try {
      await axios.put(
        `/api/blog/${id}`,
        { title, content, created_at: date },
        { headers: { "x-admin-key": import.meta.env.VITE_BLOG_ADMIN_KEY } }
      );
      setSuccess(true);
      setTimeout(() => navigate("/blog"), 1000);
    } catch (err) {
      console.error(err);
      setError("Failed to update post");
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: "auto", mt: 4 }}>
      <Typography variant="h5">Edit Post</Typography>
      <TextField
        label="Title"
        fullWidth
        margin="normal"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <TextField
        label="Date"
        type="date"
        fullWidth
        margin="normal"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />
      <TextField
        label="Content"
        fullWidth
        multiline
        rows={10}
        margin="normal"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <Button variant="contained" onClick={handleUpdate}>
        Save Changes
      </Button>
      <Snackbar open={success} autoHideDuration={2000} onClose={() => setSuccess(false)}>
        <Alert severity="success">Updated!</Alert>
      </Snackbar>
      <Snackbar open={!!error} autoHideDuration={2000} onClose={() => setError("")}>
        <Alert severity="error">{error}</Alert>
      </Snackbar>
    </Box>
  );
}
