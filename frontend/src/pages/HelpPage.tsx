import { 
  Box, Typography, Divider, Stack, TextField, Button, Snackbar, Alert 
} from "@mui/material";
import { useState } from "react";
import axios from "axios";

export default function HelpPage() {
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) return;

    try {
      await axios.post("/api/contact", { message }); // backend endpoint
      setOpen(true); // show toast
      setMessage(""); // clear field
    } catch (err) {
      console.error("Failed to send message", err);
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: "auto", py: 4 }}>
      {/* Q/A */}
      <Typography variant="h5" gutterBottom sx={{ pb: "10px" }}>
        Frequently Asked Questions
      </Typography>

      <Stack spacing={2}>
        <Box>
          <Typography variant="subtitle1">Q: Why isn’t my shop listed?</Typography>
          <Typography variant="body2">
            A: I only scraped the easy ones first. The spaghetti-coded websites will come later.  
            For now, I’m testing with around 100+ girls (6 shops × ~20 girls a day — did the math).  
          </Typography>
        </Box>

        <Box>
          <Typography variant="subtitle1">Q: Why “The Rotisserie”? 🍗</Typography>
          <Typography variant="body2">
            A: Because my repos were already called “chicken roast,” “spit roast,” “Sunday roast,” etc.  
            This one just stuck. Plus, rosters spin like chickens 🐔 juicy, hot, always turning.
          </Typography>
        </Box>

        <Box>
          <Typography variant="subtitle1">Q: How often is the roster updated?</Typography>
          <Typography variant="body2">
            A: Every day, directly from shop websites.
          </Typography>
        </Box>

        <Box>
          <Typography variant="subtitle1">Q: Can I get my shop added?</Typography>
          <Typography variant="body2">
            A: Maybe. If your site has some structure, ping me! If it’s too cursed, it’ll sit in my
            “one day… maybe” pile.
          </Typography>
        </Box>

        <Box>
          <Typography variant="subtitle1">Q: Is this 100% accurate?</Typography>
          <Typography variant="body2">
            A: I scrape what’s public. Shops sometimes change rosters late, or staff swap/cancel shifts.  
            If you need the latest info, the best way is to contact the shop directly.
          </Typography>
        </Box>

        <Box>
          <Typography variant="subtitle1">Q: Is this legal?</Typography>
          <Typography variant="body2">
            A: Yep. Everything here is public info from licensed shops’ own websites.  
            I’m just putting it together in a way that doesn’t fry your brain.
          </Typography>
        </Box>

        <Box>
          <Typography variant="subtitle1">Q: Is this free?</Typography>
          <Typography variant="body2">
            A: Yep, totally free. I don’t plan to charge punters.  
            If this thing somehow blows up (like 10k visits a day 🤯), I might hit up shops to pay for the exposure.  
            But for now, it’s just one of my random projects (been making dumb $hit like this since forever lol).
          </Typography>
        </Box>
      </Stack>

      <Divider sx={{ my: 4 }} />

      {/* Contact */}
      <Typography variant="h5" gutterBottom>
        Contact Me
      </Typography>
      <Stack spacing={2}>
        <Typography variant="body2">Email: not official yet</Typography>
        <Typography variant="body2">Whatsapp: not quite yet</Typography>

        <Typography variant="body2" sx={{ mt: 2 }}>
          Or leave a message here(This one is up and working right now.):
        </Typography>
        <TextField
          fullWidth
          label="Your message"
          multiline
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <Button variant="contained" onClick={handleSend}>
          Send
        </Button>
      </Stack>

      <Snackbar
        open={open}
        autoHideDuration={3000}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" onClose={() => setOpen(false)}>
          Message sent! 🍗
        </Alert>
      </Snackbar>
    </Box>
  );
}
