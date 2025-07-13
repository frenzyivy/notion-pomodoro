import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

// ======= PUT YOUR KEYS HERE ==========
const NOTION_API_KEY = "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";
const DATABASE_ID = "22e45b79-a2a6-81a1-ab03-f5859afcdbcf";
// ======================================

function Pomodoro() {
  const WORK_DURATION = 25 * 60;
  const BREAK_DURATION = 5 * 60;
  const LONG_BREAK_DURATION = 15 * 60;

  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(WORK_DURATION);
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState("");
  const [cycleCount, setCycleCount] = useState(0);  // for long break logic
  const [streak, setStreak] = useState(0);          // for streak tracker

  const timerRef = useRef(null);

  // Fetch tasks from Notion
  useEffect(() => {
    async function fetchTasks() {
      try {
        const response = await axios.post("http://localhost:5000/tasks");
        setTasks(response.data);
      } catch (err) {
        console.error("Error fetching Notion tasks:", err);
      }
    }
    fetchTasks();
  }, []);

  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((sec) => {
          if (sec > 0) return sec - 1;
          clearInterval(timerRef.current);
          setIsActive(false);

          // After work session ends
          if (!isBreak && selectedTask) {
            const task = tasks.find((t) => t.id === selectedTask);
            const currentFinished = task?.properties["Finished"]?.number || 0;
            incrementPomodoroForTask(selectedTask, currentFinished + 1);
            setCycleCount((prev) => prev + 1); // add to cycle count
            setStreak((prev) => prev + 1);     // add to streak!
          }

          let nextDuration;
          let nextIsBreak;

          if (!isBreak) {
            // Just finished WORK, so go to break
            nextIsBreak = true;
            if ((cycleCount + 1) % 4 === 0) {
              nextDuration = LONG_BREAK_DURATION;
              alert("Long break! Chill for 15 minutes 💤");
            } else {
              nextDuration = BREAK_DURATION;
              alert("Time for a break!");
            }
          } else {
            // Just finished a break (short/long), go to work
            nextIsBreak = false;
            nextDuration = WORK_DURATION;
            alert("Back to work!");
          }

          setIsBreak(nextIsBreak);
          setSecondsLeft(nextDuration);
          return nextDuration;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line
  }, [isActive, cycleCount]);

  useEffect(() => {
    if (!isActive) {
      setSecondsLeft(isBreak
        ? ((cycleCount % 4 === 0 && cycleCount !== 0) ? LONG_BREAK_DURATION : BREAK_DURATION)
        : WORK_DURATION
      );
    }
    // eslint-disable-next-line
  }, [isBreak, cycleCount]);

  const startTimer = () => {
    if (!selectedTask) {
      alert("Please select a task first!");
      return;
    }
    if (!isActive) setIsActive(true);
  };

  const stopTimer = () => {
    setIsActive(false);
    clearInterval(timerRef.current);
  };

  const resetTimer = () => {
    stopTimer();
    setSecondsLeft(isBreak ? BREAK_DURATION : WORK_DURATION);
    setCycleCount(0);
    setStreak(0);
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  async function incrementPomodoroForTask(pageId, newFinishedValue) {
    try {
      await axios.patch(`http://localhost:5000/update-task/${pageId}`, {
        finished: newFinishedValue,
      });
    } catch (err) {
      alert("Error updating Pomodoros in Notion!");
      console.error(err);
    }
  }

  const selectedTaskObj = tasks.find((t) => t.id === selectedTask);
  const finishedCount = selectedTaskObj?.properties["Finished"]?.number ?? 0;
  const plannedCount = selectedTaskObj?.properties["Planned"]?.number ?? 0;
  const percentage = isBreak
    ? (cycleCount % 4 === 0 && cycleCount !== 0
        ? ((LONG_BREAK_DURATION - secondsLeft) / LONG_BREAK_DURATION) * 100
        : ((BREAK_DURATION - secondsLeft) / BREAK_DURATION) * 100)
    : ((WORK_DURATION - secondsLeft) / WORK_DURATION) * 100;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#181B20",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Poppins, Inter, sans-serif",
      }}
    >
      <h2 style={{ marginBottom: 18, fontWeight: 700, fontSize: 32 }}>
        {isBreak
          ? (cycleCount % 4 === 0 && cycleCount !== 0 ? "Long Break" : "Break Time")
          : "Focus Time"}
      </h2>

      <div style={{
        marginBottom: 12,
        color: streak >= 4 ? "#f39c12" : "#aaa",
        fontWeight: streak >= 4 ? "bold" : "normal",
        fontSize: 22,
        letterSpacing: "1px"
      }}>
        {streak > 0 && (
          <>
            🔥 Cycle Streak: {streak}
            {streak >= 4 && " 🌟"}
            {streak >= 10 && " 🏆"}
          </>
        )}
      </div>

      {(streak === 4) && (
        <div style={{ color: "#f39c12", marginBottom: 8 }}>
          4 in a row! Long break time 🚀
        </div>
      )}
      {(streak === 10) && (
        <div style={{ color: "#f39c12", marginBottom: 8 }}>
          10! Pomodoro legend! 🏆
        </div>
      )}

      <div style={{ marginBottom: 18 }}>
        <label style={{ fontSize: 18 }}>
          Pick your task:{" "}
          <select
            value={selectedTask}
            onChange={(e) => setSelectedTask(e.target.value)}
            style={{
              fontSize: 16,
              padding: 6,
              borderRadius: 4,
              background: "#23272F",
              color: "#fff",
              border: "1px solid #2983fa",
              outline: "none",
            }}
          >
            <option value="">-- Select Task --</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.properties["Task Name"]?.title[0]?.plain_text || "Untitled"}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ width: 220, height: 220, marginBottom: 20 }}>
        <CircularProgressbar
          value={percentage}
          text={`${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`}
          strokeWidth={8}
          styles={buildStyles({
            textColor: "#fff",
            pathColor: "#2983fa",
            trailColor: "#23272F",
            textSize: "2rem",
          })}
        />
        <div
          style={{
            color: "#aaa",
            fontSize: "1.2em",
            textAlign: "center",
            marginTop: 10,
            letterSpacing: "1px",
          }}
        >
          ({finishedCount}/{plannedCount || 1})
        </div>
      </div>

      <div style={{ margin: "18px 0 24px" }}>
        <button
          onClick={isActive ? stopTimer : startTimer}
          style={{
            background: "#2983fa",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "10px 28px",
            marginRight: 12,
            fontWeight: 600,
            fontSize: 16,
            cursor: "pointer",
          }}
        >
          {isActive ? "Pause" : "Start"}
        </button>
        <button
          onClick={resetTimer}
          style={{
            background: "#fff",
            color: "#2983fa",
            border: "none",
            borderRadius: 6,
            padding: "10px 22px",
            fontWeight: 600,
            fontSize: 16,
            cursor: "pointer",
          }}
        >
          Reset
        </button>
      </div>

      {selectedTask && (
        <div style={{ marginTop: 16, fontSize: 18 }}>
          <b>Working on:</b>{" "}
          {selectedTaskObj?.properties["Task Name"]?.title[0]?.plain_text}
          <br />
          <b>Finished Pomodoros:</b> {finishedCount} <br />
          <b>Goal (Planned):</b> {plannedCount}
        </div>
      )}
    </div>
  );
}

export default Pomodoro;
