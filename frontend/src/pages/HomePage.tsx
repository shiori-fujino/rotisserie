// src/pages/HomePage.tsx
import { useMemo, useState } from "react";
import {
  Container,
  Box,
  Stack,
  Divider,
  CircularProgress,
  Typography,
  Button,
} from "@mui/material";
import useRosterData from "../hooks/useRosterData";
import FiltersBar, { Filters } from "../components/FiltersBar";
import RosterGrid from "../components/RosterGrid";
import GirlModal from "../components/GirlModal";
import Layout from "../components/Layout";
import type { RosterItem } from "../types";

function shuffleArray<T>(array: T[]): T[] {
  return array
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}

export default function HomePage() {
  const [shuffled, setShuffled] = useState<RosterItem[]>([]);
  const [selectedGirl, setSelectedGirl] = useState<RosterItem | null>(null);
  const { data, loading, error } = useRosterData();
  const [filters, setFilters] = useState<Filters>({
    shop: "",
    origin: "",
    sort: "",
    layout: "grid",
  });

  // 🔄 shuffle once when new data arrives
  useMemo(() => {
    if (data.length) setShuffled(shuffleArray(data));
  }, [data]);

  // 🔀 shuffle button handler
  const handleShuffle = () => {
    setShuffled((prev) => shuffleArray(prev));
  };

  const shops = useMemo(
    () =>
      Array.from(new Set(shuffled.map((d) => d.shop).filter(Boolean))).sort(),
    [shuffled]
  );

  const origins = useMemo(() => {
  const uniq = Array.from(
    new Set(
      shuffled
        .map((d) => d.origin)
        .filter((o): o is string => Boolean(o)) // ✅ removes undefined
    )
  );
  return uniq.sort((a, b) => {
    if (a === "Others") return 1;
    if (b === "Others") return -1;
    return (a ?? "").localeCompare(b ?? "");
  });
}, [shuffled]);


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

  const handleViewsUpdated = (girlId: number) => {
    setShuffled((prev) =>
      prev.map((item) =>
        item.id === girlId
          ? { ...item, views: (item.views || 0) + 1 }
          : item
      )
    );
  };

  const handleCommentsUpdated = (girlId: number) => {
    setShuffled((prev) =>
      prev.map((item) =>
        item.id === girlId
          ? { ...item, commentsCount: (item.commentsCount || 0) + 1 }
          : item
      )
    );
  };

  return (
    <Layout onShuffle={handleShuffle}>
      <Box sx={{ minHeight: "100vh" }}>
        <Container maxWidth="lg" disableGutters sx={{ py: 3 }}>
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
              <Typography sx={{ mt: 2 }}>Loading rosters…🍗</Typography>
            </Stack>
          )}

          {error && (
            <Box sx={{ color: "error.main", my: 2 }}>{String(error)}</Box>
          )}

          {!loading && !filtered.length && (
            <Box sx={{ my: 4 }}>No results. Try clearing filters.</Box>
          )}

          <RosterGrid
            items={filtered}
            layout={filters.layout}
            onSelect={setSelectedGirl}
          />
{!loading && filtered.length > 0 && !filters.shop && !filters.origin && !filters.sort && (
  <Box sx={{ textAlign: "center", mt: 4, mb: 2 }}>
    <Typography variant="body2" sx={{ mb: 2 }}>
      You saw all the girls I scraped for today… <br />
      The universe is telling you to not have sex today 🥺 <br />
      or…
    </Typography>
    <Button
      variant="contained"
      color="error"
      onClick={handleShuffle}
      sx={{ borderRadius: 2, px: 3 }}
    >
      👉🏻 Re-shuffle
    </Button>
  </Box>
)}


          {selectedGirl && (
            <GirlModal
              open={!!selectedGirl}
              onClose={() => setSelectedGirl(null)}
              girlId={selectedGirl.id}
              girlName={selectedGirl.name}
              profileUrl={selectedGirl.profileUrl}
              onViewsUpdated={() => handleViewsUpdated(selectedGirl.id)}
              onCommentsUpdated={() => handleCommentsUpdated(selectedGirl.id)}
            />
          )}
        </Container>
      </Box>
    </Layout>
  );
}
