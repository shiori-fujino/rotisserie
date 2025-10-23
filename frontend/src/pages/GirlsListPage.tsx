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
  Drawer,
  Divider,
  Chip,
  Card,
  CardContent,
} from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ClearIcon from "@mui/icons-material/Clear";
import CloseIcon from "@mui/icons-material/Close";
import StarIcon from "@mui/icons-material/Star";
import { Link } from "react-router-dom";
import { normalizeOrigin } from "../utils/normalize";
import NationalityTrendsChart from "../components/NationalityTrendsChart";

type SortKey = "views" | "avg_rating" | "last_seen";
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

interface GirlDetail extends Girl {
  photo_url?: string | null;
  photos?: string[] | null;
  bio?: string | null;
  age?: number | null;
  height?: number | null;
  measurements?: string | null;
  languages?: string[] | null;
  services?: string[] | null;
  reviews?: Review[] | null;
  // add any other detailed fields you have
}

interface Review {
  id: number;
  rating: number;
  comment: string;
  created_at: string;
  author?: string | null;
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

  const [sortKey, setSortKey] = useState<SortKey>("last_seen");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [isSorting, setIsSorting] = useState(false);
  const [page, setPage] = useState(1);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedGirl, setSelectedGirl] = useState<GirlDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

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
  return Array.from(set).sort((a, b) => {
    // Always put "Other" at the end
    if (a === "Other") return 1;
    if (b === "Other") return -1;
    return a.localeCompare(b);
  });
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
    } else if (sortKey === "last_seen") {
      rows.sort((a, b) => {
        const ta = a.last_seen ? new Date(a.last_seen).getTime() : 0;
        const tb = b.last_seen ? new Date(b.last_seen).getTime() : 0;
        return (ta - tb) * mult;
      });
    }

    return rows;
  }, [girls, filterOrigin, filterShop, searchName, sortKey, sortDir]);

  /* -------- pagination -------- */
  const pageCount = Math.max(1, Math.ceil(processed.length / PAGE_SIZE));
  const pageRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return processed.slice(start, start + PAGE_SIZE);
  }, [processed, page]);

  /* -------- format date -------- */
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return date.toLocaleDateString();
  };

  /* -------- open girl details -------- */
  const handleOpenGirl = async (girl: Girl) => {
    setDrawerOpen(true);
    setSelectedGirl(girl as GirlDetail); // Show basic data immediately
    setLoadingDetail(true);
    
    try {
      const response = await fetch(`${API_BASE}/api/girls/${girl.id}`);
      if (!response.ok) throw new Error("Failed to fetch details");
      const detailData: GirlDetail = await response.json();
      setSelectedGirl(detailData);
    } catch (error) {
      console.error("Error fetching girl details:", error);
      // Keep the basic data if fetch fails
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => {
      setSelectedGirl(null);
      setLoadingDetail(false);
    }, 200);
  };

  /* -------- render -------- */
  return (
    <Stack spacing={2} sx={{ alignItems: "center" }}>
      <Typography variant="h5" sx={{ fontWeight: 600 }}>
        👩 Girls — Tap headers to sort
      </Typography>
{!loading && processed.length > 0 && (
        <Box sx={{ width: "95vw", maxWidth: 1100 }}>
          <NationalityTrendsChart />
        </Box>
      )}
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
                  <TableCell sx={{ fontWeight: 600 }}>
                    <SortHeader
                      label="Last Seen"
                      active={sortKey === "last_seen"}
                      dir={sortDir}
                      onToggle={() => triggerSort("last_seen")}
                    />
                  </TableCell>
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
                    <TableCell>
                      <Typography
                        component="span"
                        sx={{
                          color: "#e65100",
                          fontWeight: 600,
                          cursor: "pointer",
                          "&:hover": { textDecoration: "underline", color: "#d84315" },
                        }}
                        onClick={() => handleOpenGirl(g)}
                      >
                        {g.name || "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>{normalizeOrigin(g.origin || "—")}</TableCell>
                    <TableCell>{g.views ?? 0}</TableCell>
                    <TableCell>
                      {g.avg_rating != null ? Number(g.avg_rating).toFixed(1) : "—"}
                    </TableCell>
                    <TableCell>{formatDate(g.last_seen)}</TableCell>
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

      {/* Girl Details Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={handleCloseDrawer}
        PaperProps={{
          sx: { width: { xs: "100%", sm: 450, md: 550 } },
        }}
      >
        {selectedGirl && (
          <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
            {/* Header with close button */}
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}
            >
              <Typography variant="h5" sx={{ fontWeight: 700, color: "#e65100" }}>
                {selectedGirl.name}
              </Typography>
              <IconButton onClick={handleCloseDrawer} size="small">
                <CloseIcon />
              </IconButton>
            </Stack>

            {/* Scrollable content */}
            <Box sx={{ flex: 1, overflowY: "auto", p: 3 }}>
              {loadingDetail && (
                <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
                  <CircularProgress size={30} />
                </Box>
              )}

              {/* Photo */}
              {selectedGirl.photo_url || selectedGirl.photos ? (
                <Box sx={{ mb: 3 }}>
                  {selectedGirl.photos && selectedGirl.photos.length > 0 ? (
                    <Stack spacing={1}>
                      {selectedGirl.photos.map((photo, idx) => (
                        <Box
                          key={idx}
                          component="img"
                          src={photo}
                          alt={`${selectedGirl.name} ${idx + 1}`}
                          sx={{
                            width: "100%",
                            borderRadius: 2,
                            objectFit: "cover",
                            maxHeight: 500,
                          }}
                        />
                      ))}
                    </Stack>
                  ) : selectedGirl.photo_url ? (
                    <Box
                      component="img"
                      src={selectedGirl.photo_url}
                      alt={selectedGirl.name}
                      sx={{
                        width: "100%",
                        borderRadius: 2,
                        objectFit: "cover",
                        maxHeight: 500,
                      }}
                    />
                  ) : null}
                </Box>
              ) : !loadingDetail ? (
                <Box
                  sx={{
                    width: "100%",
                    height: 300,
                    bgcolor: "grey.200",
                    borderRadius: 2,
                    mb: 3,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    No photo available
                  </Typography>
                </Box>
              ) : null}

              {/* Stats Cards */}
              <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                {/* Average Rating */}
                <Paper
                  sx={{
                    flex: 1,
                    p: 2,
                    bgcolor: "#fff3e0",
                    borderRadius: 2,
                    textAlign: "center",
                  }}
                >
                  <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5}>
                    <StarIcon sx={{ color: "#e65100", fontSize: 20 }} />
                    <Typography variant="h5" sx={{ fontWeight: 700, color: "#e65100" }}>
                      {selectedGirl.avg_rating != null
                        ? Number(selectedGirl.avg_rating).toFixed(1)
                        : "—"}
                    </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    AVG RATING
                  </Typography>
                </Paper>

                {/* Views */}
                <Paper
                  sx={{
                    flex: 1,
                    p: 2,
                    bgcolor: "#f5f5f5",
                    borderRadius: 2,
                    textAlign: "center",
                  }}
                >
                  <Typography variant="h5" sx={{ fontWeight: 700, color: "#e65100" }}>
                    {selectedGirl.views ?? 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    VIEWS
                  </Typography>
                </Paper>
              </Stack>

              {/* Shop Info */}
              {selectedGirl.shop_name && (
                <Paper sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: "#fafafa" }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    SHOP
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 600 }}>
                    {selectedGirl.shop_slug ? (
                      <Link
                        to={`/shops/${selectedGirl.shop_slug}`}
                        style={{ color: "#e65100", textDecoration: "none" }}
                      >
                        {selectedGirl.shop_name}
                      </Link>
                    ) : (
                      selectedGirl.shop_name
                    )}
                  </Typography>
                </Paper>
              )}

              {/* Reviews/Roasts Section */}
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                  🔥 Roasts ({selectedGirl.reviews?.length || 0})
                </Typography>

                {selectedGirl.reviews && selectedGirl.reviews.length > 0 ? (
                  <Stack spacing={2}>
                    {selectedGirl.reviews.map((review) => (
                      <Card key={review.id} variant="outlined" sx={{ borderRadius: 2 }}>
                        <CardContent>
                          {/* Rating stars */}
                          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1 }}>
                            {[...Array(5)].map((_, i) => (
                              <StarIcon
                                key={i}
                                sx={{
                                  fontSize: 18,
                                  color: i < review.rating ? "#e65100" : "#e0e0e0",
                                }}
                              />
                            ))}
                            <Typography
                              variant="body2"
                              sx={{ ml: 1, fontWeight: 600, color: "text.secondary" }}
                            >
                              {review.rating}/5
                            </Typography>
                          </Stack>

                          {/* Comment */}
                          <Typography variant="body2" sx={{ mb: 1, lineHeight: 1.6 }}>
                            {review.comment}
                          </Typography>

                          {/* Author & Date */}
                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                            sx={{ mt: 1.5 }}
                          >
                            <Typography variant="caption" color="text.secondary">
                              {review.author || "Anonymous"}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatDate(review.created_at)}
                            </Typography>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                ) : (
                  <Paper
                    sx={{
                      p: 3,
                      textAlign: "center",
                      bgcolor: "grey.50",
                      borderRadius: 2,
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      No reviews yet
                    </Typography>
                  </Paper>
                )}
              </Box>
            </Box>
          </Box>
        )}
      </Drawer>
    </Stack>
  );
}