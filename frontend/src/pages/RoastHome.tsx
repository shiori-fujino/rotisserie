//roasthome.tsx


import { useEffect, useState } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  TextField,
  Button,
  MenuItem,
  Stack,
  ToggleButtonGroup,
  ToggleButton,
  Divider,
  FormControl,
  Select,
  InputLabel,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../config";

interface Roast {
  id: number;
  title: string;
  category: string;
  created_at: string;
  pinned: boolean;
  heat: number;
  girl_id: number | null;
}

const categories = [
  { value: "all", label: "All" },
  { value: "girl", label: "Girls" },
  { value: "general", label: "General" },
  { value: "story", label: "Story" },
  { value: "health", label: "Health" },
  { value: "fun", label: "Fun" },
  { value: "qna", label: "Q&A" },
];

export default function RoastHome() {
  const [roasts, setRoasts] = useState<Roast[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortMode, setSortMode] = useState<"newest" | "hottest">("newest");
  const navigate = useNavigate();

  /* -------------------------------- fetch roasts -------------------------------- */
  useEffect(() => {
    setLoading(true);
    axios
      .get(`${API_BASE}/api/roasts`)
      .then((res) => setRoasts(res.data))
      .catch((err) => console.error("Error fetching roasts:", err))
      .finally(() => setLoading(false));
  }, []);

  /* ----------------------------- create new roast ----------------------------- */
  const handleCreateRoast = async () => {
    if (!newTitle.trim()) return;
    try {
      const res = await axios.post(`${API_BASE}/api/roasts`, {
        title: newTitle,
        category: newCategory,
      });
      setRoasts((prev) => [res.data, ...prev]);
      setNewTitle("");
      setNewCategory("general");
    } catch (err) {
      console.error("Error creating roast:", err);
    }
  };

  /* ----------------------------- heat up a roast ----------------------------- */
  const handleAddHeat = (roastId: number) => {
    // optimistic update
    setRoasts((prev) =>
      prev.map((r) =>
        r.id === roastId ? { ...r, heat: (r.heat || 0) + 1 } : r
      )
    );

    axios
      .post(`${API_BASE}/api/roasts/${roastId}/heat`)
      .then((res) => {
        setRoasts((prev) =>
          prev.map((r) => (r.id === roastId ? res.data : r))
        );
      })
      .catch((err) => {
        console.error("Error adding heat:", err);
        // rollback if failed
        setRoasts((prev) =>
          prev.map((r) =>
            r.id === roastId ? { ...r, heat: Math.max(0, (r.heat || 1) - 1) } : r
          )
        );
      });
  };

  /* ----------------------------- filters & sorting ----------------------------- */
  const filtered = roasts.filter((r) => {
    if (categoryFilter === "all") return true;
    return r.category === categoryFilter;
  });

  const sorted =
    sortMode === "hottest"
      ? [...filtered].sort((a, b) => (b.heat || 0) - (a.heat || 0))
      : [...filtered].sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        );

  /* ----------------------------------- UI ----------------------------------- */
  if (loading) {
    return (
      <Stack alignItems="center" sx={{ py: 8 }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading roasts…🔥</Typography>
      </Stack>
    );
  }

  return (
    <Box p={0} sx={{ maxWidth: 900, mx: "auto" }}>
      {/* New Roast Form */}
      <Box mb={3} component={Paper} sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Start Roasting 🔥
        </Typography>
        <TextField
          fullWidth
          label="What's on your mind?"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          select
          label="Category"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          sx={{ mb: 2, minWidth: 200 }}
        >
          {categories
            .filter((c) => c.value !== "all" && c.value !== "girl")
            .map((c) => (
              <MenuItem key={c.value} value={c.value}>
                {c.label}
              </MenuItem>
            ))}
        </TextField>
        <Button variant="contained" onClick={handleCreateRoast}>
          Throw it on the Board
        </Button>
      </Box>

      {/* Filters */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
      >
        <FormControl sx={{ minWidth: 140 }}>
          <InputLabel>Category</InputLabel>
          <Select
            value={categoryFilter}
            label="Category"
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            {categories.map((c) => (
              <MenuItem key={c.value} value={c.value}>
                {c.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <ToggleButtonGroup
          value={sortMode}
          exclusive
          onChange={(_, val) => val && setSortMode(val)}
          size="small"
        >
          <ToggleButton value="newest">🕒 Newest</ToggleButton>
          <ToggleButton value="hottest">🔥 Hottest</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <Divider sx={{ mb: 2 }} />

      {/* Roast List */}
      {sorted.length === 0 ? (
        <Typography color="text.secondary">
          No roasts found. Be the first to post!
        </Typography>
      ) : (
        sorted.map((roast) => (
          <Paper
            key={roast.id}
            sx={{
              p: 2,
              mb: 2,
              borderLeft: roast.pinned
                ? "4px solid orange"
                : "2px solid #eee",
              "&:hover": { boxShadow: 3, cursor: "pointer" },
              bgcolor:
                roast.heat > 20
                  ? "rgba(255, 69, 0, 0.08)"
                  : "background.paper",
            }}
            onClick={() => navigate(`/roast/${roast.id}`)}
          >
            <Typography
              variant="h6"
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span>{roast.title}</span>
              <Button
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddHeat(roast.id);
                }}
              >
                🔥 {roast.heat}
              </Button>
            </Typography>

            <Typography variant="body2" color="text.secondary">
              {roast.category.toUpperCase()} ·{" "}
              {new Date(roast.created_at).toLocaleString()}
            </Typography>
          </Paper>
        ))
      )}
    </Box>
  );
}
