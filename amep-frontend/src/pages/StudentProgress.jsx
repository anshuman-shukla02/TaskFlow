import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { TrendingUp, Activity, Target } from "lucide-react";

export default function StudentProgress() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      const res = await fetch("http://localhost:5002/api/progress", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const result = await res.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-10 text-center">Loading Analytics...</div>;

  if (!data) return <div className="p-10 text-center">No progress data available yet. Start solving tasks!</div>;

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-slate-50 min-h-screen">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Performance Analytics</h1>
        <p className="text-slate-500">Deep dive into your learning journey.</p>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <TrendingUp />
          </div>
          <div>
            <p className="text-sm text-slate-500">Average Score</p>
            <p className="text-2xl font-bold">{data.avgScore}%</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-xl">
            <Activity />
          </div>
          <div>
            <p className="text-sm text-slate-500">Tasks Completed</p>
            <p className="text-2xl font-bold">{data.totalTasks}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Target />
          </div>
          <div>
            <p className="text-sm text-slate-500">Bloom Level</p>
            <p className="text-2xl font-bold">{data.topBloomLevel || "N/A"}</p>
          </div>
        </div>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* GROWTH CURVE */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border">
          <h2 className="text-xl font-bold mb-6">Score Trajectory</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.recentScores}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" hide />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#2563eb"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 8 }}
                  name="Score"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* TOPIC STRENGTHS */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border">
          <h2 className="text-xl font-bold mb-6">Topic Mastery</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topicStrengths} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="_id" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="avgScore" fill="#8884d8" radius={[0, 4, 4, 0]}>
                  {data.topicStrengths.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
