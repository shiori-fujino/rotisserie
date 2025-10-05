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

  const handleCommentsUpdated = (
    girlId: number,
    newStats?: { commentsCount?: number; avgRating?: number }
  ) => {
    setShuffled((prev) =>
      prev.map((g) =>
        g.id === girlId
          ? {
              ...g,
              commentsCount:
                newStats?.commentsCount ?? (g.commentsCount || 0) + 1,
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
    if (filters.shop) out = out.filter((d) => d.shop === filters.shop);
    if (filters.origin) out = out.filter((d) => d.origin === filters.origin);
    return out;
  }, [shuffled, filters]);

  return (
    <Layout onShuffle={handleShuffle}>
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
            onCommentsUpdated={handleCommentsUpdated}
          />
        )}
      </Container>
    </Layout>
  );
}
