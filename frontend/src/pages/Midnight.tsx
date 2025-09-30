// src/pages/Midnight.tsx
import { Box, Typography } from "@mui/material";
import Layout from "../components/Layout";

export default function Midnight() {
  return (
    <Layout>
      <Box sx={{ textAlign: "center", mt: 8 }}>
        <Typography variant="h5" gutterBottom>
          🐓 🍗 🥘 Cooking time… 🐍
        </Typography>
        <Typography color="text.secondary">
          Scraping fresh rosters every midnight (12:00–12:10 am). <br />
          Please check back in a few minutes for today’s updates!
        </Typography>
      </Box>
    </Layout>
  );
}
