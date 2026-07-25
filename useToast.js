import { toast } from "react-toastify";

/**
 * Toast notification utility with custom styling
 * Provides success, error, info, and warning notifications
 */

const toastConfig = {
  position: "top-right",
  autoClose: 3500,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  theme: "dark",
};

/**
 * Show success toast
 * @param {string} message - Message to display
 * @param {object} options - Optional toast configuration overrides
 */
export const showSuccessToast = (message, options = {}) => {
  toast.success(message, { ...toastConfig, ...options });
};

/**
 * Show error toast
 * @param {string} message - Message to display
 * @param {object} options - Optional toast configuration overrides
 */
export const showErrorToast = (message, options = {}) => {
  toast.error(message, { ...toastConfig, ...options });
};

/**
 * Show info toast
 * @param {string} message - Message to display
 * @param {object} options - Optional toast configuration overrides
 */
export const showInfoToast = (message, options = {}) => {
  toast.info(message, { ...toastConfig, ...options });
};

/**
 * Show warning toast
 * @param {string} message - Message to display
 * @param {object} options - Optional toast configuration overrides
 */
export const showWarningToast = (message, options = {}) => {
  toast.warning(message, { ...toastConfig, ...options });
};

/**
 * Custom hook for using toast notifications
 * Returns object with toast methods
 */
export const useToast = () => ({
  success: showSuccessToast,
  error: showErrorToast,
  info: showInfoToast,
  warning: showWarningToast,
});

export default useToast;
