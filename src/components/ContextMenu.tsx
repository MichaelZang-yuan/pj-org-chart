"use client";

interface MenuItem {
  icon: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        onContextMenu={(e) => { e.preventDefault(); onClose(); }}
        style={{ position: "fixed", inset: 0, zIndex: 200 }}
      />
      {/* Menu */}
      <div
        style={{
          position: "fixed",
          left: x,
          top: y,
          zIndex: 201,
          backgroundColor: "#fff",
          borderRadius: 10,
          boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
          border: "1px solid #e5e7eb",
          padding: "4px 0",
          minWidth: 200,
        }}
      >
        {items.map((item, i) => (
          <button
            key={i}
            onClick={() => { item.onClick(); onClose(); }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "8px 14px",
              border: "none",
              background: "none",
              cursor: "pointer",
              fontSize: 13,
              color: item.danger ? "#DC2626" : "#374151",
              textAlign: "left",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = item.danger ? "#FEF2F2" : "#F3F4F6")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <span style={{ fontSize: 15 }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>
    </>
  );
}
