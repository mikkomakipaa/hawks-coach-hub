/**
 * Static Content Display Component
 * Renders static content alongside Google Drive files
 */

import type { StaticContent, ContentCategory } from '@/types/content-types';
import { FinnishLabels } from '@/types/content-types';
import { contentManager } from '@/services/content-manager';

export class StaticContentDisplay {
  private container: HTMLElement | null = null;
  private currentLanguage: 'fi' | 'en' = 'fi';
  // private currentContent: StaticContent | null = null;

  constructor(container?: HTMLElement) {
    this.container = container || null;
  }

  render(container: HTMLElement) {
    this.container = container;
    this.renderContentList();
  }

  /**
   * Render static content item
   */
  renderContent(content: StaticContent): HTMLElement {
    // this.currentContent = content;

    const contentElement = document.createElement('div');
    contentElement.className = 'static-content-item';
    contentElement.setAttribute('data-content-id', content.id);

    const title = content.title[this.currentLanguage];
    const description = content.description[this.currentLanguage];
    const categoryLabel = FinnishLabels[content.category]?.[this.currentLanguage] || content.category;
    const typeLabel = FinnishLabels[content.type]?.[this.currentLanguage] || content.type;

    contentElement.innerHTML = `
      <div class="content-item-header">
        <div class="content-badges">
          <span class="content-type-badge content-type-${content.type}">${typeLabel}</span>
          <span class="content-category-badge content-category-${content.category}">${categoryLabel}</span>
          <span class="content-difficulty-badge difficulty-${content.difficulty}">
            ${FinnishLabels[content.difficulty]?.[this.currentLanguage] || content.difficulty}
          </span>
        </div>
        <div class="content-actions">
          <button class="favorite-btn ${content.metadata.isFavorite ? 'active' : ''}"
                  onclick="window.StaticContent.toggleFavorite('${content.id}')"
                  aria-label="${content.metadata.isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
            ${content.metadata.isFavorite ? '★' : '☆'}
          </button>
          <button class="expand-btn"
                  onclick="window.StaticContent.expandContent('${content.id}')"
                  aria-label="Expand content">
            📖
          </button>
        </div>
      </div>

      <div class="content-item-main">
        <h3 class="content-title">${this.escapeHtml(title)}</h3>
        <p class="content-description">${this.escapeHtml(description)}</p>

        <div class="content-metadata">
          <div class="content-stats">
            <span class="duration">⏱️ ${content.duration} min</span>
            <span class="age-groups">${content.ageGroup.join(', ')}</span>
            <span class="views">👁️ ${content.metadata.views}</span>
          </div>

          <div class="content-tags">
            ${content.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
          </div>

          <div class="content-equipment">
            <span class="equipment-label">Tarvikkeet:</span>
            ${content.equipment.map(eq =>
              `<span class="equipment-item">${FinnishLabels[eq]?.[this.currentLanguage] || eq}</span>`
            ).join(', ')}
          </div>
        </div>
      </div>

      <div class="content-preview" style="display: none;">
        <div class="content-body">
          ${this.renderMarkdown(content.content[this.currentLanguage])}
        </div>

        <div class="content-footer">
          <div class="author-info">
            <span class="author">👤 ${content.author}</span>
            <span class="updated">📅 ${this.formatDate(content.updatedAt)}</span>
          </div>

          <div class="content-actions-expanded">
            <button class="btn-secondary" onclick="window.StaticContent.editContent('${content.id}')">
              ✏️ Muokkaa
            </button>
            <button class="btn-primary" onclick="window.StaticContent.useInSession('${content.id}')">
              ➕ Lisää harjoitukseen
            </button>
          </div>
        </div>
      </div>
    `;

    return contentElement;
  }

  /**
   * Render content list with categories
   */
  async renderContentList(category?: ContentCategory): Promise<void> {
    const content = category
      ? await contentManager.getContentByCategory(category, this.currentLanguage)
      : await contentManager.getAllContent();

    if (content.length === 0) {
      if (!this.container) return;
      this.container.innerHTML = `
        <div class="no-content">
          <div class="no-content-icon">📚</div>
          <h3>Ei sisältöä saatavilla</h3>
          <p>Lisää uutta sisältöä tai valitse eri kategoria.</p>
          <button class="btn-primary" onclick="window.StaticContent.createNew()">
            ➕ Luo uusi sisältö
          </button>
        </div>
      `;
      return;
    }

    // Group content by category
    const grouped = this.groupByCategory(content);

    let html = '<div class="static-content-list">';

    for (const [categoryName, items] of Object.entries(grouped)) {
      const categoryLabel = FinnishLabels[categoryName]?.[this.currentLanguage] || categoryName;

      html += `
        <div class="content-category-section">
          <div class="category-header">
            <h2 class="category-title">${categoryLabel}</h2>
            <span class="category-count">${items.length} sisältöä</span>
          </div>

          <div class="content-grid">
            ${items.map(item => this.renderContent(item).outerHTML).join('')}
          </div>
        </div>
      `;
    }

    html += '</div>';
    if (!this.container) return;
    this.container.innerHTML = html;
  }

  /**
   * Render content creation form
   */
  renderCreationForm(): void {
    const formHtml = `
      <div class="content-creation-form">
        <div class="form-header">
          <h2>Luo uusi sisältö</h2>
          <button class="close-btn" onclick="window.StaticContent.closeForm()">✕</button>
        </div>

        <form id="contentCreationForm" class="content-form">
          <div class="form-row">
            <div class="form-group">
              <label for="contentType">Sisältötyyppi *</label>
              <select id="contentType" name="type" required>
                <option value="">Valitse tyyppi...</option>
                <option value="drill">Harjoitus</option>
                <option value="tactic">Taktiikka</option>
                <option value="physical">Fysiikka</option>
                <option value="guide">Opas</option>
                <option value="theory">Teoria</option>
                <option value="session">Harjoituskerta</option>
                <option value="quick-ref">Pikaopas</option>
              </select>
            </div>

            <div class="form-group">
              <label for="contentCategory">Kategoria *</label>
              <select id="contentCategory" name="category" required>
                <option value="">Valitse kategoria...</option>
                <option value="basic-skills">Perustaidot</option>
                <option value="passing">Syöttö</option>
                <option value="shooting">Laukaus</option>
                <option value="defense">Puolustus</option>
                <option value="offense">Hyökkäys</option>
                <option value="goalkeeping">Maalivahti</option>
                <option value="team-play">Joukkuepeli</option>
                <option value="fitness">Fysiikka</option>
                <option value="mental">Henkinen</option>
                <option value="strategy">Strategia</option>
                <option value="game-analysis">Peli-analyysi</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label for="titleFi">Otsikko (suomi) *</label>
            <input type="text" id="titleFi" name="titleFi" required
                   placeholder="Syötä suomenkielinen otsikko">
          </div>

          <div class="form-group">
            <label for="titleEn">Otsikko (englanti)</label>
            <input type="text" id="titleEn" name="titleEn"
                   placeholder="Enter English title">
          </div>

          <div class="form-group">
            <label for="descriptionFi">Kuvaus (suomi) *</label>
            <textarea id="descriptionFi" name="descriptionFi" rows="3" required
                      placeholder="Lyhyt kuvaus sisällöstä..."></textarea>
          </div>

          <div class="form-group">
            <label for="contentFi">Sisältö (suomi) *</label>
            <textarea id="contentFi" name="contentFi" rows="10" required
                      placeholder="Kirjoita sisältö Markdown-muodossa..."></textarea>
            <small class="form-help">Tukee Markdown-muotoilua (# otsikko, **lihavointi**, jne.)</small>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="difficulty">Vaikeustaso *</label>
              <select id="difficulty" name="difficulty" required>
                <option value="">Valitse taso...</option>
                <option value="beginner">Aloittelija</option>
                <option value="intermediate">Keskitaso</option>
                <option value="advanced">Edistynyt</option>
                <option value="expert">Asiantuntija</option>
              </select>
            </div>

            <div class="form-group">
              <label for="duration">Kesto (min) *</label>
              <input type="number" id="duration" name="duration" min="1" max="180" required
                     placeholder="15">
            </div>
          </div>

          <div class="form-group">
            <label for="ageGroups">Ikäryhmät</label>
            <div class="checkbox-group" id="ageGroups">
              <label><input type="checkbox" name="ageGroup" value="U10"> U10</label>
              <label><input type="checkbox" name="ageGroup" value="U12"> U12</label>
              <label><input type="checkbox" name="ageGroup" value="U14"> U14</label>
              <label><input type="checkbox" name="ageGroup" value="U16"> U16</label>
              <label><input type="checkbox" name="ageGroup" value="U18"> U18</label>
              <label><input type="checkbox" name="ageGroup" value="senior"> Aikuiset</label>
              <label><input type="checkbox" name="ageGroup" value="all" checked> Kaikki</label>
            </div>
          </div>

          <div class="form-group">
            <label for="equipment">Tarvikkeet</label>
            <div class="checkbox-group" id="equipment">
              <label><input type="checkbox" name="equipment" value="ball"> Pallo</label>
              <label><input type="checkbox" name="equipment" value="stick"> Maila</label>
              <label><input type="checkbox" name="equipment" value="cones"> Kartiot</label>
              <label><input type="checkbox" name="equipment" value="goals"> Maalit</label>
              <label><input type="checkbox" name="equipment" value="bibs"> Liivit</label>
              <label><input type="checkbox" name="equipment" value="none" checked> Ei tarvikkeita</label>
            </div>
          </div>

          <div class="form-group">
            <label for="tags">Avainsanat</label>
            <input type="text" id="tags" name="tags"
                   placeholder="syöttö, tarkkuus, perustaidot (pilkulla eroteltuna)">
            <small class="form-help">Avainsanat helpottavat sisällön löytämistä</small>
          </div>

          <div class="form-actions">
            <button type="button" class="btn-secondary" onclick="window.StaticContent.closeForm()">
              Peruuta
            </button>
            <button type="submit" class="btn-primary">
              💾 Tallenna sisältö
            </button>
          </div>
        </form>
      </div>
    `;

    // Create modal overlay
    const modal = document.createElement('div');
    modal.className = 'content-modal-overlay';
    modal.innerHTML = formHtml;

    document.body.appendChild(modal);

    // Add form submission handler
    const form = document.getElementById('contentCreationForm') as HTMLFormElement;
    form.addEventListener('submit', this.handleFormSubmission.bind(this));
  }

  /**
   * Handle form submission
   */
  private async handleFormSubmission(event: Event): Promise<void> {
    event.preventDefault();

    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);

    // Extract form data
    const ageGroups = Array.from(form.querySelectorAll('input[name="ageGroup"]:checked'))
      .map(input => (input as HTMLInputElement).value) as any[];

    const equipment = Array.from(form.querySelectorAll('input[name="equipment"]:checked'))
      .map(input => (input as HTMLInputElement).value) as any[];

    const tags = formData.get('tags')?.toString().split(',').map(t => t.trim()).filter(t => t) || [];

    try {
      await contentManager.createContent({
        type: formData.get('type') as any,
        category: formData.get('category') as any,
        title: {
          fi: formData.get('titleFi') as string,
          en: formData.get('titleEn') as string || formData.get('titleFi') as string
        },
        description: {
          fi: formData.get('descriptionFi') as string,
          en: formData.get('descriptionEn') as string || formData.get('descriptionFi') as string
        },
        content: {
          fi: formData.get('contentFi') as string,
          en: formData.get('contentEn') as string || formData.get('contentFi') as string
        },
        tags,
        difficulty: formData.get('difficulty') as any,
        ageGroup: ageGroups.length > 0 ? ageGroups : ['all'],
        duration: parseInt(formData.get('duration') as string),
        equipment: equipment.length > 0 ? equipment : ['none'],
        author: 'Hawks Coach',
        status: 'published',
        metadata: {
          views: 0,
          likes: 0,
          isFavorite: false,
          relatedContent: [],
          seasons: ['all']
        }
      });

      // Close modal and refresh content
      document.querySelector('.content-modal-overlay')?.remove();
      await this.renderContentList();

      // Show success message
      this.showToast('Sisältö luotu onnistuneesti!', 'success');

    } catch (error) {
      console.error('Failed to create content:', error);
      this.showToast('Sisällön luonti epäonnistui', 'error');
    }
  }

  // Helper methods
  private groupByCategory(content: StaticContent[]): Record<string, StaticContent[]> {
    return content.reduce((groups, item) => {
      const category = item.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
      return groups;
    }, {} as Record<string, StaticContent[]>);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private renderMarkdown(text: string): string {
    // Simple markdown rendering
    return text
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/\n/gim, '<br>');
  }

  private formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fi-FI', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    // Integrate with existing toast system
    if ((window as any).showToast) {
      (window as any).showToast('Sisältö', message, type === 'success' ? 'info' : 'error');
    }
  }

  /**
   * Set language for content display
   */
  setLanguage(language: 'fi' | 'en'): void {
    this.currentLanguage = language;
  }
}

// Global static content functions
(window as any).StaticContent = {
  async toggleFavorite(contentId: string): Promise<void> {
    const isFavorite = await contentManager.toggleFavorite(contentId);
    const btn = document.querySelector(`button[onclick="window.StaticContent.toggleFavorite('${contentId}')"]`);
    if (btn) {
      btn.textContent = isFavorite ? '★' : '☆';
      btn.className = `favorite-btn ${isFavorite ? 'active' : ''}`;
    }
  },

  expandContent(contentId: string): void {
    const contentElement = document.querySelector(`[data-content-id="${contentId}"]`);
    if (contentElement) {
      const preview = contentElement.querySelector('.content-preview') as HTMLElement;
      const isExpanded = preview.style.display !== 'none';

      preview.style.display = isExpanded ? 'none' : 'block';

      // Update view count
      if (!isExpanded) {
        contentManager.incrementViews(contentId);
      }
    }
  },

  createNew(): void {
    const display = new StaticContentDisplay(document.body);
    display.renderCreationForm();
  },

  closeForm(): void {
    document.querySelector('.content-modal-overlay')?.remove();
  },

  editContent(contentId: string): void {
    console.log('Edit content:', contentId);
    // TODO: Implement content editing
  },

  useInSession(contentId: string): void {
    console.log('Add to session:', contentId);
    // TODO: Integrate with session planning
  }
};