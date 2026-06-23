import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: '系统配置未完成，请稍后重试'
      }, { status: 500 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const userId = formData.get('userId') as string

    if (!file || !userId) {
      return NextResponse.json({
        success: false,
        error: '文件和用户ID不能为空'
      }, { status: 400 })
    }

    if (file.size > 200 * 1024) {
      return NextResponse.json({
        success: false,
        error: '文件大小不能超过200KB'
      }, { status: 400 })
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        success: false,
        error: '只支持 JPG、PNG、WebP 格式的图片'
      }, { status: 400 })
    }

    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'png'
    const fileName = `${userId}_${Date.now()}.${fileExtension}`

    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .storage
      .from('avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (uploadError) {
      console.error('Upload avatar error:', uploadError)
      return NextResponse.json({
        success: false,
        error: '上传失败，请稍后重试'
      }, { status: 500 })
    }

    const { data: publicUrlData } = supabaseAdmin 
      .storage
      .from('avatars')
      .getPublicUrl(fileName)

    if (!publicUrlData) {
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
        error: '更新用户信息失败'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: '头像上传成功',
      avatarUrl: publicUrlData.publicUrl
    })
  } catch (error) {
    console.error('Upload avatar API error:', error)
    return NextResponse.json({
      success: false,
      error: '上传失败，请稍后重试'
    }, { status: 500 })
  }
}