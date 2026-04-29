"use client"

import { UserAvatars } from "@/components/ui/user-avatars"

export default function DemoAvatarsPage() {
  const users = [
    {
      id: 1,
      name: "Alice",
      image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1",
    },
    {
      id: 2,
      name: "Bob",
      image: "https://images.unsplash.com/photo-1544723795-3fb6469f5b39",
    },
    {
      id: 3,
      name: "Charlie",
      image: "https://images.unsplash.com/photo-1544723795-432537943726",
    },
    {
      id: 4,
      name: "Diana",
      image: "https://images.unsplash.com/photo-1525130413817-d45c1d127c42",
    },
    {
      id: 5,
      name: "Eve",
      image: "https://images.unsplash.com/photo-1544006659-f0b21884ce1d",
    },
    {
      id: 6,
      name: "Frank",
      image: "https://images.unsplash.com/photo-1544723795-3fb0b90cffc6",
    },
    {
      id: 7,
      name: "Grace",
      image: "https://images.unsplash.com/photo-1525130413817-4e7c4f1b4f39",
    },
    {
      id: 8,
      name: "Hank",
      image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d",
    },
  ]

  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-gradient-to-b from-black via-zinc-950 to-black p-10">
      <UserAvatars users={users} maxVisible={5} />
    </div>
  )
}
