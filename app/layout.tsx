// src/app/layout.tsx
import './globals.css'
import Link from 'next/link'

export const metadata = {
  title: 'LoL Pick Tool',
  description: 'LoL用ピック検討ツール',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-zinc-950 text-zinc-100">
        <div className="min-h-screen flex flex-col">
          {/* ヘッダー */}
          <header className="border-b border-zinc-800/80 bg-black/60 backdrop-blur-sm">
            <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-400/40 flex items-center justify-center text-xs font-bold text-emerald-300 tracking-wide">
                  LOL
                </div>
                <Link href="/" className="flex flex-col leading-tight">
                  <span className="text-sm font-semibold">
                    LoL ピックツール
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    Champion Pool / Draft Helper
                  </span>
                </Link>
              </div>
              <nav className="flex items-center gap-3 text-xs">
                <Link
                  href="/mypage"
                  className="px-2 py-1 rounded-md text-zinc-300 hover:text-emerald-300 hover:bg-emerald-500/10 transition"
                >
                  マイプール
                </Link>
                <Link
                  href="/rooms"
                  className="px-2 py-1 rounded-md text-zinc-300 hover:text-emerald-300 hover:bg-emerald-500/10 transition"
                >
                  ルーム一覧
                </Link>
                <Link
                  href="/login"
                  className="px-2 py-1 rounded-md text-zinc-300 hover:text-emerald-300 hover:bg-emerald-500/10 transition"
                >
                  ログイン
                </Link>
              </nav>
            </div>
          </header>

          {/* コンテンツ */}
          <main className="flex-1">
            <div className="max-w-5xl mx-auto px-4 py-4">{children}</div>
          </main>

          {/* フッター */}
          <footer className="border-t border-zinc-900/80 bg-black/70">
            <div className="max-w-5xl mx-auto px-4 py-2 text-[10px] text-zinc-500 flex justify-between">
              <span>LoL Pick Tool</span>
              <span>Built by you 🎺</span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}
