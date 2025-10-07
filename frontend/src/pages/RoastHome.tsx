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
  views: number;
  replies_count: number;
  girl_id: number | null;
}

const categories = [
  { value: "all", label: "All" },
  { value: "girl", label: "Girls" },
  { value: "general", label: "General" },
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
const placeholders = [
  "What’s the latest gossip?",
  "Confess your addiction 💀",
  "Which shop is secretly overrated?",
  "Drop your Sunday night regrets",
  "Spotted something wild this week? 👀",
];

const randomPlaceholder =
  placeholders[Math.floor(Math.random() * placeholders.length)];
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
  multiline
  minRows={3}
  placeholder={randomPlaceholder}
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
  <Typography color="text.secondary">No roasts found. Be the first to post!</Typography>
) : (
<Stack divider={<Divider flexItem />} spacing={1}>
  {sorted.map((r) => (
    <Box
      key={r.id}
      onClick={() => navigate(`/roast/${r.id}`)}
      sx={{
        py: 1,
        px: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        "&:hover": { bgcolor: "rgba(255,255,255,0.03)", cursor: "pointer" },
      }}
    >
      {/* Left: emoji + title */}
      <Typography
        sx={{
          flex: 6,
          fontWeight: 500,
          fontSize: 15,
          display: "flex",
          alignItems: "center",
          gap: 1,
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
        }}
      >
        <span style={{ opacity: 0.7 }}>
          {r.category === "fun"
            ? "🎉"
            : r.category === "story"
            ? "☕️"
            : r.category === "qna"
            ? "⁇"
            : r.category === "health"
            ? "💊"
            : r.category === "girl"
            ? "💦"
            : "🔥"}
        </span>
        {r.title}
      </Typography>

      {/* Right: date + stats */}
      <Box
        sx={{
          flex: 4,
          display: "flex",
          justifyContent: "flex-end",
          gap: 2,
          fontSize: 13,
          color: "text.secondary",
          whiteSpace: "nowrap",
        }}
      >
        <Typography>
          {new Date(r.created_at).toLocaleDateString("en-AU", {
            day: "numeric",
            month: "long", // ✅ “October” instead of “Oct”
          })}
        </Typography>
        <Typography>👀 {r.views ?? 0}</Typography>
        <Typography>💬 {r.replies_count ?? 0}</Typography>
      </Box>
    </Box>
  ))}
</Stack>

)}

    </Box>
  );
}
