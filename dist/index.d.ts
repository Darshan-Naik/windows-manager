/**
 * Represents a single window/tab in the manager, including position and screen info.
 * @property {string} id - Unique identifier for the window.
 * @property {number} screenTop - The top position of the window relative to the screen.
 * @property {number} screenLeft - The left position of the window relative to the screen.
 * @property {number} screenX - The X coordinate of the window on the screen.
 * @property {number} screenY - The Y coordinate of the window on the screen.
 * @property {number} scrollX - The horizontal scroll position of the window.
 * @property {number} scrollY - The vertical scroll position of the window.
 * @property {Screen} screen - The Screen object associated with the window.
 */
export type WindowType = {
    id: string;
    screenTop: number;
    screenLeft: number;
    screenX: number;
    screenY: number;
    scrollX: number;
    scrollY: number;
    screen: Screen;
};
/**
 * The full state managed by WindowsManager, including meta state.
 * @template M - The type of the meta state.
 * @property {WindowType | null} activeWindow - The currently active window.
 * @property {WindowType[]} windows - All tracked windows.
 * @property {WindowType} thisWindow - The current window instance.
 * @property {M} meta - The shared meta state.
 */
export type WindowsManagerState<M = any> = {
    activeWindow: WindowType | null;
    windows: WindowType[];
    thisWindow: WindowType;
    meta: M;
};
/**
 * Options for constructing a WindowsManager instance.
 * @template M - The type of the meta state.
 * @property {(state: WindowsManagerState<M>) => void} [onStateChange] - Called on any state change.
 * @property {(message: any, fromWindowId: string) => void} [onMessage] - Called on message from another window.
 * @property {(window: WindowType) => void} [onNewWindow] - Called when a new window is detected.
 * @property {(window: WindowType) => void} [onRemoveWindow] - Called when a window is removed.
 * @property {(window: WindowType) => void} [onWindowUpdate] - Called when a window's data is updated.
 * @property {(window: WindowType | null) => void} [onActiveWindowChange] - Called when the active window changes.
 * @property {(meta: M) => void} [onMetaChange] - Called when the meta state changes.
 * @property {M} [initialMeta] - Initial value for the meta state.
 */
export type WindowsManagerOptions<M = any> = {
    onStateChange?: (state: WindowsManagerState<M>) => void;
    onMessage?: (message: any, fromWindowId: string) => void;
    onNewWindow?: (window: WindowType) => void;
    onRemoveWindow?: (window: WindowType) => void;
    onWindowUpdate?: (window: WindowType) => void;
    onActiveWindowChange?: (window: WindowType | null) => void;
    onMetaChange?: (meta: M) => void;
    initialMeta?: M;
};
/**
 * Manages multiple browser windows/tabs, tracks their state, and synchronizes meta data.
 * Supports event listeners for state, meta, and window changes.
 * @template M - The type of the meta state.
 */
declare class WindowsManager<M = any> {
    private readonly key;
    private initialized;
    /** The current window's data. */
    thisWindow: WindowType;
    /** The currently active window. */
    activeWindow: WindowType | null;
    /** All tracked windows. */
    windows: WindowType[];
    /** The shared meta state. */
    meta: M;
    private channel;
    private stateChangeListeners;
    private messageListeners;
    private newWindowListeners;
    private removeWindowListeners;
    private windowUpdateListeners;
    private activeWindowChangeListeners;
    private metaChangeListeners;
    private lastWindowRect;
    private movePollInterval;
    /**
     * Create a new WindowsManager instance.
     * @param {WindowsManagerOptions<M>} [options] - Optional configuration and event listeners.
     */
    constructor(options?: WindowsManagerOptions<M>);
    /**
     * Subscribe to state changes.
     * @param {(state: WindowsManagerState<M>) => void} listener
     * @returns {() => void} Function to remove this listener
     */
    addStateChangeListener(listener: (state: WindowsManagerState<M>) => void): () => void;
    /**
     * Remove a state change listener.
     * @param {(state: WindowsManagerState<M>) => void} listener
     */
    removeStateChangeListener(listener: (state: WindowsManagerState<M>) => void): void;
    /**
     * Subscribe to messages from other windows.
     * @param {(message: any, fromWindowId: string) => void} listener
     * @returns {() => void} Function to remove this listener
     */
    addMessageListener(listener: (message: any, fromWindowId: string) => void): () => void;
    /**
     * Remove a message listener.
     * @param {(message: any, fromWindowId: string) => void} listener
     */
    removeMessageListener(listener: (message: any, fromWindowId: string) => void): void;
    /**
     * Subscribe to new window events.
     * @param {(window: WindowType) => void} listener
     * @returns {() => void} Function to remove this listener
     */
    addNewWindowListener(listener: (window: WindowType) => void): () => void;
    /**
     * Remove a new window listener.
     * @param {(window: WindowType) => void} listener
     */
    removeNewWindowListener(listener: (window: WindowType) => void): void;
    /**
     * Subscribe to window removal events.
     * @param {(window: WindowType) => void} listener
     * @returns {() => void} Function to remove this listener
     */
    addRemoveWindowListener(listener: (window: WindowType) => void): () => void;
    /**
     * Remove a remove window listener.
     * @param {(window: WindowType) => void} listener
     */
    removeRemoveWindowListener(listener: (window: WindowType) => void): void;
    /**
     * Subscribe to window update events.
     * @param {(window: WindowType) => void} listener
     * @returns {() => void} Function to remove this listener
     */
    addWindowUpdateListener(listener: (window: WindowType) => void): () => void;
    /**
     * Remove a window update listener.
     * @param {(window: WindowType) => void} listener
     */
    removeWindowUpdateListener(listener: (window: WindowType) => void): void;
    /**
     * Subscribe to active window changes.
     * @param {(window: WindowType | null) => void} listener
     * @returns {() => void} Function to remove this listener
     */
    addActiveWindowChangeListener(listener: (window: WindowType | null) => void): () => void;
    /**
     * Remove an active window change listener.
     * @param {(window: WindowType | null) => void} listener
     */
    removeActiveWindowChangeListener(listener: (window: WindowType | null) => void): void;
    /**
     * Subscribe to meta state changes.
     * @param {(meta: M) => void} listener
     * @returns {() => void} Function to remove this listener
     */
    addMetaChangeListener(listener: (meta: M) => void): () => void;
    /**
     * Remove a meta change listener.
     * @param {(meta: M) => void} listener
     */
    removeMetaChangeListener(listener: (meta: M) => void): void;
    /**
     * Get the current state of the windows manager.
     * @returns {WindowsManagerState<M>} The current state.
     */
    getCurrentState(): WindowsManagerState<M>;
    /**
     * Update the meta state and notify listeners.
     * @param {M} meta - The new meta state.
     */
    updateMeta(meta: M): void;
    /**
     * Send a message to all other windows.
     * @param {any} message - The message to send.
     */
    sendMessage(message: any): void;
    /**
     * Initialize the manager, load state, and set up listeners.
     * @private
     */
    private initialize;
    /**
     * Set up window event listeners for storage, unload, and focus.
     * @private
     */
    private setupEventListeners;
    /**
     * Get the current window's position and size, including screen edges.
     * @private
     * @returns {Omit<WindowType, 'id'>} The window's rect and screen info.
     */
    private getWindowRect;
    /**
     * Poll for window move (since there's no native event).
     * @private
     */
    private startMovePolling;
    /**
     * Stop polling for window move.
     * @private
     */
    private stopMovePolling;
    /**
     * Handle window resize or move.
     * @private
     */
    private handleWindowRectChange;
    /**
     * Update thisWindow in the windows array and notify listeners.
     * @private
     */
    private updateThisWindowInList;
    /**
     * Ensure this window is in the windows list, notify listeners if new.
     * @private
     */
    private ensureThisWindowInList;
    /**
     * Remove this window from the windows list, notify listeners.
     * @private
     */
    private removeThisWindow;
    /**
     * Set the active window and notify listeners if it changes.
     * @private
     */
    private setActiveWindow;
    /**
     * Emits the current state to all state change listeners.
     * @private
     */
    private emitStateChange;
    /**
     * Handle storage events for cross-tab sync. Triggers all relevant listeners if state changes.
     * @private
     * @param {StorageEvent} event
     */
    private handleStorageEvent;
    /**
     * Handles window unload (removes this window from the list).
     * @private
     */
    private handleBeforeUnload;
    /**
     * Handles window focus (sets this window as active).
     * @private
     */
    private handleFocus;
    /**
     * Loads state from localStorage.
     * @private
     */
    private loadStateFromStorage;
    /**
     * Updates localStorage with the current state.
     * @private
     */
    private updateStorageData;
    /**
     * Reads the state from localStorage.
     * @private
     * @returns {{ activeWindow: WindowType | null; windows: WindowType[]; meta: M }}
     */
    private getStorageData;
    /**
     * Initializes or retrieves this window's data from sessionStorage.
     * @private
     * @returns {WindowType}
     */
    private initCurrentWindow;
    /**
     * Handles messages from other windows (BroadcastChannel).
     * @private
     * @param {MessageEvent} event
     */
    private handleChannelMessage;
}
export default WindowsManager;
/**
 * Extends the global Window interface to include the windowManager instance.
 */
declare global {
    interface Window {
        windowManager: WindowsManager;
    }
}
