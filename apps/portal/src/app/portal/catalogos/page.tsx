'use client'

import React from 'react'
import { Globe, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import ChannelManager from '@/components/business/catalogs/ChannelManager'

export default function CatalogsPage() {
    const router = useRouter()

    return (
        <div className="p-6 md:p-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">


            {/* Main Interface */}
            <ChannelManager />
        </div>
    )
}
