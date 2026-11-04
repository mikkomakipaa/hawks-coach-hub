import type { Session, SessionBlock } from '@/types/sessions';

const BLOCK_TYPE_LABELS: Record<SessionBlock['type'], string> = {
  warmup: 'Alkuverryttely',
  drill: 'Harjoite',
  break: 'Tauko',
  game: 'Peli',
  cooldown: 'Loppuverryttely',
  custom: 'Muu lohko',
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderBlock(block: SessionBlock, index: number): string {
  return `
    <li class="session-print-block">
      <div class="session-print-block-row">
        <strong>${index + 1}. ${escapeHtml(block.title)}</strong>
        <span>${block.durationMin} min</span>
      </div>
      <div class="session-print-block-meta">${escapeHtml(BLOCK_TYPE_LABELS[block.type])}</div>
      ${block.notes ? `<p class="session-print-block-notes">${escapeHtml(block.notes)}</p>` : ''}
    </li>
  `;
}

function buildPrintMarkup(session: Session): string {
  return `<!doctype html>
  <html lang="fi">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${escapeHtml(session.name)} | Hawks Coach Hub</title>
      <style>
        :root { color-scheme: light; }
        body { font-family: "Avenir Next", "Segoe UI", sans-serif; margin: 24px; color: #16202b; }
        h1, h2, p { margin: 0; }
        .session-print-header { display: grid; gap: 10px; margin-bottom: 24px; }
        .session-print-meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
        .session-print-meta div, .session-print-block { border: 1px solid #d4dde6; border-radius: 14px; padding: 12px 14px; }
        .session-print-kicker { text-transform: uppercase; letter-spacing: 0.08em; font-size: 11px; color: #5b6b7b; }
        .session-print-blocks { display: grid; gap: 12px; list-style: none; padding: 0; margin: 18px 0 0; }
        .session-print-block-row { display: flex; justify-content: space-between; gap: 12px; }
        .session-print-block-meta { margin-top: 6px; font-size: 13px; color: #556575; }
        .session-print-block-notes { margin-top: 8px; line-height: 1.5; }
      </style>
    </head>
    <body>
      <header class="session-print-header">
        <p class="session-print-kicker">Hawks Coach Hub</p>
        <h1>${escapeHtml(session.name)}</h1>
        <div class="session-print-meta">
          <div><p class="session-print-kicker">Ryhma</p><strong>${escapeHtml(session.group)}</strong></div>
          <div><p class="session-print-kicker">Paiva</p><strong>${escapeHtml(session.date)}</strong></div>
          <div><p class="session-print-kicker">Valmentaja</p><strong>${escapeHtml(session.coachLabel)}</strong></div>
          <div><p class="session-print-kicker">Kesto</p><strong>${session.totalDurationMin ?? 0} / ${session.targetDurationMin ?? 0} min</strong></div>
        </div>
      </header>
      <main>
        <h2>Harjoituksen runko</h2>
        <ol class="session-print-blocks">
          ${session.blocks.map(renderBlock).join('')}
        </ol>
      </main>
      <script>window.addEventListener('load', () => window.print());</script>
    </body>
  </html>`;
}

export function openSessionPrintView(session: Session): boolean {
  const printWindow = window.open('', '_blank', 'noopener,noreferrer');
  if (!printWindow) {
    return false;
  }

  printWindow.document.open();
  printWindow.document.write(buildPrintMarkup(session));
  printWindow.document.close();

  return true;
}
