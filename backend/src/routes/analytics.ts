import { Router } from "express";
import pool from "../db";

const router = Router();

// GET /api/analytics/nationality-trends?days=30
router.get("/nationality-trends", async (req, res) => {
  const days = Math.min(Number(req.query.days) || 30, 90); // max 90 days

  try {
    const query = `
      SELECT 
        r.date,
        g.origin,
        COUNT(DISTINCT g.id) AS count
      FROM roster_entries r
      JOIN girls g ON g.id = r.girl_id
      WHERE r.date >= CURRENT_DATE - INTERVAL '${days} days'
        AND g.origin IS NOT NULL
      GROUP BY r.date, g.origin
      ORDER BY r.date DESC;
    `;
    
    const { rows } = await pool.query(query);
    
    // Transform into chart-friendly format
    const dateMap: Record<string, any> = {};
    
    rows.forEach((row) => {
      const date = row.date;
      if (!dateMap[date]) {
        dateMap[date] = { date };
      }
      
      // Normalize origin for consistency
      const origin = row.origin.toLowerCase();
      if (origin === 'j' || origin === 'jp' || origin === 'japanese') {
        dateMap[date].Japanese = (dateMap[date].Japanese || 0) + Number(row.count);
      } else if (origin === 'k' || origin === 'kr' || origin === 'korean') {
        dateMap[date].Korean = (dateMap[date].Korean || 0) + Number(row.count);
      } else if (origin === 'c' || origin === 'cn' || origin === 'chinese') {
        dateMap[date].Chinese = (dateMap[date].Chinese || 0) + Number(row.count);
      } else if (origin === 't' || origin === 'th' || origin === 'thai') {
        dateMap[date].Thai = (dateMap[date].Thai || 0) + Number(row.count);
      } else if (origin === 'v' || origin === 'vn' || origin === 'vietnamese') {
        dateMap[date].Vietnamese = (dateMap[date].Vietnamese || 0) + Number(row.count);
      }
      // Add more as needed
    });
    
    const chartData = Object.values(dateMap).reverse(); // oldest to newest
    res.json(chartData);
    
  } catch (err) {
    console.error("Error fetching nationality trends:", err);
    res.status(500).json({ error: "Failed to fetch trends" });
  }
});

export default router;