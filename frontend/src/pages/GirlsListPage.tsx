// src/pages/GirlsListPage.tsx
import { useEffect, useMemo, useState } from "react";
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
  Pagination,
  TextField,
  IconButton,
} from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ClearIcon from "@mui/icons-material/Clear";
import { Link } from "react-router-dom";
import { normalizeOrigin } from "../utils/normalize";

type SortKey = "views" | "avg_rating";
type SortDir = "asc" | "desc";

interface Girl {
  id: number;
  name: string;
  origin?: string | null;
  shop_name?: string | null;
  shop_slug?: string | null;
  last_seen?: string | null;
  avg_rating?: number | null;
  views?: number | null;
}

interface ShopMini {
  id: number;
  name: string;
  slug: string;
}

const PAGE_SIZE = 25;
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

/* ---------------- Sort header ---------------- */
function SortHeader({
  label,
  active,
  dir,
  onToggle,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onToggle: () => void;
}) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={0.5}
      sx={{
        cursor: "pointer",
        color: active ? "#e65100" : "#666",
        fontWeight: active ? 700 : 600,
        userSelect: "none",
        "&:hover": { color: "#d84315", transform: "translateY(-1px)" },
        transition: "color 0.2s, transform 0.1s",
      }}
      onClick={onToggle}
    >
      <Typography variant="body2">{label}</Typography>
      <Box component="span" sx={{ display: "flex", alignItems: "center", ml: 0.2 }}>
        {dir === "asc" ? (
          <ArrowUpwardIcon sx={{ fontSize: 16 }} />
        ) : (
          <ArrowDownwardIcon sx={{ fontSize: 16 }} />
        )}
      </Box>
    </Stack>
  );
}

/* ---------------- Main page ---------------- */
export default function GirlsListPage() {
  const [girls, setGirls] = useState<Girl[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [shops, setShops] = useState<ShopMini[]>([]);
  const [filterOrigin, setFilterOrigin] = useState<string>("");
  const [filterShop, setFilterShop] = useState<string>("");
  const [searchName, setSearchName] = useState<string>("");

  const [sortKey, setSortKey] = useState<SortKey>("views");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [isSorting, setIsSorting] = useState(false);
  const [page, setPage] = useState(1);

  /* -------- fetch girls -------- */
  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`${API_BASE}/api/girls`)
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) throw new Error("Invalid response");
        setGirls(data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  /* -------- fetch shops -------- */
  useEffect(() => {
    fetch("/api/shops")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const minis: ShopMini[] = data
            .filter((s: any) => s.slug && s.name)
            .map((s: any) => ({ id: s.id, name: s.name, slug: s.slug }));
          setShops(minis);
        }
      })
      .catch(() => {});
  }, []);

  /* -------- unique normalized origins -------- */
  const origins = useMemo(() => {
    const set = new Set<string>();
    girls.forEach((g) => {
      const o = normalizeOrigin(g.origin || "");
      if (o) set.add(o);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [girls]);

  /* -------- sorting toggle -------- */
  const triggerSort = (key: SortKey) => {
    setIsSorting(true);
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
    setTimeout(() => setIsSorting(false), 150);
    setPage(1);
  };

  /* -------- data processing -------- */
  const processed = useMemo(() => {
    let rows = girls.slice();

    // filter by origin
    if (filterOrigin) {
      rows = rows.filter((g) => normalizeOrigin(g.origin || "") === filterOrigin);
    }

    // filter by shop
    if (filterShop) {
      rows = rows.filter((g) => g.shop_slug === filterShop);
    }

    // search by name (case-insensitive + accent-safe)
    if (searchName.trim()) {
      const term = searchName
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "");
      rows = rows.filter((g) => {
        const name = (g.name || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/\p{Diacritic}/gu, "");
        return name.includes(term);
      });
    }

    // sort
    const mult = sortDir === "asc" ? 1 : -1;
    if (sortKey === "views") {
      rows.sort((a, b) => ((a.views ?? 0) - (b.views ?? 0)) * mult);
    } else if (sortKey === "avg_rating") {
      rows.sort((a, b) => ((a.avg_rating ?? 0) - (b.avg_rating ?? 0)) * mult);
    }

    // fallback: recent first
    rows.sort((a, b) => {
      const ta = a.last_seen ? new Date(a.last_seen).getTime() : 0;
      const tb = b.last_seen ? new Date(b.last_seen).getTime() : 0;
      return tb - ta;
    });

    return rows;
  }, [girls, filterOrigin, filterShop, searchName, sortKey, sortDir]);

  /* -------- pagination -------- */
  const pageCount = Math.max(1, Math.ceil(processed.length / PAGE_SIZE));
  const pageRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return processed.slice(start, start + PAGE_SIZE);
  }, [processed, page]);

  /* -------- render -------- */
  return (
    <Stack spacing={2} sx={{ alignItems: "center" }}>
      <Typography variant="h5" sx={{ fontWeight: 600 }}>
        👩 Girls — Tap headers to sort
      </Typography>

      {/* Filters + search */}
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        flexWrap="wrap"
        sx={{ width: "95vw", maxWidth: 1100, justifyContent: "center" }}
      >
        {/* Search name */}
        <Box sx={{ display: "flex", alignItems: "center", flex: 1, minWidth: 220 }}>
          <TextField
            size="small"
            label="Search Name"
            value={searchName}
            onChange={(e) => {
              setSearchName(e.target.value);
              setPage(1);
            }}
            fullWidth
          />
          {searchName && (
            <IconButton size="small" onClick={() => setSearchName("")}>
              <ClearIcon fontSize="small" />
            </IconButton>
          )}
        </Box>

        {/* Origin filter */}
        <FormControl size="small" sx={{ minWidth: 180, flex: 1 }}>
          <InputLabel>Nationality</InputLabel>
          <Select
            value={filterOrigin}
            label="Nationality"
            onChange={(e) => {
              setFilterOrigin(e.target.value);
              setPage(1);
            }}
            MenuProps={{ PaperProps: { sx: { maxHeight: 360 } } }}
          >
            <MenuItem value="">All Nationalities</MenuItem>
            {origins.map((o) => (
              <MenuItem key={o} value={o}>
                {o}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Shop filter */}
        <FormControl size="small" sx={{ minWidth: 180, flex: 1 }}>
          <InputLabel>Shop</InputLabel>
          <Select
            value={filterShop}
            label="Shop"
            onChange={(e) => {
              setFilterShop(e.target.value);
              setPage(1);
            }}
            MenuProps={{ PaperProps: { sx: { maxHeight: 360 } } }}
          >
            <MenuItem value="">All Shops</MenuItem>
            {shops
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((s) => (
                <MenuItem key={s.slug} value={s.slug}>
                  {s.name}
                </MenuItem>
              ))}
          </Select>
        </FormControl>
      </Stack>

      {/* Table */}
      {loading ? (
        <Box textAlign="center" mt={4}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error">Failed to load girls: {error}</Typography>
      ) : (
        <>
          <TableContainer
            component={Paper}
            sx={{
              borderRadius: 2,
              transition: "opacity 120ms",
              opacity: isSorting ? 0.7 : 1,
              width: "95vw",
              maxWidth: 1100,
            }}
          >
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Nationality</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    <SortHeader
                      label="Views"
                      active={sortKey === "views"}
                      dir={sortDir}
                      onToggle={() => triggerSort("views")}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    <SortHeader
                      label="Rating"
                      active={sortKey === "avg_rating"}
                      dir={sortDir}
                      onToggle={() => triggerSort("avg_rating")}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Shop</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {pageRows.map((g, i) => (
                  <TableRow
                    key={g.id ?? i}
                    hover
                    sx={{
                      bgcolor: i % 2 === 0 ? "background.paper" : "grey.50",
                      "&:hover": { bgcolor: "#fff7f0" },
                      transition: "background-color 120ms",
                    }}
                  >
                    <TableCell>{g.name || "—"}</TableCell>
                    <TableCell>{normalizeOrigin(g.origin || "—")}</TableCell>
                    <TableCell>{g.views ?? 0}</TableCell>
                    <TableCell>
                      {g.avg_rating != null ? Number(g.avg_rating).toFixed(1) : "—"}
                    </TableCell>
                    <TableCell>
                      {g.shop_slug ? (
                        <Link to={`/shops/${g.shop_slug}`}>{g.shop_name}</Link>
                      ) : (
                        g.shop_name || "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
            <Pagination
              count={pageCount}
              page={page}
              onChange={(_, v) => setPage(v)}
              color="primary"
              size="small"
            />
          </Box>
        </>
      )}
    </Stack>
  );
}
