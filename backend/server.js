const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const DATABASE_ID = process.env.DATABASE_ID;

// === GET TASKS FROM NOTION ===
app.post("/tasks", async (req, res) => {
  try {
    const response = await axios.post(
      `https://api.notion.com/v1/databases/${DATABASE_ID}/query`,
      {},
      {
        headers: {
          Authorization: `Bearer ${NOTION_API_KEY}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
      }
    );
    res.json(response.data.results);
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

// === UPDATE FINISHED/PLANNED COUNTS IN NOTION ===
app.patch("/update-task/:pageId", async (req, res) => {
  const { finished, planned } = req.body;
  const { pageId } = req.params;

  let properties = {};
  if (typeof finished === "number") {
    properties["Finished"] = { number: finished };
  }
  if (typeof planned === "number") {
    properties["Planned"] = { number: planned };
  }

  try {
    await axios.patch(
      `https://api.notion.com/v1/pages/${pageId}`,
      { properties },
      {
        headers: {
          Authorization: `Bearer ${NOTION_API_KEY}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
      }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

// === GET INSIGHTS (EXAMPLE IMPLEMENTATION) ===
app.get("/pomodoro-insights", async (req, res) => {
  try {
    // Fetch all tasks and calculate insights
    const response = await axios.post(
      `https://api.notion.com/v1/databases/${DATABASE_ID}/query`,
      {},
      {
        headers: {
          Authorization: `Bearer ${NOTION_API_KEY}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
      }
    );

    const tasks = response.data.results;
    const totalPomos = tasks.reduce(
      (sum, t) => sum + (t.properties?.Finished?.number || 0),
      0
    );

    // You can expand these calculations as you wish!
    const focusTimeMinutes = totalPomos * 25; // assuming 1 pomo = 25min
    const focusTime =
      focusTimeMinutes >= 60
        ? `${Math.floor(focusTimeMinutes / 60)}h ${focusTimeMinutes % 60}m`
        : `${focusTimeMinutes}m`;

    // Example: category breakdown (optional)
    const categories = {};
    tasks.forEach((t) => {
      const cat =
        t.properties?.Category?.select?.name ||
        t.properties?.Type?.select?.name ||
        "Other";
      categories[cat] = (categories[cat] || 0) + (t.properties?.Finished?.number || 0);
    });
    const categoryArr = Object.entries(categories).map(([name, count]) => ({
      name,
      count,
    }));

    res.json({
      totalPomos,
      focusTime,
      categories: categoryArr,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get insights." });
  }
});

// === START THE SERVER ===
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
