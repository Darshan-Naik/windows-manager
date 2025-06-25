# windows-manager

A utility to manage and synchronize state across multiple browser windows/tabs.

## Installation

```sh
npm install windows-manager
```

## Usage

```ts
import { WindowsManager } from "windows-manager";

const manager = new WindowsManager({
  onStateChange: (state) => {
    console.log("State changed:", state);
  },
  onMessage: (msg, fromId) => {
    console.log("Message from", fromId, msg);
  },
  initialMeta: { shared: true },
});

// Send a message to all windows
tmanager.sendMessage({ hello: "world" });

// Update shared meta state
manager.updateMeta({ shared: false });
```

## API

### `WindowsManager`

- `constructor(options?: WindowsManagerOptions)`
- `addStateChangeListener(listener)`
- `removeStateChangeListener(listener)`
- `addMessageListener(listener)`
- `removeMessageListener(listener)`
- `addNewWindowListener(listener)`
- `removeNewWindowListener(listener)`
- `addRemoveWindowListener(listener)`
- `removeRemoveWindowListener(listener)`
- `addWindowUpdateListener(listener)`
- `removeWindowUpdateListener(listener)`
- `addActiveWindowChangeListener(listener)`
- `removeActiveWindowChangeListener(listener)`
- `addMetaChangeListener(listener)`
- `removeMetaChangeListener(listener)`
- `getCurrentState()`
- `updateMeta(meta)`
- `sendMessage(message)`

### Types

- `WindowType`
- `WindowsManagerState`
- `WindowsManagerOptions`

## License

MIT
