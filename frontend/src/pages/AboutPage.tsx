import { Box, Typography, Divider  } from "@mui/material";

export default function AboutPage() {
  return (
    
    <Box 
    sx={{ maxWidth: 700, mx: "auto", py: 4 }}>
      {/* Title */}
      
<img 
src="https://i.pinimg.com/736x/b6/e0/c4/b6e0c49d120c17cc047b086bca5bb597.jpg" 
alt="me"
style={{
    maxWidth: "80vw",
    marginBottom: "10px",
}} />

      {/* Intro */}
      <Typography variant="body1" paragraph>
        I couldn’t stand the ugly, eye-hurting rosters out there, so I built this
        so you don’t have to.
      </Typography>

      <Divider sx={{ my: 3 }} />

      {/* How it works */}
      <Typography variant="h6" gutterBottom>
        How it works
      </Typography>
      <Typography variant="body1" paragraph>
        Every day, my Python scripts scrape roster data from shop websites.
        That data gets saved into a database, and then this web app fetches it
        for you.
      </Typography>

      <Divider sx={{ my: 3 }} />

      {/* The real world problem */}
      <Typography variant="h6" gutterBottom>
        The real-world problem
      </Typography>
      <Typography variant="body1" paragraph>
        The shops you see here at least have some kind of structure on their
        sites. But many others don’t — or worse, they don’t even bother with a
        roster page. That’s like a restaurant website without a menu. Crazy,
        right?
      </Typography>

      <Divider sx={{ my: 3 }} />

      {/* Closing */}
      <Typography variant="h6" gutterBottom>
        Closing note
      </Typography>
      <Typography variant="body1" paragraph>
        This is an indie project, built spare-time with stubbornness, coffee,
        and chicken jokes. It’s not official, but it’s here to make life easier.
        Enjoy the spin 🔄.
      </Typography>
      
<Typography variant="body1" paragraph>
  And hey, don’t come at me about the design looking like a
  highschooler’s summer project. Strong structure and data come first.
  Sleek animations and sprinkles can wait. If it works, it works. 😎
</Typography>
<Typography variant="body2" sx={{ mt: 4 }}>
  Curious? Check out the code on{" "}
  <a
    href="https://github.com/shiori-fujino/rotisserie"
    target="_blank"
    rel="noopener noreferrer"
    style={{ color: "#1976d2", textDecoration: "none", fontWeight: "bold" }}
  >
    GitHub
  </a>
  .
</Typography>

    </Box>
  );
}
