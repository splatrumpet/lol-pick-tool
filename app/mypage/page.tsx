// src/app/mypage/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { ROLES, Role } from '@/constants/roles'
import { LogoutButton } from '@/components/LogoutButton'

type Champion = {
  id: string
  name: string
  icon_url: string | null
}

type PoolRow = {
  id: string
  champion_id: string
  role: Role
  proficiency: number
  champion: Champion
}

const PROF_LABEL: Record<number, string> = {
  3: '得意',
  2: '普通',
  1: '練習中',
}

// カタカナ → ひらがな
const kanaToHira = (str: string) =>
  str.replace(/[\u30a1-\u30f6]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  )

// 検索用に正規化（ひらがな＋小文字＋空白除去）
const normalizeForSearch = (str: string) =>
  kanaToHira(str)
    .toLowerCase()
    .replace(/\s+/g, '')

const getProficiencyStars = (p: number) => {
  if (p >= 3) return '★★★'
  if (p === 2) return '★★☆'
  if (p === 1) return '★☆☆'
  return ''
}

export default function MyPage() {
  const [user, setUser] = useState<any>(null)
  const [champions, setChampions] = useState<Champion[]>([])
  const [pools, setPools] = useState<PoolRow[]>([])
  const [loading, setLoading] = useState(true)

  // 編集用
  const [selectedChampionId, setSelectedChampionId] = useState<string>('')
  const [editRole, setEditRole] = useState<Role>('TOP')
  const [editProf, setEditProf] = useState<number>(3)
  const [championSearch, setChampionSearch] = useState<string>('')

  // 表示用（確認エリア）
  const [viewRole, setViewRole] = useState<Role>('TOP')

  // 一括編集モード
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkSelectedChampionIds, setBulkSelectedChampionIds] = useState<string[]>([])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        setUser(null)
        setLoading(false)
        return
      }
      setUser(userData.user)

      // チャンピオン一覧
      const { data: champData } = await supabase
        .from('champions')
        .select('id, name, icon_url')
        .order('name', { ascending: true })

      setChampions(champData || [])

      // 自分のプール
      const { data: poolData } = await supabase
        .from('user_champion_pools')
        .select('id, champion_id, role, proficiency, champions(*)')
        .eq('user_id', userData.user.id)

      setPools(
        (poolData || []).map((p: any) => ({
          id: p.id,
          champion_id: p.champion_id,
          role: p.role as Role,
          proficiency: p.proficiency,
          champion: {
            id: p.champions.id,
            name: p.champions.name,
            icon_url: p.champions.icon_url,
          },
        }))
      )

      setLoading(false)
    }

    init()
  }, [])

  // 検索で絞り込んだチャンピオン一覧（ひらがな & 英字）
  const filteredChampions = useMemo(() => {
    const keywordRaw = championSearch.trim()
    if (!keywordRaw) return champions

    const keyword = normalizeForSearch(keywordRaw)
    return champions.filter((c) =>
      normalizeForSearch(c.name).includes(keyword)
    )
  }, [champions, championSearch])

  const selectedChampion = useMemo(
    () => champions.find((c) => c.id === selectedChampionId),
    [champions, selectedChampionId]
  )

  // 表示用：選択中ロールのプールを得意順に
  const poolsForView = useMemo(() => {
    return pools
      .filter((p) => p.role === viewRole)
      .sort((a, b) => {
        if (a.proficiency !== b.proficiency) {
          return b.proficiency - a.proficiency // 3 → 1
        }
        return a.champion.name.localeCompare(b.champion.name)
      })
  }, [pools, viewRole])

  // 既存プール（ロール＋チャンプ）チェック用
  const hasPoolForRoleAndChampion = (role: Role, championId: string) => {
    return pools.some(
      (p) => p.role === role && p.champion_id === championId
    )
  }

  // 通常モード：1体追加
  const handleAddSingle = async () => {
    if (!user || !selectedChampionId) return

    const { data, error } = await supabase
      .from('user_champion_pools')
      .insert({
        user_id: user.id,
        champion_id: selectedChampionId,
        role: editRole,
        proficiency: editProf,
      })
      .select('id, champion_id, role, proficiency, champions(*)')

    if (error) {
      alert(error.message)
      return
    }

    const row = data?.[0] as any | undefined
    if (!row) return

    setPools((prev) => [
      ...prev,
      {
        id: row.id,
        champion_id: row.champion_id,
        role: row.role as Role,
        proficiency: row.proficiency,
        champion: {
          id: row.champions.id,
          name: row.champions.name,
          icon_url: row.champions.icon_url,
        },
      },
    ])
  }

  // 一括モード：複数追加
  const handleAddBulk = async () => {
    if (!user || bulkSelectedChampionIds.length === 0) return

    // すでに同ロールで登録済みのチャンピオンは除外
    const targets = bulkSelectedChampionIds.filter(
      (cid) => !hasPoolForRoleAndChampion(editRole, cid)
    )

    if (targets.length === 0) {
      alert('このロールには、すでに同じチャンピオンが登録されています。')
      return
    }

    const insertPayload = targets.map((championId) => ({
      user_id: user.id,
      champion_id: championId,
      role: editRole,
      proficiency: editProf,
    }))

    const { data, error } = await supabase
      .from('user_champion_pools')
      .insert(insertPayload)
      .select('id, champion_id, role, proficiency, champions(*)')

    if (error) {
      alert(error.message)
      return
    }

    const rows = (data || []) as any[]

    const mapped: PoolRow[] = rows.map((row) => ({
      id: row.id,
      champion_id: row.champion_id,
      role: row.role as Role,
      proficiency: row.proficiency,
      champion: {
        id: row.champions.id,
        name: row.champions.name,
        icon_url: row.champions.icon_url,
      },
    }))

    setPools((prev) => [...prev, ...mapped])
    // 追加後は選択をクリア
    setBulkSelectedChampionIds([])
  }

  const handleDeletePool = async (id: string) => {
    const ok = window.confirm('このエントリを削除しますか？')
    if (!ok) return

    const { error } = await supabase
      .from('user_champion_pools')
      .delete()
      .eq('id', id)

    if (error) {
      alert(error.message)
      return
    }

    setPools((prev) => prev.filter((p) => p.id !== id))
  }

  const handleToggleBulkMode = () => {
    setBulkMode((prev) => {
      const next = !prev
      if (next) {
        // 一括モードに入るときは単体選択をクリア
        setSelectedChampionId('')
      } else {
        // 戻るときは一括選択をクリア
        setBulkSelectedChampionIds([])
      }
      return next
    })
  }

  const handleClickChampionInGrid = (id: string) => {
    if (bulkMode) {
      setBulkSelectedChampionIds((prev) =>
        prev.includes(id)
          ? prev.filter((cid) => cid !== id)
          : [...prev, id]
      )
    } else {
      setSelectedChampionId(id)
    }
  }

  if (loading) {
    return (
      <div className="py-6 text-sm text-zinc-400">
        読み込み中...
      </div>
    )
  }

  if (!user) {
    return (
      <div className="py-6 space-y-2">
        <h1 className="text-xl font-semibold">マイチャンピオンプール</h1>
        <p className="text-sm text-zinc-300">
          ログインして、ロールごとのチャンピオンプールを登録してください。
        </p>
      </div>
    )
  }

  // ボタンのラベル＆状態
  const canSubmit = bulkMode
    ? bulkSelectedChampionIds.length > 0
    : !!selectedChampionId

  const submitLabel = bulkMode
    ? `選択中の${bulkSelectedChampionIds.length}体を追加`
    : selectedChampion
      ? `${selectedChampion.name} を追加`
      : 'チャンピオンを選択してください'

  return (
    <div className="py-4 space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">マイチャンピオンプール</h1>
        <p className="text-xs text-zinc-400">
          登録したチャンピオンが、ピックルームで候補として表示されます。
          このページでプール登録と確認をまとめて行えます。
        </p>
      </header>

      {/* === 登録フォーム（編集） === */}
      <section className="border border-zinc-800 rounded-xl bg-zinc-900/70 p-4 shadow-lg shadow-black/30 space-y-3 text-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">チャンピオンを追加</h2>
          <button
            type="button"
            onClick={handleToggleBulkMode}
            className={[
              'text-[11px] px-2 py-1 rounded-md border',
              bulkMode
                ? 'border-emerald-400 text-emerald-300 bg-emerald-500/10'
                : 'border-zinc-600 text-zinc-300 hover:border-emerald-400 hover:text-emerald-300',
            ].join(' ')}
          >
            一括編集モード: {bulkMode ? 'ON' : 'OFF'}
          </button>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          {/* 左：検索＋アイコングリッド */}
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label className="text-[11px] text-zinc-400">
                チャンピオン（クリックで{bulkMode ? '複数選択' : '選択'}）
              </label>
              <div className="flex items-center gap-2">
                {bulkMode && (
                  <span className="text-[10px] text-emerald-300">
                    選択中: {bulkSelectedChampionIds.length}体
                  </span>
                )}
                <span className="text-[10px] text-zinc-500">
                  {filteredChampions.length} / {champions.length}
                </span>
              </div>
            </div>

            <input
              type="text"
              value={championSearch}
              onChange={(e) => setChampionSearch(e.target.value)}
              placeholder="例: あーり / アーリ"
              className="bg-zinc-950 border border-zinc-700 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/60"
            />

            <div className="mt-1 max-h-80 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950/70 p-2">
              {filteredChampions.length === 0 ? (
                <p className="text-[11px] text-zinc-500">
                  該当するチャンピオンが見つかりません。
                </p>
              ) : (
                <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {filteredChampions.map((c) => {
                    const isBulkSelected =
                      bulkMode && bulkSelectedChampionIds.includes(c.id)
                    const isSingleSelected =
                      !bulkMode && c.id === selectedChampionId

                    const selected = isBulkSelected || isSingleSelected

                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleClickChampionInGrid(c.id)}
                        className={[
                          'relative flex flex-col items-center gap-1 p-1 rounded-md border text-[10px] hover:border-emerald-400/60 hover:bg-emerald-500/5 transition',
                          selected
                            ? 'border-emerald-400 bg-emerald-500/10 shadow shadow-emerald-500/30'
                            : 'border-zinc-800 bg-zinc-900/80',
                        ].join(' ')}
                      >
                        {c.icon_url ? (
                          <img
                            src={c.icon_url}
                            alt={c.name}
                            className="w-10 h-10 rounded object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-zinc-800 text-[9px] flex items-center justify-center text-zinc-300 text-center px-1">
                            {c.name}
                          </div>
                        )}
                        <span className="text-[9px] text-zinc-200 line-clamp-2 text-center">
                          {c.name}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 右：ロール・得意度・確認 */}
          <div className="w-full lg:w-64 flex flex-col gap-3">
            {!bulkMode && (
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-zinc-400">
                  選択中のチャンピオン
                </label>
                <div className="flex items-center gap-2 bg-zinc-950/70 border border-zinc-800 rounded-md px-2 py-2 min-h-[52px]">
                  {selectedChampion ? (
                    <>
                      {selectedChampion.icon_url ? (
                        <img
                          src={selectedChampion.icon_url}
                          alt={selectedChampion.name}
                          className="w-8 h-8 rounded object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded bg-zinc-800 text-[9px] flex items-center justify-center text-zinc-300">
                          {selectedChampion.name}
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="text-xs font-medium">
                          {selectedChampion.name}
                        </div>
                      </div>
                    </>
                  ) : (
                    <span className="text-[11px] text-zinc-500">
                      アイコンをクリックして選択してください
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-zinc-400">ロール</label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as Role)}
                className="bg-zinc-950 border border-zinc-700 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/60"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-zinc-400">得意度</label>
              <select
                value={editProf}
                onChange={(e) => setEditProf(Number(e.target.value))}
                className="bg-zinc-950 border border-zinc-700 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/60"
              >
                <option value={3}>得意（★★★）</option>
                <option value={2}>普通（★★☆）</option>
                <option value={1}>練習中（★☆☆）</option>
              </select>
            </div>

            <div className="pt-1">
              <button
                onClick={bulkMode ? handleAddBulk : handleAddSingle}
                disabled={!canSubmit}
                className="w-full px-4 py-2 rounded-md bg-emerald-500 text-black text-sm font-medium hover:bg-emerald-400 transition shadow shadow-emerald-500/40 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitLabel}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* === 登録済みプール（ロール選択＋得意順） === */}
      <section className="border border-zinc-800 rounded-xl bg-zinc-900/70 p-4 shadow-lg shadow-black/30 space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-semibold">登録済みプール</h2>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-400">表示ロール:</span>
            <select
              value={viewRole}
              onChange={(e) => setViewRole(e.target.value as Role)}
              className="bg-zinc-950 border border-zinc-700 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/60"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        {poolsForView.length === 0 ? (
          <p className="text-xs text-zinc-500">
            このロールのプールはまだ登録されていません。
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {poolsForView.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2 bg-zinc-950/60 border border-zinc-800 rounded-lg px-2 py-1.5"
              >
                {p.champion.icon_url ? (
                  <img
                    src={p.champion.icon_url}
                    alt={p.champion.name}
                    className="w-8 h-8 rounded object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded bg-zinc-800 text-[9px] flex items-center justify-center text-zinc-300">
                    {p.champion.name}
                  </div>
                )}
                <div className="flex-1">
                  <div className="text-xs font-medium">
                    {p.champion.name}
                  </div>
                  <div className="text-[11px] text-zinc-400 flex items-center gap-1">
                    <span>{getProficiencyStars(p.proficiency)}</span>
                    <span>
                      ({PROF_LABEL[p.proficiency] ?? p.proficiency})
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDeletePool(p.id)}
                  className="text-[11px] text-zinc-400 hover:text-red-400"
                >
                  削除
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
