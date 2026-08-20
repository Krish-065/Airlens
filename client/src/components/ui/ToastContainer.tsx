import { useToast } from '@/context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { HiCheckCircle, HiExclamationCircle, HiInformationCircle, HiXCircle, HiX } from 'react-icons/hi';

const icons = {
  success: HiCheckCircle,
  error: HiXCircle,
  info: HiInformationCircle,
  warning: HiExclamationCircle,
};

const colors = {
  success: '#2E7D32',
  error: '#DC2626',
  info: '#2563EB',
  warning: '#D97706',
};

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed top-24 right-4 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = icons[toast.type];
          return (
            <motion.div
              key={toast.id}
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 200 }}
              className="pointer-events-auto rounded-xl px-4 py-3 flex items-start gap-3"
              style={{
                background: 'var(--toast-bg)',
                backdropFilter: 'blur(20px)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-lg)',
              }}
              role="alert"
            >
              <Icon size={22} color={colors[toast.type]} className="mt-0.5 shrink-0" />
              <p className="text-sm flex-1 font-medium" style={{ color: 'var(--text)' }}>
                {toast.message}
              </p>
              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 p-1 rounded-lg cursor-pointer hover:opacity-70"
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)' }}
                aria-label="Dismiss notification"
              >
                <HiX size={16} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
