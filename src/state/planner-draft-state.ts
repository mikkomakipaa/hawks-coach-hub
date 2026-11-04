import type { Drill } from '@/types/drills';
import type { Session, SessionBlock } from '@/types/sessions';

type PlannerDraftListener = (session: Session | null) => void;

const DEFAULT_GROUP = 'Valitse ryhma';
const DEFAULT_SESSION_NAME = 'Uusi harjoitus';
const DEFAULT_TARGET_DURATION_MIN = 60;

function createBlockId(): string {
  return `block_${Math.random().toString(36).slice(2, 10)}`;
}

function sanitizeDurationMin(value: number | undefined, fallback = 0): number {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.round(value));
}

function buildSessionBlock(drill: Drill, order: number): SessionBlock {
  return {
    id: createBlockId(),
    order,
    type: 'drill',
    title: drill.title,
    durationMin: sanitizeDurationMin(drill.durationMin, 10),
    drillId: drill.id,
    notes: drill.summary,
    attachmentIds: drill.attachmentIds,
  };
}

function buildCustomBlock(order: number): SessionBlock {
  return {
    id: createBlockId(),
    order,
    type: 'custom',
    title: `Lohko ${order}`,
    durationMin: 10,
    notes: '',
  };
}

function normalizeBlocks(blocks: SessionBlock[]): SessionBlock[] {
  return blocks.map((block, index) => ({
    ...block,
    order: index + 1,
    durationMin: sanitizeDurationMin(block.durationMin),
    notes: block.notes ?? '',
  }));
}

export function calculateTotalDuration(blocks: SessionBlock[]): number {
  return blocks.reduce((total, block) => total + block.durationMin, 0);
}

export function createEmptyDraftSession(now: string = new Date().toISOString()): Session {
  return {
    id: 'session_draft',
    name: DEFAULT_SESSION_NAME,
    group: DEFAULT_GROUP,
    date: now.slice(0, 10),
    ownerUserId: 'local-draft',
    coachLabel: 'Hawks Coach Hub',
    targetDurationMin: DEFAULT_TARGET_DURATION_MIN,
    totalDurationMin: 0,
    status: 'draft',
    visibility: 'private',
    blocks: [],
    createdAt: now,
    updatedAt: now,
  };
}

function createDraftSession(firstDrill: Drill): Session {
  const block = buildSessionBlock(firstDrill, 1);
  const now = new Date().toISOString();

  return {
    ...createEmptyDraftSession(now),
    name: `${firstDrill.title} - luonnos`,
    group: firstDrill.ageGroups[0] ?? DEFAULT_GROUP,
    targetDurationMin: sanitizeDurationMin(firstDrill.durationMin, DEFAULT_TARGET_DURATION_MIN),
    totalDurationMin: block.durationMin,
    blocks: [block],
  };
}

export class PlannerDraftState {
  private session: Session | null = null;
  private readonly listeners: PlannerDraftListener[] = [];

  getSnapshot(): Session | null {
    return this.session;
  }

  subscribe(listener: PlannerDraftListener): () => void {
    this.listeners.push(listener);

    return () => {
      const index = this.listeners.indexOf(listener);
      if (index >= 0) {
        this.listeners.splice(index, 1);
      }
    };
  }

  replace(session: Session | null): Session | null {
    this.session = session
      ? {
          ...session,
          blocks: normalizeBlocks(session.blocks),
          totalDurationMin: session.totalDurationMin ?? calculateTotalDuration(session.blocks),
        }
      : null;
    this.emit();

    return this.session;
  }

  ensureDraft(): Session {
    if (!this.session) {
      this.session = createEmptyDraftSession();
      this.emit();
    }

    return this.session;
  }

  addDrill(drill: Drill): Session {
    const now = new Date().toISOString();

    if (!this.session) {
      this.session = createDraftSession(drill);
      this.emit();
      return this.session;
    }

    const nextBlocks = [
      ...this.session.blocks,
      buildSessionBlock(drill, this.session.blocks.length + 1),
    ];

    this.session = {
      ...this.session,
      name: this.session.blocks.length === 0 && this.session.name === DEFAULT_SESSION_NAME
        ? `${drill.title} - luonnos`
        : this.session.name,
      group: this.session.group === DEFAULT_GROUP ? (drill.ageGroups[0] ?? this.session.group) : this.session.group,
      totalDurationMin: calculateTotalDuration(nextBlocks),
      blocks: nextBlocks,
      updatedAt: now,
    };
    this.emit();

    return this.session;
  }

  updateSessionDetails(
    patch: Partial<Pick<Session, 'name' | 'group' | 'date' | 'coachLabel' | 'targetDurationMin'>>,
  ): Session {
    const current = this.ensureDraft();
    const now = new Date().toISOString();
    const targetDurationMin = patch.targetDurationMin === undefined
      ? current.targetDurationMin
      : sanitizeDurationMin(patch.targetDurationMin);
    const nextSession: Session = {
      ...current,
      ...patch,
      updatedAt: now,
    };

    if (targetDurationMin !== undefined) {
      nextSession.targetDurationMin = targetDurationMin;
    }

    this.session = nextSession;
    this.emit();

    return nextSession;
  }

  addCustomBlock(): Session {
    const current = this.ensureDraft();
    const nextBlocks = normalizeBlocks([...current.blocks, buildCustomBlock(current.blocks.length + 1)]);
    const now = new Date().toISOString();

    this.session = {
      ...current,
      blocks: nextBlocks,
      totalDurationMin: calculateTotalDuration(nextBlocks),
      updatedAt: now,
    };
    this.emit();

    return this.session;
  }

  updateBlock(
    blockId: string,
    patch: Partial<Pick<SessionBlock, 'title' | 'type' | 'durationMin' | 'notes'>>,
  ): Session | null {
    if (!this.session) {
      return null;
    }

    const nextBlocks = normalizeBlocks(
      this.session.blocks.map(block => {
        if (block.id !== blockId) {
          return block;
        }

        return {
          ...block,
          ...patch,
          durationMin: patch.durationMin === undefined
            ? block.durationMin
            : sanitizeDurationMin(patch.durationMin),
          notes: patch.notes ?? block.notes,
        };
      }),
    );
    const now = new Date().toISOString();

    this.session = {
      ...this.session,
      blocks: nextBlocks,
      totalDurationMin: calculateTotalDuration(nextBlocks),
      updatedAt: now,
    };
    this.emit();

    return this.session;
  }

  moveBlock(blockId: string, direction: 'up' | 'down'): Session | null {
    if (!this.session) {
      return null;
    }

    const index = this.session.blocks.findIndex(block => block.id === blockId);
    if (index < 0) {
      return this.session;
    }

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= this.session.blocks.length) {
      return this.session;
    }

    const nextBlocks = [...this.session.blocks];
    const [moved] = nextBlocks.splice(index, 1);
    if (!moved) {
      return this.session;
    }
    nextBlocks.splice(targetIndex, 0, moved);
    const normalizedBlocks = normalizeBlocks(nextBlocks);
    const now = new Date().toISOString();

    this.session = {
      ...this.session,
      blocks: normalizedBlocks,
      totalDurationMin: calculateTotalDuration(normalizedBlocks),
      updatedAt: now,
    };
    this.emit();

    return this.session;
  }

  removeBlock(blockId: string): Session | null {
    if (!this.session) {
      return null;
    }

    const nextBlocks = normalizeBlocks(this.session.blocks.filter(block => block.id !== blockId));
    const now = new Date().toISOString();

    this.session = {
      ...this.session,
      blocks: nextBlocks,
      totalDurationMin: calculateTotalDuration(nextBlocks),
      updatedAt: now,
    };
    this.emit();

    return this.session;
  }

  clear(): void {
    this.session = null;
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.session);
    }
  }
}

export const plannerDraftState = new PlannerDraftState();
