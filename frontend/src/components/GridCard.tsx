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

// GridCard.tsx
export default function GridCard({ item, onSelect }: {
  item: RosterItem;
  onSelect: (girl: RosterItem) => void;
}) {
  return (
    <Card
      sx={{ borderRadius: 2, overflow: "hidden", cursor: "pointer" }}
      onClick={() => onSelect(item)}   // ✅ open modal
    >
      <CardMedia
        component="img"
        height="220"
        image={item.photo || "/placeholder.png"}
        alt={item.name || "Roster photo"}
        sx={{ objectFit: "cover" }}
      />
      <CardContent sx={{ display: "flex", p: 1, "&:last-child": { pb: 1 } }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ flex: 1, justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <VisibilityIcon fontSize="small" />
            <Typography variant="caption">{item.views ?? 0}</Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <RateReviewIcon fontSize="small" />
            <Typography variant="caption">{item.reviewsCount ?? 0}</Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
