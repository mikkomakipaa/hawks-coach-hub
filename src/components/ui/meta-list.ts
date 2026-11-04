/**
 * MetaList — key-value pair display using <dl> 2-column grid
 *
 * Used for drill metadata, file metadata, session summary rows.
 */

export interface MetaListItem {
  label: string;
  value: string;
}

export interface MetaListOptions {
  items: MetaListItem[];
}

export function createMetaList(options: MetaListOptions): HTMLElement {
  const { items } = options;

  const dl = document.createElement('dl');
  dl.className = 'ui-meta-list';

  for (const item of items) {
    const div = document.createElement('div');
    div.className = 'ui-meta-list__item';

    const dt = document.createElement('dt');
    dt.className = 'ui-meta-list__label';
    dt.textContent = item.label;

    const dd = document.createElement('dd');
    dd.className = 'ui-meta-list__value';
    dd.textContent = item.value;

    div.appendChild(dt);
    div.appendChild(dd);
    dl.appendChild(div);
  }

  return dl;
}
