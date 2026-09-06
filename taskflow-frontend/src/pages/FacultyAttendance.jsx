import { API_URL } from "../utils/api";
import { getToken } from "../utils/auth";
import { useState, useEffect } from "react";
import { Users, MapPin, Play, Square, Loader2, Download, Calendar, Filter } from "lucide-react";
import { exportToCsv } from "../utils/csv";

export default function FacultyAttendance() {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({ totalStudents: 0, presentToday: 0 });
    const [selectedDiv, setSelectedDiv] = useState("All");
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        fetchStats();
        fetchActiveSession();
    }, []);

    const fetchActiveSession = async () => {
        try {
            const res = await fetch(`${API_URL}/api/attendance/active`, {
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            const data = await res.json();
            if (data.success && data.session) {
                setSession(data.session);
            }
        } catch (err) {
            console.error("Failed to check active session:", err);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await fetch(`${API_URL}/api/attendance/summary`, {
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            const data = await res.json();
            setStats(data);
        } catch (err) {
            console.error(err);
        }
    };

    const startSession = () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            return;
        }

        setLoading(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    const res = await fetch(`${API_URL}/api/attendance/start`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${getToken()}`,
                        },
                        body: JSON.stringify({ latitude, longitude, radius: 50 }),
                    });
                    const data = await res.json();
                    if (data.success) {
                        setSession(data.session);
                        alert("Attendance Session Started!");
                    } else {
                        alert(data.message || "Failed to start session");
                    }
                } catch (err) {
                    console.error(err);
                    alert("Failed to start session");
                } finally {
                    setLoading(false);
                }
            },
            (error) => {
                console.error(error);
                alert("Unable to retrieve location");
                setLoading(false);
            }
        );
    };

    const stopSession = async () => {
        try {
            setLoading(true);
            await fetch(`${API_URL}/api/attendance/stop`, {
                method: "POST",
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            setSession(null);
            alert("Session Stopped");
        } catch (err) {
            alert("Failed to stop session");
        } finally {
            setLoading(false);
        }
    };

    const handleExportAttendanceCsv = async () => {
        try {
            setExporting(true);
            const res = await fetch(`${API_URL}/api/attendance/daily-sheet?division=${selectedDiv}&date=${selectedDate}`, {
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            const data = await res.json();
            if (!data.success) {
                alert(data.message || "Failed to fetch attendance data");
                return;
            }

            if (!data.roster || data.roster.length === 0) {
                alert("No student records found for the selected filter.");
                return;
            }

            const headers = [
                "Roll Number",
                "Student Name",
                "Division",
                "Email",
                "Status",
                "Distance from Faculty",
                "Marked Time",
            ];

            const rows = data.roster.map((r) => [
                r.rollNumber,
                r.name,
                r.division,
                r.email,
                r.status,
                r.distance,
                r.markedAt,
            ]);

            const filename = `attendance_${selectedDiv}_${selectedDate}.csv`;
            exportToCsv(filename, headers, rows);
        } catch (err) {
            console.error("Export attendance error:", err);
            alert("Error exporting attendance sheet");
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm  flex items-center gap-4">
                    <div className="p-3 bg-blue-100 text-purple-600 rounded-xl">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-clay-muted font-medium">Total Students</p>
                        <p className="text-2xl font-bold">{stats.totalStudents}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm  flex items-center gap-4">
                    <div className="p-3 bg-green-100 text-green-600 rounded-xl">
                        <CheckCircleIcon />
                    </div>
                    <div>
                        <p className="text-sm text-clay-muted font-medium">Present Today</p>
                        <p className="text-2xl font-bold">{stats.presentToday}</p>
                    </div>
                </div>
            </div>

            {/* Control Panel */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-clay-muted">
                    <MapPin size={32} />
                </div>

                <h2 className="text-2xl font-bold mb-2">
                    {session ? "Session Active" : "Start Attendance"}
                </h2>
                <p className="text-clay-muted mb-8 max-w-md mx-auto">
                    {session
                        ? "Students can now mark their attendance within 50 meters of your current location."
                        : "Begin a new geo-fenced session. Ensure you are in the classroom before starting."}
                </p>

                {session ? (
                    <button
                        onClick={stopSession}
                        disabled={loading}
                        className="px-8 py-4 bg-red-50 text-red-600 rounded-full font-bold hover:bg-red-100 transition flex items-center gap-2 mx-auto"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <Square size={20} fill="currentColor" />}
                        Stop Session
                    </button>
                ) : (
                    <button
                        onClick={startSession}
                        disabled={loading}
                        className="px-8 py-4 clay-btn-primary font-bold hover:scale-105 transition shadow-xl flex items-center gap-2 mx-auto"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <Play size={20} fill="currentColor" />}
                        Start Session
                    </button>
                )}
            </div>

            {/* Attendance Export & Reports Panel */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <Download size={20} className="text-emerald-600" /> Export Attendance Records
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                            Generate and download complete class attendance sheets (Present & Absent) in CSV format.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            Division
                        </label>
                        <select
                            value={selectedDiv}
                            onChange={(e) => setSelectedDiv(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        >
                            <option value="All">All Divisions</option>
                            <option value="A">Division A</option>
                            <option value="B">Division B</option>
                            <option value="C">Division C</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            Attendance Date
                        </label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        />
                    </div>

                    <div>
                        <button
                            onClick={handleExportAttendanceCsv}
                            disabled={exporting}
                            className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm disabled:opacity-50 cursor-pointer"
                        >
                            {exporting ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" /> Exporting…
                                </>
                            ) : (
                                <>
                                    <Download size={16} /> Download CSV
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function CheckCircleIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
    )
}
