import {
  escapeHtml,
  formatAgeGroups,
  formatDuration,
  formatIntensityLabel,
  formatPlayerCount,
} from '@/components/drill-presenters';
import type { Drill } from '@/types/drills';

function getDrillHref(drill: Drill): string {
  return `#/drills/${encodeURIComponent(drill.slug || drill.id)}`;
}

export function renderDrillCard(drill: Drill): string {
  const tagMarkup = drill.skillTags
    .slice(0, 3)
    .map(tag => `<li class="drill-card-tag">${escapeHtml(tag)}</li>`)
    .join('');
  const summary = drill.summary || 'Harjoitteen kuvaus taydentyy testiversion aikana.';
  const ageGroups = drill.ageGroups.length > 0 ? formatAgeGroups(drill.ageGroups) : 'Kaikki ryhmat';
  const duration = drill.durationMin ? formatDuration(drill.durationMin) : 'Avoin kesto';

  return `
    <article class="drill-card" data-drill-card data-drill-id="${escapeHtml(drill.id)}">
      <div class="drill-card-topline">
        <p class="drill-card-fit">Sopii: ${escapeHtml(ageGroups)}</p>
        <span class="drill-card-duration">${escapeHtml(duration)}</span>
      </div>
      <div class="drill-card-header">
        <div class="drill-card-diagram" aria-hidden="true">${escapeHtml(drill.category.slice(0, 1) || 'H')}</div>
        <div class="drill-card-heading">
          <p class="drill-card-category">${escapeHtml(drill.category)}</p>
          <h3 class="drill-card-title">${escapeHtml(drill.title)}</h3>
        </div>
      </div>
      <p class="drill-card-summary">${escapeHtml(summary)}</p>
      <dl class="drill-card-meta">
        <div>
          <dt>Pelaajat</dt>
          <dd>${escapeHtml(formatPlayerCount(drill))}</dd>
        </div>
        <div>
          <dt>Teho</dt>
          <dd>${escapeHtml(formatIntensityLabel(drill.intensityLevel))}</dd>
        </div>
        <div>
          <dt>Ikaryhma</dt>
          <dd>${escapeHtml(ageGroups)}</dd>
        </div>
        <div>
          <dt>Taito</dt>
          <dd>${escapeHtml(drill.skillTags[0] || 'Monipuolinen')}</dd>
        </div>
      </dl>
      ${tagMarkup ? `<ul class="drill-card-tags" aria-label="Taitotagit">${tagMarkup}</ul>` : ''}
      <div class="drill-card-actions">
        <button type="button" class="drill-card-primary-action" data-drill-add="${escapeHtml(drill.id)}">+ Lisaa suunnitelmaan</button>
        <a class="drill-card-link" href="${getDrillHref(drill)}">Avaa tiedot</a>
      </div>
    </article>
  `;
}
