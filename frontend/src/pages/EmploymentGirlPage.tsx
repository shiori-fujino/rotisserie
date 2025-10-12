// src/pages/EmploymentGirlPage.tsx
import { Box, Typography, Stack, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import { GIRL_COPY } from "../contents/employment";

export default function EmploymentGirlPage() {
  const nav = useNavigate();
  const theme = useTheme();

  return (
    <Box sx={{ maxWidth: 800, mx: "auto", py: 6, px: 2 }}>      
        <Button
          variant="outlined"
          onClick={() => nav("/employment")}
          sx={{ borderRadius: "999px" }}
        >
          ← Back
        </Button>

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
        dangerouslySetInnerHTML={{ __html: GIRL_COPY }}
      />

      {/* CTA */}
      <Box textAlign="center" mt={6}>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
          Interested or curious?
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
