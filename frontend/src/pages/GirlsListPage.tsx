// src/pages/GirlsListPage.tsx
import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Stack,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from "@mui/material";
import { Link } from "react-router-dom";

interface Girl {
  id: number;
  name: string;
  origin?: string;
  shop_name?: string;
  shop_slug?: string;
  last_seen?: string;
  avg_rating?: number;
  views?: number;
}

export default function GirlsListPage() {
  const [girls, setGirls] = useState<Girl[]>([]);
  const [sortBy, setSortBy] = useState("name");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch("/api/girls")
      .then((res) => res.json())
      .then((data) => setGirls(data))
      .catch((err) => console.error("fetch girls fail", err))
      .finally(() => setLoading(false));
  }, []);

  const sorted = [...girls].sort((a, b) => {
    if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
    if (sortBy === "origin") return (a.origin || "").localeCompare(b.origin || "");
    if (sortBy === "views") return (b.views ?? 0) - (a.views ?? 0);
    if (sortBy === "rating") return (b.avg_rating ?? 0) - (a.avg_rating ?? 0);
    return 0;
  });

  return (
    <Stack spacing={2} className="p-4">
      <Typography variant="h5" sx={{ fontWeight: 600 }}>
        👩 All Girls
      </Typography>

      {/* --- Filter / Sort Bar --- */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems="center"
      >
        <FormControl size="small" sx={{ width: 180 }}>
          <InputLabel>Sort by</InputLabel>
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            label="Sort by"
          >
            <MenuItem value="name">Name (A–Z)</MenuItem>
            <MenuItem value="origin">Origin</MenuItem>
            <MenuItem value="views">Views</MenuItem>
            <MenuItem value="rating">Rating</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {/* --- Table --- */}
      {loading ? (
        <Box textAlign="center" mt={4}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Origin</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Shop</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Last Seen</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Rating</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Views</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.map((g, i) => (
                <TableRow
                  key={i}
                  hover
                  sx={{
                    bgcolor: i % 2 === 0 ? "background.paper" : "grey.50",
                  }}
                >
                  <TableCell>
                    <Link to={`/girls/${g.id}`}>{g.name || "—"}</Link>
                  </TableCell>
                  <TableCell>{g.origin || "—"}</TableCell>
                  <TableCell>
                    {g.shop_slug ? (
                      <Link to={`/shops/${g.shop_slug}`}>
                        {g.shop_name || "—"}
                      </Link>
                    ) : (
                      g.shop_name || "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {g.last_seen
                      ? new Date(g.last_seen).toLocaleDateString("en-AU")
                      : "—"}
                  </TableCell>
                  <TableCell>{g.avg_rating?.toFixed(1) ?? "—"}</TableCell>
                  <TableCell>{g.views ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  );
}
