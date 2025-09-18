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

export default function App() {
  const [shuffleSeed, setShuffleSeed] = useState(() => Math.random());
  const [selectedGirl, setSelectedGirl] = useState<RosterItem | null>(null);
  const { data, loading, error } = useRosterData();
  const [filters, setFilters] = useState<Filters>({
    shop: "",
    origin: "",
    sort: "",
    layout: "grid",
  });

  // derive shops and origins dynamically
  const shops = useMemo(
    () => Array.from(new Set(data.map((d) => d.shop).filter(Boolean))).sort(),
    [data]
  );
  const origins = useMemo(
    () => Array.from(new Set(data.map((d) => d.origin).filter(Boolean))).sort(),
    [data]
  );

  const filtered = useMemo(() => {
    let out = data;

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

    if (shuffleSeed > 0) {
      out = [...out].sort(() => Math.random() - 0.5);
    }

    return out;
  }, [data, filters, shuffleSeed]);

  return (
    <Box sx={{ bgcolor: "#fafafa", minHeight: "100vh" }}>
      <AppBar position="sticky" color="inherit" elevation={1}>
        <Toolbar>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            The Rotisserie
          </Typography>
          <Box sx={{ flex: 1 }} />
          <IconButton
            onClick={() => {
              setShuffleSeed((s) => s + 1);
              // if you have confetti state:
              // setConfetti(true);
              // setTimeout(() => setConfetti(false), 1500);
            }}
          >
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
            onViewsUpdated={() => setShuffleSeed((s) => s + 1)}
          />
        )}
      </Container>
    </Box>
  );
}
