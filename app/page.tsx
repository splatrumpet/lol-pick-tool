// src/app/page.tsx
import Link from 'next/link'
import { AuthButton } from '@/components/AuthButton'


export default function HomePage() {
  return (
    <main className="min-h-screen bg-linear-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100">
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">
        {/* Hero */}
        <section className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[11px] text-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            LoL のドラフト相談を少しだけ楽にするツール
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              LoL Pick Tool
            </h1>
            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
              5人それぞれのチャンピオンプールをまとめて表示して、
              BAN / PICK 中のピック相談を手助けするための Web ツールです。
              <br className="hidden sm:block" />
              「誰が何を出せるか」「どれが得意か」を一画面で共有できます。
            </p>
          </div>

          {/* メインCTA */}
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/rooms"
              className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-black shadow shadow-emerald-500/40 hover:bg-emerald-400 transition"
            >
              ルーム一覧へ
            </Link>
            <Link
              href="/mypage"
              className="inline-flex items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-100 hover:border-emerald-400 hover:text-emerald-200 transition"
            >
              マイプールを編集
            </Link>
            <AuthButton />
          </div>
        </section>

        {/* できること */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-200">
            このサイトでできること
          </h2>
          <div className="grid gap-3 sm:grid-cols-3 text-sm">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-3 space-y-1.5">
              <h3 className="text-xs font-semibold text-emerald-300">
                マイプール管理
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                ロールごとにチャンピオンプールを登録し、
                「得意 / 普通 / 練習中」の3段階で得意度を管理できます。
                マイページから一括編集も可能です。
              </p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-3 space-y-1.5">
              <h3 className="text-xs font-semibold text-emerald-300">
                ルームでの共有
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                試合ごとにルームを作成し、5人が参加。
                参加メンバーのプールをまとめて表示しながら、ピック候補を検討できます。
              </p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-3 space-y-1.5">
              <h3 className="text-xs font-semibold text-emerald-300">
                BAN / PICK 中のメモ
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                チャンピオンごとに「ピック候補 / 確定 / ピック不可」をつけて、
                BAN / PICK の進行に合わせて状態を整理できます。
                ブラウザ間でもリアルタイムで同期されます。
              </p>
            </div>
          </div>
        </section>

        {/* 使い方 */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-200">
            基本的な使い方
          </h2>
          <ol className="space-y-2 text-sm text-zinc-300">
            <li>
              <span className="font-semibold text-emerald-300">
                1. ログイン / サインアップ
              </span>
              <br />
              右上または上のリンクから「ログイン / 新規登録」ページへ進み、
              アカウントを作成します。
            </li>
            <li>
              <span className="font-semibold text-emerald-300">
                2. マイプールを登録
              </span>
              <br />
              <Link
                href="/mypage"
                className="underline underline-offset-2 hover:text-emerald-300"
              >
                マイプール
              </Link>
              で、自分のロールごとのチャンピオンプールを登録します。
              ひらがな検索＋アイコン一覧から直感的に選べます。
            </li>
            <li>
              <span className="font-semibold text-emerald-300">
                3. ルームを作成してメンバーを招待
              </span>
              <br />
              <Link
                href="/rooms"
                className="underline underline-offset-2 hover:text-emerald-300"
              >
                ルーム一覧
              </Link>
              から新しいルームを作成し、ルームURLを味方に共有します。
              各自がログインして参加すると、ピック画面にプールが反映されます。
            </li>
            <li>
              <span className="font-semibold text-emerald-300">
                4. BAN / PICK をしながら候補を整理
              </span>
              <br />
              ピック画面では、チャンピオンをクリックして
              「ピック候補 / 確定 / ピック不可」を切り替えながら、
              チーム全体の構成を相談できます。
            </li>
          </ol>
        </section>

        {/* 注意書き */}
        <section className="border border-zinc-800 rounded-lg bg-zinc-900/70 p-3 text-xs text-zinc-400 space-y-1.5">
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
