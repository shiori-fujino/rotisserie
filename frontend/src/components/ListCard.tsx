import {
  Card, CardContent, CardMedia, Typography, Stack, Chip, Box, Link as MLink,
} from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import type { RosterItem } from "../types";

interface Props { item: RosterItem }

export function ListCard({ item }: Props) {
  return (
    <Card
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: "row",
        alignItems: "stretch",
        overflow: "hidden",
        mb: 2,         // spacing between rows
        minHeight: 140,
        maxHeight: 180,
      }}
    >
      {item.photo && (
        <CardMedia
          component="img"
          image={item.photo}
          alt={item.name}
          sx={{ width: 160, height: "100%", objectFit: "cover", flexShrink: 0 }}
        />
      )}

      <CardContent sx={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", py: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
          <Typography variant="h6" sx={{ fontWeight: 700 }} noWrap title={item.name}>
            {item.name || "(no name)"}
          </Typography>
          {item.origin && <Chip size="small" label={item.origin} />}
          <Chip size="small" variant="outlined" label={item.shop || "Unknown"} />
        </Stack>

        {item.shift && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Shift: {item.shift}
          </Typography>
        )}

        {item.profile && (
          <Box sx={{ mt: "auto" }}>
            <MLink href={item.profile} target="_blank" rel="noopener noreferrer">
              View profile{" "}
              <OpenInNewIcon fontSize="inherit" style={{ verticalAlign: "middle" }} />
            </MLink>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
