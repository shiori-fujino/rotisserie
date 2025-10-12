// src/pages/EmploymentReceptionPage.tsx
import { Box, Typography, Stack, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import { RECEPTION_COPY } from "../contents/employment";

export default function EmploymentReceptionPage() {
  const nav = useNavigate();
  const theme = useTheme();

  return (
    <Box sx={{ maxWidth: 800, mx: "auto", py: 6, px: 2 }}>
      {/* HEADER */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          💼 Receptionist
        </Typography>
        <Button
          variant="outlined"
          onClick={() => nav("/employment")}
          sx={{ borderRadius: "999px" }}
        >
          ← Back
        </Button>
      </Stack>

      {/* CONTENT */}
      <Box
        sx={{
          fontFamily: theme.typography.fontFamily,
          "& *": { fontFamily: theme.typography.fontFamily },
          "& h2": {
            fontSize: "1.25rem",
            fontWeight: 600,
            mt: 4,
            mb: 1.5,
          },
          "& p": {
            lineHeight: 1.7,
            mb: 2,
          },
          "& ul": {
            pl: 3,
            mb: 3,
          },
          "& li": {
            mb: 0.5,
            listStyle: "disc",
          },
          "& strong": { color: theme.palette.primary.main },
        }}
        dangerouslySetInnerHTML={{ __html: RECEPTION_COPY }}
      />

      {/* CTA */}
      <Box textAlign="center" mt={6}>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
          Think you’ve got what it takes?
        </Typography>
        <Button
          variant="contained"
          size="large"
          onClick={() => nav("/help")}
          sx={{
            borderRadius: "999px",
            px: 4,
            py: 1.2,
            fontWeight: 600,
          }}
        >
          Apply or Ask Anything 💌
        </Button>
      </Box>
    </Box>
  );
}
