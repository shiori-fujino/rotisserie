import { Box, Stack, Button, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";

export default function EmploymentPage() {
  const nav = useNavigate();

  return (
    <Box sx={{ textAlign: "center", py: 8 }}>
      <Typography variant="h4" gutterBottom>
        Join Rotisserie 🍗
      </Typography>
      <Typography variant="body1" sx={{ mb: 4 }}>
        Choose your path below.
      </Typography>
      <Stack direction="row" justifyContent="center" spacing={3}>
        <Button
          variant="contained"
          onClick={() => nav("/employment/girls")}
        >
          💋 Service Provider
        </Button>
        <Button
          variant="outlined"
          onClick={() => nav("/employment/reception")}
        >
          💼 Receptionist
        </Button>
      </Stack>
    </Box>
  )};