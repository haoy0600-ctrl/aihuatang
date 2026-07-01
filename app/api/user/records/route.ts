import { NextRequest, NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const GRS_API_KEY = process.env.GRSAI_API_KEY || ''
const GRS_API_BASE_URL = (process.env.GRS_API_BASE_URL || 'https://grsai.dakka.com.cn').replace(/\/+$/, '')

type RecordsRequest = {
  status?: 'all' | 'success' | 'failed'
  page?: number
  limit?: number
}

function parseImageUrls(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
  }

  if (!value || typeof value !== 'string') return []

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : []
  } catch {
    return value.trim() ? [value.trim()] : []
  }
}

function parseRecordMeta(value: unknown): Record<string, any> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, any>
  if (typeof value !== 'string' || !value.trim()) return {}

  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function extractImageUrl(value: any, depth = 0): string | null {
  if (!value || depth > 5) return null

  if (typeof value === 'string') {
    return /^https?:\/\//i.test(value) ? value : null
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = extractImageUrl(item, depth + 1)
      if (found) return found
    }
    return null
  }

  if (typeof value === 'object') {
    for (const key of ['url', 'imageUrl', 'image_url', 'image', 'src', 'output', 'result']) {
      const found = extractImageUrl(value[key], depth + 1)
      if (found) return found
    }

    for (const key of ['data', 'results', 'images', 'image_urls', 'urls', 'outputs', 'payload']) {
      const found = extractImageUrl(value[key], depth + 1)
      if (found) return found
    }
  }

  return null
}

function normalizeTaskStatus(json: any) {
  return String(json?.status ?? json?.data?.status ?? json?.state ?? json?.data?.state ?? '').toLowerCase()
}

function isTaskFailed(status: string) {
  return ['failed', 'fail', 'error', 'canceled', 'cancelled'].some((item) => status.includes(item))
}

async function refreshProcessingRecord(record: any) {
  if (!supabaseAdmin || !record || !['processing', 'pending', 'running'].includes(String(record.status))) {
    return record
  }

  const existingUrls = parseImageUrls(record.image_urls)
  if (existingUrls.length > 0) {
    await supabaseAdmin
      .from('generation_records')
      .update({
        status: 'success',
        image_urls: JSON.stringify(existingUrls),
        image_url: existingUrls[0],
      })
      .eq('id', record.id)

    return {
      ...record,
      status: 'success',
      image_urls: JSON.stringify(existingUrls),
      image_url: existingUrls[0],
    }
  }

  if (!GRS_API_KEY) return record

  const meta = parseRecordMeta(record.input_content)
  const taskIds = Array.from(
    new Set(
      [
        ...(Array.isArray(meta.taskIds) ? meta.taskIds : []),
        meta.activeTaskId,
        meta.taskId,
      ].filter((item): item is string => typeof item === 'string' && item.trim().length > 0),
    ),
  )

  if (taskIds.length === 0) return record

  const imageUrls: string[] = []
  let failed = false

  for (const taskId of taskIds) {
    try {
      const response = await fetch(`${GRS_API_BASE_URL}/v1/draw/result`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GRS_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: taskId }),
      })

      if (!response.ok) continue
      const json = await response.json()
      const imageUrl = extractImageUrl(json)
      if (imageUrl) {
        imageUrls.push(imageUrl)
        continue
      }

      if (isTaskFailed(normalizeTaskStatus(json))) failed = true
    } catch (error) {
      console.error('[Records] Refresh processing task failed:', { recordId: record.id, taskId, error })
    }
  }

  if (imageUrls.length > 0) {
    await supabaseAdmin
      .from('generation_records')
      .update({
        status: 'success',
        image_urls: JSON.stringify(imageUrls),
        image_url: imageUrls[0],
      })
      .eq('id', record.id)

    return {
      ...record,
      status: 'success',
      image_urls: JSON.stringify(imageUrls),
      image_url: imageUrls[0],
    }
  }

  if (failed) {
    await supabaseAdmin.from('generation_records').update({ status: 'failed' }).eq('id', record.id)
    return { ...record, status: 'failed' }
  }

  return record
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: '系统配置未完成，请稍后重试。',
        },
        { status: 500 },
      )
    }

    const auth = await requireAuthenticatedUser(request)
    if (auth.response || !auth.user) {
      return auth.response
    }

    const body = (await request.json()) as RecordsRequest
    const status = body.status || 'all'
    const page = Math.max(1, Number(body.page) || 1)
    const limit = Math.min(50, Math.max(1, Number(body.limit) || 20))
    const from = (page - 1) * limit
    const to = from + limit - 1

    let query = supabaseAdmin
      .from('generation_records')
      .select('*', { count: 'exact' })
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: false })

    if (status === 'success') {
      query = query.in('status', ['success', 'completed'])
    } else if (status === 'failed') {
      query = query.in('status', ['failed', 'error'])
    }

    const { data, error, count } = await query.range(from, to)

    if (error) {
      console.error('[Records] Query failed:', error)
      return NextResponse.json(
        {
          success: false,
          error: '获取生成记录失败，请稍后重试。',
        },
        { status: 500 },
      )
    }

    const records = Array.isArray(data) ? data : []
    const refreshedRecords = await Promise.all(
      records.map((record, index) => (index < 8 ? refreshProcessingRecord(record) : Promise.resolve(record))),
    )
    const total = count || 0

    return NextResponse.json({
      success: true,
      records: refreshedRecords,
      total,
      page,
      limit,
      hasMore: to + 1 < total,
    })
  } catch (error) {
    console.error('[Records] API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: '获取生成记录失败，请稍后重试。',
      },
      { status: 500 },
    )
  }
}
