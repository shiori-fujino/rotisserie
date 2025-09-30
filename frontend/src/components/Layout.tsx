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
      {/* Top Nav */}
      <AppBar position="sticky" color="inherit" elevation={1}>
        <Toolbar>
          {/* Dynamic date/time roster */}
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, textDecoration: "none", color: "inherit" }}
            onClick={() => (window.location.href = "/")}
          >
            {new Date().toLocaleString("en-AU", {
              weekday: "short",
              day: "numeric",
              month: "short",
            })}{" "}
            🐓
          </Typography>

          {/* Spacer */}
          <Box sx={{ flex: 1 }} />

          {/* Menu buttons */}
          <Button color="inherit" component={Link} to="/comments">
            Comments
          </Button>
          <Button color="inherit" component={Link} to="/help">
            Help
          </Button>
          <Button color="inherit" component={Link} to="/about">
            About
          </Button>

          {/* Shuffle icon */}
          {onShuffle && (
            <IconButton onClick={onShuffle}>
              <RefreshIcon />
            </IconButton>
          )}
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
