import { useMemo, useState } from "react";
import {
  Container,
  Stack,
  Divider,
  CircularProgress,
  Typography,
  Box,
} from "@mui/material";
import useRosterData from "../hooks/useRosterData";
import FiltersBar, { Filters } from "../components/FiltersBar";
import RosterGrid from "../components/RosterGrid";
import GirlModal from "../components/GirlModal";
import Layout from "../components/Layout";
import type { RosterItem } from "../types";
import Midnight from "./Midnight";
import ErrorDbPulling from "./ErrorDbPulling";

function shuffleArray<T>(array: T[]): T[] {
  return array
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}

export default function HomePage() {
  const now = new Date();
  const isMidnight = now.getHours() === 0 && now.getMinutes() < 10;
  const { data, loading, error } = useRosterData();

  const [shuffled, setShuffled] = useState<RosterItem[]>([]);
  const [selectedGirl, setSelectedGirl] = useState<RosterItem | null>(null);
  const [filters, setFilters] = useState<Filters>({
    shop: "",
    origin: "",
    sort: "",
    layout: "grid",
  });

  useMemo(() => {
    if (data.length) setShuffled(shuffleArray(data));
  }, [data]);

  const handleShuffle = () => setShuffled((prev) => shuffleArray(prev));

  const handleViewsUpdated = (girlId: number) => {
    setShuffled((prev) =>
      prev.map((g) =>
        g.id === girlId ? { ...g, views: (g.views || 0) + 1 } : g
      )
    );
  };

  const handleRepliesUpdated = (
    girlId: number,
    newStats?: { repliesCount?: number; avgRating?: number }
  ) => {
    setShuffled((prev) =>
      prev.map((g) =>
        g.id === girlId
          ? {
              ...g,
              repliesCount:
                newStats?.repliesCount ?? (g.repliesCount || 0) + 1,
              avgRating:
                newStats?.avgRating ?? g.avgRating ?? 0,
            }
          : g
      )
    );
  };

  if (isMidnight) return <Midnight />;
  if (error) return <ErrorDbPulling />;

  const shops = useMemo(
    () => Array.from(new Set(shuffled.map((d) => d.shop).filter(Boolean))).sort(),
    [shuffled]
  );
  const origins = useMemo(() => {
    const uniq = Array.from(
      new Set(
        shuffled
          .map((d) => d.origin)
          .filter((o): o is string => Boolean(o))
      )
    );
    return uniq.sort();
  }, [shuffled]);

const filtered = useMemo(() => {
  let out = shuffled;

  // filter by shop & origin
  if (filters.shop) out = out.filter((d) => d.shop === filters.shop);
  if (filters.origin) out = out.filter((d) => d.origin === filters.origin);

  // ✅ sort by views only
  if (filters.sort === "popularity-desc") {
    out = [...out].sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
  } else if (filters.sort === "popularity-asc") {
    out = [...out].sort((a, b) => (a.views ?? 0) - (b.views ?? 0));
  }

  return out;
}, [shuffled, filters]);

  return (
    <Layout onShuffle={handleShuffle}>
      <Container maxWidth="lg" disableGutters sx={{ 
        py: 0, 
        fontFamily: "'Inter', 'Roboto', 'Helvetica', 'Arial', sans-serif", // 👈 force it here
}}>
        <Box
      sx={{
        mb: 3,
        fontSize: { xs: "0.95rem", md: "1.1rem" },
        lineHeight: 1.6,
      }}
    >
      <strong>The Rotisserie</strong> — Sydney’s hottest roster feed 🔥<br />
      <span style={{ opacity: 0.8 }}>
        Browse, compare, and filter daily rosters — updated nightly.
      </span>
    </Box>
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

        {!loading && (
          <RosterGrid
            items={filtered}
            layout={filters.layout}
            onSelect={setSelectedGirl}
          />
        )}

        {selectedGirl && (
          <GirlModal
            open={!!selectedGirl}
            onClose={() => setSelectedGirl(null)}
            girlId={selectedGirl.id}
            girlName={selectedGirl.name}
            profileUrl={selectedGirl.profileUrl}
            onViewsUpdated={handleViewsUpdated}
            onRepliesUpdated={handleRepliesUpdated}
          />
        )}
      </Container>
    </Layout>
  );
}
