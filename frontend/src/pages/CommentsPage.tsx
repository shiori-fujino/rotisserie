// src/pages/CommentsPage.tsx
import { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE } from "../config";
import {
  Container,
  Typography,
  Box,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Rating,
  Divider,
  Button,
  Stack,
} from "@mui/material";
import GirlModal from "../components/GirlModal";

interface CommentItem {
  id: number;
  girl_id: number;
  girl_name: string | null;
  profile_url: string | null;
  photo_url: string | null;
  rating: number | null;
  comment: string | null;
  created_at: string;
}

export default function CommentsPage() {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 20;

  const [selectedGirl, setSelectedGirl] = useState<{
    id: number;
    name: string;
    profileUrl: string;
    highlightCommentId?: number;
  } | null>(null);

  const loadComments = async (reset = false) => {
    try {
      const res = await axios.get(`${API_BASE}/api/comments`, {
        params: { limit: LIMIT, offset: reset ? 0 : offset },
      });
      const newComments = res.data;
      if (reset) {
        setComments(newComments);
      } else {
        setComments((prev) => [...prev, ...newComments]);
      }
      setHasMore(newComments.length === LIMIT);
      setOffset((prev) => (reset ? LIMIT : prev + LIMIT));
    } catch (err) {
      console.error("fetch comments error", err);
    }
  };

  useEffect(() => {
    loadComments(true);
  }, []);

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h5" gutterBottom>
        Latest Comments
      </Typography>

      {comments.length === 0 && (
        <Typography color="text.secondary">No comments yet.</Typography>
      )}

      <List>
        {comments.map((c) => (
          <Box key={c.id}>
            <ListItem alignItems="flex-start" disableGutters>
              <ListItemAvatar>
                <Avatar
                  src={c.photo_url || "/placeholder.png"}
                  alt={c.girl_name || "Unknown"}
                  sx={{ width: 48, height: 64, borderRadius: 1 }}
                />
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Box>
                      <Typography variant="subtitle2" component="span">
                        {c.girl_name || "Unknown"}
                      </Typography>
                      {c.rating && (
                        <Rating
                          value={c.rating}
                          readOnly
                          size="small"
                          sx={{ ml: 1, verticalAlign: "middle" }}
                        />
                      )}
                    </Box>
                    <Stack direction="row" spacing={1}>
                      {c.profile_url && (
                        <Button
                          href={c.profile_url}
                          target="_blank"
                          rel="noreferrer"
                          size="small"
                        >
                          Visit profile →
                        </Button>
                      )}
                      <Button
                        size="small"
                        onClick={() =>
                          setSelectedGirl({
                            id: c.girl_id,
                            name: c.girl_name || "Unknown",
                            profileUrl: c.profile_url || "#",
                            highlightCommentId: c.id, // 👈 pass comment id
                          })
                        }
                      >
                        View comment →
                      </Button>
                    </Stack>
                  </Stack>
                }
                secondary={
                  <>
                    <Typography
                      variant="body2"
                      component="span"
                      sx={{ whiteSpace: "pre-line" }}
                    >
                      {c.comment}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      component="div"
                    >
                      {new Date(c.created_at).toLocaleString()}
                    </Typography>
                  </>
                }
                secondaryTypographyProps={{ component: "div" }}
              />
            </ListItem>
            <Divider component="li" />
          </Box>
        ))}
      </List>

      {hasMore && (
        <Box textAlign="center" sx={{ mt: 2 }}>
          <Button variant="outlined" onClick={() => loadComments()}>
            Load more comments
          </Button>
        </Box>
      )}

      {/* Girl Modal */}
      {selectedGirl && (
        <GirlModal
          open={!!selectedGirl}
          onClose={() => setSelectedGirl(null)}
          girlId={selectedGirl.id}
          girlName={selectedGirl.name}
          profileUrl={selectedGirl.profileUrl}
          highlightCommentId={selectedGirl.highlightCommentId} // 👈 new prop
        />
      )}
    </Container>
  );
}
