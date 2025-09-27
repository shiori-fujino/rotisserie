import { useEffect, useState } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Stack,
  Paper,
  Divider,
  CircularProgress,
  Button,
  TextField,
} from "@mui/material";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { API_BASE } from "../config";


axios.defaults.baseURL = API_BASE;

interface ContactMessage {
  id: number;
  message: string;
  created_at: string;
}

interface BlogPost {
  id: number;
  title: string;
  content: string;
  created_at: string;
}

export default function AdminPage() {
  const [tab, setTab] = useState(0);

  // Auth state
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("admin_token")
  );
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Messages state
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Blog state
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");

  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // ----------------- LOGIN -----------------
  const login = async () => {
    try {
      const res = await axios.post("/api/auth/login", { username, password });
      localStorage.setItem("admin_token", res.data.token);
      setToken(res.data.token);
    } catch (err) {
      alert("Login failed. Check your credentials.");
    }
  };

  // ----------------- FETCH CONTACT MESSAGES -----------------
  useEffect(() => {
    if (tab === 0 && token) {
      const fetchMessages = async () => {
        setLoadingMessages(true);
        try {
          const res = await axios.get<ContactMessage[]>("/api/contact", {
            headers: { Authorization: `Bearer ${token}` },
          });
          setMessages(res.data);
        } catch (err) {
          console.error("Failed to fetch messages", err);
          if (axios.isAxiosError(err) && err.response?.status === 401) {
            localStorage.removeItem("admin_token");
            setToken(null);
          }
        } finally {
          setLoadingMessages(false);
        }
      };
      fetchMessages();
    }
  }, [tab, token]);

  // ----------------- FETCH BLOG POSTS -----------------
  useEffect(() => {
    if (tab === 1 && token) {
      const fetchPosts = async () => {
        setLoadingPosts(true);
        try {
          const res = await axios.get<BlogPost[]>("/api/blog", {
            headers: { Authorization: `Bearer ${token}` },
          });
          setPosts(res.data);
        } catch (err) {
          console.error("Failed to fetch posts", err);
        } finally {
          setLoadingPosts(false);
        }
      };
      fetchPosts();
    }
  }, [tab, token]);

  // ----------------- CREATE POST -----------------
  const createPost = async () => {
    try {
      const res = await axios.post<BlogPost>(
        "/api/blog",
        { title: newTitle, content: newContent },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPosts([res.data, ...posts]);
      setNewTitle("");
      setNewContent("");
      setSuccessMsg("Post created!");
    } catch (err) {
      console.error("Failed to create post", err);
      setErrorMsg("Failed to create post");
    }
  };

  // ----------------- UPDATE POST -----------------
  const updatePost = async () => {
    if (!editingPost) return;
    try {
      const res = await axios.put<BlogPost>(
        `/api/blog/${editingPost.id}`,
        {
          title: editingPost.title,
          content: editingPost.content,
          created_at: editingPost.created_at,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPosts(posts.map((p) => (p.id === res.data.id ? res.data : p)));
      setSuccessMsg("Post updated!");
      setEditingPost(null);
    } catch (err) {
      console.error("Failed to update post", err);
      setErrorMsg("Failed to update post");
    }
  };

  // ----------------- DELETE POST -----------------
  const deletePost = async (id: number) => {
    if (!window.confirm("Delete this post?")) return;
    try {
      await axios.delete(`/api/blog/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPosts(posts.filter((p) => p.id !== id));
      setSuccessMsg("Post deleted!");
    } catch (err) {
      console.error("Delete failed", err);
      setErrorMsg("Failed to delete post");
    }
  };

  // ----------------- LOGIN SCREEN -----------------
  if (!token) {
    return (
      <Box sx={{ maxWidth: 400, mx: "auto", mt: 8 }}>
        <Typography variant="h5" gutterBottom>
          Admin Login
        </Typography>
        <Stack spacing={2}>
          <TextField
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button variant="contained" onClick={login}>
            Login
          </Button>
        </Stack>
      </Box>
    );
  }

  // ----------------- ADMIN DASHBOARD -----------------
  return (
    <Box sx={{ maxWidth: 900, mx: "auto", py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Admin Dashboard
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Contact Messages" />
        <Tab label="Blog Posts" />
        <Tab label="(Future) Analytics" />
      </Tabs>

      {/* CONTACT MESSAGES */}
      {tab === 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Contact Messages
          </Typography>
          {loadingMessages ? (
            <Box sx={{ textAlign: "center", mt: 4 }}>
              <CircularProgress />
              <Typography sx={{ mt: 2 }}>Loading messages…</Typography>
            </Box>
          ) : (
            <Stack spacing={2}>
              {messages.map((msg) => (
                <Paper key={msg.id} sx={{ p: 2 }}>
                  <Typography variant="body1">{msg.message}</Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="caption" color="text.secondary">
                    {new Date(msg.created_at).toLocaleString()}
                  </Typography>
                </Paper>
              ))}
              {messages.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No messages yet 🍗
                </Typography>
              )}
            </Stack>
          )}
        </Box>
      )}

      {/* BLOG POSTS */}
      {tab === 1 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Blog Posts
          </Typography>

          {/* EDIT MODE */}
          {editingPost ? (
            <Stack spacing={2} sx={{ mb: 3 }}>
              <TextField
                label="Title"
                value={editingPost.title}
                onChange={(e) =>
                  setEditingPost({ ...editingPost, title: e.target.value })
                }
              />
              <TextField
                label="Date"
                type="date"
                value={editingPost.created_at.split("T")[0]}
                onChange={(e) =>
                  setEditingPost({
                    ...editingPost,
                    created_at: `${e.target.value}T00:00:00Z`,
                  })
                }
              />
              <TextField
                label="Content"
                multiline
                rows={8}
                value={editingPost.content}
                onChange={(e) =>
                  setEditingPost({ ...editingPost, content: e.target.value })
                }
              />
              <Stack direction="row" spacing={2}>
                <Button variant="contained" onClick={updatePost}>
                  Save Changes
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={() => setEditingPost(null)}
                >
                  Cancel
                </Button>
              </Stack>
            </Stack>
          ) : (
            <>
              {/* New Post Form */}
              <Stack spacing={2} sx={{ mb: 3 }}>
                <TextField
                  label="Title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
                <TextField
                  label="Content (Markdown supported)"
                  multiline
                  rows={6}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                />
                <Button
                  variant="contained"
                  onClick={createPost}
                  disabled={!newTitle || !newContent}
                >
                  Post
                </Button>
              </Stack>

              {/* Markdown Preview */}
              {newContent && (
                <Paper sx={{ p: 2, mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Preview
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {newContent}
                  </ReactMarkdown>
                </Paper>
              )}
            </>
          )}

          {/* Success/Error Messages */}
          {successMsg && (
            <Typography color="success.main" sx={{ mb: 2 }}>
              {successMsg}
            </Typography>
          )}
          {errorMsg && (
            <Typography color="error.main" sx={{ mb: 2 }}>
              {errorMsg}
            </Typography>
          )}

          {/* Posts List */}
          {loadingPosts ? (
            <Box sx={{ textAlign: "center", mt: 4 }}>
              <CircularProgress />
              <Typography sx={{ mt: 2 }}>Loading posts…</Typography>
            </Box>
          ) : (
            <Stack spacing={2}>
              {posts.map((p) => (
                <Paper key={p.id} sx={{ p: 2 }}>
                  <Typography variant="h6">{p.title}</Typography>
                  <Divider sx={{ my: 1 }} />
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {p.content}
                  </ReactMarkdown>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mt: 1 }}
                  >
                    {new Date(p.created_at).toLocaleString()}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Button
                      size="small"
                      onClick={() => setEditingPost(p)}
                      variant="outlined"
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      variant="outlined"
                      onClick={() => deletePost(p.id)}
                    >
                      Delete
                    </Button>
                  </Stack>
                </Paper>
              ))}
              {posts.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No posts yet 🐓
                </Typography>
              )}
            </Stack>
          )}
        </Box>
      )}

      {/* ANALYTICS (FUTURE) */}
      {tab === 2 && (
        <Box>
          <Typography variant="h6">Analytics (coming soon…)</Typography>
        </Box>
      )}
    </Box>
  );
}
