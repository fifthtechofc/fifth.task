'use client'

import { useRouter } from 'next/navigation'

import { SimpleIntroSplash } from '@/components/ui/simple-intro-splash'
import { AUTH_INTRO_STORAGE_KEY } from '@/lib/intro-storage'

export default function Home() {
  const router = useRouter()

  return (
    <SimpleIntroSplash
      onSequenceComplete={() => {
        try {
          sessionStorage.setItem(AUTH_INTRO_STORAGE_KEY, '1')
        } catch {
          /* ignore */
        }
        router.replace('/login')
      }}
    />
  )
}
