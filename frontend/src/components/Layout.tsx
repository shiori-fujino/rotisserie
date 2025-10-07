import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Button,
  Link as MuiLink,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { Link } from "react-router-dom";

export default function Layout({
  children,
  onShuffle,
}: {
  children: React.ReactNode;
  onShuffle?: () => void;
}) {
  return (
    <Box
      sx={{
        color: "#47403a",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
{/* Top Nav — German Engineering Edition */}
<AppBar
  position="sticky"
  color="transparent"
  elevation={0}
  sx={{
    backdropFilter: "blur(6px)",
    borderBottom: "1px solid rgba(0,0,0,0.08)",
    bgcolor: "rgba(255,255,255,0.75)",
  }}
>
  <Toolbar
    sx={{
      display: "flex",
      justifyContent: "space-between", // 🔥 key difference
      alignItems: "center",
      px: { xs: 1.5, sm: 3 },
    }}
  >
    {/* Left: Home / Date */}
    <Typography
      variant="h6"
      onClick={() => (window.location.href = "/")}
      sx={{
        fontWeight: 700,
        fontFamily: "Inter, Roboto, sans-serif",
        color: "text.primary",
        cursor: "pointer",
        "&:hover": { color: "#e65100" },
        flexShrink: 0, // stops shrinking on mobile
      }}
    >
      {new Date().toLocaleString("en-AU", {
        weekday: "short",
        day: "numeric",
        month: "long",
      })}{" "}
      🐓
    </Typography>

    {/* Right: Menu items */}
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: { xs: 1, sm: 2 },
        flexShrink: 0,
      }}
    >
      <Button
        color="inherit"
        component={Link}
        to="/about"
        sx={{ textTransform: "none", fontWeight: 500 }}
      >
        About
      </Button>
      <Button
        color="inherit"
        component={Link}
        to="/help"
        sx={{ textTransform: "none", fontWeight: 500 }}
      >
        Help
      </Button>
      <Button
        color="inherit"
        component={Link}
        to="/roast"
        sx={{
          textTransform: "none",
          fontWeight: 600,
          color: "#e65100",
        }}
      >
        Roasting...
      </Button>

      {onShuffle && (
        <IconButton onClick={onShuffle} sx={{ color: "text.secondary" }}>
          <RefreshIcon fontSize="small" />
        </IconButton>
      )}
    </Box>
  </Toolbar>
</AppBar>

      {/* Content area */}
      <Box sx={{ py: 3, px: 1.5, flex: 1 }}>{children}</Box>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          py: 2,
          textAlign: "center",
          borderTop: "1px solid #ddd",
          mt: "auto",
        }}
      >
        <Typography variant="body2" color="text.secondary">
          © {new Date().getFullYear()} The Rotisserie 🍗 ·{" "}
          <MuiLink component={Link} to="/blog" color="inherit" underline="hover">
            Devlog
          </MuiLink>{" "}
          ·{" "}
          <MuiLink component={Link} to="/about" color="inherit" underline="hover">
            About
          </MuiLink>{" "}
          ·{" "}
          <MuiLink component={Link} to="/help" color="inherit" underline="hover">
            Help
          </MuiLink>{" "}
          ·{" "}
          <MuiLink component={Link} to="/data" color="inherit" underline="hover">
            Data
          </MuiLink>
        </Typography>
      </Box>
    </Box>
  );
}
