// components/RosterGrid.tsx
import { Box, Stack } from "@mui/material";
import GridCard from "./GridCard";
import { ListCard } from "./ListCard";
import type { RosterItem } from "../types";
import type { Filters } from "./FiltersBar";

// RosterGrid.tsx
export default function RosterGrid({ items, layout, onSelect }: {
  items: RosterItem[];
  layout: Filters["layout"];
  onSelect: (girl: RosterItem) => void;
}) {
  return layout === "grid" ? (
    <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "repeat(3, 1fr)", sm: "repeat(4, 1fr)", md: "repeat(5, 1fr)", lg: "repeat(7, 1fr)" } }}>
      {items.map((item, idx) => (
        <GridCard key={`${item.shop}-${item.id}-${idx}`} item={item} onSelect={onSelect} />
      ))}
    </Box>
  ) : (
    <Stack spacing={2}>
      {items.map((item, idx) => (
        <ListCard key={`${item.shop}-${item.id}-${idx}`} item={item} />
      ))}
    </Stack>
  );
}
