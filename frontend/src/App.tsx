import { useMemo, useState } from "react";
import GirlModal from "./components/GirlModal";
import {
  AppBar, Toolbar, Typography, Container, Box, Stack,
  Divider, CircularProgress, IconButton,
} from "@mui/material";
import useRosterData from "./hooks/useRosterData";
import FiltersBar, { Filters } from "./components/FiltersBar";
import RosterGrid from "./components/RosterGrid";
import RefreshIcon from "@mui/icons-material/Refresh";
import type { RosterItem } from "./types";

export default function App() {
  const [selectedGirl, setSelectedGirl] = useState<RosterItem | null>(null);
  const { data, loading, error } = useRosterData();
  const [filters, setFilters] = useState<Filters>({
    shop: "",
    origin: "",
    sort: "",
    layout: "grid",
  });

  // 🔥 Local state for cards (so we can bump counts instantly)
  const [shuffled, setShuffled] = useState<RosterItem[]>([]);

  // keep shuffled in sync when new data comes in
  useMemo(() => {
    if (data.length) {
      setShuffled(data);
    }
  }, [data]);

  const shops = useMemo(
    () => Array.from(new Set(shuffled.map((d) => d.shop).filter(Boolean))).sort(),
    [shuffled]
  );
  const origins = useMemo(
    () => Array.from(new Set(shuffled.map((d) => d.origin).filter(Boolean))).sort(),
    [shuffled]
  );

  const filtered = useMemo(() => {
    let out = shuffled;

    if (filters.shop) out = out.filter((d) => d.shop === filters.shop);
    if (filters.origin) out = out.filter((d) => d.origin === filters.origin);

    switch (filters.sort) {
      case "popularity-asc":
        out = [...out].sort((a, b) => (a.views || 0) - (b.views || 0));
        break;
      case "popularity-desc":
        out = [...out].sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
    }

    return out;
  }, [shuffled, filters]);

  // ✅ bump views instantly
  const handleViewsUpdated = (girlId: number) => {
    setShuffled((prev) =>
      prev.map((item) =>
        item.id === girlId ? { ...item, views: (item.views || 0) + 1 } : item
      )
    );
  };

  // ✅ bump reviews instantly
  const handleReviewsUpdated = (girlId: number) => {
    setShuffled((prev) =>
      prev.map((item) =>
        item.id === girlId ? { ...item, reviewsCount: (item.reviewsCount || 0) + 1 } : item
      )
    );
  };

  return (
    <Box sx={{ bgcolor: "#fafafa", minHeight: "100vh" }}>
      <AppBar position="sticky" color="inherit" elevation={1}>
        <Toolbar>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            The Rotisserie
          </Typography>
          <Box sx={{ flex: 1 }} />
          <IconButton onClick={() => setShuffled([...shuffled].sort(() => Math.random() - 0.5))}>
            <RefreshIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        <FiltersBar
          value={filters}
          onChange={setFilters}
          shops={shops}
          origins={origins}
        />
        <Divider sx={{ my: 2 }} />

        {loading && (
          <Stack alignItems="center" sx={{ py: 8 }}>
            <CircularProgress />
            <Typography sx={{ mt: 2 }}>Loading rosters…</Typography>
          </Stack>
        )}

        {error && <Box sx={{ color: "error.main", my: 2 }}>{String(error)}</Box>}

        {!loading && !filtered.length && (
          <Box sx={{ my: 4 }}>No results. Try clearing filters.</Box>
        )}

        <RosterGrid
          items={filtered}
          layout={filters.layout}
          onSelect={setSelectedGirl}
        />

        {selectedGirl && (
          <GirlModal
            open={!!selectedGirl}
            onClose={() => setSelectedGirl(null)}
            girlId={selectedGirl.id}
            girlName={selectedGirl.name}
            profileUrl={selectedGirl.profileUrl}
            onViewsUpdated={() => handleViewsUpdated(selectedGirl.id)}
            onReviewsUpdated={() => handleReviewsUpdated(selectedGirl.id)}  // 👈 hooked in
          />
        )}
      </Container>
    </Box>
  );
}
