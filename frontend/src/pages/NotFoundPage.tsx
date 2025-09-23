// src/pages/NotFoundPage.tsx
import { Box, Typography, Button } from "@mui/material";
import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <Box
      sx={{
        textAlign: "center",
        py: 8,
        px: 2,
      }}
    >
      <Typography variant="h3" gutterBottom>
        🍗 404
      </Typography>
      <Typography variant="h6" gutterBottom>
        This chicken is overcooked.
      </Typography>
      <Typography variant="body1" sx={{ mb: 3 }}>
        The page you’re looking for doesn’t exist.  
        ????
      </Typography>
      <Button variant="contained" component={Link} to="/">
        Back to Roster
      </Button>
    </Box>
  );
}
