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
  Tabs,
  Tab,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import FiltersBar, { Filters } from "../components/FiltersBar";
import { API_BASE } from "../config";
import ReactMarkdown from "react-markdown";

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

  // --- edit girl state ---
  const [editingGirl, setEditingGirl] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editOrigin, setEditOrigin] = useState("");
  const [editProfileUrl, setEditProfileUrl] = useState("");
  const [editPhotoUrl, setEditPhotoUrl] = useState("");

  // --- edit shop state ---
const [editingShop, setEditingShop] = useState<any | null>(null);
const [editShopName, setEditShopName] = useState("");
const [editShopAddress, setEditShopAddress] = useState("");
const [editShopUrl, setEditShopUrl] = useState("");
const [editShopPhone, setEditShopPhone] = useState("");
const [editShopArea, setEditShopArea] = useState("");
const [editLat, setEditLat] = useState("");
const [editLng, setEditLng] = useState("");


  // --- blog composer state ---
  const [blogTitle, setBlogTitle] = useState("");
  const [blogContent, setBlogContent] = useState("");
  const [blogTab, setBlogTab] = useState(0);
  const [blogSaving, setBlogSaving] = useState(false);

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

  // --- edit girl handlers ---
  const handleEditGirl = (girl: any) => {
    setEditingGirl(girl);
    setEditName(girl.name || "");
    setEditOrigin(girl.origin || "");
    setEditProfileUrl(girl.profile_url || "");
    setEditPhotoUrl(girl.photo_url || "");
  };

  const saveEditGirl = async () => {
  if (!editingGirl) return;
  try {
    const res = await axios.patch(
      `/api/admin/girl/${editingGirl.id}`,
      {
        name: editName,
        origin: editOrigin,
        profile_url: editProfileUrl,
        photo_url: editPhotoUrl,
      },
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

  // --- edit shop handlers ---
  const handleEditShop = (shop: any) => {
  setEditingShop(shop);
  setEditShopName(shop.name || "");
  setEditShopAddress(shop.address || "");
  setEditShopUrl(shop.url || "");          // ✅ matches DB column
  setEditShopPhone(shop.phone || "");      // ✅ new
  setEditShopArea(shop.area || "");        // ✅ new
  setEditLat(shop.lat ?? "");
  setEditLng(shop.lng ?? "");
};


  const saveEditShop = async () => {
  if (!editingShop) return;
  try {
    let url = editShopUrl.trim();
    if (url && !/^https?:\/\//i.test(url)) url = "https://" + url;

    const res = await axios.patch(
      `/api/admin/shop/${editingShop.id}`,
      {
        name: editShopName.trim(),
        address: editShopAddress.trim(),
        url,                                   // ✅ correct field
        phone: editShopPhone.trim() || null,   // ✅ new
        area: editShopArea.trim() || null,     // ✅ new
        lat: parseFloat(editLat) || null,
        lng: parseFloat(editLng) || null,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    setRows((prev) =>
      prev.map((r) =>
        r.id === editingShop.id ? { ...r, ...res.data.updated } : r
      )
    );
    setEditingShop(null);
  } catch (err) {
    console.error("update shop fail", err);
    alert("Failed to update shop.");
  }
};


  // --- blog save draft / publish ---
  const handleSaveBlog = async (isDraft: boolean) => {
    if (!blogTitle.trim() || !blogContent.trim()) {
      alert("Please fill in both title and content");
      return;
    }
    setBlogSaving(true);
    try {
      await axios.post(
        "/api/blog",
        {
          title: blogTitle.trim(),
          content: blogContent.trim(),
          status: isDraft ? "draft" : "published",
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(isDraft ? "Draft saved!" : "Blog post published!");
      setBlogTitle("");
      setBlogContent("");
      fetchTable();
    } catch (err) {
      console.error("blog save fail", err);
      alert("Failed to save blog post.");
    } finally {
      setBlogSaving(false);
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
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
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
                      .filter((key) => !["profile_url", "photo_url"].includes(key))
                      .map((key) => (
                        <TableCell key={key} sx={{ fontWeight: 600 }}>
                          {key === "shop_id" && selectedTable === "girls" ? "shop" : key}
                        </TableCell>
                      ))}
                  {(selectedTable === "girls" || selectedTable === "shops") && (
                    <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                  )}
                </TableRow>
              </TableHead>

              <TableBody>
                {rows.map((row, i) => (
                  <TableRow key={i} sx={{ bgcolor: i % 2 === 0 ? "background.paper" : "grey.50" }}>
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
                            onClick={() => navigator.clipboard.writeText(String(display))}
                          >
                            {String(display)}
                          </TableCell>
                        );
                      })}
                    {selectedTable === "girls" && (
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Button size="small" variant="outlined" onClick={() => handleEditGirl(row)}>
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
                    {selectedTable === "shops" && (
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Button size="small" variant="outlined" onClick={() => handleEditShop(row)}>
                            Edit
                          </Button>
                        </Stack>
                      </TableCell>
                    )}
                    {selectedTable === "blog_posts" && (
        <TableCell>
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                setBlogTitle(row.title);
                setBlogContent(row.content);
                setBlogTab(0);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              Edit
            </Button>
            <Button
              size="small"
              color="error"
              variant="outlined"
              onClick={async () => {
                if (!window.confirm(`Delete "${row.title}"?`)) return;
                try {
                  await axios.delete(`/api/blog/${row.id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  setRows((prev) => prev.filter((r) => r.id !== row.id));
                } catch (err) {
                  console.error("delete blog fail", err);
                  alert("Failed to delete post.");
                }
              }}
            >
              Delete
            </Button>
          </Stack>
        </TableCell>)}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>

          {(selectedTable === "girls" || selectedTable === "shops") && (
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

      {/* --- Blog Composer --- */}
      {selectedTable === "blog_posts" && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            ✏️ Write a New Blog Post
          </Typography>
          <Tabs value={blogTab} onChange={(_, val) => setBlogTab(val)} sx={{ mb: 2 }}>
            <Tab label="Edit" />
            <Tab label="Preview" />
          </Tabs>

          {blogTab === 0 && (
            <Stack spacing={2}>
              <TextField label="Title" fullWidth value={blogTitle} onChange={(e) => setBlogTitle(e.target.value)} />
              <TextField
                label="Content (Markdown supported)"
                fullWidth
                multiline
                minRows={10}
                value={blogContent}
                onChange={(e) => setBlogContent(e.target.value)}
              />
              <Stack direction="row" spacing={2}>
                <Button variant="outlined" onClick={() => handleSaveBlog(true)} disabled={blogSaving}>
                  Save Draft
                </Button>
                <Button variant="contained" onClick={() => handleSaveBlog(false)} disabled={blogSaving}>
                  Publish
                </Button>
              </Stack>
            </Stack>
          )}

          {blogTab === 1 && (
            <Paper sx={{ p: 2, minHeight: 300 }}>
              <Typography variant="h6" gutterBottom>
                {blogTitle || "(untitled)"}
              </Typography>
              <ReactMarkdown>{blogContent || "_Nothing yet..._"}</ReactMarkdown>
            </Paper>
          )}
        </Box>
      )}

      {/* --- Edit Girl Modal --- */}
      {/* --- Edit Girl Modal --- */}
<Dialog open={!!editingGirl} onClose={() => setEditingGirl(null)} maxWidth="sm" fullWidth>
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
    <TextField
      label="Profile URL"
      fullWidth
      margin="dense"
      value={editProfileUrl}
      onChange={(e) => setEditProfileUrl(e.target.value)}
      helperText="Edit or paste new link (e.g. https://45granville.com.au/j-tomomi/)"
    />
    <TextField
      label="Photo URL"
      fullWidth
      margin="dense"
      value={editPhotoUrl}
      onChange={(e) => setEditPhotoUrl(e.target.value)}
    />
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setEditingGirl(null)}>Cancel</Button>
    <Button onClick={saveEditGirl} variant="contained">
      Save
    </Button>
  </DialogActions>
</Dialog>


      {/* --- Edit Shop Modal --- */}
      <Dialog open={!!editingShop} onClose={() => setEditingShop(null)} maxWidth="sm" fullWidth>
  <DialogTitle>Edit Shop</DialogTitle>
  <DialogContent>
    <TextField
      label="Name"
      fullWidth
      margin="dense"
      value={editShopName}
      onChange={(e) => setEditShopName(e.target.value)}
    />
    <TextField
      label="Address"
      fullWidth
      margin="dense"
      multiline
      minRows={2}
      value={editShopAddress}
      onChange={(e) => setEditShopAddress(e.target.value)}
    />
    <TextField
      label="Website URL"
      fullWidth
      margin="dense"
      value={editShopUrl}
      onChange={(e) => setEditShopUrl(e.target.value)}
      helperText="Automatically adds https:// if missing"
    />
    <TextField
      label="Phone"
      fullWidth
      margin="dense"
      value={editShopPhone}
      onChange={(e) => setEditShopPhone(e.target.value)}
    />
    <TextField
      label="Area / Suburb"
      fullWidth
      margin="dense"
      value={editShopArea}
      onChange={(e) => setEditShopArea(e.target.value)}
    />
    <Stack direction="row" spacing={2}>
      <TextField
        label="Latitude"
        type="number"
        fullWidth
        value={editLat}
        onChange={(e) => setEditLat(e.target.value)}
      />
      <TextField
        label="Longitude"
        type="number"
        fullWidth
        value={editLng}
        onChange={(e) => setEditLng(e.target.value)}
      />
    </Stack>
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setEditingShop(null)}>Cancel</Button>
    <Button onClick={saveEditShop} variant="contained">
      Save
    </Button>
    <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
  Last scraped: {editingShop?.last_scraped ? new Date(editingShop.last_scraped).toLocaleString() : "—"}
</Typography>

  </DialogActions>
</Dialog>

    </Box>
  );
}
