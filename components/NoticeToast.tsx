'use client'

type NoticeType = 'success' | 'error' | 'info'

export type Notice = {
  type: NoticeType
  message: string
}

type NoticeToastProps = {
  notice: Notice | null
  onClose: () => void
}

const colorByType: Record<NoticeType, string> = {
  success: 'border-emerald-400/40 text-emerald-100 bg-emerald-500/10',
  error: 'border-rose-400/40 text-rose-100 bg-rose-500/10',
  info: 'border-sky-400/40 text-sky-100 bg-sky-500/10',
}

export const NoticeToast = ({ notice, onClose }: NoticeToastProps) => {
  if (!notice) return null

  return (
    <div className="fixed right-4 top-4 z-50 max-w-sm">
      <div
        className={`glass-panel rounded-xl border px-4 py-3 text-sm shadow-lg ${colorByType[notice.type]}`}
      >
        <div className="flex items-start gap-3">
          <p className="flex-1 leading-relaxed">{notice.message}</p>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-zinc-300 hover:text-white"
            aria-label="通知を閉じる"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}
