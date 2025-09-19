import { useEffect, useState } from "react";
import axios from "axios";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Link, Box, TextField, Rating, Stack, Snackbar, Alert
} from "@mui/material";

interface GirlModalProps {
  open: boolean;
  onClose: () => void;
  girlId: number;
  girlName: string;
  profileUrl: string;
  onViewsUpdated?: () => void;
  onReviewsUpdated?: () => void;
}

interface Review {
  id: number;
  rating: number;
  comment: string;
  created_at: string;
}

export default function GirlModal({
  open,
  onClose,
  girlId,
  girlName,
  profileUrl,
  onViewsUpdated,
  onReviewsUpdated,
}: GirlModalProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState<number | null>(0);
  const [comment, setComment] = useState("");

  // 🔔 snackbar state
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  // 🔥 load existing reviews
  useEffect(() => {
    if (open && girlId) {
      axios.get(`http://localhost:4000/api/reviews/${girlId}`)
        .then((res) => setReviews(res.data))
        .catch((err) => console.error("fetch reviews error", err));
    }
  }, [open, girlId]);

  // 🔥 increment views once per open
  useEffect(() => {
    if (open && girlId) {
      axios.post(`http://localhost:4000/api/views/${girlId}`)
        .then(() => {
          if (onViewsUpdated) onViewsUpdated();
        })
        .catch((err) => console.error("Failed to increment views", err));
    }
  }, [open, girlId]);

  const handleSubmitReview = async () => {
    try {
      await axios.post(`http://localhost:4000/api/reviews/${girlId}`, {
        rating,
        comment,
      });
      setComment("");
      setRating(0);

      // reload modal reviews list
      const res = await axios.get(`http://localhost:4000/api/reviews/${girlId}`);
      setReviews(res.data);

      // ✅ instantly bump grid count
      if (onReviewsUpdated) onReviewsUpdated();

      // 🔔 show success toast
      setSnackbarOpen(true);
    } catch (err) {
      console.error("add review error", err);
    }
  };

  if (!open) return null;

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h6">{girlName || "Unknown"}</Typography>
            <Link href={profileUrl} target="_blank" rel="noreferrer">
              Visit Profile
            </Link>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          {/* Reviews */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1">Reviews</Typography>
            {reviews.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No reviews yet.
              </Typography>
            ) : (
              <Stack spacing={2} sx={{ mt: 1 }}>
                {reviews.map((r) => (
                  <Box key={r.id}>
                    <Rating value={r.rating} readOnly size="small" />
                    <Typography variant="body2">{r.comment}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(r.created_at).toLocaleString()}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>

          {/* Add new review */}
          <Box>
            <Typography variant="subtitle1">Leave a Review</Typography>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Rating
                value={rating}
                onChange={(_, val) => setRating(val)}
              />
              <TextField
                label="Your review"
                multiline
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                fullWidth
              />
              <Button
                variant="contained"
                onClick={handleSubmitReview}
                disabled={!rating || !comment.trim()}
              >
                Submit
              </Button>
            </Stack>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* 🔔 Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" onClose={() => setSnackbarOpen(false)}>
          Review submitted!
        </Alert>
      </Snackbar>
    </>
  );
}
