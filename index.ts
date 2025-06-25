/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Generate a unique window ID (5-char random alphanumeric string).
 * @returns {string} A unique window identifier.
 */
function generateWindowId(): string {
  return (
    Math.random().toString(36).slice(2, 7) + Date.now().toString(36).slice(-2)
  );
}

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
class WindowsManager<M = any> {
  private readonly key = "windows";
  private initialized = false;

  /** The current window's data. */
  public thisWindow: WindowType;
  /** The currently active window. */
  public activeWindow: WindowType | null = null;
  /** All tracked windows. */
  public windows: WindowType[] = [];
  /** The shared meta state. */
  public meta: M;

  private channel: BroadcastChannel;

  // --- Event Listener Arrays ---
  private stateChangeListeners: Array<(state: WindowsManagerState<M>) => void> =
    [];
  private messageListeners: Array<
    (message: any, fromWindowId: string) => void
  > = [];
  private newWindowListeners: Array<(window: WindowType) => void> = [];
  private removeWindowListeners: Array<(window: WindowType) => void> = [];
  private windowUpdateListeners: Array<(window: WindowType) => void> = [];
  private activeWindowChangeListeners: Array<
    (window: WindowType | null) => void
  > = [];
  private metaChangeListeners: Array<(meta: M) => void> = [];

  private lastWindowRect: Omit<WindowType, "id">;
  private movePollInterval: number | undefined;

  /**
   * Create a new WindowsManager instance.
   * @param {WindowsManagerOptions<M>} [options] - Optional configuration and event listeners.
   */
  constructor(options: WindowsManagerOptions<M> = {}) {
    this.thisWindow = this.initCurrentWindow();
    // Expose for debugging
    window.windowManager = this;
    this.channel = new BroadcastChannel(this.key);
    this.channel.onmessage = this.handleChannelMessage;
    this.meta = options.initialMeta as M;
    this.initialize();
    // Add listeners if provided in options
    if (options.onStateChange)
      this.addStateChangeListener(options.onStateChange);
    if (options.onMessage) this.addMessageListener(options.onMessage);
    if (options.onNewWindow) this.addNewWindowListener(options.onNewWindow);
    if (options.onRemoveWindow)
      this.addRemoveWindowListener(options.onRemoveWindow);
    if (options.onWindowUpdate)
      this.addWindowUpdateListener(options.onWindowUpdate);
    if (options.onActiveWindowChange)
      this.addActiveWindowChangeListener(options.onActiveWindowChange);
    if (options.onMetaChange) this.addMetaChangeListener(options.onMetaChange);
    // Track window position and size
    this.lastWindowRect = this.getWindowRect();
    window.addEventListener("resize", this.handleWindowRectChange);
    this.startMovePolling();
  }

  // --- Public API: Event Listeners ---

  /**
   * Subscribe to state changes.
   * @param {(state: WindowsManagerState<M>) => void} listener
   * @returns {() => void} Function to remove this listener
   */
  public addStateChangeListener(
    listener: (state: WindowsManagerState<M>) => void
  ): () => void {
    this.stateChangeListeners.push(listener);
    return () => this.removeStateChangeListener(listener);
  }
  /**
   * Remove a state change listener.
   * @param {(state: WindowsManagerState<M>) => void} listener
   */
  public removeStateChangeListener(
    listener: (state: WindowsManagerState<M>) => void
  ) {
    this.stateChangeListeners = this.stateChangeListeners.filter(
      (l) => l !== listener
    );
  }

  /**
   * Subscribe to messages from other windows.
   * @param {(message: any, fromWindowId: string) => void} listener
   * @returns {() => void} Function to remove this listener
   */
  public addMessageListener(
    listener: (message: any, fromWindowId: string) => void
  ): () => void {
    this.messageListeners.push(listener);
    return () => this.removeMessageListener(listener);
  }
  /**
   * Remove a message listener.
   * @param {(message: any, fromWindowId: string) => void} listener
   */
  public removeMessageListener(
    listener: (message: any, fromWindowId: string) => void
  ) {
    this.messageListeners = this.messageListeners.filter((l) => l !== listener);
  }

  /**
   * Subscribe to new window events.
   * @param {(window: WindowType) => void} listener
   * @returns {() => void} Function to remove this listener
   */
  public addNewWindowListener(
    listener: (window: WindowType) => void
  ): () => void {
    this.newWindowListeners.push(listener);
    return () => this.removeNewWindowListener(listener);
  }
  /**
   * Remove a new window listener.
   * @param {(window: WindowType) => void} listener
   */
  public removeNewWindowListener(listener: (window: WindowType) => void) {
    this.newWindowListeners = this.newWindowListeners.filter(
      (l) => l !== listener
    );
  }

  /**
   * Subscribe to window removal events.
   * @param {(window: WindowType) => void} listener
   * @returns {() => void} Function to remove this listener
   */
  public addRemoveWindowListener(
    listener: (window: WindowType) => void
  ): () => void {
    this.removeWindowListeners.push(listener);
    return () => this.removeRemoveWindowListener(listener);
  }
  /**
   * Remove a remove window listener.
   * @param {(window: WindowType) => void} listener
   */
  public removeRemoveWindowListener(listener: (window: WindowType) => void) {
    this.removeWindowListeners = this.removeWindowListeners.filter(
      (l) => l !== listener
    );
  }

  /**
   * Subscribe to window update events.
   * @param {(window: WindowType) => void} listener
   * @returns {() => void} Function to remove this listener
   */
  public addWindowUpdateListener(
    listener: (window: WindowType) => void
  ): () => void {
    this.windowUpdateListeners.push(listener);
    return () => this.removeWindowUpdateListener(listener);
  }
  /**
   * Remove a window update listener.
   * @param {(window: WindowType) => void} listener
   */
  public removeWindowUpdateListener(listener: (window: WindowType) => void) {
    this.windowUpdateListeners = this.windowUpdateListeners.filter(
      (l) => l !== listener
    );
  }

  /**
   * Subscribe to active window changes.
   * @param {(window: WindowType | null) => void} listener
   * @returns {() => void} Function to remove this listener
   */
  public addActiveWindowChangeListener(
    listener: (window: WindowType | null) => void
  ): () => void {
    this.activeWindowChangeListeners.push(listener);
    return () => this.removeActiveWindowChangeListener(listener);
  }
  /**
   * Remove an active window change listener.
   * @param {(window: WindowType | null) => void} listener
   */
  public removeActiveWindowChangeListener(
    listener: (window: WindowType | null) => void
  ) {
    this.activeWindowChangeListeners = this.activeWindowChangeListeners.filter(
      (l) => l !== listener
    );
  }

  /**
   * Subscribe to meta state changes.
   * @param {(meta: M) => void} listener
   * @returns {() => void} Function to remove this listener
   */
  public addMetaChangeListener(listener: (meta: M) => void): () => void {
    this.metaChangeListeners.push(listener);
    return () => this.removeMetaChangeListener(listener);
  }
  /**
   * Remove a meta change listener.
   * @param {(meta: M) => void} listener
   */
  public removeMetaChangeListener(listener: (meta: M) => void) {
    this.metaChangeListeners = this.metaChangeListeners.filter(
      (l) => l !== listener
    );
  }

  // --- Public API: State & Meta ---

  /**
   * Get the current state of the windows manager.
   * @returns {WindowsManagerState<M>} The current state.
   */
  public getCurrentState(): WindowsManagerState<M> {
    return {
      activeWindow: this.activeWindow,
      windows: this.windows,
      thisWindow: this.thisWindow,
      meta: this.meta,
    };
  }

  /**
   * Update the meta state and notify listeners.
   * @param {M} meta - The new meta state.
   */
  public updateMeta(meta: M) {
    this.meta = meta;
    this.updateStorageData();
    for (const listener of this.metaChangeListeners) {
      listener(meta);
    }
    this.emitStateChange();
  }

  /**
   * Send a message to all other windows.
   * @param {any} message - The message to send.
   */
  public sendMessage(message: any) {
    this.channel.postMessage({
      from: this.thisWindow.id,
      message,
    });
  }

  // --- Initialization & Internal Logic ---

  /**
   * Initialize the manager, load state, and set up listeners.
   * @private
   */
  private initialize() {
    if (this.initialized) return;
    this.loadStateFromStorage();
    this.ensureThisWindowInList();
    this.initialized = true;
    this.emitStateChange();
    this.setupEventListeners();
  }

  /**
   * Set up window event listeners for storage, unload, and focus.
   * @private
   */
  private setupEventListeners() {
    window.addEventListener("storage", this.handleStorageEvent);
    window.addEventListener("beforeunload", this.handleBeforeUnload);
    window.addEventListener("focus", this.handleFocus);
  }

  /**
   * Get the current window's position and size, including screen edges.
   * @private
   * @returns {Omit<WindowType, 'id'>} The window's rect and screen info.
   */
  private getWindowRect(): Omit<WindowType, "id"> {
    const {
      screenX,
      screenTop,
      screenLeft,
      screenY,
      scrollX,
      scrollY,
      screen,
    } = window;
    return {
      screenX,
      screenTop,
      screenLeft,
      screenY,
      scrollX,
      scrollY,
      screen,
    };
  }

  /**
   * Poll for window move (since there's no native event).
   * @private
   */
  private startMovePolling() {
    this.movePollInterval = window.setInterval(
      this.handleWindowRectChange,
      300
    );
  }
  /**
   * Stop polling for window move.
   * @private
   */
  private stopMovePolling() {
    if (this.movePollInterval) {
      clearInterval(this.movePollInterval);
      this.movePollInterval = undefined;
    }
  }

  /**
   * Handle window resize or move.
   * @private
   */
  private handleWindowRectChange = () => {
    const rect = this.getWindowRect();
    const changed =
      rect.screenX !== this.lastWindowRect.screenX ||
      rect.screenY !== this.lastWindowRect.screenY ||
      rect.screenTop !== this.lastWindowRect.screenTop ||
      rect.screenLeft !== this.lastWindowRect.screenLeft ||
      rect.scrollX !== this.lastWindowRect.scrollX ||
      rect.scrollY !== this.lastWindowRect.scrollY;
    if (changed) {
      this.lastWindowRect = rect;
      this.thisWindow = { ...this.thisWindow, ...rect };
      this.updateThisWindowInList();
      this.updateStorageData();
      this.emitStateChange();
    }
  };

  /**
   * Update thisWindow in the windows array and notify listeners.
   * @private
   */
  private updateThisWindowInList() {
    const idx = this.windows.findIndex((w) => w.id === this.thisWindow.id);
    if (idx !== -1) {
      this.windows[idx] = { ...this.thisWindow };
      for (const listener of this.windowUpdateListeners) {
        listener(this.thisWindow);
      }
    }
  }

  /**
   * Ensure this window is in the windows list, notify listeners if new.
   * @private
   */
  private ensureThisWindowInList() {
    if (!this.windows.some((w) => w.id === this.thisWindow.id)) {
      this.windows.push(this.thisWindow);
      this.updateStorageData();
      for (const listener of this.newWindowListeners) {
        listener(this.thisWindow);
      }
    }
  }

  /**
   * Remove this window from the windows list, notify listeners.
   * @private
   */
  private removeThisWindow() {
    const idx = this.windows.findIndex((w) => w.id === this.thisWindow.id);
    if (idx !== -1) {
      const removed = this.windows[idx];
      this.windows.splice(idx, 1);
      for (const listener of this.removeWindowListeners) {
        listener(removed);
      }
    }
  }

  /**
   * Set the active window and notify listeners if it changes.
   * @private
   */
  private setActiveWindow(window: WindowType | null) {
    if (this.activeWindow !== window) {
      this.activeWindow = window;
      for (const listener of this.activeWindowChangeListeners) {
        listener(window);
      }
      this.emitStateChange();
    }
  }

  /**
   * Emits the current state to all state change listeners.
   * @private
   */
  private emitStateChange() {
    for (const listener of this.stateChangeListeners) {
      listener(this.getCurrentState());
    }
  }

  /**
   * Handle storage events for cross-tab sync. Triggers all relevant listeners if state changes.
   * @private
   * @param {StorageEvent} event
   */
  private handleStorageEvent = (event: StorageEvent) => {
    if (event.key === this.key) {
      const prevState = this.getCurrentState();
      const data = this.getStorageData();
      // Compare and trigger listeners for windows
      // New windows
      const prevIds = new Set(prevState.windows.map((w) => w.id));
      for (const win of data.windows) {
        if (!prevIds.has(win.id)) {
          for (const listener of this.newWindowListeners) {
            listener(win);
          }
        }
      }
      // Removed windows
      const newIds = new Set(data.windows.map((w) => w.id));
      for (const win of prevState.windows) {
        if (!newIds.has(win.id)) {
          for (const listener of this.removeWindowListeners) {
            listener(win);
          }
        }
      }
      // Updated windows (shallow compare except id)
      for (const win of data.windows) {
        const prev = prevState.windows.find((w) => w.id === win.id);
        if (prev && JSON.stringify(prev) !== JSON.stringify(win)) {
          for (const listener of this.windowUpdateListeners) {
            listener(win);
          }
        }
      }
      // Active window change
      if (prevState.activeWindow?.id !== data.activeWindow?.id) {
        for (const listener of this.activeWindowChangeListeners) {
          listener(data.activeWindow);
        }
      }
      // Meta change
      if (JSON.stringify(prevState.meta) !== JSON.stringify(data.meta)) {
        for (const listener of this.metaChangeListeners) {
          listener(data.meta);
        }
      }
      // Update local state
      this.setActiveWindow(data.activeWindow);
      this.windows = data.windows;
      this.meta = data.meta;
      this.emitStateChange();
    }
  };

  /**
   * Handles window unload (removes this window from the list).
   * @private
   */
  private handleBeforeUnload = () => {
    this.removeThisWindow();
    this.stopMovePolling();
    this.setActiveWindow(null);
    if (!this.windows?.length) {
      localStorage.removeItem(this.key);
    } else {
      this.updateStorageData();
    }
  };

  /**
   * Handles window focus (sets this window as active).
   * @private
   */
  private handleFocus = () => {
    this.setActiveWindow(this.thisWindow);
    this.updateStorageData();
  };

  /**
   * Loads state from localStorage.
   * @private
   */
  private loadStateFromStorage() {
    const data = this.getStorageData();
    this.windows = data.windows;
    this.setActiveWindow(this.thisWindow);
    this.meta = data.meta;
  }

  /**
   * Updates localStorage with the current state.
   * @private
   */
  private updateStorageData() {
    const data = {
      activeWindow: this.activeWindow,
      windows: this.windows,
      meta: this.meta,
    };
    localStorage.setItem(this.key, JSON.stringify(data));
  }

  /**
   * Reads the state from localStorage.
   * @private
   * @returns {{ activeWindow: WindowType | null; windows: WindowType[]; meta: M }}
   */
  private getStorageData(): {
    activeWindow: WindowType | null;
    windows: WindowType[];
    meta: M;
  } {
    const data = localStorage.getItem(this.key);
    return data
      ? JSON.parse(data)
      : { activeWindow: null, windows: [], meta: this.meta };
  }

  /**
   * Initializes or retrieves this window's data from sessionStorage.
   * @private
   * @returns {WindowType}
   */
  private initCurrentWindow(): WindowType {
    const data = sessionStorage.getItem(this.key);
    if (data) return JSON.parse(data);
    const rect = this.getWindowRect();
    const newWindow: WindowType = { id: generateWindowId(), ...rect };
    sessionStorage.setItem(this.key, JSON.stringify(newWindow));
    return newWindow;
  }

  /**
   * Handles messages from other windows (BroadcastChannel).
   * @private
   * @param {MessageEvent} event
   */
  private handleChannelMessage = (event: MessageEvent) => {
    const { from, message }: { from: string; message: any } = event.data || {};
    for (const listener of this.messageListeners) {
      listener(message, from);
    }
  };
}

export default WindowsManager;

// --- Global Window Extension ---
/**
 * Extends the global Window interface to include the windowManager instance.
 */
declare global {
  interface Window {
    windowManager: WindowsManager;
  }
}
