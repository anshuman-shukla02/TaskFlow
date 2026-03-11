import { useState, useEffect } from "react";
import { MapPin, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function StudentAttendance() {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null); // success | error
    const [message, setMessage] = useState("");
    const [distance, setDistance] = useState(null);

    // Calendar State
    const [history, setHistory] = useState([]);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const res = await fetch("http://localhost:5002/api/attendance/history", {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
            });
            const data = await res.json();
            if (data.success) {
                setHistory(data.history.map(h => h.date.split('T')[0])); // YYYY-MM-DD
            }
        } catch (err) {
            console.error("Failed to fetch history");
        }
    };

    const markAttendance = () => {
        if (!navigator.geolocation) {
            setStatus("error");
            setMessage("Geolocation is not supported by your browser");
            return;
        }

        setLoading(true);
        setStatus(null);

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    const token = localStorage.getItem("token");

                    const res = await fetch("http://localhost:5002/api/attendance/mark", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({ latitude, longitude }),
                    });

                    const data = await res.json();

                    if (res.ok) {
                        setStatus("success");
                        setMessage("Attendance Marked Successfully!");
                        setDistance(data.distance);
                        fetchHistory(); // Refresh calendar
                    } else {
                        setStatus("error");
                        setMessage(data.message || "Failed to mark attendance");
                        if (data.details) setMessage(data.message + " (" + data.details + ")");
                    }
                } catch (err) {
                    setStatus("error");
                    setMessage("Network error. Please try again.");
                } finally {
                    setLoading(false);
                }
            },
            (error) => {
                console.error(error);
                setStatus("error");
                setMessage("Unable to retrieve location. Please allow access.");
                setLoading(false);
            },
            { enableHighAccuracy: true }
        );
    };

    // Calendar Logic
    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month, 1).getDay();
    };

    const renderCalendar = () => {
        const daysInMonth = getDaysInMonth(currentMonth);
        const firstDay = getFirstDayOfMonth(currentMonth);
        const days = [];

        // Empty slots for previous month
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-10"></div>);
        }

        // Days
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isPresent = history.includes(dateStr);
            const isToday = dateStr === new Date().toISOString().split('T')[0];

            days.push(
                <div key={day} className="flex flex-col items-center justify-center h-10 w-10 relative">
                    {isPresent && (
                        <div className="absolute inset-0 bg-green-100 rounded-full scale-90" />
                    )}
                    <span className={`z-10 text-sm font-medium ${isPresent ? 'text-green-700' : 'text-slate-600'} ${isToday ? 'border-b-2 border-black' : ''}`}>
                        {day}
                    </span>
                    {isPresent && <div className="w-1 h-1 bg-green-500 rounded-full mt-0.5 z-10" />}
                </div>
            );
        }
        return days;
    };

    // Format Month
    const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

    return (
        <div className="p-8 max-w-4xl mx-auto flex flex-col md:flex-row gap-8 items-start">
            {/* LEFT: Mark Attendance Card */}
            <div className="flex flex-col items-center justify-center w-full md:w-1/2">
                <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-10 w-full relative overflow-hidden text-center h-[500px] flex flex-col justify-center">

                    {/* Background blobs */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-100 rounded-full blur-3xl -z-10 opacity-50"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-100 rounded-full blur-3xl -z-10 opacity-50"></div>

                    <div className="mb-8">
                        <h1 className="text-3xl font-bold mb-2 text-slate-900">Mark Attendance</h1>
                        <p className="text-slate-500">Ensure you are inside the classroom.</p>
                    </div>

                    {status === "success" ? (
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-center"
                        >
                            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle size={48} />
                            </div>
                            <h2 className="text-xl font-bold text-green-700 mb-1">Present!</h2>
                            <p className="text-green-600">{message}</p>
                            {distance && <p className="text-xs text-slate-400 mt-2">Distance: {distance}m</p>}
                        </motion.div>
                    ) : (
                        <div className="space-y-6">
                            <button
                                onClick={markAttendance}
                                disabled={loading}
                                className={`w-full py-6 rounded-2xl font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-3
                    ${loading ? "bg-slate-100 text-slate-400" : "bg-black text-white hover:scale-105 active:scale-95"}
                `}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="animate-spin" /> Locating...
                                    </>
                                ) : (
                                    <>
                                        <MapPin size={24} /> Mark Attendance Here
                                    </>
                                )}
                            </button>

                            {status === "error" && (
                                <motion.div
                                    initial={{ y: 10, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 text-left"
                                >
                                    <XCircle className="flex-shrink-0" />
                                    <p className="text-sm font-medium">{message}</p>
                                </motion.div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT: Calendar Visual */}
            <div className="bg-white rounded-3xl shadow-lg border border-slate-100 p-8 w-full md:w-1/2 h-[500px]">
                <h2 className="text-2xl font-bold mb-6 text-slate-900 flex justify-center">Attendance History</h2>

                <div className="flex justify-between items-center mb-6">
                    <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-2 hover:bg-slate-100 rounded-full">←</button>
                    <span className="font-semibold text-lg">{monthName}</span>
                    <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-2 hover:bg-slate-100 rounded-full">→</button>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-xs font-bold text-slate-400 uppercase">{day}</div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                    {renderCalendar()}
                </div>

                <div className="mt-8 flex justify-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full" />
                        <span className="text-sm text-slate-500">Present</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-white border border-slate-300 rounded-full" />
                        <span className="text-sm text-slate-500">Top-Ups / No Data</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
