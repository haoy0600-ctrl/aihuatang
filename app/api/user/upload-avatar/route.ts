import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuthenticatedUser } from '@/lib/auth'

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: '系统配置未完成，请稍后重试'
      }, { status: 500 })
    }

    const auth = await requireAuthenticatedUser(request)
    if (auth.response || !auth.user) return auth.response

    const formData = await request.formData()
    const file = formData.get('file') as File
    const userId = auth.user.id

    // 基础校验
    if (!file) {
      return NextResponse.json({
        success: false,
        error: '文件不能为空'
      }, { status: 400 })
    }

    // 文件大小限制 2MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        success: false,
        error: `文件大小不能超过 2MB，当前文件 ${(file.size / 1024 / 1024).toFixed(2)}MB`
      }, { status: 400 })
    }

    // 文件格式校验
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'png'
    const allowedExtensions = ['png', 'jpg', 'jpeg', 'webp']
    
    if (!allowedExtensions.includes(fileExtension)) {
      return NextResponse.json({
        success: false,
        error: '只支持 PNG、JPG、WebP 格式的图片'
      }, { status: 400 })
    }

    // 验证文件MIME类型
    const detectedType = file.type.toLowerCase()
    if (!ALLOWED_TYPES.includes(detectedType)) {
      return NextResponse.json({
        success: false,
        error: '文件格式不正确，只支持 PNG、JPG、WebP'
      }, { status: 400 })
    }

    const safeFileName = `${userId}_${Date.now()}.${fileExtension}`

    // 将 File 对象转为 ArrayBuffer 用于上传
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .storage
      .from('avatars')
      .upload(safeFileName, buffer, {
        contentType: detectedType,
        cacheControl: '3600',
        upsert: true
      })

    if (uploadError) {
      console.error('Upload avatar StorageApiError:', uploadError)
      
      // 针对 Storage 特定错误提供友好提示
      if (uploadError.message?.includes('Bucket not found')) {
        return NextResponse.json({
          success: false,
          error: '存储配置异常，请联系管理员'
        }, { status: 500 })
      }
      
      if (uploadError.message?.includes('permission')) {
        return NextResponse.json({
          success: false,
          error: '上传权限不足，请刷新页面后重试'
        }, { status: 403 })
      }

      return NextResponse.json({
        success: false,
        error: '头像上传失败，请稍后重试'
      }, { status: 500 })
    }

    const { data: publicUrlData } = supabaseAdmin 
      .storage
      .from('avatars')
      .getPublicUrl(safeFileName)

    if (!publicUrlData?.publicUrl) {
      console.error('Get public URL error: no data returned')
      return NextResponse.json({
        success: false,
        error: '获取图片链接失败'
      }, { status: 500 })
    }

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ avatar_url: publicUrlData.publicUrl })
      .eq('id', userId)

    if (updateError) {
      console.error('Update profile error:', updateError)
      return NextResponse.json({
        success: false,
        error: '更新用户头像信息失败'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: '头像上传成功',
      avatarUrl: publicUrlData.publicUrl
    })
  } catch (error: any) {
    console.error('Upload avatar API error:', error)
    
    // 区分不同类型的错误
    if (error?.name === 'TypeError' && error?.message?.includes('file')) {
      return NextResponse.json({
        success: false,
        error: '文件数据异常，请重新选择图片'
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: '头像上传失败，请稍后重试'
    }, { status: 500 })
  }
}
