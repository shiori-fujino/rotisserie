//homepage.tsx

import { useEffect, useMemo, useState } from "react";
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
import { normalizeOrigin } from "../utils/normalize";
import ErrorDbPulling from "./ErrorDbPulling";

function shuffleArray<T>(array: T[]): T[] {
  return array
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}

export default function HomePage() {
  const { data, loading, error } = useRosterData();

  const [shuffled, setShuffled] = useState<RosterItem[]>([]);
  const [selectedGirl, setSelectedGirl] = useState<RosterItem | null>(null);
  const [filters, setFilters] = useState<Filters>({
    shop: "",
    origin: "",
    sort: "",
    layout: "grid",
  });

  useEffect(() => {
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

  if (error) return <ErrorDbPulling />;

  // ✅ Calculate counts dynamically based on current filters
const { shops, origins } = useMemo(() => {
  // Calculate shop counts (filtered by origin if selected)
  let shopBaseData = shuffled;
  if (filters.origin) {
    shopBaseData = shuffled.filter((d) => 
      normalizeOrigin(d.origin || "") === filters.origin
    );
  }
  
  const shopCounts: Record<string, number> = {};
  shopBaseData.forEach((d) => {
    if (d.shop) {
      shopCounts[d.shop] = (shopCounts[d.shop] || 0) + 1;
    }
  });
  
  // Calculate origin counts (filtered by shop if selected)
  let originBaseData = shuffled;
  if (filters.shop) {
    originBaseData = shuffled.filter((d) => d.shop === filters.shop);
  }
  
  const originCounts: Record<string, number> = {};
  originBaseData.forEach((d) => {
    const normalized = normalizeOrigin(d.origin || "");
    if (normalized) {
      originCounts[normalized] = (originCounts[normalized] || 0) + 1;
    }
  });
  
  return {
    shops: Object.entries(shopCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    
    origins: Object.entries(originCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => {
        if (a.name === "Other") return 1;
        if (b.name === "Other") return -1;
        return a.name.localeCompare(b.name);
      }),
  };
}, [shuffled, filters.shop, filters.origin]); // ✅ Recalculate when filters change

const filtered = useMemo(() => {
  let out = shuffled;

  // Filter by shop
  if (filters.shop) out = out.filter((d) => d.shop === filters.shop);
  
  // Filter by origin
  if (filters.origin) {
    out = out.filter((d) => normalizeOrigin(d.origin || "") === filters.origin);
  }

  // ✅ ADD SORTING LOGIC (this was missing!)
  if (filters.sort === "popularity-desc") {
    out = [...out].sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
  } else if (filters.sort === "popularity-asc") {
    out = [...out].sort((a, b) => (a.views ?? 0) - (b.views ?? 0));
  }

  return out;
}, [shuffled, filters]);

const lastUpdated = useMemo(() => {
  if (!data.length || !data[0]) return null;
  if (!data[0].updatedAt) return null;

  const date = new Date(data[0].updatedAt);
  return date.toLocaleString("en-AU", {
    timeZone: "Australia/Sydney",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}, [data]);





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
      <strong>The Rotisserie</strong> Sydney’s hottest roster feed 🔥<br />
      <span style={{ opacity: 0.8 }}>
        Browse, compare, and filter daily rosters — updated three times daily at 12 AM, 8 AM and 4 PM.
      </span>
    </Box>

{lastUpdated && (
  <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
    Last updated: {lastUpdated}
  </Typography>
)}

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
