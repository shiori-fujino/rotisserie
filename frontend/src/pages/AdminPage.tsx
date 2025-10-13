// src/pages/AdminPage.tsx
import { useEffect, useState } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  Stack,
  Paper,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Pagination,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import FiltersBar, { Filters } from "../components/FiltersBar";
import { API_BASE } from "../config";

axios.defaults.baseURL = API_BASE;

const TABLES = [
  "shops",
  "girls",
  "roasts",
  "replies",
  "blog_posts",
  "contact_messages",
  "site_visits",
];

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("admin_token")
  );
  const [selectedTable, setSelectedTable] = useState(TABLES[0]);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [filters, setFilters] = useState<Filters>({
    shop: "",
    origin: "",
    sort: "id-desc",
    layout: "grid",
  });

  const [allOrigins, setAllOrigins] = useState<string[]>([]);
  const [shops, setShops] = useState<Record<number, string>>({});

  // --- edit modal state ---
  const [editingGirl, setEditingGirl] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editOrigin, setEditOrigin] = useState("");

  // --- fetch shop map for id → name ---
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await axios.get("/api/admin/table?name=shops", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const map: Record<number, string> = {};
        res.data.rows.forEach((s: any) => {
          map[s.id] = s.name;
        });
        setShops(map);
      } catch (err) {
        console.error("fetch shops fail", err);
      }
    })();
  }, [token]);

  // --- fetch data ---
  const fetchTable = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params: any = {
        name: selectedTable,
        page,
        limit: 25,
        sort: filters.sort,
      };
      if (filters.shop) params.shop = filters.shop;
      if (filters.origin) params.origin = filters.origin;

      const res = await axios.get("/api/admin/table", {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      setRows(res.data.rows);
      setTotal(res.data.total);
      if (res.data.allOrigins) setAllOrigins(res.data.allOrigins);
    } catch (err) {
      console.error("fetch table fail", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTable, token, page, filters]);

  // --- login form ---
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const login = async () => {
    try {
      const res = await axios.post("/api/auth/login", { username, password });
      localStorage.setItem("admin_token", res.data.token);
      setToken(res.data.token);
    } catch {
      alert("Login failed");
    }
  };

  // --- edit + delete ---
  const handleEditGirl = (girl: any) => {
    setEditingGirl(girl);
    setEditName(girl.name || "");
    setEditOrigin(girl.origin || "");
  };

  const saveEditGirl = async () => {
    if (!editingGirl) return;
    try {
      const res = await axios.patch(
        `/api/admin/girl/${editingGirl.id}`,
        { name: editName, origin: editOrigin },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRows((prev) =>
        prev.map((r) =>
          r.id === editingGirl.id ? { ...r, ...res.data.updated } : r
        )
      );
      setEditingGirl(null);
    } catch (err) {
      console.error("update girl fail", err);
      alert("Failed to update girl.");
    }
  };

  const handleDeleteGirl = async (girl: any) => {
    if (!window.confirm(`Delete ${girl.name}?`)) return;
    try {
      await axios.delete(`/api/admin/girl/${girl.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRows((prev) => prev.filter((r) => r.id !== girl.id));
    } catch (err) {
      console.error("delete girl fail", err);
      alert("Failed to delete girl.");
    }
  };

  // --- login UI ---
  if (!token) {
    return (
      <Box sx={{ maxWidth: 400, mx: "auto", mt: 8 }}>
        <Typography variant="h5" gutterBottom>
          Admin Login
        </Typography>
        <Stack spacing={2}>
          <input
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ padding: 8 }}
          />
          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: 8 }}
          />
          <button onClick={login}>Login</button>
        </Stack>
      </Box>
    );
  }

  // --- main UI ---
  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", py: 4 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Typography variant="h4">Database Tables</Typography>
        <Tooltip title="Refresh">
          <IconButton onClick={fetchTable}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap" }}>
        {TABLES.map((t) => (
          <Chip
            key={t}
            label={t}
            color={selectedTable === t ? "primary" : "default"}
            onClick={() => {
              setSelectedTable(t);
              setPage(1);
            }}
          />
        ))}
      </Stack>

      {selectedTable === "girls" && (
        <Box sx={{ mb: 2 }}>
          <FiltersBar
            value={filters}
            onChange={(f) => {
              setFilters(f);
              setPage(1);
            }}
            shops={Object.values(shops)}
            origins={allOrigins}
          />
        </Box>
      )}

      {loading ? (
        <Box textAlign="center" mt={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Paper sx={{ overflowX: "auto", maxHeight: 700 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow sx={{ bgcolor: "grey.100" }}>
                  {rows[0] &&
                    Object.keys(rows[0])
                      .filter(
                        (key) => !["profile_url", "photo_url"].includes(key)
                      )
                      .map((key) => (
                        <TableCell key={key} sx={{ fontWeight: 600 }}>
                          {key === "shop_id" && selectedTable === "girls"
                            ? "shop"
                            : key}
                        </TableCell>
                      ))}
                  {selectedTable === "girls" && (
                    <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                  )}
                </TableRow>
              </TableHead>

              <TableBody>
                {rows.map((row, i) => (
                  <TableRow
                    key={i}
                    sx={{
                      bgcolor: i % 2 === 0 ? "background.paper" : "grey.50",
                    }}
                  >
                    {Object.entries(row)
                      .filter(([key]) => !["profile_url", "photo_url"].includes(key))
                      .map(([key, val], j) => {
                        let display = val;
                        if (
                          selectedTable === "girls" &&
                          key === "shop_id" &&
                          typeof val === "number" &&
                          shops[val]
                        ) {
                          display = shops[val];
                        }
                        return (
                          <TableCell
                            key={j}
                            sx={{
                              whiteSpace: "nowrap",
                              maxWidth: 220,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              cursor: "pointer",
                            }}
                            title={String(display)}
                            onClick={() =>
                              navigator.clipboard.writeText(String(display))
                            }
                          >
                            {String(display)}
                          </TableCell>
                        );
                      })}
                    {selectedTable === "girls" && (
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleEditGirl(row)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            variant="outlined"
                            onClick={() => handleDeleteGirl(row)}
                          >
                            Delete
                          </Button>
                        </Stack>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>

          {selectedTable === "girls" && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
              <Pagination
                count={Math.ceil(total / 25)}
                page={page}
                onChange={(_, val) => setPage(val)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}

      <Dialog open={!!editingGirl} onClose={() => setEditingGirl(null)}>
        <DialogTitle>Edit Girl</DialogTitle>
        <DialogContent>
          <TextField
            label="Name"
            fullWidth
            margin="dense"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
          <TextField
            label="Origin"
            fullWidth
            margin="dense"
            value={editOrigin}
            onChange={(e) => setEditOrigin(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingGirl(null)}>Cancel</Button>
          <Button onClick={saveEditGirl} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
