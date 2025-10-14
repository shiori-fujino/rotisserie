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
import { Link, useLocation } from "react-router-dom";

export default function Layout({
  children,
  onShuffle,
}: {
  children: React.ReactNode;
  onShuffle?: () => void;
}) {
  const location = useLocation();
  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <Box
      sx={{
        color: "#47403a",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* 🔝 Top Navbar — Gen-Z German Engineering */}
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
            justifyContent: "space-between",
            alignItems: "center",
            px: { xs: 1.5, sm: 3 },
          }}
        >
          {/* Left: Date logo */}
          <Typography
            variant="h6"
            onClick={() => (window.location.href = "/")}
            sx={{
              fontWeight: 700,
              fontFamily: "Inter, Roboto, sans-serif",
              color: "text.primary",
              cursor: "pointer",
              "&:hover": { color: "#e65100" },
              flexShrink: 0,
              fontSize: { xs: "1rem", sm: "1.1rem" },
            }}
          >
            {new Date().toLocaleString("en-AU", {
              weekday: "short",
              day: "numeric",
              month: "long",
            })}{" "}
            🐓
          </Typography>

          {/* Right: Main nav */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: { xs: 0.5, sm: 2 },
              flexShrink: 0,
            }}
          >
            {[
              { label: "Shops", to: "/shops" },
              { label: "Girls", to: "/girls" },
              { label: "Roast", to: "/roast" },
            ].map((link) => (
              <Button
                key={link.to}
                color="inherit"
                component={Link}
                to={link.to}
                sx={{
                  textTransform: "none",
                  fontWeight: isActive(link.to) ? 600 : 400,
                  color: isActive(link.to)
                    ? "#e65100"
                    : "text.primary",
                  "&:hover": { opacity: 0.7 },
                }}
              >
                {link.label}
              </Button>
            ))}

            {onShuffle && (
              <IconButton onClick={onShuffle} sx={{ color: "text.secondary" }}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* 🧩 Main Content */}
      <Box sx={{ py: 3, px: 1.5, flex: 1 }}>{children}</Box>

      {/* 🦶 Footer — Meta Links */}
      <Box
        component="footer"
        sx={{
          py: 2,
          textAlign: "center",
          borderTop: "1px solid #ddd",
          mt: "auto",
        }}
      >
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            fontSize: "0.85rem",
            textTransform: "lowercase",
            "& a": { color: "inherit", textDecoration: "none" },
            "& a:hover": { color: "#e65100" },
          }}
        >
          © {new Date().getFullYear()} the rotisserie ·{" "}
          <MuiLink component={Link} to="/blog">
            devlog
          </MuiLink>{" "}
          ·{" "}
          <MuiLink component={Link} to="/about">
            about
          </MuiLink>{" "}
          ·{" "}
          <MuiLink component={Link} to="/help">
            help
          </MuiLink>{" "}
          ·{" "}
          <MuiLink component={Link} to="/data">
            data
          </MuiLink>
        </Typography>
      </Box>
    </Box>
  );
}
