// src/pages/ErrorDbPulling.tsx
import { Box, Typography } from "@mui/material";
import Layout from "../components/Layout";

export default function ErrorDbPulling() {
  return (
    <Layout>
      <Box sx={{ textAlign: "center", mt: 8 }}>
        <Typography variant="h5" gutterBottom>
          👷🏻‍♀️ Emergency cooking time 🚧
        </Typography>
        <Typography color="text.secondary">
          Sorry, no data is available right now. <br />
          Fixing things behind the scenes. . . <br />
          Please check back soon.
        </Typography>
      </Box>
    </Layout>
  );
}
