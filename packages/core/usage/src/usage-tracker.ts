const STORAGE_KEY = 'bangle:usage:v1';
const DAY_MS = 86_400_000;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Activity = 'read' | 'edited';
type Day = {
  read: boolean;
  edited: boolean;
  sentRead: boolean;
  sentEdited: boolean;
};
type State = { id: string; days: Record<string, Day> };

type Summary = {
  version: 1;
  installationId: string;
  day: string;
  read: boolean;
  edited: boolean;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Daily, retryable summaries. Storage and delivery failures never affect notes. */
export class UsageTracker {
  private enabled = false;
  private disposed = false;
  private sending = false;
  private generation = 0;
  private retryDelay = 30_000;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private request: AbortController | undefined;
  private now: () => number;

  constructor(
    private options: {
      storage: Pick<Storage, 'getItem' | 'setItem'>;
      send: (summary: Summary, signal: AbortSignal) => Promise<boolean>;
      now?: () => number;
    },
  ) {
    this.now = options.now ?? Date.now;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.generation++;
    this.cancelRequest();
    if (enabled) {
      void this.flush();
    } else {
      void this.lock(() => {
        const state = this.load();
        if (state) this.save({ id: state.id, days: {} });
      }).catch(() => {});
    }
  }

  async record(activity: Activity): Promise<void> {
    if (!this.enabled || this.disposed) return;
    try {
      await this.lock(() => {
        if (!this.enabled || this.disposed) return;
        const state = this.load() ?? { id: crypto.randomUUID(), days: {} };
        const date = new Date(this.now()).toISOString().slice(0, 10);
        const day = state.days[date] ?? {
          read: false,
          edited: false,
          sentRead: false,
          sentEdited: false,
        };
        if (day[activity]) return;
        day[activity] = true;
        state.days[date] = day;
        this.save(state);
      });
      await this.flush();
    } catch {
      // Measurement is best effort, including when browser storage is full.
    }
  }

  destroy(): void {
    this.disposed = true;
    this.generation++;
    this.cancelRequest();
  }

  private cancelRequest(): void {
    clearTimeout(this.retryTimer);
    this.retryTimer = undefined;
    this.request?.abort();
  }

  private lock<T>(callback: () => T | Promise<T>): Promise<T> {
    if (typeof navigator !== 'undefined' && navigator.locks) {
      return navigator.locks.request(STORAGE_KEY, callback);
    }
    return Promise.resolve().then(callback);
  }

  private load(): State | undefined {
    const raw: unknown = JSON.parse(
      this.options.storage.getItem(STORAGE_KEY) ?? 'null',
    );
    if (
      !isObject(raw) ||
      typeof raw.id !== 'string' ||
      !UUID.test(raw.id) ||
      !isObject(raw.days)
    )
      return;
    const days: State['days'] = {};
    const today = new Date(this.now()).toISOString().slice(0, 10);
    const oldest = new Date(this.now() - 6 * DAY_MS).toISOString().slice(0, 10);
    for (const [date, day] of Object.entries(raw.days)) {
      if (
        date < oldest ||
        date > today ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !isObject(day)
      )
        continue;
      if (
        typeof day.read !== 'boolean' ||
        typeof day.edited !== 'boolean' ||
        typeof day.sentRead !== 'boolean' ||
        typeof day.sentEdited !== 'boolean'
      )
        continue;
      days[date] = {
        read: day.read,
        edited: day.edited,
        sentRead: day.sentRead,
        sentEdited: day.sentEdited,
      };
    }
    return { id: raw.id, days };
  }

  private save(state: State): void {
    this.options.storage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  private async flush(): Promise<void> {
    if (
      !this.enabled ||
      this.disposed ||
      this.sending ||
      this.retryTimer !== undefined
    )
      return;
    this.sending = true;
    const generation = this.generation;
    try {
      while (this.enabled && !this.disposed && generation === this.generation) {
        const summary = await this.lock((): Summary | undefined => {
          const state = this.load();
          if (!state) return;
          const pending = Object.entries(state.days)
            .sort(([a], [b]) => a.localeCompare(b))
            .find(
              ([, day]) =>
                (day.read && !day.sentRead) || (day.edited && !day.sentEdited),
            );
          if (!pending) return;
          return {
            version: 1,
            installationId: state.id,
            day: pending[0],
            read: pending[1].read,
            edited: pending[1].edited,
          };
        });
        if (!summary || generation !== this.generation) break;
        this.request = new AbortController();
        const timeout = setTimeout(() => this.request?.abort(), 10_000);
        let delivered = false;
        try {
          delivered = await this.options.send(summary, this.request.signal);
        } finally {
          clearTimeout(timeout);
        }
        if (generation !== this.generation || this.disposed) break;
        if (!delivered) throw new Error('Usage delivery unavailable');
        await this.lock(() => {
          if (generation !== this.generation || this.disposed) return;
          const state = this.load();
          const day = state?.days[summary.day];
          if (!state || state.id !== summary.installationId || !day) return;
          day.sentRead ||= summary.read;
          day.sentEdited ||= summary.edited;
          this.save(state);
        });
        this.retryDelay = 30_000;
      }
    } catch {
      if (this.enabled && !this.disposed && generation === this.generation) {
        this.retryTimer = setTimeout(() => {
          this.retryTimer = undefined;
          void this.flush();
        }, this.retryDelay);
        this.retryDelay = Math.min(this.retryDelay * 2, 300_000);
      }
    } finally {
      this.sending = false;
      if (generation !== this.generation && this.enabled && !this.disposed)
        void this.flush();
    }
  }
}
