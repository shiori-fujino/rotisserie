import { useEffect, useState } from "react";
import {
  Box,
  Stack,
  Typography,
  Paper,
  Divider,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
} from "@mui/material";
import { useParams } from "react-router-dom";
import RosterGrid from "../components/RosterGrid";
import type { RosterItem } from "../types";
import { normalizeOrigin } from "../utils/normalize"; // ✅ normalization imported

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

interface Girl {
  id: number;
  name: string;
  origin?: string | null;
  profile_url?: string | null;
  photo_url?: string | null;
  avg_rating?: number | null; // ✅ added rating
}

interface Shop {
  id: number;
  name: string;
  slug: string;
  address?: string | null;
  phone?: string | null;
  url?: string | null;
  area?: string | null;
  last_scraped?: string | null;
  girls?: Girl[];
  roster_today?: Girl[];
}

export default function ShopPage() {
  const { slug } = useParams<{ slug: string }>();
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<RosterItem | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    fetch(`${API_BASE}/api/shops/${slug}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data || !data.id) throw new Error("Invalid response");
        setShop(data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading)
    return (
      <Box sx={{ textAlign: "center", mt: 6 }}>
        <CircularProgress />
      </Box>
    );

  if (error)
    return (
      <Typography color="error" sx={{ mt: 4, textAlign: "center" }}>
        Failed to load shop: {error}
      </Typography>
    );

  if (!shop)
    return (
      <Typography sx={{ mt: 4, textAlign: "center" }}>
        Shop not found.
      </Typography>
    );

  /* ---------- mapping util ---------- */
  const mapToRosterItem = (g: Girl): RosterItem => ({
    id: g.id,
    shop: shop.name,
    name: g.name,
    origin: normalizeOrigin(g.origin || ""),
    profileUrl: g.profile_url ?? "",
    photo: g.photo_url ?? "",
    photos: g.photo_url ? [g.photo_url] : [],
    avgRating: g.avg_rating ?? undefined,
  });

  const rosterItems = (shop.roster_today ?? []).map(mapToRosterItem);
  const allGirls = (shop.girls ?? []).map(mapToRosterItem);

  return (
    <Stack spacing={3} sx={{ alignItems: "center" }}>
      {/* ---------- Header ---------- */}
      <Paper
        sx={{
          p: 3,
          width: "95vw",
          maxWidth: 1100,
          borderRadius: 2,
          boxShadow: "0 0 4px rgba(0,0,0,0.05)",
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {shop.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {shop.area || "—"} · {shop.address || "No address listed"}
        </Typography>
        {shop.url && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            <a href={shop.url} target="_blank" rel="noreferrer">
              {shop.url}
            </a>
          </Typography>
        )}
        {shop.phone && (
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            📞 {shop.phone}
          </Typography>
        )}
      </Paper>

      {/* ---------- Today’s roster ---------- */}
      <Paper
        sx={{
          p: 3,
          width: "95vw",
          maxWidth: 1100,
          borderRadius: 2,
          boxShadow: "0 0 4px rgba(0,0,0,0.05)",
        }}
      >
        <Stack spacing={1}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
  Today’s Roster
  {rosterItems.length > 0 && (
    <Typography
      component="span"
      variant="subtitle2"
      sx={{
        ml: 1,
        color: "text.secondary",
        fontWeight: 500,
      }}
    >
      ({rosterItems.length})
    </Typography>
  )}
</Typography>

          <Divider />
          {rosterItems.length > 0 ? (
            <RosterGrid
  items={rosterItems}
  layout="grid"
  onSelect={(girl) => setSelected!(girl)}
/>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No roster available today.
            </Typography>
          )}
        </Stack>
      </Paper>

      {/* ---------- All girls (archive) ---------- */}
      <Paper
        sx={{
          p: 3,
          width: "95vw",
          maxWidth: 1100,
          borderRadius: 2,
          boxShadow: "0 0 4px rgba(0,0,0,0.05)",
        }}
      >
        <Stack spacing={1}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
  All Girls
  {allGirls.length > 0 && (
    <Typography
      component="span"
      variant="subtitle2"
      sx={{
        ml: 1,
        color: "text.secondary",
        fontWeight: 500,
      }}
    >
      ({allGirls.length})
    </Typography>
  )}
</Typography>
          <Divider />

          {allGirls.length > 0 ? (
            <TableContainer component={Paper} sx={{ mt: 1, borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Photo</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Origin</TableCell>
                    <TableCell>Rating</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {allGirls.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell>
                        {g.photo ? (
                          <img
                            src={g.photo}
                            alt={g.name}
                            style={{
                              width: 60,
                              height: 60,
                              objectFit: "cover",
                              borderRadius: 4,
                            }}
                          />
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {g.profileUrl ? (
                          <a
                            href={g.profileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ textDecoration: "none", color: "#e65100" }}
                          >
                            {g.name}
                          </a>
                        ) : (
                          g.name || "—"
                        )}
                      </TableCell>
                      <TableCell>{normalizeOrigin(g.origin || "—")}</TableCell>
                      <TableCell>
                        {g.avgRating != null
                          ? g.avgRating.toFixed(1)
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No girl data recorded for this shop.
            </Typography>
          )}
        </Stack>
      </Paper>

      {/* ---------- Footer meta ---------- */}
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ mt: 2, mb: 4 }}
      >
        Last scraped:{" "}
        {shop.last_scraped
          ? new Date(shop.last_scraped).toLocaleString()
          : "Unknown"}
      </Typography>
    </Stack>
  );
}
