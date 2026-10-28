import type { SkillMilestone } from './types'
import { addError } from '@/lib/error-store';

interface Response {
    ok: boolean,
    message ?: string,
    skillsTimeline: SkillMilestone[]
}

export async function dataSkills (): Promise<SkillMilestone[]> {
    try {
        const res = await fetch('/api/skills-timeline');
        if (!res.ok) throw new Error(`Failed to load timeline (${res.status})`);

        const data: Response = await res.json();
        
        if (!data.ok){
            addError(
                data.message || 'DataBase Error',
                { title: 'GET /api/skills-timeline' },
            );
            return [];
        }

        return Array.isArray(data.skillsTimeline) ? data.skillsTimeline : [];
    } catch (err) {
        addError(
            err instanceof Error ? err.message : 'Please, check your internet connection',
            { title: 'GET /api/skills-timeline' },
        );
        return [];
    }
}