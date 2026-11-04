import { getTopLevelShell, type AppRoute, type TopLevelShell } from '@/ui/routes';

export interface ViewShellDefinition {
  shell: TopLevelShell;
  eyebrow: string;
  title: string;
  description: string;
  routeLabel: string;
  stageLabel: string;
  dataDependency: string;
  comingNext: string[];
}

// ── Navigation data ────────────────────────────────────────────────────────────

/** Shells that belong to the "Harjoitesuunnittelija" section */
const PLANNER_SHELLS: TopLevelShell[] = ['drill', 'planner', 'editor', 'share'];

/** Sub-navigation shown inside the Harjoitesuunnittelija section */
const PLANNER_SUBNAV = [
  { href: '#/drills',             label: 'Harjoitteet', shells: ['drill']    as TopLevelShell[] },
  { href: '#/plan',               label: 'Suunnitelmat', shells: ['planner'] as TopLevelShell[] },
  { href: '#/editor/drills/new',  label: 'Editori',     shells: ['editor']  as TopLevelShell[] },
];

export function selectViewShell(route: AppRoute): ViewShellDefinition {
  switch (route.kind) {
    case 'browse':
      return {
        shell: 'browse',
        eyebrow: 'Valmennuskeskus',
        title: 'Selaus',
        description: 'Drive-selausnakyma kaynnistyy tasta reitista.',
        routeLabel: route.path,
        stageLabel: 'Live data',
        dataDependency: 'Google Drive -aineisto',
        comingNext: [
          'Planneri- ja editoripinnat pysyvat rinnalla ilman muutosta selauspolkuun.',
          'Testiversion pikareitit pysyvat ylapalkissa myos selaustilassa.',
        ],
      };
    case 'drill-catalog':
      return {
        shell: 'drill',
        eyebrow: 'Harjoitekirjasto',
        title: 'Harjoitekatalogi',
        description: 'Tahan reittiin rakennetaan valmentajien harjoitteiden listaus ja haku.',
        routeLabel: route.path,
        stageLabel: 'Live data + shell',
        dataDependency: 'Julkaistut harjoitteet',
        comingNext: [
          'Lisataan syvemmät kategoriasuodattimet ja tiiviimpi mobiilihaku.',
          'Suunnitelmaan lisaaminen kiinnitetaan valmentajan aktiiviseen sessioon.',
        ],
      };
    case 'drill-detail':
      return {
        shell: 'drill',
        eyebrow: 'Harjoitekirjasto',
        title: 'Harjoitteen tiedot',
        description: `Harjoitteen ${route.drillId} yksityiskohdat renderoidaan tahan nakymaan.`,
        routeLabel: route.path,
        stageLabel: 'Live data + shell',
        dataDependency: 'Julkaistu harjoite ja liitteet',
        comingNext: [
          'Liitetiedostojen avausta tarkennetaan ja kuva-diagrammit yhtenaistetaan.',
          'Seuraavaksi harjoitteesta paasee takaisin aktiiviseen suunnitelmaan ilman valivaihetta.',
        ],
      };
    case 'planner-list':
      return {
        shell: 'planner',
        eyebrow: 'Harjoitussuunnittelu',
        title: 'Suunnitelmat',
        description: 'Tahan reittiin rakennetaan valmentajan omien harjoitussuunnitelmien listaus.',
        routeLabel: route.path,
        stageLabel: 'Shell + live list',
        dataDependency: 'Valmentajan sessiot',
        comingNext: [
          'Listalle lisataan myohemmin pikasuodattimet ja viimeksi kaytetyt drillit.',
          'Tyhjat ja virhetilat pidetaan klikattavina vaikka palveludata puuttuisi.',
        ],
      };
    case 'planner-new':
      return {
        shell: 'planner',
        eyebrow: 'Harjoitussuunnittelu',
        title: 'Uusi suunnitelma',
        description: 'Uuden harjoitussuunnitelman rakenne renderoidaan tahan nakymaan.',
        routeLabel: route.path,
        stageLabel: 'Shell + live draft',
        dataDependency: 'Paikallinen luonnos ja sessio-API',
        comingNext: [
          'Harjoitehaku, lohkojen hiominen ja tulostusnakyma tarkentuvat seuraavissa tehtavissa.',
          'Rakenteen sivupaneelit on varattu nopeille lisays- ja yhteenvetotoiminnoille.',
        ],
      };
    case 'planner-detail':
      return {
        shell: 'planner',
        eyebrow: 'Harjoitussuunnittelu',
        title: 'Suunnitelman muokkaus',
        description: `Suunnitelman ${route.sessionId} editori renderoidaan tahan nakymaan.`,
        routeLabel: route.path,
        stageLabel: 'Shell + live draft',
        dataDependency: 'Tallennettu sessio',
        comingNext: [
          'Valmiiseen sessioon lisataan tarkempi blokkihallinta ja nopeampi drillipolku.',
          'Yhteenvetoalue on varattu myohempaa printti- ja jakopolun hiomista varten.',
        ],
      };
    case 'shared-session':
      return {
        shell: 'share',
        eyebrow: 'Jaettu suunnitelma',
        title: 'Jaettu sessio',
        description: `Jaetun session ${route.shareId} lukutila renderoidaan tahan nakymaan.`,
        routeLabel: route.path,
        stageLabel: 'Live data',
        dataDependency: 'Jaettu sessio',
        comingNext: [
          'Jaetun nakyman mobiilitulostus ja visuaalinen tiivistys jatkuu seuraavissa vaiheissa.',
          'Linkkinakyma pysyy lukutilana ilman editoritoimintoja.',
        ],
      };
    case 'editor-drill-new':
      return {
        shell: 'editor',
        eyebrow: 'Editori',
        title: 'Uusi harjoite',
        description: 'Tahan reittiin rakennetaan harjoitteen luontinakyma.',
        routeLabel: route.path,
        stageLabel: 'Mock-first shell',
        dataDependency: 'Roolitarkistus + editoriluonnos',
        comingNext: [
          'Liitteiden lataus, validointien syvennys ja julkaisupolku tarkentuvat seuraavissa tehtavissa.',
          'Kenttaryhmat on lukittu sisaltoarkkitehtuurin testausta varten.',
        ],
      };
    case 'editor-drill-edit':
      return {
        shell: 'editor',
        eyebrow: 'Editori',
        title: 'Harjoitteen muokkaus',
        description: `Harjoitteen ${route.drillId} editori renderoidaan tahan nakymaan.`,
        routeLabel: route.path,
        stageLabel: 'Mock-first shell',
        dataDependency: 'Roolitarkistus + editoriluonnos',
        comingNext: [
          'Muokkausnakymaan lisataan myohemmin julkaisuversioiden erot ja liitehallinta.',
          'Nykyinen rakenne riittaa navigoitavaan sisalto- ja oikeustarkastukseen.',
        ],
      };
    case 'editor-imports':
      return {
        shell: 'editor',
        eyebrow: 'Editori',
        title: 'Import-jono',
        description: 'Tahan reittiin rakennetaan importoitujen materiaalien tarkastusnakyma.',
        routeLabel: route.path,
        stageLabel: 'Mock-first shell',
        dataDependency: 'Importtijono + editoriroolit',
        comingNext: [
          'Jonon riveille lisataan myohemmin tarkemmat luottamus- ja diffivihjeet.',
          'Hyvaksynta-, hylkays- ja muunnospolut on jo varattu tahan runkoon.',
        ],
      };
    case 'not-found':
      return {
        shell: 'not-found',
        eyebrow: 'Reititys',
        title: 'Sivua ei loytynyt',
        description: 'Tuntematon reitti palauttaa hallitun virhenakyman ilman selaustilan bootstrapia.',
        routeLabel: route.path,
        stageLabel: 'Shell only',
        dataDependency: 'Ei dataa',
        comingNext: [
          'Tuntemattomat reitit ohjataan takaisin selaus- tai testiversion paareitteihin.',
        ],
      };
  }
}

export function renderTopLevelNavigation(container: HTMLElement, route: AppRoute): void {
  const shell = getTopLevelShell(route);

  const browseActive  = shell === 'browse';
  const plannerActive = PLANNER_SHELLS.includes(shell);
  // Sub-nav shown for drill/planner/editor (not for share or not-found)
  const showSubnav = shell === 'drill' || shell === 'planner' || shell === 'editor';

  const subnavHtml = showSubnav
    ? `<div class="app-subnav-bar" role="navigation" aria-label="Harjoitesuunnittelija-valikko">
        <div class="app-subnav-inner">
          ${PLANNER_SUBNAV.map(item => {
            const active = item.shells.includes(shell);
            return `<a class="app-subnav-link${active ? ' is-active' : ''}" href="${item.href}"${active ? ' aria-current="page"' : ''}>${item.label}</a>`;
          }).join('')}
        </div>
      </div>`
    : '';

  container.innerHTML = `
    <nav class="app-nav-bar" aria-label="Päänavigaatio">
      <div class="app-nav-inner">
        <a class="app-nav-tab${browseActive  ? ' is-active' : ''}" href="#/"      ${browseActive  ? 'aria-current="page"' : ''}>Valmentajan käsikirja</a>
        <a class="app-nav-tab${plannerActive ? ' is-active' : ''}" href="#/drills"${plannerActive ? 'aria-current="page"' : ''}>Harjoitesuunnittelija</a>
      </div>
    </nav>
    ${subnavHtml}
  `;
}

export function renderShellSupportPanels(route: AppRoute): string {
  const view = selectViewShell(route);

  return `
    <section class="shell-support-grid" aria-label="Testiversion tilanne">
      <article class="shell-support-card">
        <p class="shell-support-kicker">Nyt testissa</p>
        <h3>${view.stageLabel}</h3>
        <p>${view.description}</p>
      </article>
      <article class="shell-support-card">
        <p class="shell-support-kicker">Datakytkenta</p>
        <h3>${view.dataDependency}</h3>
        <p>${view.shell === 'editor'
          ? 'Runko toimii vajaallakin datalla, jotta sisalto- ja oikeuspolkuja voi klikata lapi.'
          : 'Nakyma avautuu hallitusti ja pitaa tilaa niille osille, jotka tarkentuvat seuraavissa tehtavissa.'}
        </p>
      </article>
      <article class="shell-support-card shell-support-card-wide">
        <p class="shell-support-kicker">Seuraavaksi</p>
        <ul class="shell-support-list">
          ${view.comingNext.map(item => `<li>${item}</li>`).join('')}
        </ul>
      </article>
    </section>
  `;
}

function getShellActionMarkup(shell: TopLevelShell): string {
  if (shell === 'not-found') {
    return '<a class="view-shell-link" href="#/">Palaa selaustilaan</a>';
  }

  if (shell === 'browse') {
    return '';
  }

  return '<a class="view-shell-link" href="#/">Avaa selaustila</a>';
}

export function renderViewShell(container: HTMLElement, route: AppRoute): void {
  const view = selectViewShell(route);

  container.dataset.shell = view.shell;
  container.innerHTML = `
    <section class="view-shell view-shell-${view.shell}" aria-labelledby="viewShellTitle">
      <p class="view-shell-eyebrow">${view.eyebrow}</p>
      <h2 id="viewShellTitle" class="view-shell-title">${view.title}</h2>
      <p class="view-shell-description">${view.description}</p>
      <dl class="view-shell-meta">
        <div>
          <dt>Reitti</dt>
          <dd>${view.routeLabel}</dd>
        </div>
        <div>
          <dt>Shell</dt>
          <dd>${view.shell}</dd>
        </div>
        <div>
          <dt>Tila</dt>
          <dd>${view.stageLabel}</dd>
        </div>
      </dl>
      ${renderShellSupportPanels(route)}
      <div class="view-shell-actions">
        ${getShellActionMarkup(view.shell)}
      </div>
    </section>
  `;
}
