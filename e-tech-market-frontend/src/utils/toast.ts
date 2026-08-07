export const toast = {
  success: (message: string) => {
    window.dispatchEvent(
      new CustomEvent("global-toast", {
        detail: { type: "success", message },
      }),
    );
  },
  error: (message: string) => {
    window.dispatchEvent(
      new CustomEvent("global-toast", {
        detail: { type: "error", message },
      }),
    );
  },
  info: (message: string) => {
    window.dispatchEvent(
      new CustomEvent("global-toast", {
        detail: { type: "info", message },
      }),
    );
  },
};
