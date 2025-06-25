# js-windows-manager

A utility to manage and synchronize state across multiple browser windows/tabs.

## Demo

👉 **[Live Demo](https://windows-manager-example.vercel.app/)**

## Installation

```sh
npm install js-windows-manager
```

## Usage

```ts
import WindowsManager from "js-windows-manager";

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
manager.sendMessage({ hello: "world" });

// Update shared meta state
manager.updateMeta({ shared: false });
```

## More Examples

### Listen for State Changes

```js
import WindowsManager from "js-windows-manager";
const manager = new WindowsManager();

manager.addStateChangeListener((state) => {
  console.log("State changed!", state);
});
```

### Send a Message to All Windows

```js
manager.sendMessage({ type: "PING" });

manager.addMessageListener((msg, fromId) => {
  if (msg.type === "PING") {
    console.log("Received PING from", fromId);
  }
});
```

### Track the Active Window

```js
manager.addActiveWindowChangeListener((activeId) => {
  if (activeId === manager.thisWindow.id) {
    console.log("This window is now active!");
  } else {
    console.log("Another window is active:", activeId);
  }
});
```

### Share Custom Meta State

```js
// Set custom data for this window
manager.updateMeta({
  ...manager.meta,
  [manager.thisWindow.id]: { username: "Alice" },
});

// Listen for meta changes
manager.addMetaChangeListener((meta) => {
  console.log("Meta updated:", meta);
});
```

## Demo

👉 **[Live Demo](https://windows-manager-example.vercel.app/)**

Try dragging the colored bubbles in multiple browser windows/tabs!

## Advanced Example: Real-Time Shared State (React)

Here's a more advanced example using React, where draggable bubbles are synchronized across all open windows/tabs in real time:

```tsx
import { useEffect, useState } from "react";
import WindowsManager from "js-windows-manager";

// Create a manager instance
const manager = new WindowsManager();

// Helper to generate a random color
const getRandomColor = () => {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

// Default bubble style for a new window
const defaultBubble = {
  top: Math.random() * window.innerHeight,
  left: Math.random() * window.innerWidth,
  backgroundColor: getRandomColor(),
};

function App() {
  // State from the manager
  const [state, setState] = useState(manager.getCurrentState());
  const [dragIdx, setDragIdx] = useState<string | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // Listen for state changes from other windows
  useEffect(() => {
    manager.addStateChangeListener((state) => {
      setState(state);
    });
    // Initialize this window's bubble if not present
    if (!state.meta?.[manager.thisWindow.id]) {
      manager.updateMeta({
        ...manager.meta,
        [manager.thisWindow.id]: defaultBubble,
      });
    }
  }, []);

  // Handle drag start
  const handleMouseDown = (e: React.MouseEvent, idx: string) => {
    setDragIdx(idx);
    const bubble = state.meta[idx];
    setOffset({
      x: e.clientX - (bubble.left || 0),
      y: e.clientY - (bubble.top || 0),
    });
    document.body.style.userSelect = "none";
  };

  // Handle drag move
  const handleMouseMove = (e: MouseEvent) => {
    if (dragIdx === null) return;
    const bubbleSize = 80;
    let left = e.clientX - offset.x;
    let top = e.clientY - offset.y;
    left = Math.max(0, Math.min(left, window.innerWidth - bubbleSize));
    top = Math.max(0, Math.min(top, window.innerHeight - bubbleSize));
    const newMeta = { ...state.meta };
    newMeta[dragIdx] = {
      ...newMeta[dragIdx],
      left,
      top,
    };
    setState({ ...state, meta: newMeta });
    manager.updateMeta(newMeta);
  };

  // Handle drag end
  const handleMouseUp = () => {
    if (dragIdx === null) return;
    setDragIdx(null);
    document.body.style.userSelect = "";
  };

  // Attach/detach mouse event listeners for dragging
  useEffect(() => {
    if (dragIdx !== null) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragIdx, offset, state]);

  return (
    <div style={{ height: "100vh", width: "100vw", position: "relative" }}>
      <p style={{ textAlign: "center", fontStyle: "italic" }}>
        Open this app in multiple windows/tabs and drag the bubbles!
      </p>
      {state.windows.map(({ id }) => (
        <div
          key={id}
          style={{
            position: "absolute",
            width: 80,
            height: 80,
            borderRadius: "50%",
            border: "2px solid #333",
            cursor: "move",
            ...(state.meta?.[id] || {}),
          }}
          onMouseDown={(e) => handleMouseDown(e, id)}
        />
      ))}
    </div>
  );
}
```

This example demonstrates how to:

- Synchronize draggable UI elements (bubbles) across all open windows/tabs.
- Use `WindowsManager` to listen for and update shared state in real time.
- Integrate with React state and events for a seamless UX.

## API

### `WindowsManager`

- `

## License

MIT

## GitHub

[https://github.com/Darshan-Naik/windows-manager](https://github.com/Darshan-Naik/windows-manager)
