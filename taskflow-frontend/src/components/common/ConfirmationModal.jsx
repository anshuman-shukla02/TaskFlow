import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle, XCircle, X } from "lucide-react";

export default function ConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  type = "warning", // "warning", "success", "danger"
  confirmText = "Confirm",
  loading = false 
}) {
  if (!isOpen) return null;

  const typeConfig = {
    warning: {
      icon: AlertCircle,
      iconColor: "text-amber-500",
      bgColor: "bg-amber-50",
      btnColor: "bg-amber-600 hover:bg-amber-700",
      shadow: "shadow-amber-100"
    },
    success: {
      icon: CheckCircle,
      iconColor: "text-emerald-500",
      bgColor: "bg-emerald-50",
      btnColor: "bg-emerald-600 hover:bg-emerald-700",
      shadow: "shadow-emerald-100"
    },
    danger: {
      icon: XCircle,
      iconColor: "text-rose-500",
      bgColor: "bg-rose-50",
      btnColor: "bg-rose-600 hover:bg-rose-700",
      shadow: "shadow-rose-100"
    }
  };

  const config = typeConfig[type] || typeConfig.warning;
  const Icon = config.icon;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl relative overflow-hidden"
        >
          <div className={`absolute top-0 left-0 w-full h-2 ${config.btnColor}`} />
          
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center text-center mt-4">
            <div className={`w-20 h-20 ${config.bgColor} ${config.iconColor} rounded-3xl flex items-center justify-center mb-6 shadow-inner`}>
              <Icon size={40} />
            </div>
            
            <h2 className="text-2xl font-bold text-slate-900 mb-3">{title}</h2>
            <p className="text-slate-500 leading-relaxed max-w-[280px]">{message}</p>
          </div>

          <div className="flex gap-3 mt-10">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-3.5 text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-2xl transition font-bold text-sm"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 px-6 py-3.5 ${config.btnColor} text-white rounded-2xl transition font-bold text-sm shadow-xl ${config.shadow} disabled:opacity-70 flex items-center justify-center gap-2`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
