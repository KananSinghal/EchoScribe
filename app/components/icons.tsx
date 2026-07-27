type IconProps = {
  size?: number;
};

const common = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "square" as const,
  strokeLinejoin: "miter" as const,
  strokeWidth: 1.8,
  viewBox: "0 0 24 24",
};

export function UploadIcon({ size = 20 }: IconProps) {
  return (
    <svg {...common} width={size} height={size} aria-hidden="true">
      <path d="M12 16V3M7 8l5-5 5 5M4 14v6h16v-6" />
    </svg>
  );
}

export function MicIcon({ size = 21 }: IconProps) {
  return (
    <svg {...common} width={size} height={size} aria-hidden="true">
      <rect x="8" y="3" width="8" height="12" rx="4" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8" />
    </svg>
  );
}

export function SearchIcon({ size = 17 }: IconProps) {
  return (
    <svg {...common} width={size} height={size} aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5" />
    </svg>
  );
}

export function CloseIcon({ size = 16 }: IconProps) {
  return (
    <svg {...common} width={size} height={size} aria-hidden="true">
      <path d="m5 5 14 14M19 5 5 19" />
    </svg>
  );
}

export function FileIcon({ size = 18 }: IconProps) {
  return (
    <svg {...common} width={size} height={size} aria-hidden="true">
      <path d="M6 2h8l4 4v16H6zM14 2v5h5" />
    </svg>
  );
}

export function CopyIcon({ size = 16 }: IconProps) {
  return (
    <svg {...common} width={size} height={size} aria-hidden="true">
      <rect x="8" y="8" width="11" height="11" />
      <path d="M16 8V5H5v11h3" />
    </svg>
  );
}

export function DownloadIcon({ size = 16 }: IconProps) {
  return (
    <svg {...common} width={size} height={size} aria-hidden="true">
      <path d="M12 3v12M7 11l5 5 5-5M4 21h16" />
    </svg>
  );
}

export function TrashIcon({ size = 16 }: IconProps) {
  return (
    <svg {...common} width={size} height={size} aria-hidden="true">
      <path d="M4 7h16M9 3h6l1 4H8zM7 7l1 14h8l1-14M10 11v6M14 11v6" />
    </svg>
  );
}

export function NotesIcon({ size = 22 }: IconProps) {
  return (
    <svg {...common} width={size} height={size} aria-hidden="true">
      <path d="M5 3h14v18H5zM8 8h8M8 12h8M8 16h5" />
    </svg>
  );
}
