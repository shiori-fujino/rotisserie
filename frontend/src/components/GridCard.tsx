// GridCard.tsx
import { useState } from "react";
import {
  Card,
  CardMedia,
  CardContent,
  Typography,
  Box,
  Stack,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import RateReviewIcon from "@mui/icons-material/RateReview";
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
        position: "relative", // ✅ so overlay positions correctly
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

      {/* 🔥 Overlay if fallback triggered */}
      {isFallback && (
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
          }}
        >
          <Typography variant="caption">
            I couldn’t scrape a proper image URL ☠️
          </Typography>
        </Box>
      )}

      <CardContent
        sx={{
          display: "flex",
          p: 1,
          "&:last-child": { pb: 1 },
        }}
      >
        <Stack
          direction="row"
          spacing={2}
          alignItems="center"
          sx={{ flex: 1, justifyContent: "space-between" }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <VisibilityIcon fontSize="small" />
            <Typography variant="caption">{item.views ?? 0}</Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <RateReviewIcon fontSize="small" />
            <Typography variant="caption">{item.commentsCount ?? 0}</Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
