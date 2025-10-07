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
  Chip,
} from "@mui/material";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { API_BASE } from "../config";

axios.defaults.baseURL = API_BASE;

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */
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

interface Roast {
  id: number;
  title: string;
  created_at: string;
  heat: number;
  category?: string;
  type: "roast";
}

interface Reply {
  id: number;
  roast_id: number;
  comment: string | null;
  rating: number | null;
  created_at: string;
  roast_title?: string;
  type: "reply";
}

type FeedItem = Roast | Reply;

/* -------------------------------------------------------------------------- */
/* Admin Page                                                                 */
/* -------------------------------------------------------------------------- */
export default function AdminPage() {
  const [tab, setTab] = useState(0);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("admin_token")
  );
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // state
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  /* ----------------------------- LOGIN LOGIC ------------------------------ */
  const login = async () => {
    try {
      const res = await axios.post("/api/auth/login", { username, password });
      localStorage.setItem("admin_token", res.data.token);
      setToken(res.data.token);
    } catch {
      alert("Login failed. Check credentials.");
    }
  };

  /* ---------------------------- FETCH MESSAGES ---------------------------- */
  useEffect(() => {
    if (tab === 0 && token) {
      setLoadingMessages(true);
      axios
        .get<ContactMessage[]>("/api/contact", {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => setMessages(res.data))
        .catch((err) => console.error("fetch contact fail", err))
        .finally(() => setLoadingMessages(false));
    }
  }, [tab, token]);

  /* --------------------------- FETCH ROAST FEED --------------------------- */
  useEffect(() => {
    if (tab === 1 && token) {
      const load = async () => {
        setLoadingFeed(true);
        try {
          const [roastsRes, repliesRes] = await Promise.all([
            axios.get<Omit<Roast, "type">[]>("/api/roasts"),
            axios.get<Omit<Reply, "type">[]>("/api/replies/all"),
          ]);

          const roastItems: Roast[] = roastsRes.data.map((r) => ({
            ...r,
            type: "roast" as const,
          }));
          const replyItems: Reply[] = repliesRes.data.map((r) => ({
            ...r,
            type: "reply" as const,
          }));

          const merged: FeedItem[] = [...roastItems, ...replyItems].sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          );

          setFeed(merged);
        } catch (err) {
          console.error("fetch feed fail", err);
        } finally {
          setLoadingFeed(false);
        }
      };
      load();
    }
  }, [tab, token]);

  const deleteRoast = async (id: number) => {
    if (!window.confirm("Delete this roast and its replies?")) return;
    await axios
      .delete(`/api/roasts/${id}`)
      .then(() => setFeed((prev) => prev.filter((x) => !(x.type === "roast" && x.id === id))))
      .catch((err) => console.error("delete roast fail", err));
  };

  const deleteReply = async (id: number) => {
    if (!window.confirm("Delete this reply?")) return;
    await axios
      .delete(`/api/replies/${id}`)
      .then(() => setFeed((prev) => prev.filter((x) => !(x.type === "reply" && x.id === id))))
      .catch((err) => console.error("delete reply fail", err));
  };

  /* ----------------------------- FETCH BLOG ------------------------------- */
  useEffect(() => {
    if (tab === 2 && token) {
      setLoadingPosts(true);
      axios
        .get<BlogPost[]>("/api/blog", {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => setPosts(res.data))
        .catch((err) => console.error("fetch blog fail", err))
        .finally(() => setLoadingPosts(false));
    }
  }, [tab, token]);

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
    } catch {
      setErrorMsg("Failed to create post");
    }
  };

  const deletePost = async (id: number) => {
    if (!window.confirm("Delete this post?")) return;
    await axios
      .delete(`/api/blog/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(() => setPosts((p) => p.filter((x) => x.id !== id)))
      .catch(() => setErrorMsg("Failed to delete post"));
  };

  /* ----------------------------- LOGIN SCREEN ----------------------------- */
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

  /* ---------------------------- MAIN DASHBOARD ---------------------------- */
  return (
    <Box sx={{ maxWidth: 900, mx: "auto", py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Admin Dashboard
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Contact Messages" />
        <Tab label="Roast Feed" />
        <Tab label="Blog Posts" />
      </Tabs>

      {/* CONTACT MESSAGES */}
      {tab === 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Contact Messages
          </Typography>
          {loadingMessages ? (
            <Box textAlign="center" mt={4}>
              <CircularProgress />
            </Box>
          ) : (
            <Stack spacing={2}>
              {messages.map((msg) => (
                <Paper key={msg.id} sx={{ p: 2 }}>
                  <Typography>{msg.message}</Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="caption" color="text.secondary">
                    {new Date(msg.created_at).toLocaleString()}
                  </Typography>
                </Paper>
              ))}
              {messages.length === 0 && (
                <Typography>No messages yet 🍗</Typography>
              )}
            </Stack>
          )}
        </Box>
      )}

      {/* ROAST FEED */}
      {tab === 1 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            All Roasts & Replies
          </Typography>
          {loadingFeed ? (
            <Box textAlign="center" mt={4}>
              <CircularProgress />
            </Box>
          ) : (
            <Stack spacing={2}>
              {feed.map((item) => (
                <Paper key={`${item.type}-${item.id}`} sx={{ p: 2 }}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Typography variant="subtitle1">
                      {item.type === "roast" ? (
                        <>
                          <Chip label="Roast" color="warning" size="small" />{" "}
                          {item.title}
                        </>
                      ) : (
                        <>
                          <Chip label="Reply" color="info" size="small" />{" "}
                          {(item as Reply).roast_title || `#${item.roast_id}`}
                        </>
                      )}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(item.created_at).toLocaleString()}
                    </Typography>
                  </Stack>

                  {item.type === "reply" && (
                    <>
                      {(item as Reply).rating && (
                        <Typography variant="body2">
                          ⭐ {(item as Reply).rating?.toFixed(1)}
                        </Typography>
                      )}
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {(item as Reply).comment || "—"}
                      </Typography>
                    </>
                  )}

                  {item.type === "roast" && (
                    <Typography variant="body2" color="text.secondary">
                      Heat: 🔥 {(item as Roast).heat}
                    </Typography>
                  )}

                  <Divider sx={{ my: 1 }} />
                  <Button
                    size="small"
                    color="error"
                    variant="outlined"
                    onClick={() =>
                      item.type === "roast"
                        ? deleteRoast(item.id)
                        : deleteReply(item.id)
                    }
                  >
                    Delete
                  </Button>
                </Paper>
              ))}
              {feed.length === 0 && (
                <Typography color="text.secondary">
                  No posts or replies yet 🐔
                </Typography>
              )}
            </Stack>
          )}
        </Box>
      )}

      {/* BLOG POSTS */}
      {tab === 2 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Blog Posts
          </Typography>

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

          {newContent && (
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="subtitle1">Preview</Typography>
              <Divider sx={{ mb: 2 }} />
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {newContent}
              </ReactMarkdown>
            </Paper>
          )}

          {successMsg && (
            <Typography color="success.main">{successMsg}</Typography>
          )}
          {errorMsg && (
            <Typography color="error.main">{errorMsg}</Typography>
          )}

          {loadingPosts ? (
            <Box textAlign="center" mt={4}>
              <CircularProgress />
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
                  <Typography variant="caption" color="text.secondary">
                    {new Date(p.created_at).toLocaleString()}
                  </Typography>
                  <Button
                    size="small"
                    color="error"
                    variant="outlined"
                    onClick={() => deletePost(p.id)}
                    sx={{ mt: 1 }}
                  >
                    Delete
                  </Button>
                </Paper>
              ))}
            </Stack>
          )}
        </Box>
      )}
    </Box>
  );
}
