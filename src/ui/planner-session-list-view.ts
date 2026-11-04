import { escapeHtml } from '@/components/drill-presenters';
import { renderViewStateSection } from '@/components/view-state';
import { PlannerSessionRecoveryStore, plannerSessionRecoveryStore } from '@/services/planner-session-recovery-store';
import { SessionPlannerService } from '@/services/session-planner-service';
import { PlannerSessionState } from '@/state/planner-session-state';
import { parseHashRoute } from '@/ui/routes';
import { PLANNER_RECENT_DRILLS } from '@/ui/planner-test-data';
import { renderShellSupportPanels, selectViewShell } from '@/ui/view-shells';

export class PlannerSessionListView {
  private unsubscribe: (() => void) | null = null;
  private readonly container: HTMLElement;
  private readonly service: SessionPlannerService;
  private readonly state: PlannerSessionState;
  private readonly recoveryStore: PlannerSessionRecoveryStore;

  constructor(
    container: HTMLElement,
    service: SessionPlannerService = new SessionPlannerService(),
    state: PlannerSessionState = new PlannerSessionState(),
    recoveryStore: PlannerSessionRecoveryStore = plannerSessionRecoveryStore,
  ) {
    this.container = container;
    this.service = service;
    this.state = state;
    this.recoveryStore = recoveryStore;
  }

  async mount(): Promise<void> {
    this.container.dataset.shell = 'planner';
    this.container.dataset.view = 'planner-list';
    this.unsubscribe = this.state.subscribe(() => this.render());
    this.container.addEventListener('click', this.handleClick);
    this.render();
    await this.loadSessions();
  }

  destroy(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.container.removeEventListener('click', this.handleClick);
  }

  private readonly handleClick = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (
      target.dataset.plannerAction === 'retry-list' ||
      target.closest<HTMLElement>('[data-view-state-action="retry-planner-list"]')
    ) {
      void this.loadSessions();
    }
  };

  private async loadSessions(): Promise<void> {
    this.state.beginListLoad();

    try {
      const response = await this.service.listSessions();
      this.state.completeListLoad(response.items);
    } catch (error) {
      this.state.failListLoad(error);
    }
  }

  private render(): void {
    const view = selectViewShell(parseHashRoute('#/plan'));
    const snapshot = this.state.getSnapshot();
    const recovery = this.recoveryStore.getRecovery();
    const draft = this.recoveryStore.getDraft();

    if (snapshot.listState.status === 'loading' && snapshot.sessions.length === 0) {
      this.container.innerHTML = renderViewStateSection({
        shell: view.shell,
        eyebrow: view.eyebrow,
        title: view.title,
        description: 'Valmentajan viimeisimmat suunnitelmat, paikallinen palautus ja pikapolut rakennetaan tahan nakymaan.',
        state: {
          kind: 'loading',
          title: 'Ladataan suunnitelmia',
          message: 'Kootaan viimeisimmat sessiot ja paikallinen palautustila samaan nakymaan.',
        },
      });
      return;
    }

    if (snapshot.listState.status === 'error' && snapshot.sessions.length === 0) {
      this.container.innerHTML = renderViewStateSection({
        shell: view.shell,
        eyebrow: view.eyebrow,
        title: view.title,
        description: 'Suunnitelmalistan yhteys epaonnistui, mutta uusi builder-polku pidetaan silti saatavilla.',
        state: {
          kind: 'error',
          title: 'Listaa ei voitu avata',
          message: snapshot.listState.error?.message || 'Yrita hetken paasta uudelleen.',
          actions: [
            { action: 'retry-planner-list', label: 'Yrita uudelleen' },
            { href: '#/plan/new', label: 'Uusi suunnitelma' },
          ],
        },
      });
      return;
    }

    this.container.innerHTML = `
        <section class="view-shell view-shell-${view.shell} planner-session-list-view" aria-labelledby="plannerSessionListTitle">
        <div class="planner-draft-header planner-session-list-hero">
          <div class="planner-session-list-hero-copy">
            <p class="view-shell-eyebrow">${view.eyebrow}</p>
            <h2 id="plannerSessionListTitle" class="view-shell-title">Suunnitelmat</h2>
            <p class="view-shell-description">Avaa viimeisin harjoitus, jatka paikallista luonnosta tai rakenna uusi testiversion runko ilman erillista opastusta.</p>
            <div class="planner-session-list-kpis" aria-label="Plannerin testiversion tilanne">
              <div>
                <span>Viimeisimmat</span>
                <strong>${snapshot.sessions.length}</strong>
              </div>
              <div>
                <span>Harjoite-ehdotukset</span>
                <strong>${PLANNER_RECENT_DRILLS.length}</strong>
              </div>
              <div>
                <span>Paikallinen tila</span>
                <strong>${recovery ? 'Palautettava' : draft ? 'Luonnos valmis' : 'Valmis aloitukseen'}</strong>
              </div>
            </div>
          </div>
          <div class="planner-draft-actions">
            <a class="view-shell-link" href="#/plan/new">Uusi suunnitelma</a>
            <a class="view-shell-link" href="#/drills">Avaa harjoitteet</a>
          </div>
        </div>

        ${renderShellSupportPanels(parseHashRoute('#/plan'))}

        ${
          recovery
            ? `
              <div class="planner-inline-banner planner-inline-banner-warning" role="status">
                <div>
                  <strong>Palautettava versio odottaa</strong>
                  <p>${escapeHtml(recovery.reason)}</p>
                </div>
                <div class="planner-inline-actions">
                  <a class="view-shell-link" href="#/plan/new">Avaa palautusnakyma</a>
                </div>
              </div>
            `
            : draft
              ? `
                <div class="planner-inline-banner planner-inline-banner-neutral" role="status">
                  <div>
                    <strong>Paikallinen luonnos loytyi</strong>
                    <p>${escapeHtml(draft.name)} on valmiina jatkettavaksi tassa selaimessa.</p>
                  </div>
                  <div class="planner-inline-actions">
                    <a class="view-shell-link" href="#/plan/new">Jatka luonnosta</a>
                  </div>
                </div>
              `
              : ''
        }

        <div class="planner-session-list-layout">
          <section class="planner-session-list-stack" aria-labelledby="plannerSessionRecentTitle">
            <div class="planner-draft-section-heading">
              <div>
                <p class="planner-draft-section-kicker">Viimeisimmat suunnitelmat</p>
                <h3 id="plannerSessionRecentTitle">Jatka siita mihin jaat</h3>
              </div>
              <a class="view-shell-link" href="#/plan/new">Uusi suunnitelma</a>
            </div>

            ${
              snapshot.sessions.length === 0
                ? `
                  <div class="planner-draft-empty">
                    <h3>Ei viela tallennettuja suunnitelmia</h3>
                    <p>Testikierrosta varten builderi toimii silti heti. Luo uusi runko, lisaa mock-harjoitteita ja tarkista mobiiliasettelu ennen palvelintallennuksen viimeistelya.</p>
                    <div class="planner-draft-empty-actions">
                      <a class="view-shell-link" href="#/plan/new">Aloita uusi suunnitelma</a>
                    </div>
                  </div>
                `
                : `
                  <div class="planner-session-list-grid">
                    ${snapshot.sessions
                      .map(
                        session => `
                          <article class="planner-session-card">
                            <div class="planner-session-card-topline">
                              <p class="planner-draft-section-kicker">${escapeHtml(session.group)} · ${escapeHtml(session.date)}</p>
                              <span class="planner-session-card-badge">${session.visibility === 'shared' ? 'Jaettu' : 'Luonnos'}</span>
                            </div>
                            <h3>${escapeHtml(session.name)}</h3>
                            <p>${session.blockCount} lohkoa · ${session.totalDurationMin ?? 0} min · ${escapeHtml(session.coachLabel)}</p>
                            <div class="planner-inline-actions">
                              <a class="view-shell-link" href="#/plan/${encodeURIComponent(session.id)}">Avaa</a>
                              ${
                                session.shareId
                                  ? `<a class="view-shell-link" href="#/session/${encodeURIComponent(session.shareId)}">Jaettu nakyma</a>`
                                  : ''
                              }
                            </div>
                          </article>
                        `,
                      )
                      .join('')}
                  </div>
                `
            }
          </section>

          <aside class="planner-draft-panel planner-session-list-sidebar" aria-labelledby="plannerSessionQuickStartTitle">
            <div class="planner-draft-section-heading">
              <div>
                <p class="planner-draft-section-kicker">Nopea aloitus</p>
                <h3 id="plannerSessionQuickStartTitle">Viimeksi kaytetyt harjoitteet</h3>
              </div>
            </div>
            <p class="planner-draft-totals-note">Namat ehdotukset ovat testiversion pikapolkuja. Varsinainen lisaaminen tapahtuu builderissa ilman lopullista katalogikytkentaa.</p>
            <div class="planner-session-recent-drills" aria-label="Viimeksi kaytetyt harjoitteet">
              ${PLANNER_RECENT_DRILLS.map(
                drill => `
                  <article class="planner-session-recent-card">
                    <div class="planner-session-card-topline">
                      <p class="planner-draft-section-kicker">${escapeHtml(drill.category)}</p>
                      <span class="planner-session-card-badge">${escapeHtml(drill.durationLabel)}</span>
                    </div>
                    <h3>${escapeHtml(drill.title)}</h3>
                    <p>${escapeHtml(drill.summary)}</p>
                    <div class="planner-inline-actions">
                      <a class="view-shell-link" href="#/plan/new">Avaa builderi</a>
                      <a class="view-shell-link" href="#/drills/${encodeURIComponent(drill.id)}">Tiedot</a>
                    </div>
                  </article>
                `,
              ).join('')}
            </div>
          </aside>
        </div>
      </section>
    `;
  }
}
