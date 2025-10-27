// src/pages/DataPage.tsx
import { Box, Container, Typography, Grid, Paper } from "@mui/material";
import { ResponsiveLine } from "@nivo/line";
import { ResponsiveBar } from "@nivo/bar";


export default function DataPage() {
  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 4 }}>
        🔥 Rotisserie Analytics
      </Typography>

      {/* --------------- Overview Cards --------------- */}
      <Grid container spacing={3}>
        <OverviewCard label="Days Online" value="198" />
        <OverviewCard label="Total Visits" value="12,430" />
        <OverviewCard label="Total Views" value="87,912" />
      </Grid>

      {/* --------------- Daily Activity Section --------------- */}
      <SectionTitle title="Daily Activity" />

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <ChartCard title="Visits (Last 7 Days)">
            <Box height={250}>
              <ResponsiveBar
                data={[
                  { day: "Mon", visits: 30 },
                  { day: "Tue", visits: 52 },
                  { day: "Wed", visits: 41 },
                  { day: "Thu", visits: 66 },
                  { day: "Fri", visits: 89 },
                  { day: "Sat", visits: 120 },
                  { day: "Sun", visits: 76 },
                ]}
                keys={["visits"]}
                indexBy="day"
                margin={{ top: 10, right: 10, bottom: 40, left: 40 }}
                colors={["#fbbf24"]}
                axisBottom={{ tickPadding: 8 }}
                axisLeft={{ tickPadding: 8 }}
                enableLabel={false}
                theme={{
                  axis: { ticks: { text: { fill: "#6b7280" } } },
                  grid: { line: { stroke: "#e5e7eb" } },
                }}
              />
            </Box>
          </ChartCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <ChartCard title="Girls by Nationality (Last 30 Days)">
            <Box height={250}>
              {/* You already have this exact chart — plug in your component here */}
              <Typography align="center" color="text.secondary">
                [Stacked area chart placeholder]
              </Typography>
            </Box>
          </ChartCard>
        </Grid>
      </Grid>

      {/* --------------- Engagement Section --------------- */}
      <SectionTitle title="Engagement & Growth" />

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <ChartCard title="Total Views Growth">
            <Box height={250}>
              <ResponsiveLine
                data={[
                  {
                    id: "views",
                    color: "#60a5fa",
                    data: [
                      { x: "Week 1", y: 2000 },
                      { x: "Week 2", y: 3000 },
                      { x: "Week 3", y: 3800 },
                      { x: "Week 4", y: 4800 },
                      { x: "Week 5", y: 5500 },
                    ],
                  },
                ]}
                margin={{ top: 20, right: 20, bottom: 40, left: 50 }}
                xScale={{ type: "point" }}
                yScale={{ type: "linear", min: "auto", max: "auto" }}
                axisBottom={{ tickPadding: 8 }}
                axisLeft={{ tickPadding: 8 }}
                colors={{ datum: "color" }}
                enableArea
                areaOpacity={0.15}
                pointSize={0}
                useMesh
                theme={{
                  axis: { ticks: { text: { fill: "#6b7280" } } },
                  grid: { line: { stroke: "#e5e7eb" } },
                }}
              />
            </Box>
          </ChartCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <ChartCard title="Comment Activity">
            <Box height={250}>
              <Typography align="center" color="text.secondary">
                [Future pie or bar chart placeholder]
              </Typography>
            </Box>
          </ChartCard>
        </Grid>
      </Grid>
    </Container>
  );
}

/* ----------------------- Sub Components ----------------------- */

function OverviewCard({ label, value }: { label: string; value: string }) {
  return (
    <Grid item xs={12} sm={4}>
      <Paper
        sx={{
          p: 3,
          textAlign: "center",
          borderRadius: 3,
          bgcolor: "#fff",
          boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
        }}
      >
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography
          variant="h5"
          sx={{ fontWeight: 700, color: "#111827", mt: 0.5 }}
        >
          {value}
        </Typography>
      </Paper>
    </Grid>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Paper
      sx={{
        p: 3,
        borderRadius: 3,
        bgcolor: "#fff",
        boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
      }}
    >
      <Typography
        variant="subtitle1"
        sx={{ mb: 2, fontWeight: 600, color: "#111827" }}
      >
        {title}
      </Typography>
      {children}
    </Paper>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <Typography
      variant="h6"
      sx={{
        mt: 5,
        mb: 2,
        fontWeight: 700,
        color: "#374151",
        borderBottom: "2px solid #e5e7eb",
        display: "inline-block",
        pb: 0.5,
      }}
    >
      {title}
    </Typography>
  );
}
