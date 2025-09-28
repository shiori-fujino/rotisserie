// src/pages/DataPage.tsx
import { useEffect, useState } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  CircularProgress,
} from "@mui/material";
import { API_BASE } from "../config";

interface Stats {
  daysOnline: number;
  visitsToday: number;
  visitsTotal: number;
  girlsToday: number;
  girlsTotal: number;
  commentsToday: number;
  commentsTotal: number;
  viewsTotal: number;
}

export default function DataPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch(`${API_BASE}/api/stats`);
        const json = await res.json();
        setStats(json);
      } catch (err) {
        console.error("Failed to fetch stats", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Typography variant="h4" gutterBottom>
        📊 Site Data
      </Typography>

      {loading && (
        <Box textAlign="center" py={6}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>Loading stats…</Typography>
        </Box>
      )}

      {!loading && stats && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 3,
          }}
        >
          {[
            ["Days Online", stats.daysOnline],
            ["Visits Today", stats.visitsToday],
            ["Total Visits", stats.visitsTotal],
            ["Girls Today", stats.girlsToday],
            ["Total Girls", stats.girlsTotal],
            ["Comments Today", stats.commentsToday],
            ["Total Comments", stats.commentsTotal],
            ["Total Views", stats.viewsTotal],
          ].map(([label, value]) => (
            <Paper key={label} sx={{ p: 3, textAlign: "center" }}>
              <Typography variant="h6">{label}</Typography>
              <Typography variant="h4">{value as number}</Typography>
            </Paper>
          ))}
        </Box>
      )}
    </Container>
  );
}
