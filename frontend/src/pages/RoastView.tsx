// src/pages/RoastView.tsx
import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Button,
  TextField,
  Stack,
  Link,
} from "@mui/material";
import { useParams } from "react-router-dom";
import { API_BASE } from "../config";

interface Roast {
  id: number;
  title: string;
  category: string;
  created_at: string;
  heat: number;
  girl_id: number | null;
}

interface Reply {
  id: number;
  parent_id: number | null;
  user_mask: string | null;
  comment: string | null;
  rating: number | null;
  heat: number;
  created_at: string;
}

interface GirlInfo {
  id: number;
  name: string;
  photo: string | null;
  profile_url: string;
  views?: number;
}

export default function RoastView() {
  const { id } = useParams<{ id: string }>();
  const [roast, setRoast] = useState<Roast | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [girl, setGirl] = useState<GirlInfo | null>(null);
  const [avgRating, setAvgRating] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);

  useEffect(() => {
  axios.post(`${API_BASE}/api/roasts/${id}/view`).catch(() => {});
}, [id]);

  /* -------------------------------------------------------------------------- */
  /* Fetch roast + replies                                                      */
  /* -------------------------------------------------------------------------- */
  useEffect(() => {
    if (!id) return;
    setLoading(true);

    const fetchAll = async () => {
      try {
        const roastRes = await axios.get(`${API_BASE}/api/roasts/${id}`);
        const roastData = roastRes.data.roast || roastRes.data;
        setRoast(roastData);

        const repliesRes = await axios.get(`${API_BASE}/api/roasts/${id}/replies`);
        setReplies(repliesRes.data.replies);
        setAvgRating(repliesRes.data.avgRating);

        // Fetch girl info only if it's a girl-type roast
        if (roastData.category === "girl" && roastData.girl_id) {
  try {
    const g = await axios.get(`${API_BASE}/api/girls/${roastData.girl_id}`);
    setGirl(g.data);

    // 🔥 NEW: also fetch + increment views like GirlModal does
    const v = await axios.post(`${API_BASE}/api/views/${roastData.girl_id}`);
    setGirl((prev) => prev ? { ...prev, views: v.data.views } : prev);
  } catch (err) {
    console.warn("⚠️ girl not found or no views:", roastData.girl_id);
  }
}

      } catch (err) {
        console.error("Error fetching roast view:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [id]);

  /* -------------------------------------------------------------------------- */
  /* Scroll to hash (#123) when present                                         */
  /* -------------------------------------------------------------------------- */
  useEffect(() => {
    if (window.location.hash) {
      const el = document.querySelector(window.location.hash);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("highlighted-comment");
        setTimeout(() => el.classList.remove("highlighted-comment"), 2500);
      }
    }
  }, [replies]);

  /* -------------------------------------------------------------------------- */
  /* Helpers                                                                    */
  /* -------------------------------------------------------------------------- */
  const renderLinkedText = (text: string) => {
    const parts = text.split(/(>>\d+)/g);
    return parts.map((part, i) => {
      const match = part.match(/>>(\d+)/);
      if (match) {
        const target = match[1];
        return (
          <Link
            key={i}
            href={`#${target}`}
            underline="hover"
            color="primary"
            onClick={() => {
              const el = document.getElementById(`comment-${target}`);
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
                el.classList.add("highlighted-comment");
                setTimeout(() => el.classList.remove("highlighted-comment"), 2500);
              }
            }}
          >
            {part}
          </Link>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  const handleSubmitReply = async (parentId: number | null = null) => {
    if (!replyText.trim()) return;
    try {
      await axios.post(`${API_BASE}/api/roasts/${id}/replies`, {
        comment: replyText.trim(),
        parent_id: parentId,
      });
      setReplyText("");
      setReplyTo(null);

      const res = await axios.get(`${API_BASE}/api/roasts/${id}/replies`);
      setReplies(res.data.replies);
      setAvgRating(res.data.avgRating);
    } catch (err) {
      console.error("Error posting reply:", err);
    }
  };

  const handleAddHeat = async () => {
    if (!roast) return;
    setRoast((prev) => (prev ? { ...prev, heat: prev.heat + 1 } : prev));
    try {
      const res = await axios.post(`${API_BASE}/api/roasts/${roast.id}/heat`);
      setRoast(res.data);
    } catch (err) {
      console.error("Error adding heat:", err);
    }
  };

  const topLevel = useMemo(() => replies.filter((r) => !r.parent_id), [replies]);
  const replyMap = useMemo(() => {
    const m: Record<number, Reply[]> = {};
    for (const r of replies) {
      if (r.parent_id) {
        if (!m[r.parent_id]) m[r.parent_id] = [];
        m[r.parent_id].push(r);
      }
    }
    return m;
  }, [replies]);

  /* -------------------------------------------------------------------------- */
  /* Loading + Empty States                                                     */
  /* -------------------------------------------------------------------------- */
  if (loading)
    return (
      <Stack alignItems="center" sx={{ py: 8 }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Cooking roast…🍗</Typography>
      </Stack>
    );

  if (!roast) return <Typography>Roast not found.</Typography>;

  /* -------------------------------------------------------------------------- */
  /* UI                                                                         */
  /* -------------------------------------------------------------------------- */
  return (
    <Box sx={{ maxWidth: 800, mx: "auto", p: 0 }}>
      {/* ───────────── HEADER ───────────── */}
      <Paper
        elevation={1}
        sx={{
          p: 3,
          mb: 4,
          borderRadius: 3,
          background: "linear-gradient(145deg, #fff 0%, #fafafa 100%)",
          border: "1px solid #eee",
        }}
      >
        {/* Title + Heat */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 1 }}
        >
          <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2, pr: 2 }}>
            {roast.title}
          </Typography>
          <Button
            size="small"
            onClick={handleAddHeat}
            sx={{
              borderRadius: 2,
              backgroundColor: "#fff3e0",
              color: "#e65100",
              fontWeight: 600,
              "&:hover": { backgroundColor: "#ffe0b2" },
            }}
          >
            🔥 {roast.heat}
          </Button>
        </Stack>

        {/* Meta info */}
        <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mt: 0.5 }}>
  <Typography variant="body2" color="text.secondary">
    {(roast.category || "general").toUpperCase()}
  </Typography>
  <Typography variant="body2" color="text.secondary">
    🕓{" "}
    {roast.created_at
      ? new Date(roast.created_at).toLocaleString("en-AU", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "N/A"}
  </Typography>
  <Typography variant="body2" color="text.secondary">
    💬 {replies.length} replies
  </Typography>
</Stack>


        {/* Girl Info */}
        {girl && (
  <Stack
    direction="row"
    alignItems="center"
    spacing={2.5}
    sx={{
      p: 2,
      mt: 2,
      border: "1px solid #eee",
      borderRadius: 2,
      backgroundColor: "#fcfcfc",
    }}
  >
    {/* thumbnail */}
    <Box
      component="img"
      src={girl.photo || "/fallback.jpg"}
      alt={girl.name}
      sx={{
        width: 72,
        height: 72,
        borderRadius: 2,
        objectFit: "cover",
        flexShrink: 0,
        boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
      }}
    />

    {/* info */}
    <Stack spacing={0.5} sx={{ flexGrow: 1 }}>
      <Typography variant="subtitle1" fontWeight={600}>
        {girl.name}
      </Typography>

      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
        {avgRating > 0 && (
          <Typography variant="body2" color="text.secondary">
            ⭐ {avgRating.toFixed(1)}
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary">
          👁️ {girl?.views ?? 0} views
        </Typography>
        <Link
          href={girl.profile_url}
          target="_blank"
          rel="noreferrer"
          underline="hover"
          color="primary"
          sx={{ fontSize: 14 }}
        >
          Visit Profile ↗
        </Link>
      </Stack>
    </Stack>
  </Stack>
)}

      </Paper>

      {/* ───────────── REPLIES ───────────── */}
      <Stack spacing={2}>
        {topLevel.map((r) => (
          <Box
            key={r.id}
            id={`comment-${r.id}`}
            sx={{
              p: 2,
              border: "1px solid #eee",
              borderRadius: 1,
              backgroundColor: "background.paper",
            }}
          >
            <Typography variant="caption" color="text.secondary">
              🪪 {r.user_mask || "Anon"} ·{" "}
              <Link href={`#${r.id}`} underline="hover" color="text.secondary">
                No.{r.id}
              </Link>{" "}
              · {new Date(r.created_at).toLocaleString()}
            </Typography>

            {r.rating && (
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                ⭐ {Number(r.rating).toFixed(1)}
              </Typography>
            )}

            <Typography variant="body1" sx={{ mt: 0.5 }}>
              {r.comment ? renderLinkedText(r.comment) : <i>(no text)</i>}
            </Typography>

            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Button size="small" onClick={() => setReplyTo(r.id)}>
                Reply
              </Button>
            </Stack>

            {/* Nested replies */}
            {replyMap[r.id]?.map((child) => (
              <Box
                key={child.id}
                id={`comment-${child.id}`}
                sx={{
                  ml: 4,
                  mt: 1,
                  p: 1.5,
                  borderLeft: "2px solid #eee",
                  borderRadius: 1,
                  backgroundColor: "rgba(0,0,0,0.02)",
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  🪪 {child.user_mask || "Anon"} ·{" "}
                  <Link href={`#${child.id}`} underline="hover" color="text.secondary">
                    No.{child.id}
                  </Link>{" "}
                  · {new Date(child.created_at).toLocaleString()}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {child.comment ? renderLinkedText(child.comment) : <i>(no text)</i>}
                </Typography>
              </Box>
            ))}

            {/* reply input */}
            {replyTo === r.id && (
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
                  onClick={() => handleSubmitReply(r.id)}
                  disabled={!replyText.trim()}
                >
                  Post Reply
                </Button>
              </Stack>
            )}
          </Box>
        ))}

        {/* New top-level reply */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            Add a Reply
          </Typography>
          <Stack spacing={1} sx={{ mt: 1 }}>
            <TextField
              label="Your comment"
              multiline
              rows={3}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              fullWidth
            />
            <Button
              variant="contained"
              onClick={() => handleSubmitReply(null)}
              disabled={!replyText.trim()}
            >
              Submit
            </Button>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}
