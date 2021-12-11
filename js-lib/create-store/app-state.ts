import type { Slice, SliceStateField } from './app-state-slice';

class AppStateConfig<S, A> {
  slices: SliceArray<S> = [];
  slicesByKey: { [k: string]: Slice<unknown, unknown, S> } =
    Object.create(null);
  fields: FieldDesc<S, A>[] = [];
  opts: undefined;

  constructor(slices: SliceArray<S>, opts?: undefined) {
    this.opts = opts;

    slices.forEach((slice) => {
      if (this.slicesByKey[slice.key]) {
        throw new RangeError(
          'Adding different instances of an existing slice (' + slice.key + ')',
        );
      }

      this.slices.push(slice);
      this.slicesByKey[slice.key] = slice;

      if (slice.spec.state) {
        this.fields.push(new FieldDesc(slice.key, slice.spec.state, slice));
      }
    });
  }
}

export class AppState<S, A> {
  static create<S, A>({ slices }: { slices: SliceArray<S> }): AppState<S, A> {
    const config = new AppStateConfig<S, A>(slices);
    const instance = new AppState(config);

    config.fields.forEach((f) => {
      instance.slicesCurrentState[f.name] = f.init(config, instance);
    });

    return instance;
  }

  protected slicesCurrentState: { [k: string]: any } = Object.create(null);

  constructor(public config: AppStateConfig<S, A>) {}

  applyAction(action: A): AppState<S, A> {
    let newInstance = new AppState(this.config);

    this.config.fields.forEach((field) => {
      if (field.apply) {
        newInstance.slicesCurrentState[field.name] = field.apply(
          action,
          this.getSliceState(field.name),
          newInstance,
        );
      } else {
        newInstance.slicesCurrentState[field.name] = this.getSliceState(
          field.name,
        );
      }
    });

    return newInstance;
  }

  getSlices() {
    return this.config.slices;
  }

  getSliceByKey<SL, A, S>(key: string): Slice<SL, A, S> | undefined {
    return this.config.slicesByKey[key] as any;
  }

  getSliceState<SL>(key: string): SL | undefined {
    return this.slicesCurrentState[key];
  }
}

function bind(f?: Function, self?: object) {
  return !self || !f ? f : f.bind(self);
}

type SliceArray<S> = Array<Slice<any, any, S>>;

class FieldDesc<S, A> {
  init: (config: { [key: string]: any }, appState: AppState<S, A>) => any;
  apply?: (action: any, value: any, appState: AppState<S, A>) => any;

  constructor(
    public name: string,
    desc: {
      init: SliceStateField<any, any, S>['init'];
      apply?: SliceStateField<any, any, S>['apply'];
    },
    self: SliceArray<S>[0],
  ) {
    this.init = bind(desc.init, self);

    if (desc.apply) {
      this.apply = bind(desc.apply, self);
    }
  }
}
