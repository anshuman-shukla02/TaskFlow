import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MoreVertical, X, TrendingUp, BookOpen, CheckCircle } from "lucide-react";
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid
} from "recharts";

export default function StudentOverview() {
    const [students, setStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [growthData, setGrowthData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedDivision, setSelectedDivision] = useState("All");

    useEffect(() => {
        fetchStudents();
    }, [selectedDivision]);

    useEffect(() => {
        if (selectedStudent) {
            fetchGrowthData(selectedStudent._id);
        }
    }, [selectedStudent]);

    const fetchStudents = async () => {
        try {
            const res = await fetch(`http://localhost:5002/api/analytics/faculty/students-overview?division=${selectedDivision}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
            });
            const data = await res.json();
            if (data.success) {
                setStudents(data.students);
            }
        } catch (err) {
            console.error("Failed to fetch students", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchGrowthData = async (studentId) => {
        try {
            const res = await fetch(`http://localhost:5002/api/analytics/faculty/student-growth/${studentId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
            });
            const data = await res.json();
            if (data.success) {
                // Process data for charts
                // Interactive Growth: Cumulative average or simple score trend
                const processed = data.history.map((item, index) => ({
                    date: new Date(item.createdAt).toLocaleDateString(),
                    score: item.performanceScore,
                    topic: item.topic
                }));
                setGrowthData(processed);
            }
        } catch (err) {
            console.error("Failed to fetch growth data", err);
        }
    };

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.rollNumber && s.rollNumber.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            {/* HEADER */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Student Overview</h1>
                    <p className="text-slate-500 mt-1">Monitor individual student performance and growth</p>
                </div>
                <div className="flex items-center gap-4">
                    {/* Division Filter */}
                    <select
                        value={selectedDivision}
                        onChange={(e) => setSelectedDivision(e.target.value)}
                        className="border rounded-full px-4 py-2 text-sm bg-white shadow-sm focus:outline-none"
                    >
                        <option value="All">All Divisions</option>
                        <option value="A">Division A</option>
                        <option value="B">Division B</option>
                        <option value="C">Division C</option>
                    </select>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search students..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-black w-64"
                        />

                    </div>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-20 text-slate-400">Loading students...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredStudents.map((student) => (
                        <motion.div
                            key={student._id}
                            layoutId={student._id}
                            onClick={() => setSelectedStudent(student)}
                            whileHover={{ y: -4 }}
                            className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md cursor-pointer border border-transparent hover:border-slate-200 transition-all"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                                    {student.name.charAt(0)}
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${student.tag === 'Top Performer' ? 'bg-green-100 text-green-700' :
                                    student.tag === 'Needs Support' ? 'bg-red-100 text-red-700' :
                                        'bg-slate-100 text-slate-700'
                                    }`}>
                                    {student.tag}
                                </span>
                            </div>

                            <h3 className="font-semibold text-lg text-slate-900 truncate">{student.name}</h3>
                            <div className="flex justify-between items-center text-sm text-slate-500 mb-4">
                                <span className="truncate">{student.email}</span>
                                <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-xs">{student.rollNumber}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-50">
                                <div className="text-center p-2 bg-slate-50 rounded-xl">
                                    <p className="text-xs text-slate-400 uppercase font-bold">Score</p>
                                    <p className="text-xl font-bold text-slate-900">{student.avgPerformance}%</p>
                                </div>
                                <div className="text-center p-2 bg-slate-50 rounded-xl">
                                    <p className="text-xs text-slate-400 uppercase font-bold">Solved</p>
                                    <p className="text-xl font-bold text-slate-900">{student.questionsSolved}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* DETAILED OVERLAY */}
            <AnimatePresence>
                {selectedStudent && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-sm"
                        onClick={() => setSelectedStudent(null)}
                    >
                        <motion.div
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="w-full max-w-2xl bg-white h-full shadow-2xl overflow-y-auto p-8"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h2 className="text-3xl font-bold text-slate-900">{selectedStudent.name}</h2>
                                    <p className="text-slate-500">{selectedStudent.email} • {selectedStudent.rollNumber} • Div {selectedStudent.division}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedStudent(null)}
                                    className="p-2 rounded-full hover:bg-slate-100 text-slate-500"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* STATS ROW */}
                            <div className="grid grid-cols-3 gap-4 mb-10">
                                <div className="bg-blue-50 p-6 rounded-2xl">
                                    <div className="flex items-center gap-3 mb-2 text-blue-600">
                                        <TrendingUp size={20} />
                                        <span className="font-semibold text-sm uppercase">Avg Score</span>
                                    </div>
                                    <p className="text-3xl font-bold text-slate-900">{selectedStudent.avgPerformance}%</p>
                                </div>
                                <div className="bg-purple-50 p-6 rounded-2xl">
                                    <div className="flex items-center gap-3 mb-2 text-purple-600">
                                        <CheckCircle size={20} />
                                        <span className="font-semibold text-sm uppercase">Tasks</span>
                                    </div>
                                    <p className="text-3xl font-bold text-slate-900">{selectedStudent.tasksCompleted}</p>
                                </div>
                                <div className="bg-orange-50 p-6 rounded-2xl">
                                    <div className="flex items-center gap-3 mb-2 text-orange-600">
                                        <BookOpen size={20} />
                                        <span className="font-semibold text-sm uppercase">Projects</span>
                                    </div>
                                    <p className="text-3xl font-bold text-slate-900">{selectedStudent.projectsCompleted}</p>
                                </div>
                            </div>

                            {/* GROWTH CHART */}
                            <div className="mb-10">
                                <h3 className="text-xl font-bold text-slate-900 mb-6">Performance Growth</h3>
                                <div className="h-64 w-full bg-white border rounded-2xl p-4 shadow-sm">
                                    {growthData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={growthData}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                                                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                                                <Tooltip
                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="score"
                                                    stroke="#2563eb"
                                                    strokeWidth={3}
                                                    dot={{ r: 4, fill: '#2563eb', strokeWidth: 0 }}
                                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-slate-400">
                                            No enough data for growth chart
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ACTIVITY BREAKDOWN */}
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 mb-6">Activity Breakdown</h3>
                                <div className="h-64 w-full bg-white border rounded-2xl p-4 shadow-sm">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={[
                                            { name: 'Tasks', count: selectedStudent.tasksCompleted },
                                            { name: 'Projects', count: selectedStudent.projectsCompleted },
                                            { name: 'Questions', count: selectedStudent.questionsSolved }
                                        ]}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                                            <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                            <Bar dataKey="count" fill="#1e293b" radius={[6, 6, 0, 0]} barSize={50} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
