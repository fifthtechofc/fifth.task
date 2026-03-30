import { supabase } from './supabase'

export async function uploadAvatar(file: File, userId: string) {
  const fileExt = file.name.split('.').pop()
  const filePath = `${userId}/avatar.${fileExt}`

  const { error } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, {
      upsert: true,
    })

  if (error) {
    throw new Error(error.message)
  }

  const { data } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath)

  return data.publicUrl
}

type AvatarLookupResult = {
  publicUrl: string | null
  path: string | null
}

export async function getAvatarPublicUrl(userId: string): Promise<AvatarLookupResult> {
  const { data, error } = await supabase.storage.from('avatars').list(userId, {
    limit: 50,
    offset: 0,
    sortBy: { column: 'name', order: 'asc' },
  })

  if (error) {
    throw new Error(error.message)
  }

  const file = (data ?? []).find((f) => f.name.toLowerCase().startsWith('avatar.'))
  if (!file) {
    return { publicUrl: null, path: null }
  }

  const filePath = `${userId}/${file.name}`
  const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
  return { publicUrl: urlData.publicUrl ?? null, path: filePath }
}