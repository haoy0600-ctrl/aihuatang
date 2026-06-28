import { NextRequest, NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

const MAX_FILE_SIZE = 2 * 1024 * 1024
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp']

function normalizeMimeType(mime: string) {
  return mime === 'image/jpg' ? 'image/jpeg' : mime
}

function matchesImageSignature(buffer: Uint8Array, detectedType: string): boolean {
  const mime = normalizeMimeType(detectedType)

  if (mime === 'image/png') {
    return (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    )
  }

  if (mime === 'image/jpeg') {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  }

  if (mime === 'image/webp') {
    return (
      buffer.length >= 12 &&
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    )
  }

  return false
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

    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: '请选择一张图片后再上传。',
        },
        { status: 400 },
      )
    }

    if (file.size <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: '上传文件为空，请重新选择图片。',
        },
        { status: 400 },
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `图片不能超过 2MB，当前 ${(file.size / 1024 / 1024).toFixed(2)}MB。`,
        },
        { status: 400 },
      )
    }

    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'png'
    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      return NextResponse.json(
        {
          success: false,
          error: '仅支持 PNG、JPG、JPEG、WebP 图片。',
        },
        { status: 400 },
      )
    }

    const detectedType = normalizeMimeType(String(file.type || '').toLowerCase())
    if (!ALLOWED_TYPES.map(normalizeMimeType).includes(detectedType)) {
      return NextResponse.json(
        {
          success: false,
          error: '图片格式不正确，请上传 PNG、JPG、JPEG 或 WebP。',
        },
        { status: 400 },
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    if (!matchesImageSignature(buffer, detectedType)) {
      return NextResponse.json(
        {
          success: false,
          error: '图片文件内容与格式不匹配，请重新导出后再上传。',
        },
        { status: 400 },
      )
    }

    const safeFileName = `${auth.user.id}_${Date.now()}.${fileExtension}`
    const storage = supabaseAdmin.storage.from('avatars')

    const { error: uploadError } = await storage.upload(safeFileName, buffer, {
      contentType: detectedType,
      cacheControl: '3600',
      upsert: true,
    })

    if (uploadError) {
      console.error('[UploadAvatar] Storage upload failed:', uploadError)

      if (uploadError.message?.includes('Bucket not found')) {
        return NextResponse.json(
          {
            success: false,
            error: '头像存储桶 avatars 不存在，请先在 Supabase Storage 中创建。',
          },
          { status: 500 },
        )
      }

      return NextResponse.json(
        {
          success: false,
          error: '头像上传失败，请稍后重试。',
        },
        { status: 500 },
      )
    }

    const { data: publicUrlData } = storage.getPublicUrl(safeFileName)
    const avatarUrl = publicUrlData?.publicUrl

    if (!avatarUrl) {
      return NextResponse.json(
        {
          success: false,
          error: '获取头像链接失败，请稍后重试。',
        },
        { status: 500 },
      )
    }

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', auth.user.id)

    if (updateError) {
      console.error('[UploadAvatar] Update profile failed:', updateError)
      return NextResponse.json(
        {
          success: false,
          error: '头像保存失败，请稍后重试。',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: '头像上传成功。',
      avatarUrl,
    })
  } catch (error) {
    console.error('[UploadAvatar] API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: '头像上传失败，请稍后重试。',
      },
      { status: 500 },
    )
  }
}
