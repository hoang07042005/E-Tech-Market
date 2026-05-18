import type { CSSProperties } from 'react'

export function HeartIcon({
  filled = true,
  size = 16,
  className,
  style,
}: {
  filled?: boolean
  size?: number
  className?: string
  style?: CSSProperties
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      aria-hidden="true"
      className={className}
      style={style}
    >
      <path
        d="M11.646 20.02a.75.75 0 0 0 .708 0C17.6 17.01 21 13.88 21 9.72c0-2.636-2.144-4.78-4.78-4.78-1.686 0-3.218.86-4.22 2.19-1.002-1.33-2.534-2.19-4.22-2.19C5.144 4.94 3 7.084 3 9.72c0 4.16 3.4 7.29 8.646 10.3Z"
        stroke="currentColor"
        strokeWidth={filled ? 0 : 1.6}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function HeartOutlineIcon({
  size = 16,
  className,
  style,
}: {
  size?: number
  className?: string
  style?: CSSProperties
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
      style={style}
    >
      <path
        d="M11.646 20.02a.75.75 0 0 0 .708 0C17.6 17.01 21 13.88 21 9.72c0-2.636-2.144-4.78-4.78-4.78-1.686 0-3.218.86-4.22 2.19-1.002-1.33-2.534-2.19-4.22-2.19C5.144 4.94 3 7.084 3 9.72c0 4.16 3.4 7.29 8.646 10.3Z"
        fill="transparent"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

