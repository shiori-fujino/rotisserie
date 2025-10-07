//gridcard.tsx

import { useState } from "react";
import {
  Card,
  CardMedia,
  CardContent,
  Typography,
  Box,
  Stack,
} from "@mui/material";
import type { RosterItem } from "../types";

export default function GridCard({
  item,
  onSelect,
}: {
  item: RosterItem;
  onSelect: (girl: RosterItem) => void;
}) {
  const [isFallback, setIsFallback] = useState(false);

  return (
    <Card
      sx={{
        borderRadius: 2,
        overflow: "hidden",
        cursor: "pointer",
        position: "relative",
      }}
      onClick={() => onSelect(item)}
    >
      <CardMedia
        component="img"
        height="220"
        image={item.photo || "/fallback.jpg"}
        alt={item.name || "Roster photo"}
        sx={{ objectFit: "cover" }}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = "/fallback.jpg";
          setIsFallback(true);
        }}
      />

      {(!item.photo || isFallback) && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "rgba(0,0,0,0.6)",
            color: "white",
            textAlign: "center",
            px: 1,
            zIndex: 2,
          }}
        >
          <Typography variant="caption">I couldn’t scrape a proper image URL ☠️</Typography>
        </Box>
      )}

      <CardContent sx={{ display: "flex", p: 1, "&:last-child": { pb: 1 } }}>
        <Stack
    direction="row"
    alignItems="center"
    justifyContent="space-between" // 💥 evenly spaced
    sx={{ flex: 1 }}
  >
          <Typography variant="caption">👀 {item.views ?? 0}</Typography>
          <Typography variant="caption">💬 {item.repliesCount ?? 0}</Typography>
          <Typography variant="caption">⭐️ {item.avgRating?.toFixed(1) ?? "0.0"}</Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
