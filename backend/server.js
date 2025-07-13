const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const DATABASE_ID = process.env.DATABASE_ID;


// GET TASKS FROM NOTION
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

// UPDATE FINISHED/PLANNED COUNTS IN NOTION
app.patch("/update-task/:pageId", async (req, res) => {
  const { finished, planned } = req.body;
  const { pageId } = req.params;

  // Build property updates
  let properties = {};
  if (typeof finished === "number") {
    properties["Finished"] = {
      number: finished,
    };
  }
  if (typeof planned === "number") {
    properties["Planned"] = {
      number: planned,
    };
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

// START THE SERVER
app.listen(5000, () => {
  console.log("Backend server running on port 5000");
});
