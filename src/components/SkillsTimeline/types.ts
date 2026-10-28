import type { ReactNode } from 'react'

export interface SkillMilestone {
    id: string | number
    name: string
    /** Short note: what clicked, what you built. */
    description?: string
    /** 0–100. Clamped before rendering. */
    level: number
    /** "2021", "2021-04" or an ISO date. */
    start_date: string
    /** Leave empty / undefined for skills you still use today. */
    end_date?: string | null
    category_id?: number
    /** 1–3 letters shown inside the badge (e.g. "TS"). */
    short?: string
    /** Custom badge content instead of `short`: a FontAwesome icon, <Image />, etc. */
    // icon?: ReactNode
    icon_url: string,
    /** Accent hex used by the node, meter and badge. */
    tags?: string[]
}
