import { useEffect, useState } from "react";
import WindowsManager from "js-windows-manager";

const manager = new WindowsManager();

const getRandomColor = () => {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

const defaultBubble = {
  top: Math.random() * window.innerHeight,
  left: Math.random() * window.innerWidth,
  backgroundColor: getRandomColor(),
};

function App() {
  const [state, setState] = useState(manager.getCurrentState());
  const [dragIdx, setDragIdx] = useState<string | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    manager.addStateChangeListener((state) => {
      setState(state);
    });
    if (!state.meta?.[manager.thisWindow.id]) {
      manager.updateMeta({
        ...manager.meta,
        [manager.thisWindow.id]: defaultBubble,
      });
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent, idx: string) => {
    setDragIdx(idx);
    const bubble = state.meta[idx];
    setOffset({
      x: e.clientX - (bubble.left || 0),
      y: e.clientY - (bubble.top || 0),
    });
    document.body.style.userSelect = "none";
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (dragIdx === null) return;
    const bubbleSize = 80; // size-20 in Tailwind = 5rem = 80px
    let left = e.clientX - offset.x;
    let top = e.clientY - offset.y;
    // Clamp left and top so the bubble stays within the window
    left = Math.max(0, Math.min(left, window.innerWidth - bubbleSize));
    top = Math.max(0, Math.min(top, window.innerHeight - bubbleSize));
    const newMeta = state.meta;
    newMeta[dragIdx] = {
      ...newMeta[dragIdx],
      left,
      top,
    };
    setState(newMeta);
    manager.updateMeta(newMeta);
  };

  const handleMouseUp = () => {
    if (dragIdx === null) return;
    setDragIdx(null);
    document.body.style.userSelect = "";
  };

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
    <div className="flex flex-col gap-3">
      <div className=" h-full w-full flex gap-4 relative">
        {state.windows.map(({ id }) => (
          <div
            key={id}
            className="size-20 border absolute rounded-full cursor-move"
            style={{
              ...(state.meta?.[id] || {}),
            }}
            onMouseDown={(e) => handleMouseDown(e, id)}
          />
        ))}
      </div>
    </div>
  );
}

export default App;
