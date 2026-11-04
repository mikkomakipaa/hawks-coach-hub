import type { Drill, DrillAttachment, DrillIntensityLevel } from '@/types/drills';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatPlayerCount(drill: Pick<Drill, 'playerCountMin' | 'playerCountMax'>): string {
  if (drill.playerCountMin && drill.playerCountMax) {
    return `${drill.playerCountMin}-${drill.playerCountMax} pelaajaa`;
  }

  if (drill.playerCountMin) {
    return `Vahintaan ${drill.playerCountMin} pelaajaa`;
  }

  if (drill.playerCountMax) {
    return `Enintaan ${drill.playerCountMax} pelaajaa`;
  }

  return 'Pelaajamaara joustava';
}

function formatDuration(durationMin?: number): string {
  if (!durationMin) {
    return 'Kesto sovittavissa';
  }

  return `${durationMin} min`;
}

function formatAgeGroups(ageGroups: string[]): string {
  if (ageGroups.length === 0) {
    return 'Kaikki ryhmat';
  }

  return ageGroups.join(' / ');
}

function formatIntensityLabel(level: DrillIntensityLevel | undefined): string {
  switch (level) {
    case 'low':
      return 'Matala';
    case 'medium':
      return 'Keskitaso';
    case 'high':
      return 'Korkea';
    default:
      return 'Avoin teho';
  }
}

function formatAttachmentType(type: DrillAttachment['type']): string {
  switch (type) {
    case 'image':
      return 'Kuva';
    case 'pdf':
      return 'PDF';
    case 'drive-file':
      return 'Drive';
    case 'link':
      return 'Linkki';
  }
}

export {
  escapeHtml,
  formatAgeGroups,
  formatAttachmentType,
  formatDuration,
  formatIntensityLabel,
  formatPlayerCount,
};
