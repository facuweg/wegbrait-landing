'use client'

import dynamic from 'next/dynamic'

const ScrollScene = dynamic(() => import('@/components/scroll-scene'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
      }}
    />
  ),
})

export default function Page() {
  return <ScrollScene />
}
