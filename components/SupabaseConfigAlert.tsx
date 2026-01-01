// src/components/SupabaseConfigAlert.tsx

type Props = {
  detail?: string
  className?: string
}

export function SupabaseConfigAlert({ detail, className = '' }: Props) {
  return (
    <div
      className={[
        'border border-red-500/50 bg-red-500/10 rounded-lg p-4 space-y-2 text-sm text-red-100',
        className,
      ].join(' ')}
    >
      <div className="font-semibold text-red-200">
        Supabase の設定を確認してください
      </div>
      <p className="text-[13px] leading-relaxed text-red-100">
        認証に必要な環境変数が設定されていないため、ログイン関連の機能を利用できません。
        NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY を設定し、再起動してください。
      </p>
      {detail && (
        <p className="text-xs text-red-300 break-words">
          {detail}
        </p>
      )}
    </div>
  )
}
