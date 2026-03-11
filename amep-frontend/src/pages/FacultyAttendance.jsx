import { useState, useEffect } from "react";
import { Users, MapPin, Play, Square, Loader2 } from "lucide-react";

export default function FacultyAttendance() {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({ totalStudents: 0, presentToday: 0 });

    useEffect(() => {
        // Check if session exists (mock check for now or fetch from backend if API supported getting active session)
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await fetch("http://localhost:5002/api/attendance/summary", {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
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
                    const res = await fetch("http://localhost:5002/api/attendance/start", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${localStorage.getItem("token")}`,
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
            await fetch("http://localhost:5002/api/attendance/stop", {
                method: "POST",
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            });
            setSession(null);
            alert("Session Stopped");
        } catch (err) {
            alert("Failed to stop session");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-2">Class Attendance</h1>
            <p className="text-slate-500 mb-8">Manage geo-fenced attendance sessions.</p>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Total Students</p>
                        <p className="text-2xl font-bold">{stats.totalStudents}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="p-3 bg-green-100 text-green-600 rounded-xl">
                        <CheckCircleIcon />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Present Today</p>
                        <p className="text-2xl font-bold">{stats.presentToday}</p>
                    </div>
                </div>
            </div>

            {/* Control Panel */}
            <div className="bg-white rounded-3xl shadow-lg border border-slate-100 p-8 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
                    <MapPin size={32} />
                </div>

                <h2 className="text-2xl font-bold mb-2">
                    {session ? "Session Active" : "Start Attendance"}
                </h2>
                <p className="text-slate-500 mb-8 max-w-md mx-auto">
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
                        className="px-8 py-4 bg-black text-white rounded-full font-bold hover:scale-105 transition shadow-xl flex items-center gap-2 mx-auto"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <Play size={20} fill="currentColor" />}
                        Start Session
                    </button>
                )}
            </div>
        </div>
    );
}

function CheckCircleIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
    )
}
