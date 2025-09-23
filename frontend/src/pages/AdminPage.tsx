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

interface ContactMessage {
  id: number;
  message: string;
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

  const login = async () => {
    try {
      const res = await axios.post("/api/auth/login", { username, password });
      localStorage.setItem("admin_token", res.data.token);
      setToken(res.data.token);
    } catch (err) {
      alert("Login failed. Check your credentials.");
    }
  };

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
            // Token expired/invalid → force re-login
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
        <Tab label="(Future) Blog Posts" />
        <Tab label="(Future) Analytics" />
      </Tabs>

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

      {tab === 1 && (
        <Box>
          <Typography variant="h6">Blog Posts (coming soon…)</Typography>
        </Box>
      )}

      {tab === 2 && (
        <Box>
          <Typography variant="h6">Analytics (coming soon…)</Typography>
        </Box>
      )}
    </Box>
  );
}
