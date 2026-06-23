import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const EXPIRE_DAYS = 30
const BATCH_SIZE = 100
const STORAGE_BUCKETS = ['handdrawn-images', 'avatars']

const timeoutPromise = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`操作超时，超过 ${ms}ms`))
    }, ms)
    promise.then(
      (result) => {
        clearTimeout(timer)
        resolve(result)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })
}

function extractStoragePath(publicUrl: string, bucket: string): string | null {
  try {
    const marker = `/storage/v1/object/public/${bucket}/`
    const idx = publicUrl.indexOf(marker)
    if (idx === -1) return null
    return publicUrl.substring(idx + marker.length)
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  return handleClean(request)
}

export async function POST(request: NextRequest) {
  return handleClean(request)
}

async function handleClean(request: NextRequest) {
  const startTime = Date.now()

  try {
    const cronSecret = process.env.CRON_SECRET || 'aihuatang-clean-2026-default-secret'
    const headerSecret = request.headers.get('x-cron-secret')
    const querySecret = request.nextUrl.searchParams.get('secret')

    if (headerSecret !== cronSecret && querySecret !== cronSecret) {
      console.warn('[CronClean] 鉴权失败，IP:', request.headers.get('x-forwarded-for') || 'unknown')
      return NextResponse.json({
        success: false,
        error: '鉴权失败，禁止访问'
      }, { status: 401 })
    }

    if (!supabaseAdmin) {
      console.error('[CronClean] Supabase admin 未配置')
      return NextResponse.json({
        success: false,
        error: 'Supabase 未配置'
      }, { status: 500 })
    }

    const expireDate = new Date()
    expireDate.setDate(expireDate.getDate() - EXPIRE_DAYS)
    const expireDateISO = expireDate.toISOString()

    console.log(`[CronClean] 开始清理 ${EXPIRE_DAYS} 天前的记录，截止时间: ${expireDateISO}`)

    const { data: expiredRecords, error: queryError } = await supabaseAdmin
      .from('generation_records')
      .select('id, image_urls, user_id, created_at')
      .lt('created_at', expireDateISO)
      .limit(BATCH_SIZE)

    if (queryError) {
      console.error('[CronClean] 查询过期记录失败:', queryError)
      return NextResponse.json({
        success: false,
        error: '查询过期记录失败'
      }, { status: 500 })
    }

    if (!expiredRecords || expiredRecords.length === 0) {
      console.log('[CronClean] 没有需要清理的过期记录')
      return NextResponse.json({
        success: true,
        message: '没有需要清理的过期记录',
        cleaned: 0,
        deletedFiles: 0,
        duration: Date.now() - startTime
      })
    }

    console.log(`[CronClean] 找到 ${expiredRecords.length} 条过期记录`)

    const allFilesToDelete: { bucket: string; path: string }[] = []
    const recordIdsToUpdate: string[] = []

    for (const record of expiredRecords) {
      recordIdsToUpdate.push(record.id)
      try {
        const imageUrls = typeof record.image_urls === 'string'
          ? JSON.parse(record.image_urls)
          : (record.image_urls || [])

        if (Array.isArray(imageUrls)) {
          for (const url of imageUrls) {
            if (typeof url !== 'string' || !url) continue
            for (const bucket of STORAGE_BUCKETS) {
              const path = extractStoragePath(url, bucket)
              if (path) {
                allFilesToDelete.push({ bucket, path })
                break
              }
            }
          }
        }
      } catch (parseErr) {
        console.error(`[CronClean] 解析记录 ${record.id} 的 image_urls 失败:`, parseErr)
      }
    }

    console.log(`[CronClean] 准备删除 ${allFilesToDelete.length} 个文件`)

    let deletedFilesCount = 0
    const fileDeleteErrors: string[] = []

    const filesByBucket: Record<string, string[]> = {}
    for (const file of allFilesToDelete) {
      if (!filesByBucket[file.bucket]) {
        filesByBucket[file.bucket] = []
      }
      filesByBucket[file.bucket].push(file.path)
    }

    for (const bucket of STORAGE_BUCKETS) {
      const paths = filesByBucket[bucket] || []
      if (paths.length === 0) continue

      try {
        const { data: removedData, error: removeError } = await timeoutPromise(
          supabaseAdmin.storage.from(bucket).remove(paths),
          60000
        )

        if (removeError) {
          console.error(`[CronClean] 删除 ${bucket} 文件失败:`, removeError)
          fileDeleteErrors.push(`${bucket}: ${removeError.message}`)
        } else {
          deletedFilesCount += (removedData?.length || paths.length)
          console.log(`[CronClean] ${bucket} 删除了 ${paths.length} 个文件`)
        }
      } catch (err: any) {
        console.error(`[CronClean] 删除 ${bucket} 文件异常:`, err.message)
        fileDeleteErrors.push(`${bucket}: ${err.message}`)
      }
    }

    const EXPIRED_PLACEHOLDER = '[]'
    let updatedRecords = 0
    let updateErrors = 0

    for (const recordId of recordIdsToUpdate) {
      try {
        const { error: updateError } = await supabaseAdmin
          .from('generation_records')
          .update({
            image_urls: EXPIRED_PLACEHOLDER,
            status: 'expired',
            resolution: null,
          })
          .eq('id', recordId)

        if (updateError) {
          updateErrors++
          console.error(`[CronClean] 更新记录 ${recordId} 失败:`, updateError)
        } else {
          updatedRecords++
        }
      } catch (err: any) {
        updateErrors++
        console.error(`[CronClean] 更新记录 ${recordId} 异常:`, err.message)
      }
    }

    const duration = Date.now() - startTime
    console.log(`[CronClean] 清理完成: 处理 ${expiredRecords.length} 条记录, 删除 ${deletedFilesCount} 个文件, 更新 ${updatedRecords} 条记录, 耗时 ${duration}ms`)

    return NextResponse.json({
      success: true,
      message: `清理完成: 处理 ${expiredRecords.length} 条记录, 删除 ${deletedFilesCount} 个文件`,
      cleaned: expiredRecords.length,
      deletedFiles: deletedFilesCount,
      updatedRecords: updatedRecords,
      updateErrors: updateErrors,
      fileDeleteErrors: fileDeleteErrors,
      expireDate: expireDateISO,
      duration: duration
    })

  } catch (error: any) {
    console.error('[CronClean] 未知错误:', error.message, error.stack)
    return NextResponse.json({
      success: false,
      error: error.message || '清理任务执行失败'
    }, { status: 500 })
  }
}
