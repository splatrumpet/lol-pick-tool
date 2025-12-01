// src/components/ChampionIcon.tsx
import clsx from 'clsx'

type Status = 'NONE' | 'PRIORITY' | 'PICKED' | 'UNAVAILABLE'

interface ChampionIconProps {
  champion: {
    id: string
    name: string
    icon_url: string | null
  }
  status: Status
  onClick: () => void
}

export function ChampionIcon({ champion, status, onClick }: ChampionIconProps) {
  const borderClass =
    status === 'PRIORITY'
      ? 'border-2 border-emerald-400'
      : status === 'PICKED'
        ? 'border-2 border-sky-400'
        : status === 'UNAVAILABLE'
          ? 'border border-zinc-500'
          : 'border border-transparent'

  const opacityClass = status === 'UNAVAILABLE' ? 'opacity-40' : 'opacity-100'

  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'relative w-14 h-14 rounded bg-zinc-800 overflow-hidden flex items-center justify-center',
        borderClass,
        opacityClass
      )}
      title={champion.name}
    >
      {champion.icon_url ? (
        <img
          src={champion.icon_url}
          alt={champion.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="text-[10px] text-zinc-200 text-center px-1">
          {champion.name}
        </span>
      )}

      {status === 'UNAVAILABLE' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-red-400 text-xl font-bold leading-none">
            ×
          </span>
        </div>
      )}
    </button>
  )
}
