import { useEffect, useState } from "react";
import { ResponsiveLine } from "@nivo/line";
import { Box, Typography, CircularProgress } from "@mui/material";
import { API_BASE } from "../config";

interface TrendData {
  date: string;
  Japanese?: number;
  Korean?: number;
  Chinese?: number;
  Thai?: number;
  Vietnamese?: number;
}

export default function NationalityTrendsChart() {
  const [data, setData] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/analytics/nationality-trends?days=30`)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load trends:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <Box textAlign="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  // Transform data for Nivo format - parse dates properly
  const nivoData = [
    {
      id: "Japanese",
      color: "#3B82F6",
      data: data.map((d) => ({ 
        x: new Date(d.date).toISOString().split('T')[0], 
        y: d.Japanese || 0 
      })),
    },
    {
      id: "Korean",
      color: "#EF4444",
      data: data.map((d) => ({ 
        x: new Date(d.date).toISOString().split('T')[0], 
        y: d.Korean || 0 
      })),
    },
    {
      id: "Chinese",
      color: "#10B981",
      data: data.map((d) => ({ 
        x: new Date(d.date).toISOString().split('T')[0], 
        y: d.Chinese || 0 
      })),
    },
    {
      id: "Thai",
      color: "#F59E0B",
      data: data.map((d) => ({ 
        x: new Date(d.date).toISOString().split('T')[0], 
        y: d.Thai || 0 
      })),
    },
    {
      id: "Vietnamese",
      color: "#8B5CF6",
      data: data.map((d) => ({ 
        x: new Date(d.date).toISOString().split('T')[0], 
        y: d.Vietnamese || 0 
      })),
    },
  ];

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#111827' }}>
        📈 Nationality Trends (Last 30 Days)
      </Typography>
      
      <Box height={400}>
        <ResponsiveLine
          data={nivoData}
          margin={{ top: 20, right: 120, bottom: 50, left: 50 }}
          xScale={{ 
            type: 'time',
            format: '%Y-%m-%d',
            useUTC: false,
            precision: 'day',
          }}
          xFormat="time:%Y-%m-%d"
          yScale={{
            type: 'linear',
            min: 'auto',
            max: 'auto',
          }}
          axisBottom={{
  format: '%m/%d',
  tickSize: 0,
  tickPadding: 10,
  tickValues: 'every 10 days', // ← Shows every 10 days
}}
          axisLeft={{
            tickSize: 0,
            tickPadding: 10,
          }}
          enableGridX={false}
          colors={{ datum: 'color' }}
          lineWidth={3}
          pointSize={0}
          useMesh={true}
          legends={[
            {
              anchor: 'bottom-right',
              direction: 'column',
              justify: false,
              translateX: 100,
              translateY: 0,
              itemsSpacing: 4,
              itemDirection: 'left-to-right',
              itemWidth: 80,
              itemHeight: 20,
              itemOpacity: 0.75,
              symbolSize: 12,
              symbolShape: 'circle',
            }
          ]}
          theme={{
            text: {
                fontFamily: 'Inter, sans-serif',
                fontSize: 12,
            },
            grid: {
              line: {
                stroke: '#E5E7EB',
                strokeWidth: 1,
              }
            },
            axis: {
              ticks: {
                text: {
                  fill: '#6B7280',
                  fontSize: 12,
                  fontWeight: 500,
                }
              }
            },
            legends: {
              text: {
                fontSize: 13,
                fontWeight: 500,
              }
            },
            tooltip: {
              container: {
                background: '#ffffff',
                color: '#111827',
                fontSize: 13,
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                border: '1px solid #E5E7EB',
              }
            }
          }}
        />
      </Box>
    </Box>
  );
}