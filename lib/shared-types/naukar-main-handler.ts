// an interface for naukar (worker) to communicate with the main thread.
export interface NaukarMainHandler {
  sendError: (error: Error) => void;
}
