// src/app/page.tsx
import Link from 'next/link'
import { PickBoardPreview } from '@/components/PickBoardPreview'

export default function HomePage() {
  return (
    <main className="min-h-screen text-zinc-100">
      <div className="max-w-6xl mx-auto px-4 py-12 sm:py-16 space-y-12">
        <header>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] text-emerald-100">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            LoL のドラフト相談を少しだけ楽にするツール
          </div>
        </header>

        <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center">
          <div className="space-y-6 fade-in">
            <div className="space-y-4">
              <p className="text-[11px] uppercase tracking-[0.35em] text-emerald-200/80">
                Draft Strategy Companion
              </p>
              <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight">
                LoL Pick Tool
                <span className="block text-xl sm:text-2xl text-zinc-300 font-normal mt-3">
                  5人のプールをひとつの盤面に。ピック相談を、もっとスムーズに。
                </span>
              </h1>
              <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-xl">
                チャンピオンプールをロール別に整理し、BAN / PICK 中に「誰が何を出せるか」を
                即座に共有できるドラフト支援ツールです。リアルタイム同期で、チームの意思決定が速くなります。
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/rooms"
                className="inline-flex items-center justify-center rounded-md bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-black shadow shadow-emerald-500/40 hover:bg-emerald-300 transition"
              >
                ルームを作成 / 参加
              </Link>
              <Link
                href="/mypage"
                className="inline-flex items-center justify-center rounded-md border border-zinc-700 bg-zinc-900/70 px-5 py-2.5 text-sm font-semibold text-zinc-100 hover:border-sky-300/70 hover:text-sky-200 transition"
              >
                マイプールを整える
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 text-xs text-zinc-300">
              <div className="glass-panel rounded-lg px-3 py-2">
                <p className="text-emerald-200 font-semibold">役割ごとの視認性</p>
                <p className="mt-1 text-[11px] text-zinc-400">
                  プールをロール別に一覧化して強みがすぐ見える。
                </p>
              </div>
              <div className="glass-panel rounded-lg px-3 py-2">
                <p className="text-sky-200 font-semibold">ピック状態を共有</p>
                <p className="mt-1 text-[11px] text-zinc-400">
                  候補・確定・不可の状態を全員で更新。
                </p>
              </div>
              <div className="glass-panel rounded-lg px-3 py-2">
                <p className="text-amber-200 font-semibold">リアルタイム同期</p>
                <p className="mt-1 text-[11px] text-zinc-400">
                  ブラウザ間で即反映、会話が途切れない。
                </p>
              </div>
            </div>
          </div>

          <div
            className="glass-panel-strong rounded-2xl p-5 sm:p-6 relative overflow-hidden fade-in"
            style={{ animationDelay: '120ms' }}
          >
            <div className="absolute -top-16 -right-10 h-48 w-48 rounded-full bg-emerald-400/20 blur-3xl" />
            <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-sky-400/10 blur-3xl" />
            <div className="relative space-y-4">
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span>Draft Board Preview</span>
                <span className="text-emerald-200">Live Sync</span>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/30 p-3 sm:p-4">
                <div className="origin-top-left scale-[0.82] sm:scale-[0.9]">
                  <PickBoardPreview />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px] text-zinc-400">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-sky-300" />
                  候補
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-300" />
                  確定
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-rose-300" />
                  ピック不可
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 fade-in" style={{ animationDelay: '200ms' }}>
          <Link
            href="/mypage"
            className="glass-panel rounded-2xl p-5 hover:border-emerald-300/60 transition group"
          >
            <p className="text-xs text-zinc-400">My Pool</p>
            <h2 className="text-lg font-semibold text-emerald-100 mt-2">
              マイプールを更新する
            </h2>
            <p className="text-sm text-zinc-300 mt-2 leading-relaxed">
              得意・普通・練習中を整理して、ピック相談の土台を作ろう。
            </p>
            <div className="mt-4 text-xs text-emerald-200 group-hover:text-emerald-100">
              マイプールへ進む →
            </div>
          </Link>
          <Link
            href="/rooms"
            className="glass-panel rounded-2xl p-5 hover:border-sky-300/60 transition group"
          >
            <p className="text-xs text-zinc-400">Room Hub</p>
            <h2 className="text-lg font-semibold text-sky-100 mt-2">
              ルームを作成・参加する
            </h2>
            <p className="text-sm text-zinc-300 mt-2 leading-relaxed">
              試合ごとのルームでメンバーを招待。全員のプールを一括表示。
            </p>
            <div className="mt-4 text-xs text-sky-200 group-hover:text-sky-100">
              ルーム一覧へ →
            </div>
          </Link>
        </section>

        <section className="space-y-3 fade-in" style={{ animationDelay: '260ms' }}>
          <h2 className="text-sm font-semibold text-zinc-200">
            このサイトでできること
          </h2>
          <div className="grid gap-3 sm:grid-cols-3 text-sm">
            <div className="glass-panel rounded-lg p-4 space-y-2">
              <h3 className="text-xs font-semibold text-emerald-200">
                マイプール管理
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                ロールごとにチャンピオンプールを登録し、
                「得意 / 普通 / 練習中」の3段階で得意度を管理できます。
              </p>
            </div>
            <div className="glass-panel rounded-lg p-4 space-y-2">
              <h3 className="text-xs font-semibold text-sky-200">
                ルームでの共有
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                試合ごとにルームを作成し、5人が参加。
                参加メンバーのプールをまとめて表示しながら、ピック候補を検討できます。
              </p>
            </div>
            <div className="glass-panel rounded-lg p-4 space-y-2">
              <h3 className="text-xs font-semibold text-amber-200">
                BAN / PICK の整理
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                チャンピオンごとに「ピック候補 / 確定 / ピック不可」を付けて、
                BAN / PICK の進行に合わせて状態を整理できます。
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3 fade-in" style={{ animationDelay: '320ms' }}>
          <h2 className="text-sm font-semibold text-zinc-200">
            基本的な使い方
          </h2>
          <div className="grid gap-3 md:grid-cols-4 text-xs text-zinc-300">
            <div className="glass-panel rounded-lg p-3">
              <p className="text-emerald-200 font-semibold">1. ログイン</p>
              <p className="mt-1 text-zinc-400">
                アカウントを作成してログインします。
              </p>
            </div>
            <div className="glass-panel rounded-lg p-3">
              <p className="text-emerald-200 font-semibold">2. プール登録</p>
              <p className="mt-1 text-zinc-400">
                マイプールでロールごとにチャンピオンを登録。
              </p>
            </div>
            <div className="glass-panel rounded-lg p-3">
              <p className="text-emerald-200 font-semibold">3. ルーム作成</p>
              <p className="mt-1 text-zinc-400">
                ルームを作成してメンバーを招待します。
              </p>
            </div>
            <div className="glass-panel rounded-lg p-3">
              <p className="text-emerald-200 font-semibold">4. ドラフト相談</p>
              <p className="mt-1 text-zinc-400">
                BAN / PICK を進めながら候補を整理。
              </p>
            </div>
          </div>
        </section>

        <section className="border border-zinc-800 rounded-lg bg-zinc-900/70 p-4 text-xs text-zinc-400 space-y-1.5">
          <p>
            ※ このツールは非公式ファンメイドツールです。Riot Games,
            Inc. とは一切関係ありません。
          </p>
          <p>
            ※ データは Supabase 上に保存され、ブラウザを閉じてもプールやルーム情報は保持されます。
          </p>
        </section>
      </div>
    </main>
  )
}
